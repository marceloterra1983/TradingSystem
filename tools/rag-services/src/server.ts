/**
 * RAG Services Server
 *
 * Main Express server for RAG services
 * Integrates all routes, middleware, and services
 *
 * @module server
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { corsOptions, securityHeaders, logCorsConfig } from './config/cors';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { collectionManager } from './services/collectionManager';
import { fileWatcherService } from './services/fileWatcher';
import { ingestionService } from './services/ingestionService';
import { getCacheService } from './services/cacheService';
import { asyncHandler } from './utils/asyncHandler';

// Import routes
import collectionsRoutes from './routes/collections';
import modelsRoutes from './routes/models';
import directoriesRoutes from './routes/directories';
import adminRoutes from './routes/admin';
import docsRoutes from './routes/docs';
import ingestionLogsRoutes from './routes/ingestion-logs';

/**
 * Create Express application
 */
const app = express();

/**
 * Server configuration
 */
const PORT = parseInt(process.env.PORT || '3402', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Request ID middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

/**
 * Request logging middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
});

/**
 * Apply middleware
 */
app.use(cors(corsOptions)); // CORS
app.use(securityHeaders); // Security headers
app.use(express.json({ limit: '10mb' })); // JSON body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded body parser

/**
 * Health check endpoint
 */
app.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    // Check ingestion service health
    const ingestionHealthy = await ingestionService.healthCheck();

    // Get file watcher status
    const fileWatcherStatus = fileWatcherService.getStatus();

    // Get collections count
    const collections = collectionManager.getCollections();

    // Get cache stats
    const cacheService = getCacheService();
    const cacheStats = cacheService.getStats();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: NODE_ENV,
      services: {
        cache: {
          status: cacheStats.connected ? 'connected' : 'disconnected',
          enabled: cacheStats.enabled,
          memoryKeys: cacheStats.memoryKeys,
          ttl: cacheStats.ttl,
        },
        ingestion: {
          status: ingestionHealthy ? 'healthy' : 'unhealthy',
          url: process.env.LLAMAINDEX_INGESTION_URL,
        },
        fileWatcher: {
          status: fileWatcherStatus.watching ? 'active' : 'inactive',
          enabled: fileWatcherStatus.enabled,
          watchedDirectories: fileWatcherStatus.watchedDirectories.length,
          eventsProcessed: fileWatcherStatus.eventsProcessed,
        },
        collections: {
          total: collections.length,
          enabled: collections.filter((c) => c.enabled).length,
          autoUpdate: collections.filter((c) => c.autoUpdate).length,
        },
      },
    };

    res.json(health);
  }),
);

/**
 * API Routes
 */
app.use('/api/v1/rag/collections', collectionsRoutes);
app.use('/api/v1/rag/models', modelsRoutes);
app.use('/api/v1/rag/directories', directoriesRoutes);
app.use('/api/v1/rag/ingestion/logs', ingestionLogsRoutes);
app.use('/api/v1/admin', adminRoutes);

/**
 * API Documentation
 */
app.use('/api-docs', docsRoutes);

/**
 * Root endpoint
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'RAG Services API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      collections: '/api/v1/rag/collections',
      models: '/api/v1/rag/models',
      directories: '/api/v1/rag/directories',
      admin: '/api/v1/admin',
    },
    documentation: {
      swagger: `http://localhost:${PORT}/api-docs`,
      openapi: {
        json: `http://localhost:${PORT}/api-docs/openapi.json`,
        yaml: `http://localhost:${PORT}/api-docs/openapi.yaml`,
      },
      readme: 'https://github.com/yourusername/trading-system/blob/main/tools/rag-services/README.md',
    },
  });
});

/**
 * Error handlers (must be last)
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Initialize services and start server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting RAG Services...', {
      port: PORT,
      host: HOST,
      environment: NODE_ENV,
    });

    // Initialize cache service
    logger.info('Initializing Cache Service...');
    const cacheService = getCacheService();
    await cacheService.connect();

    // Initialize collection manager
    logger.info('Initializing Collection Manager...');
    await collectionManager.initialize();

    // Start file watcher (if enabled)
    logger.info('Starting File Watcher...');
    await fileWatcherService.start();

    // Start memory cache cleanup interval (every 1 minute)
    setInterval(() => {
      const cacheService = getCacheService();
      cacheService.cleanMemoryCache();
    }, 60000);
    logger.info('Memory cache cleanup interval started (60s)');

    // Start HTTP server
    app.listen(PORT, HOST, () => {
      logger.info('RAG Services started successfully', {
        port: PORT,
        host: HOST,
        pid: process.pid,
      });

      // Log CORS configuration
      logCorsConfig();

      // Log registered collections
      const collections = collectionManager.getCollections();
      logger.info('Collections registered', {
        total: collections.length,
        collections: collections.map(c => ({
          name: c.name,
          directory: c.directory,
          model: c.embeddingModel,
          autoUpdate: c.autoUpdate,
        })),
      });
    });
  } catch (error) {
    logger.error('Failed to start RAG Services', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop file watcher
    await fileWatcherService.stop();

    // Disconnect cache service
    const cacheService = getCacheService();
    await cacheService.disconnect();

    // Close HTTP server
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    process.exit(1);
  }
}

/**
 * Handle process signals
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });

  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });

  process.exit(1);
});

/**
 * Start the server
 */
void startServer();

export default app;
