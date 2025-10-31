package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Comment represents a comment on a bug report
type Comment struct {
	ID                uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	BugID             uuid.UUID `json:"bug_id" gorm:"type:uuid;not null"`
	UserID            uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	Content           string    `json:"content" gorm:"type:text;not null"`
	IsCompanyResponse bool      `json:"is_company_response" gorm:"default:false"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Relationships
	Bug  BugReport `json:"bug,omitempty" gorm:"foreignKey:BugID"`
	User User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the Comment model
func (Comment) TableName() string {
	return "comments"
}