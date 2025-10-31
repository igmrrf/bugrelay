package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BugVote represents a user's vote on a bug report
type BugVote struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	BugID     uuid.UUID `json:"bug_id" gorm:"type:uuid;not null"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	CreatedAt time.Time `json:"created_at"`

	// Relationships
	Bug  BugReport `json:"bug,omitempty" gorm:"foreignKey:BugID"`
	User User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (bv *BugVote) BeforeCreate(tx *gorm.DB) error {
	if bv.ID == uuid.Nil {
		bv.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the BugVote model
func (BugVote) TableName() string {
	return "bug_votes"
}