package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Company represents a company in the system
type Company struct {
	ID       uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name     string    `json:"name" gorm:"size:255;not null"`
	Domain   string    `json:"domain" gorm:"size:255;uniqueIndex;not null"`
	IsVerified bool    `json:"is_verified" gorm:"default:false"`

	// Verification
	VerificationToken *string    `json:"-" gorm:"size:255"`
	VerificationEmail *string    `json:"verification_email,omitempty" gorm:"size:255"`
	VerifiedAt        *time.Time `json:"verified_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Applications []Application   `json:"applications,omitempty" gorm:"foreignKey:CompanyID"`
	Members      []CompanyMember `json:"members,omitempty" gorm:"foreignKey:CompanyID"`
	AssignedBugs []BugReport     `json:"assigned_bugs,omitempty" gorm:"foreignKey:AssignedCompanyID"`
}

// BeforeCreate hook to set ID if not provided
func (c *Company) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the Company model
func (Company) TableName() string {
	return "companies"
}

// CompanyMember represents the relationship between users and companies
type CompanyMember struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	CompanyID uuid.UUID `json:"company_id" gorm:"type:uuid;not null"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	Role      string    `json:"role" gorm:"size:20;default:'member'"`
	AddedAt   time.Time `json:"added_at" gorm:"default:now()"`

	// Relationships
	Company Company `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	User    User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (cm *CompanyMember) BeforeCreate(tx *gorm.DB) error {
	if cm.ID == uuid.Nil {
		cm.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the CompanyMember model
func (CompanyMember) TableName() string {
	return "company_members"
}