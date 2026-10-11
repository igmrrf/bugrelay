#!/bin/bash

# BugRelay Graceful Service Handling Installation Script
# Installs and configures graceful service handling components
# Usage: ./install-graceful-service-handling.sh [--dry-run]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bugrelay/graceful-service-install.log"
DRY_RUN=false

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

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --dry-run       Show what would be done without making changes
    -h, --help      Show this help message

This script installs and configures graceful service handling components:
- Systemd service templates with graceful shutdown
- Nginx configuration with graceful reload support
- Go backend graceful shutdown templates
- Service management scripts

Examples:
    $0                  # Install graceful service handling
    $0 --dry-run        # Show what would be installed

EOF
}

# Execute command with dry-run support
execute_command() {
    local description="$1"
    shift
    local command="$*"
    
    log "INFO" "$description"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute: $command"
        return 0
    fi
    
    if eval "$command"; then
        log "SUCCESS" "$description completed"
        return 0
    else
        log "ERROR" "$description failed"
        return 1
    fi
}

# Install systemd service template
install_systemd_service_template() {
    log "INFO" "Installing systemd service template..."
    
    local template_file="$SCRIPT_DIR/systemd-service-templates/bugrelay-backend.service"
    local target_file="/etc/systemd/system/bugrelay-backend.service"
    
    if [[ ! -f "$template_file" ]]; then
        log "ERROR" "Systemd service template not found: $template_file"
        return 1
    fi
    
    # Backup existing service file if it exists
    if [[ -f "$target_file" ]]; then
        local backup_file="${target_file}.backup-$(date +%Y%m%d_%H%M%S)"
        execute_command "Backing up existing systemd service file" \
            "sudo cp '$target_file' '$backup_file'"
    fi
    
    # Install new service file
    execute_command "Installing systemd service template" \
        "sudo cp '$template_file' '$target_file'"
    
    # Set proper permissions
    execute_command "Setting systemd service file permissions" \
        "sudo chmod 644 '$target_file'"
    
    # Reload systemd daemon
    execute_command "Reloading systemd daemon" \
        "sudo systemctl daemon-reload"
    
    log "SUCCESS" "Systemd service template installed"
}

# Install Nginx graceful configuration
install_nginx_graceful_config() {
    log "INFO" "Installing Nginx graceful configuration..."
    
    local template_file="$SCRIPT_DIR/nginx-templates/graceful-nginx.conf"
    local target_file="/etc/nginx/nginx.conf"
    local backup_file="${target_file}.backup-$(date +%Y%m%d_%H%M%S)"
    
    if [[ ! -f "$template_file" ]]; then
        log "ERROR" "Nginx graceful configuration template not found: $template_file"
        return 1
    fi
    
    # Backup existing Nginx configuration
    if [[ -f "$target_file" ]]; then
        execute_command "Backing up existing Nginx configuration" \
            "sudo cp '$target_file' '$backup_file'"
    fi
    
    # Install new Nginx configuration
    execute_command "Installing Nginx graceful configuration" \
        "sudo cp '$template_file' '$target_file'"
    
    # Set proper permissions
    execute_command "Setting Nginx configuration file permissions" \
        "sudo chmod 644 '$target_file'"
    
    # Test Nginx configuration
    if [[ "$DRY_RUN" == "false" ]]; then
        if sudo nginx -t; then
            log "SUCCESS" "Nginx configuration test passed"
        else
            log "ERROR" "Nginx configuration test failed, restoring backup"
            sudo cp "$backup_file" "$target_file"
            return 1
        fi
    else
        log "INFO" "[DRY RUN] Would test Nginx configuration"
    fi
    
    log "SUCCESS" "Nginx graceful configuration installed"
}

# Install Go graceful shutdown template
install_go_graceful_template() {
    log "INFO" "Installing Go graceful shutdown template..."
    
    local template_file="$SCRIPT_DIR/go-templates/graceful-shutdown.go"
    local target_dir="/opt/bugrelay/backend/templates"
    local target_file="$target_dir/graceful-shutdown.go"
    
    if [[ ! -f "$template_file" ]]; then
        log "ERROR" "Go graceful shutdown template not found: $template_file"
        return 1
    fi
    
    # Create target directory
    execute_command "Creating Go templates directory" \
        "sudo mkdir -p '$target_dir'"
    
    # Install Go template
    execute_command "Installing Go graceful shutdown template" \
        "sudo cp '$template_file' '$target_file'"
    
    # Set proper permissions
    execute_command "Setting Go template file permissions" \
        "sudo chown deploy:deploy '$target_file' && sudo chmod 644 '$target_file'"
    
    log "SUCCESS" "Go graceful shutdown template installed"
}

