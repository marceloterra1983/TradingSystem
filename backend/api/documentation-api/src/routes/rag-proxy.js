import express from 'express';
import { RagProxyService } from '../services/RagProxyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize service (singleton pattern)
const ragProxyService = new RagProxyService({
  queryBaseUrl: process.env.LLAMAINDEX_QUERY_URL,
  jwtSecret: process.env.JWT_SECRET_KEY,
  timeout: Number(process.env.RAG_TIMEOUT_MS) || 30000,
});

/**
 * GET /api/v1/rag/search
 * Semantic search across documentation
 */
router.get('/search', asyncHandler(async (req, res) => {
  const query = (req.query.query || req.query.q || '').toString();
  const maxResults = parseInt((req.query.max_results || req.query.k || '5').toString(), 10);
  const collection = (req.query.collection || req.query.col || '').toString().trim() || null;

  const result = await ragProxyService.search(query, maxResults, collection);
  res.json(result);
}));

/**
 * POST /api/v1/rag/query
 * Question answering with context retrieval
 */
router.post('/query', asyncHandler(async (req, res) => {
  const { query, max_results, collection } = req.body || {};

  const result = await ragProxyService.query(query, max_results, collection || null);
  res.json(result);
}));

/**
 * GET /api/v1/rag/gpu/policy
 * Get GPU scheduling policy
 */
router.get('/gpu/policy', asyncHandler(async (_req, res) => {
  const result = await ragProxyService.getGpuPolicy();
  res.json(result);
}));

export default router;
