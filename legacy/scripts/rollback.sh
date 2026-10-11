#!/bin/bash

# BugRelay Rollback Script
# Rolls back deployed components to previous version
# Usage: ./rollback.sh [backend|frontend|monitoring|docs] [backup_version]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/opt/bugrelay/backups"
DEPLOY_DIR="/opt/bugrelay"
LOG_FILE="/var/log/bugrelay/rollback.log"
ROLLBACK_TIMEOUT=300  # 5 minutes
AUDIT_LOG_SCRIPT="$SCRIPT_DIR/audit-log.sh"
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
    
    # Send rollback failure notification
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "rollback_failed" "$COMPONENT" "$BACKUP_VERSION" "$message"
    fi
    
    exit "$exit_code"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [COMPONENT] [BACKUP_VERSION]

COMPONENT:
    backend     Rollback the Go backend API
    frontend    Rollback the Next.js frontend application
    monitoring  Rollback the monitoring stack configuration
    docs        Rollback the documentation site

BACKUP_VERSION:
    Specific backup version to restore (optional)
    If not specified, will use the most recent backup
    Format: component_YYYYMMDD_HHMMSS (e.g., backend_20240104_143022)

Examples:
    $0 backend                           # Rollback backend to most recent backup
    $0 frontend backend_20240104_143022  # Rollback frontend to specific backup
    $0 monitoring                        # Rollback monitoring to most recent backup
    $0 docs                             # Rollback docs to most recent backup

Environment Variables:
    BACKUP_DIR          Custom backup directory (default: /opt/bugrelay/backups)
    ROLLBACK_TIMEOUT    Rollback timeout in seconds (default: 300)
    SKIP_HEALTH_CHECK   Skip health check after rollback (default: false)
    DRY_RUN            Show what would be done without executing (default: false)

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

# Find latest backup
find_latest_backup() {
    local component="$1"
    local component_backup_dir="$BACKUP_DIR/$component"
    
    if [[ ! -d "$component_backup_dir" ]]; then
        error_exit "No backup directory found for component: $component"
    fi
    
    # Find the most recent backup file
    local latest_backup=""
    if [[ -n "$(find "$component_backup_dir" -name "${component}_*.tar.gz" -type f 2>/dev/null)" ]]; then
        # Compressed backups
        latest_backup=$(find "$component_backup_dir" -name "${component}_*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    elif [[ -n "$(find "$component_backup_dir" -name "${component}_*" -type d 2>/dev/null)" ]]; then
        # Directory backups
        latest_backup=$(find "$component_backup_dir" -name "${component}_*" -type d -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    fi
    
    if [[ -z "$latest_backup" ]]; then
        error_exit "No backups found for component: $component"
    fi
    
    echo "$(basename "$latest_backup")"
}

# Validate backup exists
validate_backup() {
    local component="$1"
    local backup_version="$2"
    local backup_path="$BACKUP_DIR/$component/$backup_version"
    
    # Check if backup exists (compressed or directory)
    if [[ -f "$backup_path" ]] || [[ -d "$backup_path" ]]; then
        return 0
    fi
    
    # Try with .tar.gz extension if not provided
    if [[ ! "$backup_version" =~ \.tar\.gz$ ]]; then
        local compressed_backup="$backup_path.tar.gz"
        if [[ -f "$compressed_backup" ]]; then
            echo "$backup_version.tar.gz"
            return 0
        fi
    fi
    
    error_exit "Backup not found: $backup_path"
}

# Get backup metadata
get_backup_metadata() {
    local component="$1"
    local backup_version="$2"
    local metadata_file="$BACKUP_DIR/$component/${backup_version%.tar.gz}.metadata"
    
    if [[ -f "$metadata_file" ]]; then
        log "INFO" "Backup metadata found: $metadata_file"
        
        # Display backup information
        if command -v jq >/dev/null 2>&1; then
            local timestamp=$(jq -r '.timestamp' "$metadata_file" 2>/dev/null || echo "unknown")
            local backup_size=$(jq -r '.backup_size' "$metadata_file" 2>/dev/null || echo "unknown")
            local git_commit=$(jq -r '.git_commit' "$metadata_file" 2>/dev/null || echo "unknown")
            
            log "INFO" "Backup timestamp: $timestamp"
            log "INFO" "Backup size: $backup_size bytes"
            log "INFO" "Git commit: $git_commit"
        else
            log "WARN" "jq not available, cannot parse backup metadata"
        fi
    else
        log "WARN" "No metadata file found for backup: $backup_version"
    fi
}

# Stop services before rollback
stop_services() {
    local component="$1"
    
    log "INFO" "Stopping services for $component rollback..."
    
    case "$component" in
        backend)
            if systemctl is-active --quiet bugrelay-backend; then
                log "INFO" "Stopping backend service..."
                sudo systemctl stop bugrelay-backend
                
                # Wait for service to stop
                local timeout=30
                while systemctl is-active --quiet bugrelay-backend && [[ $timeout -gt 0 ]]; do
                    sleep 1
                    ((timeout--))
                done
                
                if systemctl is-active --quiet bugrelay-backend; then
                    error_exit "Failed to stop backend service within timeout"
                fi
            fi
            ;;
        frontend)
            # Frontend doesn't have a separate service, handled by Nginx
            log "INFO" "Frontend uses Nginx, no separate service to stop"
            ;;
        monitoring)
            local services=("prometheus" "grafana-server" "loki" "promtail")
            for service in "${services[@]}"; do
                if systemctl is-active --quiet "$service" 2>/dev/null; then
                    log "INFO" "Stopping $service..."
                    sudo systemctl stop "$service"
                fi
            done
            ;;
        docs)
            # Docs doesn't have a separate service, handled by Nginx
            log "INFO" "Documentation uses Nginx, no separate service to stop"
            ;;
    esac
}

