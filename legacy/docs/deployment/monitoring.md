# Monitoring and Logging Guide

This guide covers the comprehensive monitoring and logging setup for BugRelay, including metrics collection, log aggregation, alerting, and troubleshooting.

## Overview

BugRelay uses a modern observability stack based on:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation and storage
- **Promtail**: Log collection and forwarding
- **AlertManager**: Alert routing and notification
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   System Logs   │    │  Container Logs │
│     Metrics     │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────────────────────────────┐
│   Prometheus    │    │              Promtail                   │
│                 │    │                                         │
└─────────┬───────┘    └─────────┬───────────────────────────────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│    Grafana      │    │      Loki       │
│   (Dashboards)  │    │   (Log Store)   │
└─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│  AlertManager   │
│   (Alerting)    │
└─────────────────┘
```

## Quick Start

### Development Environment

```bash
# Start monitoring stack
cd monitoring
docker-compose up -d

# Access services
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

### Production Environment

```bash
# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps
```

## Metrics Collection

### Application Metrics

BugRelay exposes Prometheus metrics at `/metrics` endpoint:

#### HTTP Metrics
- `http_requests_total` - Total HTTP requests by method, path, and status
- `http_request_duration_seconds` - HTTP request duration histogram
- `http_request_size_bytes` - HTTP request size histogram
- `http_response_size_bytes` - HTTP response size histogram

#### Business Metrics
- `bugrelay_bugs_total` - Total number of bug reports
- `bugrelay_users_total` - Total number of registered users
- `bugrelay_companies_total` - Total number of companies
- `bugrelay_active_users` - Currently active users
- `bugrelay_bug_votes_total` - Total bug votes

#### Database Metrics
- `bugrelay_db_connections_active` - Active database connections
- `bugrelay_db_connections_idle` - Idle database connections
- `bugrelay_db_query_duration_seconds` - Database query duration
- `bugrelay_db_queries_total` - Total database queries

#### Cache Metrics
- `bugrelay_cache_hits_total` - Cache hits
- `bugrelay_cache_misses_total` - Cache misses
- `bugrelay_cache_operations_duration_seconds` - Cache operation duration

### System Metrics

#### Node Exporter Metrics
- `node_cpu_seconds_total` - CPU usage by mode
- `node_memory_MemTotal_bytes` - Total system memory
- `node_memory_MemAvailable_bytes` - Available system memory
- `node_filesystem_size_bytes` - Filesystem size
- `node_filesystem_avail_bytes` - Available filesystem space
- `node_network_receive_bytes_total` - Network bytes received
- `node_network_transmit_bytes_total` - Network bytes transmitted

#### Container Metrics (cAdvisor)
- `container_cpu_usage_seconds_total` - Container CPU usage
- `container_memory_usage_bytes` - Container memory usage
- `container_network_receive_bytes_total` - Container network received
- `container_network_transmit_bytes_total` - Container network transmitted

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'bugrelay-backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Log Management

### Log Structure

BugRelay uses structured JSON logging for better parsing and analysis:

```json
{
  "timestamp": "2023-12-01T10:30:00Z",
  "level": "info",
  "service": "backend",
  "request_id": "req_123456789",
  "user_id": "user_987654321",
  "method": "POST",
  "path": "/api/v1/bugs",
  "status_code": 201,
  "duration_ms": 45,
  "message": "Bug report created successfully",
  "metadata": {
    "bug_id": "bug_123456789",
    "application_id": "app_987654321"
  }
}
```

### Log Levels

- **DEBUG**: Detailed debugging information
- **INFO**: General information messages
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages for failures
- **FATAL**: Critical errors that cause application shutdown

### Log Categories

#### Application Logs
- **Request Logs**: HTTP request/response logging
- **Business Logic**: Bug creation, user registration, etc.
- **Database Operations**: Query execution and performance
- **Cache Operations**: Redis operations and performance
- **Authentication**: Login attempts, token validation

#### Security Logs
- **Audit Logs**: Security-relevant events
- **Failed Logins**: Authentication failures
- **Rate Limiting**: Rate limit violations
- **Suspicious Activity**: Potential security threats

#### System Logs
- **Application Startup/Shutdown**: Service lifecycle
- **Health Checks**: Service health status
- **Configuration Changes**: Runtime configuration updates
- **Error Recovery**: Error handling and recovery

### Loki Configuration

```yaml
# loki/config.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-25
      store: tsdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093
```

