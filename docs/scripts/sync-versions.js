#!/usr/bin/env node

/**
 * Version Synchronization Script
 * 
 * This script ensures version consistency across all documentation files
 * and synchronizes with the backend version.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

class VersionSynchronizer {
  constructor() {
    this.backendPath = path.join(__dirname, '../../backend');
    this.docsPath = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
    this.changes = [];
  }

  async sync() {
    console.log('Synchronizing versions across documentation...');
    
    try {
      const versions = await this.detectVersions();
      const targetVersion = this.determineTargetVersion(versions);
      
      console.log(`Target version: ${targetVersion}`);
      
      await this.updateVersions(targetVersion);
      await this.updateChangelog(targetVersion);
      
      this.reportResults();
    } catch (error) {
      console.error('Version synchronization failed:', error.message);
      process.exit(1);
    }
  }

  async detectVersions() {
    console.log('Detecting current versions...');
    
    const versions = {};
    
    // Get version from package.json
    const packagePath = path.join(this.docsPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      versions.package = packageJson.version;
      console.log(`Package.json version: ${versions.package}`);
    }
    
    // Get version from OpenAPI spec
    const openApiPath = path.join(this.docsPath, 'api/openapi.yaml');
    if (fs.existsSync(openApiPath)) {
      const openApiContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = yaml.load(openApiContent);
      versions.openapi = spec.info?.version;
      console.log(`OpenAPI version: ${versions.openapi}`);
    }
    
    // Get version from git tags
    try {
      const gitVersion = execSync('git describe --tags --abbrev=0', { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..') 
      }).trim();
      versions.git = gitVersion.replace(/^v/, ''); // Remove 'v' prefix if present
      console.log(`Git tag version: ${versions.git}`);
    } catch (error) {
      console.log('No git tags found');
    }
    
    // Get version from backend (if available)
    try {
      const backendVersion = await this.getBackendVersion();
      if (backendVersion) {
        versions.backend = backendVersion;
        console.log(`Backend version: ${versions.backend}`);
      }
    } catch (error) {
      console.log('Could not detect backend version');
    }
    
    // Get version from changelog
    const changelogPath = path.join(this.docsPath, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const changelogContent = fs.readFileSync(changelogPath, 'utf8');
      const versionMatch = changelogContent.match(/##\s*\[?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        versions.changelog = versionMatch[1];
        console.log(`Changelog version: ${versions.changelog}`);
      }
    }
    
    return versions;
  }

  async getBackendVersion() {
    // Try to get version from main.go or version file
    const mainGoPath = path.join(this.backendPath, 'main.go');
    if (fs.existsSync(mainGoPath)) {
      const content = fs.readFileSync(mainGoPath, 'utf8');
      const versionMatch = content.match(/version\s*[:=]\s*["']([^"']+)["']/i);
      if (versionMatch) {
        return versionMatch[1];
      }
    }
    
    // Try to get from go.mod
    const goModPath = path.join(this.backendPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      const content = fs.readFileSync(goModPath, 'utf8');
      const moduleMatch = content.match(/module\s+([^\s]+)/);
      if (moduleMatch) {
        // Try to get version from git if it's a git module
        try {
          const gitVersion = execSync('git describe --tags --abbrev=0', { 
            encoding: 'utf8',
            cwd: this.backendPath 
          }).trim();
          return gitVersion.replace(/^v/, '');
        } catch (error) {
          // Fallback to default version
          return '1.0.0';
        }
      }
    }
    
    return null;
  }

  determineTargetVersion(versions) {
    const versionValues = Object.values(versions).filter(v => v);
    
    if (versionValues.length === 0) {
      return '1.0.0'; // Default version
    }
    
    // Check if all versions are the same
    const uniqueVersions = [...new Set(versionValues)];
    
    if (uniqueVersions.length === 1) {
      console.log('All versions are synchronized');
      return uniqueVersions[0];
    }
    
    console.log('Version mismatch detected:', versions);
    
    // Priority order: git > package > openapi > backend > changelog
    const priorityOrder = ['git', 'package', 'openapi', 'backend', 'changelog'];
    
    for (const source of priorityOrder) {
      if (versions[source]) {
        console.log(`Using version from ${source}: ${versions[source]}`);
        return versions[source];
      }
    }
    
    // Fallback to the highest version
    const sortedVersions = versionValues.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart; // Descending order
        }
      }
      
      return 0;
    });
    
    return sortedVersions[0];
  }

  async updateVersions(targetVersion) {
    console.log(`Updating all versions to ${targetVersion}...`);
    
    // Update package.json
    await this.updatePackageVersion(targetVersion);
    
    // Update OpenAPI spec
    await this.updateOpenAPIVersion(targetVersion);
    
    // Update MCP metadata
    await this.updateMCPVersion(targetVersion);
    
    // Update documentation site config
    await this.updateSiteConfig(targetVersion);
  }

  async updatePackageVersion(version) {
    const packagePath = path.join(this.docsPath, 'package.json');
    if (!fs.existsSync(packagePath)) {
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.version !== version) {
      packageJson.version = version;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      this.changes.push(`Updated package.json version to ${version}`);
      console.log(`✓ Updated package.json version`);
    }
  }

  async updateOpenAPIVersion(version) {
    const openApiPath = path.join(this.docsPath, 'api/openapi.yaml');
    if (!fs.existsSync(openApiPath)) {
      return;
    }
    
    const content = fs.readFileSync(openApiPath, 'utf8');
    const spec = yaml.load(content);
    
    if (!spec.info) {
      spec.info = {};
    }
    
    if (spec.info.version !== version) {
      spec.info.version = version;
      
      const updatedContent = yaml.dump(spec, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      
      fs.writeFileSync(openApiPath, updatedContent);
      this.changes.push(`Updated OpenAPI specification version to ${version}`);
      console.log(`✓ Updated OpenAPI specification version`);
    }
  }

  async updateMCPVersion(version) {
    const mcpMetadataPath = path.join(this.docsPath, 'mcp/metadata.json');
    if (!fs.existsSync(mcpMetadataPath)) {
      return;
    }
    
    const metadata = JSON.parse(fs.readFileSync(mcpMetadataPath, 'utf8'));
    
    if (metadata.version !== version) {
      metadata.version = version;
      fs.writeFileSync(mcpMetadataPath, JSON.stringify(metadata, null, 2) + '\n');
      this.changes.push(`Updated MCP metadata version to ${version}`);
      console.log(`✓ Updated MCP metadata version`);
    }
  }

  async updateSiteConfig(version) {
    const configPath = path.join(this.docsPath, '.vitepress/config.js');
    if (!fs.existsSync(configPath)) {
      return;
    }
    
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update version in config
    const versionRegex = /version:\s*['"]([^'"]+)['"]/;
    const match = content.match(versionRegex);
    
    if (match && match[1] !== version) {
      content = content.replace(versionRegex, `version: '${version}'`);
      fs.writeFileSync(configPath, content);
      this.changes.push(`Updated VitePress config version to ${version}`);
      console.log(`✓ Updated VitePress config version`);
    }
  }

  async updateChangelog(version) {
    const changelogPath = path.join(this.docsPath, 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
      // Create new changelog
      const changelogContent = this.generateChangelog(version);
      fs.writeFileSync(changelogPath, changelogContent);
      this.changes.push(`Created CHANGELOG.md with version ${version}`);
      console.log(`✓ Created CHANGELOG.md`);
      return;
    }
    
    const content = fs.readFileSync(changelogPath, 'utf8');
    
    // Check if version already exists in changelog
    if (content.includes(`## [${version}]`) || content.includes(`## ${version}`)) {
      console.log(`✓ Version ${version} already in changelog`);
      return;
    }
    
    // Add new version entry
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `## [${version}] - ${today}\n\n### Changed\n- Updated documentation to version ${version}\n- Synchronized versions across all documentation files\n\n`;
    
    // Insert after the first heading
    const lines = content.split('\n');
    const insertIndex = lines.findIndex(line => line.startsWith('## '));
    
    if (insertIndex > 0) {
      lines.splice(insertIndex, 0, newEntry);
      fs.writeFileSync(changelogPath, lines.join('\n'));
      this.changes.push(`Added version ${version} to CHANGELOG.md`);
      console.log(`✓ Updated CHANGELOG.md`);
    }
  }

  generateChangelog(version) {
    const today = new Date().toISOString().split('T')[0];
    
    return `# Changelog

All notable changes to the BugRelay documentation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${version}] - ${today}

### Added
- Initial documentation release
- OpenAPI specification
- API endpoint documentation
- Authentication guides
- Data model documentation
- Code examples
- MCP tool definitions

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
`;
  }

  reportResults() {
    console.log('\n=== Version Synchronization Report ===\n');
    
    if (this.changes.length === 0) {
      console.log('✅ All versions are already synchronized!');
      return;
    }
    
    console.log('Changes made:');
    this.changes.forEach(change => console.log(`  ✓ ${change}`));
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    }
    
    console.log('\n✅ Version synchronization completed successfully!');
  }
}

// Run the synchronizer
if (require.main === module) {
  const synchronizer = new VersionSynchronizer();
  synchronizer.sync().catch(console.error);
}

module.exports = VersionSynchronizer;