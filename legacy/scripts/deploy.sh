#!/bin/bash

# BugRelay Deployment Script
# Main deployment orchestrator for all components
# Usage: ./deploy.sh [backend|frontend|monitoring|docs] [version]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/bugrelay/backups"
DEPLOY_DIR="/opt/bugrelay"
LOG_FILE="/var/log/bugrelay/deployment.log"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
AUDIT_LOG_SCRIPT="$SCRIPT_DIR/audit-log.sh"

# Deployment tracking
DEPLOYMENT_START_TIME=""
COMPONENT=""
VERSION=""
ENVIRONMENT="${DEPLOY_ENV:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to console with colors
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        *)
            echo "[$level] $message"
            ;;
    esac
}

# Error handler
error_exit() {
    local message="$1"
    local exit_code="${2:-1}"
    log "ERROR" "$message"
    
    # Log deployment failure to audit log
    if [[ -n "$COMPONENT" && -n "$VERSION" && -n "$DEPLOYMENT_START_TIME" ]]; then
        local duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
        if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
            "$AUDIT_LOG_SCRIPT" fail "$COMPONENT" "$VERSION" "$message" "$duration" "$ENVIRONMENT" || true
        fi
    fi
    
    # Send failure notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "failure" "$COMPONENT" "$VERSION" "$message"
    fi
    
    exit "$exit_code"
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    # Add cleanup logic here if needed
}

# Trap for cleanup on exit
trap cleanup EXIT

# Usage function
usage() {
    cat << EOF
Usage: $0 [COMPONENT] [VERSION]

COMPONENT:
    backend     Deploy the Go backend API
    frontend    Deploy the Next.js frontend application
    monitoring  Deploy the monitoring stack (Grafana, Prometheus, etc.)
    docs        Deploy the VitePress documentation site

VERSION:
    Git commit hash, tag, or branch name (optional, defaults to current HEAD)

Examples:
    $0 backend                    # Deploy backend with current HEAD
    $0 frontend v1.2.3           # Deploy frontend with tag v1.2.3
    $0 monitoring main           # Deploy monitoring with main branch
    $0 docs abc123def            # Deploy docs with specific commit

Environment Variables:
    DEPLOY_ENV      Deployment environment (default: production)
    SKIP_BACKUP     Skip backup creation (default: false)
    SKIP_HEALTH     Skip health checks (default: false)
    DRY_RUN         Show what would be done without executing (default: false)

EOF
}

# Validate component
validate_component() {
    local component="$1"
    case "$component" in
        backend|frontend|monitoring|docs)
            return 0
            ;;
        *)
            error_exit "Invalid component: $component. Must be one of: backend, frontend, monitoring, docs"
            ;;
    esac
}

# Validate version
validate_version() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        log "WARN" "No version specified, using current HEAD"
        return 0
    fi
    
    # Check if version exists in git
    if ! git rev-parse --verify "$version" >/dev/null 2>&1; then
        error_exit "Invalid version: $version. Version must be a valid git commit, tag, or branch."
    fi
    
    log "INFO" "Using version: $version ($(git rev-parse --short "$version"))"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking deployment prerequisites..."
    
    # Check if running as deployment user
    if [[ "$USER" != "deploy" ]] && [[ "$USER" != "root" ]]; then
        log "WARN" "Not running as 'deploy' user. Current user: $USER"
    fi
    
    # Check required directories
    if [[ ! -d "$DEPLOY_DIR" ]]; then
        log "INFO" "Creating deployment directory: $DEPLOY_DIR"
        sudo mkdir -p "$DEPLOY_DIR"
        sudo chown deploy:deploy "$DEPLOY_DIR"
    fi
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "INFO" "Creating backup directory: $BACKUP_DIR"
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown deploy:deploy "$BACKUP_DIR"
    fi
    
    # Check disk space (require at least 1GB free)
    local available_space=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ "$available_space" -lt "$required_space" ]]; then
        error_exit "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
    fi
    
    # Check required scripts exist
    local required_scripts=("backup.sh" "health-check.sh" "rollback.sh" "notify.sh")
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
            error_exit "Required script not found: $SCRIPT_DIR/$script"
        fi
        
        if [[ ! -x "$SCRIPT_DIR/$script" ]]; then
            log "INFO" "Making script executable: $script"
            chmod +x "$SCRIPT_DIR/$script"
        fi
    done
    
    log "SUCCESS" "Prerequisites check passed"
}

