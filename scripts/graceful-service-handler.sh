#!/bin/bash

# BugRelay Graceful Service Handler
# Handles graceful shutdown, connection draining, and in-flight request management
# Usage: ./graceful-service-handler.sh [start|stop|reload|drain] [service_name]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bugrelay/graceful-service.log"
DRAIN_TIMEOUT=30
SHUTDOWN_TIMEOUT=60
CONNECTION_CHECK_INTERVAL=2

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
Usage: $0 [ACTION] [SERVICE]

ACTION:
    start       Start service gracefully
    stop        Stop service gracefully with connection draining
    reload      Reload service configuration gracefully
    drain       Drain connections from service without stopping

SERVICE:
    backend     BugRelay backend service
    nginx       Nginx web server
    frontend    Frontend service (if running as service)

Examples:
    $0 stop backend         # Gracefully stop backend with connection draining
    $0 reload nginx         # Gracefully reload Nginx configuration
    $0 drain backend        # Drain connections from backend
    $0 start backend        # Start backend service

Environment Variables:
    DRAIN_TIMEOUT           Connection drain timeout in seconds (default: 30)
    SHUTDOWN_TIMEOUT        Service shutdown timeout in seconds (default: 60)
    CONNECTION_CHECK_INTERVAL   Interval between connection checks in seconds (default: 2)

EOF
}

# Check if service exists
check_service_exists() {
    local service_name="$1"
    
    if ! systemctl list-unit-files | grep -q "^${service_name}.service"; then
        log "ERROR" "Service $service_name does not exist"
        return 1
    fi
    
    return 0
}

# Get active connections for a service
get_active_connections() {
    local service_name="$1"
    local port=""
    
    case "$service_name" in
        "bugrelay-backend"|"backend")
            port="8080"
            ;;
        "nginx")
            port="80\|443"
            ;;
        "bugrelay-frontend"|"frontend")
            port="3000"
            ;;
        *)
            log "WARN" "Unknown service for connection counting: $service_name"
            echo "0"
            return 0
            ;;
    esac
    
    # Count established connections on the service port
    local connections=$(netstat -an | grep -E ":($port).*ESTABLISHED" | wc -l)
    echo "$connections"
}

# Wait for connections to drain
wait_for_connection_drain() {
    local service_name="$1"
    local timeout="${2:-$DRAIN_TIMEOUT}"
    
    log "INFO" "Waiting for connections to drain from $service_name (timeout: ${timeout}s)..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local connections=$(get_active_connections "$service_name")
        
        if [[ "$connections" -eq 0 ]]; then
            log "SUCCESS" "All connections drained from $service_name"
            return 0
        fi
        
        log "INFO" "Waiting for $connections connections to drain from $service_name..."
        sleep "$CONNECTION_CHECK_INTERVAL"
    done
    
    local remaining_connections=$(get_active_connections "$service_name")
    if [[ "$remaining_connections" -gt 0 ]]; then
        log "WARN" "Connection drain timeout reached. $remaining_connections connections still active."
        return 1
    else
        log "SUCCESS" "All connections drained from $service_name"
        return 0
    fi
}

# Send graceful shutdown signal to service
send_graceful_shutdown_signal() {
    local service_name="$1"
    
    log "INFO" "Sending graceful shutdown signal to $service_name..."
    
    case "$service_name" in
        "bugrelay-backend"|"backend")
            # Send SIGTERM to backend process for graceful shutdown
            local pid=$(pgrep -f "bugrelay-backend" || echo "")
            if [[ -n "$pid" ]]; then
                log "INFO" "Sending SIGTERM to backend process (PID: $pid)..."
                kill -TERM "$pid"
                return 0
            else
                log "WARN" "Backend process not found"
                return 1
            fi
            ;;
        "nginx")
            # Nginx graceful shutdown
            log "INFO" "Sending graceful shutdown signal to Nginx..."
            nginx -s quit
            return 0
            ;;
        "bugrelay-frontend"|"frontend")
            # Frontend graceful shutdown (if running as service)
            local pid=$(pgrep -f "node.*frontend" || echo "")
            if [[ -n "$pid" ]]; then
                log "INFO" "Sending SIGTERM to frontend process (PID: $pid)..."
                kill -TERM "$pid"
                return 0
            else
                log "WARN" "Frontend process not found"
                return 1
            fi
            ;;
        *)
            log "WARN" "Unknown service for graceful shutdown: $service_name"
            return 1
            ;;
    esac
}

# Start service gracefully
start_service_gracefully() {
    local service_name="$1"
    
    log "INFO" "Starting $service_name gracefully..."
    
    # Check if service is already running
    if systemctl is-active --quiet "$service_name"; then
        log "WARN" "$service_name is already running"
        return 0
    fi
    
    # Start the service
    if sudo systemctl start "$service_name"; then
        log "SUCCESS" "$service_name started successfully"
        
        # Wait for service to be ready
        local attempt=1
        while [[ $attempt -le 10 ]]; do
            if systemctl is-active --quiet "$service_name"; then
                log "SUCCESS" "$service_name is active and ready"
                return 0
            fi
            
            log "INFO" "Waiting for $service_name to be ready (attempt $attempt/10)..."
            sleep 2
            ((attempt++))
        done
        
        log "ERROR" "$service_name started but is not ready within timeout"
        return 1
    else
        log "ERROR" "Failed to start $service_name"
        return 1
    fi
}

