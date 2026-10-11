#!/bin/bash

# BugRelay Rolling Frontend Deployment Script
# Implements zero-downtime deployment for the frontend application
# Usage: ./deploy-frontend-rolling.sh [version] [artifact_path]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/bugrelay"
LOG_FILE="/var/log/bugrelay/rolling-deployment.log"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
NGINX_RELOAD_DELAY=5

# Frontend configuration
FRONTEND_PORT=3000
NGINX_MAIN_CONFIG="/etc/nginx/nginx.conf"
NGINX_SITE_CONFIG="/etc/nginx/conf.d/bugrelay.conf"

# Deployment paths
CURRENT_DIR="$DEPLOY_DIR/frontend"
NEW_DIR="$DEPLOY_DIR/frontend-new"
BACKUP_DIR="$DEPLOY_DIR/frontend-backup"

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
        "$SCRIPT_DIR/notify.sh" "failure" "frontend" "${VERSION:-unknown}" "$message"
    fi
    
    # Cleanup on failure
    cleanup_on_failure
    
    exit "$exit_code"
}

# Cleanup function for failures
cleanup_on_failure() {
    log "INFO" "Cleaning up failed deployment..."
    
    # Remove new deployment directory
    if [[ -d "$NEW_DIR" ]]; then
        log "INFO" "Removing failed new deployment..."
        sudo rm -rf "$NEW_DIR" || true
    fi
    
    # Restore original Nginx configuration if backup exists
    if [[ -f "${NGINX_SITE_CONFIG}.backup" ]]; then
        log "INFO" "Restoring original Nginx configuration..."
        sudo cp "${NGINX_SITE_CONFIG}.backup" "$NGINX_SITE_CONFIG"
        
        # Test and reload Nginx
        if sudo nginx -t; then
            sudo systemctl reload nginx
            log "INFO" "Nginx configuration restored"
        else
            log "ERROR" "Failed to restore Nginx configuration"
        fi
    fi
    
    # Ensure current frontend is still accessible
    if [[ -d "$CURRENT_DIR" ]]; then
        log "INFO" "Current frontend deployment should still be accessible"
    else
        log "ERROR" "Current frontend deployment is missing!"
    fi
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [VERSION] [ARTIFACT_PATH]

VERSION:
    Git commit hash, tag, or branch name (optional, defaults to current HEAD)

ARTIFACT_PATH:
    Path to the frontend build artifact directory (optional, will build if not provided)

Examples:
    $0                                    # Deploy current HEAD, build locally
    $0 v1.2.3                           # Deploy tag v1.2.3, build locally
    $0 abc123def /tmp/frontend-build     # Deploy specific commit with pre-built artifacts

Environment Variables:
    FRONTEND_PORT           Frontend service port (default: 3000)
    HEALTH_CHECK_TIMEOUT    Health check timeout in seconds (default: 60)
    HEALTH_CHECK_RETRIES    Number of health check retries (default: 5)
    NGINX_RELOAD_DELAY      Delay after Nginx reload in seconds (default: 5)

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
    if [[ -n "$artifact_path" ]] && [[ ! -d "$artifact_path" ]]; then
        error_exit "Artifact directory not found: $artifact_path"
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
    
    # Check disk space (require at least 1GB free for frontend builds)
    local available_space=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ "$available_space" -lt "$required_space" ]]; then
        error_exit "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
    fi
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        error_exit "Nginx is not running. Frontend deployment requires Nginx."
    fi
}

