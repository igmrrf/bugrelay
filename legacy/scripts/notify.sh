#!/bin/bash

# BugRelay Notification Script
# Sends deployment notifications to configured channels
# Usage: ./notify.sh [start|success|failure|rollback|rollback_failed] [component] [version] [message]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bugrelay/notifications.log"

# Notification configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
SLACK_CHANNEL="${SLACK_CHANNEL:-#deployments}"
SLACK_USERNAME="${SLACK_USERNAME:-BugRelay Deploy Bot}"
SLACK_ICON="${SLACK_ICON:-:rocket:}"

# Email configuration (optional)
EMAIL_ENABLED="${EMAIL_ENABLED:-false}"
EMAIL_TO="${EMAIL_TO:-}"
EMAIL_FROM="${EMAIL_FROM:-noreply@bugrelay.com}"
SMTP_SERVER="${SMTP_SERVER:-}"

# Colors for console output
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
Usage: $0 [TYPE] [COMPONENT] [VERSION] [MESSAGE]

TYPE:
    start           Deployment started notification
    success         Deployment completed successfully
    failure         Deployment failed
    rollback        Rollback completed
    rollback_failed Rollback failed

COMPONENT:
    backend         Backend API component
    frontend        Frontend application component
    monitoring      Monitoring stack component
    docs            Documentation site component

VERSION:
    Git commit hash, tag, or branch name

MESSAGE:
    Additional message or error details (optional)

Examples:
    $0 start backend v1.2.3 "Deployment started"
    $0 success frontend abc123 "Deployment completed successfully"
    $0 failure backend main "Health checks failed"
    $0 rollback backend v1.2.2 "Rolled back due to issues"

Environment Variables:
    SLACK_WEBHOOK_URL   Slack webhook URL for notifications
    SLACK_CHANNEL       Slack channel (default: #deployments)
    SLACK_USERNAME      Bot username (default: BugRelay Deploy Bot)
    SLACK_ICON          Bot icon (default: :rocket:)
    EMAIL_ENABLED       Enable email notifications (default: false)
    EMAIL_TO            Email recipient addresses (comma-separated)
    EMAIL_FROM          Email sender address
    SMTP_SERVER         SMTP server for email notifications

EOF
}

# Validate notification type
validate_notification_type() {
    local type="$1"
    case "$type" in
        start|success|failure|rollback|rollback_failed)
            return 0
            ;;
        *)
            log "ERROR" "Invalid notification type: $type"
            return 1
            ;;
    esac
}

# Get notification color based on type
get_notification_color() {
    local type="$1"
    case "$type" in
        start)
            echo "#36a64f"  # Green
            ;;
        success)
            echo "#36a64f"  # Green
            ;;
        failure)
            echo "#ff0000"  # Red
            ;;
        rollback)
            echo "#ff9900"  # Orange
            ;;
        rollback_failed)
            echo "#cc0000"  # Dark Red
            ;;
        *)
            echo "#808080"  # Gray
            ;;
    esac
}

# Get notification icon based on type
get_notification_icon() {
    local type="$1"
    case "$type" in
        start)
            echo ":rocket:"
            ;;
        success)
            echo ":white_check_mark:"
            ;;
        failure)
            echo ":x:"
            ;;
        rollback)
            echo ":warning:"
            ;;
        rollback_failed)
            echo ":exclamation:"
            ;;
        *)
            echo ":information_source:"
            ;;
    esac
}

# Get notification title based on type
get_notification_title() {
    local type="$1"
    local component="$2"
    case "$type" in
        start)
            echo "🚀 Deployment Started: $component"
            ;;
        success)
            echo "✅ Deployment Successful: $component"
            ;;
        failure)
            echo "❌ Deployment Failed: $component"
            ;;
        rollback)
            echo "⚠️ Rollback Completed: $component"
            ;;
        rollback_failed)
            echo "❗ Rollback Failed: $component"
            ;;
        *)
            echo "ℹ️ Deployment Update: $component"
            ;;
    esac
}

