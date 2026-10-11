#!/bin/bash

# Environment Setup Script for BugRelay
# This script ensures proper environment configuration before starting services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists and create from template if needed
setup_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            print_info "Creating $ENV_FILE from $ENV_EXAMPLE template..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "Created $ENV_FILE from template"
            
            # Set development-friendly defaults
            if command -v sed >/dev/null 2>&1; then
                # Update some defaults for development
                sed -i.bak 's/ENVIRONMENT=development/ENVIRONMENT=development/' "$ENV_FILE" 2>/dev/null || true
                sed -i.bak 's/ENABLE_DEBUG=false/ENABLE_DEBUG=true/' "$ENV_FILE" 2>/dev/null || true
                rm -f "${ENV_FILE}.bak" 2>/dev/null || true
            fi
            
            print_warning "Please review and update values in $ENV_FILE as needed"
            print_info "Key variables to check:"
            print_info "  - JWT_SECRET (change from default)"
            print_info "  - Database passwords (if using production)"
            print_info "  - OAuth client IDs and secrets"
            print_info "  - Domain settings for production"
        else
            print_error "$ENV_EXAMPLE template file not found!"
            print_error "Please ensure $ENV_EXAMPLE exists in the project root"
            exit 1
        fi
    else
        print_success "Found existing $ENV_FILE"
    fi
}

# Validate environment file
validate_env() {
    if [ -f "scripts/validate-env.sh" ]; then
        print_info "Validating environment configuration..."
        if ./scripts/validate-env.sh; then
            print_success "Environment validation passed"
        else
            print_error "Environment validation failed"
            print_info "Please fix the validation errors before proceeding"
            exit 1
        fi
    else
        print_warning "Environment validation script not found, skipping validation"
    fi
}

# Check Docker and Docker Compose
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed or not in PATH"
        print_info "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed or not in PATH"
        print_info "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Check if Docker daemon is running
check_docker_daemon() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker daemon and try again"
        exit 1
    fi
    
    print_success "Docker daemon is running"
}

# Main setup function
main() {
    print_info "Setting up BugRelay environment..."
    
    # Check prerequisites
    check_docker
    check_docker_daemon
    
    # Setup environment file
    setup_env_file
    
    # Validate environment
    validate_env
    
    print_success "Environment setup completed successfully!"
    print_info "You can now start the application with:"
    print_info "  make dev    # For development environment"
    print_info "  make prod   # For production environment"
}

# Show help
show_help() {
    echo "Usage: $0"
    echo ""
    echo "Sets up the BugRelay environment by:"
    echo "  1. Checking Docker prerequisites"
    echo "  2. Creating .env from template if needed"
    echo "  3. Validating environment configuration"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac