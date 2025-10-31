#!/usr/bin/env node

/**
 * Documentation Maintenance Orchestrator
 *
 * This script orchestrates all automated documentation maintenance tasks.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import config from "../maintenance.config.js";

// Import maintenance modules
import CompletenessChecker from "./check-completeness.js";
import VersionSynchronizer from "./sync-versions.js";
import APIAccuracyTester from "./test-api-accuracy.js";
import ExamplesTester from "./test-examples.js";
import validateOpenAPI from "./validate-openapi.js";
import SchemaValidator from "./validate-schemas.js";

class DocumentationMaintenance {
  constructor(options = {}) {
    this.config = config;
    this.options = {
      skipTests: options.skipTests || false,
      forceRegenerate: options.forceRegenerate || false,
      verbose: options.verbose || false,
      ...options,
    };

    this.results = {
      completeness: null,
      validation: null,
      versionSync: null,
      apiTesting: null,
      examplesTesting: null,
      overall: "pending",
    };

    this.startTime = Date.now();
  }

  async run() {
    console.log("🚀 Starting documentation maintenance...");
    console.log(`Configuration: ${JSON.stringify(this.options, null, 2)}\n`);

    try {
      // Phase 1: Check completeness
      await this.checkCompleteness();

      // Phase 2: Validate existing documentation
      await this.validateDocumentation();

      // Phase 3: Synchronize versions
      await this.synchronizeVersions();

      // Phase 4: Test API accuracy (if not skipped)
      if (!this.options.skipTests) {
        await this.testAPIAccuracy();
        await this.testExamples();
      }

      // Phase 5: Generate reports
      await this.generateReports();

      // Phase 6: Determine overall result
      this.determineOverallResult();

      console.log("\n✅ Documentation maintenance completed successfully!");
    } catch (error) {
      console.error("\n❌ Documentation maintenance failed:", error.message);
      this.results.overall = "failed";

      if (this.options.verbose) {
        console.error(error.stack);
      }

      await this.generateReports();
      process.exit(1);
    }
  }

  async checkCompleteness() {
    console.log("📋 Phase 1: Checking documentation completeness...");

    try {
      const checker = new CompletenessChecker();
      await checker.check();

      this.results.completeness = {
        status: "passed",
        errors: checker.errors.length,
        warnings: checker.warnings.length,
        details: {
          errors: checker.errors,
          warnings: checker.warnings,
        },
      };

      console.log(
        `✅ Completeness check passed (${checker.errors.length} errors, ${checker.warnings.length} warnings)`,
      );
    } catch (error) {
      this.results.completeness = {
        status: "failed",
        error: error.message,
      };

      console.log(`❌ Completeness check failed: ${error.message}`);
      throw error;
    }
  }

  async validateDocumentation() {
    console.log("🔍 Phase 2: Validating documentation...");

    try {
      // Validate OpenAPI specification
      await validateOpenAPI();

      // Validate JSON schemas
      const schemaValidator = new SchemaValidator();
      await schemaValidator.validate();

      this.results.validation = {
        status: "passed",
        openapi: "valid",
        schemas: "valid",
      };

      console.log("✅ Documentation validation passed");
    } catch (error) {
      this.results.validation = {
        status: "failed",
        error: error.message,
      };

      console.log(`❌ Documentation validation failed: ${error.message}`);
      throw error;
    }
  }

  async synchronizeVersions() {
    console.log("🔄 Phase 3: Synchronizing versions...");

    try {
      const synchronizer = new VersionSynchronizer();
      await synchronizer.sync();

      this.results.versionSync = {
        status: "passed",
        changes: synchronizer.changes.length,
        details: synchronizer.changes,
      };

      console.log(
        `✅ Version synchronization completed (${synchronizer.changes.length} changes)`,
      );
    } catch (error) {
      this.results.versionSync = {
        status: "failed",
        error: error.message,
      };

      console.log(`❌ Version synchronization failed: ${error.message}`);
      throw error;
    }
  }

  async testAPIAccuracy() {
    console.log("🧪 Phase 4a: Testing API accuracy...");

    try {
      const tester = new APIAccuracyTester();
      await tester.test();

      const passed = tester.testResults.filter(
        (r) => r.status === "passed",
      ).length;
      const failed = tester.testResults.filter(
        (r) => r.status === "failed",
      ).length;

      this.results.apiTesting = {
        status:
          failed === 0 && tester.errors.length === 0 ? "passed" : "failed",
        total: tester.testResults.length,
        passed,
        failed,
        errors: tester.errors.length,
        warnings: tester.warnings.length,
        details: {
          results: tester.testResults,
          errors: tester.errors,
          warnings: tester.warnings,
        },
      };

      if (this.results.apiTesting.status === "passed") {
        console.log(
          `✅ API accuracy testing passed (${passed}/${tester.testResults.length} tests)`,
        );
      } else {
        console.log(
          `❌ API accuracy testing failed (${failed} failed, ${tester.errors.length} errors)`,
        );
      }
    } catch (error) {
      this.results.apiTesting = {
        status: "failed",
        error: error.message,
      };

      console.log(`❌ API accuracy testing failed: ${error.message}`);

      // Don't throw here - continue with other tests
    }
  }

  async testExamples() {
    console.log("📝 Phase 4b: Testing code examples...");

    try {
      const tester = new ExamplesTester();
      await tester.test();

      const passed = tester.testResults.filter(
        (r) => r.status === "passed",
      ).length;
      const failed = tester.testResults.filter(
        (r) => r.status === "failed",
      ).length;

      this.results.examplesTesting = {
        status:
          failed === 0 && tester.errors.length === 0 ? "passed" : "failed",
        total: tester.testResults.length,
        passed,
        failed,
        errors: tester.errors.length,
        warnings: tester.warnings.length,
        details: {
          results: tester.testResults,
          errors: tester.errors,
          warnings: tester.warnings,
        },
      };

      if (this.results.examplesTesting.status === "passed") {
        console.log(
          `✅ Examples testing passed (${passed}/${tester.testResults.length} tests)`,
        );
      } else {
        console.log(
          `❌ Examples testing failed (${failed} failed, ${tester.errors.length} errors)`,
        );
      }
    } catch (error) {
      this.results.examplesTesting = {
        status: "failed",
        error: error.message,
      };

      console.log(`❌ Examples testing failed: ${error.message}`);

      // Don't throw here - continue with report generation
    }
  }

  async generateReports() {
    console.log("📊 Phase 5: Generating reports...");

    const reportDir = join(__dirname, "..", this.config.reporting.outputDir);
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      config: this.options,
      results: this.results,
      summary: this.generateSummary(),
    };

    // Generate JSON report
    const jsonReportPath = join(reportDir, "maintenance-report.json");
    writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    if (this.config.reporting.formats.includes("html")) {
      const htmlReportPath = join(reportDir, "maintenance-report.html");
      const htmlContent = this.generateHTMLReport(report);
      writeFileSync(htmlReportPath, htmlContent);
    }

    console.log(`📊 Reports generated in ${reportDir}`);
  }

  generateSummary() {
    const summary = {
      overall: this.results.overall,
      phases: {
        completeness: this.results.completeness?.status || "skipped",
        validation: this.results.validation?.status || "skipped",
        versionSync: this.results.versionSync?.status || "skipped",
        apiTesting: this.results.apiTesting?.status || "skipped",
        examplesTesting: this.results.examplesTesting?.status || "skipped",
      },
      metrics: {
        totalErrors: 0,
        totalWarnings: 0,
        totalTests: 0,
        passedTests: 0,
      },
    };

    // Calculate metrics
    Object.values(this.results).forEach((result) => {
      if (result && typeof result === "object") {
        summary.metrics.totalErrors += result.errors || 0;
        summary.metrics.totalWarnings += result.warnings || 0;
        summary.metrics.totalTests += result.total || 0;
        summary.metrics.passedTests += result.passed || 0;
      }
    });

    return summary;
  }

  generateHTMLReport(report) {
    const summary = report.summary;
    const statusIcon = summary.overall === "passed" ? "✅" : "❌";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Maintenance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-skipped { color: #6c757d; }
        .phase { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .details { background: #f8f9fa; padding: 10px; border-radius: 3px; margin-top: 10px; }
        pre { background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${statusIcon} Documentation Maintenance Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Duration:</strong> ${Math.round(report.duration / 1000)}s</p>
        <p><strong>Overall Status:</strong> <span class="status-${summary.overall}">${summary.overall.toUpperCase()}</span></p>
    </div>

    <h2>Summary</h2>
    <div class="metrics">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${summary.metrics.totalTests}</p>
        </div>
        <div class="metric">
            <h3>Passed Tests</h3>
            <p>${summary.metrics.passedTests}</p>
        </div>
        <div class="metric">
            <h3>Total Errors</h3>
            <p>${summary.metrics.totalErrors}</p>
        </div>
        <div class="metric">
            <h3>Total Warnings</h3>
            <p>${summary.metrics.totalWarnings}</p>
        </div>
    </div>

    <h2>Phase Results</h2>
    ${Object.entries(summary.phases)
      .map(
        ([phase, status]) => `
        <div class="phase">
            <h3><span class="status-${status}">${status.toUpperCase()}</span> ${phase.charAt(0).toUpperCase() + phase.slice(1)}</h3>
            ${
              report.results[phase]
                ? `
                <div class="details">
                    <pre>${JSON.stringify(report.results[phase], null, 2)}</pre>
                </div>
            `
                : ""
            }
        </div>
    `,
      )
      .join("")}

    <h2>Configuration</h2>
    <div class="details">
        <pre>${JSON.stringify(report.config, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  determineOverallResult() {
    const criticalPhases = ["completeness", "validation"];
    const testingPhases = ["apiTesting", "examplesTesting"];

    // Check critical phases
    for (const phase of criticalPhases) {
      if (this.results[phase]?.status === "failed") {
        this.results.overall = "failed";
        return;
      }
    }

    // Check testing phases (if not skipped)
    if (!this.options.skipTests) {
      for (const phase of testingPhases) {
        if (this.results[phase]?.status === "failed") {
          // Testing failures are warnings, not critical failures
          if (this.results.overall !== "failed") {
            this.results.overall = "warning";
          }
        }
      }
    }

    // If no failures, mark as passed
    if (this.results.overall === "pending") {
      this.results.overall = "passed";
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--skip-tests":
        options.skipTests = true;
        break;
      case "--force-regenerate":
        options.forceRegenerate = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
        console.log(`
Documentation Maintenance Tool

Usage: node maintenance.js [options]

Options:
  --skip-tests        Skip API and examples testing
  --force-regenerate  Force regeneration of all documentation
  --verbose           Enable verbose output
  --help              Show this help message

Examples:
  node maintenance.js                    # Run full maintenance
  node maintenance.js --skip-tests       # Skip testing phases
  node maintenance.js --verbose          # Enable verbose logging
        `);
        process.exit(0);
        break;
    }
  }

  const maintenance = new DocumentationMaintenance(options);
  maintenance.run().catch(console.error);
}

export default DocumentationMaintenance;

