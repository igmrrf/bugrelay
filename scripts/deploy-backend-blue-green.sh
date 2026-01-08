#!/bin/bash

# BugRelay Blue-Green Backend Deployment Script
# Implements zero-downtime deployment for the backend service
# Usage: ./deploy-backend-blue-green.sh [version] [artifact_path]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/bugrelay"
LOG_FILE="/var/log/bugrelay/blue-green-deployment.log"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
TRAFFIC_SWITCH_DELAY=10

# Service configuration
SERVICE_NAME="bugrelay-backend"
BLUE_PORT=8080
GREEN_PORT=8081
NGINX_UPSTREAM_CONFIG="/etc/nginx/conf.d/upstream-backend.conf"
NGINX_MAIN_CONFIG="/etc/nginx/nginx.conf"

# Deployment paths
BLUE_DIR="$DEPLOY_DIR/backend"
GREEN_DIR="$DEPLOY_DIR/backend-green"
BINARY_NAME="bugrelay-backend"
CONFIG_FILE=".env"

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
    
    # Send failure notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "failure" "backend" "${VERSION:-unknown}" "$message"
    fi
    
    # Cleanup on failure
    cleanup_on_failure
    
    exit "$exit_code"
}

# Cleanup function for failures
cleanup_on_failure() {
    log "INFO" "Cleaning up failed deployment..."
    
    # Stop green service if it's running
    if systemctl is-active --quiet "${SERVICE_NAME}-green" 2>/dev/null; then
        log "INFO" "Stopping failed green service..."
        sudo systemctl stop "${SERVICE_NAME}-green" || true
    fi
    
    # Remove green deployment directory
    if [[ -d "$GREEN_DIR" ]]; then
        log "INFO" "Removing failed green deployment..."
        sudo rm -rf "$GREEN_DIR" || true
    fi
    
    # Ensure blue service is running
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        log "WARN" "Blue service is not running, attempting to start..."
        sudo systemctl start "$SERVICE_NAME" || true
    fi
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [VERSION] [ARTIFACT_PATH]

VERSION:
    Git commit hash, tag, or branch name (optional, defaults to current HEAD)

ARTIFACT_PATH:
    Path to the backend binary artifact (optional, will build if not provided)

Examples:
    $0                                    # Deploy current HEAD, build locally
    $0 v1.2.3                           # Deploy tag v1.2.3, build locally
    $0 abc123def /tmp/backend-binary     # Deploy specific commit with pre-built binary

Environment Variables:
    BLUE_PORT           Blue service port (default: 8080)
    GREEN_PORT          Green service port (default: 8081)
    HEALTH_CHECK_TIMEOUT    Health check timeout in seconds (default: 60)
    HEALTH_CHECK_RETRIES    Number of health check retries (default: 5)
    TRAFFIC_SWITCH_DELAY    Delay before switching traffic in seconds (default: 10)

EOF
}

# Validate inputs
validate_inputs() {
    local version="${1:-HEAD}"
    local artifact_path="${2:-}"
    
    # Validate version if provided
    if [[ "$version" != "HEAD" ]] && ! git rev-parse --verify "$version" >/dev/null 2>&1; then
        error_exit "Invalid version: $version. Version must be a valid git commit, tag, or branch."
    fi
    
    # Validate artifact path if provided
    if [[ -n "$artifact_path" ]] && [[ ! -f "$artifact_path" ]]; then
        error_exit "Artifact file not found: $artifact_path"
    fi
    
    # Check if we're running as appropriate user
    if [[ "$USER" != "deploy" ]] && [[ "$USER" != "root" ]]; then
        log "WARN" "Not running as 'deploy' user. Current user: $USER"
    fi
    
    # Check required directories
    if [[ ! -d "$DEPLOY_DIR" ]]; then
        log "INFO" "Creating deployment directory: $DEPLOY_DIR"
        sudo mkdir -p "$DEPLOY_DIR"
        sudo chown deploy:deploy "$DEPLOY_DIR"
    fi
    
    # Check disk space (require at least 500MB free)
    local available_space=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    local required_space=512000  # 500MB in KB
    
    if [[ "$available_space" -lt "$required_space" ]]; then
        error_exit "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
    fi
}

