package seeder

import (
	"fmt"
	"time"

	"bugrelay-backend/internal/logger"
	"bugrelay-backend/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Seeder handles database seeding for development and testing
type Seeder struct {
	db *gorm.DB
}

// New creates a new seeder instance
func New(db *gorm.DB) *Seeder {
	return &Seeder{db: db}
}

// SeedAll runs all seeders
func (s *Seeder) SeedAll() error {
	logger.Info("Starting database seeding")

	if err := s.SeedUsers(); err != nil {
		return fmt.Errorf("failed to seed users: %w", err)
	}

	if err := s.SeedApplications(); err != nil {
		return fmt.Errorf("failed to seed applications: %w", err)
	}

	if err := s.SeedCompanies(); err != nil {
		return fmt.Errorf("failed to seed companies: %w", err)
	}

	if err := s.SeedBugs(); err != nil {
		return fmt.Errorf("failed to seed bugs: %w", err)
	}

	logger.Info("Database seeding completed successfully")
	return nil
}

// SeedUsers creates test users
func (s *Seeder) SeedUsers() error {
	logger.Info("Seeding users")

	// Check if users already exist
	var count int64
	s.db.Model(&models.User{}).Count(&count)
	if count > 0 {
		logger.Info("Users already exist, skipping user seeding")
		return nil
	}

	// Hash password for test users
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashPtr := func(s string) *string { return &s }

	users := []models.User{
		{
			ID:              uuid.New(),
			Email:           "admin@bugrelay.com",
			DisplayName:     "Admin User",
			PasswordHash:    hashPtr(string(hashedPassword)),
			AuthProvider:    "email",
			IsEmailVerified: true,
			IsAdmin:         true,
			CreatedAt:       time.Now(),
			LastActiveAt:    time.Now(),
		},
		{
			ID:              uuid.New(),
			Email:           "john.doe@example.com",
			DisplayName:     "John Doe",
			PasswordHash:    hashPtr(string(hashedPassword)),
			AuthProvider:    "email",
			IsEmailVerified: true,
			IsAdmin:         false,
			CreatedAt:       time.Now(),
			LastActiveAt:    time.Now(),
		},
		{
			ID:              uuid.New(),
			Email:           "jane.smith@techcorp.com",
			DisplayName:     "Jane Smith",
			PasswordHash:    hashPtr(string(hashedPassword)),
			AuthProvider:    "email",
			IsEmailVerified: true,
			IsAdmin:         false,
			CreatedAt:       time.Now(),
			LastActiveAt:    time.Now(),
		},
		{
			ID:              uuid.New(),
			Email:           "developer@startup.io",
			DisplayName:     "Dev User",
			PasswordHash:    hashPtr(string(hashedPassword)),
			AuthProvider:    "email",
			IsEmailVerified: true,
			IsAdmin:         false,
			CreatedAt:       time.Now(),
			LastActiveAt:    time.Now(),
		},
	}

	for _, user := range users {
		if err := s.db.Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create user %s: %w", user.Email, err)
		}
	}

	logger.Info("Successfully seeded users", logger.Fields{"count": len(users)})
	return nil
}

// SeedApplications creates test applications
func (s *Seeder) SeedApplications() error {
	logger.Info("Seeding applications")

	// Check if applications already exist
	var count int64
	s.db.Model(&models.Application{}).Count(&count)
	if count > 0 {
		logger.Info("Applications already exist, skipping application seeding")
		return nil
	}

	urlPtr := func(s string) *string { return &s }

	applications := []models.Application{
		{
			ID:        uuid.New(),
			Name:      "BugRelay Web App",
			URL:       urlPtr("https://bugrelay.com"),
			CreatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			Name:      "TechCorp Mobile App",
			URL:       urlPtr("https://techcorp.com/mobile"),
			CreatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			Name:      "StartupIO Platform",
			URL:       urlPtr("https://startup.io"),
			CreatedAt: time.Now(),
		},
		{
			ID:        uuid.New(),
			Name:      "E-Commerce Store",
			URL:       urlPtr("https://shop.example.com"),
			CreatedAt: time.Now(),
		},
	}

	for _, app := range applications {
		if err := s.db.Create(&app).Error; err != nil {
			return fmt.Errorf("failed to create application %s: %w", app.Name, err)
		}
	}

	logger.Info("Successfully seeded applications", logger.Fields{"count": len(applications)})
	return nil
}

