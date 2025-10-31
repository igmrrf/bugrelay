#!/bin/bash

# BugRelay Development Startup Script with Docker
# This script starts the complete development environment using Docker Compose

set -e

echo "🚀 Starting BugRelay development environment with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Determine Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/logs
mkdir -p frontend/logs
mkdir -p monitoring/data/{grafana,prometheus,loki,alertmanager}

# Set proper permissions
chmod -R 777 monitoring/data/ 2>/dev/null || true

# Check if .env files exist, create them if they don't
echo "📝 Checking environment files..."

if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    cat > backend/.env << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=bugrelay_dev
DB_USER=bugrelay_user
DB_PASSWORD=bugrelay_password
DB_SSLMODE=disable

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h

# OAuth Configuration (optional for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OAUTH_REDIRECT_URL=http://localhost:8080/api/v1/auth/oauth/callback

# Server Configuration
ENVIRONMENT=development
PORT=8080

# reCAPTCHA Configuration (optional for development)
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_OUTPUT=both
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=3
LOG_MAX_AGE=28
LOG_COMPRESS=true
EOF
fi

if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend .env.local file..."
    cat > frontend/.env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Logging Configuration
BACKEND_LOGS_URL=http://localhost:8080
BACKEND_API_KEY=dev-api-key

# reCAPTCHA Configuration (optional for development)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=

# Development Configuration
WATCHPACK_POLLING=true
EOF
fi

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    echo "🔍 Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            echo "✅ $service_name is healthy"
            return 0
        fi
        
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to become healthy"
    return 1
}

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
$DOCKER_COMPOSE -f docker-compose.dev.yml down

# Start the infrastructure services first
echo "🏗️  Starting infrastructure services..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Start the application services
echo "🚀 Starting application services..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d backend frontend

# Wait for backend to be ready
check_service_health "Backend API" "http://localhost:8080/health"

# Start monitoring services
echo "📊 Starting monitoring services..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d grafana loki promtail prometheus node-exporter cadvisor alertmanager mailhog

# Wait a bit for services to start
sleep 5

# Run database seeder
echo "🌱 Running database seeder..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up seeder

# Show service status
echo ""
echo "📋 Service Status:"
$DOCKER_COMPOSE -f docker-compose.dev.yml ps

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📱 Application Services:"
echo "   - Frontend:          http://localhost:3000"
echo "   - Backend API:       http://localhost:8080"
echo "   - API Health:        http://localhost:8080/health"
echo "   - API Status:        http://localhost:8080/api/v1/status"
echo ""
echo "📊 Monitoring Services:"
echo "   - Grafana:           http://localhost:3001 (admin/admin123)"
echo "   - Prometheus:        http://localhost:9090"
echo "   - AlertManager:      http://localhost:9093"
echo ""
echo "🛠️  Development Tools:"
echo "   - MailHog (Email):   http://localhost:8025"
echo "   - cAdvisor:          http://localhost:8081"
echo ""
echo "🗄️  Database Services:"
echo "   - PostgreSQL:        localhost:5432 (bugrelay_user/bugrelay_password)"
echo "   - Redis:             localhost:6379"
echo ""
echo "📝 Useful Commands:"
echo "   - View logs:         $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f [service]"
echo "   - Stop all:          $DOCKER_COMPOSE -f docker-compose.dev.yml down"
echo "   - Restart service:   $DOCKER_COMPOSE -f docker-compose.dev.yml restart [service]"
echo "   - Shell access:      $DOCKER_COMPOSE -f docker-compose.dev.yml exec [service] sh"
echo "   - Seed database:     $DOCKER_COMPOSE -f docker-compose.dev.yml up seeder"
echo ""
echo "🔧 Development Features:"
echo "   - Hot reloading enabled for both frontend and backend"
echo "   - Debugger port available on :2345 for backend"
echo "   - All logs are collected and available in Grafana"
echo "   - Email testing available through MailHog"
echo ""
echo "Happy coding! 🚀"