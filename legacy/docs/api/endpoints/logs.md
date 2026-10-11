# Logging API Endpoints

This document provides comprehensive documentation for all logging endpoints in the BugRelay API.

## Overview

The Logging API allows frontend applications to submit logs, performance metrics, and security events to the backend for centralized monitoring and analysis. This enables comprehensive observability across the entire BugRelay platform.

## Base URL

All logging endpoints are prefixed with `/api/v1/logs`

## Authentication

- **API Key Required**: All logging endpoints require an API key for authentication
- **No User Authentication**: Logging endpoints don't require user JWT tokens
- **Rate Limiting**: Standard rate limits apply to prevent abuse

## API Key Authentication

Logging endpoints use API key authentication instead of JWT tokens:

```
X-API-Key: your_api_key_here
```

## Rate Limiting

- **General Logging**: 60 requests per minute per API key
- **Batch Submissions**: Recommended for high-volume logging

---

## Endpoints

### 1. Logs Health Check

Checks the health status of the logging system.

**Endpoint:** `GET /api/v1/logs/health`

**Authentication:** None required

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "backend-logging",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Use Cases:**
- System health monitoring
- Service availability checks
- Load balancer health probes
- Monitoring system integration

**Error Responses:**
- `500 Internal Server Error`: Logging system unavailable

---

### 2. Submit Frontend Logs

Submits logs, performance metrics, and security events from frontend applications.

**Endpoint:** `POST /api/v1/logs/frontend`

**Authentication:** API Key required

**Request Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**Request Body:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "sessionId": "session-uuid-12345",
  "userId": "user-uuid-67890",
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "error",
      "message": "JavaScript error occurred",
      "context": "UserDashboard",
      "metadata": {
        "error": "TypeError: Cannot read property 'id' of undefined",
        "stack": "Error: TypeError...\n    at UserDashboard.render...",
        "url": "https://app.bugrelay.com/dashboard",
        "line": 42,
        "column": 15,
        "component": "UserDashboard"
      },
      "userId": "user-uuid-67890",
      "sessionId": "session-uuid-12345",
      "requestId": "req-uuid-abc123"
    }
  ],
  "performance": [
    {
      "name": "page_load_time",
      "value": 2500,
      "unit": "ms",
      "timestamp": "2024-01-15T10:30:00Z",
      "metadata": {
        "page": "/dashboard",
        "browser": "Chrome 120.0",
        "connection": "4g",
        "cache_hit": false
      }
    },
    {
      "name": "api_response_time",
      "value": 850,
      "unit": "ms",
      "timestamp": "2024-01-15T10:30:15Z",
      "metadata": {
        "endpoint": "/api/v1/bugs",
        "method": "GET",
        "status": 200,
        "size": 15420
      }
    }
  ],
  "security": [
    {
      "event": "suspicious_activity",
      "severity": "medium",
      "timestamp": "2024-01-15T10:30:30Z",
      "metadata": {
        "type": "rapid_clicks",
        "count": 50,
        "duration": 5000,
        "element": "submit_button"
      }
    }
  ]
}
```

**Field Validation:**

**Root Level:**
- `timestamp`: Required, ISO 8601 format
- `sessionId`: Required, unique session identifier
- `userId`: Optional, user identifier (if authenticated)
- `logs`: Optional, array of log entries
- `performance`: Optional, array of performance metrics
- `security`: Optional, array of security events

**Log Entry Fields:**
- `timestamp`: Required, ISO 8601 format
- `level`: Required, one of: `error`, `warn`, `info`, `debug`
- `message`: Required, 1-1000 characters, log message
- `context`: Optional, 1-100 characters, context/component name
- `metadata`: Optional, object with additional data
- `userId`: Optional, user identifier
- `sessionId`: Optional, session identifier
- `requestId`: Optional, request correlation ID

**Performance Metric Fields:**
- `name`: Required, 1-100 characters, metric name
- `value`: Required, numeric value
- `unit`: Required, measurement unit (ms, bytes, count, etc.)
- `timestamp`: Required, ISO 8601 format
- `metadata`: Optional, object with additional context

**Security Event Fields:**
- `event`: Required, 1-100 characters, event type
- `severity`: Required, one of: `low`, `medium`, `high`, `critical`
- `timestamp`: Required, ISO 8601 format
- `metadata`: Optional, object with event details

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logs received successfully"
}
```

**Server-Side Processing:**

**Log Enhancement:**
- Adds server timestamp (`received_at`)
- Includes client IP address
- Adds user agent information
- Marks source as "frontend"

**Performance Monitoring:**
- Logs slow operations (>3 seconds) as warnings
- Tracks performance trends
- Enables performance alerting

**Security Analysis:**
- Critical/high severity events logged as errors
- Security events tracked for pattern analysis
- Enables security alerting and monitoring

