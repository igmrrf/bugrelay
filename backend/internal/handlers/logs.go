package handlers

import (
	"net/http"
	"time"

	"bugrelay-backend/internal/logger"

	"github.com/gin-gonic/gin"
)

// LogsHandler handles frontend logging endpoints
type LogsHandler struct{}

// NewLogsHandler creates a new logs handler
func NewLogsHandler() *LogsHandler {
	return &LogsHandler{}
}

// FrontendLogEntry represents a log entry from the frontend
type FrontendLogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Context   string                 `json:"context,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	UserID    string                 `json:"userId,omitempty"`
	SessionID string                 `json:"sessionId,omitempty"`
	RequestID string                 `json:"requestId,omitempty"`
}

// PerformanceMetric represents a performance metric from the frontend
type PerformanceMetric struct {
	Name      string                 `json:"name"`
	Value     float64                `json:"value"`
	Unit      string                 `json:"unit"`
	Timestamp string                 `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// SecurityEvent represents a security event from the frontend
type SecurityEvent struct {
	Event     string                 `json:"event"`
	Severity  string                 `json:"severity"`
	Timestamp string                 `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// FrontendLogsPayload represents the complete payload from frontend
type FrontendLogsPayload struct {
	Logs        []FrontendLogEntry  `json:"logs"`
	Performance []PerformanceMetric `json:"performance"`
	Security    []SecurityEvent     `json:"security"`
	Timestamp   string              `json:"timestamp"`
	SessionID   string              `json:"sessionId"`
	UserID      string              `json:"userId,omitempty"`
}

// ReceiveFrontendLogs handles frontend log submissions
func (h *LogsHandler) ReceiveFrontendLogs(c *gin.Context) {
	var payload FrontendLogsPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		logger.WithRequest(c).WithFields(logger.Fields{
			"error": err.Error(),
		}).Warn("Invalid frontend logs payload")

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid payload format",
		})
		return
	}

	// Get client information
	clientIP := c.ClientIP()
	userAgent := c.Request.UserAgent()

	// Process regular logs
	for _, logEntry := range payload.Logs {
		h.processFrontendLog(logEntry, clientIP, userAgent)
	}

	// Process performance metrics
	for _, metric := range payload.Performance {
		h.processPerformanceMetric(metric, payload.SessionID, payload.UserID)
	}

	// Process security events
	for _, event := range payload.Security {
		h.processSecurityEvent(event, payload.SessionID, payload.UserID, clientIP, userAgent)
	}

	// Log the batch receipt
	logger.WithRequest(c).WithFields(logger.Fields{
		"session_id":        payload.SessionID,
		"user_id":           payload.UserID,
		"logs_count":        len(payload.Logs),
		"performance_count": len(payload.Performance),
		"security_count":    len(payload.Security),
		"client_ip":         clientIP,
	}).Info("Frontend logs batch received")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logs received successfully",
	})
}

// processFrontendLog processes individual frontend log entries
func (h *LogsHandler) processFrontendLog(logEntry FrontendLogEntry, clientIP, userAgent string) {
	// Enhance metadata with server-side information
	if logEntry.Metadata == nil {
		logEntry.Metadata = make(map[string]interface{})
	}

	logEntry.Metadata["source"] = "frontend"
	logEntry.Metadata["client_ip"] = clientIP
	logEntry.Metadata["user_agent"] = userAgent
	logEntry.Metadata["received_at"] = time.Now().UTC().Format(time.RFC3339)

	// Create structured log entry
	fields := logger.Fields{
		"frontend_log": true,
		"session_id":   logEntry.SessionID,
		"user_id":      logEntry.UserID,
		"request_id":   logEntry.RequestID,
		"context":      logEntry.Context,
		"client_ip":    clientIP,
	}

	// Add metadata fields
	for k, v := range logEntry.Metadata {
		fields[k] = v
	}

	// Log with appropriate level
	entry := logger.WithFields(fields)
	switch logEntry.Level {
	case "error":
		entry.Error(logEntry.Message)
	case "warn":
		entry.Warn(logEntry.Message)
	case "debug":
		entry.Debug(logEntry.Message)
	default:
		entry.Info(logEntry.Message)
	}
}

// processPerformanceMetric processes frontend performance metrics
func (h *LogsHandler) processPerformanceMetric(metric PerformanceMetric, sessionID, userID string) {
	// Parse timestamp (not currently used but available for future enhancements)
	_, err := time.Parse(time.RFC3339, metric.Timestamp)
	if err != nil {
		// Use current time if parsing fails
		_ = time.Now()
	}

	// Enhance metadata
	if metric.Metadata == nil {
		metric.Metadata = make(map[string]interface{})
	}
	metric.Metadata["source"] = "frontend"
	metric.Metadata["session_id"] = sessionID
	metric.Metadata["user_id"] = userID

	// Log performance metric
	logger.Performance(metric.Name, time.Duration(metric.Value)*time.Millisecond, metric.Metadata)

	// Log slow operations as warnings
	if metric.Unit == "ms" && metric.Value > 3000 { // 3 seconds
		logger.WithFields(logger.Fields{
			"performance_metric": metric.Name,
			"value":              metric.Value,
			"unit":               metric.Unit,
			"session_id":         sessionID,
			"user_id":            userID,
		}).Warn("Slow frontend operation detected")
	}
}

// processSecurityEvent processes frontend security events
func (h *LogsHandler) processSecurityEvent(event SecurityEvent, sessionID, userID, clientIP, userAgent string) {
	// Enhance metadata
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	event.Metadata["source"] = "frontend"
	event.Metadata["session_id"] = sessionID
	event.Metadata["user_id"] = userID
	event.Metadata["client_ip"] = clientIP
	event.Metadata["user_agent"] = userAgent

	// Log security event
	logger.Security(event.Event, event.Severity, event.Metadata)

	// For critical security events, also log as error
	if event.Severity == "critical" || event.Severity == "high" {
		logger.WithFields(logger.Fields{
			"security_event": event.Event,
			"severity":       event.Severity,
			"session_id":     sessionID,
			"user_id":        userID,
			"client_ip":      clientIP,
		}).Error("Critical frontend security event")
	}
}

// GetLogsHealth returns the health status of the logging system
func (h *LogsHandler) GetLogsHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "backend-logging",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
