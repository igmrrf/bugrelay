#!/bin/bash

# BugRelay Health Check Script
# Performs comprehensive health checks for deployed components
# Usage: ./health-check.sh [backend|frontend|monitoring|docs|all]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bugrelay/health-check.log"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_RETRIES=5
RETRY_DELAY=10
AUDIT_LOG_SCRIPT="$SCRIPT_DIR/audit-log.sh"
ENVIRONMENT="${DEPLOY_ENV:-production}"

# Service endpoints
BACKEND_HOST="${BACKEND_HOST:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DOCS_HOST="${DOCS_HOST:-localhost}"
DOCS_PORT="${DOCS_PORT:-8081}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bugrelay_production}"
DB_USER="${DB_USER:-bugrelay_user}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Monitoring endpoints
GRAFANA_HOST="${GRAFANA_HOST:-localhost}"
GRAFANA_PORT="${GRAFANA_PORT:-3001}"
PROMETHEUS_HOST="${PROMETHEUS_HOST:-localhost}"
PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
LOKI_HOST="${LOKI_HOST:-localhost}"
LOKI_PORT="${LOKI_PORT:-3100}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
declare -A HEALTH_RESULTS

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
Usage: $0 [COMPONENT]

COMPONENT:
    backend     Check backend API health
    frontend    Check frontend application health
    monitoring  Check monitoring stack health
    docs        Check documentation site health
    all         Check all components (default)

Examples:
    $0 backend      # Check only backend health
    $0 frontend     # Check only frontend health
    $0 monitoring   # Check only monitoring stack health
    $0 docs         # Check only documentation site health
    $0 all          # Check all components
    $0              # Check all components (default)

Environment Variables:
    BACKEND_HOST        Backend host (default: localhost)
    BACKEND_PORT        Backend port (default: 8080)
    FRONTEND_HOST       Frontend host (default: localhost)
    FRONTEND_PORT       Frontend port (default: 3000)
    DOCS_HOST           Docs host (default: localhost)
    DOCS_PORT           Docs port (default: 8081)
    DB_HOST             Database host (default: localhost)
    DB_PORT             Database port (default: 5432)
    REDIS_HOST          Redis host (default: localhost)
    REDIS_PORT          Redis port (default: 6379)
    HEALTH_CHECK_TIMEOUT    Timeout in seconds (default: 60)
    HEALTH_CHECK_RETRIES    Number of retries (default: 5)

EOF
}

# Validate component
validate_component() {
    local component="$1"
    case "$component" in
        backend|frontend|monitoring|docs|all)
            return 0
            ;;
        *)
            log "ERROR" "Invalid component: $component. Must be one of: backend, frontend, monitoring, docs, all"
            return 1
            ;;
    esac
}

# HTTP health check with retries
http_health_check() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-$HEALTH_CHECK_TIMEOUT}"
    
    log "INFO" "Checking $name health: $url"
    
    local attempt=1
    while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
        local start_time=$(date +%s.%N)
        
        # Perform HTTP request
        local response=$(curl -s -w "%{http_code}|%{time_total}" \
            --max-time "$timeout" \
            --connect-timeout 10 \
            "$url" 2>/dev/null || echo "000|0")
        
        local http_code=$(echo "$response" | cut -d'|' -f1)
        local response_time=$(echo "$response" | cut -d'|' -f2)
        local end_time=$(date +%s.%N)
        local total_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        
        # Convert response time to milliseconds
        local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
        response_time_ms=${response_time_ms%.*}  # Remove decimal part
        
        if [[ "$http_code" == "$expected_status" ]]; then
            log "SUCCESS" "$name health check passed (HTTP $http_code, ${response_time}s)"
            HEALTH_RESULTS["$name"]="PASS"
            
            # Log successful health check to audit log
            if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
                "$AUDIT_LOG_SCRIPT" health-check "$name" "http_check" "pass" "$response_time_ms" "HTTP $http_code" "$ENVIRONMENT" || true
            fi
            
            return 0
        else
            log "WARN" "$name health check failed (attempt $attempt/$HEALTH_CHECK_RETRIES): HTTP $http_code"
            
            if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
                log "INFO" "Retrying in ${RETRY_DELAY}s..."
                sleep "$RETRY_DELAY"
            fi
        fi
        
        ((attempt++))
    done
    
    log "ERROR" "$name health check failed after $HEALTH_CHECK_RETRIES attempts"
    HEALTH_RESULTS["$name"]="FAIL"
    
    # Log failed health check to audit log
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" health-check "$name" "http_check" "fail" "0" "HTTP $http_code after $HEALTH_CHECK_RETRIES attempts" "$ENVIRONMENT" || true
    fi
    
    return 1
}

