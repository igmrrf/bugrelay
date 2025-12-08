# Design Document

## Overview

This design provides a comprehensive deployment automation system for BugRelay using GitHub Actions for CI/CD and SSH-based deployment to a Digital Ocean Droplet at bugrelay.com. The system automates building, testing, and deploying four main components: backend API, frontend application, monitoring stack, and documentation site. The design emphasizes zero-downtime deployments, automated health checks, rollback capabilities, and comprehensive deployment notifications.

## Architecture

### Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Backend    │  │   Frontend   │  │     Docs     │      │
│  │  Workflow    │  │   Workflow   │  │   Workflow   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     SSH Deployment                           │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Digital Ocean Droplet (bugrelay.com)           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Nginx (Port 80/443)                │  │
│  │              SSL Termination & Routing                │  │
│  └───────┬──────────────────────────────────┬───────────┘  │
│          │                                   │              │
│  ┌───────▼────────┐                 ┌───────▼────────┐     │
│  │   Frontend     │                 │    Backend     │     │
│  │  (Next.js)     │                 │   (Go API)     │     │
│  │  Port 3000     │                 │   Port 8080    │     │
│  └────────────────┘                 └───────┬────────┘     │
│                                              │              │
│  ┌──────────────────────────────────────────┼────────┐     │
│  │         Infrastructure Layer             │        │     │
│  │  ┌──────────────┐    ┌──────────────┐   │        │     │
│  │  │  PostgreSQL  │    │    Redis     │◄──┘        │     │
│  │  │  Port 5432   │    │  Port 6379   │            │     │
│  │  └──────────────┘    └──────────────┘            │     │
│  └───────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Monitoring Stack                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Grafana  │  │Prometheus│  │   Loki   │           │  │
│  │  │ Port 3001│  │Port 9090 │  │Port 3100 │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Documentation Site (VitePress)                │  │
│  │              docs.bugrelay.com                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Flow

```
┌──────────────┐
│  Git Push    │
│  to main     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│     GitHub Actions Triggered             │
│  - Backend Workflow                      │
│  - Frontend Workflow                     │
│  - Docs Workflow                         │
│  - Monitoring Workflow (on config change)│
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│     Build & Test Phase                   │
│  - Run tests                             │
│  - Build artifacts                       │
│  - Security scanning                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│     Deployment Phase                     │
│  - SSH to Digital Ocean                  │
│  - Backup current version                │
│  - Deploy new version                    │
│  - Run health checks                     │
└──────┬───────────────────────────────────┘
       │
       ├─── Success ──────┐
       │                  │
       │                  ▼
       │         ┌────────────────┐
       │         │  Send Success  │
       │         │  Notification  │
       │         └────────────────┘
       │
       └─── Failure ──────┐
                          │
                          ▼
                 ┌────────────────┐
                 │   Rollback     │
                 │   to Previous  │
                 │   Version      │
                 └────────┬───────┘
                          │
                          ▼
                 ┌────────────────┐
                 │  Send Failure  │
                 │  Notification  │
                 └────────────────┘
```

## Components and Interfaces

### 1. GitHub Actions Workflows

#### Backend Deployment Workflow
**File**: `.github/workflows/backend-deploy.yml`

**Triggers**:
- Push to `main` branch (paths: `backend/**`)
- Manual workflow dispatch with branch/tag selection

**Jobs**:
1. **test**: Run Go tests, linting, security scanning
2. **build**: Build production binary
3. **deploy**: SSH deploy to Digital Ocean
4. **health-check**: Verify deployment health
5. **rollback**: Automatic rollback on failure
6. **notify**: Send deployment notifications

**Secrets Required**:
- `DO_SSH_PRIVATE_KEY`: SSH private key for Digital Ocean
- `DO_HOST`: Digital Ocean droplet IP/hostname
- `DO_USER`: SSH username
- `SLACK_WEBHOOK_URL`: Slack notification webhook
- `DEPLOYMENT_ENV_FILE`: Production environment variables

