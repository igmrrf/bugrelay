# CI/CD Workflows Documentation

This guide documents the GitHub Actions workflows used for automated deployment of BugRelay to Digital Ocean.

## Overview

BugRelay uses GitHub Actions for continuous integration and deployment. Each component (backend, frontend, monitoring, documentation) has its own workflow that automatically builds, tests, and deploys changes when code is pushed to the `main` branch.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                                                              │
│  Push to main → Workflow Triggered → Jobs Execute           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Backend  │  │ Frontend │  │Monitoring│  │   Docs   │   │
│  │ Workflow │  │ Workflow │  │ Workflow │  │ Workflow │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
└───────┼─────────────┼──────────────┼──────────────┼──────────┘
        │             │              │              │
        └─────────────┴──────────────┴──────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   SSH Deployment to         │
        │   Digital Ocean Droplet     │
        └─────────────────────────────┘
```

## GitHub Secrets Configuration

### Required Secrets

Before setting up workflows, configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DO_SSH_PRIVATE_KEY` | SSH private key for deployment | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `DO_HOST` | Digital Ocean droplet IP or hostname | `123.45.67.89` or `bugrelay.com` |
| `DO_USER` | SSH username for deployment | `deploy` |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` |
| `DEPLOYMENT_ENV_FILE` | Complete .env file content | `DB_PASSWORD=...\nJWT_SECRET=...` |

### Generating SSH Key for Deployment

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions@bugrelay.com" -f ~/.ssh/github_deploy

# Display private key (copy this to DO_SSH_PRIVATE_KEY secret)
cat ~/.ssh/github_deploy

# Display public key (add this to server's authorized_keys)
cat ~/.ssh/github_deploy.pub

# Add public key to server
ssh deploy@bugrelay.com "echo '$(cat ~/.ssh/github_deploy.pub)' >> ~/.ssh/authorized_keys"
```

### Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter secret name and value
5. Click **Add secret**
6. Repeat for all required secrets

## Backend Deployment Workflow

### File Location
`.github/workflows/backend-deploy.yml`

### Workflow Triggers

**Automatic Triggers:**
- Push to `main` branch with changes in `backend/**`
- Pull request merged to `main` affecting backend

**Manual Trigger:**
- GitHub Actions UI → Backend Deploy → Run workflow
- Select branch/tag to deploy

### Workflow Jobs

#### 1. Test Job

**Purpose**: Run tests and linting before deployment

**Steps**:
1. Checkout code
2. Setup Go environment
3. Install dependencies
4. Run `go test ./...`
5. Run `golangci-lint`
6. Run security scan with `gosec`

**Failure Handling**: If tests fail, workflow stops and deployment is cancelled

#### 2. Build Job

**Purpose**: Build production-ready binary

**Dependencies**: Requires test job to pass

**Steps**:
1. Checkout code
2. Setup Go environment
3. Build binary with optimizations: `go build -ldflags="-s -w" -o bugrelay-api`
4. Create build artifact
5. Upload artifact for deployment

**Output**: `bugrelay-api` binary

#### 3. Deploy Job

**Purpose**: Deploy backend to Digital Ocean

**Dependencies**: Requires build job to pass

**Steps**:
1. Download build artifact
2. Setup SSH connection to Digital Ocean
3. Create backup of current version
4. Stop current backend service
5. Copy new binary to server
6. Update environment variables
7. Start new backend service

**SSH Commands**:
```bash
# Backup current version
cp /opt/bugrelay/backend/bugrelay-api /opt/bugrelay/backups/bugrelay-api-$(date +%Y%m%d-%H%M%S)

# Stop service
sudo systemctl stop bugrelay-backend

# Deploy new version
cp bugrelay-api /opt/bugrelay/backend/
chmod +x /opt/bugrelay/backend/bugrelay-api

# Start service
sudo systemctl start bugrelay-backend
```

#### 4. Health Check Job