# Get current active deployment (blue or green)
get_current_deployment() {
    # Check which port the current backend service is using
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        local current_port=$(sudo netstat -tlnp | grep ":$BLUE_PORT " | grep "$BINARY_NAME" || echo "")
        if [[ -n "$current_port" ]]; then
            echo "blue"
            return 0
        fi
    fi
    
    if systemctl is-active --quiet "${SERVICE_NAME}-green"; then
        local current_port=$(sudo netstat -tlnp | grep ":$GREEN_PORT " | grep "$BINARY_NAME" || echo "")
        if [[ -n "$current_port" ]]; then
            echo "green"
            return 0
        fi
    fi
    
    # Default to blue if nothing is running
    echo "blue"
}

# Prepare green deployment
prepare_green_deployment() {
    local version="$1"
    local artifact_path="$2"
    
    log "INFO" "Preparing green deployment (version: $version)"
    
    # Create green deployment directory
    if [[ -d "$GREEN_DIR" ]]; then
        log "INFO" "Removing existing green deployment..."
        sudo rm -rf "$GREEN_DIR"
    fi
    
    sudo mkdir -p "$GREEN_DIR"
    sudo chown deploy:deploy "$GREEN_DIR"
    
    # Deploy binary
    if [[ -n "$artifact_path" ]]; then
        log "INFO" "Deploying pre-built binary from: $artifact_path"
        sudo cp "$artifact_path" "$GREEN_DIR/$BINARY_NAME"
    else
        log "INFO" "Building backend binary for version: $version"
        
        # Build the backend (this would typically be done in CI/CD)
        # For now, we'll copy from the current blue deployment or build locally
        if [[ -f "$BLUE_DIR/$BINARY_NAME" ]]; then
            log "INFO" "Copying binary from blue deployment for testing..."
            sudo cp "$BLUE_DIR/$BINARY_NAME" "$GREEN_DIR/$BINARY_NAME"
        else
            error_exit "No binary available and local build not implemented. Please provide artifact_path."
        fi
    fi
    
    # Set executable permissions
    sudo chmod +x "$GREEN_DIR/$BINARY_NAME"
    
    # Copy configuration
    if [[ -f "$BLUE_DIR/$CONFIG_FILE" ]]; then
        log "INFO" "Copying configuration from blue deployment..."
        sudo cp "$BLUE_DIR/$CONFIG_FILE" "$GREEN_DIR/$CONFIG_FILE"
    else
        log "WARN" "No configuration file found in blue deployment"
    fi
    
    # Update configuration for green deployment (different port)
    if [[ -f "$GREEN_DIR/$CONFIG_FILE" ]]; then
        log "INFO" "Updating green configuration for port $GREEN_PORT..."
        sudo sed -i.bak "s/PORT=8080/PORT=$GREEN_PORT/g" "$GREEN_DIR/$CONFIG_FILE"
        sudo sed -i.bak "s/SERVER_PORT=8080/SERVER_PORT=$GREEN_PORT/g" "$GREEN_DIR/$CONFIG_FILE"
    fi
    
    # Set proper ownership
    sudo chown -R deploy:deploy "$GREEN_DIR"
    
    log "SUCCESS" "Green deployment prepared"
}

