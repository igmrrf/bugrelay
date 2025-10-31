#!/usr/bin/env node

/**
 * JSON Schema Generator
 * 
 * This script generates JSON Schema definitions from Go model structs
 * for use in API documentation and validation.
 */

const fs = require('fs');
const path = require('path');

class SchemaGenerator {
  constructor() {
    this.schemas = {};
  }

  async generate() {
    console.log('Generating JSON schemas from Go models...');
    
    await this.analyzeModels();
    await this.writeSchemas();
    
    console.log('JSON schemas generated successfully!');
  }

  async analyzeModels() {
    // TODO: Implement Go struct analysis from backend/internal/models
    console.log('Analyzing Go model structs...');
    
    // Placeholder schemas based on the models we know exist
    this.schemas = {
      User: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        title: 'User',
        description: 'User account information',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            description: 'Unique username'
          },
          first_name: {
            type: 'string',
            maxLength: 100,
            description: 'User first name'
          },
          last_name: {
            type: 'string',
            maxLength: 100,
            description: 'User last name'
          },
          is_verified: {
            type: 'boolean',
            description: 'Whether the user email is verified'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin', 'company_admin'],
            description: 'User role in the system'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'email', 'username', 'role', 'created_at']
      },
      
      BugReport: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        title: 'BugReport',
        description: 'Bug report information',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique bug report identifier'
          },
          title: {
            type: 'string',
            maxLength: 255,
            description: 'Bug report title'
          },
          description: {
            type: 'string',
            description: 'Detailed bug description'
          },
          status: {
            type: 'string',
            enum: ['open', 'reviewing', 'fixed', 'wont_fix'],
            description: 'Current status of the bug report'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Bug priority level'
          },
          vote_count: {
            type: 'integer',
            minimum: 0,
            description: 'Number of votes for this bug'
          },
          reporter_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the user who reported the bug'
          },
          application_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the application this bug affects'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Bug report creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'title', 'description', 'status', 'application_id', 'created_at']
      }
    };
  }

  async writeSchemas() {
    const outputPath = path.join(__dirname, '../models/schema.json');
    const schemaContent = JSON.stringify(this.schemas, null, 2);
    
    fs.writeFileSync(outputPath, schemaContent);
    console.log(`JSON schemas written to ${outputPath}`);
  }
}

// Run the generator
if (require.main === module) {
  const generator = new SchemaGenerator();
  generator.generate().catch(console.error);
}

module.exports = SchemaGenerator;