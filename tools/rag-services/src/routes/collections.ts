/**
 * Collections Routes
 *
 * RESTful API endpoints for managing RAG collections
 * Provides CRUD operations and collection statistics
 *
 * @module routes/collections
 */

import { Router, Request, Response } from 'express';
import { collectionManager } from '../services/collectionManager';
import { fileWatcherService } from '../services/fileWatcher';
import { ingestionService } from '../services/ingestionService';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';
import { validate } from '../middleware/validation';
import {
  createCollectionSchema,
  updateCollectionSchema,
  statsQuerySchema,
} from '../schemas/collection';

const router = Router();

/**
 * GET /api/v1/rag/collections
 * List all collections
 * Query Parameters:
 * - useCache: boolean (default: true) - Whether to use cached stats
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const useCache = req.query.useCache !== 'false'; // Default true, false if explicitly set
    
    logger.info('Listing all collections', { useCache });

    const collections = collectionManager.getCollections();

    // Enrich with real-time stats from Qdrant
    const collectionsWithStats = await Promise.all(
      collections.map(async (collection) => {
        try {
          const { qdrant, metrics } = await collectionManager.getCollectionStats(collection.name, useCache);

          const qdrantResult = qdrant?.result ?? {};

          return {
            ...collection,
            stats: {
              vectorsCount: qdrantResult.vectors_count ?? metrics.chunkCount,
              pointsCount: qdrantResult.points_count ?? metrics.chunkCount,
              segmentsCount: qdrantResult.segments_count ?? 0,
              status: qdrantResult.status ?? (qdrant ? 'ready' : 'missing'),
              totalFiles: metrics.totalFiles,
              indexedFiles: metrics.indexedFiles,
              pendingFiles: metrics.pendingFiles,
              orphanChunks: metrics.orphanChunks,
              chunkCount: metrics.chunkCount,
              directorySizeBytes: metrics.directorySizeBytes,
              directorySizeMB: metrics.directorySizeMB,
            },
          };
        } catch (error) {
          logger.warn('Failed to get stats for collection', {
            collection: collection.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return {
            ...collection,
            stats: null,
          };
        }
      }),
    );

    return sendSuccess(res, {
      collections: collectionsWithStats,
      total: collectionsWithStats.length,
    });
  } catch (error) {
    logger.error('Failed to list collections', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTIONS_LIST_ERROR', 'Failed to list collections', 500);
  }
});

/**
 * GET /api/v1/rag/collections/:name
 * Get a specific collection
 */
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Getting collection', { collection: name });

    const collection = collectionManager.getCollection(name);

    if (!collection) {
      return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
    }

    // Get real-time stats from Qdrant
    let stats = null;
    try {
      const { qdrant, metrics } = await collectionManager.getCollectionStats(name);
      const qdrantResult = qdrant?.result ?? {};
      stats = {
        vectorsCount: qdrantResult.vectors_count ?? metrics.chunkCount,
        pointsCount: qdrantResult.points_count ?? metrics.chunkCount,
        segmentsCount: qdrantResult.segments_count ?? 0,
        status: qdrantResult.status ?? (qdrant ? 'ready' : 'missing'),
        config: qdrantResult.config || null,
        totalFiles: metrics.totalFiles,
        indexedFiles: metrics.indexedFiles,
        pendingFiles: metrics.pendingFiles,
        orphanChunks: metrics.orphanChunks,
        chunkCount: metrics.chunkCount,
        directorySizeBytes: metrics.directorySizeBytes,
        directorySizeMB: metrics.directorySizeMB,
      };
    } catch (error) {
      logger.warn('Failed to get stats for collection', {
        collection: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return sendSuccess(res, {
      ...collection,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get collection', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_GET_ERROR', 'Failed to get collection', 500);
  }
});

/**
 * POST /api/v1/rag/collections
 * Create a new collection
 */
router.post('/', validate({ body: createCollectionSchema }), async (req: Request, res: Response) => {
  try {
    const collectionConfig = req.body;

    logger.info('Creating collection', { collection: collectionConfig.name });

    // Check if collection already exists
    const existing = collectionManager.getCollection(collectionConfig.name);
    if (existing) {
      return sendError(
        res,
        'COLLECTION_ALREADY_EXISTS',
        'Collection already exists: ' + collectionConfig.name,
        409,
      );
    }

    // Create collection in Qdrant
    await collectionManager.createCollection(collectionConfig);

    // Register collection in memory
    await collectionManager.registerCollection(collectionConfig);

    logger.info('Collection created successfully (indexing must be triggered manually)', {
      collection: collectionConfig.name,
      directory: collectionConfig.directory,
    });

    // Reload file watcher to pick up new collection (if auto-update enabled)
    if (collectionConfig.autoUpdate) {
      try {
        await fileWatcherService.stop();
        await fileWatcherService.start();
        logger.info('File watcher reloaded for new collection', {
          collection: collectionConfig.name,
        });
      } catch (watcherError) {
        logger.warn('Failed to reload file watcher', {
          error: watcherError instanceof Error ? watcherError.message : 'Unknown error',
        });
      }
    }

    return sendSuccess(
      res,
      {
        collection: collectionConfig,
        message: 'Collection created successfully',
      },
      201,
    );
  } catch (error) {
    logger.error('Failed to create collection', {
      collection: req.body.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_CREATE_ERROR', 'Failed to create collection', 500);
  }
});

/**
 * PUT /api/v1/rag/collections/:name
 * Update an existing collection
 */
router.put('/:name', validate({ body: updateCollectionSchema }), async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    logger.info('Updating collection', { collection: name, updates });

    // Check if collection exists
    const existing = collectionManager.getCollection(name);
    if (!existing) {
      return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
    }

    // Check if embedding model changed (requires re-indexing)
    const modelChanged = updates.embeddingModel && updates.embeddingModel !== existing.embeddingModel;

    if (modelChanged) {
      logger.warn('Embedding model changed, re-indexing required', {
        collection: name,
        oldModel: existing.embeddingModel,
        newModel: updates.embeddingModel,
      });

      // Delete old collection from Qdrant
      await collectionManager.deleteCollection(name);

      // Create new collection with updated model
      const updatedConfig = { ...existing, ...updates };
      await collectionManager.createCollection(updatedConfig);

      // Trigger re-ingestion
      await ingestionService.ingestDirectory({
        directory: updatedConfig.directory,
        collectionName: name,
        chunkSize: updatedConfig.chunkSize,
        chunkOverlap: updatedConfig.chunkOverlap,
        fileTypes: updatedConfig.fileTypes,
        recursive: updatedConfig.recursive,
        embeddingModel: updatedConfig.embeddingModel,
        source: 'api',
      });
    }

    // Update collection configuration
    await collectionManager.updateCollection(name, updates);

    // Reload file watcher if auto-update changed
    if ('autoUpdate' in updates) {
      try {
        await fileWatcherService.stop();
        await fileWatcherService.start();
        logger.info('File watcher reloaded after collection update', { collection: name });
      } catch (watcherError) {
        logger.warn('Failed to reload file watcher', {
          error: watcherError instanceof Error ? watcherError.message : 'Unknown error',
        });
      }
    }

    const updatedCollection = collectionManager.getCollection(name);

    return sendSuccess(res, {
      collection: updatedCollection,
      message: modelChanged
        ? 'Collection updated and re-indexed successfully'
        : 'Collection updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update collection', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_UPDATE_ERROR', 'Failed to update collection', 500);
  }
});

/**
 * DELETE /api/v1/rag/collections/:name
 * Delete a collection
 */
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Deleting collection', { collection: name });

    // Check if collection exists
    const existing = collectionManager.getCollection(name);
    if (!existing) {
      return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
    }

    // Get stats before deletion (for response)
    let stats = null;
    try {
      const qdrantStats = await collectionManager.getCollectionStats(name);
      stats = {
        vectorsCount: qdrantStats.result?.vectors_count || 0,
        pointsCount: qdrantStats.result?.points_count || 0,
      };
    } catch (error) {
      logger.warn('Failed to get stats before deletion', {
        collection: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Delete from Qdrant
    await collectionManager.deleteCollection(name);

    // Reload file watcher to remove collection
    if (existing.autoUpdate) {
      try {
        await fileWatcherService.stop();
        await fileWatcherService.start();
        logger.info('File watcher reloaded after collection deletion', { collection: name });
      } catch (watcherError) {
        logger.warn('Failed to reload file watcher', {
          error: watcherError instanceof Error ? watcherError.message : 'Unknown error',
        });
      }
    }

    return sendSuccess(res, {
      message: 'Collection deleted successfully',
      deletedCollection: {
        name,
        stats,
      },
    });
  } catch (error) {
    logger.error('Failed to delete collection', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_DELETE_ERROR', 'Failed to delete collection', 500);
  }
});

/**
 * POST /api/v1/rag/collections/:name/ingest
 * Trigger ingestion for a collection
 */
router.post('/:name/ingest', async (req: Request, res: Response) => {
  const overallStart = Date.now();
  const { name } = req.params;
  
  try {
    logger.info('[INGEST] Starting ingestion', {
      collection: name,
      timestamp: new Date().toISOString(),
    });

    // Check if collection exists
    const collection = collectionManager.getCollection(name);
    if (!collection) {
      return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
    }

    logger.info('[INGEST] Collection found', {
      collection: name,
      directory: collection.directory,
      fileTypes: collection.fileTypes,
      embeddingModel: collection.embeddingModel,
    });

    // Check stats before ingestion
    const statsStart = Date.now();
    const statsBefore = await collectionManager.getCollectionStats(name);
    logger.info('[INGEST] Stats before ingestion', {
      pendingFiles: statsBefore?.pendingFiles || 0,
      orphanChunks: statsBefore?.orphanChunks || 0,
      totalFiles: statsBefore?.totalFiles || 0,
      duration_ms: Date.now() - statsStart,
    });

    // Trigger ingestion
    logger.info('[INGEST] Calling LlamaIndex ingestion service...', {
      url: process.env.LLAMAINDEX_INGESTION_URL || 'http://rag-llamaindex-ingest:8201',
      directory: collection.directory,
    });

    const ingestStart = Date.now();
    const job = await ingestionService.ingestDirectory({
      directory: collection.directory,
      collectionName: name,
      chunkSize: collection.chunkSize,
      chunkOverlap: collection.chunkOverlap,
      fileTypes: collection.fileTypes,
      recursive: collection.recursive,
      embeddingModel: collection.embeddingModel,
      source: 'api',
    });
    const ingestDuration = Date.now() - ingestStart;

    // Parse response for details
    const filesIngested = job.message?.match(/indexed (\d+) files/) || [];
    const chunksCreated = job.message?.match(/with (\d+) chunks/) || [];
    const filesCount = filesIngested[1] ? parseInt(filesIngested[1]) : 0;
    const chunksCount = chunksCreated[1] ? parseInt(chunksCreated[1]) : 0;
    
    logger.info('[INGEST] LlamaIndex returned', {
      jobId: job.jobId,
      status: job.status,
      filesIngested: filesCount,
      chunksCreated: chunksCount,
      llamaindex_duration_ms: ingestDuration,
      llamaindex_duration_s: (ingestDuration / 1000).toFixed(2),
      throughput_files_per_sec: filesCount > 0 ? (filesCount / (ingestDuration / 1000)).toFixed(2) : 0,
      throughput_chunks_per_sec: chunksCount > 0 ? (chunksCount / (ingestDuration / 1000)).toFixed(2) : 0,
    });

    // Cache invalidation handled in ingestionService.ts

    const totalDuration = Date.now() - overallStart;
    logger.info('[INGEST] Completed', {
      collection: name,
      total_duration_ms: totalDuration,
      total_duration_s: (totalDuration / 1000).toFixed(2),
      llamaindex_duration_ms: ingestDuration,
      overhead_ms: totalDuration - ingestDuration,
      files_ingested: filesCount,
      chunks_created: chunksCount,
      only_pending: statsBefore?.pendingFiles || 0,
      reprocessed_all: filesCount > (statsBefore?.pendingFiles || 0),
    });

    return sendSuccess(res, {
      message: 'Ingestion job created',
      job,
      stats: {
        total_duration_ms: totalDuration,
        llamaindex_duration_ms: ingestDuration,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - overallStart;
    logger.error('[INGEST] Failed', {
      collection: name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      total_duration_ms: totalDuration,
    });
    return sendError(res, 'COLLECTION_INGEST_ERROR', 'Failed to trigger ingestion', 500);
  }
});

/**
 * POST /api/v1/rag/collections/:name/clean-orphans
 * Clean orphaned vectors from a collection
 */
router.post('/:name/clean-orphans', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Cleaning orphans for collection', { collection: name });

    // Check if collection exists
    const collection = collectionManager.getCollection(name);
    if (!collection) {
      return res.status(404).json({ error: "Collection not found", code: "COLLECTION_NOT_FOUND" });
    }

    // Clean orphaned chunks
    const result = await collectionManager.cleanOrphanChunks(name);

    // Cache invalidation handled in collectionManager
    
    logger.info('Orphan cleaning completed', {
      collection: name,
      deletedChunks: result.deletedChunks,
      deletedFiles: result.deletedFiles,
    });

    return sendSuccess(res, {
      message: result.deletedChunks > 0 ? 'Orphan chunks cleaned successfully' : 'No orphan chunks found',
      collection: name,
      deletedChunks: result.deletedChunks,
      deletedFiles: result.deletedFiles,
    });
  } catch (error) {
    logger.error('Failed to clean orphans', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_CLEAN_ERROR', 'Failed to clean orphans', 500);
  }
});

/**
 * GET /api/v1/rag/collections/:name/stats
 * Get detailed statistics for a specific collection
 *
 * Query Parameters:
 * - useCache: boolean (default: false) - Whether to use cached stats
 */
router.get('/:name/stats', validate({ query: statsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const useCache = req.query.useCache === 'true';

    logger.info('Getting detailed collection stats', {
      collection: name,
      useCache,
    });

    const { qdrant, metrics } = await collectionManager.getCollectionStats(name, useCache);

    return sendSuccess(res, {
      collection: name,
      cached: useCache,
      stats: {
        qdrant: qdrant?.result ?? null,
        metrics: {
          ...metrics,
          note: useCache
            ? 'Using cached stats (may be slightly outdated)'
            : 'Fresh stats computed (orphan detection disabled for performance)',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get detailed collection stats', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(
      res,
      'COLLECTION_STATS_DETAILED_ERROR',
      'Failed to get detailed collection statistics',
      500,
    );
  }
});

/**
 * GET /api/v1/rag/collections/:name/files
 * Get list of indexed files with metadata (chunks, size, status)
 */
router.get('/:name/files', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Getting indexed files for collection', { collection: name });

    // Check if collection exists
    const collection = collectionManager.getCollection(name);
    if (!collection) {
      return res.status(404).json({ error: "Collection not found", code: "COLLECTION_NOT_FOUND" });
    }

    // Get indexed files with metadata
    const files = await collectionManager.getIndexedFiles(name);

    // Calculate totals
    const totalFiles = files.length;
    const totalChunks = files.reduce((sum, file) => sum + file.chunkCount, 0);
    const totalSizeBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

    return sendSuccess(res, {
      files,
      summary: {
        totalFiles,
        totalChunks,
        totalSizeBytes,
        totalSizeMB: Math.round((totalSizeBytes / 1024 / 1024) * 100) / 100,
        avgChunksPerFile: totalFiles > 0 ? Math.round(totalChunks / totalFiles) : 0,
        avgFileSizeKB: totalFiles > 0 ? Math.round((totalSizeBytes / totalFiles / 1024) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get indexed files', {
      collection: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'COLLECTION_FILES_ERROR', 'Failed to get indexed files', 500);
  }
});

export default router;

