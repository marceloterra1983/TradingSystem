/**
 * Query Routes
 *
 * Semantic search endpoints using Qdrant vector similarity
 * Bypasses LlamaIndex to avoid LLM overhead (embeddings only)
 *
 * @module routes/query
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';
import { getCacheService } from '../services/cacheService';
import { collectionManager } from '../services/collectionManager';

const router = Router();

// UPDATED 2025-11-03: Support for Qdrant Cluster via load balancer
const QDRANT_URL = process.env.QDRANT_CLUSTER_ENABLED === 'true' 
  ? (process.env.QDRANT_CLUSTER_URL || 'http://qdrant-lb:80')
  : (process.env.QDRANT_URL || 'http://data-qdrant:6333');

const OLLAMA_URL = process.env.OLLAMA_EMBEDDINGS_URL || 'http://rag-ollama:11434';
const DEFAULT_EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

interface RagQueryRequestBody {
  query?: unknown;
  collection?: string;
  limit?: number;
  score_threshold?: number;
}

interface QueryResultMetadata {
  file_path?: string;
  file_name?: string;
  chunk_index?: number;
  chunk_total?: number;
  last_modified?: string;
  tags?: string[];
}

interface QueryResultItem {
  id: string | number;
  score: number;
  title: string;
  path: string;
  url: string;
  snippet: string;
  source: 'rag';
  collection: string;
  metadata: QueryResultMetadata;
}

interface QueryCachePayload {
  query: string;
  results: QueryResultItem[];
  totalResults: number;
  collection: string;
  embeddingModel: string;
  performance: {
    totalMs: number;
    embeddingMs: number;
    searchMs: number;
  };
  cached?: boolean;
}

/**
 * Generate embedding for query using Ollama
 */