# Stop service gracefully
stop_service_gracefully() {
    local service_name="$1"
    
    log "INFO" "Stopping $service_name gracefully..."
    
    # Check if service is running
    if ! systemctl is-active --quiet "$service_name"; then
        log "INFO" "$service_name is not running"
        return 0
    fi
    
    # Get initial connection count
    local initial_connections=$(get_active_connections "$service_name")
    log "INFO" "$service_name has $initial_connections active connections"
    
    # For Nginx, we need special handling to stop accepting new connections
    if [[ "$service_name" == "nginx" ]]; then
        log "INFO" "Configuring Nginx to stop accepting new connections..."
        
        # Create a temporary maintenance configuration
        local temp_config="/tmp/nginx-maintenance-$(date +%Y%m%d_%H%M%S).conf"
        cat > "$temp_config" << 'EOF'
# Temporary maintenance configuration
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    
    ssl_certificate /etc/nginx/ssl/bugrelay.com.crt;
    ssl_certificate_key /etc/nginx/ssl/bugrelay.com.key;
    
    return 503 "Service temporarily unavailable for maintenance";
}
EOF
        
        # Backup current configuration and apply maintenance config
        sudo cp /etc/nginx/conf.d/bugrelay.conf /etc/nginx/conf.d/bugrelay.conf.backup
        sudo cp "$temp_config" /etc/nginx/conf.d/maintenance.conf
        
        # Test and reload configuration
        if sudo nginx -t; then
            sudo systemctl reload nginx
            log "INFO" "Nginx configured for maintenance mode"
        else
            log "ERROR" "Failed to configure Nginx maintenance mode"
            sudo rm -f /etc/nginx/conf.d/maintenance.conf
        fi
        
        rm -f "$temp_config"
    fi
    
    # Send graceful shutdown signal
    if send_graceful_shutdown_signal "$service_name"; then
        log "INFO" "Graceful shutdown signal sent to $service_name"
    else
        log "WARN" "Failed to send graceful shutdown signal, using systemctl stop"
    fi
    
    # Wait for connections to drain
    if [[ "$initial_connections" -gt 0 ]]; then
        wait_for_connection_drain "$service_name" "$DRAIN_TIMEOUT"
    fi
    
    # Stop the service using systemctl
    log "INFO" "Stopping $service_name using systemctl..."
    if sudo systemctl stop "$service_name"; then
        log "SUCCESS" "$service_name stopped successfully"
    else
        log "ERROR" "Failed to stop $service_name using systemctl"
        return 1
    fi
    
    # Wait for service to be fully stopped
    local attempt=1
    while [[ $attempt -le 30 ]]; do
        if ! systemctl is-active --quiet "$service_name"; then
            log "SUCCESS" "$service_name is fully stopped"
            
            # Clean up Nginx maintenance configuration if applicable
            if [[ "$service_name" == "nginx" ]]; then
                sudo rm -f /etc/nginx/conf.d/maintenance.conf
                if [[ -f /etc/nginx/conf.d/bugrelay.conf.backup ]]; then
                    sudo mv /etc/nginx/conf.d/bugrelay.conf.backup /etc/nginx/conf.d/bugrelay.conf
                fi
            fi
            
            return 0
        fi
        
        log "INFO" "Waiting for $service_name to stop (attempt $attempt/30)..."
        sleep 2
        ((attempt++))
    done
    
    log "ERROR" "$service_name did not stop within timeout, forcing stop..."
    sudo systemctl kill "$service_name"
    return 1
}

# Reload service gracefully
reload_service_gracefully() {
    local service_name="$1"
    
    log "INFO" "Reloading $service_name gracefully..."
    
    # Check if service is running
    if ! systemctl is-active --quiet "$service_name"; then
        log "ERROR" "$service_name is not running, cannot reload"
        return 1
    fi
    
    case "$service_name" in
        "nginx")
            # Test configuration before reloading
            if ! sudo nginx -t; then
                log "ERROR" "Nginx configuration test failed, aborting reload"
                return 1
            fi
            
            log "INFO" "Nginx configuration test passed, reloading..."
            if sudo systemctl reload nginx; then
                log "SUCCESS" "Nginx reloaded successfully"
                return 0
            else
                log "ERROR" "Failed to reload Nginx"
                return 1
            fi
            ;;
        "bugrelay-backend"|"backend")
            # Backend doesn't support configuration reload, restart gracefully
            log "INFO" "Backend doesn't support reload, performing graceful restart..."
            stop_service_gracefully "$service_name"
            sleep 2
            start_service_gracefully "$service_name"
            return $?
            ;;
        *)
            # Generic reload
            if sudo systemctl reload "$service_name"; then
                log "SUCCESS" "$service_name reloaded successfully"
                return 0
            else
                log "ERROR" "Failed to reload $service_name"
                return 1
            fi
            ;;
    esac
}