# Get deployment metadata
get_deployment_metadata() {
    local component="$1"
    local version="$2"
    
    # Get current timestamp
    local timestamp=$(date -Iseconds)
    
    # Get deployer information
    local deployer="${GITHUB_ACTOR:-${USER:-unknown}}"
    
    # Get commit information if version looks like a commit hash
    local commit_info=""
    if [[ "$version" =~ ^[a-f0-9]{7,40}$ ]]; then
        if command -v git >/dev/null 2>&1; then
            commit_info=$(git log --oneline -1 "$version" 2>/dev/null || echo "")
        fi
    fi
    
    # Get environment information
    local environment="${DEPLOY_ENV:-production}"
    
    # Get server information
    local server="${DEPLOY_HOST:-$(hostname)}"
    
    # Create metadata object
    cat << EOF
{
    "component": "$component",
    "version": "$version",
    "commit_info": "$commit_info",
    "deployer": "$deployer",
    "environment": "$environment",
    "server": "$server",
    "timestamp": "$timestamp",
    "github_run_id": "${GITHUB_RUN_ID:-}",
    "github_run_url": "${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
}
EOF
}

# Format Slack message
format_slack_message() {
    local type="$1"
    local component="$2"
    local version="$3"
    local message="$4"
    local metadata="$5"
    
    local title=$(get_notification_title "$type" "$component")
    local color=$(get_notification_color "$type")
    local icon=$(get_notification_icon "$type")
    
    # Extract metadata fields
    local deployer=$(echo "$metadata" | jq -r '.deployer // "unknown"')
    local environment=$(echo "$metadata" | jq -r '.environment // "production"')
    local server=$(echo "$metadata" | jq -r '.server // "unknown"')
    local timestamp=$(echo "$metadata" | jq -r '.timestamp // ""')
    local commit_info=$(echo "$metadata" | jq -r '.commit_info // ""')
    local github_run_url=$(echo "$metadata" | jq -r '.github_run_url // ""')
    
    # Build fields array
    local fields='[
        {
            "title": "Component",
            "value": "'$component'",
            "short": true
        },
        {
            "title": "Version",
            "value": "'$version'",
            "short": true
        },
        {
            "title": "Environment",
            "value": "'$environment'",
            "short": true
        },
        {
            "title": "Deployer",
            "value": "'$deployer'",
            "short": true
        }'
    
    # Add server field
    fields+=',
        {
            "title": "Server",
            "value": "'$server'",
            "short": true
        }'
    
    # Add timestamp field
    if [[ -n "$timestamp" ]]; then
        fields+=',
        {
            "title": "Timestamp",
            "value": "'$timestamp'",
            "short": true
        }'
    fi
    
    # Add commit info if available
    if [[ -n "$commit_info" ]]; then
        fields+=',
        {
            "title": "Commit",
            "value": "'"$commit_info"'",
            "short": false
        }'
    fi
    
    # Add GitHub Actions link if available
    if [[ -n "$github_run_url" ]] && [[ "$github_run_url" != "null" ]]; then
        fields+=',
        {
            "title": "GitHub Actions",
            "value": "<'$github_run_url'|View Run>",
            "short": false
        }'
    fi
    
    # Add message field if provided
    if [[ -n "$message" ]]; then
        fields+=',
        {
            "title": "Details",
            "value": "'"$message"'",
            "short": false
        }'
    fi
    
    fields+=']'
    
    # Create Slack payload
    cat << EOF
{
    "channel": "$SLACK_CHANNEL",
    "username": "$SLACK_USERNAME",
    "icon_emoji": "$icon",
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "fields": $fields,
            "footer": "BugRelay Deployment System",
            "ts": $(date +%s)
        }
    ]
}
EOF
}

# Send Slack notification
send_slack_notification() {
    local type="$1"
    local component="$2"
    local version="$3"
    local message="$4"
    
    if [[ -z "$SLACK_WEBHOOK_URL" ]]; then
        log "WARN" "SLACK_WEBHOOK_URL not configured, skipping Slack notification"
        return 0
    fi
    
    log "INFO" "Sending Slack notification: $type for $component"
    
    # Get deployment metadata
    local metadata=$(get_deployment_metadata "$component" "$version")
    
    # Format Slack message
    local slack_payload=$(format_slack_message "$type" "$component" "$version" "$message" "$metadata")
    
    # Send to Slack
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$slack_payload" \
        "$SLACK_WEBHOOK_URL")
    
    if [[ "$response" == "ok" ]]; then
        log "SUCCESS" "Slack notification sent successfully"
        return 0
    else
        log "ERROR" "Failed to send Slack notification: $response"
        return 1
    fi
}

