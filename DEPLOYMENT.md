# BugRelay Production Deployment Guide

This guide provides comprehensive documentation for deploying BugRelay to production on Digital Ocean using automated CI/CD pipelines with GitHub Actions. The deployment system supports zero-downtime deployments, automated health checks, rollback capabilities, and comprehensive monitoring.

## 🏗️ Architecture Overview

BugRelay uses a microservices architecture deployed to a Digital Ocean Droplet at bugrelay.com with the following components:

- **Frontend**: Next.js application (React) - Port 3000
- **Backend**: Go API server with Gin framework - Port 8080
- **Database**: PostgreSQL for persistent data - Port 5432
- **Cache**: Redis for session management and caching - Port 6379
- **Reverse Proxy**: Nginx for SSL termination and routing - Ports 80/443
- **Monitoring**: Grafana + Prometheus + Loki + AlertManager stack
- **Documentation**: VitePress documentation site
- **CI/CD**: GitHub Actions workflows for automated deployment

### Deployment Architecture

```
GitHub Repository → GitHub Actions → SSH Deployment → Digital Ocean Droplet
                                                      ├── Backend Service
                                                      ├── Frontend Application
                                                      ├── Monitoring Stack
                                                      └── Documentation Site
```

## 📋 Prerequisites

### System Requirements

**Digital Ocean Droplet Specifications:**
- **CPU**: Minimum 4 cores (8 cores recommended for production)
- **RAM**: Minimum 8GB (16GB recommended for production)
- **Storage**: Minimum 100GB SSD (200GB recommended)
- **Network**: Static IP address with domain name configured
- **OS**: Ubuntu 22.04 LTS (recommended)

### Software Requirements

