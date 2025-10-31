package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestBugHandler_StatusManagement tests bug status update functionality
func TestBugHandler_StatusManagement(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	// Create company and company user
	company := &models.Company{
		ID:         uuid.New(),
		Name:       "Test Company",
		Domain:     "testcompany.com",
		IsVerified: true,
	}
	require.NoError(t, db.Create(company).Error)

	companyUser := &models.User{
		ID:          uuid.New(),
		Email:       "company@testcompany.com",
		DisplayName: "Company Rep",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(companyUser).Error)

	membership := &models.CompanyMember{
		ID:        uuid.New(),
		CompanyID: company.ID,
		UserID:    companyUser.ID,
		Role:      "member",
	}
	require.NoError(t, db.Create(membership).Error)

	// Assign company to bug
	require.NoError(t, db.Model(bug).Update("assigned_company_id", company.ID).Error)

	// Create admin user
	adminUser := &models.User{
		ID:          uuid.New(),
		Email:       "admin@example.com",
		DisplayName: "Admin User",
		IsAdmin:     true,
	}
	require.NoError(t, db.Create(adminUser).Error)

	tests := []struct {
		name           string
		userID         uuid.UUID
		isAdmin        bool
		status         string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "company user updates status",
			userID:         companyUser.ID,
			status:         models.BugStatusReviewing,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "admin updates status",
			userID:         adminUser.ID,
			isAdmin:        true,
			status:         models.BugStatusFixed,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "regular user cannot update status",
			userID:         user.ID,
			status:         models.BugStatusFixed,
			expectedStatus: http.StatusForbidden,
			expectedError:  "INSUFFICIENT_PERMISSIONS",
		},
		{
			name:           "invalid status",
			userID:         companyUser.ID,
			status:         "invalid_status",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_STATUS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requestBody := map[string]interface{}{
				"status": tt.status,
			}

			body, err := json.Marshal(requestBody)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
			
			// Mock auth middleware with admin flag
			c.Set("user_id", tt.userID.String())
			c.Set("is_admin", tt.isAdmin)
			c.Next()

			handler.UpdateBugStatus(c)

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
				bug := response["bug"].(map[string]interface{})
				assert.Equal(t, tt.status, bug["status"])
			}
		})
	}
}

// TestBugHandler_StatusManagement_ResolvedTimestamp tests resolved timestamp handling
func TestBugHandler_StatusManagement_ResolvedTimestamp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	// Create company and company user
	company := &models.Company{
		ID:         uuid.New(),
		Name:       "Test Company",
		Domain:     "testcompany.com",
		IsVerified: true,
	}
	require.NoError(t, db.Create(company).Error)

	companyUser := &models.User{
		ID:          uuid.New(),
		Email:       "company@testcompany.com",
		DisplayName: "Company Rep",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(companyUser).Error)

	membership := &models.CompanyMember{
		ID:        uuid.New(),
		CompanyID: company.ID,
		UserID:    companyUser.ID,
		Role:      "member",
	}
	require.NoError(t, db.Create(membership).Error)

	// Assign company to bug
	require.NoError(t, db.Model(bug).Update("assigned_company_id", company.ID).Error)

	t.Run("setting status to fixed sets resolved_at", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"status": models.BugStatusFixed,
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		c.Set("user_id", companyUser.ID.String())
		c.Set("is_admin", false)
		c.Next()

		handler.UpdateBugStatus(c)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify resolved_at is set
		var updatedBug models.BugReport
		require.NoError(t, db.First(&updatedBug, bug.ID).Error)
		assert.NotNil(t, updatedBug.ResolvedAt)
		assert.Equal(t, models.BugStatusFixed, updatedBug.Status)
	})

	t.Run("changing status back to open clears resolved_at", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"status": models.BugStatusOpen,
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		c.Set("user_id", companyUser.ID.String())
		c.Set("is_admin", false)
		c.Next()

		handler.UpdateBugStatus(c)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify resolved_at is cleared
		var updatedBug models.BugReport
		require.NoError(t, db.First(&updatedBug, bug.ID).Error)
		assert.Nil(t, updatedBug.ResolvedAt)
		assert.Equal(t, models.BugStatusOpen, updatedBug.Status)
	})
}

