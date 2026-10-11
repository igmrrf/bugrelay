package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Email       string    `json:"email" gorm:"uniqueIndex;not null"`
	DisplayName string    `json:"display_name" gorm:"size:100;not null"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`

	// Authentication
	PasswordHash    *string `json:"-" gorm:"size:255"` // bcrypt hash, null for OAuth-only
	AuthProvider    string  `json:"auth_provider" gorm:"size:20;not null;default:'email'"`
	AuthProviderID  *string `json:"auth_provider_id,omitempty" gorm:"size:255"` // OAuth provider user ID

	// Email verification
	IsEmailVerified        bool    `json:"is_email_verified" gorm:"default:false"`
	EmailVerificationToken *string `json:"-" gorm:"size:255"`

	// Password reset
	PasswordResetToken   *string    `json:"-" gorm:"size:255"`
	PasswordResetExpires *time.Time `json:"-"`

	// Roles
	IsAdmin bool `json:"is_admin" gorm:"default:false"`

	// Timestamps
	CreatedAt    time.Time `json:"created_at"`
	LastActiveAt time.Time `json:"last_active_at" gorm:"default:now()"`

	// Relationships
	SubmittedBugs     []BugReport       `json:"submitted_bugs,omitempty" gorm:"foreignKey:ReporterID"`
	Votes             []BugVote         `json:"votes,omitempty" gorm:"foreignKey:UserID"`
	Comments          []Comment         `json:"comments,omitempty" gorm:"foreignKey:UserID"`
	CompanyMemberships []CompanyMember  `json:"company_memberships,omitempty" gorm:"foreignKey:UserID"`
	JWTBlacklist      []JWTBlacklist    `json:"-" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the User model
func (User) TableName() string {
	return "users"
}