// SeedCompanies creates test companies
func (s *Seeder) SeedCompanies() error {
	logger.Info("Seeding companies")

	// Check if companies already exist
	var count int64
	s.db.Model(&models.Company{}).Count(&count)
	if count > 0 {
		logger.Info("Companies already exist, skipping company seeding")
		return nil
	}

	// Get applications for association
	var applications []models.Application
	s.db.Find(&applications)

	// Get users for company ownership
	var users []models.User
	s.db.Where("is_admin = ?", false).Find(&users)

	companies := []models.Company{
		{
			ID:         uuid.New(),
			Name:       "TechCorp Inc.",
			Domain:     "techcorp.com",
			IsVerified: true,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			Name:       "StartupIO",
			Domain:     "startup.io",
			IsVerified: true,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			Name:       "E-Commerce Solutions",
			Domain:     "ecommerce.example.com",
			IsVerified: false,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
	}

	for i, company := range companies {
		if err := s.db.Create(&company).Error; err != nil {
			return fmt.Errorf("failed to create company %s: %w", company.Name, err)
		}

		// Associate applications with companies
		if i < len(applications) {
			applications[i].CompanyID = &company.ID
			s.db.Save(&applications[i])
		}

		// Create company members
		if i < len(users) {
			member := models.CompanyMember{
				ID:        uuid.New(),
				CompanyID: company.ID,
				UserID:    users[i].ID,
				Role:      "owner",
				AddedAt:   time.Now(),
			}
			s.db.Create(&member)
		}
	}

	logger.Info("Successfully seeded companies", logger.Fields{"count": len(companies)})
	return nil
}

// SeedBugs creates test bug reports
func (s *Seeder) SeedBugs() error {
	logger.Info("Seeding bugs")

	// Check if bugs already exist
	var count int64
	s.db.Model(&models.BugReport{}).Count(&count)
	if count > 0 {
		logger.Info("Bugs already exist, skipping bug seeding")
		return nil
	}

	// Get applications and users for associations
	var applications []models.Application
	s.db.Find(&applications)

	var users []models.User
	s.db.Where("is_admin = ?", false).Find(&users)

	if len(applications) == 0 || len(users) == 0 {
		logger.Warn("No applications or users found, skipping bug seeding")
		return nil
	}

	bugs := []models.BugReport{
		{
			ID:            uuid.New(),
			Title:         "Login button not working on mobile",
			Description:   "When trying to log in on mobile devices, the login button appears to be unresponsive. This affects both iOS and Android users.",
			Status:        models.BugStatusOpen,
			Priority:      models.BugPriorityHigh,
			ApplicationID: applications[0].ID,
			ReporterID:    &users[0].ID,
			VoteCount:     15,
			CreatedAt:     time.Now().Add(-48 * time.Hour),
			UpdatedAt:     time.Now().Add(-24 * time.Hour),
		},
		{
			ID:            uuid.New(),
			Title:         "Page loading performance issue",
			Description:   "The dashboard page takes too long to load, especially with large datasets. Users are experiencing timeouts.",
			Status:        models.BugStatusReviewing,
			Priority:      models.BugPriorityMedium,
			ApplicationID: applications[1].ID,
			ReporterID:    &users[1].ID,
			VoteCount:     8,
			CreatedAt:     time.Now().Add(-72 * time.Hour),
			UpdatedAt:     time.Now().Add(-12 * time.Hour),
		},
		{
			ID:            uuid.New(),
			Title:         "Data export feature missing CSV format",
			Description:   "Users can export data in JSON and XML formats, but CSV export option is missing from the dropdown.",
			Status:        models.BugStatusOpen,
			Priority:      models.BugPriorityLow,
			ApplicationID: applications[2].ID,
			ReporterID:    &users[2].ID,
			VoteCount:     3,
			CreatedAt:     time.Now().Add(-24 * time.Hour),
			UpdatedAt:     time.Now().Add(-24 * time.Hour),
		},
		{
			ID:            uuid.New(),
			Title:         "Security vulnerability in password reset",
			Description:   "Password reset tokens don't expire and can be reused multiple times, creating a security risk.",
			Status:        models.BugStatusOpen,
			Priority:      models.BugPriorityCritical,
			ApplicationID: applications[0].ID,
			ReporterID:    &users[0].ID,
			VoteCount:     25,
			CreatedAt:     time.Now().Add(-6 * time.Hour),
			UpdatedAt:     time.Now().Add(-6 * time.Hour),
		},
		{
			ID:            uuid.New(),
			Title:         "UI text overlapping on small screens",
			Description:   "On screens smaller than 768px, text in the navigation menu overlaps with icons.",
			Status:        models.BugStatusFixed,
			Priority:      models.BugPriorityMedium,
			ApplicationID: applications[1].ID,
			ReporterID:    &users[1].ID,
			VoteCount:     12,
			CreatedAt:     time.Now().Add(-120 * time.Hour),
			UpdatedAt:     time.Now().Add(-48 * time.Hour),
		},
	}

	for _, bug := range bugs {
		if err := s.db.Create(&bug).Error; err != nil {
			return fmt.Errorf("failed to create bug %s: %w", bug.Title, err)
		}

		// Create some comments for bugs
		if bug.Status != models.BugStatusOpen {
			comment := models.Comment{
				ID:        uuid.New(),
				BugID:     bug.ID,
				UserID:    users[len(users)-1].ID, // Use last user as commenter
				Content:   "I can confirm this issue. Working on a fix.",
				CreatedAt: bug.CreatedAt.Add(2 * time.Hour),
				UpdatedAt: bug.CreatedAt.Add(2 * time.Hour),
			}
			s.db.Create(&comment)
		}
	}

	logger.Info("Successfully seeded bugs", logger.Fields{"count": len(bugs)})
	return nil
}

// SeedForTesting creates minimal test data
func (s *Seeder) SeedForTesting() error {
	logger.Info("Seeding minimal test data")

	// Create a test admin user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("testpass"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashPtr := func(s string) *string { return &s }

	testUser := models.User{
		ID:              uuid.New(),
		Email:           "test@example.com",
		DisplayName:     "Test User",
		PasswordHash:    hashPtr(string(hashedPassword)),
		AuthProvider:    "email",
		IsEmailVerified: true,
		IsAdmin:         true,
		CreatedAt:       time.Now(),
		LastActiveAt:    time.Now(),
	}

	if err := s.db.Create(&testUser).Error; err != nil {
		return fmt.Errorf("failed to create test user: %w", err)
	}

	// Create a test application
	urlPtr := func(s string) *string { return &s }

	testApp := models.Application{
		ID:        uuid.New(),
		Name:      "Test Application",
		URL:       urlPtr("https://test.example.com"),
		CreatedAt: time.Now(),
	}

	if err := s.db.Create(&testApp).Error; err != nil {
		return fmt.Errorf("failed to create test application: %w", err)
	}

	logger.Info("Successfully seeded test data")
	return nil
}

// Clear removes all seeded data (useful for testing)
func (s *Seeder) Clear() error {
	logger.Info("Clearing seeded data")

	// Delete in reverse order of dependencies
	tables := []interface{}{
		&models.Comment{},
		&models.BugReport{},
		&models.CompanyMember{},
		&models.Company{},
		&models.Application{},
		&models.User{},
		&models.AuditLog{},
	}

	for _, table := range tables {
		if err := s.db.Unscoped().Where("1 = 1").Delete(table).Error; err != nil {
			return fmt.Errorf("failed to clear table: %w", err)
		}
	}

	logger.Info("Successfully cleared seeded data")
	return nil
}
