#!/bin/bash

# Deployment Audit Logging Script
# Logs all deployment events with metadata to centralized location
# Usage: ./audit-log.sh <event_type> <component> [additional_metadata...]

set -euo pipefail

# Configuration
AUDIT_LOG_DIR="${AUDIT_LOG_DIR:-/var/log/bugrelay/audit}"
AUDIT_LOG_FILE="${AUDIT_LOG_FILE:-${AUDIT_LOG_DIR}/deployment-audit.log}"
RETENTION_DAYS=90
MAX_LOG_SIZE="100M"

# Ensure audit log directory exists
mkdir -p "${AUDIT_LOG_DIR}"

# Function to log audit events
log_audit_event() {
    local event_type="$1"
    local component="$2"
    shift 2
    local additional_metadata="$*"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local hostname=$(hostname)
    local user="${USER:-unknown}"
    local git_commit="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
    local deployer="${GITHUB_ACTOR:-${user}}"
    local workflow_run_id="${GITHUB_RUN_ID:-manual}"
    local workflow_run_url="${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
    
    # Create structured log entry
    local log_entry=$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "event_type": "${event_type}",
  "component": "${component}",
  "hostname": "${hostname}",
  "user": "${user}",
  "deployer": "${deployer}",
  "git_commit": "${git_commit}",
  "workflow_run_id": "${workflow_run_id}",
  "workflow_run_url": "${workflow_run_url}",
  "pid": $$,
  "metadata": {
    ${additional_metadata}
  }
}
EOF
)
    
    # Write to audit log with file locking (if flock is available)
    if command -v flock >/dev/null 2>&1; then
        (
            flock -x 200
            echo "${log_entry}" >> "${AUDIT_LOG_FILE}"
        ) 200>"${AUDIT_LOG_FILE}.lock"
    else
        # Fallback without file locking
        echo "${log_entry}" >> "${AUDIT_LOG_FILE}"
    fi
    
    # Also send to syslog for centralized logging
    logger -t "bugrelay-deployment" -p local0.info "${event_type}: ${component} by ${deployer} (${git_commit})"
    
    # Send to monitoring system (Prometheus pushgateway if available)
    if command -v curl >/dev/null 2>&1 && [[ -n "${PUSHGATEWAY_URL:-}" ]]; then
        send_to_pushgateway "${event_type}" "${component}" "${deployer}" "${git_commit}"
    fi
}

# Function to send metrics to Prometheus Pushgateway
send_to_pushgateway() {
    local event_type="$1"
    local component="$2"
    local deployer="$3"
    local git_commit="$4"
    
    local timestamp=$(date +%s)
    local status="unknown"
    
    # Map event types to status
    case "${event_type}" in
        "deployment_started") status="pending" ;;
        "deployment_completed") status="success" ;;
        "deployment_failed") status="failed" ;;
        "deployment_rolled_back") status="rolled_back" ;;
        "health_check_passed") status="success" ;;
        "health_check_failed") status="failed" ;;
    esac
    
    # Send deployment metrics
    cat <<EOF | curl -X POST --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/deployment/instance/${hostname}" || true
# HELP deployment_total Total number of deployments
# TYPE deployment_total counter
deployment_total{component="${component}",status="${status}",deployer="${deployer}",version="${git_commit}"} 1 ${timestamp}000

# HELP deployment_info Deployment information
# TYPE deployment_info gauge
deployment_info{component="${component}",status="${status}",deployer="${deployer}",version="${git_commit}",timestamp="${timestamp}"} 1 ${timestamp}000
EOF
}

