package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Application represents an application that can have bug reports
type Application struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name      string     `json:"name" gorm:"size:255;not null"`
	URL       *string    `json:"url,omitempty"`
	CompanyID *uuid.UUID `json:"company_id,omitempty" gorm:"type:uuid"`
	CreatedAt time.Time  `json:"created_at"`

	// Relationships
	Company    *Company    `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	BugReports []BugReport `json:"bug_reports,omitempty" gorm:"foreignKey:ApplicationID"`
}

// BeforeCreate hook to set ID if not provided
func (a *Application) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the Application model
func (Application) TableName() string {
	return "applications"
}