#### Frontend Deployment Workflow
**File**: `.github/workflows/frontend-deploy.yml`

**Triggers**:
- Push to `main` branch (paths: `frontend/**`)
- Manual workflow dispatch

**Jobs**:
1. **lint-and-typecheck**: ESLint and TypeScript checks
2. **test**: Run Jest tests
3. **build**: Build optimized production bundle
4. **deploy**: SSH deploy to Digital Ocean
5. **health-check**: Verify frontend accessibility
6. **rollback**: Automatic rollback on failure
7. **notify**: Send deployment notifications

**Secrets Required**:
- Same as backend + `NEXT_PUBLIC_API_URL`

#### Monitoring Deployment Workflow
**File**: `.github/workflows/monitoring-deploy.yml`

**Triggers**:
- Push to `main` branch (paths: `monitoring/**`)
- Manual workflow dispatch

**Jobs**:
1. **validate-config**: Validate Prometheus, Grafana, Loki configs
2. **deploy**: Deploy monitoring stack updates
3. **health-check**: Verify all monitoring services
4. **notify**: Send deployment notifications

#### Documentation Deployment Workflow
**File**: `.github/workflows/docs-deploy.yml`

**Triggers**:
- Push to `main` branch (paths: `docs/**`)
- Manual workflow dispatch

**Jobs**:
1. **build**: Build VitePress documentation site
2. **deploy**: Deploy to Digital Ocean
3. **verify**: Check documentation site accessibility
4. **notify**: Send deployment notifications

### 2. Deployment Scripts

#### Main Deployment Script
**File**: `scripts/deploy.sh`

```bash
#!/bin/bash
# Main deployment orchestrator
# Usage: ./deploy.sh [backend|frontend|monitoring|docs] [version]

COMPONENT=$1
VERSION=$2
BACKUP_DIR="/opt/bugrelay/backups"
DEPLOY_DIR="/opt/bugrelay"

# Functions:
# - backup_current_version()
# - deploy_component()
# - run_health_checks()
# - rollback_on_failure()
# - send_notification()
```

#### Health Check Script
**File**: `scripts/health-check.sh`

```bash
#!/bin/bash
# Comprehensive health check script
# Checks: API health, frontend accessibility, database, Redis, monitoring

# Functions:
# - check_backend_health()
# - check_frontend_health()
# - check_database_connection()
# - check_redis_connection()
# - check_monitoring_stack()
```

#### Rollback Script
**File**: `scripts/rollback.sh`

```bash
#!/bin/bash
# Rollback to previous version
# Usage: ./rollback.sh [backend|frontend|monitoring|docs]

# Functions:
# - identify_previous_version()
# - restore_from_backup()
# - restart_services()
# - verify_rollback()
```

### 3. Deployment Configuration

#### Deployment Environment File
**File**: `.deployment.env` (stored in GitHub Secrets)

```bash
# Digital Ocean Configuration
DO_HOST=bugrelay.com
DO_USER=deploy
DEPLOY_PATH=/opt/bugrelay

# Application Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
DOCS_PORT=8081

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=<encrypted>

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<encrypted>

# Security
JWT_SECRET=<encrypted>
LOGS_API_KEY=<encrypted>

# Monitoring
GRAFANA_ADMIN_PASSWORD=<encrypted>
SLACK_WEBHOOK_URL=<encrypted>

# Deployment Settings
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
ROLLBACK_ON_FAILURE=true
KEEP_BACKUPS=5
```

### 4. Zero-Downtime Deployment Strategy

#### Blue-Green Deployment for Backend

```bash
# Current: backend-blue (active)
# Deploy: backend-green (new version)

1. Start backend-green on port 8081
2. Run health checks on backend-green
3. If healthy:
   - Update Nginx to route to backend-green (port 8081)
   - Wait for in-flight requests to complete
   - Stop backend-blue
   - Rename backend-green to backend-blue
4. If unhealthy:
   - Stop backend-green
   - Keep backend-blue running
   - Trigger rollback notification
```

#### Rolling Update for Frontend

