# BugRelay - Public Bug Tracking Platform

A modern, scalable bug tracking platform that bridges the gap between users who discover bugs and companies who need to fix them.

## Architecture

- **Frontend**: Next.js 15 with TypeScript and TailwindCSS
- **Backend**: Go with Gin framework
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT with OAuth integration (Google, GitHub)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Go 1.21+ (for local development)

### Development Setup

1. **Clone and setup the project:**
   ```bash
   git clone <repository-url>
   cd bugrelay
   make setup
   ```

2. **Start the development environment:**
   ```bash
   # Start all services with Docker (recommended)
   make docker-up
   
   # Or run services individually in separate terminals
   make dev-frontend
   make dev-backend
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Health check: http://localhost:8080/health

### Environment Configuration

Copy the example environment file and configure as needed:

```bash
cp backend/.env.example backend/.env
```

Key environment variables:
- `DB_*`: Database connection settings
- `REDIS_*`: Redis connection settings  
- `JWT_SECRET`: JWT signing secret (change in production)

### Available Commands

```bash
# Setup
make setup               # Install all dependencies
make setup-frontend      # Install frontend dependencies only
make setup-backend       # Install backend dependencies only

# Development
make dev-frontend        # Start frontend development server
make dev-backend         # Start backend development server

# Docker
make docker-up           # Start all services with Docker
make docker-down         # Stop all Docker services

# Build
make build               # Build both frontend and backend
make build-frontend      # Build frontend only
make build-backend       # Build backend only

# Database
make db-migrate-up       # Run database migrations
make db-migrate-down     # Rollback database migrations

# Testing & Linting
make test-frontend       # Run frontend tests
make test-backend        # Run backend tests
make lint-frontend       # Type check frontend
make lint-backend        # Lint and format backend

# Utilities
make clean               # Clean build artifacts
make help                # Show all available commands
```

## Project Structure

```
bugrelay/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js 13+ app directory
│   │   ├── components/      # Reusable React components
│   │   ├── lib/            # Utility functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Go backend application
│   ├── internal/
│   │   ├── config/         # Configuration management
│   │   ├── database/       # Database connection and models
│   │   ├── redis/          # Redis client setup
│   │   ├── router/         # HTTP routing and middleware
│   │   ├── handlers/       # HTTP request handlers
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migration files
│   ├── go.mod
│   └── main.go
├── docker-compose.yml      # Docker services configuration
└── package.json           # Root package.json for scripts
```

## Development Workflow

1. **Database Changes**: Add migration files in `backend/migrations/`
2. **API Development**: Add handlers in `backend/internal/handlers/`
3. **Frontend Development**: Add components in `frontend/src/components/`
4. **State Management**: Use Zustand stores in `frontend/src/store/`

## Features (Planned)

- ✅ Project structure and development environment
- 🔄 User authentication (JWT + OAuth)
- 🔄 Bug submission and management
- 🔄 Company verification and claiming
- 🔄 Admin moderation tools
- 🔄 Real-time updates and notifications

## Contributing

1. Follow the established project structure
2. Use TypeScript for all frontend code
3. Follow Go conventions for backend code
4. Add tests for new functionality
5. Update documentation as needed

## License

[Add your license information here]