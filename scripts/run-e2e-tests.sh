#!/bin/bash

# BugRelay End-to-End Test Runner
# This script runs comprehensive E2E tests for the BugRelay application

set -e

echo "🧪 Starting BugRelay End-to-End Tests..."

# Configuration
TEST_ENV=${TEST_ENV:-"development"}
BROWSER=${BROWSER:-"chromium"}
HEADLESS=${HEADLESS:-"true"}
WORKERS=${WORKERS:-"1"}
RETRIES=${RETRIES:-"2"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if Playwright is installed
    if [ ! -d "node_modules/@playwright/test" ]; then
        error "Playwright is not installed. Run 'npm install' first."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Install Playwright browsers if needed
install_browsers() {
    log "Checking Playwright browsers..."
    
    if [ ! -d "$HOME/.cache/ms-playwright" ] || [ "$FORCE_BROWSER_INSTALL" = "true" ]; then
        log "Installing Playwright browsers..."
        npx playwright install
        success "Playwright browsers installed"
    else
        log "Playwright browsers already installed"
    fi
}

# Start application services
start_services() {
    log "Starting application services..."
    
    if [ "$TEST_ENV" = "development" ]; then
        # Check if development server is already running
        if curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
            log "Development server is already running"
        else
            log "Starting development server..."
            npm run dev &
            DEV_SERVER_PID=$!
            
            # Wait for server to be ready
            local retries=0
            local max_retries=30
            
            while [ $retries -lt $max_retries ]; do
                if curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
                    success "Development server is ready"
                    break
                fi
                
                retries=$((retries + 1))
                log "Waiting for development server... ($retries/$max_retries)"
                sleep 2
            done
            
            if [ $retries -ge $max_retries ]; then
                error "Development server failed to start"
                exit 1
            fi
        fi
    elif [ "$TEST_ENV" = "docker" ]; then
        log "Starting Docker services..."
        docker-compose -f docker-compose.dev.yml up -d
        
        # Wait for services to be ready
        sleep 30
        
        # Check if services are healthy
        if ! curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
            error "Docker services failed to start properly"
            exit 1
        fi
        
        success "Docker services are ready"
    fi
}

# Run E2E tests
run_tests() {
    log "Running E2E tests..."
    
    # Set environment variables
    export PLAYWRIGHT_BASE_URL="http://localhost:3000"
    export PLAYWRIGHT_BROWSER="$BROWSER"
    export PLAYWRIGHT_HEADLESS="$HEADLESS"
    
    # Create test results directory
    mkdir -p test-results
    
    # Build test command
    local test_command="npx playwright test"
    
    # Add browser selection
    if [ "$BROWSER" != "all" ]; then
        test_command="$test_command --project=$BROWSER"
    fi
    
    # Add worker configuration
    test_command="$test_command --workers=$WORKERS"
    
    # Add retry configuration
    test_command="$test_command --retries=$RETRIES"
    
    # Add headless configuration
    if [ "$HEADLESS" = "false" ]; then
        test_command="$test_command --headed"
    fi
    
    # Add specific test patterns if provided
    if [ -n "$TEST_PATTERN" ]; then
        test_command="$test_command --grep=\"$TEST_PATTERN\""
    fi
    
    # Run the tests
    log "Executing: $test_command"
    
    if eval "$test_command"; then
        success "All E2E tests passed!"
        return 0
    else
        error "Some E2E tests failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    log "Generating test report..."
    
    # Generate HTML report
    if [ -f "test-results/e2e-results.json" ]; then
        npx playwright show-report --host=0.0.0.0 --port=9323 &
        REPORT_PID=$!
        
        log "Test report available at: http://localhost:9323"
        log "Report server PID: $REPORT_PID"
        
        # Save PID for cleanup
        echo "$REPORT_PID" > test-results/report-server.pid
    fi
    
    # Generate summary
    if [ -f "test-results/e2e-results.json" ]; then
        log "Test Summary:"
        node -e "
            const results = require('./test-results/e2e-results.json');
            const stats = results.stats || {};
            console.log('  Total Tests: ' + (stats.expected || 0));
            console.log('  Passed: ' + (stats.passed || 0));
            console.log('  Failed: ' + (stats.failed || 0));
            console.log('  Skipped: ' + (stats.skipped || 0));
            console.log('  Duration: ' + Math.round((stats.duration || 0) / 1000) + 's');
        " 2>/dev/null || log "Could not parse test results"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Stop development server if we started it
    if [ -n "$DEV_SERVER_PID" ]; then
        log "Stopping development server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi
    
    # Stop Docker services if we started them
    if [ "$TEST_ENV" = "docker" ]; then
        log "Stopping Docker services..."
        docker-compose -f docker-compose.dev.yml down
    fi
    
    # Stop report server if running
    if [ -f "test-results/report-server.pid" ]; then
        local report_pid=$(cat test-results/report-server.pid)
        kill $report_pid 2>/dev/null || true
        rm -f test-results/report-server.pid
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            TEST_ENV="$2"
            shift 2
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --headed)
            HEADLESS="false"
            shift
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --pattern)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --force-install)
            FORCE_BROWSER_INSTALL="true"
            shift
            ;;
        --report-only)
            REPORT_ONLY="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --env ENV           Test environment (development|docker) [default: development]"
            echo "  --browser BROWSER   Browser to use (chromium|firefox|webkit|all) [default: chromium]"
            echo "  --headed           Run tests in headed mode (visible browser)"
            echo "  --workers NUM      Number of parallel workers [default: 1]"
            echo "  --retries NUM      Number of retries for failed tests [default: 2]"
            echo "  --pattern PATTERN  Run tests matching pattern"
            echo "  --force-install    Force reinstall of Playwright browsers"
            echo "  --report-only      Only generate and show report from existing results"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests with defaults"
            echo "  $0 --browser firefox --headed        # Run in Firefox with visible browser"
            echo "  $0 --pattern \"bug submission\"        # Run only bug submission tests"
            echo "  $0 --env docker --workers 2          # Run with Docker environment, 2 workers"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "BugRelay E2E Test Configuration:"
    log "  Environment: $TEST_ENV"
    log "  Browser: $BROWSER"
    log "  Headless: $HEADLESS"
    log "  Workers: $WORKERS"
    log "  Retries: $RETRIES"
    
    if [ -n "$TEST_PATTERN" ]; then
        log "  Pattern: $TEST_PATTERN"
    fi
    
    echo ""
    
    if [ "$REPORT_ONLY" = "true" ]; then
        generate_report
        log "Report generated. Press Ctrl+C to exit."
        wait
        return 0
    fi
    
    check_prerequisites
    install_browsers
    start_services
    
    # Run tests and capture exit code
    if run_tests; then
        TEST_EXIT_CODE=0
        success "🎉 All E2E tests completed successfully!"
    else
        TEST_EXIT_CODE=1
        error "❌ Some E2E tests failed"
    fi
    
    generate_report
    
    # Show final results
    echo ""
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        success "✅ E2E Test Suite: PASSED"
    else
        error "❌ E2E Test Suite: FAILED"
    fi
    
    return $TEST_EXIT_CODE
}

# Run main function
main