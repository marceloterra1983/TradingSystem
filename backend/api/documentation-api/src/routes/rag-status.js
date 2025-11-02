/**
 * RAG Status Routes (Refactored)
 * Uses CollectionService for business logic
 */

import express from 'express';
import { CollectionService } from '../services/CollectionService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize service (singleton pattern)
const collectionService = new CollectionService({
  queryBaseUrl: process.env.LLAMAINDEX_QUERY_URL,
  ingestionBaseUrl: process.env.LLAMAINDEX_INGESTION_URL,
  qdrantBaseUrl: process.env.QDRANT_URL,
  jwtSecret: process.env.JWT_SECRET_KEY,
  defaultCollection: process.env.QDRANT_COLLECTION,
  defaultDocsDir: process.env.LLAMAINDEX_DOCS_DIR,
  statusCacheTtl: Number(process.env.STATUS_CACHE_TTL_MS) || 30000,
});

/**
 * GET /api/v1/rag/status
 * Get comprehensive RAG system status
 *
 * Query params:
 * - collection: Collection name (optional, defaults to env variable)
 */
router.get('/status', asyncHandler(async (req, res) => {
  const collection = (req.query.collection || req.query.col || '').toString().trim() || null;

  const status = await collectionService.getCollectionStatus(collection);
  res.json(status);
}));

/**
 * GET /api/v1/rag/status/health
 * Lightweight health probe used by container orchestration
 */
router.get('/status/health', asyncHandler(async (_req, res) => {
  const status = await collectionService.getCollectionStatus(null);
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    services: status?.services ?? {},
    qdrant: {
      ok: status?.qdrant?.ok ?? false,
      collection: status?.qdrant?.collection ?? null,
      count: status?.qdrant?.count ?? null,
    },
  });
}));

/**
 * POST /api/v1/rag/ingest
 * Trigger document ingestion
 *
 * Body:
 * - collection_name: Collection name (optional)
 * - embedding_model: Embedding model to use (optional)
 * - chunk_size: Chunk size for documents (optional)
 * - chunk_overlap: Chunk overlap (optional)
 * - directory_path: Directory to ingest (optional)
 */
router.post('/ingest', asyncHandler(async (req, res) => {
  const {
    collection_name,
    collection,
    collectionName,
    embedding_model,
    chunk_size,
    chunk_overlap,
    directory_path,
  } = req.body || {};

  // Normalize collection name from various possible field names
  const normalizedCollectionName = collection_name || collection || collectionName || null;

  const result = await collectionService.ingestDocuments({
    collectionName: normalizedCollectionName,
    embeddingModel: embedding_model,
    chunkSize: chunk_size,
    chunkOverlap: chunk_overlap,
    directoryPath: directory_path,
  });

  res.json(result);
}));

/**
 * POST /api/v1/rag/clean-orphans
 * Clean orphan chunks (indexed but file deleted)
 *
 * Body/Query:
 * - collection: Collection name (optional)
 */
router.post('/clean-orphans', asyncHandler(async (req, res) => {
  const collection =
    req.body?.collection ||
    req.query?.collection ||
    null;

  const result = await collectionService.cleanOrphanChunks(collection);

  const message = result.orphansDeleted > 0
    ? `${result.orphansDeleted} chunks órfãos removidos com sucesso.`
    : 'Nenhum chunk órfão encontrado.';

  res.json({
    success: result.success,
    message,
    orphansFound: result.orphansFound,
    orphansDeleted: result.orphansDeleted,
    collection,
  });
}));

/**
 * DELETE /api/v1/rag/collection/:collection
 * Delete a collection
 *
 * Params:
 * - collection: Collection name
 */
router.delete('/collection/:collection', asyncHandler(async (req, res) => {
  const collection = req.params.collection;

  if (!collection || collection.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Collection name is required',
    });
  }

  const result = await collectionService.deleteCollection(collection);
  res.json(result);
}));

/**
 * GET /api/v1/rag/collections
 * List all available collections
 */
router.get('/collections', asyncHandler(async (_req, res) => {
  const result = await collectionService.listCollections();
  res.json(result);
}));

/**
 * POST /api/v1/rag/cache/invalidate
 * Manually invalidate status cache
 *
 * Body:
 * - collection: Collection name (optional, invalidates all if not provided)
 */
router.post('/cache/invalidate', asyncHandler(async (req, res) => {
  const collection = req.body?.collection || null;

  collectionService.invalidateCache(collection);

  res.json({
    success: true,
    message: collection
      ? `Cache invalidated for collection: ${collection}`
      : 'All caches invalidated',
  });
}));

export default router;
