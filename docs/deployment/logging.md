# Logging Configuration Guide

This guide covers comprehensive logging configuration for BugRelay, including log formats, levels, collection, analysis, and troubleshooting procedures.

## Overview

BugRelay implements structured logging with multiple output formats and destinations to support development, debugging, monitoring, and compliance requirements.

## Log Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   System Logs   │    │  Security Logs  │
│      Logs       │    │                 │    │   (Audit)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Log Aggregation                          │
│                         (Promtail)                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Log Storage                                │
│                        (Loki)                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Grafana      │    │   AlertManager  │    │   Log Analysis  │
│  (Visualization)│    │   (Alerting)    │    │     Tools       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Log Configuration

### Environment Variables

| Variable | Description | Default | Values |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | Log output format | `json` | `json`, `text` |
| `LOG_OUTPUT` | Log output destination | `both` | `stdout`, `file`, `both` |
| `LOG_FILE_PATH` | Log file directory | `./logs` | Any valid path |
| `LOG_MAX_SIZE` | Max log file size (MB) | `100` | Numeric value |
| `LOG_MAX_BACKUPS` | Max backup files | `3` | Numeric value |
| `LOG_MAX_AGE` | Max age in days | `28` | Numeric value |
| `LOG_COMPRESS` | Compress old logs | `true` | `true`, `false` |

### Configuration Examples

#### Development Configuration
```bash
LOG_LEVEL=debug
LOG_FORMAT=text
LOG_OUTPUT=stdout
LOG_FILE_PATH=./logs
```

#### Production Configuration
```bash
LOG_LEVEL=info
LOG_FORMAT=json
LOG_OUTPUT=both
LOG_FILE_PATH=/app/logs
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=5
LOG_MAX_AGE=30
LOG_COMPRESS=true
```

#### Debug Configuration
```bash
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_OUTPUT=file
LOG_FILE_PATH=/var/log/bugrelay
LOG_MAX_SIZE=50
LOG_MAX_BACKUPS=10
LOG_MAX_AGE=7
LOG_COMPRESS=true
```

## Log Formats

### JSON Format (Recommended for Production)

```json
{
  "timestamp": "2023-12-01T10:30:00.123Z",
  "level": "info",
  "service": "bugrelay-backend",
  "version": "1.0.0",
  "request_id": "req_123456789abcdef",
  "user_id": "user_987654321",
  "session_id": "sess_abcdef123456",
  "method": "POST",
  "path": "/api/v1/bugs",
  "status_code": 201,
  "duration_ms": 45,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (compatible; BugRelay-Client/1.0)",
  "message": "Bug report created successfully",
  "metadata": {
    "bug_id": "bug_123456789",
    "application_id": "app_987654321",
    "priority": "high",
    "tags": ["ui", "mobile"]
  },
  "error": null
}
```

### Text Format (Human-Readable for Development)

```
2023-12-01T10:30:00.123Z INFO [req_123456789abcdef] POST /api/v1/bugs 201 45ms user_987654321 - Bug report created successfully
```

### Error Log Format

```json
{
  "timestamp": "2023-12-01T10:30:00.123Z",
  "level": "error",
  "service": "bugrelay-backend",
  "request_id": "req_123456789abcdef",
  "user_id": "user_987654321",
  "method": "POST",
  "path": "/api/v1/bugs",
  "status_code": 500,
  "duration_ms": 1250,
  "message": "Database connection failed",
  "error": {
    "type": "DatabaseError",
    "message": "connection refused",
    "stack": "DatabaseError: connection refused\n    at Database.connect (/app/database.go:45)\n    at Handler.createBug (/app/handlers/bugs.go:123)",
    "code": "DB_CONNECTION_FAILED"
  },
  "metadata": {
    "retry_count": 3,
    "last_successful_connection": "2023-12-01T10:25:00Z"
  }
}
```

## Log Levels

### DEBUG
**Purpose**: Detailed debugging information for development
**When to use**: Development and troubleshooting
**Examples**:
- Function entry/exit
- Variable values
- Detailed execution flow
- Performance measurements

```json
{
  "level": "debug",
  "message": "Entering createBug handler",
  "metadata": {
    "function": "handlers.createBug",
    "parameters": {
      "title": "UI bug in mobile app",
      "application_id": "app_123"
    }
  }
}
```

