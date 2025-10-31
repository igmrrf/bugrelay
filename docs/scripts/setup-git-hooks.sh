#!/bin/bash

# Setup script for installing git hooks for link validation

set -e

echo "🔧 Setting up git hooks for link validation..."

# Find the git root directory
git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

if [ -z "$git_root" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

hooks_dir="$git_root/.git/hooks"
docs_dir="$(dirname "$0")/.."

# Create hooks directory if it doesn't exist
mkdir -p "$hooks_dir"

# Install pre-commit hook
pre_commit_hook="$hooks_dir/pre-commit"

echo "📝 Installing pre-commit hook..."

cat > "$pre_commit_hook" << 'EOF'
#!/bin/bash

# Git pre-commit hook that runs link validation for documentation changes

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if docs directory exists
if [ -d "$GIT_ROOT/docs" ]; then
    # Run the link validation script
    if [ -f "$GIT_ROOT/docs/scripts/pre-commit-link-check.sh" ]; then
        exec "$GIT_ROOT/docs/scripts/pre-commit-link-check.sh"
    else
        echo "⚠️  Link validation script not found, skipping check"
    fi
else
    echo "ℹ️  No docs directory found, skipping link validation"
fi

exit 0
EOF

# Make the hook executable
chmod +x "$pre_commit_hook"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "📋 What happens now:"
echo "  - Link validation will run automatically before each commit"
echo "  - Only runs when markdown files are staged for commit"
echo "  - Prevents commits with broken internal links"
echo "  - Can be bypassed with 'git commit --no-verify' if needed"
echo ""
echo "🧪 Test the hook:"
echo "  cd docs && npm run validate:links"
echo ""
echo "🔧 To uninstall:"
echo "  rm $pre_commit_hook"