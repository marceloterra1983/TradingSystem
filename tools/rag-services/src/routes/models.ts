/**
 * Embedding Models Routes
 *
 * API endpoints for managing and listing embedding models
 * Provides information about available models and their capabilities
 *
 * @module routes/models
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';

const router = Router();

/**
 * Model metadata
 */
interface EmbeddingModelInfo {
  name: string;
  dimensions: number;
  description: string;
  isDefault: boolean;
  available: boolean;
  capabilities?: string[];
  performance?: 'fast' | 'balanced' | 'quality';
  useCase?: string;
}

/**
 * Predefined model information
 */
const EMBEDDING_MODELS: Record<string, Omit<EmbeddingModelInfo, 'available'>> = {
  'nomic-embed-text': {
    name: 'nomic-embed-text',
    dimensions: 768,
    description: 'Fast and efficient embedding model, ideal for general documentation',
    isDefault: true,
    capabilities: ['semantic-search', 'classification', 'clustering'],
    performance: 'fast',
    useCase: 'General purpose documentation, fast retrieval',
  },
  'mxbai-embed-large': {
    name: 'mxbai-embed-large',
    dimensions: 1024,
    description: 'High-quality embeddings with larger vector space',
    isDefault: false,
    capabilities: ['semantic-search', 'high-precision', 'complex-queries'],
    performance: 'quality',
    useCase: 'Technical documentation, code snippets, complex queries',
  },
  'embeddinggemma': {
    name: 'embeddinggemma',
    dimensions: 768,
    description: "Google's Gemma embedding model with strong contextual understanding",
    isDefault: false,
    capabilities: ['semantic-search', 'long-context', 'reasoning'],
    performance: 'balanced',
    useCase: 'Complex documentation, long-form content, contextual queries',
  },
};

/**
 * Check if model is available in Ollama
 */
async function checkModelAvailability(modelName: string): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_EMBEDDINGS_URL || 'http://ai-ollama-embeddings:11434';

    // Try to list models from Ollama
    const response = await axios.get(`${ollamaUrl}/api/tags`, {
      timeout: 5000,
    });

    if (response.data && response.data.models) {
      const models: string[] = response.data.models.map((m: any) => m.name);
      return models.some(name => name.includes(modelName) || modelName.includes(name));
    }

    return false;
  } catch (error) {
    logger.warn('Failed to check model availability', {
      model: modelName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * GET /api/v1/rag/models
 * List all embedding models with availability status
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    logger.info('Listing embedding models');

    // Check availability of each model
    const modelsWithAvailability: EmbeddingModelInfo[] = await Promise.all(
      Object.values(EMBEDDING_MODELS).map(async (model) => {
        const available = await checkModelAvailability(model.name);
        return {
          ...model,
          available,
        };
      }),
    );

    // Sort: available first, then default first
    const sortedModels = modelsWithAvailability.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sendSuccess(res, {
      models: sortedModels,
      total: sortedModels.length,
      available: sortedModels.filter(m => m.available).length,
      default: sortedModels.find(m => m.isDefault)?.name || 'nomic-embed-text',
    });
  } catch (error) {
    logger.error('Failed to list embedding models', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'MODELS_LIST_ERROR', 'Failed to list embedding models', 500);
  }
});

/**
 * GET /api/v1/rag/models/:name
 * Get information about a specific embedding model
 */
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Getting embedding model info', { model: name });

    const modelInfo = EMBEDDING_MODELS[name];

    if (!modelInfo) {
      return sendError(
        res,
        'MODEL_NOT_FOUND',
        `Embedding model '${name}' not found`,
        404,
      );
    }

    // Check availability
    const available = await checkModelAvailability(name);

    return sendSuccess(res, {
      ...modelInfo,
      available,
    });
  } catch (error) {
    logger.error('Failed to get embedding model info', {
      model: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'MODEL_GET_ERROR', 'Failed to get embedding model info', 500);
  }
});

/**
 * POST /api/v1/rag/models/:name/validate
 * Validate if a model is available and working in Ollama
 */