# Drain connections from service
drain_service_connections() {
    local service_name="$1"
    
    log "INFO" "Draining connections from $service_name..."
    
    # Check if service is running
    if ! systemctl is-active --quiet "$service_name"; then
        log "INFO" "$service_name is not running, no connections to drain"
        return 0
    fi
    
    # Get initial connection count
    local initial_connections=$(get_active_connections "$service_name")
    log "INFO" "$service_name has $initial_connections active connections"
    
    if [[ "$initial_connections" -eq 0 ]]; then
        log "INFO" "No active connections to drain"
        return 0
    fi
    
    # For services that support connection draining without stopping
    case "$service_name" in
        "nginx")
            log "INFO" "Configuring Nginx to stop accepting new connections..."
            
            # Create a configuration that returns 503 for new connections
            # but allows existing connections to complete
            local temp_config="/tmp/nginx-drain-$(date +%Y%m%d_%H%M%S).conf"
            cat > "$temp_config" << 'EOF'
# Connection draining configuration
limit_req_zone $binary_remote_addr zone=drain:1m rate=1r/s;

server {
    listen 80;
    listen 443 ssl;
    
    ssl_certificate /etc/nginx/ssl/bugrelay.com.crt;
    ssl_certificate_key /etc/nginx/ssl/bugrelay.com.key;
    
    # Severely limit new connections
    limit_req zone=drain burst=1 nodelay;
    
    # Return 503 for most new requests
    location / {
        return 503 "Service draining connections";
    }
    
    # Allow health checks to continue
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
EOF
            
            # Apply draining configuration
            sudo cp /etc/nginx/conf.d/bugrelay.conf /etc/nginx/conf.d/bugrelay.conf.backup
            sudo cp "$temp_config" /etc/nginx/conf.d/bugrelay.conf
            
            if sudo nginx -t && sudo systemctl reload nginx; then
                log "INFO" "Nginx configured for connection draining"
            else
                log "ERROR" "Failed to configure Nginx for draining"
                sudo mv /etc/nginx/conf.d/bugrelay.conf.backup /etc/nginx/conf.d/bugrelay.conf
                rm -f "$temp_config"
                return 1
            fi
            
            rm -f "$temp_config"
            ;;
        *)
            log "INFO" "Service $service_name doesn't support active connection draining"
            log "INFO" "Monitoring existing connections until they complete naturally..."
            ;;
    esac
    
    # Wait for connections to drain
    wait_for_connection_drain "$service_name" "$DRAIN_TIMEOUT"
    local drain_result=$?
    
    # Restore original configuration for Nginx
    if [[ "$service_name" == "nginx" ]] && [[ -f /etc/nginx/conf.d/bugrelay.conf.backup ]]; then
        log "INFO" "Restoring original Nginx configuration..."
        sudo mv /etc/nginx/conf.d/bugrelay.conf.backup /etc/nginx/conf.d/bugrelay.conf
        
        if sudo nginx -t && sudo systemctl reload nginx; then
            log "SUCCESS" "Original Nginx configuration restored"
        else
            log "ERROR" "Failed to restore original Nginx configuration"
        fi
    fi
    
    return $drain_result
}

# Main function
main() {
    local action="${1:-}"
    local service_name="${2:-}"
    
    # Parse command line arguments
    if [[ "$#" -lt 2 ]] || [[ "$action" == "-h" ]] || [[ "$action" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate action
    case "$action" in
        start|stop|reload|drain)
            ;;
        *)
            log "ERROR" "Invalid action: $action"
            usage
            exit 1
            ;;
    esac
    
    # Normalize service name
    case "$service_name" in
        "backend")
            service_name="bugrelay-backend"
            ;;
        "frontend")
            service_name="bugrelay-frontend"
            ;;
        "nginx")
            service_name="nginx"
            ;;
        *)
            # Use as-is for other services
            ;;
    esac
    
    # Check if service exists (except for drain action on nginx)
    if [[ "$action" != "drain" ]] || [[ "$service_name" != "nginx" ]]; then
        if ! check_service_exists "$service_name"; then
            exit 1
        fi
    fi
    
    log "INFO" "Performing $action on $service_name..."
    
    # Execute action
    case "$action" in
        start)
            start_service_gracefully "$service_name"
            ;;
        stop)
            stop_service_gracefully "$service_name"
            ;;
        reload)
            reload_service_gracefully "$service_name"
            ;;
        drain)
            drain_service_connections "$service_name"
            ;;
    esac
    
    local result=$?
    
    if [[ $result -eq 0 ]]; then
        log "SUCCESS" "Action $action completed successfully for $service_name"
    else
        log "ERROR" "Action $action failed for $service_name"
    fi
    
    exit $result
}

# Run main function with all arguments
main "$@"