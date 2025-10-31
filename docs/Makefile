# BugRelay Documentation Makefile

.PHONY: help install generate build dev clean validate

# Default target
help:
	@echo "BugRelay Documentation Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  install    - Install documentation dependencies"
	@echo "  generate   - Generate all documentation from codebase"
	@echo "  build      - Build the documentation website"
	@echo "  dev        - Start development server with hot reload"
	@echo "  validate   - Validate generated documentation"
	@echo "  clean      - Clean generated files and build artifacts"
	@echo "  help       - Show this help message"

# Install dependencies
install:
	@echo "Installing documentation dependencies..."
	npm install

# Generate all documentation
generate: generate-openapi generate-schemas generate-mcp
	@echo "All documentation generated successfully!"

# Generate OpenAPI specification
generate-openapi:
	@echo "Generating OpenAPI specification..."
	node scripts/generate-openapi.js

# Generate JSON schemas
generate-schemas:
	@echo "Generating JSON schemas..."
	node scripts/generate-schemas.js

# Generate MCP documentation
generate-mcp:
	@echo "Generating MCP documentation..."
	node scripts/generate-mcp.js

# Build documentation website
build: generate
	@echo "Building documentation website..."
	npm run build:site

# Start development server
dev:
	@echo "Starting development server..."
	npm run dev

# Validate documentation
validate:
	@echo "Validating documentation..."
	npm run validate

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -rf .vitepress/dist/
	rm -f api/openapi.yaml
	rm -f models/schema.json
	rm -f mcp/tools.json
	rm -rf node_modules/
	@echo "Clean complete!"

# Quick development setup
setup: install generate
	@echo "Documentation setup complete!"
	@echo "Run 'make dev' to start the development server"