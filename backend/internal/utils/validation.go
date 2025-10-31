package utils

import (
	"html"
	"regexp"
	"strings"
	"unicode"
)

// SanitizeInput sanitizes user input to prevent XSS and injection attacks
func SanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// HTML escape to prevent XSS
	input = html.EscapeString(input)
	
	// Remove control characters except newlines and tabs
	var result strings.Builder
	for _, r := range input {
		if r == '\n' || r == '\t' || r >= 32 {
			result.WriteRune(r)
		}
	}
	
	return strings.TrimSpace(result.String())
}

// SanitizeHTML removes potentially dangerous HTML tags and attributes
func SanitizeHTML(input string) string {
	// For now, we'll escape all HTML. In the future, you might want to use
	// a proper HTML sanitizer like bluemonday for more sophisticated sanitization
	return html.EscapeString(input)
}

// ValidateEmail validates email format with additional security checks
func ValidateEmail(email string) bool {
	if len(email) == 0 || len(email) > 254 {
		return false
	}
	
	// Basic email regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return false
	}
	
	// Additional checks for suspicious patterns
	suspiciousPatterns := []string{
		"javascript:", "data:", "vbscript:", "onload=", "onerror=",
	}
	
	lowerEmail := strings.ToLower(email)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerEmail, pattern) {
			return false
		}
	}
	
	return true
}

// ValidateURL validates URL format with security checks
func ValidateURL(url string) bool {
	if len(url) == 0 || len(url) > 2048 {
		return false
	}
	
	// Must start with http or https
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return false
	}
	
	// Basic URL validation
	urlRegex := regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$`)
	if !urlRegex.MatchString(url) {
		return false
	}
	
	// Check for suspicious patterns
	suspiciousPatterns := []string{
		"javascript:", "data:", "vbscript:", "file:", "ftp:",
		"<script", "</script", "onload=", "onerror=",
	}
	
	lowerURL := strings.ToLower(url)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerURL, pattern) {
			return false
		}
	}
	
	return true
}

// ValidateString validates and sanitizes general string input
func ValidateString(input string, minLength, maxLength int) (string, bool) {
	// Sanitize first
	sanitized := SanitizeInput(input)
	
	// Check length
	if len(sanitized) < minLength || len(sanitized) > maxLength {
		return "", false
	}
	
	// Check for suspicious patterns
	suspiciousPatterns := []string{
		"<script", "</script", "javascript:", "data:", "vbscript:",
		"onload=", "onerror=", "onclick=", "onmouseover=",
	}
	
	lowerInput := strings.ToLower(sanitized)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerInput, pattern) {
			return "", false
		}
	}
	
	return sanitized, true
}

// ValidateTag validates bug report tags
func ValidateTag(tag string) bool {
	// Tags should be alphanumeric with spaces, hyphens, and underscores
	if len(tag) == 0 || len(tag) > 50 {
		return false
	}
	
	// Check if tag contains only allowed characters
	for _, r := range tag {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != ' ' && r != '-' && r != '_' {
			return false
		}
	}
	
	return true
}

// ValidatePriority validates bug priority values
func ValidatePriority(priority string) bool {
	validPriorities := map[string]bool{
		"low":      true,
		"medium":   true,
		"high":     true,
		"critical": true,
	}
	
	return validPriorities[strings.ToLower(priority)]
}

// ValidateStatus validates bug status values
func ValidateStatus(status string) bool {
	validStatuses := map[string]bool{
		"open":      true,
		"reviewing": true,
		"fixed":     true,
		"wont_fix":  true,
	}
	
	return validStatuses[strings.ToLower(status)]
}

// ContainsSQLInjection checks for common SQL injection patterns
func ContainsSQLInjection(input string) bool {
	sqlPatterns := []string{
		"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
		"union", "select", "insert", "update", "delete", "drop",
		"create", "alter", "exec", "execute", "script",
	}
	
	lowerInput := strings.ToLower(input)
	for _, pattern := range sqlPatterns {
		if strings.Contains(lowerInput, pattern) {
			return true
		}
	}
	
	return false
}

// ValidateFileType validates uploaded file types
func ValidateFileType(filename, contentType string) bool {
	// Only allow image files
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	
	if !allowedTypes[contentType] {
		return false
	}
	
	// Check file extension
	lowerFilename := strings.ToLower(filename)
	allowedExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	
	for _, ext := range allowedExtensions {
		if strings.HasSuffix(lowerFilename, ext) {
			return true
		}
	}
	
	return false
}