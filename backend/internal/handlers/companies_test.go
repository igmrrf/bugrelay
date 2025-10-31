package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupCompanyTestHandler creates a company handler with test database
func setupCompanyTestHandler(t *testing.T) (*CompanyHandler, *gorm.DB) {
	db := setupBugTestDB(t) // Reuse the existing test DB setup
	handler := NewCompanyHandler(db)
	return handler, db
}

// createTestCompany creates a test company in the database
func createTestCompany(t *testing.T, db *gorm.DB, verified bool) *models.Company {
	company := &models.Company{
		ID:         uuid.New(),
		Name:       "Test Company",
		Domain:     "testcompany.com",
		IsVerified: verified,
	}
	require.NoError(t, db.Create(company).Error)
	return company
}

// createTestCompanyMember creates a test company member in the database
func createTestCompanyMember(t *testing.T, db *gorm.DB, companyID, userID uuid.UUID, role string) *models.CompanyMember {
	member := &models.CompanyMember{
		ID:        uuid.New(),
		CompanyID: companyID,
		UserID:    userID,
		Role:      role,
	}
	require.NoError(t, db.Create(member).Error)
	return member
}

func TestCompanyHandler_ListCompanies(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test companies
	_ = createTestCompany(t, db, true)
	company2 := createTestCompany(t, db, false)
	company2.Name = "Another Company"
	company2.Domain = "another.com"
	require.NoError(t, db.Save(company2).Error)

	tests := []struct {
		name           string
		query          string
		expectedCount  int
		expectedStatus int
	}{
		{
			name:           "list all companies",
			query:          "",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by verified companies",
			query:          "?verified=true",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "search by name",
			query:          "?search=Test",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "pagination",
			query:          "?page=1&limit=1",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.GET("/companies", handler.ListCompanies)

			req, _ := http.NewRequest("GET", "/companies"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)

				companies := response["companies"].([]interface{})
				assert.Equal(t, tt.expectedCount, len(companies))
			}
		})
	}
}

func TestCompanyHandler_GetCompany(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test company
	company := createTestCompany(t, db, true)

	tests := []struct {
		name           string
		companyID      string
		expectedStatus int
	}{
		{
			name:           "get existing company",
			companyID:      company.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "get non-existent company",
			companyID:      uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid company ID",
			companyID:      "invalid-id",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.GET("/companies/:id", handler.GetCompany)

			req, _ := http.NewRequest("GET", "/companies/"+tt.companyID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)

				companyData := response["company"].(map[string]interface{})
				assert.Equal(t, company.Name, companyData["name"])
				assert.Equal(t, company.Domain, companyData["domain"])
			}
		})
	}
}

func TestCompanyHandler_InitiateCompanyClaim(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test user and company
	user := createTestUser(t, db)
	company := createTestCompany(t, db, false)

	tests := []struct {
		name           string
		companyID      string
		email          string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "valid claim initiation",
			companyID:      company.ID.String(),
			email:          "admin@testcompany.com",
			userID:         user.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid email domain",
			companyID:      company.ID.String(),
			email:          "admin@wrongdomain.com",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_DOMAIN",
		},
		{
			name:           "invalid company ID",
			companyID:      "invalid-id",
			email:          "admin@testcompany.com",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_ID",
		},
		{
			name:           "non-existent company",
			companyID:      uuid.New().String(),
			email:          "admin@testcompany.com",
			userID:         user.ID,
			expectedStatus: http.StatusNotFound,
			expectedError:  "COMPANY_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.POST("/companies/:id/claim", handler.InitiateCompanyClaim)

			requestBody := map[string]string{
				"email": tt.email,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("POST", "/companies/"+tt.companyID+"/claim", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			}
		})
	}
}

func TestCompanyHandler_CompleteCompanyVerification(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test user and company with verification token
	user := createTestUser(t, db)
	company := createTestCompany(t, db, false)
	token := "test-verification-token"
	email := "admin@testcompany.com"
	company.VerificationToken = &token
	company.VerificationEmail = &email
	require.NoError(t, db.Save(company).Error)

	tests := []struct {
		name           string
		companyID      string
		token          string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "valid verification",
			companyID:      company.ID.String(),
			token:          token,
			userID:         user.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid token",
			companyID:      company.ID.String(),
			token:          "wrong-token",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_TOKEN",
		},
		{
			name:           "invalid company ID",
			companyID:      "invalid-id",
			token:          token,
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.POST("/companies/:id/verify", handler.CompleteCompanyVerification)

			requestBody := map[string]string{
				"token": tt.token,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("POST", "/companies/"+tt.companyID+"/verify", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else if w.Code == http.StatusOK {
				// Verify company is now verified
				var updatedCompany models.Company
				require.NoError(t, db.First(&updatedCompany, company.ID).Error)
				assert.True(t, updatedCompany.IsVerified)
				assert.Nil(t, updatedCompany.VerificationToken)

				// Verify user is now a company member
				var member models.CompanyMember
				err := db.Where("company_id = ? AND user_id = ?", company.ID, user.ID).First(&member).Error
				assert.NoError(t, err)
				assert.Equal(t, "admin", member.Role)
			}
		})
	}
}

