#!/bin/bash

# BugRelay Production Deployment Script
# This script deploys the application to production with zero-downtime

set -e

echo "🚀 Starting BugRelay production deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_BEFORE_DEPLOY=true
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        error "Docker Compose is not available"
        exit 1
    fi
    
    # Determine Docker Compose command
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        DOCKER_COMPOSE="docker compose"
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        error "Please copy .env.prod.example to .env.prod and configure it"
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file $COMPOSE_FILE not found"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create backup before deployment
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
        log "Creating backup before deployment..."
        
        # Check if database is running
        if $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres | grep -q "Up"; then
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
                pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-password > "backup/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
            success "Backup created successfully"
        else
            warning "Database not running, skipping backup"
        fi
    fi
}

# Build and pull images
build_images() {
    log "Building and pulling Docker images..."
    
    # Pull latest base images
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis grafana loki promtail prometheus node-exporter cadvisor alertmanager
    
    # Build application images
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache backend frontend
    
    success "Images built successfully"
}

# Deploy with zero downtime
deploy_services() {
    log "Deploying services with zero downtime..."
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout 60 bash -c 'until $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}"; do sleep 2; done'
    
    # Run database migrations if needed
    log "Running database migrations..."
    # Add migration command here if you have one
    
    # Deploy backend with rolling update
    log "Deploying backend..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps backend
    
    # Wait for backend health check
    wait_for_health_check "backend" "http://localhost:8080/health"
    
    # Deploy frontend
    log "Deploying frontend..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps frontend
    
    # Wait for frontend health check
    wait_for_health_check "frontend" "http://localhost:3000/api/health"
    
    # Deploy reverse proxy
    log "Deploying reverse proxy..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps nginx
    
    # Deploy monitoring services
    log "Deploying monitoring services..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d grafana loki promtail prometheus node-exporter cadvisor alertmanager
    
    success "All services deployed successfully"
}

# Wait for service health check
wait_for_health_check() {
    local service_name=$1
    local health_url=$2
    local timeout=${HEALTH_CHECK_TIMEOUT}
    local elapsed=0
    
    log "Waiting for $service_name to be healthy..."
    
    while [ $elapsed -lt $timeout ]; do
        if $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$service_name" wget --spider --quiet "$health_url" 2>/dev/null; then
            success "$service_name is healthy"
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    error "$service_name health check failed after ${timeout}s"
    return 1
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check service status
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    # Test main endpoints
    local endpoints=(
        "http://localhost/health"
        "http://localhost/api/v1/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            success "✓ $endpoint is responding"
        else
            error "✗ $endpoint is not responding"
            return 1
        fi
    done
    
    success "Deployment verification passed"
}

# Rollback function
rollback() {
    error "Deployment failed, initiating rollback..."
    
    # Stop new containers
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop backend frontend nginx
    
    # Start previous version (if available)
    # This would require keeping previous images tagged
    warning "Manual rollback may be required"
    
    error "Rollback completed"
    exit 1
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused networks
    docker network prune -f
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message="🚀 BugRelay production deployment $status at $(date)"
    
    # Send to Slack if webhook is configured
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$message\"}" \
            || warning "Failed to send Slack notification"
    fi
    
    # Send email notification if configured
    if [ -n "${NOTIFICATION_EMAIL}" ]; then
        echo "$message" | mail -s "BugRelay Deployment $status" "${NOTIFICATION_EMAIL}" \
            || warning "Failed to send email notification"
    fi
}

# Main deployment process
main() {
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    # Trap errors for rollback
    if [ "$ROLLBACK_ON_FAILURE" = true ]; then
        trap rollback ERR
    fi
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    build_images
    deploy_services
    verify_deployment
    cleanup
    
    success "🎉 Production deployment completed successfully!"
    send_notification "SUCCESSFUL"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            BACKUP_BEFORE_DEPLOY=false
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-backup     Skip backup before deployment"
            echo "  --no-rollback   Disable automatic rollback on failure"
            echo "  --timeout SEC   Health check timeout in seconds (default: 300)"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main