```bash
# Frontend uses Next.js standalone mode

1. Build new frontend version
2. Deploy to /opt/bugrelay/frontend-new
3. Run health check on new version
4. If healthy:
   - Update Nginx to point to new directory
   - Reload Nginx (graceful)
   - Remove old frontend directory
5. If unhealthy:
   - Keep old version active
   - Remove new version
   - Trigger rollback notification
```

## Data Models

### Deployment Metadata

```json
{
  "deployment_id": "uuid",
  "component": "backend|frontend|monitoring|docs",
  "version": "git-commit-hash",
  "timestamp": "ISO-8601",
  "deployer": "github-username",
  "status": "pending|success|failed|rolled_back",
  "duration_seconds": 120,
  "health_checks": {
    "backend": "pass|fail",
    "frontend": "pass|fail",
    "database": "pass|fail",
    "redis": "pass|fail",
    "monitoring": "pass|fail"
  },
  "rollback_version": "previous-commit-hash",
  "notification_sent": true
}
```

### Health Check Response

```json
{
  "component": "backend",
  "status": "healthy|unhealthy",
  "checks": [
    {
      "name": "api_health_endpoint",
      "status": "pass",
      "response_time_ms": 45,
      "details": "OK"
    },
    {
      "name": "database_connection",
      "status": "pass",
      "response_time_ms": 12,
      "details": "Connected to PostgreSQL"
    },
    {
      "name": "redis_connection",
      "status": "pass",
      "response_time_ms": 8,
      "details": "Redis responding"
    }
  ],
  "timestamp": "ISO-8601"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Deployment atomicity
*For any* deployment operation, either all deployment steps complete successfully and the new version becomes active, or all steps are rolled back and the previous version remains active.
**Validates: Requirements 2.5, 3.5, 4.5, 5.4**

### Property 2: Health check verification
*For any* successful deployment, all configured health checks must pass before the deployment is marked as complete.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 3: Rollback consistency
*For any* failed deployment that triggers a rollback, the system state after rollback must be identical to the state before the deployment attempt.
**Validates: Requirements 2.5, 3.5, 4.5, 10.5**

### Property 4: Notification completeness
*For any* deployment operation (success, failure, or rollback), a notification must be sent containing all required metadata.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 5: SSH authentication security
*For any* SSH deployment operation, private keys must never appear in logs, artifacts, or error messages.
**Validates: Requirements 7.2, 7.3**

### Property 6: Zero-downtime guarantee
*For any* deployment to a running service, the service must remain accessible and responsive throughout the deployment process.
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 7: Configuration validation
*For any* deployment that includes configuration changes, all configuration files must be validated before being applied to running services.
**Validates: Requirements 4.1, 4.2**

### Property 8: Backup preservation
*For any* deployment operation, a backup of the current version must be created and verified before proceeding with the deployment.
**Validates: Requirements 1.5, 2.3**

## Error Handling

### Deployment Errors

| Error Type | Detection | Response | Notification |
|------------|-----------|----------|--------------|
| Build Failure | CI job fails | Stop deployment, notify | Immediate Slack alert |
| Test Failure | Test job fails | Stop deployment, notify | Immediate Slack alert |
| SSH Connection Failure | SSH command timeout | Retry 3 times, then fail | Alert after retries exhausted |
| Health Check Failure | Health endpoint non-200 | Automatic rollback | Rollback notification |
| Database Migration Failure | Migration script error | Rollback migration, rollback deployment | Critical alert |
| Nginx Configuration Error | nginx -t fails | Keep old config, rollback | Critical alert |
| Disk Space Exhaustion | Pre-deployment check | Stop deployment, alert | Critical alert |
| Service Start Failure | systemd/docker status | Rollback to previous version | Critical alert |

### Rollback Scenarios

1. **Health Check Failure**: Automatic rollback within 60 seconds
2. **Service Crash**: Automatic rollback on repeated crashes (3 within 5 minutes)
3. **Manual Rollback**: Triggered via GitHub Actions workflow dispatch
4. **Partial Deployment Failure**: Rollback all components to maintain consistency

### Error Recovery

```bash
# Deployment failure recovery process
1. Detect failure (health check, service status, etc.)
2. Log failure details to deployment log
3. Stop new version services
4. Restore previous version from backup
5. Restart services with previous version
6. Verify rollback with health checks
7. Send failure notification with details
8. Create incident report in monitoring system
```

## Testing Strategy

### Unit Testing

**Deployment Scripts**:
- Test backup creation and restoration
- Test health check logic
- Test rollback procedures
- Test notification formatting
- Test SSH connection handling

**GitHub Actions Workflows**:
- Test workflow syntax validation
- Test job dependencies
- Test conditional logic
- Test secret handling

### Integration Testing

**End-to-End Deployment Tests**:
- Deploy to staging environment
- Verify all services start correctly
- Run health checks
- Test rollback mechanism
- Verify notifications sent

**SSH Deployment Tests**:
- Test SSH key authentication
- Test file transfer
- Test remote command execution
- Test connection error handling

### Property-Based Testing

**Testing Framework**: Use `bats` (Bash Automated Testing System) for shell scripts and GitHub Actions workflow testing

**Property Tests**:

1. **Deployment Atomicity Property Test**
   - Generate random deployment scenarios (success/failure at different stages)
   - Verify system state is either fully deployed or fully rolled back
   - No partial deployments should exist

2. **Health Check Property Test**
   - Generate random service states (healthy/unhealthy combinations)
   - Verify deployment proceeds only when all checks pass
   - Verify rollback triggers on any check failure

3. **Rollback Consistency Property Test**
   - Deploy version A, then version B, then rollback
   - Verify system state matches original version A state
   - Test with random version combinations

4. **Notification Property Test**
   - Generate random deployment outcomes
   - Verify notification sent for every outcome
   - Verify notification contains all required fields

5. **SSH Security Property Test**
   - Generate random deployment scenarios
   - Scan all logs and outputs for private key patterns
   - Verify no sensitive data leaked

6. **Zero-Downtime Property Test**
   - Deploy while sending continuous requests
   - Verify no requests fail during deployment
   - Verify response times remain acceptable

### Manual Testing Checklist

- [ ] Initial server setup from scratch
- [ ] First-time deployment of all components
- [ ] Update deployment with code changes
- [ ] Rollback after failed deployment
- [ ] Manual deployment trigger
- [ ] Deployment with database migrations
- [ ] Deployment with monitoring config changes
- [ ] SSL certificate renewal
- [ ] Disaster recovery from backups

## Deployment Documentation Structure

### Documentation Files

1. **DEPLOYMENT.md** (Root level)
   - Overview of deployment architecture
   - Quick start guide
   - Prerequisites and requirements
   - Environment setup instructions

2. **docs/deployment/setup-production.md**
   - Detailed Digital Ocean droplet setup
   - Initial server configuration
   - Security hardening steps
   - SSL certificate setup
   - GitHub Actions secrets configuration

3. **docs/deployment/ci-cd-workflows.md**
   - Explanation of each GitHub Actions workflow
   - Workflow triggers and conditions
   - Manual deployment procedures
   - Workflow customization guide

4. **docs/deployment/deployment-process.md**
   - Step-by-step deployment process
   - Zero-downtime deployment explanation
   - Health check procedures
   - Rollback procedures

5. **docs/deployment/troubleshooting.md**
   - Common deployment issues
   - Error messages and solutions
   - Debugging deployment failures
   - SSH connection issues
   - Health check failures

6. **docs/deployment/monitoring-deployment.md**
   - Monitoring stack deployment
   - Grafana dashboard setup
   - Alert configuration
   - Log aggregation setup

7. **docs/deployment/rollback-procedures.md**
   - When to rollback
   - Automatic vs manual rollback
   - Rollback verification
   - Post-rollback actions

8. **docs/deployment/architecture-diagrams.md**
   - Deployment topology diagrams
   - Network architecture
   - Service dependencies
   - Data flow diagrams

## Security Considerations

### SSH Key Management

- SSH private keys stored in GitHub Secrets (encrypted at rest)
- Keys rotated every 90 days
- Separate deploy user with limited permissions
- SSH key passphrase protection
- Host key verification to prevent MITM attacks

### Secrets Management

- All sensitive data in GitHub Secrets
- Environment-specific secrets (staging, production)
- Secret rotation procedures documented
- No secrets in code or logs
- Encrypted backup of secrets in secure vault

### Deployment Security

- Deploy user has minimal required permissions
- No root access for deployments
- File permissions set correctly (644 for files, 755 for directories)
- Services run as non-root users
- Firewall rules restrict access to deployment ports

### Network Security

- SSH access restricted to GitHub Actions IP ranges
- SSL/TLS for all external communication
- Internal services not exposed to internet
- Rate limiting on deployment endpoints
- DDoS protection via Digital Ocean

## Performance Optimization

### Deployment Speed

- Parallel job execution in GitHub Actions
- Incremental builds (cache dependencies)
- Optimized Docker image layers
- Compressed artifact transfers
- Pre-warmed deployment environment

### Resource Utilization

- Efficient backup strategy (incremental backups)
- Log rotation to prevent disk exhaustion
- Cleanup of old deployment artifacts
- Monitoring of deployment resource usage

### Network Optimization

- Artifact compression before transfer
- Rsync for efficient file synchronization
- Connection pooling for database migrations
- CDN for static assets

## Monitoring and Observability

### Deployment Metrics

- Deployment frequency (per day/week)
- Deployment duration (average, p95, p99)
- Deployment success rate
- Rollback frequency
- Time to rollback
- Health check response times

### Deployment Logs

- Structured logging (JSON format)
- Centralized log aggregation (Loki)
- Log retention (30 days)
- Log levels (INFO, WARN, ERROR)
- Deployment audit trail

### Alerts

- Deployment failure alerts (Slack, email)
- Rollback alerts (Slack, email, PagerDuty)
- Health check failure alerts
- Disk space alerts (before deployment)
- SSL certificate expiration alerts

## Maintenance and Operations

### Regular Maintenance

- Weekly: Review deployment logs and metrics
- Monthly: Update deployment scripts and workflows
- Quarterly: Security audit of deployment process
- Annually: Disaster recovery drill

### Backup Strategy

- Daily automated backups (2 AM UTC)
- Backup retention: 30 days
- Backup verification: Weekly
- Off-site backup storage (S3)
- Backup restoration testing: Monthly

### Disaster Recovery

- Recovery Time Objective (RTO): 1 hour
- Recovery Point Objective (RPO): 24 hours
- Documented recovery procedures
- Regular recovery drills
- Backup restoration verification

## Technology Stack

### CI/CD
- **GitHub Actions**: Workflow orchestration
- **GitHub Secrets**: Secrets management
- **GitHub Environments**: Environment protection rules

### Deployment Tools
- **SSH**: Secure remote access
- **rsync**: Efficient file synchronization
- **systemd**: Service management
- **Docker Compose**: Container orchestration

### Monitoring
- **Grafana**: Deployment dashboards
- **Prometheus**: Deployment metrics
- **Loki**: Deployment logs
- **AlertManager**: Deployment alerts

### Scripting
- **Bash**: Deployment scripts
- **jq**: JSON processing
- **curl**: HTTP health checks
- **bats**: Script testing

## Benefits

- **Automation**: Fully automated deployment pipeline reduces manual errors
- **Speed**: Deployments complete in minutes, not hours
- **Reliability**: Automated health checks and rollbacks ensure stability
- **Visibility**: Comprehensive logging and monitoring of all deployments
- **Security**: SSH key-based authentication and encrypted secrets
- **Zero-Downtime**: Users experience no service interruption
- **Auditability**: Complete deployment history and audit trail
- **Scalability**: Easy to add new services or environments
- **Documentation**: Comprehensive guides for all deployment scenarios
- **Recovery**: Fast rollback and disaster recovery capabilities