func TestCompanyHandler_AddTeamMember(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test users and company
	adminUser := createTestUser(t, db)
	newUser := &models.User{
		ID:          uuid.New(),
		Email:       "newuser@testcompany.com",
		DisplayName: "New User",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(newUser).Error)

	company := createTestCompany(t, db, true)
	createTestCompanyMember(t, db, company.ID, adminUser.ID, "admin")

	tests := []struct {
		name           string
		companyID      string
		email          string
		role           string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "add team member as admin",
			companyID:      company.ID.String(),
			email:          newUser.Email,
			role:           "member",
			userID:         adminUser.ID,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "add team member with invalid email domain",
			companyID:      company.ID.String(),
			email:          "user@wrongdomain.com",
			role:           "member",
			userID:         adminUser.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_DOMAIN",
		},
		{
			name:           "non-existent user",
			companyID:      company.ID.String(),
			email:          "nonexistent@testcompany.com",
			role:           "member",
			userID:         adminUser.ID,
			expectedStatus: http.StatusNotFound,
			expectedError:  "USER_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.POST("/companies/:id/members", handler.AddTeamMember)

			requestBody := map[string]string{
				"email": tt.email,
				"role":  tt.role,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("POST", "/companies/"+tt.companyID+"/members", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			}
		})
	}
}

func TestCompanyHandler_RemoveTeamMember(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test users and company
	adminUser := createTestUser(t, db)
	memberUser := &models.User{
		ID:          uuid.New(),
		Email:       "member@testcompany.com",
		DisplayName: "Member User",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(memberUser).Error)

	company := createTestCompany(t, db, true)
	createTestCompanyMember(t, db, company.ID, adminUser.ID, "admin")
	createTestCompanyMember(t, db, company.ID, memberUser.ID, "member")

	tests := []struct {
		name           string
		companyID      string
		targetUserID   string
		currentUserID  uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "admin removes member",
			companyID:      company.ID.String(),
			targetUserID:   memberUser.ID.String(),
			currentUserID:  adminUser.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "member removes themselves",
			companyID:      company.ID.String(),
			targetUserID:   memberUser.ID.String(),
			currentUserID:  memberUser.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent member",
			companyID:      company.ID.String(),
			targetUserID:   uuid.New().String(),
			currentUserID:  adminUser.ID,
			expectedStatus: http.StatusNotFound,
			expectedError:  "MEMBER_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.currentUserID))
			router.DELETE("/companies/:id/members", handler.RemoveTeamMember)

			requestBody := map[string]string{
				"user_id": tt.targetUserID,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("DELETE", "/companies/"+tt.companyID+"/members", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			}
		})
	}
}

func TestCompanyHandler_GetCompanyDashboard(t *testing.T) {
	handler, db := setupCompanyTestHandler(t)

	// Create test user, company, and bug reports
	user := createTestUser(t, db)
	company := createTestCompany(t, db, true)
	createTestCompanyMember(t, db, company.ID, user.ID, "admin")

	// Create test application and bugs
	app := createTestApplication(t, db)
	app.CompanyID = &company.ID
	require.NoError(t, db.Save(app).Error)

	// Create bugs with different statuses
	bug1 := createTestBugReport(t, db, app, user)
	bug1.AssignedCompanyID = &company.ID
	bug1.Status = models.BugStatusOpen
	require.NoError(t, db.Save(bug1).Error)

	bug2 := createTestBugReport(t, db, app, user)
	bug2.AssignedCompanyID = &company.ID
	bug2.Status = models.BugStatusFixed
	bug2.Title = "Fixed Bug"
	require.NoError(t, db.Save(bug2).Error)

	tests := []struct {
		name           string
		companyID      string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "get dashboard as company member",
			companyID:      company.ID.String(),
			userID:         user.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "get dashboard as non-member",
			companyID:      company.ID.String(),
			userID:         uuid.New(),
			expectedStatus: http.StatusForbidden,
			expectedError:  "NOT_MEMBER",
		},
		{
			name:           "invalid company ID",
			companyID:      "invalid-id",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.GET("/companies/:id/dashboard", handler.GetCompanyDashboard)

			req, _ := http.NewRequest("GET", "/companies/"+tt.companyID+"/dashboard", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else if w.Code == http.StatusOK {
				// Verify dashboard data
				assert.Contains(t, response, "company")
				assert.Contains(t, response, "bug_stats")
				assert.Contains(t, response, "recent_bugs")
				assert.Contains(t, response, "user_role")

				bugStats := response["bug_stats"].(map[string]interface{})
				assert.Equal(t, float64(2), bugStats["total"])
				assert.Equal(t, float64(1), bugStats["open"])
				assert.Equal(t, float64(1), bugStats["fixed"])
			}
		})
	}
}

