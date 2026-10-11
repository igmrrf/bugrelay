package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// BugReport represents a bug report in the system
type BugReport struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Title       string         `json:"title" gorm:"size:255;not null"`
	Description string         `json:"description" gorm:"type:text;not null"`
	Status      string         `json:"status" gorm:"size:20;default:'open'"`
	Priority    string         `json:"priority" gorm:"size:20;default:'medium'"`
	Tags        pq.StringArray `json:"tags" gorm:"type:text[]"`

	// Technical details
	OperatingSystem *string `json:"operating_system,omitempty" gorm:"size:100"`
	DeviceType      *string `json:"device_type,omitempty" gorm:"size:100"`
	AppVersion      *string `json:"app_version,omitempty" gorm:"size:50"`
	BrowserVersion  *string `json:"browser_version,omitempty" gorm:"size:100"`

	// Associations
	ApplicationID      uuid.UUID  `json:"application_id" gorm:"type:uuid;not null"`
	ReporterID         *uuid.UUID `json:"reporter_id,omitempty" gorm:"type:uuid"` // null for anonymous
	AssignedCompanyID  *uuid.UUID `json:"assigned_company_id,omitempty" gorm:"type:uuid"`

	// Engagement metrics
	VoteCount    int `json:"vote_count" gorm:"default:0"`
	CommentCount int `json:"comment_count" gorm:"default:0"`

	// Timestamps
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
	ResolvedAt *time.Time     `json:"resolved_at,omitempty"`

	// Relationships
	Application     Application     `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
	Reporter        *User           `json:"reporter,omitempty" gorm:"foreignKey:ReporterID"`
	AssignedCompany *Company        `json:"assigned_company,omitempty" gorm:"foreignKey:AssignedCompanyID"`
	Votes           []BugVote       `json:"votes,omitempty" gorm:"foreignKey:BugID"`
	Comments        []Comment       `json:"comments,omitempty" gorm:"foreignKey:BugID"`
	Attachments     []FileAttachment `json:"attachments,omitempty" gorm:"foreignKey:BugID"`
}

// BeforeCreate hook to set ID if not provided
func (br *BugReport) BeforeCreate(tx *gorm.DB) error {
	if br.ID == uuid.Nil {
		br.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the BugReport model
func (BugReport) TableName() string {
	return "bug_reports"
}

// BugStatus constants
const (
	BugStatusOpen     = "open"
	BugStatusReviewing = "reviewing"
	BugStatusFixed    = "fixed"
	BugStatusWontFix  = "wont_fix"
)

// BugPriority constants
const (
	BugPriorityLow      = "low"
	BugPriorityMedium   = "medium"
	BugPriorityHigh     = "high"
	BugPriorityCritical = "critical"
)

// IsValidStatus checks if the provided status is valid
func IsValidStatus(status string) bool {
	validStatuses := []string{BugStatusOpen, BugStatusReviewing, BugStatusFixed, BugStatusWontFix}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

// IsValidPriority checks if the provided priority is valid
func IsValidPriority(priority string) bool {
	validPriorities := []string{BugPriorityLow, BugPriorityMedium, BugPriorityHigh, BugPriorityCritical}
	for _, validPriority := range validPriorities {
		if priority == validPriority {
			return true
		}
	}
	return false
}