# Deployment Process Guide

This guide provides detailed step-by-step procedures for deploying BugRelay components to production, including zero-downtime deployment strategies, health check procedures, and rollback procedures.

## Overview

BugRelay uses automated CI/CD pipelines for deployment, but understanding the underlying process is essential for troubleshooting and manual deployments. This guide covers both automated and manual deployment procedures.

## Deployment Strategies

### Blue-Green Deployment (Backend)

Blue-green deployment maintains two identical production environments. Only one serves live traffic at a time.

**Process**:
1. **Blue** (current) serves production traffic
2. **Green** (new version) is deployed and tested
3. Traffic switches from Blue to Green
4. Blue is kept as backup for quick rollback

**Benefits**:
- Zero downtime
- Instant rollback capability
- Full testing before traffic switch
- No database migration issues

### Rolling Update (Frontend)

Rolling update gradually replaces old version with new version.

**Process**:
1. Deploy new version to separate directory
2. Test new version
3. Update routing to new version
4. Gracefully reload proxy
5. Remove old version

**Benefits**:
- Zero downtime
- Gradual transition
- Easy rollback
- Resource efficient

### In-Place Update (Monitoring)

In-place update replaces configuration files and restarts services.

**Process**:
1. Validate new configuration
2. Backup current configuration
3. Deploy new configuration
4. Restart services gracefully
5. Verify services running

**Benefits**:
- Simple process
- Preserves data
- Quick deployment
- Minimal resource usage

## Pre-Deployment Checklist

Before deploying to production, verify:

### Code Quality
- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] No linting errors
- [ ] Security scan passed
- [ ] Dependencies updated

### Environment
- [ ] Environment variables configured
- [ ] Secrets updated if needed
- [ ] Database migrations tested
- [ ] Configuration files validated

### Infrastructure
- [ ] Server health check passed
- [ ] Sufficient disk space (>20% free)
- [ ] Database backup completed
- [ ] Monitoring dashboards accessible

### Team
- [ ] Team notified of deployment
- [ ] On-call engineer available
- [ ] Rollback plan understood
- [ ] Communication channels open

## Backend Deployment Process

### Automated Deployment (Recommended)

#### Step 1: Trigger Deployment

**Via Git Push:**
```bash
# Commit changes
git add backend/
git commit -m "feat: add new feature"

# Push to main branch
git push origin main

# Workflow automatically triggers
```

**Via GitHub Actions UI:**
1. Go to Actions tab
2. Select "Backend Deploy"
3. Click "Run workflow"
4. Select branch/tag
5. Click "Run workflow"

#### Step 2: Monitor Deployment

```bash
# Watch workflow in GitHub Actions
# Or monitor via Slack notifications

# Check deployment status
curl https://bugrelay.com/api/v1/health
```

#### Step 3: Verify Deployment

```bash
# Check backend health
curl https://bugrelay.com/api/v1/health

# Expected response:
{
  "status": "healthy",
  "version": "v1.2.3",
  "database": "connected",
  "redis": "connected",
  "uptime": "5m"
}

# Check logs
ssh deploy@bugrelay.com "tail -f /opt/bugrelay/logs/backend.log"
```

### Manual Deployment

If automated deployment is unavailable:

#### Step 1: Build Backend

```bash
# On your local machine
cd backend

# Run tests
go test ./...

# Build binary
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bugrelay-api

# Verify binary
file bugrelay-api
# Output: bugrelay-api: ELF 64-bit LSB executable, x86-64
```

#### Step 2: Deploy to Server

```bash
# Copy binary to server
scp -i ~/.ssh/bugrelay_deploy bugrelay-api deploy@bugrelay.com:/tmp/

# SSH to server
ssh -i ~/.ssh/bugrelay_deploy deploy@bugrelay.com

# Run deployment script
cd /opt/bugrelay
./scripts/deploy.sh backend /tmp/bugrelay-api
```

#### Step 3: Verify Deployment

```bash
# Check service status
sudo systemctl status bugrelay-backend

# Check health endpoint
curl http://localhost:8080/api/v1/health

# Check logs
tail -f /opt/bugrelay/logs/backend.log
```

### Blue-Green Deployment Details

The backend uses blue-green deployment for zero downtime:

#### Phase 1: Preparation

```bash
# Current state: backend-blue running on port 8080
# Nginx routes traffic to port 8080

# Backup current version
cp /opt/bugrelay/backend/bugrelay-api \
   /opt/bugrelay/backups/bugrelay-api-$(date +%Y%m%d-%H%M%S)
```

#### Phase 2: Deploy Green