### INFO
**Purpose**: General information about application operation
**When to use**: Normal application flow
**Examples**:
- Successful operations
- Business events
- Configuration changes
- Startup/shutdown events

```json
{
  "level": "info",
  "message": "Bug report created successfully",
  "metadata": {
    "bug_id": "bug_123456789",
    "user_id": "user_987654321",
    "application_id": "app_123"
  }
}
```

### WARN
**Purpose**: Warning conditions that don't prevent operation
**When to use**: Recoverable errors, deprecated features
**Examples**:
- Rate limiting triggered
- Deprecated API usage
- Performance degradation
- Configuration issues

```json
{
  "level": "warn",
  "message": "Rate limit exceeded for user",
  "metadata": {
    "user_id": "user_987654321",
    "endpoint": "/api/v1/bugs",
    "current_rate": 150,
    "limit": 100,
    "window": "1m"
  }
}
```

### ERROR
**Purpose**: Error conditions that prevent operation
**When to use**: Application errors, failed operations
**Examples**:
- Database errors
- External service failures
- Validation errors
- Authentication failures

```json
{
  "level": "error",
  "message": "Failed to create bug report",
  "error": {
    "type": "ValidationError",
    "message": "Title is required",
    "field": "title"
  },
  "metadata": {
    "user_id": "user_987654321",
    "request_data": {
      "description": "Bug description",
      "application_id": "app_123"
    }
  }
}
```

## Log Categories

### Application Logs

#### Request/Response Logs
```json
{
  "category": "http",
  "type": "request",
  "method": "POST",
  "path": "/api/v1/bugs",
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer ***",
    "user-agent": "BugRelay-Client/1.0"
  },
  "body_size": 1024,
  "query_params": {}
}
```

#### Business Logic Logs
```json
{
  "category": "business",
  "type": "bug_creation",
  "action": "create_bug",
  "resource": "bug",
  "resource_id": "bug_123456789",
  "user_id": "user_987654321",
  "metadata": {
    "application_id": "app_123",
    "priority": "high",
    "tags": ["ui", "mobile"]
  }
}
```

#### Database Logs
```json
{
  "category": "database",
  "type": "query",
  "operation": "INSERT",
  "table": "bug_reports",
  "duration_ms": 15,
  "rows_affected": 1,
  "query_hash": "sha256:abc123...",
  "connection_id": "conn_456"
}
```

#### Cache Logs
```json
{
  "category": "cache",
  "type": "operation",
  "operation": "SET",
  "key": "user:987654321:profile",
  "ttl_seconds": 3600,
  "size_bytes": 512,
  "hit": false,
  "duration_ms": 2
}
```

### Security Logs

#### Authentication Logs
```json
{
  "category": "security",
  "type": "authentication",
  "action": "login_attempt",
  "user_id": "user_987654321",
  "success": true,
  "method": "oauth_google",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "session_id": "sess_123456789",
    "oauth_provider": "google",
    "oauth_user_id": "google_123456789"
  }
}
```

#### Authorization Logs
```json
{
  "category": "security",
  "type": "authorization",
  "action": "access_attempt",
  "user_id": "user_987654321",
  "resource": "bug",
  "resource_id": "bug_123456789",
  "permission": "read",
  "granted": true,
  "reason": "owner_access"
}
```

#### Audit Logs
```json
{
  "category": "audit",
  "type": "data_modification",
  "action": "update_bug_status",
  "user_id": "user_987654321",
  "resource": "bug",
  "resource_id": "bug_123456789",
  "changes": {
    "status": {
      "from": "open",
      "to": "reviewing"
    }
  },
  "metadata": {
    "admin_action": false,
    "company_id": "company_123"
  }
}
```

### System Logs

#### Application Lifecycle
```json
{
  "category": "system",
  "type": "lifecycle",
  "event": "application_start",
  "version": "1.0.0",
  "environment": "production",
  "config": {
    "port": 8080,
    "log_level": "info",
    "database_host": "postgres.example.com"
  }
}
```

#### Health Check Logs
```json
{
  "category": "system",
  "type": "health_check",
  "component": "database",
  "status": "healthy",
  "response_time_ms": 5,
  "details": {
    "active_connections": 3,
    "idle_connections": 7,
    "max_connections": 25
  }
}
```

#### Performance Logs
```json
{
  "category": "performance",
  "type": "metrics",
  "metric": "response_time",
  "value": 45,
  "unit": "milliseconds",
  "endpoint": "/api/v1/bugs",
  "percentile": 95,
  "window": "5m"
}
```

