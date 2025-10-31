# Documentation Maintenance System

This document describes the automated documentation maintenance system for the BugRelay backend API.

## Overview

The documentation maintenance system ensures that:
- API documentation stays synchronized with the codebase
- All endpoints and models are properly documented
- Code examples work correctly
- Versions are consistent across all documentation files
- Documentation quality remains high

## Components

### 1. CI/CD Pipeline (`.github/workflows/documentation.yml`)

Automatically runs on:
- Push to main/develop branches
- Pull requests affecting backend or docs
- Daily schedule (2 AM UTC)
- Manual trigger

**Workflow Steps:**
1. **Detect Changes** - Identifies what changed
2. **Validate Existing Docs** - Checks current documentation quality
3. **Regenerate Docs** - Updates documentation from code changes
4. **Test Documentation** - Validates accuracy against running API
5. **Deploy Docs** - Publishes to GitHub Pages
6. **Notify on Failure** - Sends alerts if maintenance fails

### 2. Maintenance Scripts

#### Core Scripts

- **`maintenance.js`** - Main orchestrator script
- **`check-completeness.js`** - Ensures all endpoints/models are documented
- **`test-api-accuracy.js`** - Tests API against OpenAPI specification
- **`test-examples.js`** - Validates all code examples work
- **`sync-versions.js`** - Synchronizes versions across files
- **`validate-openapi.js`** - Validates OpenAPI specification
- **`validate-schemas.js`** - Validates JSON schemas

#### Generation Scripts

- **`generate-openapi.js`** - Generates OpenAPI spec from codebase
- **`generate-schemas.js`** - Creates JSON schemas from models
- **`generate-mcp.js`** - Builds MCP tool definitions

### 3. Configuration

**`maintenance.config.js`** contains settings for:
- Version synchronization sources and targets
- Required documentation files and endpoints
- Testing parameters and thresholds
- CI/CD integration settings
- Quality metrics and reporting

## Usage

### Local Development

```bash
# Install dependencies
make docs-setup

# Run full maintenance
make docs-maintenance

# Run specific checks
cd docs
npm run check:completeness
npm run sync:versions
npm run validate

# Test documentation accuracy (requires running API)
npm run test:accuracy
npm run test:examples
```

### Manual Maintenance

```bash
# Run maintenance with options
cd docs
node scripts/maintenance.js --verbose
node scripts/maintenance.js --skip-tests
node scripts/maintenance.js --force-regenerate
```

### CI/CD Integration

The system automatically runs in GitHub Actions. You can:

1. **Trigger manually** - Use "Run workflow" in GitHub Actions
2. **Force regeneration** - Set `force_regenerate` input to `true`
3. **Monitor results** - Check workflow logs and generated reports

## Quality Checks

### Completeness Checks

- ✅ All API endpoints documented in OpenAPI spec
- ✅ All Go models have corresponding JSON schemas
- ✅ Required documentation files exist
- ✅ MCP tools defined for major operations
- ✅ Code examples available for all languages

### Accuracy Tests

- ✅ API responses match OpenAPI specification
- ✅ All code examples execute successfully
- ✅ Request/response schemas validate correctly
- ✅ Authentication flows work as documented

### Version Synchronization

- ✅ Consistent versions across all files
- ✅ Changelog updated with new versions
- ✅ Git tags aligned with documentation versions

## Reports

The system generates detailed reports in `docs/test-reports/`:

- **`maintenance-report.json`** - Complete maintenance results
- **`maintenance-report.html`** - Human-readable HTML report
- **`api-accuracy.json`** - API testing results
- **`examples.json`** - Code examples testing results

## Configuration

### Environment Variables

```bash
# API testing
API_BASE_URL=http://localhost:8080

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# GitHub token (for automated commits)
GITHUB_TOKEN=ghp_...
```

### Quality Thresholds

Current thresholds (configurable in `maintenance.config.js`):
- Minimum documentation coverage: 90%
- Maximum allowed errors: 0
- Maximum allowed warnings: 5
- Maximum API response time: 2000ms

## Troubleshooting

### Common Issues

**Documentation validation fails:**
```bash
# Check OpenAPI spec
npm run validate:openapi

# Check JSON schemas
npm run validate:schemas
```

**API tests fail:**
```bash
# Ensure backend is running
make dev-backend

# Check API connectivity
curl http://localhost:8080/health

# Run tests with verbose output
API_BASE_URL=http://localhost:8080 node scripts/test-api-accuracy.js
```

**Code examples fail:**
```bash
# Check dependencies
npm list axios  # For JavaScript examples
python3 -c "import requests"  # For Python examples

# Test specific language
node scripts/test-examples.js
```

**Version synchronization issues:**
```bash
# Check current versions
node scripts/sync-versions.js

# Force version update
git tag v1.2.3
node scripts/sync-versions.js
```

### Debug Mode

Enable verbose logging:
```bash
node scripts/maintenance.js --verbose
```

### Manual Recovery

If automated maintenance fails:

1. **Check logs** in GitHub Actions or local output
2. **Run individual scripts** to isolate the issue
3. **Fix underlying problems** (missing docs, API changes, etc.)
4. **Re-run maintenance** to verify fixes

## Best Practices

### For Developers

1. **Update docs with code changes** - Don't rely solely on automation
2. **Test locally** before pushing - Run `make docs-maintenance`
3. **Review generated changes** - Check auto-generated documentation
4. **Keep examples current** - Update code examples when APIs change

### For Documentation

1. **Use consistent formatting** - Follow established patterns
2. **Include complete examples** - Provide working code samples
3. **Document error cases** - Include error responses and handling
4. **Keep versions synchronized** - Use the version sync tools

### For CI/CD

1. **Monitor workflow health** - Check for recurring failures
2. **Update dependencies** - Keep maintenance tools current
3. **Adjust thresholds** - Tune quality metrics as needed
4. **Review reports** - Analyze maintenance reports regularly

## Integration with Development Workflow

### Pre-commit Hooks

Consider adding documentation checks to pre-commit hooks:

```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: docs-completeness
        name: Check documentation completeness
        entry: cd docs && npm run check:completeness
        language: system
        pass_filenames: false
```

### Pull Request Checks

The CI/CD pipeline automatically:
- Validates documentation changes
- Tests API accuracy
- Creates update PRs when needed
- Blocks merges if critical checks fail

### Release Process

1. **Version bump** triggers documentation updates
2. **Changelog generation** includes documentation changes
3. **Tag creation** synchronizes versions across files
4. **Release deployment** publishes updated documentation

## Monitoring and Alerts

### Slack Notifications

Configure Slack webhook for alerts:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### Email Notifications

Enable email alerts in `maintenance.config.js`:
```javascript
notifications: {
  email: {
    enabled: true,
    recipients: ['dev-team@bugrelay.com']
  }
}
```

### Metrics Dashboard

Consider integrating with monitoring tools:
- Documentation coverage metrics
- API response time trends
- Maintenance success rates
- Error frequency analysis

## Future Enhancements

Planned improvements:
- [ ] Automated screenshot generation for UI documentation
- [ ] Integration with API versioning system
- [ ] Performance regression detection
- [ ] Multi-language documentation support
- [ ] Advanced diff analysis for documentation changes
- [ ] Integration with issue tracking for documentation bugs