# TCP port health check
tcp_health_check() {
    local name="$1"
    local host="$2"
    local port="$3"
    local timeout="${4:-10}"
    
    log "INFO" "Checking $name TCP connectivity: $host:$port"
    
    local attempt=1
    while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
        local start_time=$(date +%s.%N)
        
        if timeout "$timeout" bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            local end_time=$(date +%s.%N)
            local response_time=$(echo "($end_time - $start_time) * 1000" | bc -l 2>/dev/null || echo "0")
            response_time=${response_time%.*}  # Remove decimal part
            
            log "SUCCESS" "$name TCP check passed ($host:$port)"
            HEALTH_RESULTS["$name"]="PASS"
            
            # Log successful TCP check to audit log
            if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
                "$AUDIT_LOG_SCRIPT" health-check "$name" "tcp_check" "pass" "$response_time" "Connected to $host:$port" "$ENVIRONMENT" || true
            fi
            
            return 0
        else
            log "WARN" "$name TCP check failed (attempt $attempt/$HEALTH_CHECK_RETRIES): $host:$port"
            
            if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
                log "INFO" "Retrying in ${RETRY_DELAY}s..."
                sleep "$RETRY_DELAY"
            fi
        fi
        
        ((attempt++))
    done
    
    log "ERROR" "$name TCP check failed after $HEALTH_CHECK_RETRIES attempts"
    HEALTH_RESULTS["$name"]="FAIL"
    
    # Log failed TCP check to audit log
    if [[ -x "$AUDIT_LOG_SCRIPT" ]]; then
        "$AUDIT_LOG_SCRIPT" health-check "$name" "tcp_check" "fail" "0" "Failed to connect to $host:$port after $HEALTH_CHECK_RETRIES attempts" "$ENVIRONMENT" || true
    fi
    
    return 1
}

# Service status check
service_health_check() {
    local name="$1"
    local service_name="$2"
    
    log "INFO" "Checking $name service status: $service_name"
    
    if systemctl is-active --quiet "$service_name"; then
        local status=$(systemctl show "$service_name" --property=ActiveState --value)
        local uptime=$(systemctl show "$service_name" --property=ActiveEnterTimestamp --value)
        
        log "SUCCESS" "$name service is active ($status, started: $uptime)"
        HEALTH_RESULTS["$name"]="PASS"
        return 0
    else
        local status=$(systemctl show "$service_name" --property=ActiveState --value 2>/dev/null || echo "unknown")
        log "ERROR" "$name service is not active (status: $status)"
        HEALTH_RESULTS["$name"]="FAIL"
        return 1
    fi
}

# Database connectivity check
database_health_check() {
    local name="database"
    
    log "INFO" "Checking database connectivity: $DB_HOST:$DB_PORT/$DB_NAME"
    
    # First check TCP connectivity
    if ! tcp_health_check "database_tcp" "$DB_HOST" "$DB_PORT" 5; then
        HEALTH_RESULTS["$name"]="FAIL"
        return 1
    fi
    
    # Check PostgreSQL connectivity with psql if available
    if command -v psql >/dev/null 2>&1; then
        local attempt=1
        while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
                log "SUCCESS" "Database connectivity check passed"
                HEALTH_RESULTS["$name"]="PASS"
                return 0
            else
                log "WARN" "Database connectivity check failed (attempt $attempt/$HEALTH_CHECK_RETRIES)"
                
                if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
                    log "INFO" "Retrying in ${RETRY_DELAY}s..."
                    sleep "$RETRY_DELAY"
                fi
            fi
            
            ((attempt++))
        done
        
        log "ERROR" "Database connectivity check failed after $HEALTH_CHECK_RETRIES attempts"
        HEALTH_RESULTS["$name"]="FAIL"
        return 1
    else
        log "WARN" "psql not available, skipping database query test"
        HEALTH_RESULTS["$name"]="PASS"  # TCP check passed
        return 0
    fi
}

