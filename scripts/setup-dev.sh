#!/bin/bash

# BugRelay Development Setup Script
# This script sets up the development environment with logging and monitoring

set -e

echo "🚀 Setting up BugRelay development environment..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/logs
mkdir -p frontend/logs
mkdir -p monitoring/data/grafana
mkdir -p monitoring/data/prometheus
mkdir -p monitoring/data/loki
mkdir -p monitoring/data/alertmanager

# Set permissions for monitoring directories
chmod 777 monitoring/data/grafana
chmod 777 monitoring/data/prometheus
chmod 777 monitoring/data/loki
chmod 777 monitoring/data/alertmanager

# Copy environment files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    cat > backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_dev
DB_USER=bugrelay_user
DB_PASSWORD=bugrelay_password
DB_SSLMODE=disable

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h

# OAuth Configuration (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OAUTH_REDIRECT_URL=http://localhost:8080/api/v1/auth/oauth/callback

# Server Configuration
ENVIRONMENT=development
PORT=8080

# reCAPTCHA Configuration (optional)
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=

# Logging Configuration
LOG_LEVEL=info
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
    cat > frontend/.env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Logging Configuration
BACKEND_LOGS_URL=http://localhost:8080
BACKEND_API_KEY=dev-api-key

# reCAPTCHA Configuration (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
EOF
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if command -v go &> /dev/null; then
    go mod tidy
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  Go not found. Please install Go to set up the backend."
fi
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if command -v npm &> /dev/null; then
    npm install
    echo "✅ Frontend dependencies installed"
elif command -v yarn &> /dev/null; then
    yarn install
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  npm or yarn not found. Please install Node.js to set up the frontend."
fi
cd ..

# Set up database (if PostgreSQL is available)
echo "🗄️  Setting up database..."
if command -v psql &> /dev/null; then
    echo "PostgreSQL found. Setting up database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw bugrelay_dev; then
        echo "Database bugrelay_dev already exists"
    else
        echo "Creating database and user..."
        sudo -u postgres psql << EOF
CREATE USER bugrelay_user WITH PASSWORD 'bugrelay_password';
CREATE DATABASE bugrelay_dev OWNER bugrelay_user;
GRANT ALL PRIVILEGES ON DATABASE bugrelay_dev TO bugrelay_user;
EOF
        echo "✅ Database created"
    fi
else
    echo "⚠️  PostgreSQL not found. Please install PostgreSQL and create the database manually."
    echo "   Database: bugrelay_dev"
    echo "   User: bugrelay_user"
    echo "   Password: bugrelay_password"
fi

# Set up Redis (if available)
echo "🔴 Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running. Please start Redis service."
    fi
else
    echo "⚠️  Redis not found. Please install Redis for caching functionality."
fi

# Set up monitoring stack
echo "📊 Setting up monitoring stack..."
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo "Docker found. You can start the monitoring stack with:"
    echo "   cd monitoring && docker-compose up -d"
    echo ""
    echo "Monitoring services will be available at:"
    echo "   - Grafana: http://localhost:3001 (admin/admin123)"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - AlertManager: http://localhost:9093"
else
    echo "⚠️  Docker not found. Monitoring stack requires Docker."
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend: cd backend && go run main.go"
echo "2. Start the frontend: cd frontend && npm run dev"
echo "3. (Optional) Start monitoring: cd monitoring && docker-compose up -d"
echo "4. (Optional) Seed database: cd backend && go run cmd/seed/main.go"
echo ""
echo "The application will be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8080"
echo "   - API Documentation: http://localhost:8080/api/v1/status"
echo ""
echo "For production deployment, see the deployment documentation."