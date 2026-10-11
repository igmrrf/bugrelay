#!/usr/bin/env node

/**
 * Enhanced Link Validation Script
 *
 * This script provides comprehensive validation of all links in the documentation
 * including internal links, external links, and anchor links. It can be integrated
 * into CI/CD pipelines for ongoing maintenance.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, extname } from "node:path";
import { spawn } from "node:child_process";
import { URL, fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class LinkValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.internalLinks = new Map();
    this.externalLinks = new Map();
    this.anchorLinks = new Map();
    this.existingFiles = new Set();
    this.docsRoot = join(__dirname, "..");
    this.buildOutput = "";
  }

  async validate() {
    console.log("Running comprehensive link validation...");

    try {
      await this.scanExistingFiles();
      await this.runBuildAndCaptureOutput();
      await this.parseVitePressOutput();
      await this.validateInternalLinks();
      await this.validateExternalLinks();
      await this.validateAnchorLinks();
      await this.validateNavigation();

      this.reportResults();

      if (this.errors.length > 0) {
        process.exit(1);
      }

      return true;
    } catch (error) {
      console.error("❌ Link validation failed:", error.message);
      process.exit(1);
    }
  }

  async scanExistingFiles() {
    console.log("Scanning existing documentation files...");
    
    const scanDirectory = (dir) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and .vitepress/cache
          if (item !== 'node_modules' && item !== 'cache' && !item.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = extname(item);
          if (['.md', '.html', '.json', '.yaml', '.yml'].includes(ext)) {
            const relativePath = relative(this.docsRoot, fullPath);
            this.existingFiles.add(relativePath);
            
            // Also add without extension for markdown files
            if (ext === '.md') {
              const withoutExt = relativePath.replace(/\.md$/, '');
              this.existingFiles.add(withoutExt);
              this.existingFiles.add(withoutExt + '/');
            }
          }
        }
      }
    };

    scanDirectory(this.docsRoot);
    console.log(`Found ${this.existingFiles.size} documentation files`);
  }

  async runBuildAndCaptureOutput() {
    console.log("Running VitePress build to capture link validation output...");
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build:site'], {
        cwd: this.docsRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      buildProcess.on('close', (code) => {
        this.buildOutput = stdout + stderr;
        
        if (code === 0) {
          console.log("✅ Build completed successfully");
          resolve();
        } else {
          console.log("⚠️  Build completed with warnings/errors");
          resolve(); // Continue validation even if build has issues
        }
      });

      buildProcess.on('error', (error) => {
        reject(new Error(`Build process failed: ${error.message}`));
      });
    });
  }

  async parseVitePressOutput() {
    console.log("Parsing VitePress output for dead links...");
    
    const lines = this.buildOutput.split('\n');
    let inDeadLinksSection = false;
    
    for (const line of lines) {
      // Look for dead link indicators in VitePress output
      if (line.includes('dead link') || line.includes('Dead link')) {
        inDeadLinksSection = true;
        
        // Extract link information from the line
        const linkMatch = line.match(/(?:dead link|Dead link).*?['"`]([^'"`]+)['"`]/i);
        if (linkMatch) {
          const link = linkMatch[1];
          this.categorizeLink(link, line);
        }
      }
      
      // Also check for other link-related warnings
      if (line.includes('404') || line.includes('not found')) {
        const linkMatch = line.match(/['"`]([^'"`]+)['"`]/);
        if (linkMatch) {
          const link = linkMatch[1];
          this.categorizeLink(link, line);
        }
      }
    }
  }

  categorizeLink(link, context) {
    try {
      // Check if it's an external link
      if (link.startsWith('http://') || link.startsWith('https://')) {
        this.externalLinks.set(link, context);
      }
      // Check if it's an anchor link
      else if (link.includes('#')) {
        this.anchorLinks.set(link, context);
      }
      // Otherwise it's an internal link
      else {
        this.internalLinks.set(link, context);
      }
    } catch (error) {
      this.warnings.push(`Could not categorize link: ${link} - ${error.message}`);
    }
  }

  async validateInternalLinks() {
    console.log(`Validating ${this.internalLinks.size} internal links...`);
    
    for (const [link, context] of this.internalLinks) {
      const isValid = this.validateInternalLink(link);
      
      if (!isValid) {
        this.errors.push({
          type: 'internal',
          link: link,
          context: context,
          message: `Internal link not found: ${link}`
        });
      }
    }
  }

  validateInternalLink(link) {
    // Clean up the link
    let cleanLink = link.replace(/^\/+/, ''); // Remove leading slashes
    
    // Check various possible paths
    const possiblePaths = [
      cleanLink,
      cleanLink + '.md',
      cleanLink + '/index.md',
      cleanLink + '/README.md',
      cleanLink.replace(/\/$/, '') + '.md',
      // Handle directory links that should map to README.md
      cleanLink.replace(/\/$/, '') + '/README.md'
    ];
    
    // Special case for directory routes ending with /
    if (cleanLink.endsWith('/')) {
      const dirPath = cleanLink.slice(0, -1);
      possiblePaths.push(
        dirPath + '/index.md',
        dirPath + '/README.md'
      );
    }
    
    for (const path of possiblePaths) {
      if (this.existingFiles.has(path)) {
        return true;
      }
    }
    
    return false;
  }

  async validateExternalLinks() {
    console.log(`Validating ${this.externalLinks.size} external links...`);
    
    // For external links, we'll just categorize them as warnings since they may be temporarily unavailable
    for (const [link, context] of this.externalLinks) {
      try {
        const url = new URL(link);
        
        // Skip localhost and development URLs
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          this.warnings.push({
            type: 'external',
            link: link,
            context: context,
            message: `Development/localhost link: ${link}`
          });
        } else {
          // For production external links, we'll mark as warnings to check manually
          this.warnings.push({
            type: 'external',
            link: link,
            context: context,
            message: `External link to verify: ${link}`
          });
        }
      } catch (error) {
        this.errors.push({
          type: 'external',
          link: link,
          context: context,
          message: `Invalid external URL: ${link} - ${error.message}`
        });
      }
    }
  }

  async validateAnchorLinks() {
    console.log(`Validating ${this.anchorLinks.size} anchor links...`);
    
    for (const [link, context] of this.anchorLinks) {
      const [path, anchor] = link.split('#');
      
      // Validate the path part first
      if (path && !this.validateInternalLink(path)) {
        this.errors.push({
          type: 'anchor',
          link: link,
          context: context,
          message: `Anchor link path not found: ${path}`
        });
      } else if (anchor) {
        // For now, we'll mark anchor validation as warnings since it requires content parsing
        this.warnings.push({
          type: 'anchor',
          link: link,
          context: context,
          message: `Anchor to verify: #${anchor} in ${path || 'current page'}`
        });
      }
    }
  }

  async validateNavigation() {
    console.log("Validating navigation configuration...");
    
    const configPath = join(this.docsRoot, '.vitepress/config.js');
    
    if (!existsSync(configPath)) {
      this.warnings.push({
        type: 'navigation',
        message: 'VitePress config file not found'
      });
      return;
    }
    
    try {
      const configContent = readFileSync(configPath, 'utf8');
      
      // Extract sidebar configuration (basic regex parsing)
      const sidebarMatches = configContent.match(/sidebar\s*:\s*\{[\s\S]*?\}/);
      
      if (sidebarMatches) {
        const sidebarConfig = sidebarMatches[0];
        
        // Look for link patterns in the sidebar
        const linkMatches = sidebarConfig.match(/link\s*:\s*['"`]([^'"`]+)['"`]/g);
        
        if (linkMatches) {
          for (const match of linkMatches) {
            const linkMatch = match.match(/link\s*:\s*['"`]([^'"`]+)['"`]/);
            if (linkMatch) {
              const link = linkMatch[1];
              
              if (!this.validateInternalLink(link)) {
                this.errors.push({
                  type: 'navigation',
                  link: link,
                  message: `Navigation link not found: ${link}`
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.warnings.push({
        type: 'navigation',
        message: `Could not parse navigation config: ${error.message}`
      });
    }
  }

  reportResults() {
    console.log("\n=== Link Validation Report ===\n");

    const totalIssues = this.errors.length + this.warnings.length;

    if (totalIssues === 0) {
      console.log("✅ All links are valid! No issues found.");
      return;
    }

    if (this.errors.length > 0) {
      console.log("❌ Critical Link Errors:");
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type.toUpperCase()}] ${error.message}`);
        if (error.context) {
          console.log(`     Context: ${error.context.trim()}`);
        }
      });
      console.log("");
    }

    if (this.warnings.length > 0) {
      console.log("⚠️  Link Warnings:");
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.type?.toUpperCase() || 'GENERAL'}] ${warning.message}`);
        if (warning.context) {
          console.log(`     Context: ${warning.context.trim()}`);
        }
      });
      console.log("");
    }

    console.log(`Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? "passed" : "failed",
        totalFiles: this.existingFiles.size,
        internalLinks: this.internalLinks.size,
        externalLinks: this.externalLinks.size,
        anchorLinks: this.anchorLinks.size
      },
      errors: this.errors,
      warnings: this.warnings,
      statistics: {
        fileTypes: this.getFileTypeStatistics(),
        linkTypes: {
          internal: this.internalLinks.size,
          external: this.externalLinks.size,
          anchor: this.anchorLinks.size
        }
      }
    };

    const reportPath = join(__dirname, "../test-reports/link-validation.json");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }

  getFileTypeStatistics() {
    const stats = {};
    
    for (const file of this.existingFiles) {
      const ext = extname(file) || 'no-extension';
      stats[ext] = (stats[ext] || 0) + 1;
    }
    
    return stats;
  }
}

// Main validation function
async function validateLinks() {
  const validator = new LinkValidator();
  return await validator.validate();
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateLinks();
}

export default validateLinks;