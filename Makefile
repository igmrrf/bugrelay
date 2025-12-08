.PHONY: help setup setup-frontend setup-backend setup-docs dev dev-frontend dev-backend dev-docs build build-frontend build-backend build-docs test test-frontend test-backend test-docs docs-dev docs-build docs-generate docs-validate docs-test clean docker-up docker-down

# Default target
help:
	@echo "BugRelay - Available Make Targets"
	@echo "=================================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup              - Install all dependencies (frontend, backend, docs)"
	@echo "  make setup-frontend     - Install frontend dependencies"
	@echo "  make setup-backend      - Install backend dependencies"
	@echo "  make setup-docs         - Install docs dependencies"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev                - Run all services in development mode"
	@echo "  make dev-frontend       - Run frontend dev server"
	@echo "  make dev-backend        - Run backend dev server"
	@echo "  make dev-docs           - Run docs dev server"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build              - Build all components"
	@echo "  make build-frontend     - Build frontend"
	@echo "  make build-backend      - Build backend"
	@echo "  make build-docs         - Build docs"
	@echo ""
	@echo "Test Commands:"
	@echo "  make test               - Run all tests"
	@echo "  make test-frontend      - Run frontend tests"
	@echo "  make test-backend       - Run backend tests"
	@echo "  make test-docs          - Run docs tests"
	@echo ""
	@echo "Documentation Commands:"
	@echo "  make docs-dev           - Run docs dev server"
	@echo "  make docs-build         - Build documentation"
	@echo "  make docs-generate      - Generate all documentation"
	@echo "  make docs-validate      - Validate documentation"
	@echo "  make docs-test          - Run comprehensive docs tests"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean              - Clean build artifacts"
	@echo "  make docker-up          - Start Docker services"
	@echo "  make docker-down        - Stop Docker services"

# Setup targets
setup: setup-frontend setup-backend setup-docs
	@echo "✓ All dependencies installed"

setup-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

setup-backend:
	@echo "Installing backend dependencies..."
	cd backend && go mod tidy

setup-docs:
	@echo "Installing docs dependencies..."
	cd docs && npm install

# Development targets
dev:
	@echo "Starting all services in development mode..."
	@echo "Note: Use 'make dev-frontend', 'make dev-backend', 'make dev-docs' in separate terminals"
	@echo "Or install 'concurrently' to run them together"

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && go run main.go

dev-docs:
	cd docs && npm run dev

# Build targets
build: build-frontend build-backend build-docs
	@echo "✓ All components built"

build-frontend:
	@echo "Building frontend..."
	cd frontend && npm run build

build-backend:
	@echo "Building backend..."
	cd backend && go build -o bin/server main.go

build-docs:
	@echo "Building documentation..."
	cd docs && npm run build

# Test targets
test: test-frontend test-backend test-docs
	@echo "✓ All tests completed"

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test

test-backend:
	@echo "Running backend tests..."
	cd backend && go test ./...

test-docs:
	@echo "Running docs tests..."
	cd docs && npm run test:comprehensive

# Documentation targets
docs-dev:
	cd docs && npm run dev

docs-build:
	cd docs && npm run build

docs-generate:
	cd docs && npm run generate:all

docs-validate:
	cd docs && npm run validate

docs-test:
	cd docs && npm run test:comprehensive

# Utility targets
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/.next frontend/out backend/bin backend/tmp docs/.vitepress/dist docs/.vitepress/cache
	@echo "✓ Clean complete"

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