**Purpose**: Verify deployment success

**Dependencies**: Requires deploy job to pass

**Steps**:
1. Wait 10 seconds for service startup
2. Check backend health endpoint: `curl https://bugrelay.com/api/v1/health`
3. Verify database connectivity
4. Verify Redis connectivity
5. Check response time < 2 seconds

**Success Criteria**:
- Health endpoint returns 200 OK
- Response contains `"status": "healthy"`
- All dependencies connected

#### 5. Rollback Job

**Purpose**: Automatically rollback on failure

**Trigger**: Runs only if health check job fails

**Steps**:
1. SSH to Digital Ocean
2. Stop failed service
3. Identify previous version from backup
4. Restore previous version
5. Start service with previous version
6. Verify rollback with health check
7. Send rollback notification

#### 6. Notify Job

**Purpose**: Send deployment status notifications

**Trigger**: Always runs (success or failure)

**Steps**:
1. Determine deployment status
2. Format notification message
3. Send to Slack webhook
4. Include deployment metadata:
   - Commit hash
   - Deployer (GitHub username)
   - Timestamp
   - Duration
   - Status (success/failure/rolled back)

### Example Workflow File

```yaml
name: Backend Deploy

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to deploy'
        required: true
        default: 'main'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd backend
          go test ./...
      - name: Run linting
        run: |
          cd backend
          golangci-lint run

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Build binary
        run: |
          cd backend
          go build -ldflags="-s -w" -o bugrelay-api
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: backend-binary
          path: backend/bugrelay-api

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: backend-binary
      - name: Deploy to Digital Ocean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            # Deployment script here
            ./scripts/deploy.sh backend

  health-check:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Check backend health
        run: |
          sleep 10
          curl -f https://bugrelay.com/api/v1/health

  rollback:
    needs: health-check
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            ./scripts/rollback.sh backend

  notify:
    needs: [deploy, health-check, rollback]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          # Send Slack notification
          ./scripts/notify.sh
```

## Frontend Deployment Workflow

### File Location
`.github/workflows/frontend-deploy.yml`

### Workflow Triggers

**Automatic Triggers:**
- Push to `main` branch with changes in `frontend/**`

**Manual Trigger:**
- GitHub Actions UI with branch selection

### Workflow Jobs

#### 1. Lint and Type Check Job

**Steps**:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies: `npm ci`
4. Run ESLint: `npm run lint`
5. Run TypeScript check: `npm run type-check`

#### 2. Test Job

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run Jest tests: `npm test`
5. Generate coverage report
6. Upload coverage artifact

#### 3. Build Job

**Dependencies**: Requires lint and test jobs to pass

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Build production bundle: `npm run build`
5. Create build artifact
6. Upload artifact

**Output**: `.next/` directory with optimized build

#### 4. Deploy Job

**Steps**:
1. Download build artifact
2. SSH to Digital Ocean
3. Backup current frontend
4. Deploy new build to `/opt/bugrelay/frontend-new`
5. Update Nginx configuration
6. Graceful Nginx reload
7. Remove old frontend

#### 5. Verification Job

**Steps**:
1. Check frontend accessibility
2. Verify static assets load
3. Check API connectivity from frontend
4. Verify response time

#### 6. Rollback Job

**Trigger**: Runs if verification fails

**Steps**:
1. Restore previous frontend version
2. Revert Nginx configuration
3. Reload Nginx
4. Verify rollback

#### 7. Notify Job

**Steps**: Same as backend workflow

## Monitoring Deployment Workflow

### File Location
`.github/workflows/monitoring-deploy.yml`

### Workflow Triggers

**Automatic Triggers:**
- Push to `main` branch with changes in `monitoring/**`

**Manual Trigger:**
- GitHub Actions UI with service selection

### Workflow Jobs

#### 1. Validate Configuration Job

