# Production Environment Setup

This guide covers deploying BugRelay to production with high availability, security, and monitoring. It includes multiple deployment options and best practices for production environments.

## Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

**Recommended Requirements:**
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD with backup
- **Network**: 1 Gbps
- **Load Balancer**: For high availability

### Infrastructure Requirements

1. **Domain Name**: Registered domain with DNS control
2. **SSL Certificate**: Valid SSL certificate (Let's Encrypt recommended)
3. **Database**: PostgreSQL 13+ (managed service recommended)
4. **Cache**: Redis 6+ (managed service recommended)
5. **Storage**: File storage for uploads (S3-compatible recommended)
6. **Monitoring**: Log aggregation and metrics collection
7. **Backup**: Automated backup solution

## Deployment Options

### Option 1: Docker Compose (Recommended)

Best for small to medium deployments with single-server setup.

**Advantages:**
- Easy to deploy and manage
- All services included
- Consistent environment
- Built-in health checks

**Use Cases:**
- Small to medium applications
- Single server deployments
- Quick production setup

### Option 2: Kubernetes

Best for large-scale deployments requiring high availability.

**Advantages:**
- Auto-scaling
- Rolling updates
- Service discovery
- Multi-region support

**Use Cases:**
- Enterprise deployments
- High-traffic applications
- Multi-region setups

### Option 3: Cloud Services

Best for managed infrastructure with minimal operational overhead.

**Advantages:**
- Managed databases and cache
- Auto-scaling
- Built-in monitoring
- Reduced operational overhead

**Use Cases:**
- Teams without DevOps expertise
- Rapid scaling requirements
- Compliance requirements

## Docker Compose Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/bugrelay
cd /opt/bugrelay

# Download production files
wget https://github.com/your-org/bugrelay/archive/main.zip
unzip main.zip
mv bugrelay-main/* .
rm -rf bugrelay-main main.zip

# Set up environment
cp .env.prod.example .env.prod
```

### 3. Configuration

Edit `.env.prod` with your production values:

```bash
# Database Configuration
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=your_secure_database_password

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_REDIRECT_URL=https://yourdomain.com/api/v1/auth/oauth/callback

# reCAPTCHA Configuration
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# Domain Configuration
DOMAIN=yourdomain.com
```

### 4. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Custom Certificate

```bash
# Create SSL directory
sudo mkdir -p /opt/bugrelay/ssl

# Copy your certificate files
sudo cp your-certificate.crt /opt/bugrelay/ssl/
sudo cp your-private-key.key /opt/bugrelay/ssl/

# Set proper permissions
sudo chmod 600 /opt/bugrelay/ssl/*
```

### 5. Deployment

```bash
# Deploy using the automated script
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh

# Or deploy manually
docker-compose -f docker-compose.prod.yml up -d

# Check deployment
docker-compose -f docker-compose.prod.yml ps
```

### 6. Verification

```bash
# Check service health
curl -f https://yourdomain.com/health
curl -f https://yourdomain.com/api/v1/status

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Kubernetes Deployment

### 1. Cluster Setup

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

### 2. Namespace and Secrets

```bash
# Create namespace
kubectl create namespace bugrelay

# Create secrets
kubectl create secret generic bugrelay-secrets \
  --from-literal=db-password=your_secure_password \
  --from-literal=redis-password=your_redis_password \
  --from-literal=jwt-secret=your_jwt_secret \
  --namespace=bugrelay

# Create TLS secret
kubectl create secret tls bugrelay-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=bugrelay
```

### 3. Database Setup

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: bugrelay
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: bugrelay_production
        - name: POSTGRES_USER
          value: bugrelay_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bugrelay-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

### 4. Application Deployment

```yaml
# backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: bugrelay
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: bugrelay/backend:latest
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bugrelay-secrets
              key: db-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: bugrelay-secrets
              key: jwt-secret
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 5. Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bugrelay-ingress
  namespace: bugrelay
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: bugrelay-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8080
```

## Cloud Services Deployment

### AWS Deployment

#### Using AWS ECS with Fargate

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure

# Create ECS cluster
aws ecs create-cluster --cluster-name bugrelay-production

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster bugrelay-production \
  --service-name bugrelay-backend \
  --task-definition bugrelay-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### Using AWS App Runner

```yaml
# apprunner.yaml
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Build started on `date`"
      - docker build -t bugrelay-backend .
run:
  runtime-version: latest
  command: ./main
  network:
    port: 8080
    env: PORT
  env:
    - name: DB_HOST
      value: your-rds-endpoint
    - name: REDIS_HOST
      value: your-elasticache-endpoint
```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Build and push image
gcloud builds submit --tag gcr.io/PROJECT-ID/bugrelay-backend

# Deploy to Cloud Run
gcloud run deploy bugrelay-backend \
  --image gcr.io/PROJECT-ID/bugrelay-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DB_HOST=your-cloud-sql-ip,REDIS_HOST=your-memorystore-ip
```

### Azure Deployment

#### Using Container Instances

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Create resource group
az group create --name bugrelay-rg --location eastus

# Create container instance
az container create \
  --resource-group bugrelay-rg \
  --name bugrelay-backend \
  --image bugrelay/backend:latest \
  --dns-name-label bugrelay-api \
  --ports 8080 \
  --environment-variables \
    DB_HOST=your-postgres-server.postgres.database.azure.com \
    REDIS_HOST=your-redis-cache.redis.cache.windows.net
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Or configure iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure Fail2Ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local
# Set: enabled = true, bantime = 3600, maxretry = 3

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 3. Security Headers

Nginx configuration for security headers:

```nginx
# /etc/nginx/conf.d/security.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Monitoring and Logging

### 1. Prometheus and Grafana

```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

volumes:
  prometheus_data:
  grafana_data:
```

### 2. Log Aggregation

```yaml
# logging/docker-compose.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

volumes:
  loki_data:
```

## Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/opt/backups/bugrelay"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="bugrelay_production"
DB_USER="bugrelay_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
docker-compose exec -T postgres pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/database/

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### 2. File Backup

```bash
#!/bin/bash
# backup-files.sh

BACKUP_DIR="/opt/backups/bugrelay"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOAD_DIR="/opt/bugrelay/uploads"

# Create backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/uploads_$DATE.tar.gz s3://your-backup-bucket/uploads/

# Keep only last 7 days for file backups
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "File backup completed: uploads_$DATE.tar.gz"
```

### 3. Automated Backup Schedule

```bash
# Add to crontab
crontab -e

# Database backup every 6 hours
0 */6 * * * /opt/bugrelay/scripts/backup-db.sh

# File backup daily at 2 AM
0 2 * * * /opt/bugrelay/scripts/backup-files.sh

# System backup weekly
0 3 * * 0 /opt/bugrelay/scripts/backup-system.sh
```

## Performance Optimization

### 1. Database Optimization

```sql
-- PostgreSQL configuration optimizations
-- Edit postgresql.conf

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
max_prepared_transactions = 100

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on

# Performance
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 2. Redis Optimization

```bash
# Redis configuration optimizations
# Edit redis.conf

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0

# Security
requirepass your_secure_redis_password
```

### 3. Application Optimization

```bash
# Go application optimizations
# Environment variables

# Garbage collector
GOGC=100
GOMEMLIMIT=1GiB

# Runtime
GOMAXPROCS=4
GODEBUG=gctrace=1

# Connection pooling
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
```

## Scaling

### 1. Horizontal Scaling

```yaml
# docker-compose.prod.yml - scaled version
version: '3.8'
services:
  backend:
    image: bugrelay/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

### 2. Load Balancer Configuration

```nginx
# nginx.conf - load balancing
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
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

## Maintenance

### 1. Updates and Patches

```bash
#!/bin/bash
# update-production.sh

# Backup before update
./scripts/backup-db.sh
./scripts/backup-files.sh

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
sleep 30
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend

# Verify deployment
curl -f https://yourdomain.com/health || exit 1

# Clean up old images
docker image prune -f

echo "Update completed successfully"
```

### 2. Health Monitoring

```bash
#!/bin/bash
# health-check.sh

ENDPOINTS=(
    "https://yourdomain.com/health"
    "https://yourdomain.com/api/v1/status"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if ! curl -f -s "$endpoint" > /dev/null; then
        echo "ALERT: $endpoint is not responding"
        # Send alert (email, Slack, PagerDuty, etc.)
        exit 1
    fi
done

echo "All endpoints are healthy"
```

### 3. Log Rotation

```bash
# /etc/logrotate.d/bugrelay
/opt/bugrelay/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/bugrelay/docker-compose.prod.yml restart backend
    endscript
}
```

## Troubleshooting

### Common Production Issues

1. **High CPU Usage**
   ```bash
   # Check container stats
   docker stats
   
   # Check Go profiling
   curl http://localhost:8080/debug/pprof/profile?seconds=30 > cpu.prof
   go tool pprof cpu.prof
   ```

2. **Memory Leaks**
   ```bash
   # Check memory usage
   docker exec backend_container_name cat /proc/meminfo
   
   # Go heap profiling
   curl http://localhost:8080/debug/pprof/heap > heap.prof
   go tool pprof heap.prof
   ```

3. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate expiry
   openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"
   
   # Test SSL configuration
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS enabled for all connections
- [ ] Firewall configured properly
- [ ] Regular security updates applied
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Rate limiting configured
- [ ] Security headers implemented
- [ ] OAuth properly configured
- [ ] Database access restricted
- [ ] Redis authentication enabled
- [ ] File upload restrictions in place

## Next Steps

After production deployment:

1. **Set up monitoring dashboards**
2. **Configure alerting rules**
3. **Test backup and recovery procedures**
4. **Implement CI/CD pipeline**
5. **Set up log analysis**
6. **Plan scaling strategy**
7. **Schedule regular maintenance**

## Additional Resources

- [Configuration Guide](configuration.md)
- [Monitoring Documentation](monitoring.md)
- [Security Best Practices](../authentication/security.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
- [API Documentation](../api/README.md)