# Restore from backup
restore_from_backup() {
    local component="$1"
    local backup_version="$2"
    local backup_path="$BACKUP_DIR/$component/$backup_version"
    local component_deploy_dir="$DEPLOY_DIR/$component"
    
    log "INFO" "Restoring $component from backup: $backup_version"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would restore $component from $backup_path"
        return 0
    fi
    
    # Create temporary backup of current state (in case rollback fails)
    local temp_backup_dir="/tmp/rollback_temp_$(date +%s)"
    if [[ -d "$component_deploy_dir" ]]; then
        log "INFO" "Creating temporary backup of current state..."
        sudo mkdir -p "$temp_backup_dir"
        sudo cp -r "$component_deploy_dir" "$temp_backup_dir/"
    fi
    
    # Remove current deployment
    if [[ -d "$component_deploy_dir" ]]; then
        log "INFO" "Removing current deployment..."
        sudo rm -rf "$component_deploy_dir"
    fi
    
    # Restore from backup
    if [[ -f "$backup_path" ]]; then
        # Compressed backup
        log "INFO" "Extracting compressed backup..."
        sudo mkdir -p "$DEPLOY_DIR"
        sudo tar -xzf "$backup_path" -C "$DEPLOY_DIR"
        
        # Verify extraction
        if [[ ! -d "$component_deploy_dir" ]]; then
            error_exit "Failed to extract backup: $backup_path"
        fi
        
    elif [[ -d "$backup_path" ]]; then
        # Directory backup
        log "INFO" "Copying directory backup..."
        sudo cp -r "$backup_path" "$component_deploy_dir"
        
    else
        error_exit "Backup not found or invalid: $backup_path"
    fi
    
    # Set proper permissions
    sudo chown -R deploy:deploy "$component_deploy_dir"
    sudo chmod -R 755 "$component_deploy_dir"
    
    # Component-specific restoration steps
    case "$component" in
        backend)
            # Ensure binary is executable
            if [[ -f "$component_deploy_dir/bugrelay-backend" ]]; then
                sudo chmod +x "$component_deploy_dir/bugrelay-backend"
            fi
            
            # Restore configuration files
            if [[ -f "$component_deploy_dir/.env" ]]; then
                sudo chmod 600 "$component_deploy_dir/.env"
            fi
            ;;
        frontend)
            # Update Nginx configuration to point to restored frontend
            log "INFO" "Updating Nginx configuration for frontend rollback..."
            # This would update the Nginx config to point to the restored directory
            ;;
        monitoring)
            # Restore monitoring configurations
            log "INFO" "Restoring monitoring configurations..."
            ;;
        docs)
            # Update Nginx configuration for docs
            log "INFO" "Updating Nginx configuration for docs rollback..."
            ;;
    esac
    
    # Clean up temporary backup
    if [[ -d "$temp_backup_dir" ]]; then
        sudo rm -rf "$temp_backup_dir"
    fi
    
    log "SUCCESS" "Backup restoration completed"
}