## Log Collection

### Promtail Configuration

#### Basic Configuration
```yaml
# promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: bugrelay-backend
    static_configs:
      - targets: [localhost]
        labels:
          job: bugrelay-backend
          service: backend
          environment: production
          __path__: /var/log/bugrelay/*.log
```

#### Advanced Pipeline Configuration
```yaml
scrape_configs:
  - job_name: bugrelay-backend
    static_configs:
      - targets: [localhost]
        labels:
          job: bugrelay-backend
          service: backend
          __path__: /var/log/bugrelay/*.log
    
    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
            request_id: request_id
            user_id: user_id
            method: method
            path: path
            status_code: status_code
            duration_ms: duration_ms
            category: category
            type: type
      
      # Parse timestamp
      - timestamp:
          source: timestamp
          format: RFC3339
      
      # Add labels
      - labels:
          level:
          category:
          type:
          method:
          status_code:
      
      # Filter sensitive data
      - replace:
          expression: '(password|token|secret)":"[^"]*"'
          replace: '$1":"***"'
      
      # Add metrics
      - metrics:
          log_lines_total:
            type: Counter
            description: "Total number of log lines"
            config:
              action: inc
          
          log_errors_total:
            type: Counter
            description: "Total number of error logs"
            config:
              action: inc
            match_stage: |
              level == "error"
```

### Docker Logging Configuration

#### Docker Compose Logging
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: bugrelay/backend:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"
    labels:
      - "service=backend"
      - "environment=production"
```

#### Syslog Driver
```yaml
services:
  backend:
    image: bugrelay/backend:latest
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://localhost:514"
        tag: "bugrelay-backend"
```

#### Fluentd Driver
```yaml
services:
  backend:
    image: bugrelay/backend:latest
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "bugrelay.backend"
```

## Log Analysis

### Common Log Queries

#### Error Analysis
```logql
# All errors in the last hour
{service="backend"} |= "level=error" | json

# Errors by endpoint
{service="backend"} |= "level=error" | json | path="/api/v1/bugs"

# Error rate by status code
sum by (status_code) (
  rate({service="backend"} |= "level=error" | json [5m])
)

# Top error messages
topk(10,
  sum by (message) (
    count_over_time({service="backend"} |= "level=error" | json [1h])
  )
)
```

#### Performance Analysis
```logql
# Slow requests (>1 second)
{service="backend"} | json | duration_ms > 1000

# Average response time by endpoint
avg by (path) (
  avg_over_time({service="backend"} | json | unwrap duration_ms [5m])
)

# 95th percentile response time
quantile_over_time(0.95,
  {service="backend"} | json | unwrap duration_ms [5m]
)

# Request rate by method
sum by (method) (
  rate({service="backend"} | json [5m])
)
```

#### Security Analysis
```logql
# Failed login attempts
{service="backend"} |= "category=security" |= "type=authentication" | json | success=false

# Rate limit violations
{service="backend"} |= "status_code=429" | json

# Suspicious activity (multiple failed attempts from same IP)
sum by (ip_address) (
  count_over_time({service="backend"} |= "level=warn" | json [5m])
) > 10

# Admin actions
{service="backend"} |= "category=audit" | json | admin_action=true
```

#### Business Intelligence
```logql
# Bug creation rate
sum(
  rate({service="backend"} |= "category=business" |= "type=bug_creation" | json [5m])
)

# User registration rate
sum(
  rate({service="backend"} |= "action=user_registration" | json [5m])
)

# Most active users
topk(10,
  sum by (user_id) (
    count_over_time({service="backend"} | json | user_id != "" [1h])
  )
)

# Popular endpoints
topk(10,
  sum by (path) (
    rate({service="backend"} | json [5m])
  )
)
```

### Log Aggregation Queries

#### Error Patterns
```logql
# Group errors by type
sum by (error_type) (
  count_over_time({service="backend"} |= "level=error" | json [1h])
)

# Error correlation with response time
{service="backend"} | json | duration_ms > 1000 and level="error"

# Database error patterns
{service="backend"} |= "category=database" |= "level=error" | json
```

#### Performance Patterns
```logql
# Response time distribution
histogram_quantile(0.50,
  sum(rate({service="backend"} | json | unwrap duration_ms [5m])) by (le)
)

