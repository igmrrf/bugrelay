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
)

// TestBugHandler_CreateBug_ValidationLogic tests bug creation validation and business logic
func TestBugHandler_CreateBug_ValidationLogic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "valid bug creation",
			requestBody: map[string]interface{}{
				"title":            "Valid Bug Report",
				"description":      "This is a valid bug description with sufficient length",
				"application_name": "Test Application",
				"priority":         "medium",
				"tags":            []string{"ui", "crash"},
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "title too short",
			requestBody: map[string]interface{}{
				"title":            "Bug",
				"description":      "This is a valid bug description with sufficient length",
				"application_name": "Test Application",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name: "title too long",
			requestBody: map[string]interface{}{
				"title":            string(make([]byte, 300)), // Exceeds 255 char limit
				"description":      "This is a valid bug description with sufficient length",
				"application_name": "Test Application",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name: "description too short",
			requestBody: map[string]interface{}{
				"title":            "Valid Bug Title",
				"description":      "Short",
				"application_name": "Test Application",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name: "missing application name",
			requestBody: map[string]interface{}{
				"title":       "Valid Bug Title",
				"description": "This is a valid bug description with sufficient length",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name: "invalid priority",
			requestBody: map[string]interface{}{
				"title":            "Valid Bug Title",
				"description":      "This is a valid bug description with sufficient length",
				"application_name": "Test Application",
				"priority":         "invalid_priority",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_PRIORITY",
		},
		{
			name: "too many tags",
			requestBody: map[string]interface{}{
				"title":            "Valid Bug Title",
				"description":      "This is a valid bug description with sufficient length",
				"application_name": "Test Application",
				"tags":            []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11"},
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "TOO_MANY_TAGS",
		},
		{
			name: "valid technical details",
			requestBody: map[string]interface{}{
				"title":            "Bug with Technical Details",
				"description":      "This is a bug report with technical information",
				"application_name": "Test Application",
				"operating_system": "macOS 14.0",
				"device_type":      "Desktop",
				"app_version":      "1.2.3",
				"browser_version":  "Chrome 119.0",
			},
			expectedStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/bugs", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			
			// Add auth middleware for authenticated requests
			mockAuthMiddleware(user.ID)(c)

			handler.CreateBug(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response, "error")
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else {
				assert.Contains(t, response, "bug")
			}
		})
	}
}

// TestBugHandler_CreateBug_UserActivityTracking tests user activity tracking during bug creation
func TestBugHandler_CreateBug_UserActivityTracking(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)

	requestBody := map[string]interface{}{
		"title":            "Test Bug Report",
		"description":      "This is a test bug description that is long enough",
		"application_name": "Test Application",
		"priority":         "medium",
	}

	body, err := json.Marshal(requestBody)
	require.NoError(t, err)

	// Create request
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/bugs", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	
	// Add auth middleware
	mockAuthMiddleware(user.ID)(c)

	// Call handler
	handler.CreateBug(c)

	// Assert response
	assert.Equal(t, http.StatusCreated, w.Code)

	// Verify user activity was updated
	var updatedUser models.User
	require.NoError(t, db.First(&updatedUser, user.ID).Error)
	assert.True(t, updatedUser.LastActiveAt.After(user.LastActiveAt))
}

// TestBugHandler_ApplicationAutoDiscovery tests application creation and discovery logic
func TestBugHandler_ApplicationAutoDiscovery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)

	// Create an existing application
	existingApp := &models.Application{
		ID:   uuid.New(),
		Name: "Existing App",
		URL:  stringPtr("https://existing.com"),
	}
	require.NoError(t, db.Create(existingApp).Error)

	tests := []struct {
		name            string
		applicationName string
		applicationURL  *string
		expectNewApp    bool
	}{
		{
			name:            "find existing app by name",
			applicationName: "Existing App",
			expectNewApp:    false,
		},
		{
			name:            "find existing app by URL",
			applicationName: "Different Name",
			applicationURL:  stringPtr("https://existing.com"),
			expectNewApp:    false,
		},
		{
			name:            "create new app",
			applicationName: "New Application",
			applicationURL:  stringPtr("https://newapp.com"),
			expectNewApp:    true,
		},
		{
			name:            "create new app without URL",
			applicationName: "Another New App",
			expectNewApp:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requestBody := map[string]interface{}{
				"title":            "Test Bug for " + tt.applicationName,
				"description":      "This is a test bug description with sufficient length",
				"application_name": tt.applicationName,
			}
			if tt.applicationURL != nil {
				requestBody["application_url"] = *tt.applicationURL
			}

			body, err := json.Marshal(requestBody)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/bugs", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			
			mockAuthMiddleware(user.ID)(c)

			handler.CreateBug(c)

			assert.Equal(t, http.StatusCreated, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			bug := response["bug"].(map[string]interface{})
			application := bug["application"].(map[string]interface{})

			if tt.expectNewApp {
				// Verify new application was created
				assert.NotEqual(t, existingApp.ID.String(), application["id"])
			} else {
				// Verify existing application was used
				assert.Equal(t, existingApp.ID.String(), application["id"])
			}
		})
	}
}

// TestBugHandler_AnonymousBugSubmission tests anonymous bug submission functionality
func TestBugHandler_AnonymousBugSubmission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, _ := setupBugTestHandler(t)

	requestBody := map[string]interface{}{
		"title":            "Anonymous Bug Report",
		"description":      "This is an anonymous bug report with sufficient length",
		"application_name": "Test Application",
		"contact_email":    "reporter@example.com",
	}

	body, err := json.Marshal(requestBody)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/bugs", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	
	// No auth middleware - anonymous submission

	handler.CreateBug(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "bug")
	bug := response["bug"].(map[string]interface{})
	
	// Verify reporter is nil for anonymous submission
	assert.Nil(t, bug["reporter"])
}