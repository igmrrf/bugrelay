#!/bin/bash

# GitHub Secrets Setup Script for BugRelay Deployment
# This script helps configure GitHub Secrets required for deployment automation
# Usage: ./setup-github-secrets.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_FILE="$PROJECT_ROOT/.github-secrets.env"
SSH_KEY_DIR="$HOME/.ssh"
SSH_KEY_NAME="bugrelay_deploy_$(date +%Y%m%d)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
validate_ssh_key() {
    local key_file="$1"
    if [[ ! -f "$key_file" ]]; then
        log_error "SSH key file not found: $key_file"
        return 1
    fi
    
    if ! ssh-keygen -l -f "$key_file" >/dev/null 2>&1; then
        log_error "Invalid SSH key format: $key_file"
        return 1
    fi
    
    return 0
}

validate_url() {
    local url="$1"
    local url_pattern='^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
    
    if [[ ! "$url" =~ $url_pattern ]]; then
        log_error "Invalid URL format: $url"
        return 1
    fi
    
    return 0
}

validate_hostname() {
    local hostname="$1"
    local hostname_pattern='^[a-zA-Z0-9.-]+$'
    
    if [[ ! "$hostname" =~ $hostname_pattern ]]; then
        log_error "Invalid hostname format: $hostname"
        return 1
    fi
    
    return 0
}

validate_username() {
    local username="$1"
    local username_pattern='^[a-zA-Z0-9_-]+$'
    
    if [[ ! "$username" =~ $username_pattern ]]; then
        log_error "Invalid username format: $username"
        return 1
    fi
    
    return 0
}

validate_password() {
    local password="$1"
    
    if [[ ${#password} -lt 12 ]]; then
        log_error "Password must be at least 12 characters long"
        return 1
    fi
    
    if [[ ! "$password" =~ [A-Z] ]]; then
        log_error "Password must contain at least one uppercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [a-z] ]]; then
        log_error "Password must contain at least one lowercase letter"
        return 1
    fi
    
    if [[ ! "$password" =~ [0-9] ]]; then
        log_error "Password must contain at least one number"
        return 1
    fi
    
    if [[ ! "$password" =~ [^a-zA-Z0-9] ]]; then
        log_error "Password must contain at least one special character"
        return 1
    fi
    
    return 0
}

# Password generation function
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# SSH key generation function
generate_ssh_key() {
    local key_name="$1"
    local key_path="$SSH_KEY_DIR/$key_name"
    
    log_info "Generating SSH key pair: $key_name"
    
    if [[ -f "$key_path" ]]; then
        log_warning "SSH key already exists: $key_path"
        read -p "Overwrite existing key? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    ssh-keygen -t ed25519 -C "bugrelay-deployment-$(date +%Y%m%d)" -f "$key_path" -N ""
    
    if validate_ssh_key "$key_path"; then
        log_success "SSH key generated successfully: $key_path"
        echo "$key_path"
        return 0
    else
        log_error "Failed to generate valid SSH key"
        return 1
    fi
}

# Interactive input functions
prompt_input() {
    local prompt="$1"
    local default="$2"
    local secret="${3:-false}"
    local value
    
    if [[ "$secret" == "true" ]]; then
        read -s -p "$prompt: " value
        echo
    else
        if [[ -n "$default" ]]; then
            read -p "$prompt [$default]: " value
            value="${value:-$default}"
        else
            read -p "$prompt: " value
        fi
    fi
    
    echo "$value"
}

prompt_yes_no() {
    local prompt="$1"
    local default="${2:-N}"
    
    if [[ "$default" == "Y" ]]; then
        read -p "$prompt (Y/n): " -r
        [[ $REPLY =~ ^[Nn]$ ]] && return 1 || return 0
    else
        read -p "$prompt (y/N): " -r
        [[ $REPLY =~ ^[Yy]$ ]] && return 0 || return 1
    fi
}

# Secret collection functions
collect_ssh_secrets() {
    log_info "Configuring SSH authentication secrets..."
    
    # SSH Host
    while true; do
        DO_HOST=$(prompt_input "Digital Ocean hostname or IP" "bugrelay.com")
        if validate_hostname "$DO_HOST"; then
            break
        fi
    done
    
    # SSH User
    while true; do
        DO_USER=$(prompt_input "SSH username for deployment" "deploy")
        if validate_username "$DO_USER"; then
            break
        fi
    done
    
    # SSH Key
    if prompt_yes_no "Generate new SSH key pair?" "Y"; then
        if SSH_KEY_PATH=$(generate_ssh_key "$SSH_KEY_NAME"); then
            DO_SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")
            SSH_PUBLIC_KEY=$(cat "$SSH_KEY_PATH.pub")
            
            log_success "SSH key pair generated"
            log_info "Public key to add to server:"
            echo "$SSH_PUBLIC_KEY"
            echo
            log_warning "Add this public key to $DO_USER@$DO_HOST:~/.ssh/authorized_keys"
            
            if prompt_yes_no "Have you added the public key to the server?" "N"; then
                log_info "Testing SSH connection..."
                if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$DO_USER@$DO_HOST" "echo 'SSH connection successful'" 2>/dev/null; then
                    log_success "SSH connection test passed"
                else
                    log_warning "SSH connection test failed - please verify key setup"
                fi
            fi
        else
            log_error "Failed to generate SSH key"
            exit 1
        fi
    else
        log_info "Using existing SSH key..."
        while true; do
            ssh_key_path=$(prompt_input "Path to SSH private key" "$SSH_KEY_DIR/id_ed25519")
            if validate_ssh_key "$ssh_key_path"; then
                DO_SSH_PRIVATE_KEY=$(cat "$ssh_key_path")
                break
            fi
        done
    fi
}

collect_database_secrets() {
    log_info "Configuring database secrets..."
    
    if prompt_yes_no "Generate secure database password?" "Y"; then
        DB_PASSWORD=$(generate_password 24)
        log_success "Database password generated"
    else
        while true; do
            DB_PASSWORD=$(prompt_input "Database password" "" "true")
            if validate_password "$DB_PASSWORD"; then
                break
            fi
        done
    fi
    
    if prompt_yes_no "Generate secure Redis password?" "Y"; then
        REDIS_PASSWORD=$(generate_password 24)
        log_success "Redis password generated"
    else
        while true; do
            REDIS_PASSWORD=$(prompt_input "Redis password" "" "true")
            if validate_password "$REDIS_PASSWORD"; then
                break
            fi
        done
    fi
}

collect_security_secrets() {
    log_info "Configuring security secrets..."
    
    if prompt_yes_no "Generate JWT secret?" "Y"; then
        JWT_SECRET=$(generate_password 64)
        log_success "JWT secret generated"
    else
        JWT_SECRET=$(prompt_input "JWT secret" "" "true")
    fi
    
    if prompt_yes_no "Generate logs API key?" "Y"; then
        LOGS_API_KEY=$(uuidgen | tr '[:upper:]' '[:lower:]')
        log_success "Logs API key generated"
    else
        LOGS_API_KEY=$(prompt_input "Logs API key" "" "true")
    fi
}

collect_application_secrets() {
    log_info "Configuring application secrets..."
    
    while true; do
        NEXT_PUBLIC_API_URL=$(prompt_input "Frontend API URL" "https://api.bugrelay.com")
        if validate_url "$NEXT_PUBLIC_API_URL"; then
            break
        fi
    done
}

collect_notification_secrets() {
    log_info "Configuring notification secrets..."
    
    while true; do
        SLACK_WEBHOOK_URL=$(prompt_input "Slack webhook URL" "")
        if [[ -n "$SLACK_WEBHOOK_URL" ]] && validate_url "$SLACK_WEBHOOK_URL"; then
            break
        elif [[ -z "$SLACK_WEBHOOK_URL" ]]; then
            log_warning "Slack webhook URL is empty - notifications will be disabled"
            break
        fi
    done
}

collect_monitoring_secrets() {
    log_info "Configuring monitoring secrets..."
    
    if prompt_yes_no "Generate Grafana admin password?" "Y"; then
        GRAFANA_ADMIN_PASSWORD=$(generate_password 20)
        log_success "Grafana admin password generated"
    else
        while true; do
            GRAFANA_ADMIN_PASSWORD=$(prompt_input "Grafana admin password" "" "true")
            if validate_password "$GRAFANA_ADMIN_PASSWORD"; then
                break
            fi
        done
    fi
}

# Environment file generation
generate_deployment_env() {
    log_info "Generating deployment environment file..."
    
    cat > "$SECRETS_FILE" << EOF
# BugRelay Deployment Environment Configuration
# Generated on $(date)

# Digital Ocean Configuration
DO_HOST=$DO_HOST
DO_USER=$DO_USER

# Application Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
DOCS_PORT=8081

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Security Configuration
JWT_SECRET=$JWT_SECRET
LOGS_API_KEY=$LOGS_API_KEY

# Frontend Configuration
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD

# Notification Configuration
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

# Deployment Settings
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
ROLLBACK_ON_FAILURE=true
KEEP_BACKUPS=5
EOF

    DEPLOYMENT_ENV_FILE=$(cat "$SECRETS_FILE")
    log_success "Deployment environment file generated: $SECRETS_FILE"
}

# GitHub CLI integration
setup_github_secrets() {
    log_info "Setting up GitHub Secrets..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        log_info "Please install GitHub CLI: https://cli.github.com/"
        log_info "Or manually add secrets to GitHub repository settings"
        return 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_info "Please run: gh auth login"
        return 1
    fi
    
    log_info "Adding secrets to GitHub repository..."
    
    # Add all secrets
    echo "$DO_SSH_PRIVATE_KEY" | gh secret set DO_SSH_PRIVATE_KEY
    echo "$DO_HOST" | gh secret set DO_HOST
    echo "$DO_USER" | gh secret set DO_USER
    echo "$DEPLOYMENT_ENV_FILE" | gh secret set DEPLOYMENT_ENV_FILE
    echo "$NEXT_PUBLIC_API_URL" | gh secret set NEXT_PUBLIC_API_URL
    echo "$SLACK_WEBHOOK_URL" | gh secret set SLACK_WEBHOOK_URL
    echo "$GRAFANA_ADMIN_PASSWORD" | gh secret set GRAFANA_ADMIN_PASSWORD
    echo "$DB_PASSWORD" | gh secret set DB_PASSWORD
    echo "$REDIS_PASSWORD" | gh secret set REDIS_PASSWORD
    echo "$JWT_SECRET" | gh secret set JWT_SECRET
    echo "$LOGS_API_KEY" | gh secret set LOGS_API_KEY
    
    log_success "All secrets added to GitHub repository"
}

# Manual instructions
show_manual_instructions() {
    log_info "Manual GitHub Secrets Setup Instructions"
    echo
    echo "1. Go to your GitHub repository"
    echo "2. Click Settings > Secrets and variables > Actions"
    echo "3. Add the following secrets:"
    echo
    
    cat << EOF
DO_SSH_PRIVATE_KEY:
$DO_SSH_PRIVATE_KEY

DO_HOST:
$DO_HOST

DO_USER:
$DO_USER

DEPLOYMENT_ENV_FILE:
$DEPLOYMENT_ENV_FILE

NEXT_PUBLIC_API_URL:
$NEXT_PUBLIC_API_URL

SLACK_WEBHOOK_URL:
$SLACK_WEBHOOK_URL

GRAFANA_ADMIN_PASSWORD:
$GRAFANA_ADMIN_PASSWORD

DB_PASSWORD:
$DB_PASSWORD

REDIS_PASSWORD:
$REDIS_PASSWORD

JWT_SECRET:
$JWT_SECRET

LOGS_API_KEY:
$LOGS_API_KEY
EOF
}

# Cleanup function
cleanup() {
    if [[ -f "$SECRETS_FILE" ]]; then
        log_warning "Removing temporary secrets file: $SECRETS_FILE"
        rm -f "$SECRETS_FILE"
    fi
}

# Main function
main() {
    log_info "BugRelay GitHub Secrets Setup"
    echo "This script will help you configure GitHub Secrets for deployment automation."
    echo
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Create SSH directory if it doesn't exist
    mkdir -p "$SSH_KEY_DIR"
    chmod 700 "$SSH_KEY_DIR"
    
    # Collect all secrets
    collect_ssh_secrets
    collect_database_secrets
    collect_security_secrets
    collect_application_secrets
    collect_notification_secrets
    collect_monitoring_secrets
    
    # Generate deployment environment file
    generate_deployment_env
    
    echo
    log_info "Secret collection complete!"
    echo
    
    # Setup GitHub secrets
    if prompt_yes_no "Automatically add secrets to GitHub using GitHub CLI?" "Y"; then
        if setup_github_secrets; then
            log_success "GitHub Secrets setup complete!"
        else
            log_warning "Automatic setup failed. Showing manual instructions..."
            show_manual_instructions
        fi
    else
        log_info "Showing manual setup instructions..."
        show_manual_instructions
    fi
    
    echo
    log_info "Setup Summary:"
    echo "- SSH key generated: ${SSH_KEY_PATH:-N/A}"
    echo "- Environment file: $SECRETS_FILE"
    echo "- Secrets configured for GitHub Actions workflows"
    echo
    log_warning "Important Security Notes:"
    echo "- Keep your SSH private key secure"
    echo "- Rotate secrets regularly (see docs/deployment/github-secrets.md)"
    echo "- Remove the temporary secrets file: $SECRETS_FILE"
    echo "- Add the SSH public key to your server's authorized_keys"
    
    if [[ -n "${SSH_PUBLIC_KEY:-}" ]]; then
        echo
        log_info "SSH Public Key (add to server):"
        echo "$SSH_PUBLIC_KEY"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi