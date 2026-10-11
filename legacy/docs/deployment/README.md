# Deployment Guide

This guide covers deploying the BugRelay backend server in various environments, from development to production.

## Quick Start

The fastest way to get BugRelay running is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Copy environment configuration
cp .env.prod.example .env.prod

# Edit configuration (see Configuration section)
nano .env.prod

# Start the services
docker-compose -f docker-compose.prod.yml up -d
```

## Deployment Options

### Docker Compose (Recommended)

Docker Compose provides the easiest deployment method with all dependencies included.

**Advantages:**
- All services included (PostgreSQL, Redis, Nginx)
- Easy to scale and manage
- Consistent across environments
- Built-in health checks

**Use cases:**
- Production deployments
- Staging environments
- Local development

### Kubernetes

For large-scale deployments with high availability requirements.

**Advantages:**
- Auto-scaling capabilities
- Rolling updates
- Service discovery
- Load balancing

**Use cases:**
- Enterprise deployments
- Multi-region setups
- High-traffic applications

### Manual Installation

Direct installation on servers for custom setups.

**Advantages:**
- Full control over configuration
- Custom optimization
- Integration with existing infrastructure

**Use cases:**
- Legacy infrastructure
- Custom security requirements
- Specialized configurations

## Environment Requirements

### Minimum System Requirements

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

### Recommended System Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 1 Gbps

### Dependencies

- **PostgreSQL**: 13+ (for database)
- **Redis**: 6+ (for caching and sessions)
- **Go**: 1.21+ (for building from source)
- **Docker**: 20+ (for containerized deployment)

## Configuration

All configuration is managed through environment variables and configuration files. For comprehensive configuration details, see the [Configuration Guide](configuration).

### Quick Configuration

```bash
# Copy environment template
cp .env.prod.example .env.prod

# Edit configuration
nano .env.prod
```

### Essential Variables

```bash
# Database
DB_HOST=localhost
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PASSWORD=your_redis_password

# JWT Secret (32+ characters)
JWT_SECRET=your_super_secure_jwt_secret_key

# Server
PORT=8080
ENVIRONMENT=production
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GITHUB_CLIENT_ID=your_github_client_id

# reCAPTCHA (optional)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

For complete configuration options, security settings, and environment-specific configurations, see the [Configuration Guide](configuration).

## Setup Guides

Choose the appropriate setup guide for your environment:

### Development Environment
For local development with hot reloading and debugging tools:
- **[Development Setup Guide](setup-development)** - Complete development environment setup
- Includes backend, frontend, database, and monitoring stack
- Hot reloading, debugging tools, and test data

### Production Environment
For production deployments with security and monitoring:
- **[Production Setup Guide](setup-production)** - Production deployment guide
- Multiple deployment options (Docker, Kubernetes, Cloud)
- Security hardening, monitoring, and backup procedures

### Docker Deployment
For containerized deployments using Docker and Docker Compose:
- **[Docker Deployment Guide](docker)** - Comprehensive Docker guide
- Development and production configurations
- Scaling, monitoring, and troubleshooting

## Quick Start

### Development
```bash
git clone https://github.com/your-org/bugrelay.git
cd bugrelay
./scripts/setup-dev.sh
```

### Production (Docker Compose)
```bash
git clone https://github.com/your-org/bugrelay.git
cd bugrelay
cp .env.prod.example .env.prod
# Edit .env.prod with your configuration
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Reverse Proxy Setup

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # File upload size limit
    client_max_body_size 10M;
}
```

### 5. SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Health Checks

### Application Health

```bash
# Check application status
curl -f http://localhost:8080/health || exit 1

# Check database connectivity
curl -f http://localhost:8080/health/db || exit 1

# Check Redis connectivity
curl -f http://localhost:8080/health/redis || exit 1
```

### Service Monitoring

```bash
# Check Docker services
docker-compose -f docker-compose.prod.yml ps

# Check systemd service
sudo systemctl status bugrelay

# Check logs
docker-compose -f docker-compose.prod.yml logs -f bugrelay
# or
sudo journalctl -u bugrelay -f
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  bugrelay:
    image: bugrelay/backend:latest
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - bugrelay
```

### Load Balancing

```nginx
upstream bugrelay_backend {
    server bugrelay_1:8080;
    server bugrelay_2:8080;
    server bugrelay_3:8080;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://bugrelay_backend;
        # ... other proxy settings
    }
}
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U bugrelay -d bugrelay > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/bugrelay"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U bugrelay -d bugrelay | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### File Backup

```bash
# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/bugrelay/uploads/
```

## Monitoring

### Prometheus Metrics

BugRelay exposes Prometheus metrics at `/metrics`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bugrelay'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

### Log Aggregation

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  bugrelay:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   docker-compose exec redis redis-cli ping
   
   # Check Redis logs
   docker-compose logs redis
   ```

3. **File Upload Issues**
   ```bash
   # Check upload directory permissions
   ls -la /opt/bugrelay/uploads/
   
   # Check disk space
   df -h
   ```

### Performance Issues

1. **High CPU Usage**
   - Check for inefficient database queries
   - Monitor goroutine count
   - Review rate limiting settings

2. **High Memory Usage**
   - Check for memory leaks
   - Monitor Redis memory usage
   - Review file upload handling

3. **Slow Response Times**
   - Check database query performance
   - Monitor network latency
   - Review caching configuration

## Security Considerations

### Network Security

- Use HTTPS/TLS for all communications
- Configure firewall rules
- Implement VPN for administrative access
- Regular security updates

### Application Security

- Rotate JWT secrets regularly
- Monitor for suspicious activity
- Implement proper input validation
- Use secure headers

### Data Protection

- Encrypt sensitive data at rest
- Implement proper backup encryption
- Regular security audits
- GDPR compliance measures

## Monitoring and Logging

### Monitoring Setup
BugRelay includes a comprehensive monitoring stack with Prometheus, Grafana, and AlertManager:
- **[Monitoring Guide](monitoring)** - Complete monitoring setup and configuration
- Metrics collection, dashboards, and alerting
- Performance monitoring and troubleshooting

### Logging Configuration
Structured logging with Loki and Promtail for log aggregation:
- **[Logging Guide](logging)** - Comprehensive logging configuration
- Log formats, levels, and analysis
- Security and audit logging

## Next Steps

After deployment:

1. **[Configure Monitoring](monitoring)** - Set up dashboards and alerts
2. **[Configure Logging](logging)** - Set up log aggregation and analysis
3. **[Set up Backup Procedures](#backup-and-recovery)** - Implement backup strategy
4. **[Review Security Settings](../authentication/security)** - Harden security configuration
5. **[Performance Optimization](monitoring#performance-monitoring)** - Optimize for production load