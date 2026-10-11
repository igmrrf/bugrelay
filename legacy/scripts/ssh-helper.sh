#!/bin/bash

# BugRelay SSH Helper Script
# Provides secure SSH connection utilities for deployment
# Usage: ./ssh-helper.sh [connect|execute|copy|verify] [args...]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bugrelay/ssh-helper.log"

# SSH configuration
SSH_HOST="${SSH_HOST:-}"
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-deploy}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
SSH_TIMEOUT="${SSH_TIMEOUT:-30}"
SSH_RETRIES="${SSH_RETRIES:-3}"
SSH_RETRY_DELAY="${SSH_RETRY_DELAY:-5}"

# SSH options for security and reliability
SSH_OPTIONS=(
    "-o" "StrictHostKeyChecking=yes"
    "-o" "UserKnownHostsFile=/home/${USER}/.ssh/known_hosts"
    "-o" "ConnectTimeout=$SSH_TIMEOUT"
    "-o" "ServerAliveInterval=60"
    "-o" "ServerAliveCountMax=3"
    "-o" "BatchMode=yes"
    "-o" "PasswordAuthentication=no"
    "-o" "PubkeyAuthentication=yes"
    "-o" "PreferredAuthentications=publickey"
    "-o" "LogLevel=ERROR"
)

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
    
    # Log to file (sanitize sensitive information)
    local sanitized_message=$(echo "$message" | sed 's/ssh-rsa [A-Za-z0-9+/=]*/[SSH_KEY_REDACTED]/g')
    echo "[$timestamp] [$level] $sanitized_message" >> "$LOG_FILE"
    
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
Usage: $0 [COMMAND] [ARGS...]

COMMANDS:
    connect                     Test SSH connection
    execute [command]           Execute command on remote server
    copy [local] [remote]       Copy file to remote server
    verify                      Verify SSH configuration and host key
    setup-key [key_file]        Set up SSH key for authentication

Examples:
    $0 connect                                  # Test SSH connection
    $0 execute "systemctl status nginx"        # Execute remote command
    $0 copy ./app.tar.gz /opt/bugrelay/        # Copy file to remote
    $0 verify                                   # Verify SSH setup
    $0 setup-key ~/.ssh/deploy_key             # Set up SSH key

Environment Variables:
    SSH_HOST            Remote host (required)
    SSH_PORT            SSH port (default: 22)
    SSH_USER            SSH username (default: deploy)
    SSH_KEY_PATH        Path to SSH private key
    SSH_TIMEOUT         Connection timeout in seconds (default: 30)
    SSH_RETRIES         Number of connection retries (default: 3)
    SSH_RETRY_DELAY     Delay between retries in seconds (default: 5)

Security Features:
    - Strict host key checking enabled
    - Only public key authentication allowed
    - Connection timeouts and retries
    - Credential sanitization in logs
    - Host key verification

EOF
}

# Validate SSH configuration
validate_ssh_config() {
    log "INFO" "Validating SSH configuration..."
    
    # Check required environment variables
    if [[ -z "$SSH_HOST" ]]; then
        error_exit "SSH_HOST environment variable is required"
    fi
    
    if [[ -z "$SSH_KEY_PATH" ]]; then
        error_exit "SSH_KEY_PATH environment variable is required"
    fi
    
    # Check SSH key file exists and has correct permissions
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        error_exit "SSH key file not found: $SSH_KEY_PATH"
    fi
    
    # Check key file permissions (should be 600)
    local key_perms=$(stat -c "%a" "$SSH_KEY_PATH" 2>/dev/null || stat -f "%A" "$SSH_KEY_PATH" 2>/dev/null)
    if [[ "$key_perms" != "600" ]]; then
        log "WARN" "SSH key file permissions are $key_perms, should be 600"
        log "INFO" "Fixing SSH key permissions..."
        chmod 600 "$SSH_KEY_PATH"
    fi
    
    # Check SSH client is available
    if ! command -v ssh >/dev/null 2>&1; then
        error_exit "SSH client not found"
    fi
    
    # Check known_hosts file exists
    local known_hosts_file="/home/${USER}/.ssh/known_hosts"
    if [[ ! -f "$known_hosts_file" ]]; then
        log "WARN" "Known hosts file not found: $known_hosts_file"
        log "INFO" "Creating known hosts file..."
        mkdir -p "$(dirname "$known_hosts_file")"
        touch "$known_hosts_file"
        chmod 644 "$known_hosts_file"
    fi
    
    log "SUCCESS" "SSH configuration validation passed"
}

