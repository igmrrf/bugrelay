package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"bugrelay-backend/internal/auth"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	db          *gorm.DB
	authService *auth.Service
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(db *gorm.DB, authService *auth.Service) *AuthHandler {
	return &AuthHandler{
		db:          db,
		authService: authService,
	}
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required,min=1,max=100"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenRequest represents the refresh token request payload
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// PasswordResetRequest represents the password reset request payload
type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// PasswordResetConfirmRequest represents the password reset confirmation payload
type PasswordResetConfirmRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// UpdateProfileRequest represents the profile update request payload
type UpdateProfileRequest struct {
	DisplayName string  `json:"display_name,omitempty" binding:"omitempty,min=1,max=100"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"` // seconds
}

// UserResponse represents the user data in responses
type UserResponse struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	IsAdmin     bool      `json:"isAdmin"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Validate password strength
	if err := h.authService.ValidatePasswordStrength(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "WEAK_PASSWORD",
				"message":   err.Error(),
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := h.db.Where("email = ?", strings.ToLower(req.Email)).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":      "USER_EXISTS",
				"message":   "User with this email already exists",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Hash password
	hashedPassword, err := h.authService.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "HASH_FAILED",
				"message":   "Failed to process password",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Generate email verification token
	verificationToken, err := auth.GenerateSecureToken(32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "TOKEN_GENERATION_FAILED",
				"message":   "Failed to generate verification token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Create user
	user := models.User{
		Email:                  strings.ToLower(req.Email),
		DisplayName:            req.DisplayName,
		PasswordHash:           &hashedPassword,
		AuthProvider:           "email",
		IsEmailVerified:        false,
		EmailVerificationToken: &verificationToken,
		IsAdmin:                false,
		LastActiveAt:           time.Now(),
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "USER_CREATION_FAILED",
				"message":   "Failed to create user account",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// TODO: Send verification email (implement email service)
	// For now, we'll auto-verify for development
	user.IsEmailVerified = true
	user.EmailVerificationToken = nil
	h.db.Save(&user)

	// Generate tokens
	accessToken, refreshToken, err := h.authService.GenerateTokens(user.ID.String(), user.Email, user.IsAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "TOKEN_GENERATION_FAILED",
				"timestamp": time.Now(),
			},
		})
		return
	}

	response := AuthResponse{
		User: UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			IsAdmin:     user.IsAdmin,
			CreatedAt:   user.CreatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600, // 1 hour
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": "USER_CREATION_PASSED",
		"data": response,
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Find user by email
	var user models.User
	if err := h.db.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "INVALID_CREDENTIALS",
				"message":   "Invalid email or password",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Check if user uses email authentication
	if user.AuthProvider != "email" || user.PasswordHash == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "INVALID_AUTH_METHOD",
				"message":   "This account uses a different authentication method",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Validate password
	if err := h.authService.ValidatePassword(req.Password, *user.PasswordHash); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "INVALID_CREDENTIALS",
				"message":   "Invalid email or password",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Check if email is verified
	if !user.IsEmailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "EMAIL_NOT_VERIFIED",
				"message":   "Please verify your email address before logging in",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Update last active time
	user.LastActiveAt = time.Now()
	h.db.Save(&user)

	// Generate tokens
	accessToken, refreshToken, err := h.authService.GenerateTokens(user.ID.String(), user.Email, user.IsAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "TOKEN_GENERATION_FAILED",
				"message":   "Failed to generate authentication tokens",
				"timestamp": time.Now(),
			},
		})
		return
	}

	response := AuthResponse{
		User: UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			IsAdmin:     user.IsAdmin,
			CreatedAt:   user.CreatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600, // 1 hour
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "LOGIN_SUCCESS",
		"message": "Login successful",
		"data":    response,
	})
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Refresh tokens
	accessToken, refreshToken, err := h.authService.RefreshTokens(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "INVALID_REFRESH_TOKEN",
				"message":   "Invalid or expired refresh token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tokens refreshed successfully",
		"data": gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"expires_in":    3600, // 1 hour
		},
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get token from header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_TOKEN",
				"message":   "Authorization token is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_TOKEN_FORMAT",
				"message":   "Invalid authorization header format",
				"timestamp": time.Now(),
			},
		})
		return
	}

	token := parts[1]

	// Revoke the token
	if err := h.authService.RevokeToken(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOGOUT_FAILED",
				"message":   "Failed to logout",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}

// LogoutAll handles logout from all devices
func (h *AuthHandler) LogoutAll(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "User not authenticated",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Revoke all user tokens
	if err := h.authService.RevokeAllUserTokens(userID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LOGOUT_ALL_FAILED",
				"message":   "Failed to logout from all devices",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out from all devices successfully",
	})
}

// RequestPasswordReset handles password reset requests
func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var req PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Find user by email
	var user models.User
	if err := h.db.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		// Don't reveal if email exists or not for security
		c.JSON(http.StatusOK, gin.H{
			"message": "If the email exists, a password reset link has been sent",
		})
		return
	}

	// Check if user uses email authentication
	if user.AuthProvider != "email" {
		c.JSON(http.StatusOK, gin.H{
			"message": "If the email exists, a password reset link has been sent",
		})
		return
	}

	// Generate password reset token
	resetToken, err := auth.GenerateSecureToken(32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "TOKEN_GENERATION_FAILED",
				"message":   "Failed to generate reset token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Set reset token and expiration (1 hour)
	expiresAt := time.Now().Add(time.Hour)
	user.PasswordResetToken = &resetToken
	user.PasswordResetExpires = &expiresAt

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "RESET_REQUEST_FAILED",
				"message":   "Failed to process password reset request",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// TODO: Send password reset email (implement email service)
	// For development, we'll log the token
	fmt.Printf("Password reset token for %s: %s\n", user.Email, resetToken)

	c.JSON(http.StatusOK, gin.H{
		"message": "If the email exists, a password reset link has been sent",
	})
}

// ResetPassword handles password reset confirmation
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req PasswordResetConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Validate password strength
	if err := h.authService.ValidatePasswordStrength(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "WEAK_PASSWORD",
				"message":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Find user by reset token
	var user models.User
	if err := h.db.Where("password_reset_token = ? AND password_reset_expires > ?", req.Token, time.Now()).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_RESET_TOKEN",
				"message":   "Invalid or expired reset token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Hash new password
	hashedPassword, err := h.authService.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "HASH_FAILED",
				"message":   "Failed to process new password",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Update password and clear reset token
	user.PasswordHash = &hashedPassword
	user.PasswordResetToken = nil
	user.PasswordResetExpires = nil

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "PASSWORD_UPDATE_FAILED",
				"message":   "Failed to update password",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Revoke all existing tokens for security
	h.authService.RevokeAllUserTokens(user.ID.String())

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successful",
	})
}

// GetProfile returns the current user's profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "User not authenticated",
				"timestamp": time.Now(),
			},
		})
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":      "USER_NOT_FOUND",
				"message":   "User not found",
				"timestamp": time.Now(),
			},
		})
		return
	}

	response := UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		IsAdmin:     user.IsAdmin,
		CreatedAt:   user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": response,
	})
}

// UpdateProfile updates the current user's profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":      "UNAUTHORIZED",
				"message":   "User not authenticated",
				"timestamp": time.Now(),
			},
		})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_REQUEST",
				"message":   "Invalid request data",
				"details":   err.Error(),
				"timestamp": time.Now(),
			},
		})
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":      "USER_NOT_FOUND",
				"message":   "User not found",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Update fields if provided
	if req.DisplayName != "" {
		user.DisplayName = req.DisplayName
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "UPDATE_FAILED",
				"message":   "Failed to update profile",
				"timestamp": time.Now(),
			},
		})
		return
	}

	response := UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		IsAdmin:     user.IsAdmin,
		CreatedAt:   user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"data":    response,
	})
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_TOKEN",
				"message":   "Verification token is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	var user models.User
	if err := h.db.Where("email_verification_token = ?", token).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_TOKEN",
				"message":   "Invalid verification token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Mark email as verified
	user.IsEmailVerified = true
	user.EmailVerificationToken = nil

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "VERIFICATION_FAILED",
				"message":   "Failed to verify email",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully",
	})
}
