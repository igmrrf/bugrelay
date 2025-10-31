# Docker Deployment Guide

This guide covers deploying BugRelay using Docker and Docker Compose, including development, staging, and production configurations.

## Overview

BugRelay provides multiple Docker configurations:

- **Development**: Hot reloading, debugging tools, monitoring stack
- **Production**: Optimized builds, security hardening, full monitoring
- **Staging**: Production-like environment with debug capabilities

## Prerequisites

### System Requirements

- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+ (or docker-compose 1.29+)
- **RAM**: 4GB+ (8GB+ recommended for full stack)
- **Storage**: 10GB+ free space
- **Network**: Internet connection for image downloads

### Installation

#### Docker Installation

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install dependencies
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**macOS:**
```bash
# Using Homebrew
brew install --cask docker

# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

**Windows:**
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Or use WSL2 with Ubuntu and follow Linux instructions
```

#### Docker Compose Installation

**Linux:**
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

**macOS/Windows:**
Docker Compose is included with Docker Desktop.

## Docker Images

### Backend Image

The backend uses a multi-stage Dockerfile for optimized production builds:

```dockerfile
# Production Dockerfile
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binary and migrations
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./main"]
```

### Frontend Image

The frontend uses Next.js with optimized production builds:

```dockerfile
# Production Dockerfile
FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

## Development Environment

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Development Configuration

The development configuration includes:

- **Hot reloading** for both backend and frontend
- **Debug ports** exposed for debugging
- **Volume mounts** for live code editing
- **Monitoring stack** (Grafana, Prometheus, Loki)
- **Development tools** (Mailhog for email testing)

```yaml
# docker-compose.dev.yml (excerpt)
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
      - "2345:2345"  # Delve debugger
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app
      - backend_logs:/app/logs
    command: air -c .air.toml

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - WATCHPACK_POLLING=true
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
```

### Development Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start specific service
docker-compose -f docker-compose.dev.yml up -d backend

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec backend go run cmd/seed/main.go

# Rebuild services
docker-compose -f docker-compose.dev.yml build --no-cache

# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Development Debugging

#### Backend Debugging with Delve

```bash
# Start backend in debug mode
docker-compose -f docker-compose.dev.yml up -d backend

# Connect debugger (VS Code launch.json)
{
  "name": "Connect to server",
  "type": "go",
  "request": "attach",
  "mode": "remote",
  "remotePath": "/app",
  "port": 2345,
  "host": "127.0.0.1"
}
```

#### Frontend Debugging

```bash
# Enable debug mode
docker-compose -f docker-compose.dev.yml exec frontend npm run dev -- --inspect=0.0.0.0:9229

# Connect Chrome DevTools to localhost:9229
```

## Production Environment

### Quick Deployment

```bash
# Clone repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Configure environment
cp .env.prod.example .env.prod
nano .env.prod

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Production Configuration

The production configuration includes:

- **Optimized builds** with multi-stage Dockerfiles
- **Security hardening** with non-root users
- **Health checks** for all services
- **Resource limits** and restart policies
- **Monitoring and logging** stack
- **Reverse proxy** with SSL termination

```yaml
# docker-compose.prod.yml (excerpt)
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - ENVIRONMENT=production
      - LOG_LEVEL=info
    volumes:
      - backend_logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

### Production Security

#### SSL/TLS Configuration

```nginx
# nginx/nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Environment Security

```bash
# .env.prod security checklist
# ✓ Strong database passwords
DB_PASSWORD=complex_password_with_special_chars_123!

# ✓ Secure JWT secret (32+ characters)
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters_long

# ✓ Redis authentication
REDIS_PASSWORD=secure_redis_password_123!

# ✓ HTTPS URLs for OAuth
OAUTH_REDIRECT_URL=https://yourdomain.com/api/v1/auth/oauth/callback

# ✓ Production environment
ENVIRONMENT=production

# ✓ Restricted CORS origins
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Monitoring and Logging

### Monitoring Stack

The monitoring stack includes:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection
- **AlertManager**: Alerting

```yaml
# Monitoring services in docker-compose.prod.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus/prometheus.prod.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    volumes:
      - ./monitoring/loki/config.prod.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    restart: unless-stopped
```

### Log Configuration

```yaml
# Promtail configuration for log collection
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          source: attrs
          expressions:
            tag:
      - regex:
          source: tag
          expression: (?P<container_name>(?:[^|]*))\|(?P<image_name>(?:[^|]*))\|(?P<image_id>(?:[^|]*))\|(?P<container_id>(?:[^|]*))
      - timestamp:
          source: time
          format: RFC3339Nano
      - labels:
          stream:
          container_name:
          image_name:
          image_id:
          container_id:
      - output:
          source: output
