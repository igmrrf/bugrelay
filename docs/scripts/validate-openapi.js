#!/usr/bin/env node

/**
 * Enhanced OpenAPI Specification Validator
 * 
 * This script provides comprehensive validation of the OpenAPI specification
 * including structural validation, completeness checks, and best practices.
 */

const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class EnhancedOpenAPIValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.spec = null;
  }

  async validate() {
    console.log('Running enhanced OpenAPI specification validation...');
    
    try {
      await this.loadAndValidateSpec();
      await this.validateStructure();
      await this.validateCompleteness();
      await this.validateBestPractices();
      await this.validateSecurity();
      await this.validateExamples();
      
      this.reportResults();
      
      if (this.errors.length > 0) {
        process.exit(1);
      }
      
      return true;
    } catch (error) {
      console.error('❌ OpenAPI validation failed:', error.message);
      process.exit(1);
    }
  }

  async loadAndValidateSpec() {
    const apiPath = path.join(__dirname, '../api/openapi.yaml');
    
    if (!fs.existsSync(apiPath)) {
      throw new Error('OpenAPI specification file not found');
    }
    
    // Load and parse the YAML
    const content = fs.readFileSync(apiPath, 'utf8');
    this.spec = yaml.load(content);
    
    // Validate using swagger-parser
    try {
      await SwaggerParser.validate(apiPath);
      console.log('✅ Basic OpenAPI validation passed');
    } catch (error) {
      this.errors.push(`Swagger Parser validation failed: ${error.message}`);
    }
  }

  async validateStructure() {
    console.log('Validating OpenAPI structure...');
    
    // Check required top-level fields
    this.checkRequired(this.spec, 'openapi', 'OpenAPI version');
    this.checkRequired(this.spec, 'info', 'API info section');
    this.checkRequired(this.spec, 'paths', 'API paths');
    
    // Validate info section
    if (this.spec.info) {
      this.checkRequired(this.spec.info, 'title', 'API title');
      this.checkRequired(this.spec.info, 'version', 'API version');
      this.checkRequired(this.spec.info, 'description', 'API description');
      
      if (!this.spec.info.contact) {
        this.warnings.push('Missing contact information in API info');
      }
      
      if (!this.spec.info.license) {
        this.warnings.push('Missing license information in API info');
      }
    }
    
    // Validate servers
    if (!this.spec.servers || this.spec.servers.length === 0) {
      this.warnings.push('No servers defined in OpenAPI spec');
    }
    
    // Validate components
    if (!this.spec.components) {
      this.warnings.push('No components section defined');
    } else {
      if (!this.spec.components.schemas) {
        this.warnings.push('No schemas defined in components');
      }
      
      if (!this.spec.components.securitySchemes) {
        this.warnings.push('No security schemes defined');
      }
    }
  }

  async validateCompleteness() {
    console.log('Validating API completeness...');
    
    if (!this.spec.paths) return;
    
    const paths = Object.keys(this.spec.paths);
    console.log(`Validating ${paths.length} API paths...`);
    
    for (const pathPattern of paths) {
      const pathItem = this.spec.paths[pathPattern];
      const methods = Object.keys(pathItem).filter(key => 
        ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(key)
      );
      
      for (const method of methods) {
        const operation = pathItem[method];
        this.validateOperation(operation, `${method.toUpperCase()} ${pathPattern}`);
      }
    }
  }

  validateOperation(operation, operationId) {
    // Check required operation fields
    if (!operation.summary) {
      this.warnings.push(`Missing summary for ${operationId}`);
    }
    
    if (!operation.description) {
      this.warnings.push(`Missing description for ${operationId}`);
    }
    
    if (!operation.responses) {
      this.errors.push(`Missing responses for ${operationId}`);
    } else {
      this.validateResponses(operation.responses, operationId);
    }
    
    if (!operation.tags || operation.tags.length === 0) {
      this.warnings.push(`Missing tags for ${operationId}`);
    }
    
    // Validate parameters
    if (operation.parameters) {
      this.validateParameters(operation.parameters, operationId);
    }
    
    // Validate request body
    if (operation.requestBody) {
      this.validateRequestBody(operation.requestBody, operationId);
    }
    
    // Check for operationId
    if (!operation.operationId) {
      this.warnings.push(`Missing operationId for ${operationId}`);
    }
  }

  validateResponses(responses, operationId) {
    const statusCodes = Object.keys(responses);
    
    // Check for success response
    const hasSuccessResponse = statusCodes.some(code => 
      code.startsWith('2') || code === 'default'
    );
    
    if (!hasSuccessResponse) {
      this.errors.push(`No success response defined for ${operationId}`);
    }
    
    // Check for error responses
    if (!statusCodes.includes('400') && !statusCodes.includes('default')) {
      this.warnings.push(`Missing 400 error response for ${operationId}`);
    }
    
    // Validate each response
    for (const [statusCode, response] of Object.entries(responses)) {
      if (!response.description) {
        this.errors.push(`Missing description for ${statusCode} response in ${operationId}`);
      }
      
      // Check for response content
      if (response.content) {
        this.validateResponseContent(response.content, `${operationId} ${statusCode}`);
      }
    }
  }

  validateResponseContent(content, context) {
    const mediaTypes = Object.keys(content);
    
    // Check for JSON content type
    if (!mediaTypes.includes('application/json')) {
      this.warnings.push(`Missing application/json content type in ${context}`);
    }
    
    // Validate schemas
    for (const [mediaType, mediaTypeObject] of Object.entries(content)) {
      if (!mediaTypeObject.schema) {
        this.warnings.push(`Missing schema for ${mediaType} in ${context}`);
      }
    }
  }

  validateParameters(parameters, operationId) {
    for (const [index, param] of parameters.entries()) {
      if (!param.name) {
        this.errors.push(`Parameter ${index} missing name in ${operationId}`);
      }
      
      if (!param.in) {
        this.errors.push(`Parameter ${param.name || index} missing 'in' property in ${operationId}`);
      }
      
      if (!param.description) {
        this.warnings.push(`Parameter ${param.name || index} missing description in ${operationId}`);
      }
      
      if (!param.schema && !param.content) {
        this.errors.push(`Parameter ${param.name || index} missing schema in ${operationId}`);
      }
    }
  }

  validateRequestBody(requestBody, operationId) {
    if (!requestBody.description) {
      this.warnings.push(`Missing request body description for ${operationId}`);
    }
    
    if (!requestBody.content) {
      this.errors.push(`Missing request body content for ${operationId}`);
    } else {
      this.validateResponseContent(requestBody.content, `${operationId} request body`);
    }
  }

  async validateBestPractices() {
    console.log('Validating OpenAPI best practices...');
    
    // Check API versioning
    if (this.spec.info && this.spec.info.version) {
      const version = this.spec.info.version;
      if (!version.match(/^\d+\.\d+\.\d+$/)) {
        this.warnings.push('API version should follow semantic versioning (x.y.z)');
      }
    }
    
    // Check for consistent naming
    if (this.spec.paths) {
      const paths = Object.keys(this.spec.paths);
      
      for (const path of paths) {
        // Check for consistent path naming (kebab-case)
        const pathSegments = path.split('/').filter(segment => 
          segment && !segment.startsWith('{')
        );
        
        for (const segment of pathSegments) {
          if (segment !== segment.toLowerCase()) {
            this.warnings.push(`Path segment should be lowercase: ${segment} in ${path}`);
          }
          
          if (segment.includes('_')) {
            this.warnings.push(`Path segment should use kebab-case: ${segment} in ${path}`);
          }
        }
      }
    }
    
    // Check for proper HTTP method usage
    if (this.spec.paths) {
      for (const [path, pathItem] of Object.entries(this.spec.paths)) {
        if (pathItem.get && pathItem.get.requestBody) {
          this.warnings.push(`GET request should not have request body: ${path}`);
        }
        
        if (pathItem.delete && pathItem.delete.requestBody) {
          this.warnings.push(`DELETE request should not have request body: ${path}`);
        }
      }
    }
  }

  async validateSecurity() {
    console.log('Validating security configuration...');
    
    if (!this.spec.components?.securitySchemes) {
      this.warnings.push('No security schemes defined');
      return;
    }
    
    const securitySchemes = this.spec.components.securitySchemes;
    
    // Check for JWT/Bearer token security
    const hasBearerAuth = Object.values(securitySchemes).some(scheme => 
      scheme.type === 'http' && scheme.scheme === 'bearer'
    );
    
    if (!hasBearerAuth) {
      this.warnings.push('No Bearer token authentication scheme found');
    }
    
    // Check for OAuth2 if mentioned in paths
    const hasOAuthPaths = Object.keys(this.spec.paths || {}).some(path => 
      path.includes('oauth') || path.includes('auth')
    );
    
    if (hasOAuthPaths) {
      const hasOAuth2 = Object.values(securitySchemes).some(scheme => 
        scheme.type === 'oauth2'
      );
      
      if (!hasOAuth2) {
        this.warnings.push('OAuth paths found but no OAuth2 security scheme defined');
      }
    }
    
    // Validate security requirements on operations
    if (this.spec.paths) {
      for (const [path, pathItem] of Object.entries(this.spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.security && !this.spec.security) {
              // Check if this is a public endpoint
              if (!path.includes('public') && !path.includes('health')) {
                this.warnings.push(`No security defined for ${method.toUpperCase()} ${path}`);
              }
            }
          }
        }
      }
    }
  }

  async validateExamples() {
    console.log('Validating examples in OpenAPI spec...');
    
    if (!this.spec.paths) return;
    
    let exampleCount = 0;
    let missingExamples = 0;
    
    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operationId = `${method.toUpperCase()} ${path}`;
          
          // Check for request examples
          if (operation.requestBody?.content) {
            const hasRequestExample = Object.values(operation.requestBody.content).some(content => 
              content.example || content.examples
            );
            
            if (!hasRequestExample) {
              missingExamples++;
              this.warnings.push(`Missing request example for ${operationId}`);
            } else {
              exampleCount++;
            }
          }
          
          // Check for response examples
          if (operation.responses) {
            for (const [statusCode, response] of Object.entries(operation.responses)) {
              if (response.content) {
                const hasResponseExample = Object.values(response.content).some(content => 
                  content.example || content.examples
                );
                
                if (!hasResponseExample && statusCode.startsWith('2')) {
                  missingExamples++;
                  this.warnings.push(`Missing response example for ${operationId} ${statusCode}`);
                } else if (hasResponseExample) {
                  exampleCount++;
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`Found ${exampleCount} examples, ${missingExamples} missing examples`);
  }

  checkRequired(obj, field, description) {
    if (!obj || !obj[field]) {
      this.errors.push(`Missing required field: ${description}`);
      return false;
    }
    return true;
  }

  reportResults() {
    console.log('\n=== Enhanced OpenAPI Validation Report ===\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ OpenAPI specification is comprehensive and follows best practices!');
      
      if (this.spec) {
        console.log(`\nAPI Details:`);
        console.log(`  Title: ${this.spec.info?.title}`);
        console.log(`  Version: ${this.spec.info?.version}`);
        console.log(`  Paths: ${Object.keys(this.spec.paths || {}).length}`);
        console.log(`  Schemas: ${Object.keys(this.spec.components?.schemas || {}).length}`);
        console.log(`  Security Schemes: ${Object.keys(this.spec.components?.securitySchemes || {}).length}`);
      }
      
      return;
    }
    
    if (this.errors.length > 0) {
      console.log('❌ Validation Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  Validation Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }
    
    console.log(`Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    
    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? 'passed' : 'failed'
      },
      errors: this.errors,
      warnings: this.warnings,
      spec: this.spec ? {
        title: this.spec.info?.title,
        version: this.spec.info?.version,
        pathCount: Object.keys(this.spec.paths || {}).length,
        schemaCount: Object.keys(this.spec.components?.schemas || {}).length
      } : null
    };
    
    const reportPath = path.join(__dirname, '../test-reports/openapi-validation.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }
}

// Main validation function for backward compatibility
async function validateOpenAPI() {
  const validator = new EnhancedOpenAPIValidator();
  return await validator.validate();
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateOpenAPI();
}

module.exports = validateOpenAPI;