#!/usr/bin/env node
/**
 * Generate Postman Collection from OpenAPI Specification
 *
 * Converts the OpenAPI YAML spec to a Postman Collection v2.1
 *
 * Usage:
 *   node scripts/generate-postman-collection.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load OpenAPI specification
 */
function loadOpenAPISpec() {
  const openapiPath = path.join(__dirname, '../openapi.yaml');
  const openapiContent = fs.readFileSync(openapiPath, 'utf8');
  return yaml.load(openapiContent);
}

/**
 * Convert OpenAPI spec to Postman Collection
 */
function convertToPostman(openapi) {
  const collection = {
    info: {
      name: openapi.info.title,
      description: openapi.info.description,
      version: openapi.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: openapi.servers[0].url,
        type: 'string'
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  // Group endpoints by tag
  const groupedEndpoints = {};

  Object.entries(openapi.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === 'parameters') return;

      const tag = operation.tags?.[0] || 'Uncategorized';

      if (!groupedEndpoints[tag]) {
        groupedEndpoints[tag] = [];
      }

      const request = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(p => p)
          }
        },
        response: []
      };

      // Add request body if present
      if (operation.requestBody) {
        const contentType = Object.keys(operation.requestBody.content)[0];
        const schema = operation.requestBody.content[contentType].schema;

        request.request.header.push({
          key: 'Content-Type',
          value: contentType
        });

        // Generate example body
        const exampleBody = generateExampleFromSchema(schema, openapi.components?.schemas);
        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(exampleBody, null, 2)
        };
      }

      // Add authentication if required
      if (operation.security) {
        request.request.auth = {
          type: 'bearer',
          bearer: [
            {
              key: 'token',
              value: '{{jwt_token}}',
              type: 'string'
            }
          ]
        };
      }

      groupedEndpoints[tag].push(request);
    });
  });

  // Convert grouped endpoints to collection items
  Object.entries(groupedEndpoints).forEach(([tag, requests]) => {
    collection.item.push({
      name: tag,
      item: requests
    });
  });

  return collection;
}

/**
 * Generate example data from JSON Schema
 */
function generateExampleFromSchema(schema, components) {
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    return generateExampleFromSchema(components[refPath], components);
  }

  if (schema.type === 'object') {
    const example = {};
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, prop]) => {
        if (schema.required?.includes(key)) {
          example[key] = generateExampleFromSchema(prop, components);
        }
      });
    }
    return example;
  }

  if (schema.type === 'array') {
    return [generateExampleFromSchema(schema.items, components)];
  }

  if (schema.enum) {
    return schema.enum[0];
  }

  // Default values by type
  const defaults = {
    string: schema.example || 'string',
    number: schema.example || 0,
    integer: schema.example || 0,
    boolean: schema.example || true
  };

  return defaults[schema.type] || null;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('Loading OpenAPI specification...');
    const openapi = loadOpenAPISpec();

    console.log('Converting to Postman Collection...');
    const collection = convertToPostman(openapi);

    const outputPath = path.join(__dirname, '../postman-collection.json');
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✓ Postman Collection generated: ${outputPath}`);
    console.log('\nTo import:');
    console.log('1. Open Postman');
    console.log('2. Click "Import" → "Upload Files"');
    console.log('3. Select postman-collection.json');
    console.log('4. Set {{jwt_token}} variable with your JWT token');
    console.log('5. Start making requests!');
  } catch (error) {
    console.error('Failed to generate Postman collection:', error.message);
    process.exit(1);
  }
}

main();
