#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Convert OpenAPI YAML to JSON format
 */
function generateOpenAPIJSON() {
  const yamlPath = path.join(__dirname, '../api/openapi.yaml');
  const jsonPath = path.join(__dirname, '../api/openapi.json');
  
  try {
    // Read YAML file
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    
    // Parse YAML to JavaScript object
    const apiSpec = yaml.load(yamlContent);
    
    // Convert to JSON with pretty formatting
    const jsonContent = JSON.stringify(apiSpec, null, 2);
    
    // Write JSON file
    fs.writeFileSync(jsonPath, jsonContent, 'utf8');
    
    console.log('✅ Generated openapi.json from openapi.yaml');
    console.log(`📄 Output: ${jsonPath}`);
    
    // Validate the generated JSON
    try {
      JSON.parse(jsonContent);
      console.log('✅ Generated JSON is valid');
    } catch (error) {
      console.error('❌ Generated JSON is invalid:', error.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error generating OpenAPI JSON:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateOpenAPIJSON();
}

module.exports = { generateOpenAPIJSON };