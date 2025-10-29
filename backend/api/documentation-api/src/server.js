import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Shared modules
import { createLogger } from '../../../shared/logger/index.js';
import {
  configureCors,
  configureRateLimit,
  configureHelmet,
  createErrorHandler,
  createNotFoundHandler,
  createCorrelationIdMiddleware,
} from '../../../shared/middleware/index.js';
import { createHealthCheckHandler } from '../../../shared/middleware/health.js';

// Application routes
import systemsRoutes from './routes/systems.js';
import ideasRoutes from './routes/ideas.js';
import filesRoutes from './routes/files.js';
import statsRoutes from './routes/stats.js';
import searchRoutes from './routes/search.js';
import specsRoutes from './routes/specs.js';
import docsHealthRoutes from './routes/docs-health.js';
import semanticRoutes from './routes/semantic.js';
import ragProxyRoutes from './routes/rag-proxy.js';
import ragStatusRoutes from './routes/rag-status.js';
import markdownSearchRoutes, { initializeRoute } from './routes/markdown-search.js';
import hybridRoutes, { initializeHybridRoute } from './routes/search-hybrid.js';

// Application services
import MarkdownSearchService from './services/markdownSearchService.js';
import searchMetrics from './services/searchMetrics.js';
import { metricsMiddleware, metricsHandler } from './metrics.js';
import questdbClient from './utils/questDBClient.js';
import {
  config,
  isQuestDbStrategy,
  isPostgresStrategy,
} from './config/appConfig.js';
import { ensurePrismaConnection } from './utils/prismaClient.js';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root - in container: /app, in dev: 4 levels up
// Check if running in container (has /app dir) or dev (nested in repo)
const isContainer = __dirname.startsWith('/app');
const projectRoot = isContainer
  ? '/app'
  : path.resolve(__dirname, '../../../../');

// Initialize Markdown Search Service
const markdownDocsDir = path.join(projectRoot, 'docs/content');
const markdownSearchService = new MarkdownSearchService(markdownDocsDir);

// Initialize markdown search routes with dependencies
initializeRoute({ markdownSearchService, searchMetrics });
initializeHybridRoute({ markdownSearchService });

const app = express();
const PORT = config.server.port;

// Initialize logger
const logger = createLogger('documentation-api', {
  version: '1.0.0',
  base: {
    dbStrategy: isQuestDbStrategy() ? 'questdb' : isPostgresStrategy() ? 'postgres' : 'flexsearch',
  },
});

// Middleware stack
app.use(createCorrelationIdMiddleware());
app.use(configureHelmet({ logger }));
app.use(configureCors({ logger, disableCors: config.cors.disable }));
app.use(configureRateLimit({ logger }));
app.use(express.json());
app.use(metricsMiddleware);

// Serve static files from docs directory
app.use('/spec', express.static(path.join(projectRoot, 'docs/spec')));
// Legacy mounts kept for backward compatibility; point to docs/build if available
app.use('/docs', express.static(path.join(projectRoot, 'docs/build')));
app.use('/_static', express.static(path.join(projectRoot, 'docs/build')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Documentation endpoints
app.get('/docs', (req, res) => {
  res.sendFile(path.join(projectRoot, 'docs/build/index.html'));
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'documentation-api',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      documentation: '/docs',
      openapi: '/spec/openapi.yaml',
      asyncapi: '/spec/asyncapi.yaml',
      api: {
        systems: '/api/v1/systems',
        ideas: '/api/v1/ideas',
        files: '/api/v1/files',
        stats: '/api/v1/stats',
        search: '/api/v1/search',
        suggest: '/api/v1/suggest',
      },
    },
  });
});

