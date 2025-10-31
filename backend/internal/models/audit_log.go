package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog represents an audit log entry for administrative actions
type AuditLog struct {
	ID       uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Action   string    `json:"action" gorm:"size:100;not null"`
	Resource string    `json:"resource" gorm:"size:100;not null"`
	ResourceID *uuid.UUID `json:"resource_id,omitempty" gorm:"type:uuid"`
	Details  string    `json:"details" gorm:"type:text"`
	
	// User who performed the action
	UserID uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	
	// IP address and user agent for security tracking
	IPAddress *string `json:"ip_address,omitempty" gorm:"size:45"`
	UserAgent *string `json:"user_agent,omitempty" gorm:"size:500"`
	
	// Timestamp
	CreatedAt time.Time `json:"created_at"`
	
	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook to set ID if not provided
func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for the AuditLog model
func (AuditLog) TableName() string {
	return "audit_logs"
}

// AuditAction constants
const (
	AuditActionBugFlag     = "bug_flag"
	AuditActionBugRemove   = "bug_remove"
	AuditActionBugMerge    = "bug_merge"
	AuditActionBugRestore  = "bug_restore"
	AuditActionUserBan     = "user_ban"
	AuditActionUserUnban   = "user_unban"
	AuditActionCompanyVerify = "company_verify"
	AuditActionCompanyUnverify = "company_unverify"
)

// AuditResource constants
const (
	AuditResourceBug     = "bug_report"
	AuditResourceUser    = "user"
	AuditResourceCompany = "company"
	AuditResourceComment = "comment"
)