// TestBugHandler_StatusManagement_Permissions tests permission handling for status updates
func TestBugHandler_StatusManagement_Permissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	// Create company and company user
	company := &models.Company{
		ID:         uuid.New(),
		Name:       "Test Company",
		Domain:     "testcompany.com",
		IsVerified: true,
	}
	require.NoError(t, db.Create(company).Error)

	companyUser := &models.User{
		ID:          uuid.New(),
		Email:       "company@testcompany.com",
		DisplayName: "Company Rep",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(companyUser).Error)

	membership := &models.CompanyMember{
		ID:        uuid.New(),
		CompanyID: company.ID,
		UserID:    companyUser.ID,
		Role:      "member",
	}
	require.NoError(t, db.Create(membership).Error)

	// Create different company
	otherCompany := &models.Company{
		ID:         uuid.New(),
		Name:       "Other Company",
		Domain:     "othercompany.com",
		IsVerified: true,
	}
	require.NoError(t, db.Create(otherCompany).Error)

	otherCompanyUser := &models.User{
		ID:          uuid.New(),
		Email:       "other@othercompany.com",
		DisplayName: "Other Company Rep",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(otherCompanyUser).Error)

	otherMembership := &models.CompanyMember{
		ID:        uuid.New(),
		CompanyID: otherCompany.ID,
		UserID:    otherCompanyUser.ID,
		Role:      "member",
	}
	require.NoError(t, db.Create(otherMembership).Error)

	// Assign first company to bug
	require.NoError(t, db.Model(bug).Update("assigned_company_id", company.ID).Error)

	t.Run("company member can update their bug status", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"status": models.BugStatusReviewing,
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		c.Set("user_id", companyUser.ID.String())
		c.Set("is_admin", false)
		c.Next()

		handler.UpdateBugStatus(c)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("other company member cannot update bug status", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"status": models.BugStatusFixed,
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		c.Set("user_id", otherCompanyUser.ID.String())
		c.Set("is_admin", false)
		c.Next()

		handler.UpdateBugStatus(c)

		assert.Equal(t, http.StatusForbidden, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		
		assert.Contains(t, response, "error")
		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "INSUFFICIENT_PERMISSIONS", errorData["code"])
	})

	t.Run("unauthenticated user cannot update status", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"status": models.BugStatusFixed,
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		// No auth middleware

		handler.UpdateBugStatus(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// TestBugHandler_StatusManagement_ValidationErrors tests validation error handling
func TestBugHandler_StatusManagement_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	// Create admin user
	adminUser := &models.User{
		ID:          uuid.New(),
		Email:       "admin@example.com",
		DisplayName: "Admin User",
		IsAdmin:     true,
	}
	require.NoError(t, db.Create(adminUser).Error)

	tests := []struct {
		name           string
		bugID          string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:  "invalid bug ID",
			bugID: "invalid-uuid",
			requestBody: map[string]interface{}{
				"status": models.BugStatusFixed,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_ID",
		},
		{
			name:  "non-existent bug",
			bugID: uuid.New().String(),
			requestBody: map[string]interface{}{
				"status": models.BugStatusFixed,
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "BUG_NOT_FOUND",
		},
		{
			name:  "missing status field",
			bugID: bug.ID.String(),
			requestBody: map[string]interface{}{
				"other_field": "value",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name:  "empty status",
			bugID: bug.ID.String(),
			requestBody: map[string]interface{}{
				"status": "",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name:  "invalid status value",
			bugID: bug.ID.String(),
			requestBody: map[string]interface{}{
				"status": "invalid_status_value",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_STATUS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("PATCH", fmt.Sprintf("/bugs/%s/status", tt.bugID), bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.bugID}}
			
			// Use admin user for permission
			c.Set("user_id", adminUser.ID.String())
			c.Set("is_admin", true)
			c.Next()

			handler.UpdateBugStatus(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			
			assert.Contains(t, response, "error")
			errorData := response["error"].(map[string]interface{})
			assert.Equal(t, tt.expectedError, errorData["code"])
		})
	}
}