# Create backup
create_backup() {
    local component="$1"
    
    if [[ "${SKIP_BACKUP:-false}" == "true" ]]; then
        log "WARN" "Skipping backup creation (SKIP_BACKUP=true)"
        return 0
    fi
    
    log "INFO" "Creating backup for component: $component"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would create backup for $component"
        return 0
    fi
    
    if ! "$SCRIPT_DIR/backup.sh" "$component"; then
        error_exit "Backup creation failed for component: $component"
    fi
    
    # Log backup creation to audit log
    local backup_path="$BACKUP_DIR/$component-$(date +%Y%m%d_%H%M%S).tar.gz"
    local backup_size=0
    if [[ -f "$backup_path" ]]; then
        backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo 0)
    fi
    
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" backup "$component" "$backup_path" "$backup_size" "$ENVIRONMENT" || true
    fi
    
    log "SUCCESS" "Backup created successfully"
}

# Deploy component
deploy_component() {
    local component="$1"
    local version="$2"
    
    log "INFO" "Deploying component: $component, version: $version"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would deploy $component version $version"
        return 0
    fi
    
    case "$component" in
        backend)
            deploy_backend "$version"
            ;;
        frontend)
            deploy_frontend "$version"
            ;;
        monitoring)
            deploy_monitoring "$version"
            ;;
        docs)
            deploy_docs "$version"
            ;;
        *)
            error_exit "Unknown component: $component"
            ;;
    esac
    
    log "SUCCESS" "Component deployment completed: $component"
}

# Deploy backend
deploy_backend() {
    local version="$1"
    local service_name="bugrelay-backend"
    local binary_path="$DEPLOY_DIR/backend/bugrelay-backend"
    local config_path="$DEPLOY_DIR/backend/.env"
    
    log "INFO" "Deploying backend service..."
    
    # Stop service for deployment
    if systemctl is-active --quiet "$service_name"; then
        log "INFO" "Stopping backend service..."
        sudo systemctl stop "$service_name"
    fi
    
    # Deploy new binary (this would be copied from build artifacts)
    log "INFO" "Deploying backend binary..."
    # In real deployment, this would copy from GitHub Actions artifacts
    # For now, we'll assume the binary is already built and available
    
    # Update configuration if needed
    if [[ -f "$PROJECT_ROOT/backend/.env.production" ]]; then
        log "INFO" "Updating backend configuration..."
        sudo cp "$PROJECT_ROOT/backend/.env.production" "$config_path"
        sudo chown deploy:deploy "$config_path"
        sudo chmod 600 "$config_path"
    fi
    
    # Start service
    log "INFO" "Starting backend service..."
    sudo systemctl start "$service_name"
    sudo systemctl enable "$service_name"
    
    # Wait for service to be ready
    sleep 5
}

# Deploy frontend
deploy_frontend() {
    local version="$1"
    local frontend_dir="$DEPLOY_DIR/frontend"
    local new_frontend_dir="$DEPLOY_DIR/frontend-new"
    local nginx_config="/etc/nginx/sites-available/bugrelay"
    
    log "INFO" "Deploying frontend application..."
    
    # Create new frontend directory
    log "INFO" "Preparing new frontend deployment..."
    sudo mkdir -p "$new_frontend_dir"
    
    # Deploy new frontend files (this would be copied from build artifacts)
    log "INFO" "Deploying frontend files..."
    # In real deployment, this would copy from GitHub Actions artifacts
    
    # Update Nginx configuration to point to new directory
    log "INFO" "Updating Nginx configuration..."
    # This would update the root directive in nginx config
    
    # Test Nginx configuration
    if ! sudo nginx -t; then
        error_exit "Nginx configuration test failed"
    fi
    
    # Reload Nginx
    log "INFO" "Reloading Nginx..."
    sudo systemctl reload nginx
    
    # Remove old frontend directory after successful deployment
    if [[ -d "$frontend_dir" ]]; then
        log "INFO" "Removing old frontend deployment..."
        sudo rm -rf "$frontend_dir"
    fi
    
    # Rename new directory to active
    sudo mv "$new_frontend_dir" "$frontend_dir"
}

