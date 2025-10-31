#!/bin/bash

# BugRelay Development Stop Script
# This script stops the development environment and optionally cleans up

set -e

echo "🛑 Stopping BugRelay development environment..."

# Determine Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Parse command line arguments
CLEAN=false
VOLUMES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --volumes)
            VOLUMES=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean     Remove containers and networks"
            echo "  --volumes   Also remove volumes (WARNING: This will delete all data!)"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Stop all services
echo "🔄 Stopping all services..."
$DOCKER_COMPOSE -f docker-compose.dev.yml stop

if [ "$CLEAN" = true ]; then
    echo "🧹 Removing containers and networks..."
    if [ "$VOLUMES" = true ]; then
        echo "⚠️  WARNING: This will delete all data including databases!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $DOCKER_COMPOSE -f docker-compose.dev.yml down -v --remove-orphans
            echo "🗑️  All containers, networks, and volumes removed"
        else
            echo "❌ Operation cancelled"
            exit 1
        fi
    else
        $DOCKER_COMPOSE -f docker-compose.dev.yml down --remove-orphans
        echo "🗑️  Containers and networks removed (volumes preserved)"
    fi
else
    echo "✅ All services stopped"
    echo ""
    echo "💡 Services are stopped but containers are preserved."
    echo "   Use 'scripts/dev-start.sh' to restart quickly."
    echo "   Use '$0 --clean' to remove containers."
    echo "   Use '$0 --clean --volumes' to remove everything including data."
fi

echo ""
echo "🎯 Development environment stopped successfully!"