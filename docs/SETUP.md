# Documentation Setup Guide

This guide explains how to set up and maintain the BugRelay backend documentation system.

## Prerequisites

- Node.js 18+ and npm
- Go 1.21+ (for analyzing the backend codebase)
- Git (for version control)

## Quick Start

1. **Install dependencies:**
   ```bash
   cd docs
   make install
   ```

2. **Generate documentation:**
   ```bash
   make generate
   ```

3. **Start development server:**
   ```bash
   make dev
   ```

4. **Build for production:**
   ```bash
   make build
   ```

## Directory Structure

```
docs/
├── api/                    # API documentation
│   ├── openapi.yaml       # Generated OpenAPI spec
│   ├── endpoints/         # Endpoint documentation
│   └── examples/          # Request/response examples
├── models/                # Data model documentation
│   ├── schema.json        # Generated JSON schemas
│   ├── data-models.md     # Human-readable docs
│   └── relationships.md   # Model relationships
├── authentication/        # Auth documentation
├── deployment/           # Setup and deployment guides
├── mcp/                  # MCP integration docs
│   ├── tools.json        # Generated MCP tools
│   ├── server.py         # MCP server implementation
│   └── schemas/          # MCP schemas
├── guides/               # Tutorials and guides
├── scripts/              # Generation scripts
├── .vitepress/           # VitePress configuration
└── .github/workflows/    # CI/CD pipeline
```

## Documentation Generation

### OpenAPI Specification

The OpenAPI specification is automatically generated from the Go backend codebase:

```bash
npm run generate:openapi
```

This script analyzes:
- Router definitions in `backend/internal/router/`
- Handler functions in `backend/internal/handlers/`
- Model structs in `backend/internal/models/`

### JSON Schemas

JSON Schema definitions are generated from Go model structs:

```bash
npm run generate:schemas
```

### MCP Documentation

Model Context Protocol documentation for AI integration:

```bash
npm run generate:mcp
```

## Validation

Validate all generated documentation:

```bash
npm run validate
```

This checks:
- OpenAPI specification compliance
- JSON Schema validity
- MCP tool definition format
- Documentation completeness

## Development Workflow

1. **Make changes to the backend code**
2. **Regenerate documentation:**
   ```bash
   make generate
   ```
3. **Validate changes:**
   ```bash
   make validate
   ```
4. **Preview locally:**
   ```bash
   make dev
   ```
5. **Commit and push** - CI/CD will automatically deploy

## CI/CD Pipeline

The documentation is automatically:
- Generated when backend code changes
- Validated for correctness
- Deployed to GitHub Pages (on main branch)

See `.github/workflows/docs.yml` for the complete pipeline.

## Customization

### Adding New Endpoints

When adding new API endpoints:
1. The OpenAPI generator will automatically detect them
2. Add manual documentation in `api/endpoints/` if needed
3. Include examples in `api/examples/`

### Adding New Models

When adding new data models:
1. The schema generator will automatically create JSON schemas
2. Add human-readable documentation in `models/data-models.md`
3. Update relationship documentation in `models/relationships.md`

### MCP Integration

To add new MCP tools:
1. Update `scripts/generate-mcp.js`
2. Add tool definitions to the tools array
3. Update the server implementation if needed

## Troubleshooting

### Generation Errors

If documentation generation fails:
1. Check that the backend code compiles
2. Verify Go module dependencies are up to date
3. Check script logs for specific errors

### Build Errors

If the documentation site fails to build:
1. Validate generated files: `npm run validate`
2. Check VitePress configuration in `.vitepress/config.js`
3. Verify all referenced files exist

### Missing Documentation

If endpoints or models are missing:
1. Check that they follow standard Go conventions
2. Verify they are exported (capitalized names)
3. Update generation scripts if needed

## Contributing

When contributing to the documentation:
1. Follow the existing structure and conventions
2. Test changes locally before committing
3. Update this guide if adding new features
4. Ensure all validation passes

## Support

For documentation issues:
- Check the troubleshooting section above
- Review the generation script logs
- Open an issue with specific error messages