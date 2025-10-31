package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"testing"
	"time"

	"bugrelay-backend/internal/auth"
	"bugrelay-backend/internal/middleware"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPerformanceTestDB(t testing.TB) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)

	// Auto-migrate the schema
	err = db.AutoMigrate(
		&models.User{},
		&models.Company{},
		&models.Application{},
		&models.BugReport{},
		&models.BugVote{},
		&models.Comment{},
		&models.FileAttachment{},
		&models.JWTBlacklist{},
		&models.CompanyMember{},
		&models.AuditLog{},
	)
	require.NoError(t, err)

	return db
}

func setupPerformanceTestRouter(t testing.TB) (*gin.Engine, *gorm.DB) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	db := setupPerformanceTestDB(t)

	// Setup auth service
	authConfig := auth.Config{
		JWTSecret:       "test-secret",
		AccessTokenTTL:  time.Hour,
		RefreshTokenTTL: 24 * time.Hour,
	}
	authService := auth.NewService(authConfig, db, nil)

	// Setup handlers
	authHandler := NewAuthHandler(db, authService)
	bugHandler := NewBugHandler(db, nil) // No Redis for performance tests
	companyHandler := NewCompanyHandler(db)

	// Setup middleware
	security := middleware.NewSecurityMiddleware([]string{})
	rateLimiter := middleware.NewRateLimiter(nil, 60)

	// Add middleware
	router.Use(security.SecurityHeaders())
	router.Use(rateLimiter.GeneralRateLimit())

	// Setup routes
	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		bugs := v1.Group("/bugs")
		{
			bugs.GET("", bugHandler.ListBugs)
			bugs.POST("", bugHandler.CreateBug)
			bugs.GET("/:id", bugHandler.GetBug)
			bugs.POST("/:id/vote", bugHandler.VoteBug)
			bugs.POST("/:id/comments", bugHandler.CreateComment)
		}

		companies := v1.Group("/companies")
		{
			companies.GET("", companyHandler.ListCompanies)
			companies.GET("/:id", companyHandler.GetCompany)
		}

		// Admin routes would be added here when implemented
	}

	return router, db
}

func createTestUserForPerf(t testing.TB, db *gorm.DB) *models.User {
	user := &models.User{
		ID:              uuid.New(),
		Email:           fmt.Sprintf("test%d@example.com", time.Now().UnixNano()),
		DisplayName:     "Test User",
		AuthProvider:    "email",
		IsEmailVerified: true,
	}

	err := db.Create(user).Error
	require.NoError(t, err)

	return user
}

func createTestBugForPerf(t testing.TB, db *gorm.DB, userID *uuid.UUID) *models.BugReport {
	// Create application first
	url := "https://testapp.com"
	app := &models.Application{
		Name: "Test App",
		URL:  &url,
	}
	err := db.Create(app).Error
	require.NoError(t, err)

	bug := &models.BugReport{
		Title:         fmt.Sprintf("Test Bug %d", time.Now().UnixNano()),
		Description:   "This is a test bug report for performance testing",
		Status:        "open",
		Priority:      "medium",
		ApplicationID: app.ID,
		ReporterID:    userID,
	}

	err = db.Create(bug).Error
	require.NoError(t, err)

	return bug
}

// Performance test for user registration
func BenchmarkAuthHandler_Register(b *testing.B) {
	router, _ := setupPerformanceTestRouter(b)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		payload := RegisterRequest{
			Email:       fmt.Sprintf("test%d@example.com", i),
			Password:    "password123",
			DisplayName: "Test User",
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			b.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}
	}
}

// Performance test for user login
func BenchmarkAuthHandler_Login(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test users
	users := make([]*models.User, b.N)
	for i := 0; i < b.N; i++ {
		hashedPassword := "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" // "password"
		user := &models.User{
			Email:           fmt.Sprintf("test%d@example.com", i),
			DisplayName:     "Test User",
			PasswordHash:    &hashedPassword,
			AuthProvider:    "email",
			IsEmailVerified: true,
		}
		db.Create(user)
		users[i] = user
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		payload := LoginRequest{
			Email:    users[i].Email,
			Password: "password",
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}

// Performance test for bug creation
func BenchmarkBugHandler_CreateBug(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test user
	user := createTestUserForPerf(b, db)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		payload := map[string]interface{}{
			"title":       fmt.Sprintf("Performance Test Bug %d", i),
			"description": "This is a performance test bug report",
			"application": "Test App",
			"priority":    "medium",
			"tags":        []string{"performance", "test"},
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/v1/bugs", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", user.ID.String())

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			b.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}
	}
}

