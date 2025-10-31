package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"bugrelay-backend/internal/cache"
	"bugrelay-backend/internal/middleware"
	"bugrelay-backend/internal/models"
	"bugrelay-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// BugHandler handles bug-related HTTP requests
type BugHandler struct {
	db              *gorm.DB
	cache           *cache.CacheService
	recaptchaSecret string
}

// NewBugHandler creates a new bug handler
func NewBugHandler(db *gorm.DB, redisClient *redis.Client) *BugHandler {
	return &BugHandler{
		db:              db,
		cache:           cache.NewCacheService(redisClient),
		recaptchaSecret: "", // Will be set from config in production
	}
}

// SetRecaptchaSecret sets the reCAPTCHA secret key
func (h *BugHandler) SetRecaptchaSecret(secret string) {
	h.recaptchaSecret = secret
}

// RecaptchaResponse represents the response from Google reCAPTCHA API
type RecaptchaResponse struct {
	Success     bool     `json:"success"`
	Score       float64  `json:"score,omitempty"`
	Action      string   `json:"action,omitempty"`
	ChallengeTS string   `json:"challenge_ts,omitempty"`
	Hostname    string   `json:"hostname,omitempty"`
	ErrorCodes  []string `json:"error-codes,omitempty"`
}

// validateRecaptcha validates reCAPTCHA token with Google's API
func (h *BugHandler) validateRecaptcha(token string) (bool, error) {
	if h.recaptchaSecret == "" || token == "" {
		// Skip validation if no secret configured or no token provided
		return true, nil
	}

	// Prepare the request to Google's reCAPTCHA API
	data := url.Values{}
	data.Set("secret", h.recaptchaSecret)
	data.Set("response", token)

	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", data)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var recaptchaResp RecaptchaResponse
	if err := json.NewDecoder(resp.Body).Decode(&recaptchaResp); err != nil {
		return false, err
	}

	// For reCAPTCHA v3, check both success and score (should be > 0.5)
	// For reCAPTCHA v2, only check success
	if recaptchaResp.Success {
		if recaptchaResp.Score > 0 {
			// reCAPTCHA v3 - check score
			return recaptchaResp.Score >= 0.5, nil
		}
		// reCAPTCHA v2 - success is enough
		return true, nil
	}

	return false, nil
}

// CreateBugRequest represents the request payload for creating a bug
type CreateBugRequest struct {
	Title       string   `json:"title" binding:"required,min=5,max=255"`
	Description string   `json:"description" binding:"required,min=10"`
	Priority    string   `json:"priority,omitempty"`
	Tags        []string `json:"tags,omitempty"`

	// Technical details
	OperatingSystem *string `json:"operating_system,omitempty"`
	DeviceType      *string `json:"device_type,omitempty"`
	AppVersion      *string `json:"app_version,omitempty"`
	BrowserVersion  *string `json:"browser_version,omitempty"`

	// Application info
	ApplicationName string  `json:"application_name" binding:"required,min=1,max=255"`
	ApplicationURL  *string `json:"application_url,omitempty"`

	// Contact info (optional for anonymous submissions)
	ContactEmail *string `json:"contact_email,omitempty"`

	// Anti-spam measures
	RecaptchaToken *string `json:"recaptcha_token,omitempty"`
}

