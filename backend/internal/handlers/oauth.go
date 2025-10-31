package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"bugrelay-backend/internal/auth"
	"bugrelay-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// OAuthHandler handles OAuth authentication requests
type OAuthHandler struct {
	db           *gorm.DB
	authService  *auth.Service
	oauthService *auth.OAuthService
}

// NewOAuthHandler creates a new OAuth handler
func NewOAuthHandler(db *gorm.DB, authService *auth.Service, oauthService *auth.OAuthService) *OAuthHandler {
	return &OAuthHandler{
		db:           db,
		authService:  authService,
		oauthService: oauthService,
	}
}

// OAuthLoginRequest represents the OAuth login initiation request
type OAuthLoginRequest struct {
	Provider    string `json:"provider" binding:"required,oneof=google github"`
	RedirectURL string `json:"redirect_url,omitempty"`
}

// OAuthCallbackRequest represents the OAuth callback request
type OAuthCallbackRequest struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state" binding:"required"`
}

// InitiateOAuth starts the OAuth flow
func (h *OAuthHandler) InitiateOAuth(c *gin.Context) {
	provider := c.Param("provider")
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_PROVIDER",
				"message":   "OAuth provider is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	oauthProvider, err := auth.ParseProvider(provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_PROVIDER",
				"message":   fmt.Sprintf("Unsupported OAuth provider: %s", provider),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Generate state for CSRF protection
	state, err := h.oauthService.GenerateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "STATE_GENERATION_FAILED",
				"message":   "Failed to generate OAuth state",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Store state in session/cookie for validation
	c.SetCookie("oauth_state", state, 600, "/", "", false, true) // 10 minutes

	// Get authorization URL
	authURL, err := h.oauthService.GetAuthURL(oauthProvider, state)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "AUTH_URL_GENERATION_FAILED",
				"message":   "Failed to generate authorization URL",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
		"state":    state,
	})
}

