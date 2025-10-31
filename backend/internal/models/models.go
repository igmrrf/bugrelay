package models

import (
	"gorm.io/gorm"
)

// AllModels returns a slice of all model structs for migration purposes
func AllModels() []interface{} {
	return []interface{}{
		&User{},
		&Company{},
		&CompanyMember{},
		&Application{},
		&BugReport{},
		&BugVote{},
		&Comment{},
		&FileAttachment{},
		&JWTBlacklist{},
		&AuditLog{},
	}
}

// AutoMigrate runs auto-migration for all models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(AllModels()...)
}

// CreateIndexes creates additional indexes that GORM doesn't handle automatically
func CreateIndexes(db *gorm.DB) error {
	// These indexes are already created in the SQL migration file,
	// but we can add them here for completeness if using GORM auto-migration
	
	// Full-text search index (PostgreSQL specific)
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_search ON bug_reports USING gin(to_tsvector('english', title || ' ' || description))").Error; err != nil {
		return err
	}

	// Additional performance indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_vote_count ON bug_reports(vote_count DESC)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_application_id ON bug_reports(application_id)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_bug_reports_company_id ON bug_reports(assigned_company_id)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, auth_provider_id)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_token ON jwt_blacklist(token_jti)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires ON jwt_blacklist(expires_at)").Error; err != nil {
		return err
	}

	return nil
}