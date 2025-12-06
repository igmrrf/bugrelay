# Design Document

## Overview

Consolidate the fragmented Docker setup into a simple, unified system with two modes: development and production. Replace multiple Docker Compose files and scripts with a single, clean interface.

## Architecture

### Simple Structure
```
docker-compose.yml              # Single compose file with profiles
.env.example                   # Template with all variables
.env                          # Active configuration (git-ignored)
Makefile                      # Simple commands (dev, prod, clean)
```

### Key Principles
1. **Single Docker Compose file** with profiles for dev/prod
2. **Single environment file** with clear defaults
3. **Simple Makefile commands** for all operations
4. **No complex scripts** - everything through make/docker-compose
5. **Minimal configuration** - sensible defaults for everything

## Components

### 1. Unified Docker Compose

Use Docker Compose profiles to handle dev vs prod:
```yaml
services:
  # Core services (always run)
  postgres: ...
  redis: ...
  
  # App services
  backend:
    profiles: ["dev", "prod"]
    # Different configs based on profile
  
  frontend:
    profiles: ["dev", "prod"]
  
  # Dev-only services
  mailhog:
    profiles: ["dev"]
  
  # Prod-only services  
  nginx:
    profiles: ["prod"]
```

### 2. Simple Environment Management

Single `.env` file with clear sections:
```bash
# Database
DB_HOST=postgres
DB_NAME=bugrelay
DB_USER=bugrelay_user
DB_PASSWORD=bugrelay_password

# Application  
JWT_SECRET=your-secret-here
ENVIRONMENT=development

# Monitoring (optional)
GRAFANA_PASSWORD=admin123
```

### 3. Clean Makefile Interface

```makefile
dev:           # Start development environment
prod:          # Start production environment  
stop:          # Stop all services
clean:         # Remove containers and volumes
logs:          # View logs
shell:         # Access backend shell
```

## Implementation Details

### Docker Compose Profiles

**Development Profile (`make dev`)**:
- Backend with hot reload (Air)
- Frontend with hot reload (Next.js dev)
- PostgreSQL + Redis
- Grafana + Prometheus (optional)
- MailHog for email testing
- Exposed ports for debugging

**Production Profile (`make prod`)**:
- Backend optimized build
- Frontend optimized build  
- PostgreSQL + Redis (secured)
- Nginx reverse proxy
- Full monitoring stack
- SSL termination
- No exposed debug ports

### Environment Variables

All services read from single `.env` file:
- **Backend**: DB_*, JWT_*, REDIS_*, etc.
- **Frontend**: NEXT_PUBLIC_API_URL, etc.
- **Monitoring**: GRAFANA_*, PROMETHEUS_*, etc.
- **Infrastructure**: POSTGRES_*, etc.

### Makefile Commands

```makefile
.PHONY: help dev prod stop clean logs shell seed

help:          # Show available commands
dev:           # docker-compose --profile dev up -d
prod:          # docker-compose --profile prod up -d  
stop:          # docker-compose down
clean:         # docker-compose down -v --remove-orphans
logs:          # docker-compose logs -f
shell:         # docker-compose exec backend sh
seed:          # docker-compose exec backend go run cmd/seed/main.go
```

## Migration Strategy

1. **Replace existing files**:
   - Merge `docker-compose.*.yml` → single `docker-compose.yml`
   - Merge environment files → single `.env.example`
   - Replace complex scripts → simple Makefile

2. **Update Makefile**:
   - Remove complex targets
   - Add simple profile-based commands
   - Keep essential utilities (clean, logs, shell)

3. **Simplify setup**:
   - Single command to start: `make dev`
   - Single command to stop: `make stop`
   - Single command to clean: `make clean`

## Technology Versions

All technologies updated to latest stable/LTS versions (as of October 2024):

### Infrastructure
- **PostgreSQL**: 17-alpine (latest stable, upgrade from 15)
- **Redis**: 7.4-alpine (latest stable, current is 7.x)
- **Nginx**: 1.27-alpine (latest stable)

### Application Runtime
- **Go**: 1.23-alpine (latest stable, upgrade from 1.21)
- **Node.js**: 22-alpine (latest LTS, upgrade from 18)

### Monitoring Stack
- **Grafana**: 11.3 (latest stable)
- **Prometheus**: 2.55 (latest stable)
- **Loki**: 3.2 (latest stable)
- **AlertManager**: 0.27 (latest stable)

### Development Tools
- **Air**: v1.52 (Go hot reload)
- **MailHog**: v1.0.1 (email testing)

### Version Pinning Strategy
```dockerfile
# Pin specific versions for production stability
FROM postgres:17.0-alpine
FROM redis:7.4.1-alpine  
FROM golang:1.23.2-alpine
FROM node:22.9-alpine
FROM grafana/grafana:11.3.0
FROM prom/prometheus:v2.55.0
```

## Benefits

- **Simplicity**: One file, one command to start
- **Consistency**: Same interface for dev and prod
- **Maintainability**: No duplicate configurations
- **Clarity**: Clear separation of concerns via profiles
- **Speed**: Faster startup, easier debugging
- **Security**: Latest versions with security patches
- **Performance**: Optimized latest stable releases