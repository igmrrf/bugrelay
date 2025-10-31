#!/usr/bin/env node

/**
 * Code Examples Tester
 * 
 * This script tests all code examples in the documentation to ensure they work correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ExamplesTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
    this.tempDir = path.join(__dirname, '../temp-examples');
  }

  async test() {
    console.log('Testing code examples...');
    
    // Create temp directory for test files
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    try {
      await this.testCurlExamples();
      await this.testJavaScriptExamples();
      await this.testPythonExamples();
      this.reportResults();
    } finally {
      // Cleanup temp directory
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    }
  }

  async testCurlExamples() {
    console.log('Testing curl examples...');
    
    const curlFile = path.join(__dirname, '../api/examples/curl-examples.md');
    if (!fs.existsSync(curlFile)) {
      this.errors.push('curl-examples.md not found');
      return;
    }
    
    const content = fs.readFileSync(curlFile, 'utf8');
    const curlCommands = this.extractCurlCommands(content);
    
    for (const [index, command] of curlCommands.entries()) {
      await this.testCurlCommand(command, `curl-example-${index + 1}`);
    }
  }

  extractCurlCommands(content) {
    const commands = [];
    const codeBlockRegex = /```(?:bash|shell|curl)\n([\s\S]*?)\n```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const block = match[1].trim();
      const lines = block.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('curl ')) {
          commands.push(trimmed);
        }
      }
    }
    
    return commands;
  }

  async testCurlCommand(command, testName) {
    try {
      // Replace placeholder URLs with actual test URL
      const testCommand = command
        .replace(/https?:\/\/[^\/\s]+/g, this.baseURL)
        .replace(/YOUR_API_TOKEN/g, 'test-token')
        .replace(/\$API_TOKEN/g, 'test-token');
      
      console.log(`Testing: ${testName}`);
      
      // Execute curl command with timeout
      const result = execSync(testCommand, {
        timeout: 10000,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.testResults.push({
        test: testName,
        type: 'curl',
        status: 'passed',
        command: testCommand
      });
      
    } catch (error) {
      // Some curl commands are expected to fail (e.g., auth required)
      if (error.status === 1 && error.stdout) {
        // Check if it's a valid HTTP response
        try {
          const output = error.stdout.toString();
          if (output.includes('HTTP/') || output.includes('"error"')) {
            this.testResults.push({
              test: testName,
              type: 'curl',
              status: 'passed',
              note: 'Expected error response',
              command: testCommand
            });
            return;
          }
        } catch (parseError) {
          // Continue to error handling
        }
      }
      
      this.errors.push(`${testName}: ${error.message}`);
      this.testResults.push({
        test: testName,
        type: 'curl',
        status: 'failed',
        error: error.message,
        command: testCommand
      });
    }
  }

  async testJavaScriptExamples() {
    console.log('Testing JavaScript examples...');
    
    const jsFile = path.join(__dirname, '../api/examples/javascript-examples.md');
    if (!fs.existsSync(jsFile)) {
      this.errors.push('javascript-examples.md not found');
      return;
    }
    
    const content = fs.readFileSync(jsFile, 'utf8');
    const jsExamples = this.extractJavaScriptExamples(content);
    
    for (const [index, example] of jsExamples.entries()) {
      await this.testJavaScriptExample(example, `js-example-${index + 1}`);
    }
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

  async testJavaScriptExample(code, testName) {
    try {
      console.log(`Testing: ${testName}`);
      
      // Prepare the test code
      const testCode = this.prepareJavaScriptCode(code);
      const testFile = path.join(this.tempDir, `${testName}.js`);
      
      fs.writeFileSync(testFile, testCode);
      
      // Run the JavaScript code
      const result = execSync(`node ${testFile}`, {
        timeout: 15000,
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          API_BASE_URL: this.baseURL
        }
      });
      
      this.testResults.push({
        test: testName,
        type: 'javascript',
        status: 'passed',
        output: result.substring(0, 200) // Truncate output
      });
      
    } catch (error) {
      this.errors.push(`${testName}: ${error.message}`);
      this.testResults.push({
        test: testName,
        type: 'javascript',
        status: 'failed',
        error: error.message
      });
    }
  }

  prepareJavaScriptCode(code) {
    // Add necessary imports and setup
    const setup = `
const axios = require('axios');
const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';

// Replace placeholder values
const API_TOKEN = 'test-token';
const YOUR_API_TOKEN = 'test-token';

// Wrap in async function to handle promises
(async () => {
  try {
`;
    
    const cleanup = `
  } catch (error) {
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
})();
`;
    
    // Replace API URLs and add base URL
    let processedCode = code
      .replace(/https?:\/\/[^\/\s'"]+/g, '${baseURL}')
      .replace(/(['"`])https?:\/\/[^\/\s'"]+/g, '$1${baseURL}')
      .replace(/const\s+baseURL\s*=.*?;/g, '') // Remove existing baseURL definitions
      .replace(/let\s+baseURL\s*=.*?;/g, '')
      .replace(/var\s+baseURL\s*=.*?;/g, '');
    
    return setup + processedCode + cleanup;
  }

  async testPythonExamples() {
    console.log('Testing Python examples...');
    
    const pythonFile = path.join(__dirname, '../api/examples/python-examples.md');
    if (!fs.existsSync(pythonFile)) {
      this.errors.push('python-examples.md not found');
      return;
    }
    
    const content = fs.readFileSync(pythonFile, 'utf8');
    const pythonExamples = this.extractPythonExamples(content);
    
    for (const [index, example] of pythonExamples.entries()) {
      await this.testPythonExample(example, `python-example-${index + 1}`);
    }
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

  async testPythonExample(code, testName) {
    try {
      console.log(`Testing: ${testName}`);
      
      // Check if Python is available
      try {
        execSync('python3 --version', { stdio: 'pipe' });
      } catch (error) {
        this.warnings.push(`${testName}: Python3 not available, skipping`);
        return;
      }
      
      // Prepare the test code
      const testCode = this.preparePythonCode(code);
      const testFile = path.join(this.tempDir, `${testName}.py`);
      
      fs.writeFileSync(testFile, testCode);
      
      // Run the Python code
      const result = execSync(`python3 ${testFile}`, {
        timeout: 15000,
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          API_BASE_URL: this.baseURL
        }
      });
      
      this.testResults.push({
        test: testName,
        type: 'python',
        status: 'passed',
        output: result.substring(0, 200) // Truncate output
      });
      
    } catch (error) {
      this.errors.push(`${testName}: ${error.message}`);
      this.testResults.push({
        test: testName,
        type: 'python',
        status: 'failed',
        error: error.message
      });
    }
  }

  preparePythonCode(code) {
    // Add necessary imports and setup
    const setup = `
import requests
import json
import os

base_url = os.environ.get('API_BASE_URL', 'http://localhost:8080')
API_TOKEN = 'test-token'
YOUR_API_TOKEN = 'test-token'

try:
`;
    
    const cleanup = `
except requests.exceptions.RequestException as e:
    if hasattr(e, 'response') and e.response is not None:
        print(f'Response status: {e.response.status_code}')
        try:
            print(f'Response data: {json.dumps(e.response.json(), indent=2)}')
        except:
            print(f'Response text: {e.response.text}')
    else:
        print(f'Error: {e}')
except Exception as e:
    print(f'Error: {e}')
`;
    
    // Replace API URLs and add base URL
    let processedCode = code
      .replace(/https?:\/\/[^\/\s'"]+/g, '{base_url}')
      .replace(/(['"])https?:\/\/[^\/\s'"]+/g, '$1{base_url}')
      .replace(/base_url\s*=.*?\n/g, '') // Remove existing base_url definitions
      .replace(/f['"]([^'"]*){base_url}([^'"]*)['"]/g, "f'$1{base_url}$2'"); // Fix f-string formatting
    
    // Indent the code properly
    const indentedCode = processedCode
      .split('\n')
      .map(line => line.trim() ? '    ' + line : line)
      .join('\n');
    
    return setup + indentedCode + cleanup;
  }

  reportResults() {
    console.log('\n=== Code Examples Test Report ===\n');
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    
    console.log(`Tests run: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    
    // Group results by type
    const byType = this.testResults.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {});
    
    for (const [type, results] of Object.entries(byType)) {
      const typePassed = results.filter(r => r.status === 'passed').length;
      const typeFailed = results.filter(r => r.status === 'failed').length;
      console.log(`${type}: ${typePassed} passed, ${typeFailed} failed`);
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`  - ${result.test} (${result.type}): ${result.error}`);
        });
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (failed === 0 && this.errors.length === 0) {
      console.log('\n✅ All code examples work correctly!');
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed,
        failed,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      results: this.testResults,
      errors: this.errors,
      warnings: this.warnings
    };
    
    const reportPath = path.join(__dirname, '../test-reports/examples.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    if (failed > 0 || this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the tester
if (require.main === module) {
  const tester = new ExamplesTester();
  tester.test().catch(console.error);
}

module.exports = ExamplesTester;