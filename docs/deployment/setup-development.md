# Development Environment Setup

This guide walks you through setting up a complete development environment for BugRelay, including the backend API, frontend, database, and monitoring stack.

## Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows with WSL2
- **CPU**: 2+ cores
- **RAM**: 8GB+ (4GB minimum)
- **Storage**: 10GB+ free space
- **Network**: Internet connection for downloading dependencies

### Required Software

1. **Go 1.21+**
   ```bash
   # macOS (using Homebrew)
   brew install go
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install golang-go
   
   # Verify installation
   go version
   ```

2. **Node.js 18+**
   ```bash
   # macOS (using Homebrew)
   brew install node
   
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **PostgreSQL 13+**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Verify installation
   psql --version
   ```

4. **Redis 6+**
   ```bash
   # macOS (using Homebrew)
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install redis-server
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   
   # Verify installation
   redis-cli ping
   ```

5. **Docker & Docker Compose** (Optional, for monitoring)
   ```bash
   # macOS (using Homebrew)
   brew install --cask docker
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   
   # Verify installation
   docker --version
   docker-compose --version
   ```

### Optional Tools

- **Air** (for Go hot reloading)
  ```bash
  go install github.com/cosmtrek/air@latest
  ```

- **Git** (for version control)
  ```bash
  # macOS (using Homebrew)
  brew install git
  
  # Ubuntu/Debian
  sudo apt install git
  ```

## Quick Setup

Use the automated setup script for the fastest setup:

```bash
# Clone the repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Run the setup script
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

The script will:
- Create necessary directories
- Set up environment files
- Install dependencies
- Configure database and Redis
- Set up monitoring stack

## Manual Setup

If you prefer to set up manually or the script fails:

### 1. Clone Repository

```bash
git clone https://github.com/your-org/bugrelay.git
cd bugrelay
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE USER bugrelay_user WITH PASSWORD 'bugrelay_password';
CREATE DATABASE bugrelay_dev OWNER bugrelay_user;
GRANT ALL PRIVILEGES ON DATABASE bugrelay_dev TO bugrelay_user;

# Exit psql
\q
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment file
cp .env.example .env

# Edit configuration (see Configuration section below)
nano .env

# Install dependencies
go mod tidy

# Run database migrations (if available)
go run cmd/migrate/main.go up

# Start the backend server
go run main.go
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Copy environment file
cp .env.example .env.local

# Edit configuration
nano .env.local

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 5. Monitoring Setup (Optional)

```bash
# Navigate to monitoring directory
cd monitoring

# Start monitoring stack
docker-compose up -d

# Check services
docker-compose ps
```

## Configuration

### Backend Configuration

Edit `backend/.env`:

```bash
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

# Server Configuration
ENVIRONMENT=development
PORT=8080

# OAuth Configuration (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OAUTH_REDIRECT_URL=http://localhost:8080/api/v1/auth/oauth/callback

# reCAPTCHA Configuration (optional)
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=text
LOG_OUTPUT=stdout
```

### Frontend Configuration

Edit `frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Logging Configuration
BACKEND_LOGS_URL=http://localhost:8080
BACKEND_API_KEY=dev-api-key

# reCAPTCHA Configuration (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

## Running the Application

### Option 1: Manual Start

```bash
# Terminal 1: Start backend
cd backend
go run main.go

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start monitoring (optional)
cd monitoring
docker-compose up -d
```

### Option 2: Using Air (Hot Reloading)

```bash
# Terminal 1: Start backend with hot reloading
cd backend
air

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Option 3: Using Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Accessing Services

Once everything is running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/api/v1/status
- **Grafana** (if monitoring enabled): http://localhost:3001 (admin/admin123)
- **Prometheus** (if monitoring enabled): http://localhost:9090
- **AlertManager** (if monitoring enabled): http://localhost:9093

## Development Workflow

### 1. Code Changes

- Backend changes trigger automatic restart with Air
- Frontend changes trigger hot reload automatically
- Database schema changes require manual migration

### 2. Testing

```bash
# Run backend tests
cd backend
go test ./...

# Run frontend tests
cd frontend
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### 3. Database Operations

```bash
# Connect to database
psql -h localhost -U bugrelay_user -d bugrelay_dev

# Run migrations
cd backend
go run cmd/migrate/main.go up