```

## Scaling and Load Balancing

### Horizontal Scaling

```yaml
# docker-compose.prod.yml with scaling
version: '3.8'

services:
  backend:
    image: bugrelay/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/load-balancer.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

### Load Balancer Configuration

```nginx
# nginx/load-balancer.conf
upstream backend_servers {
    least_conn;
    server backend_1:8080 max_fails=3 fail_timeout=30s;
    server backend_2:8080 max_fails=3 fail_timeout=30s;
    server backend_3:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health checks
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# scripts/backup-docker.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="docker-compose.prod.yml"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U bugrelay_user -d bugrelay_production | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup volumes
docker run --rm -v bugrelay_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_volume_$DATE.tar.gz -C /data .

# Backup uploaded files
docker run --rm -v bugrelay_uploads:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

echo "Backup completed: $DATE"
```

### Restore Procedure

```bash
#!/bin/bash
# scripts/restore-docker.sh

BACKUP_FILE=$1
COMPOSE_FILE="docker-compose.prod.yml"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop services
docker-compose -f $COMPOSE_FILE down

# Restore database
gunzip -c $BACKUP_FILE | docker-compose -f $COMPOSE_FILE exec -T postgres psql -U bugrelay_user -d bugrelay_production

# Start services
docker-compose -f $COMPOSE_FILE up -d

echo "Restore completed"
```

## Performance Optimization

### Resource Limits

```yaml
# Resource limits in docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### Image Optimization

```dockerfile
# Optimized Dockerfile techniques

# Use specific versions
FROM golang:1.21-alpine AS builder

# Combine RUN commands to reduce layers
RUN apk add --no-cache git ca-certificates tzdata && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Use .dockerignore to exclude unnecessary files
# .dockerignore
.git
.gitignore
README.md
Dockerfile*
docker-compose*
.env*
logs/
tmp/
*.log

# Multi-stage builds for smaller images
FROM alpine:latest AS runtime
COPY --from=builder /app/main .
```

## Troubleshooting

### Common Issues

1. **Container Won't Start**
   ```bash
   # Check container logs
   docker-compose logs backend
   
   # Check container status
   docker-compose ps
   
   # Inspect container
   docker inspect bugrelay_backend_1
   ```

2. **Database Connection Issues**
   ```bash
   # Check database container
   docker-compose exec postgres pg_isready -U bugrelay_user
   
   # Check network connectivity
   docker-compose exec backend ping postgres
   
   # Check environment variables
   docker-compose exec backend env | grep DB_
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   docker stats
   
   # Check container limits
   docker inspect bugrelay_backend_1 | grep -i memory
   
   # Increase memory limits
   # Edit docker-compose.yml and add:
   deploy:
     resources:
       limits:
         memory: 1G
   ```

4. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :8080
   
   # Change port in docker-compose.yml
   ports:
     - "8081:8080"  # Use different host port
   ```

### Debugging Commands

```bash
# View all containers
docker ps -a

# View container logs
docker logs -f container_name

# Execute shell in container
docker exec -it container_name /bin/sh

# Check container resource usage
docker stats container_name

# Inspect container configuration
docker inspect container_name

# View Docker networks
docker network ls

# View Docker volumes
docker volume ls

# Clean up unused resources
docker system prune -a
```

### Health Check Debugging

```bash
# Test health check manually
docker exec backend_container wget --spider http://localhost:8080/health

# Check health status
docker inspect --format='{{.State.Health.Status}}' backend_container

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' backend_container
```

## Best Practices

### Security Best Practices

1. **Use non-root users in containers**
2. **Scan images for vulnerabilities**
3. **Use specific image tags, not 'latest'**
4. **Limit container capabilities**
5. **Use secrets management for sensitive data**
6. **Enable Docker Content Trust**
7. **Regularly update base images**

### Performance Best Practices

1. **Use multi-stage builds**
2. **Optimize layer caching**
3. **Set appropriate resource limits**
4. **Use health checks**
5. **Implement proper logging**
6. **Monitor container metrics**
7. **Use volume mounts for persistent data**

### Operational Best Practices

1. **Use Docker Compose for orchestration**
2. **Implement proper backup strategies**
3. **Set up monitoring and alerting**
4. **Use configuration management**
5. **Implement CI/CD pipelines**
6. **Document deployment procedures**
7. **Test disaster recovery procedures**

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push images
        run: |
          docker build -t bugrelay/backend:${{ github.sha }} ./backend
          docker build -t bugrelay/frontend:${{ github.sha }} ./frontend
          
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA ./backend
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA ./frontend
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - docker-compose -f docker-compose.prod.yml pull
    - docker-compose -f docker-compose.prod.yml up -d
  only:
    - main
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Configuration Guide](configuration)
- [Production Setup Guide](setup-production)
- [Monitoring Documentation](monitoring)