# Redis connectivity check
redis_health_check() {
    local name="redis"
    
    log "INFO" "Checking Redis connectivity: $REDIS_HOST:$REDIS_PORT"
    
    # First check TCP connectivity
    if ! tcp_health_check "redis_tcp" "$REDIS_HOST" "$REDIS_PORT" 5; then
        HEALTH_RESULTS["$name"]="FAIL"
        return 1
    fi
    
    # Check Redis connectivity with redis-cli if available
    if command -v redis-cli >/dev/null 2>&1; then
        local attempt=1
        while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
            local redis_auth=""
            if [[ -n "${REDIS_PASSWORD:-}" ]]; then
                redis_auth="-a $REDIS_PASSWORD"
            fi
            
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth ping | grep -q "PONG"; then
                log "SUCCESS" "Redis connectivity check passed"
                HEALTH_RESULTS["$name"]="PASS"
                return 0
            else
                log "WARN" "Redis connectivity check failed (attempt $attempt/$HEALTH_CHECK_RETRIES)"
                
                if [[ $attempt -lt $HEALTH_CHECK_RETRIES ]]; then
                    log "INFO" "Retrying in ${RETRY_DELAY}s..."
                    sleep "$RETRY_DELAY"
                fi
            fi
            
            ((attempt++))
        done
        
        log "ERROR" "Redis connectivity check failed after $HEALTH_CHECK_RETRIES attempts"
        HEALTH_RESULTS["$name"]="FAIL"
        return 1
    else
        log "WARN" "redis-cli not available, skipping Redis ping test"
        HEALTH_RESULTS["$name"]="PASS"  # TCP check passed
        return 0
    fi
}

# Backend health check
check_backend_health() {
    log "INFO" "=== Backend Health Check ==="
    
    local backend_url="http://$BACKEND_HOST:$BACKEND_PORT"
    local health_endpoint="$backend_url/health"
    local api_endpoint="$backend_url/api/v1/health"
    
    # Check backend service status
    service_health_check "backend_service" "bugrelay-backend"
    
    # Check backend health endpoint
    http_health_check "backend_health" "$health_endpoint" "200"
    
    # Check API health endpoint
    http_health_check "backend_api" "$api_endpoint" "200"
    
    # Check database connectivity
    database_health_check
    
    # Check Redis connectivity
    redis_health_check
    
    # Overall backend health assessment
    local backend_checks=("backend_service" "backend_health" "backend_api" "database" "redis")
    local failed_checks=0
    
    for check in "${backend_checks[@]}"; do
        if [[ "${HEALTH_RESULTS[$check]:-FAIL}" == "FAIL" ]]; then
            ((failed_checks++))
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        log "SUCCESS" "Backend health check: ALL PASSED"
        HEALTH_RESULTS["backend_overall"]="PASS"
        return 0
    else
        log "ERROR" "Backend health check: $failed_checks/$((${#backend_checks[@]})) checks failed"
        HEALTH_RESULTS["backend_overall"]="FAIL"
        return 1
    fi
}

