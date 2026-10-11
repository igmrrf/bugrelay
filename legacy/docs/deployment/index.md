# Deployment

This guide covers deploying the BugRelay backend in various environments, from local development to production-ready setups.

## Overview

BugRelay supports multiple deployment options:

- **Docker Compose** - Quick local development setup
- **Docker** - Containerized production deployment
- **Kubernetes** - Scalable cloud deployment
- **Traditional** - Direct server installation

## Quick Start with Docker

The fastest way to get BugRelay running is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Start all services
docker-compose up -d

# Verify deployment
curl http://localhost:8080/health
```

This starts:
- BugRelay API server (port 8080)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Nginx reverse proxy (port 80)

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/bugrelay
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=720h

# Server
PORT=8080
HOST=0.0.0.0
ENVIRONMENT=production

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
STORAGE_TYPE=local  # or 's3'
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760  # 10MB

# Optional: S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=bugrelay-uploads

# Optional: OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Environment Files

Create environment-specific configuration files:

**.env.development**
```bash
ENVIRONMENT=development
DATABASE_URL=postgres://bugrelay:password@localhost:5432/bugrelay_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key
LOG_LEVEL=debug
```

**.env.production**
```bash
ENVIRONMENT=production
DATABASE_URL=postgres://bugrelay:secure_password@db:5432/bugrelay
REDIS_URL=redis://redis:6379
JWT_SECRET=super-secure-production-key
LOG_LEVEL=info
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Docker Deployment

### Single Container

**Dockerfile**
```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
CMD ["./main"]
```

**Build and run:**
```bash
# Build image
docker build -t bugrelay-backend .

# Run container
docker run -d \
  --name bugrelay-api \
  -p 8080:8080 \
  --env-file .env.production \
  bugrelay-backend
```

### Docker Compose (Production)

**docker-compose.prod.yml**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://bugrelay:${DB_PASSWORD}@db:5432/bugrelay
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
    networks:
      - bugrelay-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=bugrelay
      - POSTGRES_USER=bugrelay
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - bugrelay-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - bugrelay-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - bugrelay-network

volumes:
  postgres_data:
  redis_data:

networks:
  bugrelay-network:
    driver: bridge
```

**Start production deployment:**
```bash
# Set environment variables
export DB_PASSWORD=secure_database_password
export JWT_SECRET=super-secure-jwt-secret

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## Kubernetes Deployment

### Namespace and ConfigMap

**namespace.yaml**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bugrelay
```

**configmap.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bugrelay-config
  namespace: bugrelay
data:
  ENVIRONMENT: "production"
  PORT: "8080"
  HOST: "0.0.0.0"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-service:6379"
  DATABASE_URL: "postgres://bugrelay:password@postgres-service:5432/bugrelay"
```

### Secrets

**secrets.yaml**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bugrelay-secrets
  namespace: bugrelay
type: Opaque
data:
  JWT_SECRET: <base64-encoded-jwt-secret>
  DB_PASSWORD: <base64-encoded-db-password>
  SMTP_PASS: <base64-encoded-smtp-password>
```

### Database Deployment

**postgres.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: bugrelay
spec:
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
          value: bugrelay
        - name: POSTGRES_USER
          value: bugrelay
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bugrelay-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: bugrelay
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: bugrelay
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### API Deployment

**api.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bugrelay-api
  namespace: bugrelay
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bugrelay-api
  template:
    metadata:
      labels:
        app: bugrelay-api
    spec:
      containers:
      - name: api
        image: bugrelay/backend:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: bugrelay-config
        - secretRef:
            name: bugrelay-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: bugrelay-api-service
  namespace: bugrelay
spec:
  selector:
    app: bugrelay-api
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bugrelay-ingress
  namespace: bugrelay
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.bugrelay.com
    secretName: bugrelay-tls
  rules:
  - host: api.bugrelay.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bugrelay-api-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml
kubectl apply -f api.yaml

# Check deployment status
kubectl get pods -n bugrelay
kubectl get services -n bugrelay

# View logs
kubectl logs -f deployment/bugrelay-api -n bugrelay
```

## Load Balancing & Reverse Proxy

### Nginx Configuration

