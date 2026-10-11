#!/usr/bin/env node

/**
 * API Accuracy Tester
 *
 * This script tests the running backend API against the OpenAPI specification
 * to ensure documentation accuracy.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import axios, { get, post } from "axios";
import { load } from "js-yaml";

class APIAccuracyTester {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || "http://localhost:8080";
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
    this.authToken = null;
  }

  async test() {
    console.log("Testing API accuracy against documentation...");
    console.log(`Base URL: ${this.baseURL}`);

    try {
      await this.loadOpenAPISpec();
      await this.setupTestEnvironment();
      await this.testEndpoints();
      await this.testSchemaValidation();
      this.reportResults();
    } catch (error) {
      console.error("Test setup failed:", error.message);
      process.exit(1);
    }
  }

  async loadOpenAPISpec() {
    const specPath = join(__dirname, "../api/openapi.yaml");
    if (!existsSync(specPath)) {
      throw new Error("OpenAPI specification not found");
    }

    const content = readFileSync(specPath, "utf8");
    this.spec = load(content);
    console.log(
      `Loaded OpenAPI spec: ${this.spec.info.title} v${this.spec.info.version}`,
    );
  }

  async setupTestEnvironment() {
    console.log("Setting up test environment...");

    // Wait for API to be ready
    await this.waitForAPI();

    // Create test user and get auth token
    await this.createTestUser();
  }

  async waitForAPI(maxAttempts = 30, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await get(`${this.baseURL}/health`);
        console.log("API is ready");
        return;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error("API not responding after maximum attempts");
        }
        console.log(`Waiting for API... (attempt ${i + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async createTestUser() {
    try {
      const registerData = {
        email: "test@example.com",
        password: "testpassword123",
        display_name: "Test User",
      };

      const response = await post(
        `${this.baseURL}/api/v1/auth/register`,
        registerData,
      );
      this.authToken = response.data.access_token;
      console.log("Test user created and authenticated");
    } catch (error) {
      if (error.response?.status === 409) {
        // User already exists, try to login
        try {
          const loginData = {
            email: "test@example.com",
            password: "testpassword123",
          };

          const response = await post(
            `${this.baseURL}/api/v1/auth/login`,
            loginData,
          );
          this.authToken = response.data.access_token;
          console.log("Logged in with existing test user");
        } catch (loginError) {
          console.warn("Could not authenticate test user, some tests may fail");
        }
      } else {
        console.warn("Could not create test user, some tests may fail");
      }
    }
  }

  async testEndpoints() {
    console.log("Testing API endpoints...");

    const paths = Object.keys(this.spec.paths || {});

    for (const pathPattern of paths) {
      const pathSpec = this.spec.paths[pathPattern];
      const methods = Object.keys(pathSpec);

      for (const method of methods) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          await this.testEndpoint(pathPattern, method, pathSpec[method]);
        }
      }
    }
  }

  async testEndpoint(pathPattern, method, endpointSpec) {
    const testName = `${method.toUpperCase()} ${pathPattern}`;
    console.log(`Testing ${testName}...`);

    try {
      const testPath = this.resolvePathParameters(pathPattern, endpointSpec);
      const config = this.buildRequestConfig(method, testPath, endpointSpec);

      const response = await axios(config);

      // Test response status
      const expectedStatuses = Object.keys(endpointSpec.responses || {});
      if (!expectedStatuses.includes(response.status.toString())) {
        this.warnings.push(
          `${testName}: Unexpected status ${response.status}, expected one of: ${expectedStatuses.join(", ")}`,
        );
      }

      // Test response schema
      await this.validateResponseSchema(testName, response, endpointSpec);

      this.testResults.push({
        endpoint: testName,
        status: "passed",
        responseStatus: response.status,
        responseTime: response.headers["x-response-time"] || "unknown",
      });
    } catch (error) {
      if (error.response) {
        // Expected error responses
        const status = error.response.status;
        const expectedStatuses = Object.keys(endpointSpec.responses || {});

        if (expectedStatuses.includes(status.toString())) {
          // This is an expected error response
          await this.validateResponseSchema(
            testName,
            error.response,
            endpointSpec,
          );

          this.testResults.push({
            endpoint: testName,
            status: "passed",
            responseStatus: status,
            note: "Expected error response",
          });
        } else {
          this.errors.push(`${testName}: Unexpected error status ${status}`);
          this.testResults.push({
            endpoint: testName,
            status: "failed",
            error: `Unexpected status ${status}`,
          });
        }
      } else {
        this.errors.push(`${testName}: Request failed - ${error.message}`);
        this.testResults.push({
          endpoint: testName,
          status: "failed",
          error: error.message,
        });
      }
    }
  }

  resolvePathParameters(pathPattern, endpointSpec) {
    let resolvedPath = pathPattern;

    // Replace path parameters with test values
    const parameterMap = {
      "{id}": "123e4567-e89b-12d3-a456-426614174000",
      "{provider}": "google",
    };

    for (const [param, value] of Object.entries(parameterMap)) {
      resolvedPath = resolvedPath.replace(param, value);
    }

    return resolvedPath;
  }

  buildRequestConfig(method, path, endpointSpec) {
    const config = {
      method: method.toLowerCase(),
      url: `${this.baseURL}${path}`,
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // Don't throw on error status codes
    };

    // Add authentication if required
    if (endpointSpec.security && this.authToken) {
      config.headers.Authorization = `Bearer ${this.authToken}`;
    }

    // Add request body for POST/PUT/PATCH
    if (["post", "put", "patch"].includes(method) && endpointSpec.requestBody) {
      config.data = this.generateRequestBody(endpointSpec.requestBody);
    }

    // Add query parameters for GET requests
    if (method === "get" && endpointSpec.parameters) {
      const queryParams = {};
      endpointSpec.parameters
        .filter((p) => p.in === "query")
        .forEach((p) => {
          queryParams[p.name] = this.generateParameterValue(p);
        });

      if (Object.keys(queryParams).length > 0) {
        config.params = queryParams;
      }
    }

    return config;
  }

  generateRequestBody(requestBodySpec) {
    const content = requestBodySpec.content;
    if (!content || !content["application/json"]) {
      return {};
    }

    const schema = content["application/json"].schema;
    return this.generateDataFromSchema(schema);
  }

  generateParameterValue(parameter) {
    const schema = parameter.schema;
    if (!schema) return undefined;

    switch (schema.type) {
      case "string":
        if (schema.enum) return schema.enum[0];
        if (schema.format === "uuid")
          return "123e4567-e89b-12d3-a456-426614174000";
        return "test";
      case "integer":
        return schema.minimum || 1;
      case "boolean":
        return true;
      default:
        return undefined;
    }
  }

  generateDataFromSchema(schema) {
    if (!schema) return {};

    if (schema.$ref) {
      // Resolve reference
      const refPath = schema.$ref.replace("#/components/schemas/", "");
      const refSchema = this.spec.components?.schemas?.[refPath];
      if (refSchema) {
        return this.generateDataFromSchema(refSchema);
      }
      return {};
    }

    if (schema.type === "object" && schema.properties) {
      const data = {};
      const required = schema.required || [];

      // Only include required fields for testing
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (required.includes(propName)) {
          data[propName] = this.generateValueFromSchema(propSchema);
        }
      }

      return data;
    }

    return this.generateValueFromSchema(schema);
  }

  generateValueFromSchema(schema) {
    if (schema.$ref) {
      const refPath = schema.$ref.replace("#/components/schemas/", "");
      const refSchema = this.spec.components?.schemas?.[refPath];
      if (refSchema) {
        return this.generateDataFromSchema(refSchema);
      }
      return null;
    }

    switch (schema.type) {
      case "string":
        if (schema.enum) return schema.enum[0];
        if (schema.format === "email") return "test@example.com";
        if (schema.format === "uuid")
          return "123e4567-e89b-12d3-a456-426614174000";
        if (schema.format === "date-time") return new Date().toISOString();
        return schema.example || "test string";
      case "integer":
        return schema.example || schema.minimum || 1;
      case "number":
        return schema.example || schema.minimum || 1.0;
      case "boolean":
        return schema.example !== undefined ? schema.example : true;
      case "array":
        return schema.items ? [this.generateValueFromSchema(schema.items)] : [];
      case "object":
        return this.generateDataFromSchema(schema);
      default:
        return null;
    }
  }

  async validateResponseSchema(testName, response, endpointSpec) {
    const status = response.status.toString();
    const responseSpec = endpointSpec.responses?.[status];

    if (!responseSpec) {
      return; // No schema to validate against
    }

    const content = responseSpec.content;
    if (!content || !content["application/json"]) {
      return; // No JSON schema to validate
    }

    const schema = content["application/json"].schema;
    if (!schema) {
      return; // No schema defined
    }

    try {
      this.validateDataAgainstSchema(
        response.data,
        schema,
        `${testName} response`,
      );
    } catch (error) {
      this.warnings.push(
        `${testName}: Response schema validation failed - ${error.message}`,
      );
    }
  }

  validateDataAgainstSchema(data, schema, context) {
    if (schema.$ref) {
      const refPath = schema.$ref.replace("#/components/schemas/", "");
      const refSchema = this.spec.components?.schemas?.[refPath];
      if (refSchema) {
        return this.validateDataAgainstSchema(data, refSchema, context);
      }
      return;
    }

    if (schema.type === "object" && schema.properties) {
      if (typeof data !== "object" || data === null) {
        throw new Error(`Expected object but got ${typeof data}`);
      }

      const required = schema.required || [];
      for (const requiredField of required) {
        if (!(requiredField in data)) {
          throw new Error(`Missing required field: ${requiredField}`);
        }
      }

      // Validate each property
      for (const [propName, propValue] of Object.entries(data)) {
        if (schema.properties[propName]) {
          try {
            this.validateDataAgainstSchema(
              propValue,
              schema.properties[propName],
              `${context}.${propName}`,
            );
          } catch (error) {
            throw new Error(`Property ${propName}: ${error.message}`);
          }
        }
      }
    }
  }

  async testSchemaValidation() {
    console.log("Testing schema validation...");

    // Test with invalid data to ensure validation works
    const testCases = [
      {
        endpoint: "/api/v1/bugs",
        method: "post",
        data: { title: "" }, // Invalid: empty title
        expectedStatus: 400,
      },
      {
        endpoint: "/api/v1/auth/login",
        method: "post",
        data: { email: "invalid-email" }, // Invalid: bad email format
        expectedStatus: 400,
      },
    ];

    for (const testCase of testCases) {
      try {
        const response = await axios({
          method: testCase.method,
          url: `${this.baseURL}${testCase.endpoint}`,
          data: testCase.data,
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        });

        if (response.status !== testCase.expectedStatus) {
          this.warnings.push(
            `Validation test failed for ${testCase.endpoint}: expected ${testCase.expectedStatus}, got ${response.status}`,
          );
        } else {
          console.log(`✓ Validation working for ${testCase.endpoint}`);
        }
      } catch (error) {
        this.warnings.push(
          `Validation test error for ${testCase.endpoint}: ${error.message}`,
        );
      }
    }
  }

  reportResults() {
    console.log("\n=== API Accuracy Test Report ===\n");

    const passed = this.testResults.filter((r) => r.status === "passed").length;
    const failed = this.testResults.filter((r) => r.status === "failed").length;

    console.log(`Tests run: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (failed > 0) {
      console.log("\n❌ Failed tests:");
      this.testResults
        .filter((r) => r.status === "failed")
        .forEach((result) => {
          console.log(`  - ${result.endpoint}: ${result.error}`);
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
      console.log("\n✅ All API accuracy tests passed!");
    }

    // Generate JSON report
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
    };

    const reportPath = join(__dirname, "../test-reports/api-accuracy.json");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    if (failed > 0 || this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the tester
if (require.main === module) {
  const tester = new APIAccuracyTester();
  tester.test().catch(console.error);
}

export default APIAccuracyTester;