# Frontend health check
check_frontend_health() {
    log "INFO" "=== Frontend Health Check ==="
    
    local frontend_url="http://$FRONTEND_HOST:$FRONTEND_PORT"
    
    # Check Nginx service status
    service_health_check "nginx_service" "nginx"
    
    # Check frontend accessibility
    http_health_check "frontend_home" "$frontend_url" "200"
    
    # Check frontend health endpoint (if exists)
    http_health_check "frontend_health" "$frontend_url/api/health" "200"
    
    # Check static assets
    http_health_check "frontend_assets" "$frontend_url/_next/static/css" "404"  # 404 is expected for directory
    
    # Check API connectivity from frontend perspective
    http_health_check "frontend_api_proxy" "$frontend_url/api/v1/health" "200"
    
    # Overall frontend health assessment
    local frontend_checks=("nginx_service" "frontend_home" "frontend_health")
    local failed_checks=0
    
    for check in "${frontend_checks[@]}"; do
        if [[ "${HEALTH_RESULTS[$check]:-FAIL}" == "FAIL" ]]; then
            ((failed_checks++))
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        log "SUCCESS" "Frontend health check: ALL PASSED"
        HEALTH_RESULTS["frontend_overall"]="PASS"
        return 0
    else
        log "ERROR" "Frontend health check: $failed_checks/$((${#frontend_checks[@]})) checks failed"
        HEALTH_RESULTS["frontend_overall"]="FAIL"
        return 1
    fi
}

# Monitoring health check
check_monitoring_health() {
    log "INFO" "=== Monitoring Health Check ==="
    
    # Check Grafana
    local grafana_url="http://$GRAFANA_HOST:$GRAFANA_PORT"
    service_health_check "grafana_service" "grafana-server"
    http_health_check "grafana_web" "$grafana_url/api/health" "200"
    
    # Check Prometheus
    local prometheus_url="http://$PROMETHEUS_HOST:$PROMETHEUS_PORT"
    service_health_check "prometheus_service" "prometheus"
    http_health_check "prometheus_web" "$prometheus_url/-/healthy" "200"
    http_health_check "prometheus_ready" "$prometheus_url/-/ready" "200"
    
    # Check Loki
    local loki_url="http://$LOKI_HOST:$LOKI_PORT"
    service_health_check "loki_service" "loki"
    http_health_check "loki_ready" "$loki_url/ready" "200"
    
    # Check Promtail
    service_health_check "promtail_service" "promtail"
    
    # Check AlertManager (if configured)
    if systemctl is-enabled --quiet alertmanager 2>/dev/null; then
        service_health_check "alertmanager_service" "alertmanager"
        http_health_check "alertmanager_web" "http://localhost:9093/-/healthy" "200"
    else
        log "INFO" "AlertManager not configured, skipping"
        HEALTH_RESULTS["alertmanager_service"]="SKIP"
    fi
    
    # Overall monitoring health assessment
    local monitoring_checks=("grafana_service" "grafana_web" "prometheus_service" "prometheus_web" "prometheus_ready" "loki_service" "loki_ready" "promtail_service")
    local failed_checks=0
    local total_checks=0
    
    for check in "${monitoring_checks[@]}"; do
        if [[ "${HEALTH_RESULTS[$check]:-FAIL}" == "FAIL" ]]; then
            ((failed_checks++))
        fi
        if [[ "${HEALTH_RESULTS[$check]:-FAIL}" != "SKIP" ]]; then
            ((total_checks++))
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        log "SUCCESS" "Monitoring health check: ALL PASSED"
        HEALTH_RESULTS["monitoring_overall"]="PASS"
        return 0
    else
        log "ERROR" "Monitoring health check: $failed_checks/$total_checks checks failed"
        HEALTH_RESULTS["monitoring_overall"]="FAIL"
        return 1
    fi
}