```bash
# Copy new binary
cp /tmp/bugrelay-api /opt/bugrelay/backend/bugrelay-api-green
chmod +x /opt/bugrelay/backend/bugrelay-api-green

# Start green on alternate port (8081)
cd /opt/bugrelay/backend
PORT=8081 ./bugrelay-api-green &

# Wait for startup
sleep 5
```

#### Phase 3: Health Check Green

```bash
# Check green health
curl http://localhost:8081/api/v1/health

# Run comprehensive health checks
./scripts/health-check.sh backend 8081

# If health checks fail, stop green and abort
```

#### Phase 4: Switch Traffic

```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/bugrelay.conf

# Change backend proxy_pass from:
# proxy_pass http://localhost:8080;
# To:
# proxy_pass http://localhost:8081;

# Test Nginx configuration
sudo nginx -t

# Graceful reload (no dropped connections)
sudo nginx -s reload
```

#### Phase 5: Cleanup

```bash
# Wait for in-flight requests to complete
sleep 30

# Stop blue
pkill -f bugrelay-api-blue

# Rename green to blue for next deployment
mv /opt/bugrelay/backend/bugrelay-api-green \
   /opt/bugrelay/backend/bugrelay-api

# Update systemd service to use port 8080
sudo systemctl restart bugrelay-backend
```

## Frontend Deployment Process

### Automated Deployment (Recommended)

#### Step 1: Trigger Deployment

```bash
# Push changes
git add frontend/
git commit -m "feat: update UI"
git push origin main

# Workflow triggers automatically
```

#### Step 2: Monitor Deployment

```bash
# Watch GitHub Actions
# Or monitor Slack notifications

# Check frontend accessibility
curl https://bugrelay.com
```

#### Step 3: Verify Deployment

```bash
# Check frontend loads
curl -I https://bugrelay.com
# Expected: HTTP/2 200

# Check static assets
curl -I https://bugrelay.com/_next/static/...
# Expected: HTTP/2 200

# Check API connectivity from frontend
# Open browser and test functionality
```

### Manual Deployment

#### Step 1: Build Frontend

```bash
# On your local machine
cd frontend

# Install dependencies
npm ci

# Build production bundle
npm run build

# Create tarball
tar -czf frontend-build.tar.gz .next/ public/ package.json
```

#### Step 2: Deploy to Server

```bash
# Copy build to server
scp -i ~/.ssh/bugrelay_deploy frontend-build.tar.gz \
    deploy@bugrelay.com:/tmp/

# SSH to server
ssh -i ~/.ssh/bugrelay_deploy deploy@bugrelay.com

# Run deployment script
cd /opt/bugrelay
./scripts/deploy.sh frontend /tmp/frontend-build.tar.gz
```

#### Step 3: Verify Deployment

```bash
# Check service status
sudo systemctl status bugrelay-frontend

# Check frontend accessibility
curl http://localhost:3000

# Check logs
tail -f /opt/bugrelay/logs/frontend.log
```

### Rolling Update Details

The frontend uses rolling update for zero downtime:

#### Phase 1: Preparation

```bash
# Current state: frontend running in /opt/bugrelay/frontend
# Nginx routes traffic to /opt/bugrelay/frontend

# Backup current version
cp -r /opt/bugrelay/frontend \
      /opt/bugrelay/backups/frontend-$(date +%Y%m%d-%H%M%S)
```

#### Phase 2: Deploy New Version

```bash
# Extract new build to separate directory
mkdir -p /opt/bugrelay/frontend-new
cd /opt/bugrelay/frontend-new
tar -xzf /tmp/frontend-build.tar.gz

# Install dependencies
npm ci --production

# Set environment variables
cp /opt/bugrelay/.env /opt/bugrelay/frontend-new/
```

#### Phase 3: Test New Version

```bash
# Start new version on alternate port (3001)
cd /opt/bugrelay/frontend-new
PORT=3001 npm start &

# Wait for startup
sleep 10

# Test new version
curl http://localhost:3001
./scripts/health-check.sh frontend 3001
```

#### Phase 4: Switch Traffic

```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/bugrelay.conf

# Change frontend proxy_pass from:
# proxy_pass http://localhost:3000;
# To:
# proxy_pass http://localhost:3001;

# Test and reload Nginx
sudo nginx -t
sudo nginx -s reload
```

#### Phase 5: Cleanup

```bash
# Wait for in-flight requests
sleep 30

# Stop old version
pkill -f "node.*3000"

# Move new version to main location
rm -rf /opt/bugrelay/frontend-old
mv /opt/bugrelay/frontend /opt/bugrelay/frontend-old
mv /opt/bugrelay/frontend-new /opt/bugrelay/frontend

# Update systemd service
sudo systemctl restart bugrelay-frontend
```

## Monitoring Deployment Process