**nginx.conf**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream bugrelay_backend {
        server api:8080;
        # Add more servers for load balancing
        # server api2:8080;
        # server api3:8080;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    server {
        listen 80;
        server_name api.bugrelay.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.bugrelay.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://bugrelay_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth routes with stricter rate limiting
        location /api/v1/auth/ {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://bugrelay_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File uploads with larger body size
        location /api/v1/bugs/*/attachments {
            client_max_body_size 10M;
            
            proxy_pass http://bugrelay_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://bugrelay_backend;
            access_log off;
        }
    }
}
```

## Database Setup

### PostgreSQL Initialization

**init.sql**
```sql
-- Create database and user
CREATE DATABASE bugrelay;
CREATE USER bugrelay WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bugrelay TO bugrelay;

-- Connect to bugrelay database
\c bugrelay;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions
GRANT ALL ON SCHEMA public TO bugrelay;
```

### Database Migrations

Run migrations during deployment:

```bash
# Using migrate tool
migrate -path ./migrations -database $DATABASE_URL up

# Or using the application
./bugrelay-backend migrate up
```

### Database Backup

**backup.sh**
```bash
#!/bin/bash

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="bugrelay"
DB_USER="bugrelay"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --no-password --clean --create \
  > $BACKUP_DIR/bugrelay_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/bugrelay_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "bugrelay_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: bugrelay_backup_$DATE.sql.gz"
```

## Monitoring & Logging

### Health Checks

The API provides several health check endpoints:

```bash
# Basic health check
curl http://localhost:8080/health

# Detailed readiness check
curl http://localhost:8080/ready

# Metrics endpoint (Prometheus format)
curl http://localhost:8080/metrics
```

### Logging Configuration

**logrus configuration in Go:**
```go
import (
    "github.com/sirupsen/logrus"
)

func setupLogging() {
    logrus.SetFormatter(&logrus.JSONFormatter{})
    
    level, err := logrus.ParseLevel(os.Getenv("LOG_LEVEL"))
    if err != nil {
        level = logrus.InfoLevel
    }
    logrus.SetLevel(level)
    
    if os.Getenv("ENVIRONMENT") == "production" {
        logrus.SetOutput(os.Stdout)
    }
}
```

### Prometheus Monitoring

**prometheus.yml**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bugrelay-api'
    static_configs:
      - targets: ['api:8080']
    metrics_path: /metrics
    scrape_interval: 30s
```

## Security Considerations

### SSL/TLS Setup

Generate SSL certificates:

```bash
# Using Let's Encrypt with certbot
certbot certonly --webroot -w /var/www/html -d api.bugrelay.com

# Or using OpenSSL for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.bugrelay.com"
```

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw deny 8080/tcp  # Block direct API access
ufw deny 5432/tcp  # Block direct DB access
ufw enable
```

### Environment Security

```bash
# Set proper file permissions
chmod 600 .env.production
chown root:root .env.production

# Use secrets management in production
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_bugs_status ON bugs(status);
CREATE INDEX idx_bugs_priority ON bugs(priority);
CREATE INDEX idx_bugs_created_at ON bugs(created_at);
CREATE INDEX idx_bugs_company_id ON bugs(company_id);
CREATE INDEX idx_comments_bug_id ON comments(bug_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bugs WHERE status = 'open' ORDER BY created_at DESC;
```

### Redis Caching

```go
// Cache frequently accessed data
func GetBugWithCache(id string) (*Bug, error) {
    // Try cache first
    cached, err := redis.Get("bug:" + id).Result()
    if err == nil {
        var bug Bug
        json.Unmarshal([]byte(cached), &bug)
        return &bug, nil
    }
    
    // Fallback to database
    bug, err := GetBugFromDB(id)
    if err != nil {
        return nil, err
    }
    
    // Cache for 5 minutes
    bugJSON, _ := json.Marshal(bug)
    redis.Set("bug:"+id, bugJSON, 5*time.Minute)
    
    return bug, nil
}
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check database status
docker-compose ps db
docker-compose logs db

# Test connection
psql -h localhost -U bugrelay -d bugrelay
```

**2. Redis Connection Failed**
```bash
# Check Redis status
docker-compose ps redis
docker-compose logs redis

# Test connection
redis-cli ping
```

**3. High Memory Usage**
```bash
# Check container resources
docker stats

# Adjust memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

**4. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Renew Let's Encrypt certificate
certbot renew --dry-run
```

### Log Analysis

```bash
# View API logs
docker-compose logs -f api

# Search for errors
docker-compose logs api | grep ERROR

# Monitor in real-time
tail -f /var/log/bugrelay/api.log | jq '.'
```

## Scaling Considerations

### Horizontal Scaling

- Use multiple API server instances behind a load balancer
- Implement session-less authentication (JWT)
- Use Redis for shared caching
- Consider database read replicas for heavy read workloads

### Vertical Scaling

- Monitor CPU and memory usage
- Optimize database queries
- Implement connection pooling
- Use CDN for static assets

For more detailed deployment scenarios, see:
- [Configuration Guide](./configuration)
- [Docker Setup](./docker)
- [Monitoring Setup](./monitoring)