**Steps**:
1. Checkout code
2. Validate Prometheus config: `promtool check config`
3. Validate Grafana dashboards (JSON validation)
4. Validate Loki config
5. Validate AlertManager config

#### 2. Deploy Job

**Dependencies**: Requires validation to pass

**Steps**:
1. SSH to Digital Ocean
2. Backup current monitoring configs
3. Copy new configurations
4. Restart monitoring services gracefully
5. Wait for services to stabilize

#### 3. Health Check Job

**Steps**:
1. Check Grafana accessibility
2. Verify Prometheus scraping metrics
3. Verify Loki receiving logs
4. Verify AlertManager running
5. Check all dashboards load

#### 4. Rollback Job

**Trigger**: Runs if health check fails

**Steps**:
1. Restore previous configurations
2. Restart services
3. Verify rollback

#### 5. Notify Job

**Steps**: Same as other workflows

## Documentation Deployment Workflow

### File Location
`.github/workflows/docs-deploy.yml`

### Workflow Triggers

**Automatic Triggers:**
- Push to `main` branch with changes in `docs/**`

**Manual Trigger:**
- GitHub Actions UI

### Workflow Jobs

#### 1. Build Job

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Build VitePress site: `npm run docs:build`
5. Create build artifact
6. Upload artifact

#### 2. Deploy Job

**Steps**:
1. Download build artifact
2. SSH to Digital Ocean
3. Backup current docs
4. Deploy new docs to `/opt/bugrelay/docs`
5. Configure Nginx for docs site
6. Set caching headers
7. Reload Nginx

#### 3. Verification Job

**Steps**:
1. Check docs site accessibility
2. Verify SSL certificate
3. Verify caching headers
4. Check sample pages load

#### 4. Notify Job

**Steps**: Same as other workflows

## Manual Deployment Procedures

### Triggering Manual Deployment

1. **Navigate to Actions Tab**
   - Go to your GitHub repository
   - Click on **Actions** tab

2. **Select Workflow**
   - Choose the workflow to run (Backend/Frontend/Monitoring/Docs)

3. **Run Workflow**
   - Click **Run workflow** button
   - Select branch or tag to deploy
   - (Optional) Select specific services
   - Click **Run workflow**

4. **Monitor Progress**
   - Watch workflow execution in real-time
   - Check job logs for details
   - Wait for completion or failure

### Manual Deployment via SSH

If GitHub Actions is unavailable, deploy manually:

```bash
# SSH to Digital Ocean
ssh deploy@bugrelay.com

# Navigate to application directory
cd /opt/bugrelay

# Pull latest code
git pull origin main

# Run deployment script
./scripts/deploy.sh [backend|frontend|monitoring|docs]

# Verify deployment
./scripts/health-check.sh
```

## Workflow Permissions

### Required GitHub Permissions

Workflows require these permissions:

- **contents: read** - Read repository code
- **actions: write** - Upload/download artifacts
- **deployments: write** - Create deployment status

### Repository Settings

Configure in **Settings → Actions → General**:

- **Actions permissions**: Allow all actions
- **Workflow permissions**: Read and write permissions
- **Allow GitHub Actions to create and approve pull requests**: Disabled

## Monitoring Workflow Execution

### Viewing Workflow Runs

1. Go to **Actions** tab
2. Select workflow from left sidebar
3. View list of workflow runs
4. Click on a run to see details

### Viewing Job Logs

1. Click on workflow run
2. Click on job name
3. Expand steps to see detailed logs
4. Download logs if needed

### Workflow Status Badges

Add status badges to README.md:

```markdown
![Backend Deploy](https://github.com/your-org/bugrelay/workflows/Backend%20Deploy/badge.svg)
![Frontend Deploy](https://github.com/your-org/bugrelay/workflows/Frontend%20Deploy/badge.svg)
```

## Troubleshooting Workflows

### Workflow Fails at Test Stage

**Cause**: Tests failing or linting errors

