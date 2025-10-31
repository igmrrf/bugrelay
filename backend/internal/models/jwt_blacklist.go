package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// JWTBlacklist represents a blacklisted JWT token
type JWTBlacklist struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	TokenJTI  string    `json:"token_jti" gorm:"uniqueIndex;not null;size:255"` // JWT ID claim
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (j *JWTBlacklist) BeforeCreate(tx *gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the JWTBlacklist model
func (JWTBlacklist) TableName() string {
	return "jwt_blacklist"
}