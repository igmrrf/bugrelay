# Documentation Testing Guide

This document describes the comprehensive testing and validation system for the BugRelay backend documentation.

## Overview

The testing system ensures that all documentation is accurate, complete, and follows best practices. It includes multiple types of validation:

- **OpenAPI Specification Validation**: Ensures the API specification is valid and complete
- **Code Example Accuracy**: Tests that all code examples work correctly
- **Documentation Completeness**: Verifies all endpoints and models are documented
- **Link Validation**: Checks internal and external links
- **Performance Testing**: Monitors documentation build times and sizes

## Test Scripts

### Individual Test Scripts

- `npm run validate:openapi` - Validate OpenAPI specification
- `npm run validate:schemas` - Validate JSON schemas
- `npm run test:accuracy` - Test API accuracy against running backend
- `npm run test:examples` - Test code examples execution
- `npm run test:example-accuracy` - Enhanced code example validation
- `npm run check:completeness` - Check documentation completeness

### Comprehensive Testing

- `npm run test:comprehensive` - Run all tests in sequence
- `npm run test:all` - Alias for comprehensive testing

## Test Configuration

Tests can be configured via `test-config.json`:

```json
{
  "testConfiguration": {
    "apiBaseUrl": "http://localhost:8080",
    "timeout": 30000,
    "retries": 3
  },
  "validationRules": {
    "openapi": {
      "requireExamples": true,
      "requireDescriptions": true
    }
  }
}
```

## Running Tests Locally

### Prerequisites

1. **Node.js 18+** - For running test scripts
2. **Python 3.11+** - For Python example validation
3. **Backend Server** - For API accuracy tests (optional)

### Setup

```bash
cd docs
npm install
```

### Basic Validation (No Backend Required)

```bash
# Generate documentation first
npm run generate:all

# Run validation tests
npm run validate:openapi
npm run validate:schemas
npm run check:completeness
npm run test:example-accuracy
```

### Full Testing (Backend Required)

```bash
# Start the backend server first
cd ../backend
go run main.go

# In another terminal, run full tests
cd docs
npm run test:comprehensive
```

## Test Reports

All tests generate detailed JSON reports in the `test-reports/` directory:

- `openapi-validation.json` - OpenAPI validation results
- `example-accuracy.json` - Code example test results
- `api-accuracy.json` - API accuracy test results
- `comprehensive-test-report.json` - Combined results

## Continuous Integration

The testing system integrates with GitHub Actions:

### Workflow: `.github/workflows/documentation-tests.yml`

1. **Documentation Validation** - Runs without backend
2. **API Integration Tests** - Starts backend and runs full tests
3. **Documentation Build** - Builds final documentation site

### Environment Variables

- `API_BASE_URL` - Backend server URL (default: http://localhost:8080)
- `CI` - Set to true in CI environment

## Test Types Explained

### 1. OpenAPI Specification Validation

**Purpose**: Ensures the OpenAPI spec is valid and follows best practices

**Checks**:
- Valid YAML/JSON syntax
- Required fields present (info, paths, components)
- Proper response definitions
- Security scheme configuration
- Example completeness
- Consistent naming conventions

**Example**:
```bash
npm run validate:openapi
```

### 2. Code Example Accuracy Testing

**Purpose**: Validates that code examples are syntactically correct and executable

**Checks**:
- Syntax validation for JavaScript, Python, and curl
- JSON response format validation
- Error handling pattern detection
- Example completeness against OpenAPI spec

**Example**:
```bash
npm run test:example-accuracy
```

### 3. API Accuracy Testing

**Purpose**: Tests running backend against documentation

**Checks**:
- Endpoint availability
- Response schema validation
- Status code accuracy
- Authentication flows
- Error response formats

**Example**:
```bash
# Requires running backend
npm run test:accuracy
```

### 4. Documentation Completeness

**Purpose**: Ensures all code features are documented

**Checks**:
- All API endpoints documented
- All data models documented
- MCP tool definitions present
- Version synchronization
- Link validity

**Example**:
```bash
npm run check:completeness
```

## Writing New Tests

### Adding Test Cases

1. **Create test file** in `scripts/` directory
2. **Follow naming convention**: `test-[feature].js`
3. **Export test class** with standard interface
4. **Add to comprehensive suite**

### Test Class Interface

```javascript
class MyTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
  }

  async test() {
    // Run tests
    this.reportResults();
  }

  reportResults() {
    // Generate report
  }
}
```

### Integration with Comprehensive Suite

Add your tester to `test-comprehensive.js`:

```javascript
const MyTester = require('./test-my-feature');

// In ComprehensiveTestSuite class
async runMyTest() {
  const tester = new MyTester();
  await tester.test();
  // Handle results
}
```

## Troubleshooting

### Common Issues

1. **Backend Not Available**
   - API accuracy tests will be skipped
   - Check backend is running on correct port

2. **Python Not Found**
   - Python example tests will be skipped
   - Install Python 3.11+ or skip Python tests

3. **Timeout Errors**
   - Increase timeout in test-config.json
   - Check network connectivity

4. **Memory Issues**
   - Large documentation may cause memory issues
   - Increase Node.js memory limit: `--max-old-space-size=4096`

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true npm run test:comprehensive
```

### Selective Testing

Run specific test categories:

```bash
# Only validation tests
npm run validate

# Only example tests
npm run test:examples

# Only completeness check
npm run check:completeness
```

## Best Practices

### For Documentation Writers

1. **Always include examples** for new endpoints
2. **Test examples manually** before committing
3. **Update OpenAPI spec** when adding endpoints
4. **Run validation** before submitting PRs

### For Developers

1. **Run tests locally** before pushing
2. **Check CI results** for all PRs
3. **Fix warnings** when possible
4. **Update tests** when changing APIs

### For Maintainers

1. **Review test reports** regularly
2. **Update test thresholds** as needed
3. **Monitor performance** metrics
4. **Keep dependencies** updated

## Performance Monitoring

The testing system monitors:

- **Documentation generation time**
- **Documentation size**
- **Test execution time**
- **API response times**

Thresholds can be configured in `test-config.json`.

## Contributing

To contribute to the testing system:

1. **Follow existing patterns** for new tests
2. **Add comprehensive error handling**
3. **Include detailed reporting**
4. **Update this documentation**
5. **Test your changes** thoroughly

## Support

For issues with the testing system:

1. **Check this documentation** first
2. **Review test reports** for details
3. **Check CI logs** for failures
4. **Create issue** with reproduction steps