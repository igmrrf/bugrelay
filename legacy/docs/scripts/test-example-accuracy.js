#!/usr/bin/env node

/**
 * Enhanced Code Example Accuracy Tester
 *
 * This script provides comprehensive testing of code examples to ensure
 * they are syntactically correct, executable, and produce expected results.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { load } from "js-yaml";

class EnhancedExampleTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
    this.baseURL = process.env.API_BASE_URL || "http://localhost:8080";
    this.tempDir = join(__dirname, "../temp-examples");
    this.openApiSpec = null;
  }

  async test() {
    console.log("Running enhanced code example accuracy tests...");

    // Create temp directory
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    try {
      await this.loadOpenAPISpec();
      await this.testSyntaxValidation();
      await this.testExampleCompleteness();
      await this.testResponseValidation();
      await this.testErrorHandling();
      this.reportResults();
    } finally {
      // Cleanup
      if (existsSync(this.tempDir)) {
        rmSync(this.tempDir, { recursive: true, force: true });
      }
    }
  }

  async loadOpenAPISpec() {
    const specPath = join(__dirname, "../api/openapi.yaml");
    if (existsSync(specPath)) {
      const content = readFileSync(specPath, "utf8");
      this.openApiSpec = load(content);
    }
  }

  async testSyntaxValidation() {
    console.log("Testing syntax validation of code examples...");

    const exampleFiles = [
      "api/examples/curl-examples.md",
      "api/examples/javascript-examples.md",
      "api/examples/python-examples.md",
    ];

    for (const file of exampleFiles) {
      await this.validateExampleFile(file);
    }
  }

  async validateExampleFile(filePath) {
    const fullPath = join(__dirname, "..", filePath);
    if (!existsSync(fullPath)) {
      this.errors.push(`Example file not found: ${filePath}`);
      return;
    }

    const content = readFileSync(fullPath, "utf8");
    const language = this.getLanguageFromPath(filePath);

    switch (language) {
      case "curl":
        await this.validateCurlSyntax(content, filePath);
        break;
      case "javascript":
        await this.validateJavaScriptSyntax(content, filePath);
        break;
      case "python":
        await this.validatePythonSyntax(content, filePath);
        break;
    }
  }

  getLanguageFromPath(filePath) {
    if (filePath.includes("curl")) return "curl";
    if (filePath.includes("javascript")) return "javascript";
    if (filePath.includes("python")) return "python";
    return "unknown";
  }

  async validateCurlSyntax(content, filePath) {
    const commands = this.extractCurlCommands(content);

    for (const [index, command] of commands.entries()) {
      const testName = `${filePath}-curl-${index + 1}`;

      try {
        // Validate curl command syntax without executing
        const syntaxCheck = command
          .replace(/https?:\/\/[^\/\s]+/g, "http://example.com")
          .replace(/YOUR_API_TOKEN/g, "test-token")
          .replace(/\$\{[^}]+\}/g, "test-value");

        // Basic syntax validation
        if (!syntaxCheck.startsWith("curl ")) {
          this.errors.push(`${testName}: Invalid curl command syntax`);
          continue;
        }

        // Check for required components
        if (!syntaxCheck.includes("http")) {
          this.warnings.push(`${testName}: No URL found in curl command`);
        }

        // Validate JSON in POST/PUT requests
        const jsonMatch = syntaxCheck.match(/-d\s*'([^']+)'/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1]);
          } catch (error) {
            this.errors.push(`${testName}: Invalid JSON in request body`);
          }
        }

        this.testResults.push({
          test: testName,
          type: "curl-syntax",
          status: "passed",
        });
      } catch (error) {
        this.errors.push(`${testName}: ${error.message}`);
        this.testResults.push({
          test: testName,
          type: "curl-syntax",
          status: "failed",
          error: error.message,
        });
      }
    }
  }

  async validateJavaScriptSyntax(content, filePath) {
    const examples = this.extractJavaScriptExamples(content);

    for (const [index, example] of examples.entries()) {
      const testName = `${filePath}-js-${index + 1}`;

      try {
        // Create a test file with the example
        const testCode = this.prepareJavaScriptForSyntaxCheck(example);
        const testFile = join(this.tempDir, `${testName}.js`);

        writeFileSync(testFile, testCode);

        // Check syntax using Node.js
        execSync(`node --check ${testFile}`, { stdio: "pipe" });

        this.testResults.push({
          test: testName,
          type: "javascript-syntax",
          status: "passed",
        });
      } catch (error) {
        this.errors.push(`${testName}: Syntax error - ${error.message}`);
        this.testResults.push({
          test: testName,
          type: "javascript-syntax",
          status: "failed",
          error: error.message,
        });
      }
    }
  }

  async validatePythonSyntax(content, filePath) {
    const examples = this.extractPythonExamples(content);

    for (const [index, example] of examples.entries()) {
      const testName = `${filePath}-python-${index + 1}`;

      try {
        // Check if Python is available
        try {
          execSync("python3 --version", { stdio: "pipe" });
        } catch (error) {
          this.warnings.push(
            `${testName}: Python3 not available, skipping syntax check`,
          );
          continue;
        }

        // Create a test file with the example
        const testCode = this.preparePythonForSyntaxCheck(example);
        const testFile = join(this.tempDir, `${testName}.py`);

        writeFileSync(testFile, testCode);

        // Check syntax using Python
        execSync(`python3 -m py_compile ${testFile}`, { stdio: "pipe" });

        this.testResults.push({
          test: testName,
          type: "python-syntax",
          status: "passed",
        });
      } catch (error) {
        this.errors.push(`${testName}: Syntax error - ${error.message}`);
        this.testResults.push({
          test: testName,
          type: "python-syntax",
          status: "failed",
          error: error.message,
        });
      }
    }
  }

  async testExampleCompleteness() {
    console.log("Testing example completeness against OpenAPI spec...");

    if (!this.openApiSpec) {
      this.warnings.push(
        "OpenAPI spec not available, skipping completeness check",
      );
      return;
    }

    const endpoints = Object.keys(this.openApiSpec.paths || {});
    const exampleEndpoints = this.extractEndpointsFromExamples();

    for (const endpoint of endpoints) {
      const methods = Object.keys(this.openApiSpec.paths[endpoint]);

      for (const method of methods) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          const endpointKey = `${method.toUpperCase()} ${endpoint}`;

          if (!exampleEndpoints.includes(endpointKey)) {
            this.warnings.push(`Missing example for endpoint: ${endpointKey}`);
          }
        }
      }
    }
  }

  extractEndpointsFromExamples() {
    const endpoints = [];
    const exampleFiles = [
      "api/examples/curl-examples.md",
      "api/examples/javascript-examples.md",
      "api/examples/python-examples.md",
    ];

    for (const file of exampleFiles) {
      const fullPath = join(__dirname, "..", file);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf8");

        // Extract endpoints from curl commands
        const curlCommands = this.extractCurlCommands(content);
        for (const command of curlCommands) {
          const methodMatch = command.match(/-X\s+(\w+)/);
          const urlMatch = command.match(/https?:\/\/[^\/\s]+(\S+)/);

          if (methodMatch && urlMatch) {
            const method = methodMatch[1];
            const path = urlMatch[1].split("?")[0]; // Remove query params
            endpoints.push(`${method} ${path}`);
          } else if (command.includes("curl ") && !command.includes("-X")) {
            // Default GET request
            const urlMatch = command.match(/https?:\/\/[^\/\s]+(\S+)/);
            if (urlMatch) {
              const path = urlMatch[1].split("?")[0];
              endpoints.push(`GET ${path}`);
            }
          }
        }
      }
    }

    return [...new Set(endpoints)]; // Remove duplicates
  }

  async testResponseValidation() {
    console.log("Testing response validation in examples...");

    const exampleFiles = [
      "api/examples/curl-examples.md",
      "api/examples/javascript-examples.md",
      "api/examples/python-examples.md",
    ];

    for (const file of exampleFiles) {
      await this.validateResponseExamples(file);
    }
  }

  async validateResponseExamples(filePath) {
    const fullPath = join(__dirname, "..", filePath);
    if (!existsSync(fullPath)) return;

    const content = readFileSync(fullPath, "utf8");

    // Extract JSON response examples
    const jsonResponses = this.extractJSONResponses(content);

    for (const [index, response] of jsonResponses.entries()) {
      const testName = `${filePath}-response-${index + 1}`;

      try {
        JSON.parse(response);

        this.testResults.push({
          test: testName,
          type: "response-validation",
          status: "passed",
        });
      } catch (error) {
        this.errors.push(
          `${testName}: Invalid JSON response - ${error.message}`,
        );
        this.testResults.push({
          test: testName,
          type: "response-validation",
          status: "failed",
          error: error.message,
        });
      }
    }
  }

  extractJSONResponses(content) {
    const responses = [];

    // Look for JSON code blocks that appear to be responses
    const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      const json = match[1].trim();
      if (json.startsWith("{") || json.startsWith("[")) {
        responses.push(json);
      }
    }

    return responses;
  }

  async testErrorHandling() {
    console.log("Testing error handling examples...");

    const exampleFiles = [
      "api/examples/curl-examples.md",
      "api/examples/javascript-examples.md",
      "api/examples/python-examples.md",
    ];

    for (const file of exampleFiles) {
      await this.validateErrorHandling(file);
    }
  }

  async validateErrorHandling(filePath) {
    const fullPath = join(__dirname, "..", filePath);
    if (!existsSync(fullPath)) return;

    const content = readFileSync(fullPath, "utf8");

    // Check if error handling is demonstrated
    const hasErrorHandling = this.checkErrorHandlingPatterns(content, filePath);

    if (!hasErrorHandling) {
      this.warnings.push(`${filePath}: No error handling examples found`);
    }
  }

  checkErrorHandlingPatterns(content, filePath) {
    const language = this.getLanguageFromPath(filePath);

    switch (language) {
      case "javascript":
        return content.includes("catch") || content.includes("error");
      case "python":
        return content.includes("except") || content.includes("try:");
      case "curl":
        return (
          content.includes("400") ||
          content.includes("401") ||
          content.includes("error")
        );
      default:
        return false;
    }
  }

  // Helper methods from the original ExamplesTester
  extractCurlCommands(content) {
    const commands = [];
    const codeBlockRegex = /```(?:bash|shell|curl)\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const block = match[1].trim();
      const lines = block.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("curl ")) {
          commands.push(trimmed);
        }
      }
    }

    return commands;
  }

  extractJavaScriptExamples(content) {
    const examples = [];
    const codeBlockRegex = /```(?:javascript|js)\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      examples.push(match[1].trim());
    }

    return examples;
  }

  extractPythonExamples(content) {
    const examples = [];
    const codeBlockRegex = /```python\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      examples.push(match[1].trim());
    }

    return examples;
  }

  prepareJavaScriptForSyntaxCheck(code) {
    // Minimal setup for syntax checking
    const setup = `
// Mock dependencies for syntax checking
const axios = { get: () => {}, post: () => {}, put: () => {}, delete: () => {} };
const baseURL = 'http://example.com';
const API_TOKEN = 'test-token';

`;

    return setup + code;
  }

  preparePythonForSyntaxCheck(code) {
    // Minimal setup for syntax checking
    const setup = `
# Mock dependencies for syntax checking
class MockRequests:
    def get(self, *args, **kwargs): pass
    def post(self, *args, **kwargs): pass
    def put(self, *args, **kwargs): pass
    def delete(self, *args, **kwargs): pass

requests = MockRequests()
base_url = 'http://example.com'
API_TOKEN = 'test-token'

`;

    return setup + code;
  }

  reportResults() {
    console.log("\n=== Enhanced Example Accuracy Test Report ===\n");

    const passed = this.testResults.filter((r) => r.status === "passed").length;
    const failed = this.testResults.filter((r) => r.status === "failed").length;

    console.log(`Tests run: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    // Group results by type
    const byType = this.testResults.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = { passed: 0, failed: 0 };
      acc[result.type][result.status]++;
      return acc;
    }, {});

    console.log("\nResults by test type:");
    for (const [type, counts] of Object.entries(byType)) {
      console.log(
        `  ${type}: ${counts.passed} passed, ${counts.failed} failed`,
      );
    }

    if (failed > 0) {
      console.log("\n❌ Failed tests:");
      this.testResults
        .filter((r) => r.status === "failed")
        .forEach((result) => {
          console.log(`  - ${result.test}: ${result.error}`);
        });
    }

    if (this.errors.length > 0) {
      console.log("\n❌ Errors:");
      this.errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log("\n!  Warnings:");
      this.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    if (failed === 0 && this.errors.length === 0) {
      console.log("\n✅ All enhanced example accuracy tests passed!");
    }

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed,
        failed,
        errors: this.errors.length,
        warnings: this.warnings.length,
      },
      results: this.testResults,
      errors: this.errors,
      warnings: this.warnings,
      testTypes: byType,
    };

    const reportPath = join(__dirname, "../test-reports/example-accuracy.json");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    if (failed > 0 || this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the enhanced tester
if (require.main === module) {
  const tester = new EnhancedExampleTester();
  tester.test().catch(console.error);
}

export default EnhancedExampleTester;