# Throughput by time of day
sum by (hour) (
  count_over_time({service="backend"} | json [1h])
)

# Cache hit rate
sum(rate({service="backend"} |= "category=cache" | json | hit=true [5m])) /
sum(rate({service="backend"} |= "category=cache" | json [5m]))
```

## Log Retention and Archival

### Retention Policies

#### Development Environment
```yaml
# Short retention for development
retention_policies:
  application_logs: 7d
  system_logs: 3d
  debug_logs: 1d
  error_logs: 14d
```

#### Production Environment
```yaml
# Extended retention for production
retention_policies:
  application_logs: 30d
  system_logs: 90d
  audit_logs: 1y
  security_logs: 1y
  error_logs: 90d
  performance_logs: 30d
```

### Archival Configuration

#### S3 Archival
```yaml
# Loki configuration for S3 archival
storage_config:
  aws:
    s3: s3://bugrelay-logs-archive
    region: us-east-1
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}

table_manager:
  retention_deletes_enabled: true
  retention_period: 30d
  
  # Archive to S3 after 7 days
  chunk_tables_provisioning:
    inactive_read_throughput: 0
    inactive_write_throughput: 0
    provisioned_read_throughput: 1000
    provisioned_write_throughput: 3000
```

#### Local Archival
```bash
#!/bin/bash
# archive-logs.sh

LOG_DIR="/var/log/bugrelay"
ARCHIVE_DIR="/opt/archives/logs"
RETENTION_DAYS=30

# Create archive directory
mkdir -p $ARCHIVE_DIR

# Archive logs older than retention period
find $LOG_DIR -name "*.log" -mtime +$RETENTION_DAYS -exec gzip {} \;
find $LOG_DIR -name "*.log.gz" -mtime +$RETENTION_DAYS -exec mv {} $ARCHIVE_DIR/ \;

# Clean up old archives (keep 1 year)
find $ARCHIVE_DIR -name "*.log.gz" -mtime +365 -delete

