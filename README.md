# BugRelay - Public Bug Tracking Platform

A modern, scalable bug tracking platform that bridges the gap between users who discover bugs and companies who need to fix them.

## 📚 Documentation

**🚀 Live Documentation: http://localhost:3001/ (when running locally)**

Our comprehensive documentation system includes:

- **[Quick Start Guide](docs/guides/quick-start.md)** - Get up and running in minutes with complete examples
- **[API Reference](docs/api/)** - Complete REST API documentation with interactive examples
- **[Authentication Guide](docs/authentication/)** - JWT and OAuth implementation with code samples
- **[Data Models](docs/models/)** - Database schemas, relationships, and JSON schemas
- **[Deployment Guide](docs/deployment/)** - Docker, Kubernetes, and production setup instructions
- **[MCP Integration](docs/mcp/)** - AI system integration via Model Context Protocol

### Documentation Features

- **Interactive Examples**: Test API endpoints directly in the browser
- **Auto-Generated Content**: API docs generated from Go codebase
- **Multi-Language Examples**: Code samples in JavaScript, Python, Go, and curl
- **Comprehensive Guides**: Step-by-step tutorials for all major features
- **Search & Navigation**: Fast search and intuitive navigation
- **Mobile Friendly**: Responsive design for all devices

## Architecture

- **Frontend**: Next.js 15 with TypeScript and TailwindCSS
- **Backend**: Go with Gin framework
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT with OAuth integration (Google, GitHub)
- **Documentation**: VitePress with automated generation from codebase

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
   make dev-docs        # Start documentation server
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Documentation: http://localhost:3001
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
make dev-docs            # Start documentation development server

# Docker
make docker-up           # Start all services with Docker
make docker-down         # Stop all Docker services

# Build
make build               # Build both frontend and backend
make build-frontend      # Build frontend only
make build-backend       # Build backend only
make build-docs          # Build documentation site

# Documentation
make docs-generate       # Generate API docs from codebase
make docs-validate       # Validate generated documentation
make docs-test           # Run documentation tests

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
├── docs/                    # VitePress documentation
│   ├── api/                # API reference documentation
│   ├── authentication/     # Auth guides and examples
│   ├── deployment/         # Setup and deployment guides
│   ├── guides/             # Tutorials and how-tos
│   ├── models/             # Data model documentation
│   ├── mcp/                # AI integration (MCP) docs
│   ├── scripts/            # Documentation generation scripts
│   ├── .vitepress/         # VitePress configuration
│   └── package.json
├── docker-compose.yml      # Docker services configuration
└── package.json           # Root package.json for scripts
```

## Development Workflow

1. **Database Changes**: Add migration files in `backend/migrations/`
2. **API Development**: Add handlers in `backend/internal/handlers/`
3. **Frontend Development**: Add components in `frontend/src/components/`
4. **State Management**: Use Zustand stores in `frontend/src/store/`
5. **Documentation**: Auto-generated from code, manual updates in `docs/`

### Documentation Updates

The documentation system automatically generates API references from your Go code:

```bash
# After making backend changes, regenerate docs
cd docs
npm run generate:all

# Validate the generated documentation
npm run validate

# Preview changes locally
npm run dev
```

## Features & Status

### ✅ Production Ready
- **📚 Documentation System**: Complete VitePress-based documentation with auto-generation
- **🏗️ Development Environment**: Full Docker-based development setup
- **📋 Project Structure**: Well-organized codebase with clear separation of concerns
- **🔧 Build System**: Comprehensive Makefile and npm scripts for all operations
- **📖 Guides & Examples**: Extensive documentation with working code examples
- **🤖 AI Integration**: Model Context Protocol (MCP) support for AI systems
- **🚀 Deployment Ready**: Docker and Kubernetes deployment configurations

### 🔄 In Active Development
- **🔐 Authentication System**: JWT and OAuth integration (Google, GitHub)
- **🐛 Bug Management**: Core bug reporting and tracking functionality
- **🏢 Company Features**: Organization verification and team management
- **👥 User Management**: Registration, profiles, and permissions
- **💬 Comments & Voting**: Community interaction features

### 📋 Planned Features
- **🔍 Advanced Search**: Full-text search with filters and sorting
- **📧 Notifications**: Email and in-app notification system
- **🔗 Webhooks**: Integration with external systems
- **📊 Analytics**: Usage analytics and reporting dashboard
- **📱 Mobile App**: Native mobile applications
- **🌐 API Versioning**: Multiple API versions support
- **🔒 Advanced Security**: Rate limiting, CAPTCHA, and abuse prevention

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- **Development Setup**: Getting your environment ready
- **Code Standards**: Style guides for Go, TypeScript, and documentation
- **Pull Request Process**: How to submit changes
- **Documentation**: How to update and test documentation
- **Testing**: Running tests and validation

### Quick Contribution Steps

1. **Fork & Clone**: Fork the repo and clone your fork
2. **Setup**: Run `make setup` to install all dependencies
3. **Develop**: Make your changes following our style guides
4. **Test**: Run `make test` to ensure everything works
5. **Document**: Update documentation if needed
6. **Submit**: Create a pull request with a clear description

### Areas We Need Help With

- 🐛 **Backend Development**: Go API development and testing
- 🎨 **Frontend Development**: React/Next.js components and features
- 📚 **Documentation**: Improving guides and adding examples
- 🧪 **Testing**: Writing comprehensive tests
- 🚀 **DevOps**: Improving deployment and CI/CD processes

## Community & Support

- **📖 Documentation**: Start with our [Quick Start Guide](docs/guides/quick-start.md)
- **🐛 Bug Reports**: Use GitHub Issues with the bug template
- **💡 Feature Requests**: Use GitHub Issues with the feature template
- **❓ Questions**: Start a GitHub Discussion
- **💬 Chat**: Join our Discord community (coming soon)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the BugRelay team and contributors**