# Create graceful service management scripts
create_service_management_scripts() {
    log "INFO" "Creating service management scripts..."
    
    # Create graceful restart script
    local restart_script="/usr/local/bin/graceful-restart-bugrelay"
    
    execute_command "Creating graceful restart script" \
        "sudo tee '$restart_script' > /dev/null" << 'EOF'
#!/bin/bash
# Graceful restart script for BugRelay services

set -euo pipefail

SCRIPT_DIR="/opt/bugrelay/scripts"
SERVICE="${1:-backend}"

case "$SERVICE" in
    backend)
        echo "Performing graceful restart of backend service..."
        "$SCRIPT_DIR/graceful-service-handler.sh" stop backend
        sleep 2
        "$SCRIPT_DIR/graceful-service-handler.sh" start backend
        ;;
    nginx)
        echo "Performing graceful reload of Nginx..."
        "$SCRIPT_DIR/graceful-service-handler.sh" reload nginx
        ;;
    frontend)
        echo "Performing graceful restart of frontend service..."
        "$SCRIPT_DIR/graceful-service-handler.sh" stop frontend
        sleep 2
        "$SCRIPT_DIR/graceful-service-handler.sh" start frontend
        ;;
    all)
        echo "Performing graceful restart of all services..."
        "$SCRIPT_DIR/graceful-service-handler.sh" drain nginx
        "$SCRIPT_DIR/graceful-service-handler.sh" stop backend
        "$SCRIPT_DIR/graceful-service-handler.sh" stop frontend
        sleep 2
        "$SCRIPT_DIR/graceful-service-handler.sh" start backend
        "$SCRIPT_DIR/graceful-service-handler.sh" start frontend
        "$SCRIPT_DIR/graceful-service-handler.sh" reload nginx
        ;;
    *)
        echo "Usage: $0 [backend|nginx|frontend|all]"
        exit 1
        ;;
esac

echo "Graceful restart completed for: $SERVICE"
EOF
    
    # Make script executable
    execute_command "Making graceful restart script executable" \
        "sudo chmod +x '$restart_script'"
    
    # Create graceful deployment wrapper
    local deploy_wrapper="/usr/local/bin/graceful-deploy-bugrelay"
    
    execute_command "Creating graceful deployment wrapper" \
        "sudo tee '$deploy_wrapper' > /dev/null" << 'EOF'
#!/bin/bash
# Graceful deployment wrapper for BugRelay

set -euo pipefail

SCRIPT_DIR="/opt/bugrelay/scripts"
COMPONENT="${1:-}"
VERSION="${2:-HEAD}"

if [[ -z "$COMPONENT" ]]; then
    echo "Usage: $0 [backend|frontend] [version]"
    exit 1
fi

case "$COMPONENT" in
    backend)
        echo "Starting graceful blue-green deployment of backend..."
        "$SCRIPT_DIR/deploy-backend-blue-green.sh" "$VERSION"
        ;;
    frontend)
        echo "Starting graceful rolling deployment of frontend..."
        "$SCRIPT_DIR/deploy-frontend-rolling.sh" "$VERSION"
        ;;
    *)
        echo "Usage: $0 [backend|frontend] [version]"
        exit 1
        ;;
esac

echo "Graceful deployment completed for: $COMPONENT"
EOF
    
    # Make script executable
    execute_command "Making graceful deployment wrapper executable" \
        "sudo chmod +x '$deploy_wrapper'"
    
    log "SUCCESS" "Service management scripts created"
}

# Configure systemd for graceful handling
configure_systemd_graceful_handling() {
    log "INFO" "Configuring systemd for graceful handling..."
    
    # Create systemd override directory for backend service
    local override_dir="/etc/systemd/system/bugrelay-backend.service.d"
    local override_file="$override_dir/graceful-shutdown.conf"
    
    execute_command "Creating systemd override directory" \
        "sudo mkdir -p '$override_dir'"
    
    # Create override configuration for graceful shutdown
    execute_command "Creating systemd graceful shutdown override" \
        "sudo tee '$override_file' > /dev/null" << 'EOF'
[Service]
# Graceful shutdown configuration
TimeoutStopSec=60
KillMode=mixed
KillSignal=SIGTERM

# Send SIGTERM first, then SIGKILL after timeout
ExecStop=
ExecStop=/bin/kill -TERM $MAINPID
ExecStop=/bin/sleep 30
ExecStop=/bin/kill -KILL $MAINPID

# Restart configuration for graceful handling
Restart=always
RestartSec=5
StartLimitInterval=60
StartLimitBurst=3

# Resource limits for graceful operation
LimitNOFILE=65536
LimitNPROC=4096
EOF
    
    # Set proper permissions
    execute_command "Setting systemd override file permissions" \
        "sudo chmod 644 '$override_file'"
    
    # Reload systemd daemon
    execute_command "Reloading systemd daemon" \
        "sudo systemctl daemon-reload"
    
    log "SUCCESS" "Systemd graceful handling configured"
}

