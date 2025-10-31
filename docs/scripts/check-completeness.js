#!/usr/bin/env node

/**
 * Documentation Completeness Checker
 * 
 * This script analyzes the backend codebase and documentation to ensure
 * all API endpoints, models, and features are properly documented.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class CompletenessChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.backendPath = path.join(__dirname, '../../backend');
    this.docsPath = path.join(__dirname, '..');
  }

  async check() {
    console.log('Checking documentation completeness...');
    
    await this.checkOpenAPICompleteness();
    await this.checkModelDocumentation();
    await this.checkEndpointExamples();
    await this.checkMCPToolDefinitions();
    await this.checkVersionSync();
    
    this.reportResults();
  }

  async checkOpenAPICompleteness() {
    console.log('Checking OpenAPI specification completeness...');
    
    const openApiPath = path.join(this.docsPath, 'api/openapi.yaml');
    if (!fs.existsSync(openApiPath)) {
      this.errors.push('OpenAPI specification file not found');
      return;
    }

    try {
      const openApiContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = yaml.load(openApiContent);
      
      // Check for required sections
      this.checkRequiredSection(spec, 'info', 'OpenAPI info section');
      this.checkRequiredSection(spec, 'paths', 'OpenAPI paths section');
      this.checkRequiredSection(spec, 'components.schemas', 'OpenAPI schemas');
      this.checkRequiredSection(spec, 'components.securitySchemes', 'Security schemes');
      
      // Check endpoint documentation
      await this.checkEndpointDocumentation(spec);
      
      // Check schema completeness
      await this.checkSchemaCompleteness(spec);
      
    } catch (error) {
      this.errors.push(`Error reading OpenAPI specification: ${error.message}`);
    }
  }

  async checkEndpointDocumentation(spec) {
    const routerFiles = await this.findRouterFiles();
    const documentedPaths = Object.keys(spec.paths || {});
    
    for (const routerFile of routerFiles) {
      const routes = await this.extractRoutesFromFile(routerFile);
      
      for (const route of routes) {
        const pathPattern = this.convertRouteToOpenAPIPath(route.path);
        const methodLower = route.method.toLowerCase();
        
        if (!documentedPaths.includes(pathPattern)) {
          this.errors.push(`Undocumented endpoint: ${route.method} ${route.path}`);
        } else if (!spec.paths[pathPattern] || !spec.paths[pathPattern][methodLower]) {
          this.errors.push(`Missing method documentation: ${route.method} ${pathPattern}`);
        } else {
          // Check endpoint documentation quality
          const endpoint = spec.paths[pathPattern][methodLower];
          this.checkEndpointQuality(endpoint, `${route.method} ${pathPattern}`);
        }
      }
    }
  }

  checkEndpointQuality(endpoint, endpointName) {
    if (!endpoint.summary) {
      this.warnings.push(`Missing summary for ${endpointName}`);
    }
    
    if (!endpoint.description) {
      this.warnings.push(`Missing description for ${endpointName}`);
    }
    
    if (!endpoint.responses || Object.keys(endpoint.responses).length === 0) {
      this.errors.push(`Missing responses for ${endpointName}`);
    }
    
    if (!endpoint.tags || endpoint.tags.length === 0) {
      this.warnings.push(`Missing tags for ${endpointName}`);
    }
    
    // Check for required response codes
    const responses = endpoint.responses || {};
    if (!responses['400'] && endpoint.requestBody) {
      this.warnings.push(`Missing 400 response for ${endpointName} with request body`);
    }
    
    if (!responses['401'] && endpoint.security) {
      this.warnings.push(`Missing 401 response for secured ${endpointName}`);
    }
  }

  async checkSchemaCompleteness(spec) {
    const modelFiles = await this.findModelFiles();
    const documentedSchemas = Object.keys(spec.components?.schemas || {});
    
    for (const modelFile of modelFiles) {
      const models = await this.extractModelsFromFile(modelFile);
      
      for (const model of models) {
        if (!documentedSchemas.includes(model.name)) {
          this.errors.push(`Undocumented model: ${model.name}`);
        } else {
          // Check schema quality
          const schema = spec.components.schemas[model.name];
          this.checkSchemaQuality(schema, model.name, model);
        }
      }
    }
  }

  checkSchemaQuality(schema, schemaName, model) {
    if (!schema.type) {
      this.errors.push(`Missing type for schema ${schemaName}`);
    }
    
    if (!schema.properties && schema.type === 'object') {
      this.errors.push(`Missing properties for object schema ${schemaName}`);
    }
    
    if (model.fields) {
      const schemaProps = Object.keys(schema.properties || {});
      const modelFields = model.fields.map(f => f.name);
      
      for (const field of modelFields) {
        if (!schemaProps.includes(field)) {
          this.warnings.push(`Missing field ${field} in schema ${schemaName}`);
        }
      }
    }
  }

  async checkModelDocumentation() {
    console.log('Checking model documentation...');
    
    const schemaPath = path.join(this.docsPath, 'models/schema.json');
    const dataModelsPath = path.join(this.docsPath, 'models/data-models.md');
    
    if (!fs.existsSync(schemaPath)) {
      this.errors.push('JSON Schema file not found');
    }
    
    if (!fs.existsSync(dataModelsPath)) {
      this.errors.push('Data models documentation not found');
    }
    
    // Check if all Go models are documented
    const modelFiles = await this.findModelFiles();
    
    for (const modelFile of modelFiles) {
      const models = await this.extractModelsFromFile(modelFile);
      
      for (const model of models) {
        // Check if model is mentioned in data-models.md
        if (fs.existsSync(dataModelsPath)) {
          const docsContent = fs.readFileSync(dataModelsPath, 'utf8');
          if (!docsContent.includes(model.name)) {
            this.warnings.push(`Model ${model.name} not documented in data-models.md`);
          }
        }
      }
    }
  }

  async checkEndpointExamples() {
    console.log('Checking endpoint examples...');
    
    const examplesDir = path.join(this.docsPath, 'api/examples');
    const requiredExampleFiles = [
      'curl-examples.md',
      'javascript-examples.md',
      'python-examples.md'
    ];
    
    for (const file of requiredExampleFiles) {
      const filePath = path.join(examplesDir, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`Missing example file: ${file}`);
      }
    }
  }

  async checkMCPToolDefinitions() {
    console.log('Checking MCP tool definitions...');
    
    const mcpToolsPath = path.join(this.docsPath, 'mcp/tools.json');
    if (!fs.existsSync(mcpToolsPath)) {
      this.errors.push('MCP tools.json file not found');
      return;
    }
    
    try {
      const toolsContent = fs.readFileSync(mcpToolsPath, 'utf8');
      const tools = JSON.parse(toolsContent);
      
      if (!tools.tools || !Array.isArray(tools.tools)) {
        this.errors.push('MCP tools.json must contain a tools array');
        return;
      }
      
      // Check if we have tools for major operations
      const toolNames = tools.tools.map(t => t.name);
      const requiredTools = [
        'create_bug_report',
        'get_bug_report',
        'list_bug_reports',
        'vote_on_bug',
        'add_bug_comment' // Updated to match actual tool name
      ];
      
      for (const requiredTool of requiredTools) {
        if (!toolNames.includes(requiredTool)) {
          this.warnings.push(`Missing MCP tool: ${requiredTool}`);
        }
      }
      
    } catch (error) {
      this.errors.push(`Error reading MCP tools: ${error.message}`);
    }
  }

  async checkVersionSync() {
    console.log('Checking version synchronization...');
    
    // Check if backend version matches documentation version
    const backendModPath = path.join(this.backendPath, 'go.mod');
    const docsPackagePath = path.join(this.docsPath, 'package.json');
    const openApiPath = path.join(this.docsPath, 'api/openapi.yaml');
    
    try {
      // Get versions from different sources
      const versions = {};
      
      if (fs.existsSync(docsPackagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(docsPackagePath, 'utf8'));
        versions.docs = packageJson.version;
      }
      
      if (fs.existsSync(openApiPath)) {
        const openApiContent = fs.readFileSync(openApiPath, 'utf8');
        const spec = yaml.load(openApiContent);
        versions.openapi = spec.info?.version;
      }
      
      // Check for version consistency
      const versionValues = Object.values(versions);
      const uniqueVersions = [...new Set(versionValues)];
      
      if (uniqueVersions.length > 1) {
        this.warnings.push(`Version mismatch detected: ${JSON.stringify(versions)}`);
      }
      
    } catch (error) {
      this.warnings.push(`Error checking version sync: ${error.message}`);
    }
  }

  async findRouterFiles() {
    const routerDir = path.join(this.backendPath, 'internal/router');
    if (!fs.existsSync(routerDir)) {
      return [];
    }
    
    const files = fs.readdirSync(routerDir);
    return files
      .filter(file => file.endsWith('.go'))
      .map(file => path.join(routerDir, file));
  }

  async findModelFiles() {
    const modelsDir = path.join(this.backendPath, 'internal/models');
    if (!fs.existsSync(modelsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(modelsDir);
    return files
      .filter(file => file.endsWith('.go') && file !== 'models.go')
      .map(file => path.join(modelsDir, file));
  }

  async extractRoutesFromFile(filePath) {
    // This is a simplified route extraction
    // In a real implementation, you'd parse the Go AST
    const content = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    
    // Simple regex to find route definitions
    const routeRegex = /router\.(GET|POST|PUT|PATCH|DELETE)\("([^"]+)"/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      routes.push({
        method: match[1],
        path: match[2]
      });
    }
    
    return routes;
  }

  async extractModelsFromFile(filePath) {
    // This is a simplified model extraction
    // In a real implementation, you'd parse the Go AST
    const content = fs.readFileSync(filePath, 'utf8');
    const models = [];
    
    // Simple regex to find struct definitions
    const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      
      // Extract fields
      const fieldRegex = /(\w+)\s+([^\s`]+)/g;
      const fields = [];
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2]
        });
      }
      
      models.push({ name, fields });
    }
    
    return models;
  }

  convertRouteToOpenAPIPath(routePath) {
    // Convert Go router path to OpenAPI path format
    return routePath.replace(/:(\w+)/g, '{$1}');
  }

  checkRequiredSection(obj, path, description) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!current || !current[key]) {
        this.errors.push(`Missing ${description}`);
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  reportResults() {
    console.log('\n=== Documentation Completeness Report ===\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All documentation checks passed!');
      return;
    }
    
    if (this.errors.length > 0) {
      console.log('❌ Errors found:');
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }
    
    console.log(`Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new CompletenessChecker();
  checker.check().catch(console.error);
}

module.exports = CompletenessChecker;