# Seed database with test data
go run cmd/seed/main.go

# Reset database
go run cmd/migrate/main.go down
go run cmd/migrate/main.go up
go run cmd/seed/main.go
```

### 4. Debugging

#### Backend Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug go run main.go

# Use Delve debugger
dlv debug main.go

# Debug with Air
air -d
```

#### Frontend Debugging

```bash
# Enable debug mode
DEBUG=* npm run dev

# Use browser dev tools
# Open http://localhost:3000 and press F12
```

### 5. API Testing

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test API status
curl http://localhost:8080/api/v1/status

# Test bug creation (with auth)
curl -X POST http://localhost:8080/api/v1/bugs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test bug",
    "description": "This is a test bug report",
    "application_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port 8080
   lsof -i :8080
   
   # Kill process
   kill -9 PID
   
   # Or use different port
   PORT=8081 go run main.go
   ```

2. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   brew services list | grep postgresql  # macOS
   sudo systemctl status postgresql      # Linux
   
   # Restart PostgreSQL
   brew services restart postgresql      # macOS
   sudo systemctl restart postgresql     # Linux
   
   # Check connection
   psql -h localhost -U bugrelay_user -d bugrelay_dev
   ```

3. **Redis Connection Failed**
   ```bash
   # Check Redis status
   brew services list | grep redis       # macOS
   sudo systemctl status redis-server    # Linux
   
   # Restart Redis
   brew services restart redis           # macOS
   sudo systemctl restart redis-server   # Linux
   
   # Test connection
   redis-cli ping
   ```

4. **Go Module Issues**
   ```bash
   # Clean module cache
   go clean -modcache
   
   # Re-download dependencies
   go mod download
   
   # Tidy modules
   go mod tidy
   ```

5. **Node.js Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Use different Node version (with nvm)
   nvm use 18
   ```

### Performance Issues

1. **Slow Database Queries**
   ```bash
   # Enable query logging in PostgreSQL
   # Edit postgresql.conf:
   log_statement = 'all'
   log_duration = on
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **High Memory Usage**
   ```bash
   # Monitor Go memory usage
   go tool pprof http://localhost:8080/debug/pprof/heap
   
   # Monitor system resources
   htop
   ```

3. **Slow Frontend Build**
   ```bash
   # Use faster build tool
   npm install --save-dev @next/bundle-analyzer
   
   # Analyze bundle size
   ANALYZE=true npm run build
   ```

### Debugging Tips

1. **Enable Verbose Logging**
   ```bash
   # Backend
   LOG_LEVEL=debug go run main.go
   
   # Frontend
   DEBUG=* npm run dev
   ```

2. **Use Development Tools**
   ```bash
   # Go debugging with Delve
   dlv debug main.go
   
   # Node.js debugging
   node --inspect-brk=0.0.0.0:9229 server.js
   ```

3. **Database Debugging**
   ```sql
   -- Enable query logging
   SET log_statement = 'all';
   
   -- Check active connections
   SELECT * FROM pg_stat_activity;
   
   -- Check database size
   SELECT pg_size_pretty(pg_database_size('bugrelay_dev'));
   ```

## IDE Setup

### VS Code

Recommended extensions:
- Go (official Go extension)
- PostgreSQL (for database management)
- Redis (for Redis management)
- Docker (for container management)
- Thunder Client (for API testing)

Settings (`.vscode/settings.json`):
```json
{
  "go.toolsManagement.checkForUpdates": "local",
  "go.useLanguageServer": true,
  "go.formatTool": "goimports",
  "go.lintTool": "golangci-lint",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### GoLand/IntelliJ

1. Install Go plugin
2. Configure Go SDK path
3. Set up database connection
4. Configure run configurations

## Next Steps

After setting up the development environment:

1. **Explore the API**: Use the interactive API documentation
2. **Run Tests**: Execute the test suite to ensure everything works
3. **Make Changes**: Start developing new features
4. **Set up Monitoring**: Configure Grafana dashboards for development
5. **Read Documentation**: Familiarize yourself with the codebase

## Additional Resources

- [Configuration Guide](configuration.md)
- [API Documentation](../api/README.md)
- [Authentication Guide](../authentication/README.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
- [Contributing Guidelines](../../CONTRIBUTE.md)