# Deploy monitoring
deploy_monitoring() {
    local version="$1"
    local monitoring_dir="$DEPLOY_DIR/monitoring"
    
    log "INFO" "Deploying monitoring stack..."
    
    # Update monitoring configurations
    log "INFO" "Updating monitoring configurations..."
    
    # Copy new configurations
    if [[ -d "$PROJECT_ROOT/monitoring" ]]; then
        sudo cp -r "$PROJECT_ROOT/monitoring"/* "$monitoring_dir/"
        sudo chown -R deploy:deploy "$monitoring_dir"
    fi
    
    # Restart monitoring services
    local services=("prometheus" "grafana-server" "loki" "promtail")
    for service in "${services[@]}"; do
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            log "INFO" "Restarting $service..."
            sudo systemctl restart "$service"
        else
            log "WARN" "Service $service is not enabled or doesn't exist"
        fi
    done
}

# Deploy docs
deploy_docs() {
    local version="$1"
    local docs_dir="$DEPLOY_DIR/docs"
    local new_docs_dir="$DEPLOY_DIR/docs-new"
    
    log "INFO" "Deploying documentation site..."
    
    # Create new docs directory
    sudo mkdir -p "$new_docs_dir"
    
    # Deploy new documentation files
    log "INFO" "Deploying documentation files..."
    # In real deployment, this would copy from VitePress build output
    
    # Update Nginx configuration for docs site
    log "INFO" "Updating docs site configuration..."
    
    # Test Nginx configuration
    if ! sudo nginx -t; then
        error_exit "Nginx configuration test failed for docs site"
    fi
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    # Replace old docs with new
    if [[ -d "$docs_dir" ]]; then
        sudo rm -rf "$docs_dir"
    fi
    sudo mv "$new_docs_dir" "$docs_dir"
}

# Run health checks
run_health_checks() {
    local component="$1"
    
    if [[ "${SKIP_HEALTH:-false}" == "true" ]]; then
        log "WARN" "Skipping health checks (SKIP_HEALTH=true)"
        return 0
    fi
    
    log "INFO" "Running health checks for component: $component"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would run health checks for $component"
        return 0
    fi
    
    if ! "$SCRIPT_DIR/health-check.sh" "$component"; then
        error_exit "Health checks failed for component: $component"
    fi
    
    log "SUCCESS" "Health checks passed"
}

# Send notifications
send_notification() {
    local status="$1"
    local component="$2"
    local version="$3"
    local message="${4:-}"
    
    log "INFO" "Sending $status notification..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would send $status notification for $component"
        return 0
    fi
    
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "$status" "$component" "$version" "$message"
    else
        log "WARN" "Notification script not found, skipping notification"
    fi
}

# Main deployment function
main() {
    local component="${1:-}"
    local version="${2:-HEAD}"
    
    # Parse command line arguments
    if [[ "$#" -eq 0 ]] || [[ "$component" == "-h" ]] || [[ "$component" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate inputs
    validate_component "$component"
    validate_version "$version"
    
    # Set global variables
    COMPONENT="$component"
    VERSION="$version"
    DEPLOYMENT_START_TIME=$(date +%s)
    
    # Get actual commit hash
    local commit_hash=$(git rev-parse --short "$version")
    
    log "INFO" "Starting deployment of $component (version: $version, commit: $commit_hash)"
    log "INFO" "Environment: ${DEPLOY_ENV:-production}"
    log "INFO" "Dry run: ${DRY_RUN:-false}"
    
    # Log deployment start to audit log
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" start "$component" "$commit_hash" "$ENVIRONMENT" || true
    fi
    
    # Send start notification
    send_notification "start" "$component" "$version" "Deployment started"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    create_backup "$component"
    
    # Deploy component
    deploy_component "$component" "$version"
    
    # Run health checks
    run_health_checks "$component"
    
    # Calculate deployment duration
    local deployment_end_time=$(date +%s)
    local duration=$((deployment_end_time - DEPLOYMENT_START_TIME))
    
    # Log deployment completion to audit log
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" complete "$component" "$commit_hash" "$duration" "$ENVIRONMENT" || true
    fi
    
    # Send success notification
    send_notification "success" "$component" "$version" "Deployment completed successfully"
    
    log "SUCCESS" "Deployment completed successfully!"
    log "INFO" "Component: $component"
    log "INFO" "Version: $version ($commit_hash)"
    log "INFO" "Duration: ${duration}s"
    log "INFO" "Deployment time: $(date)"
}

# Run main function with all arguments
main "$@"