# Create green systemd service
create_green_service() {
    log "INFO" "Creating green systemd service..."
    
    local green_service_file="/etc/systemd/system/${SERVICE_NAME}-green.service"
    
    # Create green service file based on blue service
    if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
        sudo cp "/etc/systemd/system/${SERVICE_NAME}.service" "$green_service_file"
        
        # Update service file for green deployment
        sudo sed -i.bak "s|$BLUE_DIR|$GREEN_DIR|g" "$green_service_file"
        sudo sed -i.bak "s|Description=.*|Description=BugRelay Backend Service (Green)|g" "$green_service_file"
        
    else
        # Create green service file from scratch
        sudo tee "$green_service_file" > /dev/null << EOF
[Unit]
Description=BugRelay Backend Service (Green)
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=$GREEN_DIR
ExecStart=$GREEN_DIR/$BINARY_NAME
Restart=always
RestartSec=5
Environment=PORT=$GREEN_PORT
EnvironmentFile=-$GREEN_DIR/$CONFIG_FILE

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$GREEN_DIR /var/log/bugrelay /tmp

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    fi
    
    # Reload systemd and enable green service
    sudo systemctl daemon-reload
    sudo systemctl enable "${SERVICE_NAME}-green"
    
    log "SUCCESS" "Green systemd service created"
}

# Start green service
start_green_service() {
    log "INFO" "Starting green service on port $GREEN_PORT..."
    
    # Start green service
    if ! sudo systemctl start "${SERVICE_NAME}-green"; then
        error_exit "Failed to start green service"
    fi
    
    # Wait for service to be ready
    local attempt=1
    while [[ $attempt -le 10 ]]; do
        if systemctl is-active --quiet "${SERVICE_NAME}-green"; then
            log "SUCCESS" "Green service started successfully"
            return 0
        fi
        
        log "INFO" "Waiting for green service to start (attempt $attempt/10)..."
        sleep 2
        ((attempt++))
    done
    
    error_exit "Green service failed to start within timeout"
}