### Promtail Configuration

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
          __path__: /var/log/bugrelay/*.log
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
            request_id: request_id
      - timestamp:
          source: timestamp
          format: RFC3339
      - labels:
          level:
          service:
```

## Dashboards

### Main Dashboard Panels

#### 1. Overview Panel
- **Request Rate**: Requests per second
- **Error Rate**: Errors per second
- **Response Time**: 95th percentile response time
- **Active Users**: Currently active users

#### 2. Performance Panel
- **Response Time Distribution**: 50th, 95th, 99th percentiles
- **Throughput**: Requests by endpoint
- **Error Breakdown**: Errors by status code
- **Database Performance**: Query duration and connection pool

#### 3. System Resources Panel
- **CPU Usage**: System and container CPU usage
- **Memory Usage**: System and container memory usage
- **Disk Usage**: Filesystem usage and I/O
- **Network**: Network traffic and connections

#### 4. Business Metrics Panel
- **Bug Reports**: Bug creation rate and total count
- **User Activity**: Registration rate and active users
- **Company Activity**: Company registrations and verifications
- **Engagement**: Votes, comments, and interactions

### Custom Dashboard Creation

```json
{
  "dashboard": {
    "title": "BugRelay Custom Dashboard",
    "panels": [
      {
        "title": "Bug Creation Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(bugrelay_bugs_total[5m])",
            "legendFormat": "Bugs/sec"
          }
        ]
      }
    ]
  }
}
```

## Alerting

### Alert Rules

#### Critical Alerts
- **Application Down**: Service not responding
- **High Error Rate**: >10% error rate for 5 minutes
- **Database Connection Failure**: Database unreachable
- **Disk Space Critical**: <10% disk space remaining
- **Memory Critical**: >95% memory usage

#### Warning Alerts
- **High Response Time**: >2 seconds 95th percentile
- **High CPU Usage**: >80% CPU usage for 5 minutes
- **High Memory Usage**: >90% memory usage for 5 minutes
- **Redis Connection Failure**: Cache unavailable
- **Too Many Failed Logins**: >10 failed logins in 5 minutes

### Alert Configuration

```yaml
# alert_rules.yml
groups:
  - name: bugrelay_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: ApplicationDown
        expr: up{job="bugrelay-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "BugRelay backend is down"
          description: "The BugRelay backend application is not responding"
```

### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@bugrelay.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@bugrelay.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'CRITICAL Alert'
```

### Notification Channels

#### Email Notifications
```yaml
email_configs:
  - to: 'team@bugrelay.com'
    subject: 'Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Severity: {{ .Labels.severity }}
      Time: {{ .StartsAt }}
      {{ end }}
```

#### Slack Notifications
```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'
    title: 'BugRelay Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    fields:
      - title: 'Severity'
        value: '{{ .Labels.severity }}'
        short: true
      - title: 'Instance'
        value: '{{ .Labels.instance }}'
        short: true
```

#### PagerDuty Integration
```yaml
pagerduty_configs:
  - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
    description: '{{ .GroupLabels.alertname }}'
    details:
      severity: '{{ .Labels.severity }}'
      summary: '{{ .Annotations.summary }}'
```

## Health Checks

### Application Health Endpoints

#### Basic Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:30:00Z",
  "version": "1.0.0",
  "uptime": "2h30m15s"
}
```

#### Detailed Health Check
```
GET /health/detailed
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:30:00Z",
  "version": "1.0.0",
  "uptime": "2h30m15s",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 5,
      "connections": {
        "active": 3,
        "idle": 7,
        "max": 25
      }
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 2,
      "memory_usage": "45MB",
      "connected_clients": 12
    },
    "external_services": {
      "oauth_google": {
        "status": "healthy",
        "last_check": "2023-12-01T10:29:00Z"
      },
      "recaptcha": {
        "status": "healthy",
        "last_check": "2023-12-01T10:29:00Z"
      }
    }
  }
}
```

### Database Health Monitoring

```sql
-- Check database connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('bugrelay_production'));
```

### Redis Health Monitoring

```bash
# Check Redis status
redis-cli ping

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients

# Check keyspace
redis-cli info keyspace
```

## Log Analysis

### Common Log Queries

#### Error Analysis
```logql
# Find all errors in the last hour
{service="backend"} |= "level=error" | json

# Find errors by endpoint
{service="backend"} |= "level=error" | json | path="/api/v1/bugs"

# Count errors by status code
sum by (status_code) (count_over_time({service="backend"} |= "level=error" | json [1h]))
```

#### Performance Analysis
```logql
# Slow requests (>1 second)
{service="backend"} | json | duration_ms > 1000

# Average response time by endpoint
avg by (path) (avg_over_time({service="backend"} | json | unwrap duration_ms [5m]))

# Request rate by method
sum by (method) (rate({service="backend"} | json [5m]))
```

#### Security Analysis
```logql
# Failed login attempts
{service="backend"} |= "path=/api/v1/auth/login" |= "status_code=401"

# Rate limit violations
{service="backend"} |= "status_code=429"

# Suspicious activity patterns
{service="backend"} |= "level=warn" |= "security"
```

### Log Retention

#### Development Environment
- **Application Logs**: 7 days
- **System Logs**: 3 days
- **Debug Logs**: 1 day

#### Production Environment
- **Application Logs**: 30 days
- **System Logs**: 90 days
- **Audit Logs**: 1 year
- **Security Logs**: 1 year

## Performance Monitoring

### Key Performance Indicators (KPIs)

#### Application Performance
- **Response Time**: 95th percentile < 500ms
- **Throughput**: Requests per second
- **Error Rate**: < 1% of total requests
- **Availability**: > 99.9% uptime

#### System Performance
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Disk Usage**: < 80% capacity
- **Network Latency**: < 100ms

#### Business Metrics
- **Bug Report Creation Rate**: Bugs per hour
- **User Engagement**: Active users per day
- **API Usage**: Requests per endpoint
- **Feature Adoption**: Usage of new features

### Performance Baselines

```yaml
# Performance thresholds
thresholds:
  response_time:
    p50: 100ms
    p95: 500ms
    p99: 1000ms
  
  error_rate:
    warning: 1%
    critical: 5%
  
  throughput:
    minimum: 100 rps
    target: 500 rps
    maximum: 1000 rps
  
  resource_usage:
    cpu:
      warning: 70%
      critical: 90%
    memory:
      warning: 80%
      critical: 95%
    disk:
      warning: 80%
      critical: 95%
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage
```bash
# Check memory usage
docker stats

# Check Go heap profile
curl http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# Check for memory leaks
curl http://localhost:8080/debug/pprof/allocs > allocs.prof
go tool pprof allocs.prof
```

#### 2. High CPU Usage
```bash
# Check CPU profile
curl http://localhost:8080/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof

# Check goroutine count
curl http://localhost:8080/debug/pprof/goroutine > goroutine.prof
go tool pprof goroutine.prof
```

#### 3. Database Performance Issues
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;
```

#### 4. Log Analysis for Errors
```logql
# Find error patterns
{service="backend"} |= "level=error" | json | line_format "{{.timestamp}} {{.message}}"

# Group errors by type
sum by (error_type) (count_over_time({service="backend"} |= "level=error" | json [1h]))

# Find correlation between errors and requests
{service="backend"} | json | request_id="req_123456789"
```

### Debugging Workflows

#### 1. Performance Investigation
1. Check dashboard for anomalies
2. Identify affected endpoints
3. Analyze logs for error patterns
4. Check system resources
5. Profile application if needed
6. Implement fixes and monitor

#### 2. Error Investigation
1. Check error rate dashboard
2. Filter logs by error level
3. Identify error patterns
4. Check related system metrics
5. Trace request flow
6. Fix root cause

#### 3. Capacity Planning
1. Monitor resource trends
2. Analyze growth patterns
3. Identify bottlenecks
4. Plan scaling strategy
5. Test scaling scenarios
6. Implement scaling solution

## Security Monitoring

### Security Metrics

- **Failed Authentication Attempts**: Login failures per minute
- **Rate Limit Violations**: Rate limit hits per endpoint
- **Suspicious Activity**: Unusual request patterns
- **Access Patterns**: Geographic and temporal access analysis

### Security Alerts

```yaml
# Security alert rules
- alert: TooManyFailedLogins
  expr: increase(http_requests_total{path="/api/v1/auth/login",status="401"}[5m]) > 10
  labels:
    severity: warning
  annotations:
    summary: "Too many failed login attempts"

- alert: SuspiciousActivity
  expr: increase(http_requests_total{status="403"}[5m]) > 20
  labels:
    severity: warning
  annotations:
    summary: "Suspicious activity detected"
```

### Audit Logging

```json
{
  "timestamp": "2023-12-01T10:30:00Z",
  "level": "info",
  "audit": true,
  "action": "user_login",
  "resource": "user",
  "user_id": "user_123456789",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "metadata": {
    "login_method": "oauth_google",
    "session_id": "sess_987654321"
  }
}
```

## Best Practices

### Monitoring Best Practices

1. **Monitor What Matters**: Focus on user-impacting metrics
2. **Set Meaningful Alerts**: Avoid alert fatigue
3. **Use SLIs and SLOs**: Define service level objectives
4. **Monitor Dependencies**: Track external service health
5. **Regular Review**: Review and update monitoring setup

### Logging Best Practices

1. **Structured Logging**: Use consistent JSON format
2. **Appropriate Log Levels**: Use correct log levels
3. **Include Context**: Add request IDs and user context
4. **Avoid Sensitive Data**: Don't log passwords or tokens
5. **Log Rotation**: Implement proper log rotation

### Dashboard Best Practices

1. **Clear Visualization**: Use appropriate chart types
2. **Logical Grouping**: Group related metrics
3. **Consistent Time Ranges**: Use consistent time windows
4. **Actionable Information**: Include context for decisions
5. **Regular Updates**: Keep dashboards current

## Maintenance

### Regular Tasks

#### Daily
- Check dashboard for anomalies
- Review critical alerts
- Monitor resource usage trends
- Check backup status

#### Weekly
- Review alert rules effectiveness
- Analyze performance trends
- Update dashboard configurations
- Clean up old logs

#### Monthly
- Review monitoring strategy
- Update alert thresholds
- Capacity planning review
- Security audit review

### Monitoring Stack Updates

```bash
# Update monitoring images
docker-compose pull prometheus grafana loki promtail alertmanager

# Backup configurations
tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz monitoring/

# Apply updates
docker-compose up -d

# Verify services
docker-compose ps
```

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Configuration Guide](configuration)
- [Troubleshooting Guide](../guides/troubleshooting)