# Get host key from remote server
get_host_key() {
    local host="$1"
    local port="$2"
    
    log "INFO" "Retrieving host key from $host:$port"
    
    # Use ssh-keyscan to get host key
    local host_key=$(ssh-keyscan -p "$port" -t rsa,ecdsa,ed25519 "$host" 2>/dev/null)
    
    if [[ -z "$host_key" ]]; then
        error_exit "Failed to retrieve host key from $host:$port"
    fi
    
    echo "$host_key"
}

# Verify host key
verify_host_key() {
    local host="$1"
    local port="$2"
    
    log "INFO" "Verifying host key for $host:$port"
    
    local known_hosts_file="/home/${USER}/.ssh/known_hosts"
    
    # Check if host key exists in known_hosts
    if ssh-keygen -F "[$host]:$port" -f "$known_hosts_file" >/dev/null 2>&1; then
        log "SUCCESS" "Host key found in known_hosts"
        return 0
    else
        log "WARN" "Host key not found in known_hosts"
        
        # Get host key from server
        local host_key=$(get_host_key "$host" "$port")
        
        log "INFO" "Adding host key to known_hosts..."
        echo "$host_key" >> "$known_hosts_file"
        
        log "SUCCESS" "Host key added to known_hosts"
        return 0
    fi
}

# Test SSH connection with retries
test_ssh_connection() {
    log "INFO" "Testing SSH connection to $SSH_USER@$SSH_HOST:$SSH_PORT"
    
    local attempt=1
    while [[ $attempt -le $SSH_RETRIES ]]; do
        log "INFO" "Connection attempt $attempt/$SSH_RETRIES"
        
        # Test connection with a simple command
        if ssh "${SSH_OPTIONS[@]}" \
            -p "$SSH_PORT" \
            -i "$SSH_KEY_PATH" \
            "$SSH_USER@$SSH_HOST" \
            "echo 'SSH connection successful'" >/dev/null 2>&1; then
            
            log "SUCCESS" "SSH connection test passed"
            return 0
        else
            log "WARN" "SSH connection attempt $attempt failed"
            
            if [[ $attempt -lt $SSH_RETRIES ]]; then
                log "INFO" "Retrying in ${SSH_RETRY_DELAY}s..."
                sleep "$SSH_RETRY_DELAY"
            fi
        fi
        
        ((attempt++))
    done
    
    error_exit "SSH connection failed after $SSH_RETRIES attempts"
}

# Execute command on remote server
execute_remote_command() {
    local command="$1"
    
    log "INFO" "Executing remote command: $command"
    
    # Sanitize command for logging (remove potential sensitive data)
    local sanitized_command=$(echo "$command" | sed 's/password=[^[:space:]]*/password=[REDACTED]/gi')
    log "INFO" "Sanitized command: $sanitized_command"
    
    local attempt=1
    while [[ $attempt -le $SSH_RETRIES ]]; do
        log "INFO" "Execution attempt $attempt/$SSH_RETRIES"
        
        # Execute command with timeout
        if timeout "$SSH_TIMEOUT" ssh "${SSH_OPTIONS[@]}" \
            -p "$SSH_PORT" \
            -i "$SSH_KEY_PATH" \
            "$SSH_USER@$SSH_HOST" \
            "$command"; then
            
            log "SUCCESS" "Remote command executed successfully"
            return 0
        else
            local exit_code=$?
            log "WARN" "Remote command execution attempt $attempt failed (exit code: $exit_code)"
            
            if [[ $attempt -lt $SSH_RETRIES ]]; then
                log "INFO" "Retrying in ${SSH_RETRY_DELAY}s..."
                sleep "$SSH_RETRY_DELAY"
            fi
        fi
        
        ((attempt++))
    done
    
    error_exit "Remote command execution failed after $SSH_RETRIES attempts"
}

