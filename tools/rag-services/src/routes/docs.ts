/**
 * API Documentation Routes
 *
 * Serves interactive API documentation using Swagger UI
 *
 * @module routes/docs
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Load OpenAPI specification
 */
let swaggerDocument: any;

try {
  const openapiPath = join(__dirname, '../../openapi.yaml');
  const openapiContent = readFileSync(openapiPath, 'utf8');
  swaggerDocument = yaml.load(openapiContent);
  logger.info('OpenAPI specification loaded successfully');
} catch (error) {
  logger.error('Failed to load OpenAPI specification', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

/**
 * Swagger UI options
 */
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    tryItOutEnabled: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 2.5rem; }
  `,
  customSiteTitle: 'RAG Services API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * Serve Swagger UI
 */
if (swaggerDocument) {
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));
} else {
  router.get('/', (_req, res) => {
    res.status(500).json({
      error: 'API documentation not available',
      message: 'Failed to load OpenAPI specification',
    });
  });
}

/**
 * Serve raw OpenAPI spec (JSON format)
 */
router.get('/openapi.json', (_req, res) => {
  if (swaggerDocument) {
    res.json(swaggerDocument);
  } else {
    res.status(500).json({
      error: 'OpenAPI specification not available',
    });
  }
});

/**
 * Serve raw OpenAPI spec (YAML format)
 */
router.get('/openapi.yaml', (_req, res) => {
  try {
    const openapiPath = join(__dirname, '../../openapi.yaml');
    const openapiContent = readFileSync(openapiPath, 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(openapiContent);
  } catch (error) {
    res.status(500).json({
      error: 'OpenAPI specification not available',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