**On Digital Ocean Droplet:**
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git 2.30+
- Nginx 1.18+
- OpenSSH Server
- Certbot (for Let's Encrypt SSL certificates)

**For CI/CD (GitHub):**
- GitHub repository with Actions enabled
- GitHub Secrets configured (see GitHub Secrets section)
- SSH key pair for deployment authentication

### Domain Setup

You'll need the following domains configured:
- `bugrelay.com` - Main application (frontend + backend API)
- `monitoring.bugrelay.com` - Monitoring dashboard (Grafana)
- `docs.bugrelay.com` - Documentation site (optional)

All domains should point to your Digital Ocean Droplet's IP address via DNS A records.

## 🚀 Quick Start

This quick start guide assumes you have a Digital Ocean Droplet already set up. For detailed setup instructions, see [Digital Ocean Setup Guide](docs/deployment/setup-production.md).

### 1. Initial Server Setup

```bash
# SSH into your Digital Ocean Droplet
ssh root@your-droplet-ip

# Create deployment user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Set up SSH key authentication for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Switch to deploy user
su - deploy
```

### 2. Clone Repository and Configure

```bash
# Clone the repository
cd /opt
sudo mkdir bugrelay
sudo chown deploy:deploy bugrelay
cd bugrelay
git clone https://github.com/your-org/bugrelay.git .

# Copy environment configuration
cp .env.example .env

# Edit the configuration file with production values
nano .env
```

### 3. Configure GitHub Actions

Set up the following GitHub Secrets in your repository:
- `DO_SSH_PRIVATE_KEY` - SSH private key for deployment
- `DO_HOST` - Digital Ocean droplet IP or hostname
- `DO_USER` - SSH username (deploy)
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- `DEPLOYMENT_ENV_FILE` - Production environment variables

See [CI/CD Workflows Documentation](docs/deployment/ci-cd-workflows.md) for detailed configuration.

### 4. Deploy via GitHub Actions

**Automatic Deployment:**
Push to the `main` branch to trigger automatic deployment:

```bash
git push origin main
```

**Manual Deployment:**
1. Go to GitHub Actions tab in your repository
2. Select the workflow (Backend/Frontend/Monitoring/Docs)
3. Click "Run workflow"
4. Select branch/tag and click "Run workflow"

### 5. Verify Deployment

```bash
# Check backend health
curl https://bugrelay.com/api/v1/health

# Check frontend
curl https://bugrelay.com

# Check monitoring
curl https://monitoring.bugrelay.com
```

## 🔧 Detailed Configuration

### Environment Variables

All environment variables should be configured in the `.env` file on the Digital Ocean Droplet and in GitHub Secrets for CI/CD workflows.

#### Application Configuration
```bash
# Application
NODE_ENV=production
GO_ENV=production
BACKEND_PORT=8080
FRONTEND_PORT=3000
DOCS_PORT=8081

# Domain Configuration
DOMAIN=bugrelay.com
API_URL=https://bugrelay.com/api/v1
FRONTEND_URL=https://bugrelay.com
MONITORING_DOMAIN=monitoring.bugrelay.com
```

#### Database Configuration
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=your_secure_database_password_here
DB_SSL_MODE=disable  # Use 'require' if SSL is configured
```

#### Redis Configuration
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
REDIS_DB=0
```

#### Security Configuration
```bash
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRATION=24h
LOGS_API_KEY=your_secure_logs_api_key_for_authentication
BCRYPT_COST=12
```

#### OAuth Configuration (Optional)
```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
OAUTH_REDIRECT_URL=https://bugrelay.com/api/v1/auth/oauth/callback
```

#### Monitoring Configuration
```bash
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password
GRAFANA_ROOT_URL=https://monitoring.bugrelay.com
PROMETHEUS_RETENTION=30d
LOKI_RETENTION=30d
```

#### Notification Configuration
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_integration_key
ALERT_EMAIL=alerts@bugrelay.com
```

#### Deployment Configuration
```bash
DEPLOY_PATH=/opt/bugrelay
BACKUP_DIR=/opt/bugrelay/backups
KEEP_BACKUPS=5
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
ROLLBACK_ON_FAILURE=true
```

### SSL Configuration

#### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Stop Nginx temporarily
sudo systemctl stop nginx

# Get certificates for all domains
sudo certbot certonly --standalone \
  -d bugrelay.com \
  -d www.bugrelay.com \
  -d monitoring.bugrelay.com \
  -d docs.bugrelay.com \
  --email admin@bugrelay.com \
  --agree-tos \
  --non-interactive

# Certificates will be stored in:
# /etc/letsencrypt/live/bugrelay.com/fullchain.pem
# /etc/letsencrypt/live/bugrelay.com/privkey.pem

# Set up auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run

# Start Nginx
sudo systemctl start nginx
```

#### Using Custom Certificates

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy your certificates
sudo cp your-certificate.crt /etc/nginx/ssl/bugrelay.com.crt
sudo cp your-private-key.key /etc/nginx/ssl/bugrelay.com.key
sudo cp your-ca-bundle.crt /etc/nginx/ssl/ca-bundle.crt

# Set proper permissions
sudo chmod 644 /etc/nginx/ssl/bugrelay.com.crt
sudo chmod 600 /etc/nginx/ssl/bugrelay.com.key
sudo chown root:root /etc/nginx/ssl/*
```

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DO_SSH_PRIVATE_KEY` | SSH private key for deployment user | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DO_HOST` | Digital Ocean droplet IP or hostname | `123.45.67.89` or `bugrelay.com` |
| `DO_USER` | SSH username for deployment | `deploy` |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` |
| `DEPLOYMENT_ENV_FILE` | Complete .env file content | `DB_PASSWORD=...` |

See [CI/CD Workflows Documentation](docs/deployment/ci-cd-workflows.md) for detailed GitHub Secrets setup.

## 🔄 CI/CD Deployment Workflows

### Automated Deployment Process

BugRelay uses GitHub Actions for continuous deployment. When code is pushed to the `main` branch, the appropriate workflow automatically:

1. **Tests** - Runs all tests and linting
2. **Builds** - Creates production-ready artifacts
3. **Deploys** - Deploys to Digital Ocean via SSH
4. **Health Checks** - Verifies deployment success
5. **Rollback** - Automatically rolls back on failure
6. **Notifies** - Sends deployment status to Slack

### Available Workflows

| Workflow | Trigger | Components Deployed |
|----------|---------|---------------------|
| Backend Deploy | Push to `main` (backend/**) | Go API server |
| Frontend Deploy | Push to `main` (frontend/**) | Next.js application |
| Monitoring Deploy | Push to `main` (monitoring/**) | Grafana, Prometheus, Loki |
| Docs Deploy | Push to `main` (docs/**) | VitePress documentation |

### Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab in GitHub repository
2. Select the workflow (e.g., "Backend Deploy")
3. Click **Run workflow**
4. Select branch/tag to deploy
5. Click **Run workflow** button

### Deployment Strategies

**Backend (Blue-Green Deployment):**
- New version starts on alternate port
- Health checks run on new version
- Traffic switches only after health checks pass
- Old version stopped after successful switch
- Zero downtime guaranteed

**Frontend (Rolling Update):**
- New version deployed to separate directory
- Health checks verify new version
- Nginx configuration updated to point to new version
- Graceful Nginx reload
- Old version removed after successful deployment

**Monitoring (In-Place Update):**
- Configuration validated before deployment
- Services restarted gracefully
- Existing metrics and logs preserved
- Health checks verify all services running

For detailed workflow documentation, see [CI/CD Workflows Guide](docs/deployment/ci-cd-workflows.md).

## 🏥 Health Checks and Rollback

### Automated Health Checks

After each deployment, the system automatically verifies:

**Backend Health Checks:**
- API health endpoint responds (200 OK)
- Database connectivity verified
- Redis connectivity verified
- Response time within acceptable limits

**Frontend Health Checks:**
- Frontend serves content correctly
- Static assets load properly
- API connectivity from frontend works

**Monitoring Health Checks:**
- Grafana accessible and responding
- Prometheus scraping metrics
- Loki receiving logs
- AlertManager running

### Automatic Rollback

If any health check fails, the system automatically:

1. **Detects Failure** - Health check returns non-200 or times out
2. **Stops New Version** - Terminates the newly deployed version
3. **Restores Backup** - Restores previous version from backup
4. **Restarts Services** - Starts services with previous version
5. **Verifies Rollback** - Runs health checks on restored version
6. **Notifies Team** - Sends rollback notification with failure details

### Manual Rollback

To manually rollback a deployment:

```bash
# SSH into Digital Ocean Droplet
ssh deploy@bugrelay.com

# Run rollback script
cd /opt/bugrelay
./scripts/rollback.sh [backend|frontend|monitoring|docs]

# Verify rollback
./scripts/health-check.sh
```

For detailed rollback procedures, see [Deployment Process Guide](docs/deployment/deployment-process.md).

## 🔍 Monitoring and Alerting

### Grafana Dashboard

Access Grafana at `https://monitoring.bugrelay.com`

Default credentials:
- Username: `admin`
- Password: Set in `GRAFANA_ADMIN_PASSWORD`

### Available Dashboards

1. **BugRelay Overview** - Application metrics and performance
2. **System Metrics** - Server resources and health
3. **Database Metrics** - PostgreSQL performance
4. **Security Dashboard** - Security events and alerts

### Alert Channels

Configure these alert channels in AlertManager:

1. **Email** - For all team notifications
2. **Slack** - For real-time team alerts
3. **PagerDuty** - For critical alerts requiring immediate response

### Key Metrics to Monitor

- **Application Health**: Response times, error rates, uptime
- **System Resources**: CPU, memory, disk usage
- **Database**: Connection count, query performance, locks
- **Security**: Failed login attempts, suspicious activity
- **Business Metrics**: User registrations, bug submissions

## 💾 Backup and Recovery

### Automated Backups

Backups run automatically every day at 2 AM UTC:

```bash
# Manual backup
docker-compose exec postgres \
  pg_dump -U bugrelay_user -d bugrelay_production > backup/manual_backup.sql

# Restore from backup
docker-compose exec -T postgres \
  psql -U bugrelay_user -d bugrelay_production < backup/backup_file.sql
```

### S3 Backup Configuration

Configure S3 for automated backup storage:

```bash
# Add to .env.prod
BACKUP_S3_BUCKET=bugrelay-backups
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
make stop

# Restore database
docker-compose exec -T postgres \
  psql -U bugrelay_user -d bugrelay_production < backup/restore_file.sql

# Start application
make prod
```

#### Full System Recovery
```bash
# Clone repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Restore configuration
cp backup/.env .env

# Deploy
make prod

# Restore database
# (follow database recovery steps above)
```

## 🔒 Security Considerations

### SSH Key Security

**Deployment SSH Keys:**
- Use dedicated SSH key pair for deployments (separate from personal keys)
- Store private key securely in GitHub Secrets (encrypted at rest)
- Never commit private keys to repository
- Rotate SSH keys every 90 days
- Use strong passphrase protection for keys
- Restrict SSH access to deployment user only

**SSH Configuration:**
```bash
# On Digital Ocean Droplet: /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers deploy
```

### Network Security

- **Firewall Configuration**: Only ports 80, 443, and 22 exposed to internet
- **Internal Services**: Database and Redis not directly accessible from internet
- **Docker Networks**: Services isolated in separate Docker networks
- **SSL/TLS**: All external communication encrypted with TLS 1.2+
- **DDoS Protection**: Use Digital Ocean's built-in DDoS protection

### Application Security

- **JWT Tokens**: Secure secrets with minimum 32 characters
- **Password Hashing**: bcrypt with cost factor 12
- **Rate Limiting**: Implemented on all API endpoints
- **Input Validation**: All user input validated and sanitized
- **CORS Protection**: Configured for specific origins only
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

### Secrets Management

- **GitHub Secrets**: All sensitive data stored in GitHub Secrets (encrypted)
- **Environment Variables**: Never commit .env files to repository
- **Secret Rotation**: Rotate all secrets every 90 days
- **Access Control**: Limit GitHub repository access to authorized personnel
- **Audit Logging**: All secret access logged and monitored

### Deployment Security

- **Deployment User**: Dedicated user with minimal required permissions
- **No Root Access**: Deployments never run as root
- **File Permissions**: Correct permissions set after deployment (644 for files, 755 for directories)
- **Secure Transfer**: All file transfers use SCP/SFTP over SSH
- **Host Verification**: SSH host key verification enabled

### Security Monitoring

- **Failed Login Tracking**: Monitor and alert on failed SSH attempts
- **Suspicious Activity**: Real-time detection and alerting
- **Security Alerts**: Immediate notifications for security events
- **Audit Logging**: All administrative actions logged
- **Vulnerability Scanning**: Regular security scans of dependencies

## 📊 Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_bugs_status ON bugs(status);
CREATE INDEX CONCURRENTLY idx_bugs_created_at ON bugs(created_at);
CREATE INDEX CONCURRENTLY idx_comments_bug_id ON comments(bug_id);
```

### Redis Optimization

- Configure appropriate memory limits
- Use LRU eviction policy
- Enable AOF persistence for durability
- Monitor memory usage and hit rates

### Application Optimization

- Enable Gzip compression in Nginx
- Configure proper caching headers
- Use CDN for static assets
- Optimize database queries
- Implement connection pooling

## 🚨 Troubleshooting

For comprehensive troubleshooting documentation, see [Troubleshooting Guide](docs/deployment/troubleshooting.md).

### Common Deployment Issues

#### Deployment Workflow Fails

**Symptoms:** GitHub Actions workflow fails during deployment

**Quick Fixes:**
```bash
# Check workflow logs in GitHub Actions tab
# Verify GitHub Secrets are configured correctly
# Ensure SSH key has correct permissions

# Test SSH connection manually
ssh -i ~/.ssh/deploy_key deploy@bugrelay.com

# Verify deployment user permissions
ssh deploy@bugrelay.com "ls -la /opt/bugrelay"
```

#### Health Check Failures

**Symptoms:** Deployment completes but health checks fail, triggering rollback

**Quick Fixes:**
```bash
# SSH into droplet
ssh deploy@bugrelay.com

# Check service status
docker-compose ps
systemctl status backend
systemctl status frontend

# Check service logs
docker-compose logs backend
docker-compose logs frontend

# Run manual health check
curl http://localhost:8080/api/v1/health
curl http://localhost:3000
```

#### SSH Connection Issues

**Symptoms:** GitHub Actions cannot connect to Digital Ocean Droplet

**Quick Fixes:**
```bash
# Verify SSH key in GitHub Secrets matches authorized_keys on droplet
# Check firewall allows SSH from GitHub Actions IP ranges
# Verify DO_HOST and DO_USER secrets are correct

# Test SSH connection
ssh -v deploy@bugrelay.com

# Check SSH logs on droplet
sudo tail -f /var/log/auth.log
```

#### Database Connection Issues

**Symptoms:** Backend cannot connect to database

**Quick Fixes:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres
systemctl status postgresql

# Test database connection
docker-compose exec postgres \
  psql -U bugrelay_user -d bugrelay_production -c "SELECT 1;"

# Check database logs
docker-compose logs postgres

# Verify database credentials in .env
cat /opt/bugrelay/.env | grep DB_
```

#### High Memory Usage

**Symptoms:** Server running out of memory, services crashing

**Quick Fixes:**
```bash
# Check memory usage
free -h
docker stats

# Check which service is using memory
ps aux --sort=-%mem | head -n 10

# Restart services if needed
docker-compose restart
systemctl restart backend
systemctl restart frontend
```

#### SSL Certificate Issues

**Symptoms:** HTTPS not working, certificate errors

**Quick Fixes:**
```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Verify Nginx SSL configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Log Analysis

```bash
# View deployment logs
ssh deploy@bugrelay.com "tail -f /opt/bugrelay/logs/deployment.log"

# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View system logs
sudo journalctl -u backend -f
sudo journalctl -u frontend -f
```

### Performance Issues

```bash
# Check API response times
curl -w "\nTime: %{time_total}s\n" https://bugrelay.com/api/v1/health

# Monitor database performance
docker-compose exec postgres \
  psql -U bugrelay_user -d bugrelay_production \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check Redis performance
docker-compose exec redis redis-cli INFO stats

# Monitor system resources
htop
iotop
```

### Getting Help

If you cannot resolve an issue:

1. **Check Documentation**: Review [Troubleshooting Guide](docs/deployment/troubleshooting.md)
2. **Check Logs**: Always check application and system logs first
3. **Check Monitoring**: Use Grafana dashboards to identify issues
4. **Manual Rollback**: If needed, manually rollback to previous version
5. **Contact Team**: Reach out to DevOps team with logs and error details

## 🔄 Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review monitoring dashboards
   - Check backup integrity
   - Update security patches

2. **Monthly**:
   - Review and rotate logs
   - Update dependencies
   - Performance optimization review

3. **Quarterly**:
   - Security audit
   - Disaster recovery testing
   - Capacity planning review

### Updates and Upgrades

```bash
# Update application
git pull origin main
make prod

# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose pull
make prod
```

## 📞 Support

### Getting Help

- **Documentation**: Check this guide and inline comments
- **Logs**: Always check application and system logs first
- **Monitoring**: Use Grafana dashboards to identify issues
- **Community**: Join our Discord/Slack for community support

### Emergency Contacts

- **On-call Engineer**: [Your on-call system]
- **DevOps Team**: [Your team contact]
- **Security Team**: [Security contact for incidents]

---

## 📝 Additional Documentation

### Deployment Documentation

- **[Digital Ocean Setup Guide](docs/deployment/setup-production.md)** - Detailed server setup and configuration
- **[CI/CD Workflows Guide](docs/deployment/ci-cd-workflows.md)** - GitHub Actions workflow documentation
- **[Deployment Process Guide](docs/deployment/deployment-process.md)** - Step-by-step deployment procedures
- **[Troubleshooting Guide](docs/deployment/troubleshooting.md)** - Common issues and solutions
- **[Architecture Diagrams](docs/deployment/architecture-diagrams.md)** - System architecture and topology

### External Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PostgreSQL Administration](https://www.postgresql.org/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🎯 Deployment Checklist

### Initial Setup Checklist

- [ ] Digital Ocean Droplet created and configured
- [ ] Domain DNS records pointing to droplet IP
- [ ] SSH keys generated and configured
- [ ] Deployment user created with proper permissions
- [ ] Docker and Docker Compose installed
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Nginx installed and configured
- [ ] GitHub Secrets configured
- [ ] Environment variables configured in .env
- [ ] Firewall rules configured
- [ ] Initial deployment completed successfully
- [ ] Health checks passing
- [ ] Monitoring stack deployed and accessible
- [ ] Backup system configured and tested

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables updated if needed
- [ ] Backup of current production version exists
- [ ] Team notified of upcoming deployment
- [ ] Monitoring dashboards open and ready
- [ ] Rollback plan understood

### Post-Deployment Checklist

- [ ] Deployment workflow completed successfully
- [ ] All health checks passing
- [ ] Application accessible at production URL
- [ ] Database migrations applied successfully
- [ ] Monitoring collecting metrics
- [ ] Logs being aggregated properly
- [ ] No error alerts triggered
- [ ] Team notified of successful deployment
- [ ] Deployment documented in changelog

## 📞 Support and Contact

### Emergency Contacts

- **DevOps Team**: devops@bugrelay.com
- **On-Call Engineer**: Use PagerDuty for critical issues
- **Security Team**: security@bugrelay.com (for security incidents)

### Support Channels

- **Slack**: #deployments channel for deployment discussions
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check docs/ directory for detailed guides

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintained By**: DevOps Team

For questions or improvements to this documentation, please open an issue or submit a pull request.