# Function to log deployment start
log_deployment_start() {
    local component="$1"
    local version="$2"
    local environment="${3:-production}"
    
    log_audit_event "deployment_started" "${component}" \
        "\"version\": \"${version}\", \"environment\": \"${environment}\", \"start_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log deployment completion
log_deployment_complete() {
    local component="$1"
    local version="$2"
    local duration="$3"
    local environment="${4:-production}"
    
    log_audit_event "deployment_completed" "${component}" \
        "\"version\": \"${version}\", \"environment\": \"${environment}\", \"duration_seconds\": ${duration}, \"end_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log deployment failure
log_deployment_failure() {
    local component="$1"
    local version="$2"
    local error_message="$3"
    local duration="$4"
    local environment="${5:-production}"
    
    # Escape quotes in error message
    error_message=$(echo "${error_message}" | sed 's/"/\\"/g')
    
    log_audit_event "deployment_failed" "${component}" \
        "\"version\": \"${version}\", \"environment\": \"${environment}\", \"duration_seconds\": ${duration}, \"error\": \"${error_message}\", \"end_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log deployment rollback
log_deployment_rollback() {
    local component="$1"
    local failed_version="$2"
    local rollback_version="$3"
    local reason="$4"
    local environment="${5:-production}"
    
    # Escape quotes in reason
    reason=$(echo "${reason}" | sed 's/"/\\"/g')
    
    log_audit_event "deployment_rolled_back" "${component}" \
        "\"failed_version\": \"${failed_version}\", \"rollback_version\": \"${rollback_version}\", \"environment\": \"${environment}\", \"reason\": \"${reason}\", \"rollback_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log health check results
log_health_check() {
    local component="$1"
    local check_type="$2"
    local status="$3"
    local response_time="$4"
    local details="${5:-}"
    local environment="${6:-production}"
    
    # Escape quotes in details
    details=$(echo "${details}" | sed 's/"/\\"/g')
    
    local event_type="health_check_passed"
    if [[ "${status}" != "pass" ]]; then
        event_type="health_check_failed"
    fi
    
    log_audit_event "${event_type}" "${component}" \
        "\"check_type\": \"${check_type}\", \"status\": \"${status}\", \"response_time_ms\": ${response_time}, \"details\": \"${details}\", \"environment\": \"${environment}\", \"check_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log backup creation
log_backup_created() {
    local component="$1"
    local backup_path="$2"
    local backup_size="$3"
    local environment="${4:-production}"
    
    log_audit_event "backup_created" "${component}" \
        "\"backup_path\": \"${backup_path}\", \"backup_size_bytes\": ${backup_size}, \"environment\": \"${environment}\", \"backup_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to log configuration changes
log_config_change() {
    local component="$1"
    local config_file="$2"
    local change_type="$3"
    local environment="${4:-production}"
    
    log_audit_event "config_changed" "${component}" \
        "\"config_file\": \"${config_file}\", \"change_type\": \"${change_type}\", \"environment\": \"${environment}\", \"change_time\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\""
}

# Function to rotate audit logs
rotate_audit_logs() {
    if [[ -f "${AUDIT_LOG_FILE}" ]]; then
        # Check if log file exceeds maximum size
        if [[ $(stat -f%z "${AUDIT_LOG_FILE}" 2>/dev/null || stat -c%s "${AUDIT_LOG_FILE}" 2>/dev/null || echo 0) -gt $(numfmt --from=iec "${MAX_LOG_SIZE}") ]]; then
            local timestamp=$(date +"%Y%m%d_%H%M%S")
            mv "${AUDIT_LOG_FILE}" "${AUDIT_LOG_FILE}.${timestamp}"
            gzip "${AUDIT_LOG_FILE}.${timestamp}"
            touch "${AUDIT_LOG_FILE}"
            chmod 640 "${AUDIT_LOG_FILE}"
        fi
        
        # Remove old log files beyond retention period
        find "${AUDIT_LOG_DIR}" -name "deployment-audit.log.*" -type f -mtime +${RETENTION_DAYS} -delete
    fi
}

# Function to query audit logs
query_audit_logs() {
    local component="${1:-}"
    local event_type="${2:-}"
    local start_date="${3:-}"
    local end_date="${4:-}"
    
    local filter_cmd="cat"
    
    if [[ -n "${component}" ]]; then
        filter_cmd="${filter_cmd} | jq 'select(.component == \"${component}\")'"
    fi
    
    if [[ -n "${event_type}" ]]; then
        filter_cmd="${filter_cmd} | jq 'select(.event_type == \"${event_type}\")'"
    fi
    
    if [[ -n "${start_date}" ]]; then
        filter_cmd="${filter_cmd} | jq 'select(.timestamp >= \"${start_date}\")'"
    fi
    
    if [[ -n "${end_date}" ]]; then
        filter_cmd="${filter_cmd} | jq 'select(.timestamp <= \"${end_date}\")'"
    fi
    
    # Search through current and archived logs
    {
        [[ -f "${AUDIT_LOG_FILE}" ]] && cat "${AUDIT_LOG_FILE}"
        find "${AUDIT_LOG_DIR}" -name "deployment-audit.log.*.gz" -type f -exec zcat {} \;
    } | eval "${filter_cmd}"
}

# Function to generate audit report
generate_audit_report() {
    local start_date="${1:-$(date -d '7 days ago' +%Y-%m-%d)}"
    local end_date="${2:-$(date +%Y-%m-%d)}"
    local output_file="${3:-/tmp/deployment-audit-report-$(date +%Y%m%d).json}"
    
    echo "Generating deployment audit report from ${start_date} to ${end_date}..."
    
    # Generate summary statistics
    local total_deployments=$(query_audit_logs "" "deployment_started" "${start_date}T00:00:00Z" "${end_date}T23:59:59Z" | wc -l)
    local successful_deployments=$(query_audit_logs "" "deployment_completed" "${start_date}T00:00:00Z" "${end_date}T23:59:59Z" | wc -l)
    local failed_deployments=$(query_audit_logs "" "deployment_failed" "${start_date}T00:00:00Z" "${end_date}T23:59:59Z" | wc -l)
    local rollbacks=$(query_audit_logs "" "deployment_rolled_back" "${start_date}T00:00:00Z" "${end_date}T23:59:59Z" | wc -l)
    
    # Create report
    cat > "${output_file}" <<EOF
{
  "report_period": {
    "start_date": "${start_date}",
    "end_date": "${end_date}",
    "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
  },
  "summary": {
    "total_deployments": ${total_deployments},
    "successful_deployments": ${successful_deployments},
    "failed_deployments": ${failed_deployments},
    "rollbacks": ${rollbacks},
    "success_rate": $(echo "scale=2; ${successful_deployments} * 100 / ${total_deployments}" | bc -l 2>/dev/null || echo "0")
  },
  "events": [
$(query_audit_logs "" "" "${start_date}T00:00:00Z" "${end_date}T23:59:59Z" | sed '$!s/$/,/')
  ]
}
EOF
    
    echo "Audit report generated: ${output_file}"
}

# Main function to handle command line arguments
main() {
    case "${1:-help}" in
        "start")
            log_deployment_start "$2" "$3" "${4:-production}"
            ;;
        "complete")
            log_deployment_complete "$2" "$3" "$4" "${5:-production}"
            ;;
        "fail")
            log_deployment_failure "$2" "$3" "$4" "$5" "${6:-production}"
            ;;
        "rollback")
            log_deployment_rollback "$2" "$3" "$4" "$5" "${6:-production}"
            ;;
        "health-check")
            log_health_check "$2" "$3" "$4" "$5" "${6:-}" "${7:-production}"
            ;;
        "backup")
            log_backup_created "$2" "$3" "$4" "${5:-production}"
            ;;
        "config-change")
            log_config_change "$2" "$3" "$4" "${5:-production}"
            ;;
        "rotate")
            rotate_audit_logs
            ;;
        "query")
            query_audit_logs "${2:-}" "${3:-}" "${4:-}" "${5:-}"
            ;;
        "report")
            generate_audit_report "${2:-}" "${3:-}" "${4:-}"
            ;;
        "help"|*)
            cat <<EOF
