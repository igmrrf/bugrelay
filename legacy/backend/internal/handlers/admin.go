package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"bugrelay-backend/internal/middleware"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AdminHandler handles admin-related HTTP requests
type AdminHandler struct {
	db *gorm.DB
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{
		db: db,
	}
}

// logAuditAction logs an administrative action to the audit log
func (h *AdminHandler) logAuditAction(c *gin.Context, action, resource string, resourceID *uuid.UUID, details string) error {
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		return fmt.Errorf("user ID not found in context")
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return fmt.Errorf("invalid user ID: %v", err)
	}

	// Get IP address and user agent
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	auditLog := models.AuditLog{
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
		UserID:     userUUID,
		IPAddress:  &ipAddress,
		UserAgent:  &userAgent,
	}

	return h.db.Create(&auditLog).Error
}

// GetAdminDashboard returns admin dashboard statistics
func (h *AdminHandler) GetAdminDashboard(c *gin.Context) {
	// Get various statistics for the admin dashboard
	var stats struct {
		TotalBugs      int64 `json:"total_bugs"`
		OpenBugs       int64 `json:"open_bugs"`
		FlaggedBugs    int64 `json:"flagged_bugs"`
		TotalUsers     int64 `json:"total_users"`
		TotalCompanies int64 `json:"total_companies"`
		VerifiedCompanies int64 `json:"verified_companies"`
		RecentActivity []models.AuditLog `json:"recent_activity"`
	}

	// Count bugs
	h.db.Model(&models.BugReport{}).Count(&stats.TotalBugs)
	h.db.Model(&models.BugReport{}).Where("status = ?", models.BugStatusOpen).Count(&stats.OpenBugs)
	
	// Count users
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	
	// Count companies
	h.db.Model(&models.Company{}).Count(&stats.TotalCompanies)
	h.db.Model(&models.Company{}).Where("is_verified = ?", true).Count(&stats.VerifiedCompanies)

	// Get recent audit activity (last 50 entries)
	h.db.Preload("User").
		Order("created_at DESC").
		Limit(50).
		Find(&stats.RecentActivity)

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// ListBugsForModeration returns bugs that need moderation
func (h *AdminHandler) ListBugsForModeration(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	flagged := c.Query("flagged")

	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	query := h.db.Model(&models.BugReport{}).
		Preload("Application").
		Preload("Reporter").
		Preload("AssignedCompany")

	// Apply filters
	if status != "" && models.IsValidStatus(status) {
		query = query.Where("status = ?", status)
	}

	if flagged == "true" {
		// For now, we'll consider bugs with many votes or comments as potentially needing review
		query = query.Where("vote_count > ? OR comment_count > ?", 100, 50)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Apply pagination
	offset := (page - 1) * limit
	var bugs []models.BugReport
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&bugs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch bugs for moderation",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Calculate pagination info
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"bugs": bugs,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    hasNext,
			"has_prev":    hasPrev,
		},
	})
}

// FlagBugRequest represents the request to flag a bug
type FlagBugRequest struct {
	Reason string `json:"reason" binding:"required,min=1,max=500"`
}

// FlagBug flags a bug report for review
func (h *AdminHandler) FlagBug(c *gin.Context) {
	bugID := c.Param("id")
	
	bugUUID, err := uuid.Parse(bugID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid bug ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req FlagBugRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "VALIDATION_ERROR",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Verify bug exists
	var bug models.BugReport
	if err := h.db.First(&bug, bugUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "BUG_NOT_FOUND",
					"message":   "Bug report not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Log the flag action
	details := fmt.Sprintf("Bug flagged for review. Reason: %s", req.Reason)
	if err := h.logAuditAction(c, models.AuditActionBugFlag, models.AuditResourceBug, &bugUUID, details); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "AUDIT_LOG_FAILED",
				"message":   "Failed to log audit action",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bug flagged successfully",
		"bug_id":  bugUUID,
		"reason":  req.Reason,
	})
}

// RemoveBugRequest represents the request to remove a bug
type RemoveBugRequest struct {
	Reason string `json:"reason" binding:"required,min=1,max=500"`
}