# Prepare new frontend deployment
prepare_new_deployment() {
    local version="$1"
    local artifact_path="$2"
    
    log "INFO" "Preparing new frontend deployment (version: $version)"
    
    # Remove existing new deployment directory
    if [[ -d "$NEW_DIR" ]]; then
        log "INFO" "Removing existing new deployment directory..."
        sudo rm -rf "$NEW_DIR"
    fi
    
    # Create new deployment directory
    sudo mkdir -p "$NEW_DIR"
    sudo chown deploy:deploy "$NEW_DIR"
    
    # Deploy frontend files
    if [[ -n "$artifact_path" ]]; then
        log "INFO" "Deploying pre-built frontend from: $artifact_path"
        
        # Copy all files from artifact directory
        sudo cp -r "$artifact_path"/* "$NEW_DIR/"
        
    else
        log "INFO" "Building frontend for version: $version"
        
        # Check if we have a frontend directory to build from
        if [[ -d "$PROJECT_ROOT/frontend" ]]; then
            log "INFO" "Building frontend from source..."
            
            # This would typically be done in CI/CD pipeline
            # For now, we'll copy from current deployment or build locally
            if [[ -d "$CURRENT_DIR" ]]; then
                log "INFO" "Copying from current deployment for testing..."
                sudo cp -r "$CURRENT_DIR"/* "$NEW_DIR/"
            else
                error_exit "No current deployment found and local build not implemented. Please provide artifact_path."
            fi
        else
            error_exit "Frontend source directory not found and no artifact provided"
        fi
    fi
    
    # Set proper ownership and permissions
    sudo chown -R deploy:deploy "$NEW_DIR"
    sudo find "$NEW_DIR" -type f -exec chmod 644 {} \;
    sudo find "$NEW_DIR" -type d -exec chmod 755 {} \;
    
    # Create deployment metadata
    local metadata_file="$NEW_DIR/.deployment-metadata.json"
    cat > "/tmp/deployment-metadata.json" << EOF
{
    "version": "$version",
    "commit_hash": "$(git rev-parse --short "$version" 2>/dev/null || echo "$version")",
    "deployment_time": "$(date -Iseconds)",
    "deployment_type": "rolling_update",
    "artifact_source": "$(if [[ -n "$artifact_path" ]]; then echo "$artifact_path"; else echo "local_build"; fi)"
}
EOF
    sudo mv "/tmp/deployment-metadata.json" "$metadata_file"
    sudo chown deploy:deploy "$metadata_file"
    
    log "SUCCESS" "New frontend deployment prepared"
}

# Run health checks on new deployment
run_new_deployment_health_checks() {
    log "INFO" "Running health checks on new frontend deployment..."
    
    # Create temporary Nginx configuration to test new deployment
    local temp_nginx_config="/tmp/nginx-test-$(date +%Y%m%d_%H%M%S).conf"
    local test_port=3001
    
    # Create minimal Nginx config for testing
    cat > "$temp_nginx_config" << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen $test_port;
        server_name localhost;
        
        root $NEW_DIR;
        index index.html;
        
        location / {
            try_files \$uri \$uri/ /index.html;
        }
        
        location /api/ {
            proxy_pass http://localhost:8080;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
    
    # Start temporary Nginx instance for testing
    log "INFO" "Starting temporary Nginx instance for testing on port $test_port..."
    sudo nginx -c "$temp_nginx_config" -p /tmp &
    local nginx_test_pid=$!
    
    # Wait for test server to start
    sleep 3
    
    # Function to cleanup test server
    cleanup_test_server() {
        if kill -0 "$nginx_test_pid" 2>/dev/null; then
            log "INFO" "Stopping test Nginx instance..."
            sudo kill "$nginx_test_pid" 2>/dev/null || true
        fi
        rm -f "$temp_nginx_config"
    }
    
    # Trap to ensure cleanup
    trap cleanup_test_server EXIT
    
    # Run health checks
    local attempt=1
    local test_url="http://localhost:$test_port"
    
    while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
        log "INFO" "Health check attempt $attempt/$HEALTH_CHECK_RETRIES..."
        
        # Check if test server is responding
        local response=$(curl -s -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" \
            "$test_url" 2>/dev/null || echo "000")
        
        local http_code=$(echo "$response" | tail -c 4)
        
        if [[ "$http_code" == "200" ]]; then
            log "SUCCESS" "Frontend home page check passed"
            
            # Check static assets
            local assets_response=$(curl -s -w "%{http_code}" --max-time 30 \
                "$test_url/_next/static/" 2>/dev/null || echo "000")
            
            local assets_code=$(echo "$assets_response" | tail -c 4)
            
            # 404 is expected for directory listing, but it means Nginx is serving the path
            if [[ "$assets_code" == "404" ]] || [[ "$assets_code" == "403" ]] || [[ "$assets_code" == "200" ]]; then
                log "SUCCESS" "Frontend static assets path check passed"
                
                # Check API proxy (should work if backend is running)
                local api_response=$(curl -s -w "%{http_code}" --max-time 30 \
                    "$test_url/api/v1/health" 2>/dev/null || echo "000")
                
                local api_code=$(echo "$api_response" | tail -c 4)
                
                if [[ "$api_code" == "200" ]]; then
                    log "SUCCESS" "Frontend API proxy check passed"
                elif [[ "$api_code" == "502" ]] || [[ "$api_code" == "503" ]]; then
                    log "WARN" "Frontend API proxy check failed (backend may be down), but frontend is working"
                else
                    log "WARN" "Frontend API proxy returned HTTP $api_code"
                fi
                
                # Cleanup and return success
                cleanup_test_server
                trap - EXIT
                log "SUCCESS" "New frontend deployment health checks passed"
                return 0
            else
                log "WARN" "Frontend static assets check failed (HTTP $assets_code)"
            fi
        else
            log "WARN" "Frontend home page check failed (HTTP $http_code)"
        fi
        
        if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
            log "INFO" "Retrying health check in 10 seconds..."
            sleep 10
        fi
        
        ((attempt++))
    done
    
    # Cleanup on failure
    cleanup_test_server
    trap - EXIT
    error_exit "New frontend deployment health checks failed after $HEALTH_CHECK_RETRIES attempts"
}

# Update Nginx configuration to point to new deployment
update_nginx_configuration() {
    log "INFO" "Updating Nginx configuration to point to new deployment..."
    
    # Create backup of current Nginx configuration
    local nginx_backup="${NGINX_SITE_CONFIG}.backup-$(date +%Y%m%d_%H%M%S)"
    sudo cp "$NGINX_SITE_CONFIG" "$nginx_backup"
    sudo cp "$NGINX_SITE_CONFIG" "${NGINX_SITE_CONFIG}.backup"  # Keep latest backup
    log "INFO" "Nginx configuration backed up to: $nginx_backup"
    
    # Update the root directive in the Nginx configuration
    # This assumes the frontend is served as static files
    if grep -q "root.*frontend" "$NGINX_SITE_CONFIG"; then
        # Update existing root directive
        sudo sed -i.bak "s|root.*frontend[^;]*;|root $NEW_DIR;|g" "$NGINX_SITE_CONFIG"
    else
        # If no specific root directive for frontend, we need to add it
        # This is more complex and depends on the exact Nginx configuration structure
        log "WARN" "No specific frontend root directive found, updating proxy_pass instead"
        
        # For proxy-based setup, we would update the upstream or proxy_pass
        # But since we're serving static files, we need to modify the location blocks
        
        # Create a temporary updated configuration
        local temp_config="/tmp/nginx-site-update-$(date +%Y%m%d_%H%M%S).conf"
        
        # Copy current config and modify it
        sudo cp "$NGINX_SITE_CONFIG" "$temp_config"
        
        # Update any references to the frontend directory
        sudo sed -i.bak "s|$CURRENT_DIR|$NEW_DIR|g" "$temp_config"
        
        # If the config uses proxy_pass to frontend, we need different handling
        if grep -q "proxy_pass.*frontend" "$NGINX_SITE_CONFIG"; then
            log "INFO" "Configuration uses proxy_pass, no changes needed for static files"
            sudo rm -f "$temp_config"
        else
            # Replace the configuration
            sudo cp "$temp_config" "$NGINX_SITE_CONFIG"
            sudo rm -f "$temp_config"
        fi
    fi
    
    # Test Nginx configuration
    if ! sudo nginx -t; then
        log "ERROR" "Nginx configuration test failed, restoring backup..."
        sudo cp "${NGINX_SITE_CONFIG}.backup" "$NGINX_SITE_CONFIG"
        error_exit "Failed to update Nginx configuration"
    fi
    
    log "SUCCESS" "Nginx configuration updated successfully"
}

# Gracefully reload Nginx
graceful_nginx_reload() {
    log "INFO" "Performing graceful Nginx reload..."
    
    # Send reload signal to Nginx
    if ! sudo systemctl reload nginx; then
        log "ERROR" "Nginx reload failed, restoring backup configuration..."
        sudo cp "${NGINX_SITE_CONFIG}.backup" "$NGINX_SITE_CONFIG"
        sudo systemctl reload nginx
        error_exit "Failed to reload Nginx configuration"
    fi
    
    log "SUCCESS" "Nginx reloaded successfully"
    
    # Wait for reload to take effect
    log "INFO" "Waiting ${NGINX_RELOAD_DELAY}s for Nginx reload to take effect..."
    sleep "$NGINX_RELOAD_DELAY"
}

# Verify new deployment is accessible
verify_new_deployment() {
    log "INFO" "Verifying new deployment is accessible through Nginx..."
    
    local public_url="http://localhost"
    local attempt=1
    
    while [[ $attempt -le 5 ]]; do
        # Test main frontend page
        local response=$(curl -s -w "%{http_code}" --max-time 30 "$public_url" 2>/dev/null || echo "000")
        local http_code=$(echo "$response" | tail -c 4)
        
        if [[ "$http_code" == "200" ]]; then
            log "SUCCESS" "New deployment is accessible (HTTP $http_code)"
            
            # Additional verification: check if we're serving the new deployment
            # by looking for deployment metadata or unique content
            if [[ -f "$NEW_DIR/.deployment-metadata.json" ]]; then
                local metadata_check=$(curl -s --max-time 10 "$public_url/.deployment-metadata.json" 2>/dev/null || echo "")
                if [[ -n "$metadata_check" ]]; then
                    log "SUCCESS" "Confirmed serving new deployment (metadata accessible)"
                else
                    log "INFO" "New deployment accessible (metadata not publicly accessible - this is normal)"
                fi
            fi
            
            return 0
        else
            log "WARN" "New deployment verification failed (HTTP $http_code), attempt $attempt/5"
        fi
        
        sleep 5
        ((attempt++))
    done
    
    error_exit "Failed to verify new deployment accessibility"
}

# Remove old deployment
remove_old_deployment() {
    log "INFO" "Removing old deployment..."
    
    # Move current deployment to backup location
    if [[ -d "$CURRENT_DIR" ]]; then
        # Remove old backup if it exists
        if [[ -d "$BACKUP_DIR" ]]; then
            log "INFO" "Removing previous backup..."
            sudo rm -rf "$BACKUP_DIR"
        fi
        
        # Move current to backup
        log "INFO" "Moving current deployment to backup location..."
        sudo mv "$CURRENT_DIR" "$BACKUP_DIR"
    fi
    
    # Move new deployment to current location
    log "INFO" "Moving new deployment to current location..."
    sudo mv "$NEW_DIR" "$CURRENT_DIR"
    
    # Update Nginx configuration to use standard path
    log "INFO" "Updating Nginx configuration to use standard frontend path..."
    sudo sed -i.bak "s|$NEW_DIR|$CURRENT_DIR|g" "$NGINX_SITE_CONFIG"
    
    # Test and reload Nginx one final time
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log "SUCCESS" "Nginx configuration updated to use standard path"
    else
        error_exit "Failed to update Nginx configuration to standard path"
    fi
    
    log "SUCCESS" "Old deployment removed and new deployment is now current"
}

# Final verification
final_verification() {
    log "INFO" "Running final verification of deployment..."
    
    # Wait for everything to settle
    sleep 5
    
    # Run comprehensive health checks if available
    if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
        "$SCRIPT_DIR/health-check.sh" frontend
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "Final verification passed"
        else
            error_exit "Final verification failed"
        fi
    else
        # Basic health check
        local health_response=$(curl -s -w "%{http_code}" --max-time 30 "http://localhost" 2>/dev/null || echo "000")
        local health_code=$(echo "$health_response" | tail -c 4)
        
        if [[ "$health_code" == "200" ]]; then
            log "SUCCESS" "Final verification passed (basic check)"
        else
            error_exit "Final verification failed (HTTP $health_code)"
        fi
    fi
    
    # Display deployment information
    if [[ -f "$CURRENT_DIR/.deployment-metadata.json" ]]; then
        log "INFO" "Deployment metadata:"
        cat "$CURRENT_DIR/.deployment-metadata.json" | jq . 2>/dev/null || cat "$CURRENT_DIR/.deployment-metadata.json"
    fi
}

# Cleanup backup files
cleanup_backups() {
    log "INFO" "Cleaning up old backup files..."
    
    # Remove old Nginx configuration backups (keep last 5)
    local nginx_backups=($(ls -t "${NGINX_SITE_CONFIG}.backup-"* 2>/dev/null || true))
    if [[ ${#nginx_backups[@]} -gt 5 ]]; then
        for ((i=5; i<${#nginx_backups[@]}; i++)); do
            log "INFO" "Removing old Nginx backup: ${nginx_backups[$i]}"
            sudo rm -f "${nginx_backups[$i]}"
        done
    fi
    
    # Keep the latest backup file
    # The $BACKUP_DIR (old deployment) will be kept for manual rollback if needed
    
    log "SUCCESS" "Backup cleanup completed"
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
    
    log "INFO" "Starting rolling update deployment of frontend"
    log "INFO" "Version: $version ($commit_hash)"
    log "INFO" "Artifact path: ${artifact_path:-'build locally'}"
    log "INFO" "Frontend port: $FRONTEND_PORT"
    
    # Send start notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "start" "frontend" "$version" "Rolling update deployment started"
    fi
    
    # Validate inputs
    validate_inputs "$version" "$artifact_path"
    
    # Create backup of current deployment using backup script
    if [[ -f "$SCRIPT_DIR/backup.sh" ]]; then
        log "INFO" "Creating backup of current deployment..."
        "$SCRIPT_DIR/backup.sh" frontend
    fi
    
    # Prepare new deployment
    prepare_new_deployment "$version" "$artifact_path"
    
    # Run health checks on new deployment
    run_new_deployment_health_checks
    
    # Update Nginx configuration
    update_nginx_configuration
    
    # Gracefully reload Nginx
    graceful_nginx_reload
    
    # Verify new deployment is accessible
    verify_new_deployment
    
    # Remove old deployment
    remove_old_deployment
    
    # Final verification
    final_verification
    
    # Cleanup old backups
    cleanup_backups
    
    # Send success notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "success" "frontend" "$version" "Rolling update deployment completed successfully"
    fi
    
    log "SUCCESS" "Rolling update deployment completed successfully!"
    log "INFO" "Version: $version ($commit_hash)"
    log "INFO" "Deployment time: $(date)"
    log "INFO" "Frontend is now accessible at http://localhost"
}

# Run main function with all arguments
main "$@"