# Install connection monitoring tools
install_connection_monitoring() {
    log "INFO" "Installing connection monitoring tools..."
    
    # Create connection monitoring script
    local monitor_script="/usr/local/bin/monitor-bugrelay-connections"
    
    execute_command "Creating connection monitoring script" \
        "sudo tee '$monitor_script' > /dev/null" << 'EOF'
#!/bin/bash
# Connection monitoring script for BugRelay services

set -euo pipefail

SERVICE="${1:-all}"
INTERVAL="${2:-5}"

monitor_service_connections() {
    local service="$1"
    local port=""
    
    case "$service" in
        backend)
            port="8080"
            ;;
        frontend)
            port="3000"
            ;;
        nginx)
            port="80\|443"
            ;;
        *)
            echo "Unknown service: $service"
            return 1
            ;;
    esac
    
    local connections=$(netstat -an | grep -E ":($port).*ESTABLISHED" | wc -l)
    local listening=$(netstat -ln | grep -E ":($port).*LISTEN" | wc -l)
    
    printf "%-10s: %3d active connections, %d listening sockets\n" "$service" "$connections" "$listening"
}

echo "BugRelay Connection Monitor (refresh every ${INTERVAL}s)"
echo "Press Ctrl+C to stop"
echo

while true; do
    clear
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Connection Status:"
    echo "================================================"
    
    case "$SERVICE" in
        all)
            monitor_service_connections "backend"
            monitor_service_connections "frontend"
            monitor_service_connections "nginx"
            ;;
        *)
            monitor_service_connections "$SERVICE"
            ;;
    esac
    
    echo
    echo "Total system connections:"
    netstat -an | grep ESTABLISHED | wc -l | xargs printf "ESTABLISHED: %d\n"
    netstat -an | grep LISTEN | wc -l | xargs printf "LISTENING: %d\n"
    
    sleep "$INTERVAL"
done
EOF
    
    # Make script executable
    execute_command "Making connection monitoring script executable" \
        "sudo chmod +x '$monitor_script'"
    
    log "SUCCESS" "Connection monitoring tools installed"
}

# Validate installation
validate_installation() {
    log "INFO" "Validating graceful service handling installation..."
    
    local validation_errors=0
    
    # Check systemd service template
    if [[ -f "/etc/systemd/system/bugrelay-backend.service" ]]; then
        log "SUCCESS" "Systemd service template installed"
    else
        log "ERROR" "Systemd service template not found"
        ((validation_errors++))
    fi
    
    # Check Nginx configuration
    if [[ -f "/etc/nginx/nginx.conf" ]]; then
        if [[ "$DRY_RUN" == "false" ]]; then
            if sudo nginx -t >/dev/null 2>&1; then
                log "SUCCESS" "Nginx graceful configuration is valid"
            else
                log "ERROR" "Nginx graceful configuration is invalid"
                ((validation_errors++))
            fi
        else
            log "INFO" "[DRY RUN] Would validate Nginx configuration"
        fi
    else
        log "ERROR" "Nginx configuration not found"
        ((validation_errors++))
    fi
    
    # Check Go template
    if [[ -f "/opt/bugrelay/backend/templates/graceful-shutdown.go" ]]; then
        log "SUCCESS" "Go graceful shutdown template installed"
    else
        log "ERROR" "Go graceful shutdown template not found"
        ((validation_errors++))
    fi
    
    # Check service management scripts
    if [[ -x "/usr/local/bin/graceful-restart-bugrelay" ]]; then
        log "SUCCESS" "Graceful restart script installed"
    else
        log "ERROR" "Graceful restart script not found or not executable"
        ((validation_errors++))
    fi
    
    if [[ -x "/usr/local/bin/graceful-deploy-bugrelay" ]]; then
        log "SUCCESS" "Graceful deployment wrapper installed"
    else
        log "ERROR" "Graceful deployment wrapper not found or not executable"
        ((validation_errors++))
    fi
    
    # Check connection monitoring script
    if [[ -x "/usr/local/bin/monitor-bugrelay-connections" ]]; then
        log "SUCCESS" "Connection monitoring script installed"
    else
        log "ERROR" "Connection monitoring script not found or not executable"
        ((validation_errors++))
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log "SUCCESS" "All graceful service handling components validated successfully"
        return 0
    else
        log "ERROR" "$validation_errors validation errors found"
        return 1
    fi
}

# Main installation function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log "INFO" "Starting graceful service handling installation..."
    log "INFO" "Dry run mode: $DRY_RUN"
    
    # Check if running as root or with sudo
    if [[ "$EUID" -ne 0 ]] && [[ -z "${SUDO_USER:-}" ]]; then
        log "ERROR" "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Install components
    install_systemd_service_template
    install_nginx_graceful_config
    install_go_graceful_template
    create_service_management_scripts
    configure_systemd_graceful_handling
    install_connection_monitoring
    
    # Validate installation
    validate_installation
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log "SUCCESS" "Graceful service handling installation completed successfully!"
        log "INFO" "Available commands:"
        log "INFO" "  - graceful-restart-bugrelay [backend|nginx|frontend|all]"
        log "INFO" "  - graceful-deploy-bugrelay [backend|frontend] [version]"
        log "INFO" "  - monitor-bugrelay-connections [backend|frontend|nginx|all] [interval]"
        log "INFO" "  - $SCRIPT_DIR/graceful-service-handler.sh [start|stop|reload|drain] [service]"
    else
        log "INFO" "Dry run completed. Use without --dry-run to perform actual installation."
    fi
}

# Run main function with all arguments
main "$@"