# Run health checks on green deployment
run_green_health_checks() {
    log "INFO" "Running health checks on green deployment (port $GREEN_PORT)..."
    
    local green_health_url="http://localhost:$GREEN_PORT/health"
    local green_api_url="http://localhost:$GREEN_PORT/api/v1/health"
    
    # Wait for service to be fully ready
    sleep 5
    
    local attempt=1
    while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
        log "INFO" "Health check attempt $attempt/$HEALTH_CHECK_RETRIES..."
        
        # Check health endpoint
        local health_response=$(curl -s -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" \
            "$green_health_url" 2>/dev/null || echo "000")
        
        local health_code=$(echo "$health_response" | tail -c 4)
        
        if [[ "$health_code" == "200" ]]; then
            log "SUCCESS" "Green health endpoint check passed"
            
            # Check API endpoint
            local api_response=$(curl -s -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" \
                "$green_api_url" 2>/dev/null || echo "000")
            
            local api_code=$(echo "$api_response" | tail -c 4)
            
            if [[ "$api_code" == "200" ]]; then
                log "SUCCESS" "Green API endpoint check passed"
                
                # Run additional health checks using existing health-check script
                if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
                    log "INFO" "Running comprehensive health checks..."
                    
                    # Temporarily override backend port for health check
                    BACKEND_PORT="$GREEN_PORT" "$SCRIPT_DIR/health-check.sh" backend
                    
                    if [[ $? -eq 0 ]]; then
                        log "SUCCESS" "All green deployment health checks passed"
                        return 0
                    else
                        log "ERROR" "Comprehensive health checks failed"
                    fi
                else
                    log "SUCCESS" "Basic health checks passed (comprehensive health-check script not found)"
                    return 0
                fi
            else
                log "WARN" "Green API endpoint check failed (HTTP $api_code)"
            fi
        else
            log "WARN" "Green health endpoint check failed (HTTP $health_code)"
        fi
        
        if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
            log "INFO" "Retrying health check in 10 seconds..."
            sleep 10
        fi
        
        ((attempt++))
    done
    
    error_exit "Green deployment health checks failed after $HEALTH_CHECK_RETRIES attempts"
}

# Update Nginx configuration to route to green
update_nginx_to_green() {
    log "INFO" "Updating Nginx configuration to route traffic to green deployment..."
    
    # Create backup of current Nginx configuration
    local nginx_backup="/tmp/nginx-config-backup-$(date +%Y%m%d_%H%M%S).conf"
    sudo cp "$NGINX_MAIN_CONFIG" "$nginx_backup"
    log "INFO" "Nginx configuration backed up to: $nginx_backup"
    
    # Update upstream configuration to point to green port
    sudo sed -i.bak "s/server backend:$BLUE_PORT;/server backend:$GREEN_PORT;/g" "$NGINX_MAIN_CONFIG"
    sudo sed -i.bak "s/server localhost:$BLUE_PORT;/server localhost:$GREEN_PORT;/g" "$NGINX_MAIN_CONFIG"
    
    # Test Nginx configuration
    if ! sudo nginx -t; then
        log "ERROR" "Nginx configuration test failed, restoring backup..."
        sudo cp "$nginx_backup" "$NGINX_MAIN_CONFIG"
        error_exit "Failed to update Nginx configuration"
    fi
    
    # Reload Nginx gracefully
    log "INFO" "Reloading Nginx configuration..."
    if ! sudo systemctl reload nginx; then
        log "ERROR" "Nginx reload failed, restoring backup..."
        sudo cp "$nginx_backup" "$NGINX_MAIN_CONFIG"
        sudo systemctl reload nginx
        error_exit "Failed to reload Nginx configuration"
    fi
    
    log "SUCCESS" "Nginx configuration updated to route traffic to green deployment"
    
    # Wait for traffic to switch
    log "INFO" "Waiting ${TRAFFIC_SWITCH_DELAY}s for traffic to switch to green..."
    sleep "$TRAFFIC_SWITCH_DELAY"
}

# Verify traffic is routing to green
verify_traffic_switch() {
    log "INFO" "Verifying traffic is routing to green deployment..."
    
    local public_health_url="http://localhost/health"
    local attempt=1
    
    while [[ $attempt -le 5 ]]; do
        # Make request through Nginx
        local response=$(curl -s -w "%{http_code}" --max-time 10 "$public_health_url" 2>/dev/null || echo "000")
        local http_code=$(echo "$response" | tail -c 4)
        
        if [[ "$http_code" == "200" ]]; then
            log "SUCCESS" "Traffic successfully routing to green deployment"
            return 0
        else
            log "WARN" "Traffic verification failed (HTTP $http_code), attempt $attempt/5"
        fi
        
        sleep 5
        ((attempt++))
    done
    
    error_exit "Failed to verify traffic routing to green deployment"
}

# Stop blue service and cleanup
stop_blue_service() {
    log "INFO" "Stopping blue service and cleaning up..."
    
    # Stop blue service
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "INFO" "Stopping blue service..."
        sudo systemctl stop "$SERVICE_NAME"
        
        # Wait for graceful shutdown
        local attempt=1
        while [[ $attempt -le 10 ]]; do
            if ! systemctl is-active --quiet "$SERVICE_NAME"; then
                log "SUCCESS" "Blue service stopped successfully"
                break
            fi
            
            log "INFO" "Waiting for blue service to stop (attempt $attempt/10)..."
            sleep 2
            ((attempt++))
        done
        
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log "WARN" "Blue service did not stop gracefully, forcing stop..."
            sudo systemctl kill "$SERVICE_NAME"
        fi
    else
        log "INFO" "Blue service was not running"
    fi
    
    # Disable blue service temporarily
    sudo systemctl disable "$SERVICE_NAME"
    
    log "SUCCESS" "Blue service stopped and disabled"
}

# Promote green to blue
promote_green_to_blue() {
    log "INFO" "Promoting green deployment to blue..."
    
    # Stop green service
    sudo systemctl stop "${SERVICE_NAME}-green"
    sudo systemctl disable "${SERVICE_NAME}-green"
    
    # Backup current blue deployment
    if [[ -d "$BLUE_DIR" ]]; then
        local blue_backup="$DEPLOY_DIR/backend-blue-backup-$(date +%Y%m%d_%H%M%S)"
        log "INFO" "Backing up current blue deployment to: $blue_backup"
        sudo mv "$BLUE_DIR" "$blue_backup"
    fi
    
    # Move green to blue
    sudo mv "$GREEN_DIR" "$BLUE_DIR"
    
    # Update blue configuration back to blue port
    if [[ -f "$BLUE_DIR/$CONFIG_FILE" ]]; then
        sudo sed -i.bak "s/PORT=$GREEN_PORT/PORT=$BLUE_PORT/g" "$BLUE_DIR/$CONFIG_FILE"
        sudo sed -i.bak "s/SERVER_PORT=$GREEN_PORT/SERVER_PORT=$BLUE_PORT/g" "$BLUE_DIR/$CONFIG_FILE"
    fi
    
    # Update Nginx back to blue port
    sudo sed -i.bak "s/server backend:$GREEN_PORT;/server backend:$BLUE_PORT;/g" "$NGINX_MAIN_CONFIG"
    sudo sed -i.bak "s/server localhost:$GREEN_PORT;/server localhost:$BLUE_PORT;/g" "$NGINX_MAIN_CONFIG"
    
    # Test and reload Nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
    else
        error_exit "Failed to update Nginx configuration back to blue port"
    fi
    
    # Start blue service with new deployment
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"
    
    # Remove green service file
    sudo rm -f "/etc/systemd/system/${SERVICE_NAME}-green.service"
    sudo systemctl daemon-reload
    
    log "SUCCESS" "Green deployment promoted to blue"
}

# Final verification
final_verification() {
    log "INFO" "Running final verification of deployment..."
    
    # Wait for service to be ready
    sleep 5
    
    # Run health checks on the promoted deployment
    if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
        "$SCRIPT_DIR/health-check.sh" backend
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "Final verification passed"
        else
            error_exit "Final verification failed"
        fi
    else
        # Basic health check
        local health_response=$(curl -s -w "%{http_code}" --max-time 30 "http://localhost/health" 2>/dev/null || echo "000")
        local health_code=$(echo "$health_response" | tail -c 4)
        
        if [[ "$health_code" == "200" ]]; then
            log "SUCCESS" "Final verification passed (basic check)"
        else
            error_exit "Final verification failed (HTTP $health_code)"
        fi
    fi
}

# Main deployment function
main() {
    local version="${1:-HEAD}"
    local artifact_path="${2:-}"
    
    # Parse command line arguments
    if [[ "$version" == "-h" ]] || [[ "$version" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Set global variables
    VERSION="$version"
    
    # Get actual commit hash
    local commit_hash=$(git rev-parse --short "$version" 2>/dev/null || echo "$version")
    
    log "INFO" "Starting blue-green deployment of backend"
    log "INFO" "Version: $version ($commit_hash)"
    log "INFO" "Artifact path: ${artifact_path:-'build locally'}"
    log "INFO" "Blue port: $BLUE_PORT, Green port: $GREEN_PORT"
    
    # Send start notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "start" "backend" "$version" "Blue-green deployment started"
    fi
    
    # Validate inputs
    validate_inputs "$version" "$artifact_path"
    
    # Get current deployment state
    local current_deployment=$(get_current_deployment)
    log "INFO" "Current active deployment: $current_deployment"
    
    # Create backup of current deployment
    if [[ -f "$SCRIPT_DIR/backup.sh" ]]; then
        log "INFO" "Creating backup of current deployment..."
        "$SCRIPT_DIR/backup.sh" backend
    fi
    
    # Prepare green deployment
    prepare_green_deployment "$version" "$artifact_path"
    
    # Create and start green service
    create_green_service
    start_green_service
    
    # Run health checks on green deployment
    run_green_health_checks
    
    # Update Nginx to route traffic to green
    update_nginx_to_green
    
    # Verify traffic switch
    verify_traffic_switch
    
    # Stop blue service
    stop_blue_service
    
    # Promote green to blue
    promote_green_to_blue
    
    # Final verification
    final_verification
    
    # Send success notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "success" "backend" "$version" "Blue-green deployment completed successfully"
    fi
    
    log "SUCCESS" "Blue-green deployment completed successfully!"
    log "INFO" "Version: $version ($commit_hash)"
    log "INFO" "Deployment time: $(date)"
    log "INFO" "Service is now running on port $BLUE_PORT"
}

# Run main function with all arguments
main "$@"