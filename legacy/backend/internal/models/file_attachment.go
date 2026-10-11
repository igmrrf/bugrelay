package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FileAttachment represents a file attachment for a bug report
type FileAttachment struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	BugID      uuid.UUID `json:"bug_id" gorm:"type:uuid;not null"`
	Filename   string    `json:"filename" gorm:"size:255;not null"`
	FileURL    string    `json:"file_url" gorm:"type:text;not null"`
	FileSize   *int      `json:"file_size,omitempty"`
	MimeType   *string   `json:"mime_type,omitempty" gorm:"size:100"`
	UploadedAt time.Time `json:"uploaded_at"`

	// Relationships
	Bug BugReport `json:"bug,omitempty" gorm:"foreignKey:BugID"`
}

// BeforeCreate hook to set ID if not provided
func (fa *FileAttachment) BeforeCreate(tx *gorm.DB) error {
	if fa.ID == uuid.Nil {
		fa.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the FileAttachment model
func (FileAttachment) TableName() string {
	return "file_attachments"
}