### Automated Deployment

#### Step 1: Trigger Deployment

```bash
# Push monitoring configuration changes
git add monitoring/
git commit -m "feat: update Grafana dashboard"
git push origin main
```

#### Step 2: Monitor Deployment

```bash
# Watch GitHub Actions
# Verify configuration validation passes

# Check monitoring services
curl https://monitoring.bugrelay.com
```

#### Step 3: Verify Deployment

```bash
# Check Grafana
curl https://monitoring.bugrelay.com/api/health
# Expected: {"database": "ok"}

# Check Prometheus
curl http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.

# Check Loki
curl http://localhost:3100/ready
# Expected: ready
```

### Manual Deployment

#### Step 1: Validate Configuration

```bash
# Validate Prometheus config
promtool check config monitoring/prometheus/prometheus.yml

# Validate Grafana dashboards
# (JSON validation)
jq empty monitoring/grafana/dashboards/*.json

# Validate Loki config
# (YAML validation)
yamllint monitoring/loki/config.yml
```

#### Step 2: Deploy Configuration

```bash
# SSH to server
ssh deploy@bugrelay.com

# Backup current configuration
cd /opt/bugrelay/monitoring
tar -czf ../backups/monitoring-config-$(date +%Y%m%d-%H%M%S).tar.gz .

# Copy new configuration
# (from local machine)
scp -r monitoring/* deploy@bugrelay.com:/opt/bugrelay/monitoring/
```

#### Step 3: Restart Services

```bash
# Restart Prometheus
docker compose restart prometheus

# Restart Grafana
docker compose restart grafana

# Restart Loki
docker compose restart loki

# Verify all services running
docker compose ps
```

## Health Check Procedures

### Backend Health Checks

```bash
# Basic health check
curl https://bugrelay.com/api/v1/health

# Detailed health check
curl https://bugrelay.com/api/v1/health/detailed

# Database connectivity
curl https://bugrelay.com/api/v1/health/database

# Redis connectivity
curl https://bugrelay.com/api/v1/health/redis

# Response time check
time curl https://bugrelay.com/api/v1/health
# Should be < 2 seconds
```

### Frontend Health Checks

```bash
# Basic accessibility
curl -I https://bugrelay.com
# Expected: HTTP/2 200

# Static assets
curl -I https://bugrelay.com/_next/static/chunks/main.js
# Expected: HTTP/2 200

# API connectivity from frontend
# (requires browser or headless browser)
curl https://bugrelay.com/api/v1/health

# Response time
time curl https://bugrelay.com
# Should be < 3 seconds
```

### Monitoring Health Checks

```bash
# Grafana
curl https://monitoring.bugrelay.com/api/health

# Prometheus
curl http://localhost:9090/-/healthy

# Loki
curl http://localhost:3100/ready

# AlertManager
curl http://localhost:9093/-/healthy

# Check metrics collection
curl http://localhost:9090/api/v1/query?query=up
```

### Automated Health Check Script

```bash
# Run comprehensive health checks
cd /opt/bugrelay
./scripts/health-check.sh

# Output:
# ✓ Backend health: OK
# ✓ Frontend accessibility: OK
# ✓ Database connectivity: OK
# ✓ Redis connectivity: OK
# ✓ Monitoring stack: OK
# All health checks passed!
```

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Health checks fail after deployment
- Critical functionality broken
- Performance degradation > 50%
- Database corruption detected
- Security vulnerability introduced

### Automatic Rollback

The CI/CD pipeline automatically rolls back if health checks fail:

1. Health check detects failure
2. Rollback job triggers
3. Previous version restored from backup
4. Services restarted
5. Health checks verify rollback
6. Team notified

### Manual Rollback

#### Backend Rollback

```bash
# SSH to server
ssh deploy@bugrelay.com

# Run rollback script
cd /opt/bugrelay
./scripts/rollback.sh backend

# Or manual rollback:
# Stop current service
sudo systemctl stop bugrelay-backend

# Identify previous version
ls -lt /opt/bugrelay/backups/bugrelay-api-*
# Use most recent backup

# Restore previous version
cp /opt/bugrelay/backups/bugrelay-api-20241208-143022 \
   /opt/bugrelay/backend/bugrelay-api

# Start service
sudo systemctl start bugrelay-backend

# Verify rollback
curl http://localhost:8080/api/v1/health
```

#### Frontend Rollback

```bash
# SSH to server
ssh deploy@bugrelay.com

# Run rollback script
cd /opt/bugrelay
./scripts/rollback.sh frontend

# Or manual rollback:
# Stop current service
sudo systemctl stop bugrelay-frontend

# Restore previous version
rm -rf /opt/bugrelay/frontend
cp -r /opt/bugrelay/backups/frontend-20241208-143022 \
      /opt/bugrelay/frontend

# Start service
sudo systemctl start bugrelay-frontend

# Update Nginx if needed
sudo nginx -s reload

# Verify rollback
curl http://localhost:3000
```

