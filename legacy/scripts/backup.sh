#!/bin/bash

# BugRelay Backup Script
# Creates backups of deployed components before deployment
# Usage: ./backup.sh [backend|frontend|monitoring|docs]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/opt/bugrelay/backups"
DEPLOY_DIR="/opt/bugrelay"
LOG_FILE="/var/log/bugrelay/backup.log"
MAX_BACKUPS=5

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
    exit "$exit_code"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [COMPONENT]

COMPONENT:
    backend     Backup the Go backend API
    frontend    Backup the Next.js frontend application
    monitoring  Backup the monitoring stack configuration
    docs        Backup the documentation site

Examples:
    $0 backend      # Backup backend service
    $0 frontend     # Backup frontend application
    $0 monitoring   # Backup monitoring configuration
    $0 docs         # Backup documentation site

Environment Variables:
    BACKUP_DIR      Custom backup directory (default: /opt/bugrelay/backups)
    MAX_BACKUPS     Maximum number of backups to keep (default: 5)
    COMPRESS        Compress backups (default: true)

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

# Create backup directory structure
create_backup_structure() {
    local component="$1"
    local component_backup_dir="$BACKUP_DIR/$component"
    
    log "INFO" "Creating backup directory structure for $component"
    
    # Create component backup directory
    if [[ ! -d "$component_backup_dir" ]]; then
        mkdir -p "$component_backup_dir"
        log "INFO" "Created backup directory: $component_backup_dir"
    fi
    
    # Ensure proper permissions
    if [[ "$USER" == "root" ]]; then
        chown -R deploy:deploy "$BACKUP_DIR"
    fi
    
    chmod -R 755 "$BACKUP_DIR"
}

# Generate backup filename with timestamp
generate_backup_filename() {
    local component="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="${component}_${timestamp}"
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        echo "${backup_name}.tar.gz"
    else
        echo "${backup_name}"
    fi
}

# Check if component exists and is deployed
check_component_exists() {
    local component="$1"
    local component_path=""
    
    case "$component" in
        backend)
            component_path="$DEPLOY_DIR/backend"
            ;;
        frontend)
            component_path="$DEPLOY_DIR/frontend"
            ;;
        monitoring)
            component_path="$DEPLOY_DIR/monitoring"
            ;;
        docs)
            component_path="$DEPLOY_DIR/docs"
            ;;
    esac
    
    if [[ ! -d "$component_path" ]]; then
        log "WARN" "Component $component not found at $component_path, creating empty backup"
        return 1
    fi
    
    return 0
}

# Backup backend component
backup_backend() {
    local backup_filename="$1"
    local backup_path="$BACKUP_DIR/backend/$backup_filename"
    local backend_dir="$DEPLOY_DIR/backend"
    
    log "INFO" "Backing up backend component..."
    
    if ! check_component_exists "backend"; then
        # Create empty backup for consistency
        if [[ "${COMPRESS:-true}" == "true" ]]; then
            tar -czf "$backup_path" -T /dev/null 2>/dev/null || true
        else
            mkdir -p "$backup_path"
        fi
        log "WARN" "Created empty backup for non-existent backend"
        return 0
    fi
    
    # Get current service status
    local service_status="stopped"
    if systemctl is-active --quiet bugrelay-backend 2>/dev/null; then
        service_status="running"
    fi
    
    # Create backup metadata
    local metadata_file="$BACKUP_DIR/backend/${backup_filename%.tar.gz}.metadata"
    cat > "$metadata_file" << EOF
{
    "component": "backend",
    "timestamp": "$(date -Iseconds)",
    "service_status": "$service_status",
    "backup_size": "0",
    "files_count": "0",
    "git_commit": "$(cd "$backend_dir" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "backup_type": "$(if [[ "${COMPRESS:-true}" == "true" ]]; then echo "compressed"; else echo "directory"; fi)"
}
EOF
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # Create compressed backup
        log "INFO" "Creating compressed backup: $backup_path"
        tar -czf "$backup_path" -C "$DEPLOY_DIR" backend/
        
        # Update metadata with actual size
        local backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo "0")
        local files_count=$(tar -tzf "$backup_path" | wc -l)
        
        # Update metadata
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
        
    else
        # Create directory backup
        log "INFO" "Creating directory backup: $backup_path"
        cp -r "$backend_dir" "$backup_path"
        
        # Update metadata
        local backup_size=$(du -sb "$backup_path" | cut -f1)
        local files_count=$(find "$backup_path" -type f | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
    fi
    
    log "SUCCESS" "Backend backup created: $backup_path"
}