Usage: $0 <command> [arguments...]

Commands:
  start <component> <version> [environment]
    Log deployment start event
    
  complete <component> <version> <duration_seconds> [environment]
    Log deployment completion event
    
  fail <component> <version> <error_message> <duration_seconds> [environment]
    Log deployment failure event
    
  rollback <component> <failed_version> <rollback_version> <reason> [environment]
    Log deployment rollback event
    
  health-check <component> <check_type> <status> <response_time_ms> [details] [environment]
    Log health check result (status: pass/fail)
    
  backup <component> <backup_path> <backup_size_bytes> [environment]
    Log backup creation event
    
  config-change <component> <config_file> <change_type> [environment]
    Log configuration change event
    
  rotate
    Rotate audit log files
    
  query [component] [event_type] [start_date] [end_date]
    Query audit logs with optional filters
    
  report [start_date] [end_date] [output_file]
    Generate audit report for date range
    
  help
    Show this help message

Environment Variables:
  PUSHGATEWAY_URL - Prometheus Pushgateway URL for metrics
  GITHUB_SHA - Git commit hash (auto-detected in GitHub Actions)
  GITHUB_ACTOR - GitHub username (auto-detected in GitHub Actions)
  GITHUB_RUN_ID - GitHub Actions run ID
  GITHUB_SERVER_URL - GitHub server URL
  GITHUB_REPOSITORY - GitHub repository name

Examples:
  $0 start backend v1.2.3 production
  $0 complete backend v1.2.3 120 production
  $0 fail frontend v2.1.0 "Build failed" 45 staging
  $0 rollback backend v1.2.3 v1.2.2 "Health check failed" production
  $0 health-check backend api_health pass 50 "OK" production
  $0 query backend deployment_started 2024-01-01T00:00:00Z
  $0 report 2024-01-01 2024-01-07 /tmp/weekly-report.json
EOF
            ;;
    esac
}

# Set up log rotation cron job if running as root
setup_log_rotation() {
    if [[ $EUID -eq 0 ]] && command -v crontab >/dev/null 2>&1; then
        # Add cron job for log rotation (daily at 2 AM)
        (crontab -l 2>/dev/null | grep -v "audit-log.sh rotate"; echo "0 2 * * * $(realpath "$0") rotate") | crontab -
        echo "Log rotation cron job installed"
    fi
}

# Initialize audit logging
init_audit_logging() {
    # Create audit log directory and file
    mkdir -p "${AUDIT_LOG_DIR}"
    touch "${AUDIT_LOG_FILE}"
    chmod 640 "${AUDIT_LOG_FILE}"
    
    # Set up log rotation
    setup_log_rotation
    
    echo "Audit logging initialized"
    echo "Log file: ${AUDIT_LOG_FILE}"
    echo "Retention: ${RETENTION_DAYS} days"
    echo "Max size: ${MAX_LOG_SIZE}"
}

# Run initialization if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Initialize on first run
    if [[ ! -f "${AUDIT_LOG_FILE}" ]]; then
        init_audit_logging
    fi
    
    # Execute main function with all arguments
    main "$@"
fi