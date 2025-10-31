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

// TestBugHandler_VoteBug tests basic voting functionality
func TestBugHandler_VoteBug(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	tests := []struct {
		name           string
		bugID          string
		userID         uuid.UUID
		setupVote      bool
		expectedStatus int
		expectedVoted  bool
	}{
		{
			name:           "successful vote creation",
			bugID:          bug.ID.String(),
			userID:         user.ID,
			setupVote:      false,
			expectedStatus: http.StatusCreated,
			expectedVoted:  true,
		},
		{
			name:           "successful vote removal (toggle)",
			bugID:          bug.ID.String(),
			userID:         user.ID,
			setupVote:      true,
			expectedStatus: http.StatusOK,
			expectedVoted:  false,
		},
		{
			name:           "invalid bug ID",
			bugID:          "invalid-uuid",
			userID:         user.ID,
			setupVote:      false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "non-existent bug",
			bugID:          uuid.New().String(),
			userID:         user.ID,
			setupVote:      false,
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup existing vote if needed
			if tt.setupVote {
				vote := &models.BugVote{
					BugID:  bug.ID,
					UserID: tt.userID,
				}
				require.NoError(t, db.Create(vote).Error)
				// Update bug vote count
				require.NoError(t, db.Model(bug).Update("vote_count", 1).Error)
			}

			// Create request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", tt.bugID), nil)
			c.Params = gin.Params{{Key: "id", Value: tt.bugID}}
			
			// Add auth middleware
			mockAuthMiddleware(tt.userID)(c)

			// Call handler
			handler.VoteBug(c)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK || w.Code == http.StatusCreated {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedVoted, response["voted"])

				// Verify vote count in database
				var updatedBug models.BugReport
				require.NoError(t, db.First(&updatedBug, bug.ID).Error)
				if tt.expectedVoted {
					assert.Equal(t, 1, updatedBug.VoteCount)
				} else {
					assert.Equal(t, 0, updatedBug.VoteCount)
				}

				// Verify user activity was updated
				var updatedUser models.User
				require.NoError(t, db.First(&updatedUser, user.ID).Error)
				assert.True(t, updatedUser.LastActiveAt.After(user.LastActiveAt))
			}

			// Cleanup for next test
			db.Where("bug_id = ? AND user_id = ?", bug.ID, tt.userID).Delete(&models.BugVote{})
			db.Model(bug).Update("vote_count", 0)
		})
	}
}

// TestBugHandler_VotingSystem tests comprehensive voting functionality
func TestBugHandler_VotingSystem(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user1 := createTestUser(t, db)
	
	// Create second user
	user2 := &models.User{
		ID:          uuid.New(),
		Email:       "user2@example.com",
		DisplayName: "User Two",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(user2).Error)
	
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user1)

	t.Run("successful vote creation", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", bug.ID.String()), nil)
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		mockAuthMiddleware(user1.ID)(c)
		handler.VoteBug(c)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, true, response["voted"])

		// Verify vote count in database
		var updatedBug models.BugReport
		require.NoError(t, db.First(&updatedBug, bug.ID).Error)
		assert.Equal(t, 1, updatedBug.VoteCount)

		// Verify vote record exists
		var vote models.BugVote
		err = db.Where("bug_id = ? AND user_id = ?", bug.ID, user1.ID).First(&vote).Error
		assert.NoError(t, err)
	})

	t.Run("vote toggle (removal)", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", bug.ID.String()), nil)
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		mockAuthMiddleware(user1.ID)(c)
		handler.VoteBug(c)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, false, response["voted"])

		// Verify vote count decreased
		var updatedBug models.BugReport
		require.NoError(t, db.First(&updatedBug, bug.ID).Error)
		assert.Equal(t, 0, updatedBug.VoteCount)
	})

	t.Run("multiple users voting", func(t *testing.T) {
		// User1 votes
		w1 := httptest.NewRecorder()
		c1, _ := gin.CreateTestContext(w1)
		c1.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", bug.ID.String()), nil)
		c1.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		mockAuthMiddleware(user1.ID)(c1)
		handler.VoteBug(c1)
		assert.Equal(t, http.StatusCreated, w1.Code)

		// User2 votes
		w2 := httptest.NewRecorder()
		c2, _ := gin.CreateTestContext(w2)
		c2.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", bug.ID.String()), nil)
		c2.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		mockAuthMiddleware(user2.ID)(c2)
		handler.VoteBug(c2)
		assert.Equal(t, http.StatusCreated, w2.Code)

		// Verify total vote count
		var updatedBug models.BugReport
		require.NoError(t, db.First(&updatedBug, bug.ID).Error)
		assert.Equal(t, 2, updatedBug.VoteCount)

		// Verify both vote records exist
		var voteCount int64
		db.Model(&models.BugVote{}).Where("bug_id = ?", bug.ID).Count(&voteCount)
		assert.Equal(t, int64(2), voteCount)
	})

	t.Run("unauthenticated vote attempt", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/vote", bug.ID.String()), nil)
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		// No auth middleware
		handler.VoteBug(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// TestBugHandler_CreateComment tests basic commenting functionality
func TestBugHandler_CreateComment(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	tests := []struct {
		name           string
		bugID          string
		userID         uuid.UUID
		requestBody    map[string]interface{}
		expectedStatus int
	}{
		{
			name:   "successful comment creation",
			bugID:  bug.ID.String(),
			userID: user.ID,
			requestBody: map[string]interface{}{
				"content": "This is a test comment",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name:   "empty content",
			bugID:  bug.ID.String(),
			userID: user.ID,
			requestBody: map[string]interface{}{
				"content": "",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "content too long",
			bugID:  bug.ID.String(),
			userID: user.ID,
			requestBody: map[string]interface{}{
				"content": string(make([]byte, 2001)), // Exceeds 2000 char limit
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "invalid bug ID",
			bugID:  "invalid-uuid",
			userID: user.ID,
			requestBody: map[string]interface{}{
				"content": "This is a test comment",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "non-existent bug",
			bugID:  uuid.New().String(),
			userID: user.ID,
			requestBody: map[string]interface{}{
				"content": "This is a test comment",
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request body
			body, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			// Create request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/comments", tt.bugID), bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.bugID}}
			
			// Add auth middleware
			mockAuthMiddleware(tt.userID)(c)

			// Call handler
			handler.CreateComment(c)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusCreated {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "comment")

				// Verify comment count in database
				var updatedBug models.BugReport
				require.NoError(t, db.First(&updatedBug, bug.ID).Error)
				assert.Equal(t, 1, updatedBug.CommentCount)

				// Verify user activity was updated
				var updatedUser models.User
				require.NoError(t, db.First(&updatedUser, user.ID).Error)
				assert.True(t, updatedUser.LastActiveAt.After(user.LastActiveAt))

				// Cleanup
				db.Where("bug_id = ?", bug.ID).Delete(&models.Comment{})
				db.Model(bug).Update("comment_count", 0)
			}
		})
	}
}

// TestBugHandler_CommentingSystem tests comprehensive commenting functionality
func TestBugHandler_CommentingSystem(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	// Create a company and assign it to the bug for company response testing
	company := &models.Company{
		ID:         uuid.New(),
		Name:       "Test Company",
		Domain:     "testcompany.com",
		IsVerified: true,
	}
	require.NoError(t, db.Create(company).Error)

	// Create company user
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

	tests := []struct {
		name              string
		userID            uuid.UUID
		content           string
		expectedStatus    int
		expectedError     string
		expectCompanyResp bool
	}{
		{
			name:           "valid comment creation",
			userID:         user.ID,
			content:        "This is a valid comment with sufficient content",
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "empty content",
			userID:         user.ID,
			content:        "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name:           "content too long",
			userID:         user.ID,
			content:        string(make([]byte, 2001)),
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
		{
			name:              "company response",
			userID:            companyUser.ID,
			content:           "This is a response from the company team",
			expectedStatus:    http.StatusCreated,
			expectCompanyResp: true,
		},
		{
			name:           "whitespace only content",
			userID:         user.ID,
			content:        "   \n\t   ",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "VALIDATION_ERROR",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requestBody := map[string]interface{}{
				"content": tt.content,
			}

			body, err := json.Marshal(requestBody)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/comments", bug.ID.String()), bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
			
			mockAuthMiddleware(tt.userID)(c)
			handler.CreateComment(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response, "error")
				errorData := response["error"].(map[string]interface{})
				assert.Equal(t, tt.expectedError, errorData["code"])
			} else {
				assert.Contains(t, response, "comment")
				comment := response["comment"].(map[string]interface{})
				
				if tt.expectCompanyResp {
					assert.Equal(t, true, comment["is_company_response"])
				} else {
					assert.Equal(t, false, comment["is_company_response"])
				}

				// Verify comment count increased
				var updatedBug models.BugReport
				require.NoError(t, db.First(&updatedBug, bug.ID).Error)
				assert.Greater(t, updatedBug.CommentCount, 0)
			}
		})
	}

	t.Run("unauthenticated comment attempt", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"content": "This should fail without authentication",
		}

		body, err := json.Marshal(requestBody)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", fmt.Sprintf("/bugs/%s/comments", bug.ID.String()), bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: bug.ID.String()}}
		
		// No auth middleware
		handler.CreateComment(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}