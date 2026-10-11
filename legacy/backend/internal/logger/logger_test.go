package logger

import (
	"testing"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestInitialize(t *testing.T) {
	config := Config{
		Level:      "info",
		Format:     "json",
		Output:     "stdout",
		MaxSize:    100,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   true,
	}

	err := Initialize(config)
	assert.NoError(t, err)
	assert.Equal(t, logrus.InfoLevel, logrus.GetLevel())
}

func TestWithFields(t *testing.T) {
	fields := Fields{
		"test_key": "test_value",
		"number":   42,
	}

	entry := WithFields(fields)
	assert.NotNil(t, entry)
	assert.Equal(t, "test_value", entry.Data["test_key"])
	assert.Equal(t, 42, entry.Data["number"])
}

func TestAudit(t *testing.T) {
	// This test just ensures the function doesn't panic
	details := map[string]any{
		"resource_id": "123",
		"changes":     []string{"field1", "field2"},
	}

	assert.NotPanics(t, func() {
		Audit("create", "user", "user123", details)
	})
}

func TestSecurity(t *testing.T) {
	// This test just ensures the function doesn't panic
	details := map[string]any{
		"ip":         "192.168.1.1",
		"user_agent": "test-agent",
	}

	assert.NotPanics(t, func() {
		Security("login_attempt", "medium", details)
	})
}

func TestPerformance(t *testing.T) {
	// This test just ensures the function doesn't panic
	details := map[string]any{
		"query": "SELECT * FROM users",
		"rows":  100,
	}

	assert.NotPanics(t, func() {
		Performance("database_query", 150*time.Millisecond, details)
	})
}

func TestConvenienceFunctions(t *testing.T) {
	fields := Fields{
		"test": "value",
	}

	// These tests just ensure the functions don't panic
	assert.NotPanics(t, func() {
		Info("test info message", fields)
		Warn("test warn message", fields)
		Debug("test debug message", fields)
	})
}
