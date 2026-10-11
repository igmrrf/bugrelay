#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

/**
 * Convert OpenAPI YAML to JSON format
 */
function generateOpenAPIJSON() {
  const yamlPath = join(__dirname, "../api/openapi.yaml");
  const jsonPath = join(__dirname, "../api/openapi.json");

  try {
    // Read YAML file
    const yamlContent = readFileSync(yamlPath, "utf8");

    // Parse YAML to JavaScript object
    const apiSpec = load(yamlContent);

    // Convert to JSON with pretty formatting
    const jsonContent = JSON.stringify(apiSpec, null, 2);

    // Write JSON file
    writeFileSync(jsonPath, jsonContent, "utf8");

    console.log("✅ Generated openapi.json from openapi.yaml");
    console.log(`📄 Output: ${jsonPath}`);

    // Validate the generated JSON
    try {
      JSON.parse(jsonContent);
      console.log("✅ Generated JSON is valid");
    } catch (error) {
      console.error("❌ Generated JSON is invalid:", error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error generating OpenAPI JSON:", error.message);
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  generateOpenAPIJSON();
}

export default { generateOpenAPIJSON };