**Solution**:
```bash
# Run tests locally
cd backend && go test ./...
cd frontend && npm test

# Fix failing tests
# Commit and push fixes
```

### Workflow Fails at Build Stage

**Cause**: Build errors or missing dependencies

**Solution**:
```bash
# Build locally
cd backend && go build
cd frontend && npm run build

# Fix build errors
# Commit and push fixes
```

### Workflow Fails at Deploy Stage

**Cause**: SSH connection issues or deployment script errors

**Solution**:
1. Verify GitHub Secrets are correct
2. Test SSH connection manually
3. Check deployment script logs
4. Verify server has enough disk space

### Workflow Fails at Health Check Stage

**Cause**: Service not starting or health endpoint failing

**Solution**:
1. SSH to server and check service status
2. Check application logs
3. Verify environment variables
4. Check database/Redis connectivity
5. Manual rollback if needed

### SSH Connection Timeout

**Cause**: Firewall blocking GitHub Actions IPs or SSH key issues

**Solution**:
```bash
# Verify SSH key
ssh -i ~/.ssh/github_deploy deploy@bugrelay.com

# Check firewall rules
sudo ufw status

# Check SSH logs
sudo tail -f /var/log/auth.log
```

## Best Practices

### Workflow Design

1. **Keep workflows focused** - One workflow per component
2. **Use job dependencies** - Ensure proper execution order
3. **Implement health checks** - Always verify deployments
4. **Enable automatic rollback** - Minimize downtime
5. **Send notifications** - Keep team informed

### Security

1. **Never commit secrets** - Use GitHub Secrets only
2. **Rotate SSH keys** - Every 90 days
3. **Use least privilege** - Minimal permissions for deploy user
4. **Audit workflow runs** - Review logs regularly
5. **Enable branch protection** - Require reviews before merge

### Performance

1. **Cache dependencies** - Speed up builds
2. **Use artifacts** - Share data between jobs
3. **Parallel jobs** - Run independent jobs concurrently
4. **Optimize builds** - Remove unnecessary steps
5. **Monitor execution time** - Identify bottlenecks

### Reliability

1. **Test locally first** - Before pushing to main
2. **Use staging environment** - Test deployments
3. **Implement retries** - For transient failures
4. **Monitor deployments** - Use Grafana dashboards
5. **Document procedures** - Keep runbooks updated

## Workflow Customization

### Adding New Workflow

1. Create new workflow file in `.github/workflows/`
2. Define triggers and jobs
3. Add required secrets
4. Test workflow
5. Document in this guide

### Modifying Existing Workflow

1. Create feature branch
2. Modify workflow file
3. Test changes
4. Create pull request
5. Review and merge

### Environment-Specific Workflows

Create separate workflows for staging and production:

```yaml
# .github/workflows/backend-deploy-staging.yml
on:
  push:
    branches: [develop]

# .github/workflows/backend-deploy-production.yml
on:
  push:
    branches: [main]
```

## Deployment Metrics

Track these metrics for workflow performance:

- **Deployment Frequency**: How often deployments occur
- **Deployment Duration**: Time from trigger to completion
- **Success Rate**: Percentage of successful deployments
- **Rollback Rate**: Percentage of deployments rolled back
- **Time to Rollback**: Time to detect and rollback failures

View metrics in Grafana dashboard: `https://monitoring.bugrelay.com/d/deployments`

## Related Documentation

- [Digital Ocean Setup Guide](setup-production.md) - Server setup
- [Deployment Process Guide](deployment-process.md) - Detailed deployment steps
- [Troubleshooting Guide](troubleshooting.md) - Common issues
- [Architecture Diagrams](architecture-diagrams.md) - System architecture

## Support

For issues with CI/CD workflows:

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check [Troubleshooting Guide](troubleshooting.md)
4. Contact DevOps team

---

**Last Updated**: December 2024  
**Maintained By**: DevOps Team
