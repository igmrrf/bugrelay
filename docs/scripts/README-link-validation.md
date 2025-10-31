# Link Validation System

This directory contains scripts for comprehensive link validation in the BugRelay documentation.

## Overview

The link validation system ensures that all internal links, external links, and navigation references in the documentation are valid and functional. It integrates with the build process and can be used in CI/CD pipelines.

## Scripts

### `validate-links.js`
Main link validation script that:
- Scans all documentation files
- Runs VitePress build to capture dead link warnings
- Validates internal links against existing files
- Checks navigation configuration
- Generates detailed reports

**Usage:**
```bash
npm run validate:links
```

### `pre-commit-link-check.sh`
Pre-commit hook that runs link validation before commits:
- Only runs when markdown files are staged
- Provides quick feedback on link issues
- Can be bypassed with `--no-verify` if needed

### `setup-git-hooks.sh`
Setup script for installing git hooks:
```bash
npm run setup:hooks
```

## Integration

### Local Development

1. **Install git hooks:**
   ```bash
   npm run setup:hooks
   ```

2. **Manual validation:**
   ```bash
   npm run validate:links
   ```

3. **Full validation with build:**
   ```bash
   npm run validate
   ```

### CI/CD Pipeline

The system includes a GitHub Actions workflow (`.github/workflows/link-validation.yml`) that:
- Runs on pushes to main/develop branches
- Validates PRs affecting documentation
- Runs weekly scheduled checks
- Uploads validation reports as artifacts
- Comments on PRs with validation results

**Trigger manually:**
```bash
npm run ci:validate
```

## Configuration

### VitePress Dead Link Handling

The validation works alongside VitePress's `ignoreDeadLinks` configuration in `.vitepress/config.js`:

```javascript
ignoreDeadLinks: [
  // Development links
  /^http:\/\/localhost/,
  // Relative paths to root files
  /^\.\.\/.*CONTRIBUTE/,
  // Placeholder external links
  /example\.com/,
]
```

### Validation Categories

The script categorizes links into:

1. **Internal Links**: Links to other documentation pages
   - Must resolve to existing files
   - Supports `.md`, `index.md`, `README.md` patterns
   - Critical errors if broken

2. **External Links**: Links to external websites
   - Marked as warnings for manual verification
   - Localhost links identified separately
   - Not critical for build success

3. **Anchor Links**: Links with hash fragments
   - Path component validated like internal links
   - Anchor existence marked as warnings
   - Requires content parsing for full validation

4. **Navigation Links**: Links in VitePress sidebar
   - Must resolve to existing pages
   - Critical for user experience

## Reports

Validation generates detailed JSON reports in `test-reports/link-validation.json`:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "errors": 0,
    "warnings": 2,
    "status": "passed",
    "totalFiles": 168,
    "internalLinks": 0,
    "externalLinks": 5,
    "anchorLinks": 3
  },
  "errors": [],
  "warnings": [
    {
      "type": "external",
      "link": "https://example.com",
      "message": "External link to verify: https://example.com"
    }
  ],
  "statistics": {
    "fileTypes": {
      ".md": 145,
      ".json": 15,
      ".yaml": 8
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"Navigation link not found"**
   - Check VitePress config sidebar links
   - Ensure referenced files exist
   - Verify path formatting (leading/trailing slashes)

2. **"Internal link not found"**
   - Check file exists in docs directory
   - Verify correct file extension
   - Check for typos in path

3. **Build fails but validation passes**
   - VitePress may have stricter validation
   - Check build output for specific errors
   - Update `ignoreDeadLinks` configuration if needed

### Debugging

1. **Verbose output:**
   ```bash
   DEBUG=1 npm run validate:links
   ```

2. **Check build output:**
   ```bash
   npm run build:site 2>&1 | grep -i "dead\|404\|not found"
   ```

3. **Manual file check:**
   ```bash
   find docs -name "*.md" | grep -E "(missing-file|broken-link)"
   ```

## Best Practices

### Writing Documentation

1. **Use relative links:**
   ```markdown
   [Good](./other-page.md)
   [Avoid](/absolute/path)
   ```

2. **Link to existing files:**
   - Create placeholder files for future content
   - Use consistent naming conventions
   - Prefer `index.md` over `README.md` for directories

3. **Test links locally:**
   ```bash
   npm run validate:links
   ```

### Maintenance

1. **Regular validation:**
   - Weekly automated checks via GitHub Actions
   - Pre-commit hooks for immediate feedback
   - Manual checks before releases

2. **External link monitoring:**
   - Review warnings in validation reports
   - Update or remove broken external links
   - Consider using archive.org for historical links

3. **Configuration updates:**
   - Add new ignore patterns as needed
   - Update validation logic for new link types
   - Keep CI/CD workflows updated

## Contributing

When adding new validation features:

1. Update the `LinkValidator` class in `validate-links.js`
2. Add corresponding tests if applicable
3. Update this README with new functionality
4. Test with various link types and edge cases

For bug reports or feature requests, please create an issue in the main repository.