**Error Responses:**
- `400 Bad Request`: Invalid payload format, validation errors
- `401 Unauthorized`: Invalid or missing API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_PAYLOAD`: Request payload validation failed
- `INVALID_API_KEY`: API key is invalid or missing
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Log Types and Use Cases

### Application Logs

**Error Logs:**
```json
{
  "level": "error",
  "message": "Failed to load user data",
  "context": "UserProfile",
  "metadata": {
    "error": "Network timeout",
    "endpoint": "/api/v1/auth/profile",
    "retry_count": 3,
    "user_action": "page_refresh"
  }
}
```

**Warning Logs:**
```json
{
  "level": "warn",
  "message": "Deprecated API endpoint used",
  "context": "ApiClient",
  "metadata": {
    "endpoint": "/api/v1/legacy/bugs",
    "replacement": "/api/v1/bugs",
    "deprecation_date": "2024-06-01"
  }
}
```

**Info Logs:**
```json
{
  "level": "info",
  "message": "User completed bug submission",
  "context": "BugSubmissionForm",
  "metadata": {
    "bug_id": "bug-uuid-123",
    "form_completion_time": 45000,
    "attachments_count": 2
  }
}
```

**Debug Logs:**
```json
{
  "level": "debug",
  "message": "API request initiated",
  "context": "ApiClient",
  "metadata": {
    "method": "POST",
    "endpoint": "/api/v1/bugs",
    "payload_size": 1024,
    "request_id": "req-uuid-456"
  }
}
```

### Performance Metrics

**Page Load Performance:**
```json
{
  "name": "page_load_time",
  "value": 1200,
  "unit": "ms",
  "metadata": {
    "page": "/bugs/create",
    "dom_content_loaded": 800,
    "first_contentful_paint": 600,
    "largest_contentful_paint": 1100
  }
}
```

**API Performance:**
```json
{
  "name": "api_response_time",
  "value": 450,
  "unit": "ms",
  "metadata": {
    "endpoint": "/api/v1/bugs",
    "method": "GET",
    "status": 200,
    "cache_hit": true,
    "response_size": 8192
  }
}
```

**User Interaction Performance:**
```json
{
  "name": "form_submission_time",
  "value": 2300,
  "unit": "ms",
  "metadata": {
    "form": "bug_submission",
    "validation_time": 150,
    "upload_time": 1800,
    "processing_time": 350
  }
}
```

**Resource Usage:**
```json
{
  "name": "memory_usage",
  "value": 45.6,
  "unit": "MB",
  "metadata": {
    "heap_used": 38.2,
    "heap_total": 52.1,
    "external": 7.4,
    "page": "/dashboard"
  }
}
```

### Security Events

**Authentication Events:**
```json
{
  "event": "login_attempt",
  "severity": "low",
  "metadata": {
    "success": true,
    "method": "oauth_google",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Suspicious Activity:**
```json
{
  "event": "rapid_form_submission",
  "severity": "medium",
  "metadata": {
    "form": "bug_submission",
    "submissions": 10,
    "time_window": 30000,
    "user_id": "user-uuid-789"
  }
}
```

**Security Violations:**
```json
{
  "event": "xss_attempt",
  "severity": "high",
  "metadata": {
    "field": "bug_description",
    "payload": "<script>alert('xss')</script>",
    "blocked": true,
    "sanitized": true
  }
}
```

**Critical Security Events:**
```json
{
  "event": "unauthorized_access_attempt",
  "severity": "critical",
  "metadata": {
    "resource": "/admin/dashboard",
    "user_role": "user",
    "required_role": "admin",
    "ip_address": "192.168.1.100"
  }
}
```

## Integration Examples

### JavaScript/Browser Integration

```javascript
class BugRelayLogger {
  constructor(apiKey, baseUrl = 'https://api.bugrelay.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.logBuffer = [];
    this.performanceBuffer = [];
    this.securityBuffer = [];
    
    // Flush buffers periodically
    setInterval(() => this.flush(), 30000); // Every 30 seconds
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  setUserId(userId) {
    this.userId = userId;
  }

  log(level, message, context, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.generateRequestId()
    };
    
    this.logBuffer.push(logEntry);
    
    // Flush immediately for errors
    if (level === 'error') {
      this.flush();
    }
  }

  error(message, context, metadata = {}) {
    this.log('error', message, context, metadata);
  }

  warn(message, context, metadata = {}) {
    this.log('warn', message, context, metadata);
  }

  info(message, context, metadata = {}) {
    this.log('info', message, context, metadata);
  }

  debug(message, context, metadata = {}) {
    this.log('debug', message, context, metadata);
  }

  performance(name, value, unit = 'ms', metadata = {}) {
    const metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.performanceBuffer.push(metric);
  }

  security(event, severity, metadata = {}) {
    const securityEvent = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.securityBuffer.push(securityEvent);
    
    // Flush immediately for high/critical severity
    if (severity === 'high' || severity === 'critical') {
      this.flush();
    }
  }

  async flush() {
    if (this.logBuffer.length === 0 && 
        this.performanceBuffer.length === 0 && 
        this.securityBuffer.length === 0) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      logs: [...this.logBuffer],
      performance: [...this.performanceBuffer],
      security: [...this.securityBuffer]
    };

    // Clear buffers
    this.logBuffer = [];
    this.performanceBuffer = [];
    this.securityBuffer = [];

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Failed to send logs:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending logs:', error);
    }
  }

  generateSessionId() {
    return 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  generateRequestId() {
    return 'req-' + Math.random().toString(36).substr(2, 9);
  }
}

// Usage
const logger = new BugRelayLogger('your-api-key');

// Set user ID when user logs in
logger.setUserId('user-uuid-123');

// Log application events
logger.info('User navigated to dashboard', 'Navigation', {
  from: '/login',
  to: '/dashboard'
});

logger.error('Failed to load bug data', 'BugList', {
  error: 'Network timeout',
  endpoint: '/api/v1/bugs',
  retry_count: 3
});

// Log performance metrics
logger.performance('page_load_time', 1200, 'ms', {
  page: '/dashboard',
  cache_hit: false
});

// Log security events
logger.security('rapid_clicks', 'medium', {
  element: 'submit_button',
  count: 15,
  duration: 2000
});
```

### React Integration

```javascript
import React, { createContext, useContext, useEffect } from 'react';

const LoggerContext = createContext();

export const LoggerProvider = ({ children, apiKey }) => {
  const logger = new BugRelayLogger(apiKey);

  useEffect(() => {
    // Set up global error handler
    window.addEventListener('error', (event) => {
      logger.error('JavaScript error', 'GlobalErrorHandler', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection', 'GlobalErrorHandler', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Performance observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logger.performance(entry.name, entry.value, 'ms', {
            entry_type: entry.entryType,
            start_time: entry.startTime
          });
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }, [logger]);

  return (
    <LoggerContext.Provider value={logger}>
      {children}
    </LoggerContext.Provider>
  );
};

export const useLogger = () => {
  const logger = useContext(LoggerContext);
  if (!logger) {
    throw new Error('useLogger must be used within LoggerProvider');
  }
  return logger;
};

// Usage in components
const BugSubmissionForm = () => {
  const logger = useLogger();

  const handleSubmit = async (formData) => {
    const startTime = performance.now();
    
    try {
      logger.info('Bug submission started', 'BugSubmissionForm', {
        form_data_size: JSON.stringify(formData).length
      });

      const response = await submitBug(formData);
      
      const endTime = performance.now();
      logger.performance('bug_submission_time', endTime - startTime, 'ms', {
        success: true,
        bug_id: response.bug.id
      });

      logger.info('Bug submitted successfully', 'BugSubmissionForm', {
        bug_id: response.bug.id
      });
    } catch (error) {
      const endTime = performance.now();
      logger.performance('bug_submission_time', endTime - startTime, 'ms', {
        success: false
      });

      logger.error('Bug submission failed', 'BugSubmissionForm', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  return (
    // Form JSX
  );
};
```

## Monitoring and Alerting

### Log Analysis

**Error Tracking:**
- Automatic error grouping by message and stack trace
- Error rate monitoring and alerting
- Error impact analysis (affected users, sessions)

**Performance Monitoring:**
- Page load time percentiles (P50, P95, P99)
- API response time tracking
- Performance regression detection

**Security Monitoring:**
- Security event pattern analysis
- Anomaly detection for suspicious activity
- Real-time security alerting

### Metrics and Dashboards

**Key Metrics:**
- Error rate by component/page
- Average response times by endpoint
- User session quality scores
- Security event frequency

**Dashboard Views:**
- Real-time error monitoring
- Performance trends over time
- Security event timeline
- User experience metrics

## Best Practices

### Logging Guidelines

**What to Log:**
- Application errors and exceptions
- User actions and navigation
- API requests and responses
- Performance bottlenecks
- Security-relevant events

**What NOT to Log:**
- Sensitive user data (passwords, tokens)
- Personal information (unless necessary)
- Large payloads (truncate if needed)
- High-frequency debug logs in production

### Performance Considerations

**Batching:**
- Buffer logs and send in batches
- Flush immediately for critical events
- Use reasonable batch sizes (10-50 entries)

**Rate Limiting:**
- Respect API rate limits
- Implement client-side throttling
- Use exponential backoff for retries

**Error Handling:**
- Handle logging failures gracefully
- Don't let logging errors break the application
- Provide fallback logging mechanisms

### Security Considerations

**API Key Security:**
- Store API keys securely
- Use environment variables
- Rotate keys regularly
- Monitor key usage

**Data Privacy:**
- Sanitize sensitive data before logging
- Comply with privacy regulations
- Implement data retention policies
- Provide user opt-out mechanisms

## Error Handling

### Standard Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

- `INVALID_PAYLOAD`: Request payload validation failed
- `INVALID_API_KEY`: API key is invalid or missing
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_LOG_LEVEL`: Log level must be error, warn, info, or debug
- `INVALID_SEVERITY`: Security event severity must be low, medium, high, or critical
- `PAYLOAD_TOO_LARGE`: Request payload exceeds size limit

### HTTP Status Codes

- `200 OK`: Logs received successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid or missing API key
- `413 Payload Too Large`: Request payload too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error