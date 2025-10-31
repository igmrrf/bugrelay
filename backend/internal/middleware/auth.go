package middleware

import (
	"context"
	"net/http"
	"strings"

	"bugrelay-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware handles JWT authentication for protected routes
type AuthMiddleware struct {
	jwtService       *auth.JWTService
	blacklistService *auth.BlacklistService
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(jwtService *auth.JWTService, blacklistService *auth.BlacklistService) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService:       jwtService,
		blacklistService: blacklistService,
	}
}

// RequireAuth middleware that requires valid JWT authentication
func (a *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := a.extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":      "MISSING_TOKEN",
					"message":   "Authentication token is required",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		claims, err := a.jwtService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":      "INVALID_TOKEN",
					"message":   "Invalid or expired authentication token",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		// Check if token is blacklisted
		isBlacklisted, err := a.blacklistService.IsTokenBlacklisted(context.Background(), claims.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":      "AUTH_CHECK_FAILED",
					"message":   "Failed to verify authentication status",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		if isBlacklisted {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":      "TOKEN_REVOKED",
					"message":   "Authentication token has been revoked",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		// Ensure this is an access token
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":      "INVALID_TOKEN_TYPE",
					"message":   "Access token required",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		// Store user information in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("is_admin", claims.IsAdmin)
		c.Set("token_id", claims.ID)

		c.Next()
	}
}

// RequireAdmin middleware that requires admin privileges
func (a *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First require authentication
		a.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Check admin status
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":      "INSUFFICIENT_PRIVILEGES",
					"message":   "Admin privileges required",
					"timestamp": gin.H{},
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth middleware that extracts user info if token is present but doesn't require it
func (a *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := a.extractToken(c)
		if token == "" {
			c.Next()
			return
		}

		claims, err := a.jwtService.ValidateToken(token)
		if err != nil {
			// Invalid token, but we don't abort for optional auth
			c.Next()
			return
		}

		// Check if token is blacklisted
		isBlacklisted, err := a.blacklistService.IsTokenBlacklisted(context.Background(), claims.ID)
		if err != nil || isBlacklisted {
			c.Next()
			return
		}

		// Ensure this is an access token
		if claims.TokenType != "access" {
			c.Next()
			return
		}

		// Store user information in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("is_admin", claims.IsAdmin)
		c.Set("token_id", claims.ID)

		c.Next()
	}
}

// extractToken extracts JWT token from Authorization header or cookie
func (a *AuthMiddleware) extractToken(c *gin.Context) string {
	// Try Authorization header first
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}

	// Try cookie as fallback
	cookie, err := c.Cookie("access_token")
	if err == nil && cookie != "" {
		return cookie
	}

	return ""
}

// GetCurrentUserID helper function to get current user ID from context
func GetCurrentUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	return userID.(string), true
}

// GetCurrentUserEmail helper function to get current user email from context
func GetCurrentUserEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get("user_email")
	if !exists {
		return "", false
	}
	return email.(string), true
}

// IsCurrentUserAdmin helper function to check if current user is admin
func IsCurrentUserAdmin(c *gin.Context) bool {
	isAdmin, exists := c.Get("is_admin")
	if !exists {
		return false
	}
	return isAdmin.(bool)
}