# Backup frontend component
backup_frontend() {
    local backup_filename="$1"
    local backup_path="$BACKUP_DIR/frontend/$backup_filename"
    local frontend_dir="$DEPLOY_DIR/frontend"
    
    log "INFO" "Backing up frontend component..."
    
    if ! check_component_exists "frontend"; then
        # Create empty backup for consistency
        if [[ "${COMPRESS:-true}" == "true" ]]; then
            tar -czf "$backup_path" -T /dev/null 2>/dev/null || true
        else
            mkdir -p "$backup_path"
        fi
        log "WARN" "Created empty backup for non-existent frontend"
        return 0
    fi
    
    # Create backup metadata
    local metadata_file="$BACKUP_DIR/frontend/${backup_filename%.tar.gz}.metadata"
    cat > "$metadata_file" << EOF
{
    "component": "frontend",
    "timestamp": "$(date -Iseconds)",
    "nginx_status": "$(systemctl is-active nginx 2>/dev/null || echo 'unknown')",
    "backup_size": "0",
    "files_count": "0",
    "git_commit": "$(cd "$frontend_dir" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "backup_type": "$(if [[ "${COMPRESS:-true}" == "true" ]]; then echo "compressed"; else echo "directory"; fi)"
}
EOF
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # Create compressed backup
        log "INFO" "Creating compressed backup: $backup_path"
        tar -czf "$backup_path" -C "$DEPLOY_DIR" frontend/
        
        # Update metadata with actual size
        local backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo "0")
        local files_count=$(tar -tzf "$backup_path" | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
        
    else
        # Create directory backup
        log "INFO" "Creating directory backup: $backup_path"
        cp -r "$frontend_dir" "$backup_path"
        
        # Update metadata
        local backup_size=$(du -sb "$backup_path" | cut -f1)
        local files_count=$(find "$backup_path" -type f | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
    fi
    
    log "SUCCESS" "Frontend backup created: $backup_path"
}

# Backup monitoring component
backup_monitoring() {
    local backup_filename="$1"
    local backup_path="$BACKUP_DIR/monitoring/$backup_filename"
    local monitoring_dir="$DEPLOY_DIR/monitoring"
    
    log "INFO" "Backing up monitoring component..."
    
    if ! check_component_exists "monitoring"; then
        # Create empty backup for consistency
        if [[ "${COMPRESS:-true}" == "true" ]]; then
            tar -czf "$backup_path" -T /dev/null 2>/dev/null || true
        else
            mkdir -p "$backup_path"
        fi
        log "WARN" "Created empty backup for non-existent monitoring"
        return 0
    fi
    
    # Get monitoring services status
    local services=("prometheus" "grafana-server" "loki" "promtail")
    local services_status=""
    for service in "${services[@]}"; do
        local status=$(systemctl is-active "$service" 2>/dev/null || echo "inactive")
        services_status="${services_status}\"$service\": \"$status\", "
    done
    services_status="${services_status%, }"  # Remove trailing comma
    
    # Create backup metadata
    local metadata_file="$BACKUP_DIR/monitoring/${backup_filename%.tar.gz}.metadata"
    cat > "$metadata_file" << EOF
{
    "component": "monitoring",
    "timestamp": "$(date -Iseconds)",
    "services_status": { $services_status },
    "backup_size": "0",
    "files_count": "0",
    "git_commit": "$(cd "$monitoring_dir" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "backup_type": "$(if [[ "${COMPRESS:-true}" == "true" ]]; then echo "compressed"; else echo "directory"; fi)"
}
EOF
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # Create compressed backup
        log "INFO" "Creating compressed backup: $backup_path"
        tar -czf "$backup_path" -C "$DEPLOY_DIR" monitoring/
        
        # Update metadata with actual size
        local backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo "0")
        local files_count=$(tar -tzf "$backup_path" | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
        
    else
        # Create directory backup
        log "INFO" "Creating directory backup: $backup_path"
        cp -r "$monitoring_dir" "$backup_path"
        
        # Update metadata
        local backup_size=$(du -sb "$backup_path" | cut -f1)
        local files_count=$(find "$backup_path" -type f | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
    fi
    
    log "SUCCESS" "Monitoring backup created: $backup_path"
}

# Backup docs component
backup_docs() {
    local backup_filename="$1"
    local backup_path="$BACKUP_DIR/docs/$backup_filename"
    local docs_dir="$DEPLOY_DIR/docs"
    
    log "INFO" "Backing up docs component..."
    
    if ! check_component_exists "docs"; then
        # Create empty backup for consistency
        if [[ "${COMPRESS:-true}" == "true" ]]; then
            tar -czf "$backup_path" -T /dev/null 2>/dev/null || true
        else
            mkdir -p "$backup_path"
        fi
        log "WARN" "Created empty backup for non-existent docs"
        return 0
    fi
    
    # Create backup metadata
    local metadata_file="$BACKUP_DIR/docs/${backup_filename%.tar.gz}.metadata"
    cat > "$metadata_file" << EOF
{
    "component": "docs",
    "timestamp": "$(date -Iseconds)",
    "nginx_status": "$(systemctl is-active nginx 2>/dev/null || echo 'unknown')",
    "backup_size": "0",
    "files_count": "0",
    "git_commit": "$(cd "$docs_dir" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "backup_type": "$(if [[ "${COMPRESS:-true}" == "true" ]]; then echo "compressed"; else echo "directory"; fi)"
}
EOF
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # Create compressed backup
        log "INFO" "Creating compressed backup: $backup_path"
        tar -czf "$backup_path" -C "$DEPLOY_DIR" docs/
        
        # Update metadata with actual size
        local backup_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null || echo "0")
        local files_count=$(tar -tzf "$backup_path" | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
        
    else
        # Create directory backup
        log "INFO" "Creating directory backup: $backup_path"
        cp -r "$docs_dir" "$backup_path"
        
        # Update metadata
        local backup_size=$(du -sb "$backup_path" | cut -f1)
        local files_count=$(find "$backup_path" -type f | wc -l)
        
        sed -i.bak "s/\"backup_size\": \"0\"/\"backup_size\": \"$backup_size\"/" "$metadata_file"
        sed -i.bak "s/\"files_count\": \"0\"/\"files_count\": \"$files_count\"/" "$metadata_file"
        rm -f "${metadata_file}.bak"
    fi
    
    log "SUCCESS" "Docs backup created: $backup_path"
}

# Verify backup integrity
verify_backup() {
    local component="$1"
    local backup_filename="$2"
    local backup_path="$BACKUP_DIR/$component/$backup_filename"
    
    log "INFO" "Verifying backup integrity: $backup_filename"
    
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # Verify compressed backup
        if [[ ! -f "$backup_path" ]]; then
            error_exit "Backup file not found: $backup_path"
        fi
        
        # Test archive integrity
        if ! tar -tzf "$backup_path" >/dev/null 2>&1; then
            error_exit "Backup archive is corrupted: $backup_path"
        fi
        
        # Check if archive is not empty
        local file_count=$(tar -tzf "$backup_path" | wc -l)
        if [[ "$file_count" -eq 0 ]]; then
            log "WARN" "Backup archive is empty (this may be expected for non-existent components)"
        fi
        
    else
        # Verify directory backup
        if [[ ! -d "$backup_path" ]]; then
            error_exit "Backup directory not found: $backup_path"
        fi
        
        # Check directory permissions
        if [[ ! -r "$backup_path" ]]; then
            error_exit "Backup directory is not readable: $backup_path"
        fi
    fi
    
    # Verify metadata file exists
    local metadata_file="$BACKUP_DIR/$component/${backup_filename%.tar.gz}.metadata"
    if [[ ! -f "$metadata_file" ]]; then
        log "WARN" "Backup metadata file not found: $metadata_file"
    else
        # Validate JSON metadata
        if ! python3 -m json.tool "$metadata_file" >/dev/null 2>&1; then
            log "WARN" "Backup metadata file is not valid JSON: $metadata_file"
        fi
    fi
    
    log "SUCCESS" "Backup verification completed: $backup_filename"
}

# Rotate old backups (keep only MAX_BACKUPS)
rotate_backups() {
    local component="$1"
    local component_backup_dir="$BACKUP_DIR/$component"
    
    log "INFO" "Rotating backups for $component (keeping $MAX_BACKUPS backups)"
    
    if [[ ! -d "$component_backup_dir" ]]; then
        log "WARN" "Component backup directory not found: $component_backup_dir"
        return 0
    fi
    
    # Get list of backup files sorted by modification time (oldest first)
    local backup_files=()
    if [[ "${COMPRESS:-true}" == "true" ]]; then
        # For compressed backups
        while IFS= read -r -d '' file; do
            backup_files+=("$file")
        done < <(find "$component_backup_dir" -name "${component}_*.tar.gz" -type f -print0 | sort -z)
    else
        # For directory backups
        while IFS= read -r -d '' file; do
            backup_files+=("$file")
        done < <(find "$component_backup_dir" -name "${component}_*" -type d -print0 | sort -z)
    fi
    
    local backup_count=${#backup_files[@]}
    
    if [[ "$backup_count" -le "$MAX_BACKUPS" ]]; then
        log "INFO" "No backup rotation needed ($backup_count <= $MAX_BACKUPS)"
        return 0
    fi
    
    # Calculate how many backups to remove
    local backups_to_remove=$((backup_count - MAX_BACKUPS))
    
    log "INFO" "Removing $backups_to_remove old backups"
    
    # Remove oldest backups
    for ((i=0; i<backups_to_remove; i++)); do
        local backup_to_remove="${backup_files[$i]}"
        local backup_name=$(basename "$backup_to_remove")
        local metadata_file="$component_backup_dir/${backup_name%.tar.gz}.metadata"
        
        log "INFO" "Removing old backup: $backup_name"
        
        # Remove backup file/directory
        if [[ -f "$backup_to_remove" ]]; then
            rm -f "$backup_to_remove"
        elif [[ -d "$backup_to_remove" ]]; then
            rm -rf "$backup_to_remove"
        fi
        
        # Remove metadata file
        if [[ -f "$metadata_file" ]]; then
            rm -f "$metadata_file"
        fi
    done
    
    log "SUCCESS" "Backup rotation completed"
}

# Main backup function
main() {
    local component="${1:-}"
    
    # Parse command line arguments
    if [[ "$#" -eq 0 ]] || [[ "$component" == "-h" ]] || [[ "$component" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate component
    validate_component "$component"
    
    log "INFO" "Starting backup for component: $component"
    log "INFO" "Backup directory: $BACKUP_DIR"
    log "INFO" "Max backups to keep: $MAX_BACKUPS"
    log "INFO" "Compression: ${COMPRESS:-true}"
    
    # Create backup directory structure
    create_backup_structure "$component"
    
    # Generate backup filename
    local backup_filename=$(generate_backup_filename "$component")
    
    # Create backup based on component type
    case "$component" in
        backend)
            backup_backend "$backup_filename"
            ;;
        frontend)
            backup_frontend "$backup_filename"
            ;;
        monitoring)
            backup_monitoring "$backup_filename"
            ;;
        docs)
            backup_docs "$backup_filename"
            ;;
    esac
    
    # Verify backup integrity
    verify_backup "$component" "$backup_filename"
    
    # Rotate old backups
    rotate_backups "$component"
    
    log "SUCCESS" "Backup completed successfully!"
    log "INFO" "Component: $component"
    log "INFO" "Backup file: $backup_filename"
    log "INFO" "Backup location: $BACKUP_DIR/$component/$backup_filename"
}

# Run main function with all arguments
main "$@"