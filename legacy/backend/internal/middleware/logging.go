package middleware

import (
	"bugrelay-backend/internal/logger"
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LoggingMiddleware provides structured logging for HTTP requests
func LoggingMiddleware() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Don't return anything as we handle logging ourselves
		return ""
	})
}

// RequestLoggingMiddleware logs detailed request/response information
func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Start timer
		start := time.Now()

		// Capture request body for logging (if not too large)
		var requestBody []byte
		if c.Request.Body != nil && c.Request.ContentLength < 1024*1024 { // 1MB limit
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Create response writer wrapper to capture response
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// Log request start
		logger.WithRequest(c).WithFields(logger.Fields{
			"request_body_size": len(requestBody),
			"content_type":      c.Request.Header.Get("Content-Type"),
		}).Info("Request started")

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Determine log level based on status code
		statusCode := c.Writer.Status()
		logLevel := "info"
		if statusCode >= 400 && statusCode < 500 {
			logLevel = "warn"
		} else if statusCode >= 500 {
			logLevel = "error"
		}

		// Prepare log fields
		fields := logger.Fields{
			"status_code":   statusCode,
			"duration_ms":   duration.Milliseconds(),
			"response_size": blw.body.Len(),
			"errors":        c.Errors.String(),
		}

		// Add request body to logs for debugging (only in development)
		if gin.Mode() == gin.DebugMode && len(requestBody) > 0 && len(requestBody) < 1024 {
			fields["request_body"] = string(requestBody)
		}

		// Add response body for errors (only in development)
		if gin.Mode() == gin.DebugMode && statusCode >= 400 && blw.body.Len() < 1024 {
			fields["response_body"] = blw.body.String()
		}

		// Log request completion
		entry := logger.WithRequest(c).WithFields(fields)
		message := "Request completed"

		switch logLevel {
		case "error":
			entry.Error(message)
		case "warn":
			entry.Warn(message)
		default:
			entry.Info(message)
		}

		// Log performance metrics for slow requests
		if duration > 1*time.Second {
			logger.Performance("http_request", duration, map[string]interface{}{
				"method":      c.Request.Method,
				"path":        c.Request.URL.Path,
				"status_code": statusCode,
				"request_id":  requestID,
			})
		}

		// Log security events for suspicious activity
		if statusCode == 401 || statusCode == 403 {
			logger.Security("unauthorized_access", "medium", map[string]interface{}{
				"method":      c.Request.Method,
				"path":        c.Request.URL.Path,
				"ip":          c.ClientIP(),
				"user_agent":  c.Request.UserAgent(),
				"status_code": statusCode,
				"request_id":  requestID,
			})
		}
	}
}

// bodyLogWriter wraps gin.ResponseWriter to capture response body
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// ErrorLoggingMiddleware logs panics and errors
func ErrorLoggingMiddleware() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.WithRequest(c).WithFields(logger.Fields{
			"panic": recovered,
		}).Error("Panic recovered")

		// Log security event for potential attacks
		logger.Security("panic_recovered", "high", map[string]interface{}{
			"method":     c.Request.Method,
			"path":       c.Request.URL.Path,
			"ip":         c.ClientIP(),
			"user_agent": c.Request.UserAgent(),
			"panic":      recovered,
			"request_id": c.GetString("request_id"),
		})

		c.AbortWithStatus(500)
	})
}

// AuditLoggingMiddleware logs administrative actions
func AuditLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only audit specific paths
		if !isAuditablePath(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Get user ID from context
		userID := c.GetString("user_id")
		if userID == "" {
			c.Next()
			return
		}

		// Process request
		c.Next()

		// Only log successful operations
		if c.Writer.Status() < 400 {
			action := getActionFromRequest(c.Request.Method, c.Request.URL.Path)
			resource := getResourceFromPath(c.Request.URL.Path)

			details := map[string]interface{}{
				"method":     c.Request.Method,
				"path":       c.Request.URL.Path,
				"ip":         c.ClientIP(),
				"request_id": c.GetString("request_id"),
			}

			logger.Audit(action, resource, userID, details)
		}
	}
}

// isAuditablePath determines if a path should be audited
func isAuditablePath(path string) bool {
	auditPaths := []string{
		"/api/v1/admin/",
		"/api/v1/bugs/",
		"/api/v1/companies/",
	}

	for _, auditPath := range auditPaths {
		if len(path) >= len(auditPath) && path[:len(auditPath)] == auditPath {
			return true
		}
	}
	return false
}

// getActionFromRequest determines the action based on HTTP method and path
func getActionFromRequest(method, path string) string {
	switch method {
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	case "GET":
		return "read"
	default:
		return "unknown"
	}
}

// getResourceFromPath extracts the resource type from the path
func getResourceFromPath(path string) string {
	if contains(path, "/bugs/") {
		return "bug"
	}
	if contains(path, "/companies/") {
		return "company"
	}
	if contains(path, "/admin/") {
		return "admin"
	}
	return "unknown"
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[:len(substr)] == substr ||
		(len(s) > len(substr) && s[len(s)-len(substr):] == substr) ||
		(len(s) > len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
