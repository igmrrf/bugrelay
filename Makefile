.PHONY: help setup dev-frontend dev-backend build-frontend build-backend build docker-up docker-down clean

# Default target
help:
	@echo "BugRelay Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup           Install all dependencies"
	@echo "  make setup-frontend  Install frontend dependencies"
	@echo "  make setup-backend   Install backend dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev-frontend    Start frontend development server"
	@echo "  make dev-backend     Start backend development server"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up       Start all services with Docker"
	@echo "  make docker-down     Stop all Docker services"
	@echo ""
	@echo "Build:"
	@echo "  make build           Build both frontend and backend"
	@echo "  make build-frontend  Build frontend only"
	@echo "  make build-backend   Build backend only"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean           Clean build artifacts"

# Setup commands
setup: setup-frontend setup-backend
	@echo "✅ Setup complete!"

setup-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

setup-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && go mod tidy

# Development commands
dev-frontend:
	@echo "🚀 Starting frontend development server..."
	cd frontend && npm run dev

dev-backend:
	@echo "🚀 Starting backend development server..."
	cd backend && go run main.go

# Docker commands
docker-up:
	@echo "🐳 Starting all services with Docker..."
	docker-compose up -d

docker-down:
	@echo "🐳 Stopping all Docker services..."
	docker-compose down

# Build commands
build: build-frontend build-backend
	@echo "✅ Build complete!"

build-frontend:
	@echo "🔨 Building frontend..."
	cd frontend && npm run build

build-backend:
	@echo "🔨 Building backend..."
	cd backend && go build -o bin/server main.go

# Utility commands
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf frontend/.next
	rm -rf frontend/out
	rm -rf backend/bin
	rm -rf backend/tmp
	@echo "✅ Clean complete!"

# Database commands
db-migrate-up:
	@echo "📊 Running database migrations..."
	cd backend && migrate -path migrations -database "postgres://bugrelay_user:bugrelay_password@localhost:5432/bugrelay?sslmode=disable" up

db-migrate-down:
	@echo "📊 Rolling back database migrations..."
	cd backend && migrate -path migrations -database "postgres://bugrelay_user:bugrelay_password@localhost:5432/bugrelay?sslmode=disable" down

# Test commands
test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm run test

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && go test ./...

# Lint commands
lint-frontend:
	@echo "🔍 Linting frontend..."
	cd frontend && npm run type-check

lint-backend:
	@echo "🔍 Linting backend..."
	cd backend && go vet ./...
	cd backend && go fmt ./...