// Health check endpoint - comprehensive check with all dependencies
app.get(
  '/health',
  createHealthCheckHandler({
    serviceName: 'documentation-api',
    version: '1.0.0',
    logger,
    checks: {
      database: async () => {
        if (isQuestDbStrategy()) {
          const dbHealthy = await questdbClient.healthCheck();
          if (dbHealthy.status !== 'healthy') {
            throw new Error(`QuestDB ${dbHealthy.status}`);
          }
          return `questdb connected (${dbHealthy.connections} conns)`;
        }
        if (isPostgresStrategy()) {
          await ensurePrismaConnection();
          return 'postgres connected';
        }
        return 'no database configured';
      },
      searchIndex: async () => {
        const count = markdownSearchService.getIndexedCount?.() || 0;
        if (count === 0) {
          throw new Error('No documents indexed');
        }
        return `${count} documents indexed`;
      },
    },
  })
);

// Readiness probe - check if ready to serve traffic
app.get(
  '/ready',
  createHealthCheckHandler({
    serviceName: 'documentation-api',
    version: '1.0.0',
    logger,
    checks: {
      searchIndex: async () => {
        const count = markdownSearchService.getIndexedCount?.() || 0;
        return `${count} documents ready`;
      },
    },
  })
);

// Liveness probe - minimal check
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'documentation-api',
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1/systems', systemsRoutes);
app.use('/api/v1/ideas', ideasRoutes);
app.use('/api/v1', filesRoutes);
app.use('/api/v1', statsRoutes);
app.use('/api/v1', searchRoutes);
app.use('/api/v1/docs', specsRoutes);
app.use('/api/v1/docs', markdownSearchRoutes);
app.use('/api/v1/docs', hybridRoutes);
app.use('/api/v1/docs/health', docsHealthRoutes);
app.use('/api/v1/semantic', semanticRoutes);
app.use('/api/v1/rag', ragProxyRoutes);
app.use('/api/v1/rag/status', ragStatusRoutes);

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

// Error handling middleware
app.use(createNotFoundHandler({ logger }));
app.use(
  createErrorHandler({
    logger,
    includeStack: config.server.env !== 'production',
  })
);

// Start server
const server = app.listen(PORT, async () => {
  logger.startup('Documentation API started', {
    port: PORT,
    env: config.server.env,
  });

  // Initialize database schema (if configured)
  try {
    if (isQuestDbStrategy()) {
      await questdbClient.initialize();
      logger.info('QuestDB connection initialized');
    } else if (isPostgresStrategy()) {
      await ensurePrismaConnection();
      logger.info('Prisma/PostgreSQL connection initialized');
    } else {
      logger.info('No database configured - using FlexSearch only');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize database connection');
  }

  // Initialize markdown search index
  try {
    logger.info('Indexing markdown documentation...');
    const indexResult = await markdownSearchService.indexMarkdownFiles();
    logger.info({ indexed: indexResult }, 'Markdown documentation indexed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to index markdown documentation');
  }

  console.log(`\n📚 Documentation API running on http://localhost:${PORT}`);
  console.log(`   Health:       http://localhost:${PORT}/health`);
  console.log(`   API Docs:     http://localhost:${PORT}/docs`);
  console.log(`   OpenAPI:      http://localhost:${PORT}/spec/openapi.yaml`);
  console.log(`   AsyncAPI:     http://localhost:${PORT}/spec/asyncapi.yaml`);
  console.log(`   Systems:      http://localhost:${PORT}/api/v1/systems`);
  console.log(`   Ideas:        http://localhost:${PORT}/api/v1/ideas`);
  console.log(`   Files:        http://localhost:${PORT}/api/v1/files`);
  console.log(`   Stats:        http://localhost:${PORT}/api/v1/stats`);
  console.log(`   Docs Search:  http://localhost:${PORT}/api/v1/docs/search`);
  console.log(`   Docs Facets:  http://localhost:${PORT}/api/v1/docs/facets\n`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received');

  const timeout = setTimeout(() => {
    logger.error('Shutdown timeout - forcing exit');
    process.exit(1);
  }, 10000);

  try {
    // Close server first
    await new Promise((resolve) => {
      server.close(resolve);
      logger.info('HTTP server closed');
    });

    // Close database connections
    if (isQuestDbStrategy()) {
      await questdbClient.close?.();
      logger.info('QuestDB connection closed');
    }

    clearTimeout(timeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    clearTimeout(timeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

