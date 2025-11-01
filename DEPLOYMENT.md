# BugRelay Production Deployment Guide

This guide covers deploying BugRelay to production with Docker, including monitoring, logging, and backup systems.

## 🏗️ Architecture Overview

BugRelay uses a microservices architecture with the following components:

- **Frontend**: Next.js application (React)
- **Backend**: Go API server with Gin framework
- **Database**: PostgreSQL for persistent data
- **Cache**: Redis for session management and caching
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **Monitoring**: Grafana + Prometheus + Loki stack
- **Alerting**: AlertManager with email/Slack/PagerDuty integration

## 📋 Prerequisites

### System Requirements

- **CPU**: Minimum 4 cores (8 cores recommended)
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: Minimum 100GB SSD
- **Network**: Static IP address and domain name

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- SSL certificates for your domain

### Domain Setup

You'll need two domains:
- `bugrelay.com` (or your main domain) - for the application
- `monitoring.bugrelay.com` - for monitoring dashboard

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Copy environment configuration
cp .env.example .env

# Edit the configuration file
nano .env
```

### 2. Configure Environment

Edit `.env` with your production values:

```bash
# Database
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_chars
REDIS_PASSWORD=your_redis_password

# Domain and SSL
DOMAIN=bugrelay.com
MONITORING_DOMAIN=monitoring.bugrelay.com

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Monitoring
GRAFANA_ADMIN_PASSWORD=your_grafana_password
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

### 3. SSL Certificates

Place your SSL certificates in the `ssl/` directory:

```bash
mkdir -p ssl
# Copy your certificates
cp your-domain.crt ssl/bugrelay.com.crt
cp your-domain.key ssl/bugrelay.com.key
```

### 4. Deploy

```bash
# Deploy to production
make prod
```

## 🔧 Detailed Configuration

### Environment Variables

#### Database Configuration
```bash
DB_NAME=bugrelay_production          # Database name
DB_USER=bugrelay_user               # Database user
DB_PASSWORD=secure_password_here    # Database password (use strong password)
```

#### Security Configuration
```bash
JWT_SECRET=your_jwt_secret_32_chars_minimum    # JWT signing key
REDIS_PASSWORD=your_redis_password             # Redis authentication
LOGS_API_KEY=your_logs_api_key                # API key for log ingestion
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
GRAFANA_ADMIN_PASSWORD=secure_grafana_password
GRAFANA_ROOT_URL=https://monitoring.bugrelay.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
```

#### Email Configuration (for alerts)
```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=alerts@bugrelay.com
SMTP_PASSWORD=your_smtp_password
```

### SSL Configuration

#### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --standalone -d bugrelay.com -d monitoring.bugrelay.com

# Copy certificates
sudo cp /etc/letsencrypt/live/bugrelay.com/fullchain.pem ssl/bugrelay.com.crt
sudo cp /etc/letsencrypt/live/bugrelay.com/privkey.pem ssl/bugrelay.com.key

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Custom Certificates

```bash
# Copy your certificates
cp your-certificate.crt ssl/bugrelay.com.crt
cp your-private-key.key ssl/bugrelay.com.key

# Set proper permissions
chmod 644 ssl/bugrelay.com.crt
chmod 600 ssl/bugrelay.com.key
```

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

### Network Security

- All services run in isolated Docker networks
- Only Nginx is exposed to the internet
- Database and Redis are not directly accessible
- Internal services communicate over encrypted connections

### Application Security

- JWT tokens with secure secrets
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS protection
- Security headers (HSTS, CSP, etc.)

### Infrastructure Security

- Regular security updates
- Firewall configuration
- SSL/TLS encryption
- Secure backup storage
- Access logging and monitoring

### Security Monitoring

- Failed login attempt tracking
- Suspicious activity detection
- Real-time security alerts
- Audit logging for all administrative actions

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

### Common Issues

#### Application Won't Start
```bash
# Check logs
make logs

# Check service status
docker-compose ps
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres \
  psql -U bugrelay_user -d bugrelay_production -c "SELECT 1;"
```

#### High Memory Usage
```bash
# Check container memory usage
docker stats

# Check system memory
free -h

# Restart services if needed
make stop && make prod
```

### Log Analysis

```bash
# View application logs
make logs

# View Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# View system logs
journalctl -u docker -f
```

### Performance Issues

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s "https://bugrelay.com/health"

# Monitor database performance
docker-compose exec postgres \
  psql -U bugrelay_user -d bugrelay_production -c "SELECT * FROM pg_stat_activity;"
```

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

## 📝 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PostgreSQL Administration](https://www.postgresql.org/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)

Remember to customize this deployment guide according to your specific infrastructure and requirements!