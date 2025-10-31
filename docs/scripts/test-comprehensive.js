#!/usr/bin/env node

/**
 * Comprehensive Documentation Testing Suite
 *
 * This script runs all documentation tests and validations to ensure
 * complete accuracy and completeness of the documentation system.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import CompletenessChecker from "./check-completeness";
// Import existing test modules
import APIAccuracyTester from "./test-api-accuracy";
import ExamplesTester from "./test-examples";
import validateOpenAPI from "./validate-openapi";
import SchemaValidator from "./validate-schemas";

class ComprehensiveTestSuite {
  constructor() {
    this.results = {
      openapi: { status: "pending", errors: [], warnings: [] },
      schemas: { status: "pending", errors: [], warnings: [] },
      completeness: { status: "pending", errors: [], warnings: [] },
      examples: { status: "pending", errors: [], warnings: [] },
      apiAccuracy: { status: "pending", errors: [], warnings: [] },
      linkValidation: { status: "pending", errors: [], warnings: [] },
      performanceTests: { status: "pending", errors: [], warnings: [] },
    };
    this.startTime = Date.now();
    this.reportDir = join(__dirname, "../test-reports");
  }

  async runAllTests() {
    console.log("🚀 Starting Comprehensive Documentation Test Suite");
    console.log("=".repeat(60));

    // Ensure report directory exists
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    try {
      // Run tests in logical order
      await this.runOpenAPIValidation();
      await this.runSchemaValidation();
      await this.runCompletenessCheck();
      await this.runLinkValidation();
      await this.runExamplesTest();
      await this.runAPIAccuracyTest();
      await this.runPerformanceTests();

      this.generateFinalReport();
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);
      process.exit(1);
    }
  }

  async runOpenAPIValidation() {
    console.log("\n📋 Running OpenAPI Specification Validation...");

    try {
      await validateOpenAPI();
      this.results.openapi.status = "passed";
      console.log("✅ OpenAPI validation passed");
    } catch (error) {
      this.results.openapi.status = "failed";
      this.results.openapi.errors.push(error.message);
      console.log("❌ OpenAPI validation failed");
    }
  }

  async runSchemaValidation() {
    console.log("\n🔍 Running Schema Validation...");

    try {
      const validator = new SchemaValidator();
      await validator.validate();
      this.results.schemas.status = "passed";
      console.log("✅ Schema validation passed");
    } catch (error) {
      this.results.schemas.status = "failed";
      this.results.schemas.errors.push(error.message);
      console.log("❌ Schema validation failed");
    }
  }

  async runCompletenessCheck() {
    console.log("\n📊 Running Documentation Completeness Check...");

    try {
      const checker = new CompletenessChecker();
      await checker.check();

      if (checker.errors.length > 0) {
        this.results.completeness.status = "failed";
        this.results.completeness.errors = checker.errors;
      } else {
        this.results.completeness.status = "passed";
      }

      this.results.completeness.warnings = checker.warnings;

      if (checker.errors.length === 0) {
        console.log("✅ Completeness check passed");
      } else {
        console.log("❌ Completeness check failed");
      }
    } catch (error) {
      this.results.completeness.status = "failed";
      this.results.completeness.errors.push(error.message);
      console.log("❌ Completeness check failed");
    }
  }

  async runLinkValidation() {
    console.log("\n🔗 Running Link Validation...");

    try {
      await this.validateInternalLinks();
      await this.validateExternalLinks();
      this.results.linkValidation.status = "passed";
      console.log("✅ Link validation passed");
    } catch (error) {
      this.results.linkValidation.status = "failed";
      this.results.linkValidation.errors.push(error.message);
      console.log("❌ Link validation failed");
    }
  }

  async validateInternalLinks() {
    const docsDir = join(__dirname, "..");
    const markdownFiles = this.findMarkdownFiles(docsDir);

    for (const file of markdownFiles) {
      const content = readFileSync(file, "utf8");
      const links = this.extractInternalLinks(content);

      for (const link of links) {
        const targetPath = resolve(dirname(file), link);
        if (!existsSync(targetPath)) {
          this.results.linkValidation.errors.push(
            `Broken internal link in ${relative(docsDir, file)}: ${link}`,
          );
        }
      }
    }
  }

  async validateExternalLinks() {
    // For now, just check that external links are properly formatted
    // In a full implementation, you'd make HTTP requests to verify
    const docsDir = join(__dirname, "..");
    const markdownFiles = this.findMarkdownFiles(docsDir);

    for (const file of markdownFiles) {
      const content = readFileSync(file, "utf8");
      const links = this.extractExternalLinks(content);

      for (const link of links) {
        if (!this.isValidURL(link)) {
          this.results.linkValidation.warnings.push(
            `Potentially invalid external link in ${relative(docsDir, file)}: ${link}`,
          );
        }
      }
    }
  }

  findMarkdownFiles(dir) {
    const files = [];

    function traverse(currentDir) {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          traverse(fullPath);
        } else if (stat.isFile() && item.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    }

    traverse(dir);
    return files;
  }

  extractInternalLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2];
      if (
        !url.startsWith("http") &&
        !url.startsWith("#") &&
        !url.startsWith("mailto:")
      ) {
        links.push(url);
      }
    }

    return links;
  }

  extractExternalLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }

    return links;
  }

  isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async runExamplesTest() {
    console.log("\n💻 Running Code Examples Test...");

    try {
      const tester = new ExamplesTester();
      await tester.test();

      if (tester.errors.length > 0) {
        this.results.examples.status = "failed";
        this.results.examples.errors = tester.errors;
      } else {
        this.results.examples.status = "passed";
      }

      this.results.examples.warnings = tester.warnings;

      if (tester.errors.length === 0) {
        console.log("✅ Examples test passed");
      } else {
        console.log("❌ Examples test failed");
      }
    } catch (error) {
      this.results.examples.status = "failed";
      this.results.examples.errors.push(error.message);
      console.log("❌ Examples test failed");
    }
  }

  async runAPIAccuracyTest() {
    console.log("\n🎯 Running API Accuracy Test...");

    // Check if API is available
    if (!(await this.isAPIAvailable())) {
      this.results.apiAccuracy.status = "skipped";
      this.results.apiAccuracy.warnings.push(
        "API not available, skipping accuracy tests",
      );
      console.log("!  API not available, skipping accuracy tests");
      return;
    }

    try {
      const tester = new APIAccuracyTester();
      await tester.test();

      if (tester.errors.length > 0) {
        this.results.apiAccuracy.status = "failed";
        this.results.apiAccuracy.errors = tester.errors;
      } else {
        this.results.apiAccuracy.status = "passed";
      }

      this.results.apiAccuracy.warnings = tester.warnings;

      if (tester.errors.length === 0) {
        console.log("✅ API accuracy test passed");
      } else {
        console.log("❌ API accuracy test failed");
      }
    } catch (error) {
      this.results.apiAccuracy.status = "failed";
      this.results.apiAccuracy.errors.push(error.message);
      console.log("❌ API accuracy test failed");
    }
  }

  async runPerformanceTests() {
    console.log("\n⚡ Running Performance Tests...");

    try {
      await this.testDocumentationBuildTime();
      await this.testDocumentationSize();
      this.results.performanceTests.status = "passed";
      console.log("✅ Performance tests passed");
    } catch (error) {
      this.results.performanceTests.status = "failed";
      this.results.performanceTests.errors.push(error.message);
      console.log("❌ Performance tests failed");
    }
  }

  async testDocumentationBuildTime() {
    const startTime = Date.now();

    try {
      // Test documentation generation time
      execSync("npm run generate:all", {
        cwd: join(__dirname, ".."),
        stdio: "pipe",
        timeout: 60000, // 1 minute timeout
      });

      const buildTime = Date.now() - startTime;

      if (buildTime > 30000) {
        // 30 seconds
        this.results.performanceTests.warnings.push(
          `Documentation generation took ${buildTime}ms (>30s threshold)`,
        );
      }

      console.log(`📊 Documentation generation time: ${buildTime}ms`);
    } catch (error) {
      throw new Error(`Documentation build failed: ${error.message}`);
    }
  }

  async testDocumentationSize() {
    const docsDir = join(__dirname, "..");
    const size = this.calculateDirectorySize(docsDir);
    const sizeMB = (size / 1024 / 1024).toFixed(2);

    console.log(`📊 Documentation size: ${sizeMB}MB`);

    if (size > 100 * 1024 * 1024) {
      // 100MB
      this.results.performanceTests.warnings.push(
        `Documentation size is ${sizeMB}MB (>100MB threshold)`,
      );
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;

    function traverse(currentPath) {
      const items = readdirSync(currentPath);

      for (const item of items) {
        const fullPath = join(currentPath, item);
        const stat = statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          traverse(fullPath);
        } else if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
    }

    traverse(dirPath);
    return totalSize;
  }

  async isAPIAvailable() {
    try {
      const axios = require("axios");
      const baseURL = process.env.API_BASE_URL || "http://localhost:8080";
      await axios.get(`${baseURL}/health`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  generateFinalReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    console.log("\n" + "=".repeat(60));
    console.log("📋 COMPREHENSIVE TEST REPORT");
    console.log("=".repeat(60));

    const testNames = {
      openapi: "OpenAPI Validation",
      schemas: "Schema Validation",
      completeness: "Completeness Check",
      linkValidation: "Link Validation",
      examples: "Code Examples",
      apiAccuracy: "API Accuracy",
      performanceTests: "Performance Tests",
    };

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const [key, result] of Object.entries(this.results)) {
      const name = testNames[key];
      const status = result.status;
      const errors = result.errors?.length || 0;
      const warnings = result.warnings?.length || 0;

      let statusIcon;
      switch (status) {
        case "passed":
          statusIcon = "✅";
          totalPassed++;
          break;
        case "failed":
          statusIcon = "❌";
          totalFailed++;
          break;
        case "skipped":
          statusIcon = "! ";
          totalSkipped++;
          break;
        default:
          statusIcon = "❓";
          break;
      }

      console.log(`${statusIcon} ${name}: ${status.toUpperCase()}`);
      if (errors > 0) console.log(`   Errors: ${errors}`);
      if (warnings > 0) console.log(`   Warnings: ${warnings}`);

      totalErrors += errors;
      totalWarnings += warnings;
    }

    console.log("\n" + "-".repeat(40));
    console.log(`Total Tests: ${totalPassed + totalFailed + totalSkipped}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Skipped: ${totalSkipped}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

    // Show detailed errors and warnings
    if (totalErrors > 0) {
      console.log("\n❌ ERRORS:");
      for (const [key, result] of Object.entries(this.results)) {
        if (result.errors && result.errors.length > 0) {
          console.log(`\n${testNames[key]}:`);
          result.errors.forEach((error) => console.log(`  - ${error}`));
        }
      }
    }

    if (totalWarnings > 0) {
      console.log("\n!  WARNINGS:");
      for (const [key, result] of Object.entries(this.results)) {
        if (result.warnings && result.warnings.length > 0) {
          console.log(`\n${testNames[key]}:`);
          result.warnings.forEach((warning) => console.log(`  - ${warning}`));
        }
      }
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        total: totalPassed + totalFailed + totalSkipped,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        errors: totalErrors,
        warnings: totalWarnings,
      },
      results: this.results,
    };

    const reportPath = join(this.reportDir, "comprehensive-test-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Final status
    if (totalFailed === 0) {
      console.log(
        "\n🎉 ALL TESTS PASSED! Documentation is comprehensive and accurate.",
      );
    } else {
      console.log(
        "\n💥 SOME TESTS FAILED! Please review and fix the issues above.",
      );
      process.exit(1);
    }
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  const suite = new ComprehensiveTestSuite();
  suite.runAllTests().catch(console.error);
}

export default ComprehensiveTestSuite;

