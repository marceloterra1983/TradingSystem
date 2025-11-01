/**
 * Collection Service
 * Handles business logic for RAG collection management
 *
 * @module backend/api/documentation-api/src/services/CollectionService
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { createServiceToken } from '../../../../shared/auth/jwt.js';
import {
  ServiceUnavailableError,
  NotFoundError,
  ExternalServiceError
} from '../middleware/errorHandler.js';

/**
 * Collection Service
 * Manages RAG collections, status monitoring, and document operations
 */
export class CollectionService {
  constructor(config = {}) {
    this.queryBaseUrl = (config.queryBaseUrl || process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
    this.ingestionBaseUrl = (config.ingestionBaseUrl || process.env.LLAMAINDEX_INGESTION_URL || 'http://localhost:8201').replace(/\/+$/, '');
    this.qdrantBaseUrl = (config.qdrantBaseUrl || process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
    this.ollamaBaseUrl = (config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://rag-ollama:11434').replace(/\/+$/, '');
    this.redisUrl = (config.redisUrl || process.env.REDIS_URL || 'redis://rag-redis:6379');
    this.collectionsServiceUrl = (config.collectionsServiceUrl || process.env.COLLECTIONS_SERVICE_URL || 'http://rag-collections-service:3402').replace(/\/+$/, '');
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET_KEY || '';
    this.defaultCollection = config.defaultCollection || process.env.QDRANT_COLLECTION || 'documentation';
    this.defaultDocsDir = config.defaultDocsDir || process.env.LLAMAINDEX_DOCS_DIR || path.join(process.cwd(), '../../docs/content');

    // Status cache configuration
    this.statusCache = new Map();
    this.statusCacheTtl = Number(config.statusCacheTtl || process.env.STATUS_CACHE_TTL_MS || 30000);
  }

  /**
   * Create JWT token for service authentication
   * @private
   */
  _createToken(additionalClaims = {}) {
    if (!this.jwtSecret) return null;
    try {
      return createServiceToken('documentation-api', this.jwtSecret, additionalClaims, { expiresIn: 600 });
    } catch (error) {
      console.error('Failed to create JWT token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to upstream service
   * @private
   */
  async _fetchJson(url, options = {}) {
    try {
      const response = await fetch(url, { timeout: 7000, ...options });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      throw new ExternalServiceError('Upstream service', error);
    }
  }

  /**
   * Get cached status or return null if expired
   * @private
   */
  _getCachedStatus(collection) {
    const key = collection.toLowerCase();
    const cached = this.statusCache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.statusCacheTtl) {
      this.statusCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache status data
   * @private
   */
  _setCachedStatus(collection, data) {
    const key = collection.toLowerCase();
    this.statusCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate status cache for a collection
   */
  invalidateCache(collection = null) {
    if (collection) {
      const key = collection.toLowerCase();
      this.statusCache.delete(key);
    } else {
      this.statusCache.clear();
    }
  }

  /**
   * Get health status of RAG services
   */
  async getHealth() {
    const timestamp = new Date().toISOString();

    // Check all RAG services
    const [queryHealth, ingestionHealth, ollamaHealth, redisHealth, collectionsHealth] = await Promise.allSettled([
      this._fetchJson(`${this.queryBaseUrl}/health`),
      this._fetchJson(`${this.ingestionBaseUrl}/health`),
      this._fetchJson(`${this.ollamaBaseUrl}/api/tags`), // Ollama doesn't have /health, use /api/tags
      this._checkRedisHealth(),
      this._fetchJson(`${this.collectionsServiceUrl}/health`),
    ]);

    const buildMessage = (source) => {
      if (!source || source.status === 'rejected') return 'unavailable';
      const value = source.value || source;
      if (!value) return 'unavailable';
      if (value.ok) {
        const data = value.data || {};
        return data.message || data.status || 'ok';
      }
      return value.error || (value.data && (value.data.message || value.data.detail)) || 'unavailable';
    };

    const safeValue = (result) => result.status === 'fulfilled' ? result.value : null;

    return {
      timestamp,
      services: {
        query: {
          ok: queryHealth.status === 'fulfilled' && queryHealth.value.ok && (queryHealth.value.data?.status || '').toLowerCase() !== 'missing',
          status: queryHealth.status === 'fulfilled' ? queryHealth.value.status : 503,
          message: buildMessage(queryHealth),
          collection: queryHealth.status === 'fulfilled' ? (queryHealth.value.data?.collection ?? queryHealth.value.data?.configuredCollection ?? null) : null,
        },
        ingestion: {
          ok: ingestionHealth.status === 'fulfilled' && ingestionHealth.value.ok && (ingestionHealth.value.data?.status || '').toLowerCase() !== 'degraded',
          status: ingestionHealth.status === 'fulfilled' ? ingestionHealth.value.status : 503,
          message: buildMessage(ingestionHealth),
        },
        ollama: {
          ok: ollamaHealth.status === 'fulfilled' && ollamaHealth.value.ok,
          status: ollamaHealth.status === 'fulfilled' ? ollamaHealth.value.status : 503,
          message: ollamaHealth.status === 'fulfilled' && ollamaHealth.value.ok 
            ? `${ollamaHealth.value.data?.models?.length || 0} modelo(s)` 
            : 'unavailable',
        },
        redis: {
          ok: redisHealth.status === 'fulfilled' && redisHealth.value.ok,
          status: redisHealth.status === 'fulfilled' ? redisHealth.value.status : 503,
          message: buildMessage(redisHealth),
        },
        collections: {
          ok: collectionsHealth.status === 'fulfilled' && collectionsHealth.value.ok,
          status: collectionsHealth.status === 'fulfilled' ? collectionsHealth.value.status : 503,
          message: buildMessage(collectionsHealth),
        },
      },
    };
  }

  /**
   * Check Redis health via Collections Service
   * (Collections Service uses Redis, so if it's healthy, Redis is working)
   * @private
   */
  async _checkRedisHealth() {
    try {
      // Check if Collections Service can connect to Redis
      // Collections Service has Redis dependency, so if it's up, Redis is working
      const response = await this._fetchJson(`${this.collectionsServiceUrl}/health`);
      
      if (response.ok) {
        return {
          ok: true,
          status: 200,
          data: { status: 'ok', message: 'connected' }
        };
      }
      
      return {
        ok: false,
        status: response.status,
        data: { status: 'degraded', message: 'Redis may be unavailable' }
      };
    } catch (error) {
      return {
        ok: false,
        status: 503,
        data: { status: 'error', message: 'unavailable' }
      };
    }
  }

  /**
   * Get detailed status for a collection
   */
  async getCollectionStatus(collectionName = null) {
    const targetCollection = collectionName || this.defaultCollection;

    // Check cache first
    const cached = this._getCachedStatus(targetCollection);
    if (cached) {
      return { ...cached, cached: true };
    }

    const timestamp = new Date().toISOString();

    // Get health status
    const health = await this.getHealth();

    // Get Qdrant collection count
    const qdrantCount = await this._fetchJson(
      `${this.qdrantBaseUrl}/collections/${encodeURIComponent(targetCollection)}/points/count`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exact: true }),
      }
    );

    // Get GPU policy
    let gpuPolicy = null;
    const jwt = this._createToken();
    if (jwt) {
      const headers = { Authorization: `Bearer ${jwt}` };
      const gpuResp = await this._fetchJson(`${this.queryBaseUrl}/gpu/policy`, { headers });
      if (gpuResp.ok) gpuPolicy = gpuResp.data;
    }

    // Extract count
    let indexedCount = null;
    const countData = qdrantCount.data?.result?.count;
    if (typeof countData === 'number') {
      indexedCount = countData;
    } else if (countData && typeof countData.count === 'number') {
      indexedCount = countData.count;
    }

    const responsePayload = {
      timestamp,
      requestedCollection: targetCollection,
      services: health.services,
      qdrant: {
        collection: targetCollection,
        ok: qdrantCount.ok,
        status: qdrantCount.status,
        count: indexedCount,
      },
      gpuPolicy,
      cached: false,
    };

    // Cache the response
    this._setCachedStatus(targetCollection, responsePayload);

    return responsePayload;
  }

  /**
   * Trigger document ingestion for a collection
   */
  async ingestDocuments(options = {}) {
    const {
      collectionName,
      embeddingModel,
      chunkSize,
      chunkOverlap,
      directoryPath,
    } = options;

    const ingestPayload = {
      directory_path: directoryPath || this.defaultDocsDir,
    };

    if (collectionName) {
      ingestPayload.collection_name = collectionName;
    }
    if (embeddingModel) {
      ingestPayload.embedding_model = embeddingModel;
    }
    if (chunkSize !== null && chunkSize !== undefined) {
      ingestPayload.chunk_size = Number(chunkSize);
    }
    if (chunkOverlap !== null && chunkOverlap !== undefined) {
      ingestPayload.chunk_overlap = Number(chunkOverlap);
    }

    try {
      const response = await fetch(`${this.ingestionBaseUrl}/ingest/directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestPayload),
        timeout: 60000,
      });

      const text = await response.text();

      if (!response.ok) {
        throw new ExternalServiceError(
          'Ingestion service',
          new Error(text || 'Ingestion failed'),
          { statusCode: response.status }
        );
      }

      let responsePayload;
      try {
        responsePayload = text ? JSON.parse(text) : null;
      } catch {
        responsePayload = { raw: text };
      }

      // Invalidate cache after ingestion
      this.invalidateCache(collectionName);

      return {
        success: true,
        message: 'Ingestion triggered successfully',
        data: responsePayload,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ServiceUnavailableError('Ingestion service', {
        originalError: error.message,
      });
    }
  }

  /**
   * Clean orphan chunks from a collection
   */
  async cleanOrphanChunks(collectionName = null) {
    const targetCollection = collectionName || this.defaultCollection;

    // Get all points from Qdrant
    let allPoints = [];
    let scrollOffset = null;
    let iterations = 0;

    do {
      const payload = { limit: 1000, with_payload: true };
      if (scrollOffset) payload.offset = scrollOffset;

      const page = await this._fetchJson(
        `${this.qdrantBaseUrl}/collections/${encodeURIComponent(targetCollection)}/points/scroll`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!page.ok) break;

      const points = Array.isArray(page.data?.result?.points) ? page.data.result.points : [];
      allPoints = allPoints.concat(points);

      scrollOffset = page.data?.result?.next_page_offset || null;
      iterations += 1;

      if (!scrollOffset || iterations > 100) break;
    } while (true);

    // Get existing files on disk
    const docsDir = this.defaultDocsDir;
    const discoverFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const resPath = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            return discoverFiles(resPath);
          }
          if (entry.isFile() && /\.(md|mdx|txt|pdf)$/i.test(entry.name)) {
            return resPath;
          }
          return [];
        })
      );
      return files.flat();
    };

    const allDocs = await discoverFiles(docsDir);
    const toRelative = (filePath) => path.relative(docsDir, filePath).replace(/\\/g, '/');
    const existingFiles = new Set(allDocs.map(toRelative));

    // Find orphan point IDs
    const orphanIds = [];
    for (const point of allPoints) {
      const filePath = point.payload?.file_path || point.payload?.path || null;
      if (!filePath) continue;

      // Normalize path
      let normalized = filePath.replace(/\\/g, '/');
      const docsPos = normalized.lastIndexOf('/docs/');
      if (docsPos >= 0) {
        normalized = normalized.slice(docsPos + '/docs/'.length);
      } else if (normalized.startsWith('/data/docs/')) {
        normalized = normalized.slice('/data/docs/'.length);
      } else if (normalized.startsWith('/')) {
        normalized = normalized.slice(1);
      }

      if (/\.(md|mdx|txt|pdf)$/i.test(normalized) && !existingFiles.has(normalized)) {
        orphanIds.push(point.id);
      }
    }

    // Delete orphan points
    if (orphanIds.length > 0) {
      const deleteResult = await this._fetchJson(
        `${this.qdrantBaseUrl}/collections/${encodeURIComponent(targetCollection)}/points/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: orphanIds }),
        }
      );

      // Invalidate cache after cleanup
      if (deleteResult.ok) {
        this.invalidateCache(targetCollection);
      }

      return {
        success: deleteResult.ok,
        orphansFound: orphanIds.length,
        orphansDeleted: deleteResult.ok ? orphanIds.length : 0,
      };
    }

    return {
      success: true,
      orphansFound: 0,
      orphansDeleted: 0,
    };
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName) {
    if (!collectionName || collectionName.trim().length === 0) {
      throw new Error('Collection name is required');
    }

    try {
      const response = await fetch(
        `${this.ingestionBaseUrl}/documents/${encodeURIComponent(collectionName)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = raw;
      }

      if (!response.ok) {
        throw new ExternalServiceError(
          'Ingestion service',
          new Error(payload?.message || 'Delete failed'),
          { statusCode: response.status }
        );
      }

      // Invalidate cache after deletion
      this.invalidateCache(collectionName);

      return {
        success: true,
        collection: collectionName,
        message: payload?.message || `Collection ${collectionName} deleted successfully`,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ServiceUnavailableError('Ingestion service', {
        originalError: error.message,
      });
    }
  }

  /**
   * List all available collections
   */
  async listCollections() {
    try {
      const response = await this._fetchJson(`${this.qdrantBaseUrl}/collections`);

      if (!response.ok) {
        throw new ServiceUnavailableError('Qdrant', {
          statusCode: response.status,
        });
      }

      const collections = Array.isArray(response.data?.result?.collections)
        ? response.data.result.collections
        : [];

      return {
        success: true,
        collections: collections.map(col => ({
          name: col?.name || col,
          // Additional collection metadata can be added here
        })),
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ExternalServiceError('Qdrant', error);
    }
  }

  /**
   * Fetch collection configuration from Collections Service
   */
  async getCollectionDefinition(collectionName) {
    if (!collectionName) {
      throw new NotFoundError('Collection name is required');
    }

    const target = collectionName.trim();
    if (!target) {
      throw new NotFoundError('Collection name is required');
    }

    const url = `${this.collectionsServiceUrl}/api/v1/rag/collections/${encodeURIComponent(target)}`;

    try {
      const response = await this._fetchJson(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Collection '${target}' not found`);
        }
        throw new ExternalServiceError('Collections service', new Error('Failed to fetch collection metadata'), {
          statusCode: response.status,
        });
      }

      const data = response.data?.data ?? response.data;
      return {
        ...data,
        name: data?.name ?? target,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Collections service', error);
    }
  }
}

export default CollectionService;
