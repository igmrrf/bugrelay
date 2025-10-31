#!/usr/bin/env node

/**
 * Schema Validation Script
 * 
 * This script validates JSON schemas and ensures they are properly formatted
 * and comply with JSON Schema specifications.
 */

const fs = require('fs');
const path = require('path');

class SchemaValidator {
  constructor() {
    this.errors = [];
  }

  async validate() {
    console.log('Validating JSON schemas...');
    
    await this.validateSchemaFile();
    await this.validateMCPTools();
    
    if (this.errors.length > 0) {
      console.error('Validation errors found:');
      this.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    } else {
      console.log('All schemas are valid!');
    }
  }

  async validateSchemaFile() {
    const schemaPath = path.join(__dirname, '../models/schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      this.errors.push('schema.json file not found');
      return;
    }

    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const schemas = JSON.parse(content);
      
      // Basic validation
      if (typeof schemas !== 'object') {
        this.errors.push('schema.json must contain an object');
        return;
      }

      // Validate each schema
      Object.entries(schemas).forEach(([name, schema]) => {
        this.validateSingleSchema(name, schema);
      });
      
    } catch (error) {
      this.errors.push(`Error reading schema.json: ${error.message}`);
    }
  }

  validateSingleSchema(name, schema) {
    if (!schema.$schema) {
      this.errors.push(`Schema ${name} missing $schema property`);
    }
    
    if (!schema.type) {
      this.errors.push(`Schema ${name} missing type property`);
    }
    
    if (!schema.properties && schema.type === 'object') {
      this.errors.push(`Object schema ${name} missing properties`);
    }
  }

  async validateMCPTools() {
    const toolsPath = path.join(__dirname, '../mcp/tools.json');
    
    if (!fs.existsSync(toolsPath)) {
      this.errors.push('MCP tools.json file not found');
      return;
    }

    try {
      const content = fs.readFileSync(toolsPath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.tools || !Array.isArray(data.tools)) {
        this.errors.push('MCP tools.json must contain a tools array');
        return;
      }

      data.tools.forEach((tool, index) => {
        if (!tool.name) {
          this.errors.push(`MCP tool at index ${index} missing name`);
        }
        if (!tool.description) {
          this.errors.push(`MCP tool at index ${index} missing description`);
        }
        if (!tool.inputSchema) {
          this.errors.push(`MCP tool at index ${index} missing inputSchema`);
        }
      });
      
    } catch (error) {
      this.errors.push(`Error reading MCP tools.json: ${error.message}`);
    }
  }
}

// Run the validator
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validate().catch(console.error);
}

module.exports = SchemaValidator;