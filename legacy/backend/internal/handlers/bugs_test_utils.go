package handlers

import (
	"testing"

	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupBugTestDB creates an in-memory SQLite database for testing
func setupBugTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)

	// Auto-migrate the schema - SQLite will ignore PostgreSQL-specific defaults
	err = db.AutoMigrate(
		&models.User{},
		&models.Company{},
		&models.Application{},
		&models.BugReport{},
		&models.BugVote{},
		&models.Comment{},
		&models.CompanyMember{},
		&models.FileAttachment{},
		&models.AuditLog{},
	)
	require.NoError(t, err)

	return db
}

// setupBugTestHandler creates a bug handler with test database
func setupBugTestHandler(t *testing.T) (*BugHandler, *gorm.DB) {
	db := setupBugTestDB(t)
	handler := NewBugHandler(db, nil)
	return handler, db
}

// createTestUser creates a test user in the database
func createTestUser(t *testing.T, db *gorm.DB) *models.User {
	user := &models.User{
		ID:          uuid.New(),
		Email:       "test@example.com",
		DisplayName: "Test User",
		IsAdmin:     false,
	}
	require.NoError(t, db.Create(user).Error)
	return user
}

// createTestApplication creates a test application in the database
func createTestApplication(t *testing.T, db *gorm.DB) *models.Application {
	app := &models.Application{
		ID:   uuid.New(),
		Name: "Test App",
		URL:  stringPtr("https://testapp.com"),
	}
	require.NoError(t, db.Create(app).Error)
	return app
}

// createTestBugReport creates a test bug report in the database
func createTestBugReport(t *testing.T, db *gorm.DB, app *models.Application, reporter *models.User) *models.BugReport {
	bug := &models.BugReport{
		ID:            uuid.New(),
		Title:         "Test Bug",
		Description:   "This is a test bug description",
		Status:        models.BugStatusOpen,
		Priority:      models.BugPriorityMedium,
		ApplicationID: app.ID,
		ReporterID:    &reporter.ID,
		VoteCount:     0,
		CommentCount:  0,
	}
	require.NoError(t, db.Create(bug).Error)
	return bug
}

// stringPtr returns a pointer to the given string
func stringPtr(s string) *string {
	return &s
}

// mockAuthMiddleware creates a mock authentication middleware for testing
func mockAuthMiddleware(userID uuid.UUID) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", userID.String())
		c.Set("is_admin", false)
		c.Next()
	}
}

// mockAdminAuthMiddleware creates a mock admin authentication middleware for testing
func mockAdminAuthMiddleware(userID uuid.UUID) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", userID.String())
		c.Set("is_admin", true)
		c.Next()
	}
}