// RemoveBug removes a bug report (soft delete)
func (h *AdminHandler) RemoveBug(c *gin.Context) {
	bugID := c.Param("id")
	
	bugUUID, err := uuid.Parse(bugID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid bug ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req RemoveBugRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "VALIDATION_ERROR",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Verify bug exists
	var bug models.BugReport
	if err := h.db.First(&bug, bugUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "BUG_NOT_FOUND",
					"message":   "Bug report not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Soft delete the bug report
	if err := h.db.Delete(&bug).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "DELETE_FAILED",
				"message":   "Failed to remove bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Log the removal action
	details := fmt.Sprintf("Bug removed. Reason: %s. Title: %s", req.Reason, bug.Title)
	if err := h.logAuditAction(c, models.AuditActionBugRemove, models.AuditResourceBug, &bugUUID, details); err != nil {
		// Log error but don't fail the request since the bug was already removed
		fmt.Printf("Failed to log audit action: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bug report removed successfully",
		"bug_id":  bugUUID,
		"reason":  req.Reason,
	})
}

// MergeBugsRequest represents the request to merge duplicate bugs
type MergeBugsRequest struct {
	SourceBugID uuid.UUID `json:"source_bug_id" binding:"required"`
	TargetBugID uuid.UUID `json:"target_bug_id" binding:"required"`
	Reason      string    `json:"reason" binding:"required,min=1,max=500"`
}

// MergeBugs merges duplicate bug reports
func (h *AdminHandler) MergeBugs(c *gin.Context) {
	var req MergeBugsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "VALIDATION_ERROR",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate that source and target are different
	if req.SourceBugID == req.TargetBugID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_MERGE",
				"message":   "Source and target bugs must be different",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Verify both bugs exist
	var sourceBug, targetBug models.BugReport
	if err := tx.First(&sourceBug, req.SourceBugID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "SOURCE_BUG_NOT_FOUND",
					"message":   "Source bug report not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch source bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	if err := tx.First(&targetBug, req.TargetBugID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "TARGET_BUG_NOT_FOUND",
					"message":   "Target bug report not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch target bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Move votes from source to target (avoiding duplicates)
	if err := tx.Exec(`
		INSERT INTO bug_votes (bug_id, user_id, created_at)
		SELECT ?, user_id, created_at
		FROM bug_votes
		WHERE bug_id = ?
		ON CONFLICT (bug_id, user_id) DO NOTHING
	`, req.TargetBugID, req.SourceBugID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "VOTE_MERGE_FAILED",
				"message":   "Failed to merge votes",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Move comments from source to target
	if err := tx.Model(&models.Comment{}).
		Where("bug_id = ?", req.SourceBugID).
		Update("bug_id", req.TargetBugID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COMMENT_MERGE_FAILED",
				"message":   "Failed to merge comments",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Move file attachments from source to target
	if err := tx.Model(&models.FileAttachment{}).
		Where("bug_id = ?", req.SourceBugID).
		Update("bug_id", req.TargetBugID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "ATTACHMENT_MERGE_FAILED",
				"message":   "Failed to merge attachments",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update target bug's vote and comment counts
	var newVoteCount, newCommentCount int64
	tx.Model(&models.BugVote{}).Where("bug_id = ?", req.TargetBugID).Count(&newVoteCount)
	tx.Model(&models.Comment{}).Where("bug_id = ?", req.TargetBugID).Count(&newCommentCount)

	if err := tx.Model(&targetBug).Updates(map[string]interface{}{
		"vote_count":    newVoteCount,
		"comment_count": newCommentCount,
		"updated_at":    time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_UPDATE_FAILED",
				"message":   "Failed to update target bug counts",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Add a comment to the target bug explaining the merge
	userIDStr, _ := middleware.GetCurrentUserID(c)
	userUUID, _ := uuid.Parse(userIDStr)
	mergeComment := models.Comment{
		BugID:             req.TargetBugID,
		UserID:            userUUID,
		Content:           fmt.Sprintf("This bug report was merged with another duplicate report. Original title: \"%s\". Reason: %s", sourceBug.Title, req.Reason),
		IsCompanyResponse: false,
	}

	if err := tx.Create(&mergeComment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "MERGE_COMMENT_FAILED",
				"message":   "Failed to create merge comment",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Soft delete the source bug
	if err := tx.Delete(&sourceBug).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "SOURCE_DELETE_FAILED",
				"message":   "Failed to remove source bug",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COMMIT_FAILED",
				"message":   "Failed to complete bug merge",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Log the merge action
	details := fmt.Sprintf("Merged bug '%s' (ID: %s) into '%s' (ID: %s). Reason: %s", 
		sourceBug.Title, req.SourceBugID, targetBug.Title, req.TargetBugID, req.Reason)
	if err := h.logAuditAction(c, models.AuditActionBugMerge, models.AuditResourceBug, &req.TargetBugID, details); err != nil {
		// Log error but don't fail the request since the merge was successful
		fmt.Printf("Failed to log audit action: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Bugs merged successfully",
		"source_bug_id": req.SourceBugID,
		"target_bug_id": req.TargetBugID,
		"reason":        req.Reason,
	})
}

// GetAuditLogs returns audit log entries with pagination
func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.Query("action")
	resource := c.Query("resource")
	userID := c.Query("user_id")

	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := h.db.Model(&models.AuditLog{}).Preload("User")

	// Apply filters
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}
	if userID != "" {
		if userUUID, err := uuid.Parse(userID); err == nil {
			query = query.Where("user_id = ?", userUUID)
		}
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Apply pagination
	offset := (page - 1) * limit
	var logs []models.AuditLog
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch audit logs",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Calculate pagination info
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    hasNext,
			"has_prev":    hasPrev,
		},
	})
}

// RestoreBug restores a soft-deleted bug report
func (h *AdminHandler) RestoreBug(c *gin.Context) {
	bugID := c.Param("id")
	
	bugUUID, err := uuid.Parse(bugID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid bug ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Find the soft-deleted bug
	var bug models.BugReport
	if err := h.db.Unscoped().First(&bug, bugUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "BUG_NOT_FOUND",
					"message":   "Bug report not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if bug is actually deleted
	if bug.DeletedAt.Time.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "BUG_NOT_DELETED",
				"message":   "Bug report is not deleted",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Restore the bug
	if err := h.db.Unscoped().Model(&bug).Update("deleted_at", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "RESTORE_FAILED",
				"message":   "Failed to restore bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Log the restore action
	details := fmt.Sprintf("Bug restored. Title: %s", bug.Title)
	if err := h.logAuditAction(c, models.AuditActionBugRestore, models.AuditResourceBug, &bugUUID, details); err != nil {
		// Log error but don't fail the request since the bug was restored
		fmt.Printf("Failed to log audit action: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bug report restored successfully",
		"bug_id":  bugUUID,
	})
}