func TestCompanyHandler_ExtractDomainFromURL(t *testing.T) {
	handler, _ := setupCompanyTestHandler(t)

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "HTTP URL",
			input:    "http://example.com",
			expected: "example.com",
		},
		{
			name:     "HTTPS URL",
			input:    "https://www.example.com",
			expected: "www.example.com",
		},
		{
			name:     "Domain with www",
			input:    "www.example.com",
			expected: "example.com",
		},
		{
			name:     "Plain domain",
			input:    "example.com",
			expected: "example.com",
		},
		{
			name:     "Application name",
			input:    "My App",
			expected: "my-app.app",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.extractDomainFromURL(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCompanyHandler_IsEmailFromDomain(t *testing.T) {
	handler, _ := setupCompanyTestHandler(t)

	tests := []struct {
		name          string
		email         string
		companyDomain string
		expected      bool
	}{
		{
			name:          "matching domain",
			email:         "user@example.com",
			companyDomain: "example.com",
			expected:      true,
		},
		{
			name:          "matching domain with www",
			email:         "user@example.com",
			companyDomain: "www.example.com",
			expected:      true,
		},
		{
			name:          "non-matching domain",
			email:         "user@example.com",
			companyDomain: "other.com",
			expected:      false,
		},
		{
			name:          "placeholder domain",
			email:         "user@example.com",
			companyDomain: "my-app.app",
			expected:      false,
		},
		{
			name:          "invalid email",
			email:         "invalid-email",
			companyDomain: "example.com",
			expected:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.isEmailFromDomain(tt.email, tt.companyDomain)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Test company-specific bug management functionality
func TestCompanyBugManagement_UpdateBugStatus(t *testing.T) {
	_, db := setupCompanyTestHandler(t)
	bugHandler := NewBugHandler(db, nil)

	// Create test data
	user := createTestUser(t, db)
	company := createTestCompany(t, db, true)
	createTestCompanyMember(t, db, company.ID, user.ID, "member")

	app := createTestApplication(t, db)
	app.CompanyID = &company.ID
	require.NoError(t, db.Save(app).Error)

	bug := createTestBugReport(t, db, app, user)
	bug.AssignedCompanyID = &company.ID
	require.NoError(t, db.Save(bug).Error)

	// Create non-member user
	nonMemberUser := &models.User{
		ID:          uuid.New(),
		Email:       "nonmember@example.com",
		DisplayName: "Non Member",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(nonMemberUser).Error)

	tests := []struct {
		name           string
		bugID          string
		status         string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "company member updates status",
			bugID:          bug.ID.String(),
			status:         models.BugStatusFixed,
			userID:         user.ID,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-member cannot update status",
			bugID:          bug.ID.String(),
			status:         models.BugStatusReviewing,
			userID:         nonMemberUser.ID,
			expectedStatus: http.StatusForbidden,
			expectedError:  "INSUFFICIENT_PERMISSIONS",
		},
		{
			name:           "invalid status",
			bugID:          bug.ID.String(),
			status:         "invalid_status",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_STATUS",
		},
		{
			name:           "non-existent bug",
			bugID:          uuid.New().String(),
			status:         models.BugStatusFixed,
			userID:         user.ID,
			expectedStatus: http.StatusNotFound,
			expectedError:  "BUG_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.PATCH("/bugs/:id/status", bugHandler.UpdateBugStatus)

			requestBody := map[string]string{
				"status": tt.status,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("PATCH", "/bugs/"+tt.bugID+"/status", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else if w.Code == http.StatusOK {
				// Verify status was updated
				var updatedBug models.BugReport
				require.NoError(t, db.First(&updatedBug, bug.ID).Error)
				assert.Equal(t, tt.status, updatedBug.Status)

				// Check if resolved_at is set for fixed/won't fix status
				if tt.status == models.BugStatusFixed || tt.status == models.BugStatusWontFix {
					assert.NotNil(t, updatedBug.ResolvedAt)
				}
			}
		})
	}
}

func TestCompanyBugManagement_AddCompanyResponse(t *testing.T) {
	_, db := setupCompanyTestHandler(t)
	bugHandler := NewBugHandler(db, nil)

	// Create test data
	user := createTestUser(t, db)
	company := createTestCompany(t, db, true)
	createTestCompanyMember(t, db, company.ID, user.ID, "member")

	app := createTestApplication(t, db)
	app.CompanyID = &company.ID
	require.NoError(t, db.Save(app).Error)

	bug := createTestBugReport(t, db, app, user)
	bug.AssignedCompanyID = &company.ID
	require.NoError(t, db.Save(bug).Error)

	// Create non-member user
	nonMemberUser := &models.User{
		ID:          uuid.New(),
		Email:       "nonmember@example.com",
		DisplayName: "Non Member",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(nonMemberUser).Error)

	tests := []struct {
		name           string
		bugID          string
		content        string
		userID         uuid.UUID
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "company member adds response",
			bugID:          bug.ID.String(),
			content:        "Thank you for reporting this issue. We are working on a fix.",
			userID:         user.ID,
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "non-member cannot add company response",
			bugID:          bug.ID.String(),
			content:        "This should not be allowed",
			userID:         nonMemberUser.ID,
			expectedStatus: http.StatusForbidden,
			expectedError:  "INSUFFICIENT_PERMISSIONS",
		},
		{
			name:           "empty content",
			bugID:          bug.ID.String(),
			content:        "",
			userID:         user.ID,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name:           "non-existent bug",
			bugID:          uuid.New().String(),
			content:        "Response to non-existent bug",
			userID:         user.ID,
			expectedStatus: http.StatusNotFound,
			expectedError:  "BUG_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(tt.userID))
			router.POST("/bugs/:id/company-response", bugHandler.AddCompanyResponse)

			requestBody := map[string]string{
				"content": tt.content,
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("POST", "/bugs/"+tt.bugID+"/company-response", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else if w.Code == http.StatusCreated {
				// Verify comment was created with company response flag
				commentData := response["comment"].(map[string]interface{})
				assert.Equal(t, tt.content, commentData["content"])
				assert.True(t, commentData["is_company_response"].(bool))

				// Verify bug comment count was updated
				var updatedBug models.BugReport
				require.NoError(t, db.First(&updatedBug, bug.ID).Error)
				assert.Greater(t, updatedBug.CommentCount, bug.CommentCount)
			}
		})
	}
}

func TestCompanyCreationFromBugSubmission(t *testing.T) {
	_, db := setupCompanyTestHandler(t)
	bugHandler := NewBugHandler(db, nil)

	user := createTestUser(t, db)

	tests := []struct {
		name            string
		applicationName string
		applicationURL  *string
		expectedDomain  string
	}{
		{
			name:            "create company from URL",
			applicationName: "Test App",
			applicationURL:  stringPtr("https://testapp.com"),
			expectedDomain:  "testapp.com",
		},
		{
			name:            "create company from app name",
			applicationName: "My Cool App",
			applicationURL:  nil,
			expectedDomain:  "my-cool-app.app",
		},
		{
			name:            "create company from domain-like name",
			applicationName: "example.com",
			applicationURL:  nil,
			expectedDomain:  "example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.Use(mockAuthMiddleware(user.ID))
			router.POST("/bugs", bugHandler.CreateBug)

			requestBody := map[string]interface{}{
				"title":            "Test Bug",
				"description":      "This is a test bug description for company creation",
				"application_name": tt.applicationName,
			}
			if tt.applicationURL != nil {
				requestBody["application_url"] = *tt.applicationURL
			}
			jsonBody, _ := json.Marshal(requestBody)

			req, _ := http.NewRequest("POST", "/bugs", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)

			// Verify company was created
			var company models.Company
			err := db.Where("domain = ?", tt.expectedDomain).First(&company).Error
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedDomain, company.Domain)
			assert.False(t, company.IsVerified) // Should be unverified initially

			// Verify application is associated with company
			var application models.Application
			err = db.Where("name = ?", tt.applicationName).First(&application).Error
			assert.NoError(t, err)
			assert.NotNil(t, application.CompanyID)
			assert.Equal(t, company.ID, *application.CompanyID)
		})
	}
}
