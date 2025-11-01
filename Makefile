.PHONY: help dev prod stop clean clean-volumes clean-all logs shell seed

# Default target
help:
	@echo "BugRelay - Simplified Development Commands"
	@echo ""
	@echo "🚀 Core Commands:"
	@echo "  make dev             Start development environment"
	@echo "  make prod            Start production environment"
	@echo "  make stop            Stop all services"
	@echo "  make clean           Remove containers (keeps data)"
	@echo "  make clean-volumes   Remove containers and volumes (removes data)"
	@echo "  make clean-all       Complete cleanup (removes everything)"
	@echo ""
	@echo "🔧 Utilities:"
	@echo "  make logs            View service logs"
	@echo "  make shell           Access backend container shell"
	@echo "  make seed            Populate database with test data"
	@echo "  make help            Show this help message"
	@echo ""
	@echo "📋 Prerequisites:"
	@echo "  - Docker and Docker Compose installed"
	@echo "  - .env file configured (copied from .env.example)"

# Prerequisite validation
check-docker:
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Please install Docker first."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "❌ Docker daemon is not running. Please start Docker first."; exit 1; }

check-env:
	@test -f .env || { echo "❌ .env file not found. Please copy .env.example to .env and configure it."; exit 1; }

# Core commands
dev: check-docker check-env
	@echo "🚀 Starting development environment..."
	@docker-compose --profile dev up -d
	@echo "✅ Development environment started!"
	@echo ""
	@echo "📍 Services available at:"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  Backend API: http://localhost:8080"
	@echo "  Grafana:     http://localhost:3001 (admin/admin123)"
	@echo "  MailHog:     http://localhost:8025"

prod: check-docker check-env
	@echo "🚀 Starting production environment..."
	@docker-compose --profile prod up -d
	@echo "✅ Production environment started!"

stop:
	@echo "🛑 Stopping all services..."
	@docker-compose down
	@echo "✅ All services stopped"

# Clean commands with different levels
clean:
	@echo "🧹 Cleaning up containers..."
	@docker-compose down --remove-orphans
	@echo "✅ Containers stopped and removed"

clean-volumes:
	@echo "🧹 Cleaning up containers and volumes..."
	@echo "⚠️  This will remove all data in volumes (databases, etc.)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v --remove-orphans
	@echo "✅ Containers and volumes removed"

clean-all:
	@echo "🧹 Complete cleanup (containers, volumes, and unused Docker resources)..."
	@echo "⚠️  This will remove all data and unused Docker resources"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Complete cleanup finished"

# Utility commands
logs:
	@echo "📋 Viewing service logs (Ctrl+C to exit)..."
	@docker-compose logs -f

shell:
	@echo "🐚 Accessing backend container shell..."
	@docker-compose exec backend sh || echo "❌ Backend container not running. Start with 'make dev' first."

seed:
	@echo "🌱 Seeding database with test data..."
	@docker-compose exec backend go run cmd/seed/main.go || echo "❌ Failed to seed database. Ensure backend is running."
