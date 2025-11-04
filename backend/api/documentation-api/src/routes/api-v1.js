/**
 * API v1 Router - Versioned API endpoints
 * Wraps all existing routes under /api/v1 prefix
 * 
 * @module backend/api/documentation-api/src/routes/api-v1
 */

import express from 'express';
import ragProxyRouter from './rag-proxy.js';
import ragStatusRouter from './rag-status.js';
import ragCollectionsRouter from './rag-collections.js';

const router = express.Router();

/**
 * API v1 Routes
 * Base path: /api/v1
 */

// RAG Proxy endpoints (search, query, GPU policy)
router.use('/rag', ragProxyRouter);

// RAG Status endpoints (health, diagnostics)
router.use('/rag/status', ragStatusRouter);

// RAG Collections endpoints (collections management - proxied)
router.use('/rag/collections', ragCollectionsRouter);

/**
 * API Version Info
 * GET /api/v1
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      version: 'v1',
      status: 'stable',
      description: 'RAG Services API version 1',
      endpoints: {
        rag: '/api/v1/rag',
        collections: '/api/v1/rag/collections',
        status: '/api/v1/rag/status',
      },
      documentation: {
        openapi: '/specs/rag-services-v1.yaml',
        interactive: '/api/rag-services',
        guide: '/api-docs',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  });
});

export default router;

