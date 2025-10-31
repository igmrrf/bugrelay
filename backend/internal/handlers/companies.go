package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"bugrelay-backend/internal/middleware"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CompanyHandler handles company-related HTTP requests
type CompanyHandler struct {
	db *gorm.DB
}

// NewCompanyHandler creates a new company handler
func NewCompanyHandler(db *gorm.DB) *CompanyHandler {
	return &CompanyHandler{
		db: db,
	}
}

// extractDomainFromURL extracts domain from URL or application name
func (h *CompanyHandler) extractDomainFromURL(input string) string {
	// If it looks like a URL, parse it
	if strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://") {
		if parsedURL, err := url.Parse(input); err == nil && parsedURL.Host != "" {
			return strings.ToLower(parsedURL.Host)
		}
	}

	// If it looks like a domain (contains dots), use it directly
	if strings.Contains(input, ".") {
		// Remove www. prefix if present
		domain := strings.ToLower(input)
		if strings.HasPrefix(domain, "www.") {
			domain = domain[4:]
		}
		return domain
	}

	// For application names without clear domains, create a placeholder
	// This will be used for company pages that can be claimed later
	return strings.ToLower(strings.ReplaceAll(input, " ", "-")) + ".app"
}

// findOrCreateCompanyFromApplication creates a company from application info
func (h *CompanyHandler) findOrCreateCompanyFromApplication(tx *gorm.DB, appName string, appURL *string) (*models.Company, error) {
	// Extract domain from URL or application name
	var domain string
	if appURL != nil && *appURL != "" {
		domain = h.extractDomainFromURL(*appURL)
	} else {
		domain = h.extractDomainFromURL(appName)
	}

	// Try to find existing company by domain
	var company models.Company
	err := tx.Where("domain = ?", domain).First(&company).Error
	if err == nil {
		return &company, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Create new company
	companyName := appName
	if appURL != nil && *appURL != "" {
		// If we have a URL, try to extract a cleaner company name
		if parsedURL, err := url.Parse(*appURL); err == nil && parsedURL.Host != "" {
			// Remove www. and .com/.org etc for cleaner name
			host := strings.ToLower(parsedURL.Host)
			if strings.HasPrefix(host, "www.") {
				host = host[4:]
			}
			if dotIndex := strings.Index(host, "."); dotIndex > 0 {
				companyName = strings.Title(host[:dotIndex])
			}
		}
	}

	company = models.Company{
		Name:       companyName,
		Domain:     domain,
		IsVerified: false,
	}

	if err := tx.Create(&company).Error; err != nil {
		return nil, err
	}

	return &company, nil
}

// ListCompaniesRequest represents query parameters for listing companies
type ListCompaniesRequest struct {
	Page     int    `form:"page,default=1"`
	Limit    int    `form:"limit,default=20"`
	Search   string `form:"search"`
	Verified *bool  `form:"verified"`
}

// ListCompanies handles company listing with search and pagination
func (h *CompanyHandler) ListCompanies(c *gin.Context) {
	var req ListCompaniesRequest
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

	// Build query
	query := h.db.Model(&models.Company{}).
		Preload("Applications").
		Preload("Members").
		Preload("Members.User")

	// Apply filters
	if req.Verified != nil {
		query = query.Where("is_verified = ?", *req.Verified)
	}

	if req.Search != "" {
		searchTerm := strings.TrimSpace(req.Search)
		if len(searchTerm) > 0 {
			query = query.Where("LOWER(name) LIKE LOWER(?) OR LOWER(domain) LIKE LOWER(?)",
				"%"+searchTerm+"%", "%"+searchTerm+"%")
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "COUNT_FAILED",
				"message":   "Failed to count companies",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get paginated results
	var companies []models.Company
	offset := (req.Page - 1) * req.Limit
	if err := query.Offset(offset).Limit(req.Limit).Order("created_at DESC").Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch companies",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Calculate pagination info
	totalPages := (int(total) + req.Limit - 1) / req.Limit
	hasNext := req.Page < totalPages
	hasPrev := req.Page > 1

	c.JSON(http.StatusOK, gin.H{
		"companies": companies,
		"pagination": gin.H{
			"page":        req.Page,
			"limit":       req.Limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    hasNext,
			"has_prev":    hasPrev,
		},
	})
}

// GetCompany handles retrieving a single company by ID
func (h *CompanyHandler) GetCompany(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var company models.Company
	if err := h.db.Preload("Applications").
		Preload("Members").
		Preload("Members.User").
		Preload("AssignedBugs").
		First(&company, "id = ?", companyID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "COMPANY_NOT_FOUND",
					"message":   "Company not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"company": company,
	})
}

// generateVerificationToken generates a secure random token for email verification
func (h *CompanyHandler) generateVerificationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// isValidEmail validates email format
func (h *CompanyHandler) isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// isEmailFromDomain checks if email domain matches company domain
func (h *CompanyHandler) isEmailFromDomain(email, companyDomain string) bool {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	emailDomain := strings.ToLower(parts[1])
	companyDomain = strings.ToLower(companyDomain)

	// Remove www. prefix from company domain if present
	if strings.HasPrefix(companyDomain, "www.") {
		companyDomain = companyDomain[4:]
	}

	// Handle .app domains (our placeholder domains)
	if strings.HasSuffix(companyDomain, ".app") {
		return false // Cannot verify placeholder domains
	}

	return emailDomain == companyDomain
}

// ClaimCompanyRequest represents the request to initiate company claiming
type ClaimCompanyRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// InitiateCompanyClaim handles the initiation of company claiming process
func (h *CompanyHandler) InitiateCompanyClaim(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req ClaimCompanyRequest
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

	// Get current user
	userIDStr, _ := middleware.GetCurrentUserID(c)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Find company
	var company models.Company
	if err := h.db.First(&company, "id = ?", companyID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "COMPANY_NOT_FOUND",
					"message":   "Company not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if company is already verified
	if company.IsVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "ALREADY_VERIFIED",
				"message":   "Company is already verified",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if user is already a member
	var existingMember models.CompanyMember
	err = h.db.Where("company_id = ? AND user_id = ?", companyID, userID).First(&existingMember).Error
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "ALREADY_MEMBER",
				"message":   "User is already a member of this company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate email domain matches company domain
	if !h.isEmailFromDomain(req.Email, company.Domain) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_DOMAIN",
				"message":   fmt.Sprintf("Email must be from domain: %s", company.Domain),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Generate verification token
	token, err := h.generateVerificationToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "TOKEN_GENERATION_FAILED",
				"message":   "Failed to generate verification token",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update company with verification details
	if err := h.db.Model(&company).Updates(models.Company{
		VerificationToken: &token,
		VerificationEmail: &req.Email,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "UPDATE_FAILED",
				"message":   "Failed to initiate verification process",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// TODO: Send verification email with token
	// For now, we'll return the token in the response for testing
	// In production, this should be sent via email service

	c.JSON(http.StatusOK, gin.H{
		"message":            "Verification email sent. Please check your email and follow the instructions.",
		"verification_token": token, // Remove this in production
	})
}

// VerifyCompanyRequest represents the request to complete company verification
type VerifyCompanyRequest struct {
	Token string `json:"token" binding:"required"`
}

// CompleteCompanyVerification handles the completion of company verification
func (h *CompanyHandler) CompleteCompanyVerification(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req VerifyCompanyRequest
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

	// Get current user
	userIDStr, _ := middleware.GetCurrentUserID(c)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "Authentication required",
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

	// Find company with verification token
	var company models.Company
	if err := tx.Where("id = ? AND verification_token = ?", companyID, req.Token).First(&company).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":      "INVALID_TOKEN",
					"message":   "Invalid or expired verification token",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to verify token",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if already verified
	if company.IsVerified {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "ALREADY_VERIFIED",
				"message":   "Company is already verified",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Mark company as verified
	now := time.Now()
	if err := tx.Model(&company).Updates(models.Company{
		IsVerified:        true,
		VerifiedAt:        &now,
		VerificationToken: nil, // Clear the token
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "VERIFICATION_FAILED",
				"message":   "Failed to complete verification",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Add user as company admin
	companyMember := models.CompanyMember{
		CompanyID: company.ID,
		UserID:    userID,
		Role:      "admin",
		AddedAt:   now,
	}

	if err := tx.Create(&companyMember).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "MEMBER_CREATION_FAILED",
				"message":   "Failed to add user as company member",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update all applications with this domain to be owned by this company
	if err := tx.Model(&models.Application{}).
		Where("company_id IS NULL AND (url LIKE ? OR LOWER(name) LIKE LOWER(?))",
			"%"+company.Domain+"%", "%"+company.Name+"%").
		Update("company_id", company.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "APPLICATION_UPDATE_FAILED",
				"message":   "Failed to associate applications with company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Update bug reports to be assigned to this company
	if err := tx.Model(&models.BugReport{}).
		Joins("JOIN applications ON applications.id = bug_reports.application_id").
		Where("applications.company_id = ? AND bug_reports.assigned_company_id IS NULL", company.ID).
		Update("assigned_company_id", company.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "BUG_ASSIGNMENT_FAILED",
				"message":   "Failed to assign bug reports to company",
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
				"message":   "Failed to complete verification process",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Load updated company with relationships
	if err := h.db.Preload("Applications").
		Preload("Members").
		Preload("Members.User").
		First(&company, company.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Verification completed but failed to load company details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Company verification completed successfully",
		"company": company,
	})
}

// AddTeamMemberRequest represents the request to add a team member
type AddTeamMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role,omitempty"`
}

// AddTeamMember handles adding a team member to a company
func (h *CompanyHandler) AddTeamMember(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req AddTeamMemberRequest
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

	// Get current user
	userIDStr, _ := middleware.GetCurrentUserID(c)
	currentUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if current user is admin of the company
	var currentMember models.CompanyMember
	if err := h.db.Where("company_id = ? AND user_id = ? AND role = ?",
		companyID, currentUserID, "admin").First(&currentMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "INSUFFICIENT_PERMISSIONS",
				"message":   "Only company admins can add team members",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Find company
	var company models.Company
	if err := h.db.First(&company, "id = ?", companyID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "COMPANY_NOT_FOUND",
					"message":   "Company not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Validate email domain matches company domain (for verified companies)
	if company.IsVerified && !h.isEmailFromDomain(req.Email, company.Domain) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_DOMAIN",
				"message":   fmt.Sprintf("Email must be from domain: %s", company.Domain),
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Find user by email
	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "USER_NOT_FOUND",
					"message":   "User with this email not found. They must register first.",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to find user",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if user is already a member
	var existingMember models.CompanyMember
	err = h.db.Where("company_id = ? AND user_id = ?", companyID, user.ID).First(&existingMember).Error
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "ALREADY_MEMBER",
				"message":   "User is already a member of this company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "member"
	}

	// Validate role
	if role != "admin" && role != "member" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ROLE",
				"message":   "Role must be 'admin' or 'member'",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Create company member
	companyMember := models.CompanyMember{
		CompanyID: company.ID,
		UserID:    user.ID,
		Role:      role,
		AddedAt:   time.Now(),
	}

	if err := h.db.Create(&companyMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "MEMBER_CREATION_FAILED",
				"message":   "Failed to add team member",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Load member with user details
	if err := h.db.Preload("User").First(&companyMember, companyMember.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOAD_FAILED",
				"message":   "Member added but failed to load details",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Team member added successfully",
		"member":  companyMember,
	})
}

// RemoveTeamMemberRequest represents the request to remove a team member
type RemoveTeamMemberRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

// RemoveTeamMember handles removing a team member from a company
func (h *CompanyHandler) RemoveTeamMember(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	var req RemoveTeamMemberRequest
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

	// Validate target user UUID
	targetUserID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_USER_ID",
				"message":   "Invalid user ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get current user
	userIDStr, _ := middleware.GetCurrentUserID(c)
	currentUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if current user is admin of the company or removing themselves
	var currentMember models.CompanyMember
	if err := h.db.Where("company_id = ? AND user_id = ?",
		companyID, currentUserID).First(&currentMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "NOT_MEMBER",
				"message":   "User is not a member of this company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Only admins can remove others, but anyone can remove themselves
	if currentUserID != targetUserID && currentMember.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "INSUFFICIENT_PERMISSIONS",
				"message":   "Only company admins can remove other team members",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Find the member to remove
	var memberToRemove models.CompanyMember
	if err := h.db.Where("company_id = ? AND user_id = ?",
		companyID, targetUserID).First(&memberToRemove).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "MEMBER_NOT_FOUND",
					"message":   "Team member not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to find team member",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if this would remove the last admin
	if memberToRemove.Role == "admin" {
		var adminCount int64
		if err := h.db.Model(&models.CompanyMember{}).
			Where("company_id = ? AND role = ?", companyID, "admin").
			Count(&adminCount).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "COUNT_FAILED",
					"message":   "Failed to check admin count",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":      "LAST_ADMIN",
					"message":   "Cannot remove the last admin from the company",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}
	}

	// Remove the member
	if err := h.db.Delete(&memberToRemove).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "REMOVAL_FAILED",
				"message":   "Failed to remove team member",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Team member removed successfully",
	})
}

// GetCompanyDashboard handles retrieving company dashboard data
func (h *CompanyHandler) GetCompanyDashboard(c *gin.Context) {
	companyID := c.Param("id")

	// Validate UUID
	if _, err := uuid.Parse(companyID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_ID",
				"message":   "Invalid company ID format",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get current user
	userIDStr, _ := middleware.GetCurrentUserID(c)
	currentUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "Authentication required",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Check if current user is member of the company
	var currentMember models.CompanyMember
	if err := h.db.Where("company_id = ? AND user_id = ?",
		companyID, currentUserID).First(&currentMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "NOT_MEMBER",
				"message":   "Access denied. User is not a member of this company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get company with relationships
	var company models.Company
	if err := h.db.Preload("Applications").
		Preload("Members").
		Preload("Members.User").
		First(&company, "id = ?", companyID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":      "COMPANY_NOT_FOUND",
					"message":   "Company not found",
					"timestamp": time.Now().UTC(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch company",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Get bug statistics
	var bugStats struct {
		Total     int64 `json:"total"`
		Open      int64 `json:"open"`
		Reviewing int64 `json:"reviewing"`
		Fixed     int64 `json:"fixed"`
		WontFix   int64 `json:"wont_fix"`
	}

	// Total bugs
	if err := h.db.Model(&models.BugReport{}).
		Where("assigned_company_id = ?", companyID).
		Count(&bugStats.Total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "STATS_FAILED",
				"message":   "Failed to fetch bug statistics",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Bugs by status
	statusCounts := []struct {
		Status string
		Count  int64
	}{}

	if err := h.db.Model(&models.BugReport{}).
		Select("status, COUNT(*) as count").
		Where("assigned_company_id = ?", companyID).
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "STATS_FAILED",
				"message":   "Failed to fetch status statistics",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	// Map status counts
	for _, sc := range statusCounts {
		switch sc.Status {
		case "open":
			bugStats.Open = sc.Count
		case "reviewing":
			bugStats.Reviewing = sc.Count
		case "fixed":
			bugStats.Fixed = sc.Count
		case "wont_fix":
			bugStats.WontFix = sc.Count
		}
	}

	// Get recent bugs (last 10)
	var recentBugs []models.BugReport
	if err := h.db.Where("assigned_company_id = ?", companyID).
		Preload("Application").
		Preload("Reporter").
		Order("created_at DESC").
		Limit(10).
		Find(&recentBugs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "QUERY_FAILED",
				"message":   "Failed to fetch recent bugs",
				"timestamp": time.Now().UTC(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"company":     company,
		"user_role":   currentMember.Role,
		"bug_stats":   bugStats,
		"recent_bugs": recentBugs,
	})
}