#### Monitoring Rollback

```bash
# SSH to server
ssh deploy@bugrelay.com

# Run rollback script
cd /opt/bugrelay
./scripts/rollback.sh monitoring

# Or manual rollback:
# Stop services
cd /opt/bugrelay/monitoring
docker compose down

# Restore previous configuration
tar -xzf ../backups/monitoring-config-20241208-143022.tar.gz

# Start services
docker compose up -d

# Verify rollback
docker compose ps
curl https://monitoring.bugrelay.com/api/health
```

### Rollback Verification

After rollback, verify:

```bash
# Run health checks
./scripts/health-check.sh

# Check application version
curl https://bugrelay.com/api/v1/version

# Check logs for errors
tail -f /opt/bugrelay/logs/*.log

# Monitor metrics
# Open Grafana and check dashboards

# Test critical functionality
# (manual testing or automated tests)
```

## Post-Deployment Procedures

### Immediate Verification (0-5 minutes)

```bash
# Check all health endpoints
./scripts/health-check.sh

# Monitor error rates
# Check Grafana dashboard

# Verify critical functionality
# Test key user flows

# Check logs for errors
tail -f /opt/bugrelay/logs/*.log
```

### Short-term Monitoring (5-30 minutes)

```bash
# Monitor response times
# Check Grafana performance dashboard

# Monitor error rates
# Check error logs and Sentry

# Check resource usage
# CPU, memory, disk, network

# Monitor user activity
# Check analytics dashboard
```

### Long-term Monitoring (30+ minutes)

```bash
# Review deployment metrics
# Deployment duration, success rate

# Check for anomalies
# Unusual patterns in metrics

# Gather user feedback
# Check support channels

# Document issues
# Update runbook if needed
```

### Deployment Documentation

After successful deployment:

```bash
# Update changelog
# Document changes deployed

# Update version numbers
# Tag release in Git

# Notify team
# Send deployment summary

# Update documentation
# If procedures changed
```

## Troubleshooting Deployments

### Deployment Fails at Build Stage

**Symptoms**: Build job fails in CI/CD

**Solutions**:
1. Check build logs for errors
2. Run build locally to reproduce
3. Fix build errors
4. Verify dependencies are correct
5. Push fix and retry

### Deployment Fails at Health Check

**Symptoms**: Service deployed but health checks fail

**Solutions**:
1. SSH to server and check service status
2. Check application logs for errors
3. Verify environment variables
4. Check database/Redis connectivity
5. Manual rollback if needed

### Deployment Succeeds but Application Broken

**Symptoms**: Health checks pass but functionality broken

**Solutions**:
1. Check application logs
2. Test specific functionality
3. Check database migrations
4. Verify configuration
5. Rollback and investigate

### Rollback Fails

**Symptoms**: Rollback script fails or doesn't restore service

**Solutions**:
1. Check backup integrity
2. Manually restore from backup
3. Verify file permissions
4. Check service configuration
5. Contact DevOps team if needed

## Best Practices

### Deployment Timing

- **Avoid peak hours**: Deploy during low-traffic periods
- **Business hours**: Deploy when team is available
- **Maintenance windows**: Schedule for planned maintenance
- **Gradual rollout**: Consider canary deployments for major changes

### Communication

- **Pre-deployment**: Notify team of upcoming deployment
- **During deployment**: Keep team updated on progress
- **Post-deployment**: Share deployment summary
- **Issues**: Communicate problems immediately

### Testing

- **Test locally**: Always test changes locally first
- **Staging environment**: Test in staging before production
- **Automated tests**: Ensure all tests pass
- **Manual testing**: Test critical flows manually

### Monitoring

- **Watch dashboards**: Monitor Grafana during deployment
- **Check logs**: Watch logs in real-time
- **Set alerts**: Configure alerts for anomalies
- **Quick response**: Be ready to rollback if needed

## Related Documentation

- [CI/CD Workflows Guide](ci-cd-workflows.md) - Automated deployment workflows
- [Troubleshooting Guide](troubleshooting.md) - Common deployment issues
- [Architecture Diagrams](architecture-diagrams.md) - System architecture
- [Digital Ocean Setup](setup-production.md) - Server setup

## Support

For deployment issues:
1. Check this guide
2. Review [Troubleshooting Guide](troubleshooting.md)
3. Check deployment logs
4. Contact DevOps team

---

**Last Updated**: December 2024  
**Maintained By**: DevOps Team
