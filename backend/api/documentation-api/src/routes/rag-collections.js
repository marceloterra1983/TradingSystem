import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const QDRANT_BASE_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');

// Collection configuration (imported from JSON)
const COLLECTION_CONFIG = {
  defaultCollection: 'documentation',
  collections: [
    {
      name: 'documentation',
      displayName: 'Documentation (Nomic Embed)',
      embeddingModel: 'nomic-embed-text',
      dimensions: 768,
      description: 'Main documentation collection using Nomic Embed Text model (768 dimensions)',
      source: 'docs/content',
      enabled: true,
      priority: 1,
      metadata: {
        modelSize: '274MB',
        language: 'multilingual',
        optimizedFor: 'semantic search, general purpose'
      }
    },
    {
      name: 'documentation_mxbai',
      displayName: 'Documentation (MXBAI Embed)',
      embeddingModel: 'mxbai-embed-large',
      dimensions: 384,
      description: 'Documentation collection using MXBAI Embed Large model (384 dimensions, optimized for speed)',
      source: 'docs/content',
      enabled: true,
      priority: 2,
      metadata: {
        modelSize: '669MB',
        language: 'multilingual',
        optimizedFor: 'fast retrieval, lower latency'
      }
    },
    {
      name: 'documentation_gemma',
      displayName: 'Documentation (Gemma Embed)',
      embeddingModel: 'embeddinggemma',
      dimensions: 768,
      description: 'Documentation collection using Google Gemma embedding model (768 dimensions)',
      source: 'docs/content',
      enabled: true,
      priority: 3,
      metadata: {
        modelSize: '621MB',
        language: 'multilingual',
        optimizedFor: 'high quality embeddings, contextual understanding'
      }
    }
  ],
  embeddingModels: [
    {
      name: 'nomic-embed-text',
      fullName: 'nomic-embed-text:latest',
      dimensions: 768,
      contextLength: 8192,
      provider: 'Nomic AI',
      description: 'General-purpose embedding model with strong performance across domains'
    },
    {
      name: 'mxbai-embed-large',
      fullName: 'mxbai-embed-large:latest',
      dimensions: 384,
      contextLength: 512,
      provider: 'Mixedbread AI',
      description: 'Fast embedding model optimized for retrieval tasks'
    },
    {
      name: 'embeddinggemma',
      fullName: 'embeddinggemma:latest',
      dimensions: 768,
      contextLength: 2048,
      provider: 'Google',
      description: "Google's Gemma embedding model with strong contextual understanding"
    }
  ],
  aliases: {
    documentation: 'documentation',
    docs: 'documentation',
    docs_index: 'documentation',
    docs_index_mxbai: 'documentation_mxbai'
  }
};

/**
 * GET /api/v1/rag/collections
 * List all available collections with their status in Qdrant
 */
