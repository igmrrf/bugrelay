package middleware

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// SecurityMiddleware provides various security enhancements
type SecurityMiddleware struct {
	trustedProxies []string
}

// NewSecurityMiddleware creates a new security middleware
func NewSecurityMiddleware(trustedProxies []string) *SecurityMiddleware {
	return &SecurityMiddleware{
		trustedProxies: trustedProxies,
	}
}

// SecurityHeaders adds security headers to responses
func (s *SecurityMiddleware) SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// Enable XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy (adjust based on your needs)
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: https:; " +
			"font-src 'self' https:; " +
			"connect-src 'self' https:; " +
			"frame-src https://www.google.com; " +
			"object-src 'none'; " +
			"base-uri 'self'"
		c.Header("Content-Security-Policy", csp)
		
		// HSTS (only in production with HTTPS)
		if c.Request.Header.Get("X-Forwarded-Proto") == "https" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		c.Next()
	}
}

// InputSanitization sanitizes user input to prevent XSS and injection attacks
func (s *SecurityMiddleware) InputSanitization() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for file uploads
		if strings.Contains(c.GetHeader("Content-Type"), "multipart/form-data") {
			c.Next()
			return
		}

		// Get the raw body for JSON requests
		if c.GetHeader("Content-Type") == "application/json" {
			// The actual sanitization would happen in the handlers
			// This middleware just sets up the context for sanitization
			c.Set("sanitize_input", true)
		}

		c.Next()
	}
}

// ValidateUserAgent checks for suspicious user agents
func (s *SecurityMiddleware) ValidateUserAgent() gin.HandlerFunc {
	suspiciousPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(bot|crawler|spider|scraper)`),
		regexp.MustCompile(`(?i)(sqlmap|nmap|nikto|dirb|gobuster)`),
		regexp.MustCompile(`(?i)(python-requests|curl|wget)`),
	}

	return func(c *gin.Context) {
		userAgent := c.GetHeader("User-Agent")
		
		// Allow empty user agent for now (some legitimate clients)
		if userAgent == "" {
			c.Next()
			return
		}

		// Check against suspicious patterns
		for _, pattern := range suspiciousPatterns {
			if pattern.MatchString(userAgent) {
				c.JSON(http.StatusForbidden, gin.H{
					"error": gin.H{
						"code":      "SUSPICIOUS_USER_AGENT",
						"message":   "Access denied",
						"timestamp": time.Now().UTC(),
					},
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// IPWhitelist restricts access to specific IP ranges (for admin endpoints)
func (s *SecurityMiddleware) IPWhitelist(allowedIPs []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		// If no whitelist specified, allow all
		if len(allowedIPs) == 0 {
			c.Next()
			return
		}

		// Check if client IP is in whitelist
		for _, allowedIP := range allowedIPs {
			if clientIP == allowedIP || allowedIP == "*" {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":      "IP_NOT_ALLOWED",
				"message":   "Access denied from this IP address",
				"timestamp": time.Now().UTC(),
			},
		})
		c.Abort()
	}
}

// RequestSizeLimit limits the size of request bodies
func (s *SecurityMiddleware) RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": gin.H{
					"code":      "REQUEST_TOO_LARGE",
					"message":   "Request body too large",
					"timestamp": time.Now().UTC(),
				},
			})
			c.Abort()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// SanitizeString removes potentially dangerous characters from strings
func SanitizeString(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Remove control characters except newlines and tabs
	var result strings.Builder
	for _, r := range input {
		if r == '\n' || r == '\t' || r >= 32 {
			result.WriteRune(r)
		}
	}
	
	return strings.TrimSpace(result.String())
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email) && len(email) <= 254
}

// ValidateURL validates URL format
func ValidateURL(url string) bool {
	urlRegex := regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$`)
	return urlRegex.MatchString(url) && len(url) <= 2048
}