echo "Log archival completed: $(date)"
```

## Log Monitoring and Alerting

### Log-Based Alerts

#### Error Rate Alerts
```yaml
# Prometheus alert rules for logs
groups:
  - name: log_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(loki_log_lines_total{level="error"}[5m])) /
          sum(rate(loki_log_lines_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in logs"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: DatabaseErrors
        expr: |
          sum(rate(loki_log_lines_total{category="database",level="error"}[5m])) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database errors detected"
          description: "{{ $value }} database errors per second"
```

#### Security Alerts
```yaml
- alert: TooManyFailedLogins
  expr: |
    sum(increase(loki_log_lines_total{category="security",type="authentication",success="false"}[5m])) > 10
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Too many failed login attempts"
    description: "{{ $value }} failed login attempts in 5 minutes"

- alert: SuspiciousActivity
  expr: |
    sum(increase(loki_log_lines_total{level="warn",category="security"}[5m])) > 5
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Suspicious security activity"
    description: "{{ $value }} security warnings in 5 minutes"
```

### Log Dashboards

#### Error Dashboard
```json
{
  "dashboard": {
    "title": "Error Analysis Dashboard",
    "panels": [
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(loki_log_lines_total{level=\"error\"}[5m]))",
            "legendFormat": "Errors/sec"
          }
        ]
      },
      {
        "title": "Top Error Messages",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by (message) (count_over_time({service=\"backend\"} |= \"level=error\" | json [1h])))",
            "legendFormat": "{{message}}"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Common Logging Issues

#### 1. Logs Not Appearing in Loki
```bash
# Check Promtail status
docker logs promtail_container

# Check Promtail configuration
curl http://localhost:9080/config

# Check file permissions
ls -la /var/log/bugrelay/

# Test log parsing
echo '{"level":"info","message":"test"}' >> /var/log/bugrelay/app.log
```

#### 2. High Log Volume
```bash
# Check log file sizes
du -sh /var/log/bugrelay/*

# Check log rotation
ls -la /var/log/bugrelay/*.gz

# Monitor log ingestion rate
curl http://localhost:3100/metrics | grep loki_ingester_samples_received_total
```

#### 3. Missing Log Fields
```yaml
# Debug pipeline stages
pipeline_stages:
  - json:
      expressions:
        timestamp: timestamp
        level: level
        message: message
  
  # Add debug output
  - output:
      source: message
  
  # Check extracted fields
  - template:
      source: debug_info
      template: 'Level: {{ .level }}, Message: {{ .message }}'
```

#### 4. Performance Issues
```bash
# Check Loki memory usage
docker stats loki_container

# Check query performance
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="backend"}' \
  --data-urlencode 'time=2023-12-01T10:30:00Z'

# Optimize queries with labels
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="backend",level="error"}'
```

### Log Analysis Troubleshooting

#### Query Optimization
```logql
# Inefficient query (scans all logs)
{service="backend"} |= "error"

# Optimized query (uses labels)
{service="backend",level="error"}

# Further optimization (time range)
{service="backend",level="error"}[1h]

# Use regex efficiently
{service="backend"} |~ "error|warning"

# Avoid expensive operations
{service="backend"} | json | duration_ms > 1000  # Better
{service="backend"} |= "duration_ms" | json | duration_ms > 1000  # Worse
```

#### Memory Management
```yaml
# Loki configuration for memory optimization
limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 4
  ingestion_burst_size_mb: 6
  max_line_size: 256000
  max_concurrent_tail: 10

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100
```

## Best Practices

### Logging Best Practices

1. **Use Structured Logging**: Always use JSON format in production
2. **Include Context**: Add request IDs, user IDs, and correlation data
3. **Appropriate Log Levels**: Use correct log levels for different events
4. **Avoid Sensitive Data**: Never log passwords, tokens, or PII
5. **Log Rotation**: Implement proper log rotation and archival
6. **Performance Impact**: Monitor logging performance impact
7. **Consistent Format**: Use consistent field names and formats

### Query Best Practices

1. **Use Labels**: Leverage labels for efficient filtering
2. **Time Ranges**: Always specify appropriate time ranges
3. **Limit Results**: Use `limit` to prevent large result sets
4. **Index Usage**: Structure queries to use indexes effectively
5. **Aggregation**: Use aggregation functions for summaries
6. **Caching**: Leverage query result caching

### Security Best Practices

1. **Access Control**: Implement proper access controls for logs
2. **Audit Logging**: Log all security-relevant events
3. **Data Retention**: Follow compliance requirements for retention
4. **Encryption**: Encrypt logs in transit and at rest
5. **Monitoring**: Monitor log access and modifications

## Integration Examples

### Application Integration

#### Go Logging Example
```go
package main

import (
    "github.com/sirupsen/logrus"
    "github.com/gin-gonic/gin"
)

func setupLogging() {
    logrus.SetFormatter(&logrus.JSONFormatter{})
    logrus.SetLevel(logrus.InfoLevel)
}

func logMiddleware() gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        logrus.WithFields(logrus.Fields{
            "timestamp":   param.TimeStamp.Format("2006-01-02T15:04:05.000Z"),
            "method":      param.Method,
            "path":        param.Path,
            "status_code": param.StatusCode,
            "duration_ms": param.Latency.Milliseconds(),
            "ip_address":  param.ClientIP,
            "user_agent":  param.Request.UserAgent(),
            "request_id":  param.Request.Header.Get("X-Request-ID"),
        }).Info("HTTP request completed")
        
        return ""
    })
}
```

#### Error Logging Example
```go
func handleError(c *gin.Context, err error, message string) {
    requestID := c.GetHeader("X-Request-ID")
    userID := c.GetString("user_id")
    
    logrus.WithFields(logrus.Fields{
        "request_id": requestID,
        "user_id":    userID,
        "method":     c.Request.Method,
        "path":       c.Request.URL.Path,
        "error": map[string]interface{}{
            "type":    fmt.Sprintf("%T", err),
            "message": err.Error(),
        },
    }).Error(message)
}
```

### Monitoring Integration

#### Grafana Dashboard Query
```json
{
  "targets": [
    {
      "expr": "sum by (level) (rate(loki_log_lines_total[5m]))",
      "legendFormat": "{{level}}"
    }
  ]
}
```

#### AlertManager Integration
```yaml
receivers:
  - name: 'log-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#logs'
        title: 'Log Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          Service: {{ .Labels.service }}
          Level: {{ .Labels.level }}
          Message: {{ .Annotations.summary }}
          {{ end }}
```

## Additional Resources

- [Loki Documentation](https://grafana.com/docs/loki/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Structured Logging Best Practices](https://www.honeycomb.io/blog/structured-logging-and-your-team/)
- [Monitoring Guide](monitoring)
- [Configuration Guide](configuration)