#!/bin/bash

# Environment Validation Script for BugRelay
# This script validates required environment variables and creates .env from template if missing

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
VALIDATION_MODE="${1:-basic}" # basic, development, production

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

# Check if .env file exists, create from template if missing
ensure_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            print_info "Creating $ENV_FILE from $ENV_EXAMPLE template..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "Created $ENV_FILE from template"
            print_warning "Please review and update the values in $ENV_FILE before proceeding"
        else
            print_error "$ENV_EXAMPLE template file not found!"
            exit 1
        fi
    else
        print_info "Found existing $ENV_FILE"
    fi
}

# Load environment variables from .env file
load_env() {
    if [ -f "$ENV_FILE" ]; then
        # Export variables from .env file, ignoring comments and empty lines
        set -a
        # Use a more compatible approach for loading .env
        while IFS= read -r line; do
            # Skip comments and empty lines
            case "$line" in
                \#*|'') continue ;;
                *=*) export "$line" ;;
            esac
        done < "$ENV_FILE"
        set +a
        print_info "Loaded environment variables from $ENV_FILE"
    else
        print_error "$ENV_FILE not found!"
        exit 1
    fi
}

# Validate required variables based on mode
validate_variables() {
    local mode="$1"
    local errors=0
    
    print_info "Validating environment variables for mode: $mode"
    
    # Core required variables (always needed)
    CORE_REQUIRED=(
        "ENVIRONMENT"
        "DB_HOST"
        "DB_NAME" 
        "DB_USER"
        "DB_PASSWORD"
        "REDIS_HOST"
        "JWT_SECRET"
    )
    
    # Development specific variables
    DEV_REQUIRED=(
        "NEXT_PUBLIC_API_URL"
        "PORT"
    )
    
    # Production specific variables
    PROD_REQUIRED=(
        "DOMAIN"
        "OAUTH_REDIRECT_URL"
        "GRAFANA_ADMIN_PASSWORD"
        "LOGS_API_KEY"
        "SSL_CERT_PATH"
        "SSL_KEY_PATH"
    )
    
    # Check core variables
    for var in "${CORE_REQUIRED[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required variable $var is not set or empty"
            errors=$((errors + 1))
        fi
    done
    
    # Check mode-specific variables
    case "$mode" in
        "development"|"dev")
            for var in "${DEV_REQUIRED[@]}"; do
                if [ -z "${!var}" ]; then
                    print_error "Required development variable $var is not set or empty"
                    errors=$((errors + 1))
                fi
            done
            ;;
        "production"|"prod")
            for var in "${PROD_REQUIRED[@]}"; do
                if [ -z "${!var}" ]; then
                    print_error "Required production variable $var is not set or empty"
                    errors=$((errors + 1))
                fi
            done
            ;;
    esac
    
    return $errors
}

# Validate JWT secret strength
validate_jwt_secret() {
    if [ -n "$JWT_SECRET" ]; then
        if [ ${#JWT_SECRET} -lt 32 ]; then
            print_error "JWT_SECRET must be at least 32 characters long (current: ${#JWT_SECRET})"
            return 1
        fi
        
        if [ "$JWT_SECRET" = "your-jwt-secret-key-change-in-production-minimum-32-characters" ]; then
            if [ "$ENVIRONMENT" = "production" ]; then
                print_error "JWT_SECRET is still using default value in production!"
                return 1
            else
                print_warning "JWT_SECRET is using default value (OK for development)"
            fi
        fi
    fi
    return 0
}

# Validate database configuration
validate_database() {
    if [ -n "$DB_PASSWORD" ] && [ "$DB_PASSWORD" = "bugrelay_password" ]; then
        if [ "$ENVIRONMENT" = "production" ]; then
            print_error "DB_PASSWORD is using default value in production!"
            return 1
        else
            print_warning "DB_PASSWORD is using default value (OK for development)"
        fi
    fi
    return 0
}

# Validate OAuth configuration
validate_oauth() {
    if [ "$ENABLE_OAUTH" = "true" ]; then
        local oauth_errors=0
        
        if [ -z "$GOOGLE_CLIENT_ID" ] || [ "$GOOGLE_CLIENT_ID" = "your-google-client-id" ]; then
            print_warning "Google OAuth not configured (GOOGLE_CLIENT_ID)"
            oauth_errors=$((oauth_errors + 1))
        fi
        
        if [ -z "$GITHUB_CLIENT_ID" ] || [ "$GITHUB_CLIENT_ID" = "your-github-client-id" ]; then
            print_warning "GitHub OAuth not configured (GITHUB_CLIENT_ID)"
            oauth_errors=$((oauth_errors + 1))
        fi
        
        if [ $oauth_errors -eq 2 ]; then
            print_warning "OAuth is enabled but no providers are configured"
        fi
    fi
}

# Validate monitoring configuration
validate_monitoring() {
    if [ "$ENABLE_MONITORING" = "true" ]; then
        if [ -z "$GRAFANA_ADMIN_PASSWORD" ] || [ "$GRAFANA_ADMIN_PASSWORD" = "admin123" ]; then
            if [ "$ENVIRONMENT" = "production" ]; then
                print_error "GRAFANA_ADMIN_PASSWORD is using default value in production!"
                return 1
            else
                print_warning "GRAFANA_ADMIN_PASSWORD is using default value (OK for development)"
            fi
        fi
    fi
    return 0
}

# Main validation function
main() {
    print_info "Starting environment validation..."
    
    # Ensure .env file exists
    ensure_env_file
    
    # Load environment variables
    load_env
    
    # Determine validation mode
    local mode="$VALIDATION_MODE"
    # Only use ENVIRONMENT variable if no explicit mode was provided
    if [ "$VALIDATION_MODE" = "basic" ] && [ -n "$ENVIRONMENT" ]; then
        mode="$ENVIRONMENT"
    fi
    
    # Run validations
    local total_errors=0
    
    validate_variables "$mode"
    total_errors=$((total_errors + $?))
    
    validate_jwt_secret
    total_errors=$((total_errors + $?))
    
    validate_database
    total_errors=$((total_errors + $?))
    
    validate_oauth
    
    validate_monitoring
    total_errors=$((total_errors + $?))
    
    # Report results
    if [ $total_errors -eq 0 ]; then
        print_success "Environment validation passed!"
        print_info "Environment: $ENVIRONMENT"
        print_info "Database: $DB_HOST:$DB_PORT/$DB_NAME"
        print_info "Redis: $REDIS_HOST:$REDIS_PORT"
        print_info "API URL: ${NEXT_PUBLIC_API_URL:-Not set}"
        exit 0
    else
        print_error "Environment validation failed with $total_errors error(s)"
        print_info "Please fix the errors above and run validation again"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [MODE]"
    echo ""
    echo "Validates environment configuration for BugRelay"
    echo ""
    echo "Modes:"
    echo "  basic       - Basic validation (default)"
    echo "  development - Development environment validation"
    echo "  production  - Production environment validation"
    echo ""
    echo "Examples:"
    echo "  $0                    # Basic validation"
    echo "  $0 development        # Development validation"
    echo "  $0 production         # Production validation"
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