# Format email message
format_email_message() {
    local type="$1"
    local component="$2"
    local version="$3"
    local message="$4"
    local metadata="$5"
    
    local title=$(get_notification_title "$type" "$component")
    
    # Extract metadata fields
    local deployer=$(echo "$metadata" | jq -r '.deployer // "unknown"')
    local environment=$(echo "$metadata" | jq -r '.environment // "production"')
    local server=$(echo "$metadata" | jq -r '.server // "unknown"')
    local timestamp=$(echo "$metadata" | jq -r '.timestamp // ""')
    local commit_info=$(echo "$metadata" | jq -r '.commit_info // ""')
    local github_run_url=$(echo "$metadata" | jq -r '.github_run_url // ""')
    
    # Create email body
    cat << EOF
Subject: $title

$title

Deployment Details:
- Component: $component
- Version: $version
- Environment: $environment
- Deployer: $deployer
- Server: $server
- Timestamp: $timestamp

EOF
    
    if [[ -n "$commit_info" ]]; then
        echo "- Commit: $commit_info"
        echo ""
    fi
    
    if [[ -n "$github_run_url" ]] && [[ "$github_run_url" != "null" ]]; then
        echo "- GitHub Actions: $github_run_url"
        echo ""
    fi
    
    if [[ -n "$message" ]]; then
        echo "Additional Details:"
        echo "$message"
        echo ""
    fi
    
    echo "---"
    echo "This is an automated message from the BugRelay Deployment System."
}

# Send email notification
send_email_notification() {
    local type="$1"
    local component="$2"
    local version="$3"
    local message="$4"
    
    if [[ "$EMAIL_ENABLED" != "true" ]]; then
        log "INFO" "Email notifications disabled, skipping email"
        return 0
    fi
    
    if [[ -z "$EMAIL_TO" ]]; then
        log "WARN" "EMAIL_TO not configured, skipping email notification"
        return 0
    fi
    
    log "INFO" "Sending email notification: $type for $component"
    
    # Get deployment metadata
    local metadata=$(get_deployment_metadata "$component" "$version")
    
    # Format email message
    local email_content=$(format_email_message "$type" "$component" "$version" "$message" "$metadata")
    
    # Send email using mail command or sendmail
    if command -v mail >/dev/null 2>&1; then
        echo "$email_content" | mail -s "$(get_notification_title "$type" "$component")" -r "$EMAIL_FROM" "$EMAIL_TO"
        log "SUCCESS" "Email notification sent successfully"
    elif command -v sendmail >/dev/null 2>&1; then
        {
            echo "From: $EMAIL_FROM"
            echo "To: $EMAIL_TO"
            echo "$email_content"
        } | sendmail "$EMAIL_TO"
        log "SUCCESS" "Email notification sent successfully"
    else
        log "ERROR" "No email command available (mail or sendmail)"
        return 1
    fi
}

# Send webhook notification (generic)
send_webhook_notification() {
    local webhook_url="$1"
    local type="$2"
    local component="$3"
    local version="$4"
    local message="$5"
    
    if [[ -z "$webhook_url" ]]; then
        return 0
    fi
    
    log "INFO" "Sending webhook notification to: $webhook_url"
    
    # Get deployment metadata
    local metadata=$(get_deployment_metadata "$component" "$version")
    
    # Create webhook payload
    local webhook_payload=$(cat << EOF
{
    "type": "$type",
    "component": "$component",
    "version": "$version",
    "message": "$message",
    "metadata": $metadata
}
EOF
)
    
    # Send webhook
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$webhook_payload" \
        "$webhook_url")
    
    log "INFO" "Webhook response: $response"
}

# Main notification function
main() {
    local type="${1:-}"
    local component="${2:-}"
    local version="${3:-}"
    local message="${4:-}"
    
    # Parse command line arguments
    if [[ "$#" -lt 3 ]] || [[ "$type" == "-h" ]] || [[ "$type" == "--help" ]]; then
        usage
        exit 1
    fi
    
    # Validate notification type
    if ! validate_notification_type "$type"; then
        usage
        exit 1
    fi
    
    log "INFO" "Sending $type notification for $component ($version)"
    
    # Track notification success
    local notification_success=true
    
    # Send Slack notification
    if ! send_slack_notification "$type" "$component" "$version" "$message"; then
        notification_success=false
    fi
    
    # Send email notification
    if ! send_email_notification "$type" "$component" "$version" "$message"; then
        notification_success=false
    fi
    
    # Send custom webhook notifications
    if [[ -n "${CUSTOM_WEBHOOK_URL:-}" ]]; then
        if ! send_webhook_notification "$CUSTOM_WEBHOOK_URL" "$type" "$component" "$version" "$message"; then
            notification_success=false
        fi
    fi
    
    # Log notification result
    if [[ "$notification_success" == "true" ]]; then
        log "SUCCESS" "All notifications sent successfully"
        exit 0
    else
        log "ERROR" "Some notifications failed to send"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"