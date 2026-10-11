package handlers

import (
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

// TestBugHandler_GetBug tests retrieving a single bug report
func TestBugHandler_GetBug(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)
	bug := createTestBugReport(t, db, app, user)

	tests := []struct {
		name           string
		bugID          string
		expectedStatus int
	}{
		{
			name:           "successful bug retrieval",
			bugID:          bug.ID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid bug ID",
			bugID:          "invalid-uuid",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "non-existent bug",
			bugID:          uuid.New().String(),
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", fmt.Sprintf("/bugs/%s", tt.bugID), nil)
			c.Params = gin.Params{{Key: "id", Value: tt.bugID}}

			// Call handler
			handler.GetBug(c)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "bug")
			}
		})
	}
}

// TestBugHandler_ListBugs_Filtering tests bug listing with various filters
func TestBugHandler_ListBugs_Filtering(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)

	// Create test bugs with different properties
	bug1 := &models.BugReport{
		ID:            uuid.New(),
		Title:         "High Priority Bug",
		Description:   "This is a high priority bug",
		Status:        models.BugStatusOpen,
		Priority:      models.BugPriorityHigh,
		ApplicationID: app.ID,
		ReporterID:    &user.ID,
		VoteCount:     5,
		CommentCount:  2,
	}
	require.NoError(t, db.Create(bug1).Error)

	bug2 := &models.BugReport{
		ID:            uuid.New(),
		Title:         "Fixed Bug",
		Description:   "This bug has been fixed",
		Status:        models.BugStatusFixed,
		Priority:      models.BugPriorityMedium,
		ApplicationID: app.ID,
		ReporterID:    &user.ID,
		VoteCount:     10,
		CommentCount:  5,
	}
	require.NoError(t, db.Create(bug2).Error)

	tests := []struct {
		name           string
		queryParams    string
		expectedCount  int
		expectedStatus int
	}{
		{
			name:           "list all bugs",
			queryParams:    "",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by status",
			queryParams:    "?status=open",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by priority",
			queryParams:    "?priority=high",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "sort by popular",
			queryParams:    "?sort=popular",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "pagination",
			queryParams:    "?page=1&limit=1",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/bugs"+tt.queryParams, nil)

			// Call handler
			handler.ListBugs(c)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				
				bugs := response["bugs"].([]interface{})
				assert.Equal(t, tt.expectedCount, len(bugs))
				
				// Verify pagination info exists
				assert.Contains(t, response, "pagination")
			}
		})
	}
}

// TestBugHandler_SearchFunctionality tests search and filtering capabilities
func TestBugHandler_SearchFunctionality(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app1 := createTestApplication(t, db)
	
	// Create second application
	app2 := &models.Application{
		ID:   uuid.New(),
		Name: "Second App",
		URL:  stringPtr("https://secondapp.com"),
	}
	require.NoError(t, db.Create(app2).Error)

	// Create test bugs with different properties
	bugs := []*models.BugReport{
		{
			ID:            uuid.New(),
			Title:         "Critical Login Bug",
			Description:   "Users cannot login to the application",
			Status:        models.BugStatusOpen,
			Priority:      models.BugPriorityCritical,
			ApplicationID: app1.ID,
			ReporterID:    &user.ID,
			VoteCount:     15,
			CommentCount:  3,
		},
		{
			ID:            uuid.New(),
			Title:         "UI Display Issue",
			Description:   "Button alignment is incorrect on mobile devices",
			Status:        models.BugStatusReviewing,
			Priority:      models.BugPriorityMedium,
			ApplicationID: app2.ID,
			ReporterID:    &user.ID,
			VoteCount:     5,
			CommentCount:  1,
		},
		{
			ID:            uuid.New(),
			Title:         "Performance Problem",
			Description:   "Application loads slowly on older devices",
			Status:        models.BugStatusFixed,
			Priority:      models.BugPriorityHigh,
			ApplicationID: app1.ID,
			ReporterID:    &user.ID,
			VoteCount:     8,
			CommentCount:  2,
		},
	}

	for _, bug := range bugs {
		require.NoError(t, db.Create(bug).Error)
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedCount  int
		expectedStatus int
		checkOrder     bool
		expectedFirst  string
	}{
		{
			name:           "search by title keyword",
			queryParams:    "?search=login",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "search by description keyword",
			queryParams:    "?search=mobile",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by status open",
			queryParams:    "?status=open",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by status reviewing",
			queryParams:    "?status=reviewing",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by priority critical",
			queryParams:    "?priority=critical",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by application",
			queryParams:    "?application=Test App",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "sort by popular (vote count)",
			queryParams:    "?sort=popular",
			expectedCount:  3,
			expectedStatus: http.StatusOK,
			checkOrder:     true,
			expectedFirst:  "Critical Login Bug",
		},
		{
			name:           "sort by recent",
			queryParams:    "?sort=recent",
			expectedCount:  3,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "pagination first page",
			queryParams:    "?page=1&limit=2",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "pagination second page",
			queryParams:    "?page=2&limit=2",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid status filter",
			queryParams:    "?status=invalid_status",
			expectedCount:  3, // Should return all bugs (filter ignored)
			expectedStatus: http.StatusOK,
		},
		{
			name:           "combined filters",
			queryParams:    "?status=open&priority=critical",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/bugs"+tt.queryParams, nil)

			handler.ListBugs(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if w.Code == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				
				bugs := response["bugs"].([]interface{})
				assert.Equal(t, tt.expectedCount, len(bugs))
				
				// Verify pagination info
				assert.Contains(t, response, "pagination")
				pagination := response["pagination"].(map[string]interface{})
				assert.Contains(t, pagination, "total")
				
				// Check ordering if specified
				if tt.checkOrder && len(bugs) > 0 {
					firstBug := bugs[0].(map[string]interface{})
					assert.Equal(t, tt.expectedFirst, firstBug["title"])
				}
			}
		})
	}
}