async function generateEmbedding(query: string, model: string): Promise<number[]> {
  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/embeddings`,
      {
        model,
        prompt: query,
      },
      {
        timeout: 30000, // 30s timeout for embedding generation
      }
    );

    if (!response.data || !response.data.embedding) {
      throw new Error('Invalid embedding response from Ollama');
    }

    return response.data.embedding;
  } catch (error) {
    logger.error('Failed to generate embedding', {
      error: error instanceof Error ? error.message : 'Unknown error',
      model,
    });
    throw new Error('Embedding generation failed');
  }
}

/**
 * Search Qdrant collection with embedding vector
 */
async function searchQdrant(
  collectionName: string,
  embedding: number[],
  limit: number,
  scoreThreshold: number
): Promise<any[]> {
  try {
    const response = await axios.post(
      `${QDRANT_URL}/collections/${collectionName}/points/search`,
      {
        vector: embedding,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false,
      },
      {
        timeout: 10000, // 10s timeout for search
      }
    );

    return response.data.result || [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      logger.warn('Collection not found in Qdrant', { collection: collectionName });
      return [];
    }
    logger.error('Failed to search Qdrant', {
      error: error instanceof Error ? error.message : 'Unknown error',
      collection: collectionName,
    });
    throw new Error('Vector search failed');
  }
}

/**
 * POST /api/v1/rag/query
 * Semantic search using direct Qdrant vector similarity
 * (Bypasses LlamaIndex to avoid LLM overhead)
 */
router.post('/query', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const {
      query,
      collection = 'documentation',
      limit = 10,
      score_threshold = 0.7,
    } = (req.body ?? {}) as RagQueryRequestBody;

    // Validation
    if (!query || typeof query !== 'string') {
      return sendError(res, 'INVALID_QUERY', 'Query is required and must be a string', 400);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return sendError(res, 'QUERY_TOO_SHORT', 'Query must be at least 2 characters', 400);
    }

    if (trimmedQuery.length > 500) {
      return sendError(res, 'QUERY_TOO_LONG', 'Query must be less than 500 characters', 400);
    }

    if (limit > 100) {
      return sendError(res, 'LIMIT_EXCEEDED', 'Limit must be <= 100', 400);
    }

    logger.info('Executing RAG query', {
      query: trimmedQuery.substring(0, 100),
      collection,
      limit,
      score_threshold,
    });

    // Check cache first
    const cacheService = getCacheService();
    const cacheKey = `query:${crypto
      .createHash('md5')
      .update(`${trimmedQuery}:${collection}:${limit}:${score_threshold}`)
      .digest('hex')}`;

    if (cacheService.isAvailable()) {
      const cached = await cacheService.get<QueryCachePayload>(cacheKey);
      if (cached) {
        logger.debug('Returning cached query results', { query: trimmedQuery, collection });
        return sendSuccess(res, {
          ...cached,
          cached: true,
        });
      }
    }

    // Get collection config to determine embedding model
    const collectionConfig = collectionManager.getCollection(collection);
    const embeddingModel = collectionConfig?.embeddingModel || DEFAULT_EMBEDDING_MODEL;

    // Determine Qdrant collection name (may have model suffix)
    const qdrantCollectionName = collectionConfig?.name || collection;

    logger.debug('Query configuration', {
      collection,
      qdrantCollection: qdrantCollectionName,
      embeddingModel,
    });

    // Step 1: Generate embedding for query
    const embeddingStart = Date.now();
    const embedding = await generateEmbedding(trimmedQuery, embeddingModel);
    const embeddingTime = Date.now() - embeddingStart;

    logger.debug('Embedding generated', {
      embeddingTime,
      vectorSize: embedding.length,
    });

    // Step 2: Search Qdrant with embedding
    const searchStart = Date.now();
    const searchResults = await searchQdrant(
      qdrantCollectionName,
      embedding,
      limit,
      score_threshold
    );
    const searchTime = Date.now() - searchStart;

    logger.debug('Qdrant search completed', {
      searchTime,
      resultsCount: searchResults.length,
    });

    // Step 3: Format results
    const formattedResults: QueryResultItem[] = searchResults.map((result) => {
      // Parse _node_content to get text chunk
      let textSnippet = '';
      let title = result.payload?.file_name || 'Untitled';
      
      if (result.payload?._node_content) {
        try {
          const nodeContent = JSON.parse(result.payload._node_content);
          textSnippet = nodeContent.text || '';
          // Use file_name from metadata as title
          title = nodeContent.metadata?.file_name || result.payload.file_name || 'Untitled';
        } catch (e) {
          logger.warn('Failed to parse _node_content', { id: result.id });
        }
      }

      // Normalize path for frontend (remove /data/docs prefix)
      const filePath = result.payload?.file_path || '';
      const normalizedPath = filePath.replace(/^\/data\/docs\/content\//, '').replace(/^\/data\/docs\//, '');

      return {
        id: result.id,
        score: result.score,
        title,
        path: normalizedPath,
        url: `/docs/${normalizedPath}`,  // Docusaurus URL format
        snippet: textSnippet.substring(0, 300),  // First 300 chars
        source: 'rag' as const,
        collection: qdrantCollectionName,
        metadata: {
          file_path: filePath,
          file_name: result.payload?.file_name,
          chunk_index: result.payload?.chunk_index,
          chunk_total: result.payload?.chunk_total,
          last_modified: result.payload?.last_modified_date,
          tags: [] as string[],
        },
      };
    });

    const executionTimeMs = Date.now() - startTime;

    const results: QueryCachePayload = {
      query: trimmedQuery,
      results: formattedResults,
      totalResults: formattedResults.length,
      collection: qdrantCollectionName,
      embeddingModel,
      performance: {
        totalMs: executionTimeMs,
        embeddingMs: embeddingTime,
        searchMs: searchTime,
      },
    };

    // Cache for 5 minutes
    if (cacheService.isAvailable()) {
      await cacheService.set(cacheKey, results, 300);
    }

    logger.info('RAG query completed successfully', {
      query: trimmedQuery.substring(0, 100),
      resultsCount: formattedResults.length,
      executionTimeMs,
    });

    return sendSuccess(res, results);
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    logger.error('RAG query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs,
    });

    // Specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Embedding generation failed')) {
        return sendError(res, 'EMBEDDING_FAILED', 'Failed to generate query embedding', 503);
      }
      if (error.message.includes('Vector search failed')) {
        return sendError(res, 'SEARCH_FAILED', 'Vector search in Qdrant failed', 503);
      }
    }

    // Check if it's a timeout
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return sendError(res, 'QUERY_TIMEOUT', 'Query timed out', 504);
    }

    return sendError(res, 'QUERY_FAILED', 'Failed to execute query', 500);
  }
});

export default router;