# Documentation health check
check_docs_health() {
    log "INFO" "=== Documentation Health Check ==="
    
    local docs_url="http://$DOCS_HOST:$DOCS_PORT"
    
    # Check Nginx service status (shared with frontend)
    if [[ "${HEALTH_RESULTS[nginx_service]:-}" != "PASS" ]]; then
        service_health_check "nginx_service" "nginx"
    fi
    
    # Check documentation site accessibility
    http_health_check "docs_home" "$docs_url" "200"
    
    # Check documentation API endpoints
    http_health_check "docs_api" "$docs_url/api/" "200"
    
    # Check documentation search functionality (if available)
    http_health_check "docs_search" "$docs_url/search" "200"
    
    # Check SSL certificate (if HTTPS is configured)
    if [[ "$docs_url" == https://* ]]; then
        local domain=$(echo "$docs_url" | sed 's|https://||' | cut -d'/' -f1)
        if command -v openssl >/dev/null 2>&1; then
            log "INFO" "Checking SSL certificate for $domain"
            if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
                log "SUCCESS" "SSL certificate check passed"
                HEALTH_RESULTS["docs_ssl"]="PASS"
            else
                log "ERROR" "SSL certificate check failed"
                HEALTH_RESULTS["docs_ssl"]="FAIL"
            fi
        fi
    fi
    
    # Overall docs health assessment
    local docs_checks=("docs_home" "docs_api")
    local failed_checks=0
    
    for check in "${docs_checks[@]}"; do
        if [[ "${HEALTH_RESULTS[$check]:-FAIL}" == "FAIL" ]]; then
            ((failed_checks++))
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        log "SUCCESS" "Documentation health check: ALL PASSED"
        HEALTH_RESULTS["docs_overall"]="PASS"
        return 0
    else
        log "ERROR" "Documentation health check: $failed_checks/$((${#docs_checks[@]})) checks failed"
        HEALTH_RESULTS["docs_overall"]="FAIL"
        return 1
    fi
}

# Generate health check report
generate_health_report() {
    local timestamp=$(date -Iseconds)
    local report_file="/tmp/health-check-report-$(date +%Y%m%d_%H%M%S).json"
    
    log "INFO" "Generating health check report: $report_file"
    
    # Create JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "overall_status": "$(if [[ $OVERALL_STATUS -eq 0 ]]; then echo "HEALTHY"; else echo "UNHEALTHY"; fi)",
    "checks": {
EOF
    
    local first=true
    for check in "${!HEALTH_RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        echo "        \"$check\": \"${HEALTH_RESULTS[$check]}\"" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF
    },
    "summary": {
        "total_checks": ${#HEALTH_RESULTS[@]},
        "passed_checks": $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "PASS" || echo "0"),
        "failed_checks": $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "FAIL" || echo "0"),
        "skipped_checks": $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "SKIP" || echo "0")
    }
}
EOF
    
    log "INFO" "Health check report saved: $report_file"
    
    # Display summary
    log "INFO" "=== Health Check Summary ==="
    log "INFO" "Total checks: ${#HEALTH_RESULTS[@]}"
    log "INFO" "Passed: $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "PASS" || echo "0")"
    log "INFO" "Failed: $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "FAIL" || echo "0")"
    log "INFO" "Skipped: $(echo "${HEALTH_RESULTS[@]}" | tr ' ' '\n' | grep -c "SKIP" || echo "0")"
    
    # Copy report to log directory
    cp "$report_file" "/var/log/bugrelay/health-check-latest.json" 2>/dev/null || true
}

# Main health check function
main() {
    local component="${1:-all}"
    
    # Parse command line arguments
    if [[ "$component" == "-h" ]] || [[ "$component" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate component
    if ! validate_component "$component"; then
        usage
        exit 1
    fi
    
    log "INFO" "Starting health checks for: $component"
    log "INFO" "Timeout: ${HEALTH_CHECK_TIMEOUT}s, Retries: $HEALTH_CHECK_RETRIES"
    
    local overall_status=0
    
    # Run health checks based on component
    case "$component" in
        backend)
            if ! check_backend_health; then
                overall_status=1
            fi
            ;;
        frontend)
            if ! check_frontend_health; then
                overall_status=1
            fi
            ;;
        monitoring)
            if ! check_monitoring_health; then
                overall_status=1
            fi
            ;;
        docs)
            if ! check_docs_health; then
                overall_status=1
            fi
            ;;
        all)
            if ! check_backend_health; then
                overall_status=1
            fi
            if ! check_frontend_health; then
                overall_status=1
            fi
            if ! check_monitoring_health; then
                overall_status=1
            fi
            if ! check_docs_health; then
                overall_status=1
            fi
            ;;
    esac
    
    # Set global status for report generation
    OVERALL_STATUS=$overall_status
    
    # Generate health report
    generate_health_report
    
    # Final status
    if [[ $overall_status -eq 0 ]]; then
        log "SUCCESS" "All health checks passed!"
    else
        log "ERROR" "Some health checks failed!"
    fi
    
    exit $overall_status
}

# Run main function with all arguments
main "$@"