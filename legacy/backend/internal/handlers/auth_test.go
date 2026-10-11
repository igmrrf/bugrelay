package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"bugrelay-backend/internal/auth"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)

	// Auto-migrate the schema - SQLite will ignore PostgreSQL-specific defaults
	err = db.AutoMigrate(
		&models.User{},
		&models.JWTBlacklist{},
	)
	require.NoError(t, err)

	return db
}

func setupTestAuthHandler(t *testing.T) (*AuthHandler, *gorm.DB) {
	db := setupTestDB(t)
	
	authConfig := auth.Config{
		JWTSecret:       "test-secret",
		AccessTokenTTL:  time.Hour,
		RefreshTokenTTL: 24 * time.Hour,
	}
	
	authService := auth.NewService(authConfig, db, nil) // Redis not needed for tests
	handler := NewAuthHandler(db, authService)
	
	return handler, db
}

func TestAuthHandler_Register(t *testing.T) {
	handler, _ := setupTestAuthHandler(t)
	
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/register", handler.Register)

	tests := []struct {
		name           string
		payload        RegisterRequest
		expectedStatus int
		expectError    bool
	}{
		{
			name: "valid registration",
			payload: RegisterRequest{
				Email:       "test@example.com",
				Password:    "password123",
				DisplayName: "Test User",
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name: "invalid email",
			payload: RegisterRequest{
				Email:       "invalid-email",
				Password:    "password123",
				DisplayName: "Test User",
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name: "password too short",
			payload: RegisterRequest{
				Email:       "test2@example.com",
				Password:    "short",
				DisplayName: "Test User",
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name: "missing display name",
			payload: RegisterRequest{
				Email:    "test3@example.com",
				Password: "password123",
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonPayload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(jsonPayload))
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			
			if tt.expectError {
				assert.Contains(t, response, "error")
			} else {
				assert.Contains(t, response, "data")
				data := response["data"].(map[string]interface{})
				assert.Contains(t, data, "access_token")
				assert.Contains(t, data, "refresh_token")
				assert.Contains(t, data, "user")
			}
		})
	}
}

func TestAuthHandler_Register_DuplicateEmail(t *testing.T) {
	handler, db := setupTestAuthHandler(t)
	
	// Create a user first
	user := models.User{
		Email:       "test@example.com",
		DisplayName: "Existing User",
		AuthProvider: "email",
	}
	db.Create(&user)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/register", handler.Register)

	payload := RegisterRequest{
		Email:       "test@example.com", // Same email
		Password:    "password123",
		DisplayName: "New User",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusConflict, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Contains(t, response, "error")
	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "USER_EXISTS", errorData["code"])
}

func TestAuthHandler_Login(t *testing.T) {
	handler, db := setupTestAuthHandler(t)
	
	// Create a test user
	hashedPassword, _ := handler.authService.HashPassword("password123")
	user := models.User{
		Email:           "test@example.com",
		DisplayName:     "Test User",
		PasswordHash:    &hashedPassword,
		AuthProvider:    "email",
		IsEmailVerified: true,
	}
	db.Create(&user)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/login", handler.Login)

	tests := []struct {
		name           string
		payload        LoginRequest
		expectedStatus int
		expectError    bool
	}{
		{
			name: "valid login",
			payload: LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name: "invalid password",
			payload: LoginRequest{
				Email:    "test@example.com",
				Password: "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
		},
		{
			name: "non-existent user",
			payload: LoginRequest{
				Email:    "nonexistent@example.com",
				Password: "password123",
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonPayload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			
			if tt.expectError {
				assert.Contains(t, response, "error")
			} else {
				assert.Contains(t, response, "data")
				data := response["data"].(map[string]interface{})
				assert.Contains(t, data, "access_token")
				assert.Contains(t, data, "refresh_token")
				assert.Contains(t, data, "user")
			}
		})
	}
}

func TestAuthHandler_Login_UnverifiedEmail(t *testing.T) {
	handler, db := setupTestAuthHandler(t)
	
	// Create a test user with unverified email
	hashedPassword, _ := handler.authService.HashPassword("password123")
	user := models.User{
		Email:           "test@example.com",
		DisplayName:     "Test User",
		PasswordHash:    &hashedPassword,
		AuthProvider:    "email",
		IsEmailVerified: false, // Not verified
	}
	db.Create(&user)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/login", handler.Login)

	payload := LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Contains(t, response, "error")
	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "EMAIL_NOT_VERIFIED", errorData["code"])
}

func TestAuthHandler_RefreshToken(t *testing.T) {
	handler, _ := setupTestAuthHandler(t)
	
	// Generate initial tokens
	userID := uuid.New().String()
	email := "test@example.com"
	_, refreshToken, err := handler.authService.GenerateTokens(userID, email, false)
	require.NoError(t, err)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/refresh", handler.RefreshToken)

	payload := RefreshTokenRequest{
		RefreshToken: refreshToken,
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/refresh", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Contains(t, response, "data")
	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "access_token")
	assert.Contains(t, data, "refresh_token")
	
	// New tokens should be different from original
	newRefreshToken := data["refresh_token"].(string)
	assert.NotEqual(t, refreshToken, newRefreshToken)
}

func TestAuthHandler_RefreshToken_InvalidToken(t *testing.T) {
	handler, _ := setupTestAuthHandler(t)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/refresh", handler.RefreshToken)

	payload := RefreshTokenRequest{
		RefreshToken: "invalid-token",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/refresh", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Contains(t, response, "error")
	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "INVALID_REFRESH_TOKEN", errorData["code"])
}

func TestAuthHandler_RequestPasswordReset(t *testing.T) {
	handler, db := setupTestAuthHandler(t)
	
	// Create a test user
	hashedPassword, _ := handler.authService.HashPassword("password123")
	user := models.User{
		Email:        "test@example.com",
		DisplayName:  "Test User",
		PasswordHash: &hashedPassword,
		AuthProvider: "email",
	}
	db.Create(&user)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/password-reset", handler.RequestPasswordReset)

	tests := []struct {
		name           string
		email          string
		expectedStatus int
	}{
		{
			name:           "existing user",
			email:          "test@example.com",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "non-existent user",
			email:          "nonexistent@example.com",
			expectedStatus: http.StatusOK, // Same response for security
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := PasswordResetRequest{
				Email: tt.email,
			}

			jsonPayload, _ := json.Marshal(payload)
			req, _ := http.NewRequest("POST", "/password-reset", bytes.NewBuffer(jsonPayload))
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}