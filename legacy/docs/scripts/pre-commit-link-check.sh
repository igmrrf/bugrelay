#!/bin/bash

# Pre-commit hook for link validation
# This script runs a quick link validation before commits

set -e

echo "🔗 Running pre-commit link validation..."

# Change to docs directory
cd "$(dirname "$0")/.."

# Check if we're in a git repository and have staged changes in docs
if git rev-parse --git-dir > /dev/null 2>&1; then
    # Check if there are any staged markdown files
    staged_md_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(md|markdown)$' || true)
    
    if [ -z "$staged_md_files" ]; then
        echo "ℹ️  No markdown files staged, skipping link validation"
        exit 0
    fi
    
    echo "📝 Found staged markdown files:"
    echo "$staged_md_files" | sed 's/^/  - /'
fi

# Run quick validation (skip external link checking for speed)
echo "🚀 Running link validation..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --silent
fi

# Generate required assets
echo "🔧 Generating documentation assets..."
npm run generate:all --silent

# Run link validation
if npm run validate:links --silent; then
    echo "✅ Link validation passed!"
    exit 0
else
    echo "❌ Link validation failed!"
    echo ""
    echo "💡 Tips to fix link issues:"
    echo "  - Check for typos in link paths"
    echo "  - Ensure referenced files exist"
    echo "  - Verify anchor links point to valid headings"
    echo "  - Run 'npm run validate:links' in docs/ for detailed report"
    echo ""
    echo "🔧 To skip this check (not recommended):"
    echo "  git commit --no-verify"
    exit 1
fi