// Performance test for bug listing
func BenchmarkBugHandler_ListBugs(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test user and bugs
	user := createTestUserForPerf(b, db)
	for i := 0; i < 100; i++ {
		createTestBugForPerf(b, db, &user.ID)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/bugs?page=1&limit=20", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}

// Performance test for bug search
func BenchmarkBugHandler_SearchBugs(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test user and bugs with searchable content
	user := createTestUserForPerf(b, db)
	for i := 0; i < 100; i++ {
		bug := createTestBugForPerf(b, db, &user.ID)
		bug.Title = fmt.Sprintf("Searchable Bug %d", i)
		bug.Description = "This bug contains searchable content for performance testing"
		db.Save(bug)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/bugs?search=searchable&page=1&limit=20", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}

// Performance test for bug voting
func BenchmarkBugHandler_VoteBug(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test user and bug
	user := createTestUserForPerf(b, db)
	bug := createTestBugForPerf(b, db, &user.ID)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create a new user for each vote to avoid duplicate vote constraints
		voter := createTestUserForPerf(b, db)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/bugs/%s/vote", bug.ID.String()), nil)
		req.Header.Set("X-User-ID", voter.ID.String())

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}

// Performance test for creating comments
func BenchmarkBugHandler_CreateComment(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test user and bug
	user := createTestUserForPerf(b, db)
	bug := createTestBugForPerf(b, db, &user.ID)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		payload := map[string]interface{}{
			"content": fmt.Sprintf("Performance test comment %d", i),
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/bugs/%s/comments", bug.ID.String()), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", user.ID.String())

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			b.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}
	}
}

// Performance test for company listing
func BenchmarkCompanyHandler_ListCompanies(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test companies
	for i := 0; i < 50; i++ {
		company := &models.Company{
			Name:       fmt.Sprintf("Test Company %d", i),
			Domain:     fmt.Sprintf("company%d.com", i),
			IsVerified: i%2 == 0, // Half verified, half not
		}
		db.Create(company)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/companies?page=1&limit=20", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}

// Performance test with concurrent requests
func BenchmarkConcurrentBugListing(b *testing.B) {
	router, db := setupPerformanceTestRouter(b)

	// Create test data
	user := createTestUserForPerf(b, db)
	for i := 0; i < 100; i++ {
		createTestBugForPerf(b, db, &user.ID)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			req, _ := http.NewRequest("GET", "/api/v1/bugs?page=1&limit=20", nil)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				b.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
			}
		}
	})
}

// Performance test for middleware overhead
func BenchmarkMiddlewareOverhead(b *testing.B) {
	gin.SetMode(gin.TestMode)

	// Router without middleware
	routerNoMiddleware := gin.New()
	routerNoMiddleware.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	// Router with middleware
	routerWithMiddleware := gin.New()
	security := middleware.NewSecurityMiddleware([]string{})
	rateLimiter := middleware.NewRateLimiter(nil, 1000) // High limit to avoid blocking

	routerWithMiddleware.Use(security.SecurityHeaders())
	routerWithMiddleware.Use(security.ValidateUserAgent())
	routerWithMiddleware.Use(rateLimiter.GeneralRateLimit())
	routerWithMiddleware.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	b.Run("NoMiddleware", func(b *testing.B) {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Test Browser)")

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			w := httptest.NewRecorder()
			routerNoMiddleware.ServeHTTP(w, req)
		}
	})

	b.Run("WithMiddleware", func(b *testing.B) {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Test Browser)")

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			w := httptest.NewRecorder()
			routerWithMiddleware.ServeHTTP(w, req)
		}
	})
}

// Performance test for large payload handling
func BenchmarkLargePayloadHandling(b *testing.B) {
	router, _ := setupPerformanceTestRouter(b)

	// Create large payload
	largeDescription := strings.Repeat("This is a very long description for performance testing. ", 100)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		payload := map[string]interface{}{
			"title":       fmt.Sprintf("Large Payload Bug %d", i),
			"description": largeDescription,
			"application": "Test App",
			"priority":    "medium",
			"tags":        []string{"performance", "large", "payload", "test"},
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/v1/bugs", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", uuid.New().String())

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should be created or have validation error, but not crash
		if w.Code != http.StatusCreated && w.Code != http.StatusBadRequest {
			b.Errorf("Unexpected status %d", w.Code)
		}
	}
}

// Memory usage test
func TestMemoryUsage(t *testing.T) {
	router, db := setupPerformanceTestRouter(t)

	// Create test data
	user := createTestUser(t, db)
	for i := 0; i < 1000; i++ {
		createTestBugForPerf(t, db, &user.ID)
	}

	// Measure memory usage during multiple requests
	var memBefore, memAfter runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&memBefore)

	// Make multiple requests
	for i := 0; i < 100; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/bugs?page=1&limit=50", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}

	runtime.GC()
	runtime.ReadMemStats(&memAfter)

	// Memory usage should not grow excessively
	memGrowth := memAfter.Alloc - memBefore.Alloc
	t.Logf("Memory growth: %d bytes", memGrowth)

	// This is a rough check - in a real scenario you'd want more sophisticated memory profiling
	assert.Less(t, memGrowth, uint64(10*1024*1024), "Memory growth should be less than 10MB")
}

// Response time test
func TestResponseTime(t *testing.T) {
	router, db := setupPerformanceTestRouter(t)

	// Create test data
	user := createTestUser(t, db)
	for i := 0; i < 100; i++ {
		createTestBugForPerf(t, db, &user.ID)
	}

	// Test response times for different endpoints
	endpoints := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListBugs", "GET", "/api/v1/bugs?page=1&limit=20", ""},
		{"SearchBugs", "GET", "/api/v1/bugs?search=test&page=1&limit=20", ""},
		{"ListCompanies", "GET", "/api/v1/companies?page=1&limit=20", ""},
	}

	for _, endpoint := range endpoints {
		t.Run(endpoint.name, func(t *testing.T) {
			var body *bytes.Buffer
			if endpoint.body != "" {
				body = bytes.NewBufferString(endpoint.body)
			}

			start := time.Now()
			req, _ := http.NewRequest(endpoint.method, endpoint.path, body)
			if endpoint.body != "" {
				req.Header.Set("Content-Type", "application/json")
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			duration := time.Since(start)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Less(t, duration, 100*time.Millisecond, "Response time should be less than 100ms")

			t.Logf("%s response time: %v", endpoint.name, duration)
		})
	}
}