# Start services after rollback
start_services() {
    local component="$1"
    
    log "INFO" "Starting services after $component rollback..."
    
    case "$component" in
        backend)
            log "INFO" "Starting backend service..."
            sudo systemctl start bugrelay-backend
            sudo systemctl enable bugrelay-backend
            
            # Wait for service to start
            local timeout=30
            while ! systemctl is-active --quiet bugrelay-backend && [[ $timeout -gt 0 ]]; do
                sleep 1
                ((timeout--))
            done
            
            if ! systemctl is-active --quiet bugrelay-backend; then
                error_exit "Failed to start backend service after rollback"
            fi
            ;;
        frontend)
            # Test and reload Nginx configuration
            if ! sudo nginx -t; then
                error_exit "Nginx configuration test failed after frontend rollback"
            fi
            
            log "INFO" "Reloading Nginx for frontend rollback..."
            sudo systemctl reload nginx
            ;;
        monitoring)
            local services=("prometheus" "grafana-server" "loki" "promtail")
            for service in "${services[@]}"; do
                if systemctl is-enabled --quiet "$service" 2>/dev/null; then
                    log "INFO" "Starting $service..."
                    sudo systemctl start "$service"
                    
                    # Brief wait for service to start
                    sleep 2
                fi
            done
            ;;
        docs)
            # Test and reload Nginx configuration
            if ! sudo nginx -t; then
                error_exit "Nginx configuration test failed after docs rollback"
            fi
            
            log "INFO" "Reloading Nginx for docs rollback..."
            sudo systemctl reload nginx
            ;;
    esac
    
    log "SUCCESS" "Services started successfully"
}

# Verify rollback with health checks
verify_rollback() {
    local component="$1"
    
    if [[ "${SKIP_HEALTH_CHECK:-false}" == "true" ]]; then
        log "WARN" "Skipping health check verification (SKIP_HEALTH_CHECK=true)"
        return 0
    fi
    
    log "INFO" "Verifying rollback with health checks..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would run health checks for $component"
        return 0
    fi
    
    # Wait a moment for services to fully start
    sleep 10
    
    # Run health checks
    if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
        if "$SCRIPT_DIR/health-check.sh" "$component"; then
            log "SUCCESS" "Rollback verification passed"
            return 0
        else
            error_exit "Rollback verification failed - health checks did not pass"
        fi
    else
        log "WARN" "Health check script not found, skipping verification"
        return 0
    fi
}

# Send rollback notification
send_rollback_notification() {
    local status="$1"
    local component="$2"
    local backup_version="$3"
    local message="${4:-}"
    
    log "INFO" "Sending rollback notification..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would send rollback notification"
        return 0
    fi
    
    if [[ -f "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "rollback" "$component" "$backup_version" "$message"
    else
        log "WARN" "Notification script not found, skipping notification"
    fi
}

# Main rollback function
main() {
    local component="${1:-}"
    local backup_version="${2:-}"
    
    # Parse command line arguments
    if [[ "$#" -eq 0 ]] || [[ "$component" == "-h" ]] || [[ "$component" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate component
    validate_component "$component"
    
    # Set global variables
    COMPONENT="$component"
    
    # Find backup version if not specified
    if [[ -z "$backup_version" ]]; then
        log "INFO" "No backup version specified, finding latest backup..."
        backup_version=$(find_latest_backup "$component")
        log "INFO" "Using latest backup: $backup_version"
    fi
    
    # Validate backup exists and get correct filename
    backup_version=$(validate_backup "$component" "$backup_version")
    BACKUP_VERSION="$backup_version"
    
    log "INFO" "Starting rollback of $component to backup: $backup_version"
    log "INFO" "Dry run: ${DRY_RUN:-false}"
    
    # Get backup metadata
    get_backup_metadata "$component" "$backup_version"
    
    # Confirm rollback (unless in dry run mode)
    if [[ "${DRY_RUN:-false}" != "true" ]] && [[ "${FORCE_ROLLBACK:-false}" != "true" ]]; then
        echo -n "Are you sure you want to rollback $component to $backup_version? (y/N): "
        read -r confirmation
        if [[ "$confirmation" != "y" ]] && [[ "$confirmation" != "Y" ]]; then
            log "INFO" "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Start rollback process
    local start_time=$(date +%s)
    
    # Log rollback start to audit log
    local current_version=$(get_current_version "$component" || echo "unknown")
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" rollback "$component" "$current_version" "$backup_version" "Manual rollback initiated" "$ENVIRONMENT" || true
    fi
    
    # Send rollback start notification
    send_rollback_notification "start" "$component" "$backup_version" "Rollback started"
    
    # Stop services
    stop_services "$component"
    
    # Restore from backup
    restore_from_backup "$component" "$backup_version"
    
    # Start services
    start_services "$component"
    
    # Verify rollback
    verify_rollback "$component"
    
    # Calculate rollback duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Send success notification
    send_rollback_notification "success" "$component" "$backup_version" "Rollback completed successfully in ${duration}s"
    
    log "SUCCESS" "Rollback completed successfully!"
    log "INFO" "Component: $component"
    log "INFO" "Backup version: $backup_version"
    log "INFO" "Rollback duration: ${duration}s"
    log "INFO" "Rollback time: $(date)"
}

# Run main function with all arguments
main "$@"