// CreateBug handles bug submission
func (h *BugHandler) CreateBug(c *gin.Context) {
	var req CreateBugRequest
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

	// Validate reCAPTCHA for anonymous submissions or if token is provided
	userIDStr, isAuthenticated := middleware.GetCurrentUserID(c)
	if !isAuthenticated || req.RecaptchaToken != nil {
		var token string
		if req.RecaptchaToken != nil {
			token = *req.RecaptchaToken
		}

		isValid, err := h.validateRecaptcha(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "RECAPTCHA_ERROR",
					"message":   "Failed to validate reCAPTCHA",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		if !isValid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":      "RECAPTCHA_FAILED",
					"message":   "reCAPTCHA validation failed",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Sanitize and validate input fields
	sanitizedTitle, titleValid := utils.ValidateString(req.Title, 5, 255)
	if !titleValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_TITLE",
				"message":   "Title must be between 5 and 255 characters and contain no malicious content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	sanitizedDescription, descValid := utils.ValidateString(req.Description, 10, 5000)
	if !descValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_DESCRIPTION",
				"message":   "Description must be between 10 and 5000 characters and contain no malicious content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	sanitizedAppName, appNameValid := utils.ValidateString(req.ApplicationName, 1, 255)
	if !appNameValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_APPLICATION_NAME",
				"message":   "Application name must be between 1 and 255 characters and contain no malicious content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate application URL if provided
	if req.ApplicationURL != nil && *req.ApplicationURL != "" {
		if !utils.ValidateURL(*req.ApplicationURL) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":      "INVALID_APPLICATION_URL",
					"message":   "Invalid application URL format",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Validate contact email if provided
	if req.ContactEmail != nil && *req.ContactEmail != "" {
		if !utils.ValidateEmail(*req.ContactEmail) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":      "INVALID_CONTACT_EMAIL",
					"message":   "Invalid email format",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Validate priority if provided
	if req.Priority != "" && !utils.ValidatePriority(req.Priority) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_PRIORITY",
				"message":   "Invalid priority value",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Set default priority if not provided
	if req.Priority == "" {
		req.Priority = models.BugPriorityMedium
	}

	// Validate tags
	if len(req.Tags) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "TOO_MANY_TAGS",
				"message":   "Maximum 10 tags allowed",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Sanitize and validate tags
	var sanitizedTags []string
	for _, tag := range req.Tags {
		tag = strings.ToLower(strings.TrimSpace(tag))
		if tag != "" && utils.ValidateTag(tag) {
			sanitizedTags = append(sanitizedTags, tag)
		}
	}

	// Sanitize optional technical fields
	var sanitizedOS, sanitizedDevice, sanitizedAppVersion, sanitizedBrowser *string
	if req.OperatingSystem != nil && *req.OperatingSystem != "" {
		if sanitized, valid := utils.ValidateString(*req.OperatingSystem, 1, 100); valid {
			sanitizedOS = &sanitized
		}
	}
	if req.DeviceType != nil && *req.DeviceType != "" {
		if sanitized, valid := utils.ValidateString(*req.DeviceType, 1, 100); valid {
			sanitizedDevice = &sanitized
		}
	}
	if req.AppVersion != nil && *req.AppVersion != "" {
		if sanitized, valid := utils.ValidateString(*req.AppVersion, 1, 50); valid {
			sanitizedAppVersion = &sanitized
		}
	}
	if req.BrowserVersion != nil && *req.BrowserVersion != "" {
		if sanitized, valid := utils.ValidateString(*req.BrowserVersion, 1, 100); valid {
			sanitizedBrowser = &sanitized
		}
	}

	// Get current user ID if authenticated
	var reporterID *uuid.UUID
	if isAuthenticated {
		if userUUID, err := uuid.Parse(userIDStr); err == nil {
			reporterID = &userUUID
		}
	}

	// Start database transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find or create application and company
	application, err := h.findOrCreateApplication(tx, sanitizedAppName, req.ApplicationURL)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "APPLICATION_ERROR",
				"message":   "Failed to process application",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Create company if application doesn't have one
	if application.CompanyID == nil {
		companyHandler := NewCompanyHandler(h.db)
		company, err := companyHandler.findOrCreateCompanyFromApplication(tx, sanitizedAppName, req.ApplicationURL)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "COMPANY_ERROR",
					"message":   "Failed to process company",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		// Associate application with company
		application.CompanyID = &company.ID
		if err := tx.Save(application).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "APPLICATION_UPDATE_ERROR",
					"message":   "Failed to associate application with company",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Create bug report
	bugReport := models.BugReport{
		Title:           sanitizedTitle,
		Description:     sanitizedDescription,
		Status:          models.BugStatusOpen,
		Priority:        req.Priority,
		Tags:            pq.StringArray(sanitizedTags),
		OperatingSystem: sanitizedOS,
		DeviceType:      sanitizedDevice,
		AppVersion:      sanitizedAppVersion,
		BrowserVersion:  sanitizedBrowser,
		ApplicationID:   application.ID,
		ReporterID:      reporterID,
		VoteCount:       0,
		CommentCount:    0,
	}

	// Auto-assign to company if application has one
	if application.CompanyID != nil {
		bugReport.AssignedCompanyID = application.CompanyID
	}

	if err := tx.Create(&bugReport).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "CREATE_FAILED",
				"message":   "Failed to create bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update user's last active timestamp if authenticated
	if reporterID != nil {
		if err := tx.Model(&models.User{}).Where("id = ?", *reporterID).Update("last_active_at", time.Now()).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "ACTIVITY_UPDATE_FAILED",
					"message":   "Failed to update user activity",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COMMIT_FAILED",
				"message":   "Failed to save bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Invalidate bug list caches since we added a new bug
	ctx := c.Request.Context()
	if err := h.cache.DeletePattern(ctx, cache.BugListCachePrefix+"*"); err != nil {
		// Log cache error but don't fail the request
		fmt.Printf("Failed to invalidate bug list cache: %v\n", err)
	}

	// Load the created bug with relationships
	var createdBug models.BugReport
	if err := h.db.Preload("Application").Preload("Reporter").Preload("AssignedCompany").
		First(&createdBug, bugReport.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Bug created but failed to load details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Bug report created successfully",
		"bug":     createdBug,
	})
}

// findOrCreateApplication finds an existing application or creates a new one
func (h *BugHandler) findOrCreateApplication(tx *gorm.DB, name string, url *string) (*models.Application, error) {
	var application models.Application

	// First try to find by exact name match
	err := tx.Where("LOWER(name) = LOWER(?)", name).First(&application).Error
	if err == nil {
		return &application, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// If URL is provided, try to find by URL
	if url != nil && *url != "" {
		err = tx.Where("url = ?", *url).First(&application).Error
		if err == nil {
			return &application, nil
		}
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	// Create new application
	application = models.Application{
		Name: name,
		URL:  url,
	}

	if err := tx.Create(&application).Error; err != nil {
		return nil, err
	}

	return &application, nil
}

// ListBugsRequest represents query parameters for listing bugs
type ListBugsRequest struct {
	Page        int    `form:"page,default=1"`
	Limit       int    `form:"limit,default=20"`
	Search      string `form:"search"`
	Status      string `form:"status"`
	Priority    string `form:"priority"`
	Tags        string `form:"tags"`
	Application string `form:"application"`
	Company     string `form:"company"`
	Sort        string `form:"sort,default=recent"`
}

// ListBugs handles bug listing with search, filtering, and pagination
func (h *BugHandler) ListBugs(c *gin.Context) {
	var req ListBugsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "VALIDATION_ERROR",
				"message":   "Invalid query parameters",
				"details":   err.Error(),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate and set limits
	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 20
	}
	if req.Page <= 0 {
		req.Page = 1
	}

	ctx := c.Request.Context()

	// Generate cache key based on request parameters
	cacheKey := cache.GenerateCacheKey(
		req.Page, req.Limit, req.Search, req.Status, req.Priority,
		req.Tags, req.Application, req.Company, req.Sort,
	)

	// Try to get from cache first (only for first page of common queries)
	if req.Page == 1 && req.Search == "" {
		type CachedResponse struct {
			Bugs       []models.BugReport     `json:"bugs"`
			Pagination map[string]interface{} `json:"pagination"`
		}

		var cachedResp CachedResponse
		if err := h.cache.GetBugList(ctx, cacheKey, &cachedResp); err == nil {
			c.JSON(http.StatusOK, gin.H{
				"bugs":       cachedResp.Bugs,
				"pagination": cachedResp.Pagination,
			})
			return
		}
	}

	// Build query with necessary joins
	query := h.db.Model(&models.BugReport{}).
		Joins("LEFT JOIN applications ON applications.id = bug_reports.application_id").
		Joins("LEFT JOIN companies ON companies.id = bug_reports.assigned_company_id").
		Preload("Application").
		Preload("Reporter").
		Preload("AssignedCompany")

	// Apply filters
	if req.Status != "" && models.IsValidStatus(req.Status) {
		query = query.Where("bug_reports.status = ?", req.Status)
	}

	if req.Priority != "" && models.IsValidPriority(req.Priority) {
		query = query.Where("bug_reports.priority = ?", req.Priority)
	}

	if req.Tags != "" {
		tags := strings.Split(req.Tags, ",")
		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				query = query.Where("? = ANY(bug_reports.tags)", tag)
			}
		}
	}

	if req.Application != "" {
		query = query.Where("LOWER(applications.name) LIKE LOWER(?)", "%"+req.Application+"%")
	}

	if req.Company != "" {
		query = query.Where("LOWER(companies.name) LIKE LOWER(?)", "%"+req.Company+"%")
	}

	// Apply search using PostgreSQL full-text search
	var hasSearch bool
	if req.Search != "" {
		searchTerm := strings.TrimSpace(req.Search)
		if len(searchTerm) > 0 {
			hasSearch = true
			// Use PostgreSQL full-text search across bug content and application name
			query = query.Where(
				"to_tsvector('english', bug_reports.title || ' ' || bug_reports.description || ' ' || COALESCE(applications.name, '')) @@ plainto_tsquery('english', ?)",
				searchTerm,
			)
		}
	}

	// Apply sorting
	if hasSearch && (req.Sort == "recent" || req.Sort == "") {
		// For search results, prioritize relevance then recency
		searchTerm := strings.TrimSpace(req.Search)
		query = query.Select("bug_reports.*, ts_rank(to_tsvector('english', bug_reports.title || ' ' || bug_reports.description || ' ' || COALESCE(applications.name, '')), plainto_tsquery('english', ?)) as relevance_rank", searchTerm).
			Order("relevance_rank DESC").
			Order("bug_reports.created_at DESC")
	} else {
		switch req.Sort {
		case "recent":
			query = query.Order("bug_reports.created_at DESC")
		case "popular":
			query = query.Order("bug_reports.vote_count DESC").Order("bug_reports.created_at DESC")
		case "trending":
			// Trending: high vote count in recent time
			query = query.Where("bug_reports.created_at > ?", time.Now().AddDate(0, 0, -30)).
				Order("bug_reports.vote_count DESC").Order("bug_reports.created_at DESC")
		case "oldest":
			query = query.Order("bug_reports.created_at ASC")
		default:
			query = query.Order("bug_reports.created_at DESC")
		}
	}

	// Get total count (need to select distinct bug_reports.id due to joins)
	var total int64
	countQuery := h.db.Model(&models.BugReport{}).
		Joins("LEFT JOIN applications ON applications.id = bug_reports.application_id").
		Joins("LEFT JOIN companies ON companies.id = bug_reports.assigned_company_id")

	// Apply the same filters to count query
	if req.Status != "" && models.IsValidStatus(req.Status) {
		countQuery = countQuery.Where("bug_reports.status = ?", req.Status)
	}
	if req.Priority != "" && models.IsValidPriority(req.Priority) {
		countQuery = countQuery.Where("bug_reports.priority = ?", req.Priority)
	}
	if req.Tags != "" {
		tags := strings.Split(req.Tags, ",")
		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				countQuery = countQuery.Where("? = ANY(bug_reports.tags)", tag)
			}
		}
	}
	if req.Application != "" {
		countQuery = countQuery.Where("LOWER(applications.name) LIKE LOWER(?)", "%"+req.Application+"%")
	}
	if req.Company != "" {
		countQuery = countQuery.Where("LOWER(companies.name) LIKE LOWER(?)", "%"+req.Company+"%")
	}
	if hasSearch {
		searchTerm := strings.TrimSpace(req.Search)
		countQuery = countQuery.Where(
			"to_tsvector('english', bug_reports.title || ' ' || bug_reports.description || ' ' || COALESCE(applications.name, '')) @@ plainto_tsquery('english', ?)",
			searchTerm,
		)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_FAILED",
				"message":   "Failed to count bug reports",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Apply pagination
	offset := (req.Page - 1) * req.Limit
	query = query.Offset(offset).Limit(req.Limit)

	// Execute query
	var bugs []models.BugReport
	if err := query.Find(&bugs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch bug reports",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Calculate pagination info
	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))
	hasNext := req.Page < totalPages
	hasPrev := req.Page > 1

	paginationInfo := gin.H{
		"page":        req.Page,
		"limit":       req.Limit,
		"total":       total,
		"total_pages": totalPages,
		"has_next":    hasNext,
		"has_prev":    hasPrev,
	}

	// Cache the result for first page of common queries
	if req.Page == 1 && req.Search == "" {
		type CachedResponse struct {
			Bugs       []models.BugReport     `json:"bugs"`
			Pagination map[string]interface{} `json:"pagination"`
		}

		cachedResp := CachedResponse{
			Bugs:       bugs,
			Pagination: paginationInfo,
		}

		if err := h.cache.SetBugList(ctx, cacheKey, cachedResp); err != nil {
			// Log cache error but don't fail the request
			fmt.Printf("Failed to cache bug list %s: %v\n", cacheKey, err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"bugs":       bugs,
		"pagination": paginationInfo,
	})
}

// GetBug handles retrieving a single bug report by ID
func (h *BugHandler) GetBug(c *gin.Context) {
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

	ctx := c.Request.Context()
	var bug models.BugReport

	// Try to get from cache first
	err = h.cache.GetBug(ctx, bugID, &bug)
	if err == nil {
		c.JSON(http.StatusOK, gin.H{
			"bug": bug,
		})
		return
	}

	// Cache miss or error, fetch from database
	if err := h.db.Preload("Application").
		Preload("Reporter").
		Preload("AssignedCompany").
		Preload("Attachments").
		Preload("Comments").
		Preload("Comments.User").
		First(&bug, bugUUID).Error; err != nil {
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

	// Cache the result for future requests
	if err := h.cache.SetBug(ctx, bugID, bug); err != nil {
		// Log cache error but don't fail the request
		fmt.Printf("Failed to cache bug %s: %v\n", bugID, err)
	}

	c.JSON(http.StatusOK, gin.H{
		"bug": bug,
	})
}

// UploadBugAttachment handles file upload for bug reports
func (h *BugHandler) UploadBugAttachment(c *gin.Context) {
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
				"message":   "Failed to verify bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if user can upload to this bug (owner or admin)
	if userIDStr, exists := middleware.GetCurrentUserID(c); exists {
		userUUID, _ := uuid.Parse(userIDStr)
		isAdmin := middleware.IsCurrentUserAdmin(c)

		if !isAdmin && (bug.ReporterID == nil || *bug.ReporterID != userUUID) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":      "UPLOAD_FORBIDDEN",
					"message":   "You can only upload files to your own bug reports",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	} else {
		// Anonymous users can't upload files to existing bugs
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "AUTH_REQUIRED",
				"message":   "Authentication required for file uploads",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "NO_FILE",
				"message":   "No file uploaded",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate file size (max 10MB)
	maxSize := int64(10 * 1024 * 1024) // 10MB
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "FILE_TOO_LARGE",
				"message":   "File size exceeds 10MB limit",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Open file to check content type
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "FILE_READ_ERROR",
				"message":   "Failed to read uploaded file",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}
	defer src.Close()

	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	_, err = src.Read(buffer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "FILE_READ_ERROR",
				"message":   "Failed to read file content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	contentType := http.DetectContentType(buffer)

	// Validate file type using utility function
	if !utils.ValidateFileType(file.Filename, contentType) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_FILE_TYPE",
				"message":   "Only image files are allowed (JPEG, PNG, GIF, WebP)",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Generate unique filename
	fileExt := ""
	switch contentType {
	case "image/jpeg":
		fileExt = ".jpg"
	case "image/png":
		fileExt = ".png"
	case "image/gif":
		fileExt = ".gif"
	case "image/webp":
		fileExt = ".webp"
	}

	uniqueFilename := fmt.Sprintf("%s_%d%s", bugUUID.String(), time.Now().Unix(), fileExt)

	// For now, we'll store files locally in uploads directory
	// In production, this should be replaced with cloud storage (S3, etc.)
	uploadDir := "uploads/bugs"
	filePath := fmt.Sprintf("%s/%s", uploadDir, uniqueFilename)

	// Create upload directory if it doesn't exist
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "SAVE_FAILED",
				"message":   "Failed to save uploaded file",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Create file attachment record
	attachment := models.FileAttachment{
		BugID:    bugUUID,
		Filename: file.Filename,
		FileURL:  filePath, // In production, this would be the full URL
		FileSize: &[]int{int(file.Size)}[0],
		MimeType: &contentType,
	}

	if err := h.db.Create(&attachment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "DB_ERROR",
				"message":   "Failed to save file attachment record",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "File uploaded successfully",
		"attachment": attachment,
	})
}

// VoteBug handles voting on bug reports
func (h *BugHandler) VoteBug(c *gin.Context) {
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

	// Get current user ID (authentication required)
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "AUTH_REQUIRED",
				"message":   "Authentication required for voting",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "INVALID_USER",
				"message":   "Invalid user ID",
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
				"message":   "Failed to verify bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if user already voted
	var existingVote models.BugVote
	err = h.db.Where("bug_id = ? AND user_id = ?", bugUUID, userUUID).First(&existingVote).Error

	if err == nil {
		// User already voted, remove the vote (toggle)
		tx := h.db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Delete(&existingVote).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "VOTE_REMOVE_FAILED",
					"message":   "Failed to remove vote",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		// Decrement vote count
		if err := tx.Model(&bug).Update("vote_count", gorm.Expr("vote_count - 1")).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "COUNT_UPDATE_FAILED",
					"message":   "Failed to update vote count",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		// Update user's last active timestamp
		if err := tx.Model(&models.User{}).Where("id = ?", userUUID).Update("last_active_at", time.Now()).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "ACTIVITY_UPDATE_FAILED",
					"message":   "Failed to update user activity",
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
					"message":   "Failed to save vote removal",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		// Invalidate cache for this bug
		ctx := c.Request.Context()
		if err := h.cache.InvalidateBug(ctx, bugID); err != nil {
			fmt.Printf("Failed to invalidate bug cache: %v\n", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Vote removed successfully",
			"voted":   false,
		})
		return
	}

	if err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "VOTE_CHECK_FAILED",
				"message":   "Failed to check existing vote",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Start transaction for vote creation
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create new vote
	vote := models.BugVote{
		BugID:  bugUUID,
		UserID: userUUID,
	}

	if err := tx.Create(&vote).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "VOTE_CREATE_FAILED",
				"message":   "Failed to create vote",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Increment vote count
	if err := tx.Model(&bug).Update("vote_count", gorm.Expr("vote_count + 1")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_UPDATE_FAILED",
				"message":   "Failed to update vote count",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update user's last active timestamp
	if err := tx.Model(&models.User{}).Where("id = ?", userUUID).Update("last_active_at", time.Now()).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "ACTIVITY_UPDATE_FAILED",
				"message":   "Failed to update user activity",
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
				"message":   "Failed to save vote",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Invalidate cache for this bug
	ctx := c.Request.Context()
	if err := h.cache.InvalidateBug(ctx, bugID); err != nil {
		fmt.Printf("Failed to invalidate bug cache: %v\n", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Vote added successfully",
		"voted":   true,
	})
}

// CreateCommentRequest represents the request payload for creating a comment
type CreateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// CreateComment handles creating comments on bug reports
func (h *BugHandler) CreateComment(c *gin.Context) {
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

	var req CreateCommentRequest
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

	// Get current user ID (authentication required)
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "AUTH_REQUIRED",
				"message":   "Authentication required for commenting",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "INVALID_USER",
				"message":   "Invalid user ID",
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
				"message":   "Failed to verify bug report",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if this is a company response
	isCompanyResponse := false
	if bug.AssignedCompanyID != nil {
		// Check if user is a member of the assigned company
		var membership models.CompanyMember
		err := h.db.Where("company_id = ? AND user_id = ?", *bug.AssignedCompanyID, userUUID).
			First(&membership).Error
		if err == nil {
			isCompanyResponse = true
		}
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Sanitize and validate comment content
	sanitizedContent, contentValid := utils.ValidateString(req.Content, 1, 2000)
	if !contentValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_CONTENT",
				"message":   "Comment content must be between 1 and 2000 characters and contain no malicious content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Create comment
	comment := models.Comment{
		BugID:             bugUUID,
		UserID:            userUUID,
		Content:           sanitizedContent,
		IsCompanyResponse: isCompanyResponse,
	}

	if err := tx.Create(&comment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COMMENT_CREATE_FAILED",
				"message":   "Failed to create comment",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Increment comment count
	if err := tx.Model(&bug).Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_UPDATE_FAILED",
				"message":   "Failed to update comment count",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update user's last active timestamp
	if err := tx.Model(&models.User{}).Where("id = ?", userUUID).Update("last_active_at", time.Now()).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "ACTIVITY_UPDATE_FAILED",
				"message":   "Failed to update user activity",
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
				"message":   "Failed to save comment",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Load the created comment with user info
	var createdComment models.Comment
	if err := h.db.Preload("User").First(&createdComment, comment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Comment created but failed to load details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Comment created successfully",
		"comment": createdComment,
	})
}

// UpdateBugStatus handles updating bug status (company users only)
func (h *BugHandler) UpdateBugStatus(c *gin.Context) {
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

	type UpdateStatusRequest struct {
		Status string `json:"status" binding:"required"`
	}

	var req UpdateStatusRequest
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

	// Validate status
	if !utils.ValidateStatus(req.Status) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_STATUS",
				"message":   "Invalid status value",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get current user ID (authentication required)
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "AUTH_REQUIRED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "INVALID_USER",
				"message":   "Invalid user ID",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get bug with company info
	var bug models.BugReport
	if err := h.db.Preload("AssignedCompany").First(&bug, bugUUID).Error; err != nil {
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

	// Check permissions - only company members or admins can update status
	isAdmin := middleware.IsCurrentUserAdmin(c)
	canUpdate := isAdmin

	if !canUpdate && bug.AssignedCompanyID != nil {
		// Check if user is a member of the assigned company
		var membership models.CompanyMember
		err := h.db.Where("company_id = ? AND user_id = ?", *bug.AssignedCompanyID, userUUID).
			First(&membership).Error
		if err == nil {
			canUpdate = true
		}
	}

	if !canUpdate {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "INSUFFICIENT_PERMISSIONS",
				"message":   "Only company members can update bug status",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update status
	updates := map[string]interface{}{
		"status":     req.Status,
		"updated_at": time.Now(),
	}

	// Set resolved_at timestamp if status is fixed or won't fix
	if req.Status == models.BugStatusFixed || req.Status == models.BugStatusWontFix {
		if bug.ResolvedAt == nil {
			updates["resolved_at"] = time.Now()
		}
	} else {
		// Clear resolved_at if status is changed back to open/reviewing
		updates["resolved_at"] = nil
	}

	if err := h.db.Model(&bug).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "UPDATE_FAILED",
				"message":   "Failed to update bug status",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Load updated bug
	if err := h.db.Preload("Application").Preload("AssignedCompany").
		First(&bug, bugUUID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Status updated but failed to load bug details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bug status updated successfully",
		"bug":     bug,
	})
}

// AddCompanyResponseRequest represents the request to add a company response
type AddCompanyResponseRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// AddCompanyResponse handles adding company responses to bug reports
func (h *BugHandler) AddCompanyResponse(c *gin.Context) {
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

	var req AddCompanyResponseRequest
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

	// Get current user ID (authentication required)
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "AUTH_REQUIRED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "INVALID_USER",
				"message":   "Invalid user ID",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get bug with company info
	var bug models.BugReport
	if err := h.db.Preload("AssignedCompany").First(&bug, bugUUID).Error; err != nil {
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

	// Check permissions - only company members can add company responses
	isAdmin := middleware.IsCurrentUserAdmin(c)
	canRespond := isAdmin

	if !canRespond && bug.AssignedCompanyID != nil {
		// Check if user is a member of the assigned company
		var membership models.CompanyMember
		err := h.db.Where("company_id = ? AND user_id = ?", *bug.AssignedCompanyID, userUUID).
			First(&membership).Error
		if err == nil {
			canRespond = true
		}
	}

	if !canRespond {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "INSUFFICIENT_PERMISSIONS",
				"message":   "Only company members can add company responses",
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

	// Sanitize and validate response content
	sanitizedContent, contentValid := utils.ValidateString(req.Content, 1, 2000)
	if !contentValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_CONTENT",
				"message":   "Response content must be between 1 and 2000 characters and contain no malicious content",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Create comment with company response flag
	comment := models.Comment{
		BugID:             bugUUID,
		UserID:            userUUID,
		Content:           sanitizedContent,
		IsCompanyResponse: true,
	}

	if err := tx.Create(&comment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "CREATE_FAILED",
				"message":   "Failed to create company response",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update bug comment count
	if err := tx.Model(&bug).Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_UPDATE_FAILED",
				"message":   "Failed to update comment count",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update user's last active timestamp
	if err := tx.Model(&models.User{}).Where("id = ?", userUUID).Update("last_active_at", time.Now()).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "ACTIVITY_UPDATE_FAILED",
				"message":   "Failed to update user activity",
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
				"message":   "Failed to save company response",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Load created comment with user details
	if err := h.db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Response created but failed to load details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Company response added successfully",
		"comment": comment,
	})
}