router.post('/:name/validate', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    logger.info('Validating embedding model', { model: name });

    const modelInfo = EMBEDDING_MODELS[name];

    if (!modelInfo) {
      return sendError(
        res,
        'MODEL_NOT_FOUND',
        `Embedding model '${name}' not found`,
        404,
      );
    }

    // Check if model is available
    const available = await checkModelAvailability(name);

    if (!available) {
      return sendError(
        res,
        'MODEL_NOT_AVAILABLE',
        `Embedding model '${name}' is not available in Ollama`,
        503,
      );
    }

    // Try to generate a test embedding
    try {
      const ollamaUrl = process.env.OLLAMA_EMBEDDINGS_URL || 'http://ai-ollama-embeddings:11434';

      const response = await axios.post(
        `${ollamaUrl}/api/embeddings`,
        {
          model: name,
          prompt: 'This is a test embedding',
        },
        {
          timeout: 10000,
        },
      );

      if (response.data && response.data.embedding) {
        const embedding = response.data.embedding;
        const actualDimensions = Array.isArray(embedding) ? embedding.length : 0;

        // Verify dimensions match expected
        if (actualDimensions !== modelInfo.dimensions) {
          logger.warn('Model dimensions mismatch', {
            model: name,
            expected: modelInfo.dimensions,
            actual: actualDimensions,
          });
        }

        return sendSuccess(res, {
          model: name,
          available: true,
          validated: true,
          dimensions: {
            expected: modelInfo.dimensions,
            actual: actualDimensions,
            match: actualDimensions === modelInfo.dimensions,
          },
          message: 'Model is available and working correctly',
        });
      }
    } catch (embedError) {
      logger.error('Failed to generate test embedding', {
        model: name,
        error: embedError instanceof Error ? embedError.message : 'Unknown error',
      });
      return sendError(
        res,
        'MODEL_VALIDATION_ERROR',
        `Model '${name}' is installed but failed to generate embeddings`,
        503,
      );
    }

    return sendSuccess(res, {
      model: name,
      available: true,
      validated: true,
      message: 'Model is available',
    });
  } catch (error) {
    logger.error('Failed to validate embedding model', {
      model: req.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'MODEL_VALIDATE_ERROR', 'Failed to validate embedding model', 500);
  }
});

/**
 * GET /api/v1/rag/models/compare/:model1/:model2
 * Compare two embedding models
 */
router.get('/compare/:model1/:model2', async (req: Request, res: Response) => {
  try {
    const { model1, model2 } = req.params;

    logger.info('Comparing embedding models', { model1, model2 });

    const info1 = EMBEDDING_MODELS[model1];
    const info2 = EMBEDDING_MODELS[model2];

    if (!info1 || !info2) {
      return sendError(
        res,
        'MODEL_NOT_FOUND',
        'One or both models not found',
        404,
      );
    }

    // Check availability
    const [available1, available2] = await Promise.all([
      checkModelAvailability(model1),
      checkModelAvailability(model2),
    ]);

    const comparison = {
      model1: {
        ...info1,
        available: available1,
      },
      model2: {
        ...info2,
        available: available2,
      },
      differences: {
        dimensions: {
          model1: info1.dimensions,
          model2: info2.dimensions,
          difference: Math.abs(info1.dimensions - info2.dimensions),
          larger: info1.dimensions > info2.dimensions ? model1 : model2,
        },
        performance: {
          model1: info1.performance,
          model2: info2.performance,
        },
        availability: {
          model1: available1,
          model2: available2,
          bothAvailable: available1 && available2,
        },
      },
      recommendation: info1.dimensions > info2.dimensions
        ? `${model1} provides higher quality embeddings but may be slower`
        : `${model2} provides faster embeddings but with lower dimensionality`,
    };

    return sendSuccess(res, comparison);
  } catch (error) {
    logger.error('Failed to compare embedding models', {
      model1: req.params.model1,
      model2: req.params.model2,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'MODEL_COMPARE_ERROR', 'Failed to compare embedding models', 500);
  }
});

export default router;