router.get('/', async (req, res) => {
  try {
    // Get list of collections from Qdrant
    const qdrantResp = await fetch(`${QDRANT_BASE_URL}/collections`);
    const qdrantData = await qdrantResp.json();
    const qdrantCollections = qdrantData?.result?.collections || [];
    const qdrantCollectionNames = new Set(qdrantCollections.map(c => c.name || c));

    // Enrich configured collections with Qdrant status
    const enrichedCollections = await Promise.all(
      COLLECTION_CONFIG.collections.map(async (col) => {
        const existsInQdrant = qdrantCollectionNames.has(col.name);
        let count = null;

        if (existsInQdrant) {
          try {
            const countResp = await fetch(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(col.name)}/points/count`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ exact: true })
            });
            const countData = await countResp.json();
            count = countData?.result?.count || 0;
          } catch (err) {
            console.error(`Failed to get count for ${col.name}:`, err.message);
          }
        }

        // Check if there's a runtime mapping for this collection
        const runtimeDirectory = global.collectionDirectoryMapping?.get(col.name.toLowerCase());
        
        return {
          ...col,
          sourceDirectory: runtimeDirectory || col.source || 'docs/content',
          exists: existsInQdrant,
          count,
          status: existsInQdrant ? (count > 0 ? 'ready' : 'empty') : 'not_created'
        };
      })
    );

    return res.json({
      success: true,
      defaultCollection: COLLECTION_CONFIG.defaultCollection,
      collections: enrichedCollections,
      aliases: COLLECTION_CONFIG.aliases,
      totalConfigured: COLLECTION_CONFIG.collections.length,
      totalExisting: qdrantCollectionNames.size
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/rag/collections/models
 * List all available embedding models from Ollama
 */
router.get('/models', async (req, res) => {
  try {
    // Get models from Ollama
    const ollamaResp = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const ollamaData = await ollamaResp.json();
    const ollamaModels = ollamaData?.models || [];

    // Filter embedding models
    const embeddingModels = ollamaModels
      .filter(m => m.name && m.name.includes('embed'))
      .map(m => {
        const configModel = COLLECTION_CONFIG.embeddingModels.find(cm => m.name.startsWith(cm.name));
        return {
          name: m.name,
          size: m.size,
          modifiedAt: m.modified_at,
          configured: !!configModel,
          ...(configModel ? {
            displayName: configModel.fullName,
            dimensions: configModel.dimensions,
            contextLength: configModel.contextLength,
            provider: configModel.provider,
            description: configModel.description
          } : {})
        };
      });

    return res.json({
      success: true,
      models: embeddingModels,
      configured: COLLECTION_CONFIG.embeddingModels,
      totalAvailable: embeddingModels.length,
      totalConfigured: COLLECTION_CONFIG.embeddingModels.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/rag/collections/:collectionName/files
 * Get list of files indexed in a collection with their metadata
 */
router.get('/:collectionName/files', async (req, res) => {
  const { collectionName } = req.params;

  try {
    // Get points from Qdrant collection with payload filtering
    const scrollResp = await fetch(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(collectionName)}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 10000, // Get all points (adjust if needed)
        with_payload: true,
        with_vector: false
      })
    });

    if (!scrollResp.ok) {
      const error = await scrollResp.json();
      return res.status(scrollResp.status).json({
        success: false,
        error: error?.status?.error || 'Failed to fetch points from collection'
      });
    }

    const scrollData = await scrollResp.json();
    const points = scrollData?.result?.points || [];

    // Group points by file path and aggregate metadata
    const fileMap = new Map();

    for (const point of points) {
      const payload = point.payload || {};
      const filePath = payload.file_path || payload.source || 'unknown';
      
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          sizeBytes: payload.file_size || 0,
          chunkCount: 0,
          status: 'indexed', // Since it's in Qdrant, it's indexed
          lastModified: payload.last_modified || payload.created_at || new Date().toISOString()
        });
      }

      const fileData = fileMap.get(filePath);
      fileData.chunkCount += 1;
    }

    // Convert map to array and calculate summary
    const files = Array.from(fileMap.values());
    
    const summary = {
      totalFiles: files.length,
      totalChunks: points.length,
      totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      totalSizeMB: Number((files.reduce((sum, f) => sum + f.sizeBytes, 0) / (1024 * 1024)).toFixed(2)),
      avgChunksPerFile: files.length > 0 ? Math.round(points.length / files.length) : 0,
      avgFileSizeKB: files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.sizeBytes, 0) / files.length / 1024) : 0
    };

    return res.json({
      success: true,
      data: {
        files,
        summary
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/rag/collections/:collectionName/create
 * Create a new collection in Qdrant with specified embedding model and source directory
 */
router.post('/:collectionName/create', async (req, res) => {
  const { collectionName } = req.params;
  const { embedding_model: embeddingModel, source_directory: sourceDirectory, dimensions } = req.body;

  try {
    // Check if collection exists in config
    const configCollection = COLLECTION_CONFIG.collections.find(c => c.name === collectionName);
    
    const targetModel = embeddingModel || configCollection?.embeddingModel;
    const targetDirectory = sourceDirectory || configCollection?.source || 'docs/content';
    
    // Get dimensions from model info
    let targetDimensions = dimensions || configCollection?.dimensions;
    
    if (!targetDimensions && targetModel) {
      // Try to infer dimensions from model name (support partial match)
      const modelInfo = COLLECTION_CONFIG.embeddingModels.find(m => {
        // Exact match
        if (m.name === targetModel || m.fullName === targetModel) return true;
        // Partial match (without :latest tag)
        const baseModelName = targetModel.split(':')[0];
        const configBaseName = m.name.split(':')[0];
        return baseModelName === configBaseName;
      });
      targetDimensions = modelInfo?.dimensions;
    }

    if (!targetModel) {
      return res.status(400).json({
        success: false,
        error: 'Missing embeddingModel parameter'
      });
    }

    if (!targetDimensions) {
      return res.status(400).json({
        success: false,
        error: `Could not determine dimensions for model '${targetModel}'. Please specify dimensions parameter or use a configured model: ${COLLECTION_CONFIG.embeddingModels.map(m => m.name).join(', ')}`
      });
    }

    // Create collection in Qdrant
    const createResp = await fetch(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(collectionName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: targetDimensions,
          distance: 'Cosine'
        }
      })
    });

    const createData = await createResp.json();

    if (!createResp.ok) {
      return res.status(createResp.status).json({
        success: false,
        error: createData?.status?.error || 'Failed to create collection'
      });
    }

    // Store the collection-directory mapping in memory (runtime only)
    // For persistent storage, would need to update collection-config.json
    global.collectionDirectoryMapping = global.collectionDirectoryMapping || new Map();
    global.collectionDirectoryMapping.set(collectionName.toLowerCase(), targetDirectory);

    return res.json({
      success: true,
      collection: collectionName,
      embeddingModel: targetModel,
      sourceDirectory: targetDirectory,
      dimensions: targetDimensions,
      message: `Collection ${collectionName} created successfully with directory ${targetDirectory}`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