// HandleOAuthCallback handles the OAuth callback
func (h *OAuthHandler) HandleOAuthCallback(c *gin.Context) {
	provider := c.Param("provider")
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_PROVIDER",
				"message":   "OAuth provider is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	oauthProvider, err := auth.ParseProvider(provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_PROVIDER",
				"message":   fmt.Sprintf("Unsupported OAuth provider: %s", provider),
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Get code and state from query parameters
	code := c.Query("code")
	state := c.Query("state")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_CODE",
				"message":   "Authorization code is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	if state == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_STATE",
				"message":   "State parameter is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Validate state
	expectedState, err := c.Cookie("oauth_state")
	if err != nil || !h.oauthService.ValidateState(expectedState, state) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_STATE",
				"message":   "Invalid state parameter",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Clear the state cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	// Exchange code for token
	token, err := h.oauthService.ExchangeCodeForToken(c.Request.Context(), oauthProvider, code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "TOKEN_EXCHANGE_FAILED",
				"message":   "Failed to exchange authorization code for token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Get user info from OAuth provider
	userInfo, err := h.oauthService.GetUserInfo(c.Request.Context(), oauthProvider, token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "USER_INFO_FAILED",
				"message":   "Failed to get user information from OAuth provider",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Find or create user
	user, err := h.findOrCreateOAuthUser(userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "USER_CREATION_FAILED",
				"message":   "Failed to create or update user account",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Update last active time
	user.LastActiveAt = time.Now()
	h.db.Save(&user)

	// Generate JWT tokens
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
		"message": "OAuth authentication successful",
		"data":    response,
	})
}

// findOrCreateOAuthUser finds an existing user or creates a new one from OAuth info
func (h *OAuthHandler) findOrCreateOAuthUser(userInfo *auth.OAuthUserInfo) (*models.User, error) {
	var user models.User

	// First, try to find user by OAuth provider ID
	err := h.db.Where("auth_provider = ? AND auth_provider_id = ?", userInfo.Provider, userInfo.ID).First(&user).Error
	if err == nil {
		// User found, update their information
		user.DisplayName = userInfo.Name
		if userInfo.AvatarURL != "" {
			user.AvatarURL = &userInfo.AvatarURL
		}
		if userInfo.Verified {
			user.IsEmailVerified = true
		}
		return &user, h.db.Save(&user).Error
	}

	// If not found by provider ID, try to find by email
	if userInfo.Email != "" {
		err = h.db.Where("email = ?", strings.ToLower(userInfo.Email)).First(&user).Error
		if err == nil {
			// User exists with this email but different auth provider
			// Link the OAuth account to existing user
			if user.AuthProvider == "email" {
				// User originally registered with email/password
				// We can link the OAuth account as an additional auth method
				// For now, we'll update the auth provider to OAuth
				user.AuthProvider = userInfo.Provider
				user.AuthProviderID = &userInfo.ID
				user.DisplayName = userInfo.Name
				if userInfo.AvatarURL != "" {
					user.AvatarURL = &userInfo.AvatarURL
				}
				if userInfo.Verified {
					user.IsEmailVerified = true
				}
				return &user, h.db.Save(&user).Error
			} else {
				// User already has a different OAuth provider
				return nil, fmt.Errorf("user already exists with different authentication method")
			}
		}
	}

	// User doesn't exist, create new one
	user = models.User{
		Email:           strings.ToLower(userInfo.Email),
		DisplayName:     userInfo.Name,
		AuthProvider:    userInfo.Provider,
		AuthProviderID:  &userInfo.ID,
		IsEmailVerified: userInfo.Verified,
		IsAdmin:         false,
		LastActiveAt:    time.Now(),
	}

	if userInfo.AvatarURL != "" {
		user.AvatarURL = &userInfo.AvatarURL
	}

	err = h.db.Create(&user).Error
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// LinkOAuthAccount links an OAuth account to an existing authenticated user
func (h *OAuthHandler) LinkOAuthAccount(c *gin.Context) {
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

	provider := c.Param("provider")
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "MISSING_PROVIDER",
				"message":   "OAuth provider is required",
				"timestamp": time.Now(),
			},
		})
		return
	}

	oauthProvider, err := auth.ParseProvider(provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "INVALID_PROVIDER",
				"message":   fmt.Sprintf("Unsupported OAuth provider: %s", provider),
				"timestamp": time.Now(),
			},
		})
		return
	}

	var req OAuthCallbackRequest
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

	// Exchange code for token
	token, err := h.oauthService.ExchangeCodeForToken(c.Request.Context(), oauthProvider, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "TOKEN_EXCHANGE_FAILED",
				"message":   "Failed to exchange authorization code for token",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Get user info from OAuth provider
	userInfo, err := h.oauthService.GetUserInfo(c.Request.Context(), oauthProvider, token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":      "USER_INFO_FAILED",
				"message":   "Failed to get user information from OAuth provider",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Get current user
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

	// Check if OAuth account is already linked to another user
	var existingUser models.User
	err = h.db.Where("auth_provider = ? AND auth_provider_id = ?", userInfo.Provider, userInfo.ID).First(&existingUser).Error
	if err == nil && existingUser.ID != user.ID {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":      "OAUTH_ACCOUNT_LINKED",
				"message":   "This OAuth account is already linked to another user",
				"timestamp": time.Now(),
			},
		})
		return
	}

	// Update user with OAuth information
	user.AuthProvider = userInfo.Provider
	user.AuthProviderID = &userInfo.ID
	if userInfo.AvatarURL != "" {
		user.AvatarURL = &userInfo.AvatarURL
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":      "LINK_FAILED",
				"message":   "Failed to link OAuth account",
				"timestamp": time.Now(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OAuth account linked successfully",
		"data": UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			IsAdmin:     user.IsAdmin,
			CreatedAt:   user.CreatedAt,
		},
	})
}