// TestBugHandler_PaginationLogic tests pagination functionality
func TestBugHandler_PaginationLogic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	handler, db := setupBugTestHandler(t)
	user := createTestUser(t, db)
	app := createTestApplication(t, db)

	// Create multiple bugs for pagination testing
	for i := 0; i < 25; i++ {
		bug := &models.BugReport{
			ID:            uuid.New(),
			Title:         fmt.Sprintf("Bug Report %d", i+1),
			Description:   fmt.Sprintf("This is bug report number %d", i+1),
			Status:        models.BugStatusOpen,
			Priority:      models.BugPriorityMedium,
			ApplicationID: app.ID,
			ReporterID:    &user.ID,
			VoteCount:     i,
			CommentCount:  0,
		}
		require.NoError(t, db.Create(bug).Error)
	}

	tests := []struct {
		name           string
		queryParams    string
		expectedCount  int
		expectedPage   float64
		expectedTotal  float64
		hasNext        bool
		hasPrev        bool
	}{
		{
			name:           "first page default limit",
			queryParams:    "",
			expectedCount:  20,
			expectedPage:   1,
			expectedTotal:  25,
			hasNext:        true,
			hasPrev:        false,
		},
		{
			name:           "second page default limit",
			queryParams:    "?page=2",
			expectedCount:  5,
			expectedPage:   2,
			expectedTotal:  25,
			hasNext:        false,
			hasPrev:        true,
		},
		{
			name:           "custom limit",
			queryParams:    "?limit=10",
			expectedCount:  10,
			expectedPage:   1,
			expectedTotal:  25,
			hasNext:        true,
			hasPrev:        false,
		},
		{
			name:           "page 2 with custom limit",
			queryParams:    "?page=2&limit=10",
			expectedCount:  10,
			expectedPage:   2,
			expectedTotal:  25,
			hasNext:        true,
			hasPrev:        true,
		},
		{
			name:           "last page with custom limit",
			queryParams:    "?page=3&limit=10",
			expectedCount:  5,
			expectedPage:   3,
			expectedTotal:  25,
			hasNext:        false,
			hasPrev:        true,
		},
		{
			name:           "invalid page number",
			queryParams:    "?page=0",
			expectedCount:  20,
			expectedPage:   1,
			expectedTotal:  25,
			hasNext:        true,
			hasPrev:        false,
		},
		{
			name:           "limit too high",
			queryParams:    "?limit=200",
			expectedCount:  20, // Should be capped at 20
			expectedPage:   1,
			expectedTotal:  25,
			hasNext:        true,
			hasPrev:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/bugs"+tt.queryParams, nil)

			handler.ListBugs(c)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			
			bugs := response["bugs"].([]interface{})
			assert.Equal(t, tt.expectedCount, len(bugs))
			
			pagination := response["pagination"].(map[string]interface{})
			assert.Equal(t, tt.expectedPage, pagination["page"])
			assert.Equal(t, tt.expectedTotal, pagination["total"])
			assert.Equal(t, tt.hasNext, pagination["has_next"])
			assert.Equal(t, tt.hasPrev, pagination["has_prev"])
		})
	}
}