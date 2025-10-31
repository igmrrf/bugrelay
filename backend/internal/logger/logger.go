package logger

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
)

// Fields represents structured log fields
type Fields map[string]any

// Config holds logger configuration
type Config struct {
	Level      string `json:"level" env:"LOG_LEVEL" default:"info"`
	Format     string `json:"format" env:"LOG_FORMAT" default:"json"`
	Output     string `json:"output" env:"LOG_OUTPUT" default:"stdout"`
	MaxSize    int    `json:"max_size" env:"LOG_MAX_SIZE" default:"100"`
	MaxBackups int    `json:"max_backups" env:"LOG_MAX_BACKUPS" default:"3"`
	MaxAge     int    `json:"max_age" env:"LOG_MAX_AGE" default:"28"`
	Compress   bool   `json:"compress" env:"LOG_COMPRESS" default:"true"`
}

// Initialize configures logrus directly with the provided config
func Initialize(config Config) error {
	// Set log level
	level, err := logrus.ParseLevel(config.Level)
	if err != nil {
		return fmt.Errorf("invalid log level: %w", err)
	}
	logrus.SetLevel(level)

	// Set formatter
	switch config.Format {
	case "json":
		logrus.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
				logrus.FieldKeyFunc:  "caller",
			},
		})
	case "text":
		logrus.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: time.RFC3339,
		})
	default:
		return fmt.Errorf("unsupported log format: %s", config.Format)
	}

	// Set output
	switch config.Output {
	case "stdout":
		logrus.SetOutput(os.Stdout)
	case "file":
		logrus.SetOutput(&lumberjack.Logger{
			Filename:   "logs/app.log",
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
			Compress:   config.Compress,
		})
	case "both":
		// Log to both stdout and file
		logrus.SetOutput(&lumberjack.Logger{
			Filename:   "logs/app.log",
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
			Compress:   config.Compress,
		})
		// Also add stdout hook
		logrus.AddHook(&StdoutHook{})
	default:
		return fmt.Errorf("unsupported log output: %s", config.Output)
	}

	return nil
}

// StdoutHook sends logs to stdout in addition to file
type StdoutHook struct{}

func (hook *StdoutHook) Fire(entry *logrus.Entry) error {
	line, err := entry.String()
	if err != nil {
		return err
	}
	fmt.Print(line)
	return nil
}

func (hook *StdoutHook) Levels() []logrus.Level {
	return logrus.AllLevels
}

// WithContext creates a logger entry with context information
func WithContext(ctx context.Context) *logrus.Entry {
	entry := logrus.WithContext(ctx)

	// Extract request ID from context if available
	if requestID := ctx.Value("request_id"); requestID != nil {
		entry = entry.WithField("request_id", requestID)
	}

	// Extract user ID from context if available
	if userID := ctx.Value("user_id"); userID != nil {
		entry = entry.WithField("user_id", userID)
	}

	return entry
}

// RequestEntry wraps logrus.Entry to provide our Fields type compatibility
type RequestEntry struct {
	*logrus.Entry
}

// WithFields adds fields to the request entry using our Fields type
func (re *RequestEntry) WithFields(fields Fields) *logrus.Entry {
	return re.Entry.WithFields(logrus.Fields(fields))
}

// WithRequest creates a logger entry with request information
func WithRequest(c *gin.Context) *RequestEntry {
	fields := logrus.Fields{
		"method":     c.Request.Method,
		"path":       c.Request.URL.Path,
		"ip":         c.ClientIP(),
		"user_agent": c.Request.UserAgent(),
	}

	if requestID := c.GetString("request_id"); requestID != "" {
		fields["request_id"] = requestID
	}

	if userID := c.GetString("user_id"); userID != "" {
		fields["user_id"] = userID
	}

	return &RequestEntry{Entry: logrus.WithFields(fields)}
}

// WithFields creates a logger entry with structured fields
func WithFields(fields Fields) *logrus.Entry {
	return logrus.WithFields(logrus.Fields(fields))
}

// Audit logs administrative actions
func Audit(action, resource string, userID any, details map[string]any) {
	fields := logrus.Fields{
		"audit":     true,
		"action":    action,
		"resource":  resource,
		"user_id":   userID,
		"timestamp": time.Now().UTC(),
	}

	for k, v := range details {
		fields[k] = v
	}

	logrus.WithFields(fields).Info("Audit log entry")
}

// Security logs security-related events
func Security(event string, severity string, details map[string]any) {
	fields := logrus.Fields{
		"security":  true,
		"event":     event,
		"severity":  severity,
		"timestamp": time.Now().UTC(),
	}

	for k, v := range details {
		fields[k] = v
	}

	switch severity {
	case "critical":
		logrus.WithFields(fields).Error("Security event")
	case "high":
		logrus.WithFields(fields).Warn("Security event")
	default:
		logrus.WithFields(fields).Info("Security event")
	}
}

// Performance logs performance metrics
func Performance(operation string, duration time.Duration, details map[string]any) {
	fields := logrus.Fields{
		"performance": true,
		"operation":   operation,
		"duration_ms": duration.Milliseconds(),
		"timestamp":   time.Now().UTC(),
	}

	for k, v := range details {
		fields[k] = v
	}

	logrus.WithFields(fields).Info("Performance metric")
}

// Convenience functions that wrap logrus directly
func Info(message string, fields ...Fields) {
	if len(fields) > 0 {
		logrus.WithFields(logrus.Fields(fields[0])).Info(message)
	} else {
		logrus.Info(message)
	}
}

func Warn(message string, fields ...Fields) {
	if len(fields) > 0 {
		logrus.WithFields(logrus.Fields(fields[0])).Warn(message)
	} else {
		logrus.Warn(message)
	}
}

func Error(message string, err error, fields ...Fields) {
	entry := logrus.WithError(err)
	if len(fields) > 0 {
		entry = entry.WithFields(logrus.Fields(fields[0]))
	}
	entry.Error(message)
}

func Fatal(message string, err error, fields ...Fields) {
	entry := logrus.WithError(err)
	if len(fields) > 0 {
		entry = entry.WithFields(logrus.Fields(fields[0]))
	}
	entry.Fatal(message)
}

func Debug(message string, fields ...Fields) {
	if len(fields) > 0 {
		logrus.WithFields(logrus.Fields(fields[0])).Debug(message)
	} else {
		logrus.Debug(message)
	}
}