# Copy file to remote server
copy_file_to_remote() {
    local local_path="$1"
    local remote_path="$2"
    
    log "INFO" "Copying file: $local_path -> $SSH_USER@$SSH_HOST:$remote_path"
    
    # Check local file exists
    if [[ ! -f "$local_path" ]]; then
        error_exit "Local file not found: $local_path"
    fi
    
    # Get file size for logging
    local file_size=$(stat -c%s "$local_path" 2>/dev/null || stat -f%z "$local_path" 2>/dev/null)
    log "INFO" "File size: $file_size bytes"
    
    local attempt=1
    while [[ $attempt -le $SSH_RETRIES ]]; do
        log "INFO" "Copy attempt $attempt/$SSH_RETRIES"
        
        # Use scp to copy file
        if scp "${SSH_OPTIONS[@]}" \
            -P "$SSH_PORT" \
            -i "$SSH_KEY_PATH" \
            "$local_path" \
            "$SSH_USER@$SSH_HOST:$remote_path"; then
            
            log "SUCCESS" "File copied successfully"
            
            # Verify file was copied correctly
            local remote_size=$(ssh "${SSH_OPTIONS[@]}" \
                -p "$SSH_PORT" \
                -i "$SSH_KEY_PATH" \
                "$SSH_USER@$SSH_HOST" \
                "stat -c%s '$remote_path' 2>/dev/null || stat -f%z '$remote_path' 2>/dev/null")
            
            if [[ "$file_size" == "$remote_size" ]]; then
                log "SUCCESS" "File integrity verified (size: $remote_size bytes)"
                return 0
            else
                log "ERROR" "File size mismatch: local=$file_size, remote=$remote_size"
                return 1
            fi
        else
            log "WARN" "File copy attempt $attempt failed"
            
            if [[ $attempt -lt $SSH_RETRIES ]]; then
                log "INFO" "Retrying in ${SSH_RETRY_DELAY}s..."
                sleep "$SSH_RETRY_DELAY"
            fi
        fi
        
        ((attempt++))
    done
    
    error_exit "File copy failed after $SSH_RETRIES attempts"
}

# Set up SSH key
setup_ssh_key() {
    local key_file="${1:-}"
    
    if [[ -z "$key_file" ]]; then
        error_exit "SSH key file path is required"
    fi
    
    log "INFO" "Setting up SSH key: $key_file"
    
    # Check if key file exists
    if [[ ! -f "$key_file" ]]; then
        error_exit "SSH key file not found: $key_file"
    fi
    
    # Set correct permissions
    chmod 600 "$key_file"
    
    # Set SSH_KEY_PATH environment variable
    export SSH_KEY_PATH="$key_file"
    
    # Test the key
    if ssh-keygen -l -f "$key_file" >/dev/null 2>&1; then
        log "SUCCESS" "SSH key is valid"
    else
        error_exit "SSH key is invalid or corrupted"
    fi
    
    # Get public key for logging (without exposing the actual key)
    local key_type=$(ssh-keygen -l -f "$key_file" | awk '{print $4}' | tr -d '()')
    local key_fingerprint=$(ssh-keygen -l -f "$key_file" | awk '{print $2}')
    
    log "INFO" "Key type: $key_type"
    log "INFO" "Key fingerprint: $key_fingerprint"
    
    log "SUCCESS" "SSH key setup completed"
}

# Verify complete SSH setup
verify_ssh_setup() {
    log "INFO" "Verifying complete SSH setup..."
    
    # Validate configuration
    validate_ssh_config
    
    # Verify host key
    verify_host_key "$SSH_HOST" "$SSH_PORT"
    
    # Test connection
    test_ssh_connection
    
    log "SUCCESS" "SSH setup verification completed"
}

# Main function
main() {
    local command="${1:-}"
    
    # Parse command line arguments
    if [[ "$#" -eq 0 ]] || [[ "$command" == "-h" ]] || [[ "$command" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate SSH configuration for most commands
    case "$command" in
        setup-key)
            # Don't validate config for setup-key command
            ;;
        *)
            validate_ssh_config
            ;;
    esac
    
    # Execute command
    case "$command" in
        connect)
            test_ssh_connection
            ;;
        execute)
            if [[ "$#" -lt 2 ]]; then
                error_exit "Command to execute is required"
            fi
            shift
            execute_remote_command "$*"
            ;;
        copy)
            if [[ "$#" -lt 3 ]]; then
                error_exit "Local and remote paths are required"
            fi
            copy_file_to_remote "$2" "$3"
            ;;
        verify)
            verify_ssh_setup
            ;;
        setup-key)
            setup_ssh_key "$2"
            ;;
        *)
            error_exit "Unknown command: $command"
            ;;
    esac
    
    log "SUCCESS" "SSH helper operation completed successfully"
}

# Run main function with all arguments
main "$@"