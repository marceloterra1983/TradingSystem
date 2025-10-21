import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import systemsRoutes from './routes/systems.js';
import ideasRoutes from './routes/ideas.js';
import filesRoutes from './routes/files.js';
import statsRoutes from './routes/stats.js';
import searchRoutes from './routes/search.js';
import specsRoutes from './routes/specs.js';
import docsHealthRoutes from './routes/docs-health.js';
import markdownSearchRoutes, {
  initializeRoute,
} from './routes/markdown-search.js';
import MarkdownSearchService from './services/markdownSearchService.js';
import searchMetrics from './services/searchMetrics.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
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

// Get project root (4 levels up from src/)
const projectRoot = path.resolve(__dirname, '../../../../');

// Initialize Markdown Search Service
const markdownSearchService = new MarkdownSearchService(
  path.join(projectRoot, 'docs/context')
);

// Initialize markdown search routes with dependencies
initializeRoute({ markdownSearchService, searchMetrics });

const app = express();
const PORT = config.server.port;

// Logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Middleware
app.use(helmet());

// CORS configuration
// When using unified domain (tradingsystem.local), CORS is not needed
// Only enable CORS when accessing APIs directly via different ports
if (!config.cors.disable) {
  const rawCorsOrigin =
    config.cors.origin?.trim() !== ''
      ? config.cors.origin
      : 'http://localhost:3103,http://localhost:3004';
  const corsOrigins =
    rawCorsOrigin === '*'
      ? undefined
      : rawCorsOrigin
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);
  app.use(
    cors({
      origin: corsOrigins || undefined,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
} else {
  logger.info('CORS disabled - Using unified domain mode');
}

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(express.json());
app.use(metricsMiddleware);

// Serve static files from docs directory
app.use('/spec', express.static(path.join(__dirname, '../../../docs/spec')));
app.use('/docs', express.static(path.join(__dirname, '../../../docs/public')));
app.use(
  '/_static',
  express.static(path.join(__dirname, '../../../docs/public'))
);

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
  res.sendFile(path.join(__dirname, '../../../docs/public/redoc.html'));
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (isQuestDbStrategy()) {
      const dbHealthy = await questdbClient.healthCheck();

      return res.json({
        status: dbHealthy.status === 'healthy' ? 'ok' : 'degraded',
        service: 'documentation-api',
        timestamp: new Date().toISOString(),
        database: {
          engine: 'questdb',
          status: dbHealthy.status,
          connections: dbHealthy.connections,
        },
      });
    }

    if (isPostgresStrategy()) {
      await ensurePrismaConnection();
      return res.json({
        status: 'ok',
        service: 'documentation-api',
        timestamp: new Date().toISOString(),
        database: {
          engine: 'postgres',
          status: 'healthy',
        },
      });
    }

    return res.json({
      status: 'ok',
      service: 'documentation-api',
      timestamp: new Date().toISOString(),
      database: {
        engine: 'unknown',
        status: 'neutral',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({
      status: 'error',
      service: 'documentation-api',
      timestamp: new Date().toISOString(),
      database: {
        engine: isPostgresStrategy() ? 'postgres' : 'questdb',
        status: 'error',
      },
      error: error.message,
    });
  }
});

// API Routes
app.use('/api/v1/systems', systemsRoutes);
app.use('/api/v1/ideas', ideasRoutes);
app.use('/api/v1', filesRoutes);
app.use('/api/v1', statsRoutes);
app.use('/api/v1', searchRoutes);
app.use('/api/v1/docs', specsRoutes);
app.use('/api/v1/docs', markdownSearchRoutes);
app.use('/api/v1/docs/health', docsHealthRoutes);

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  logger.info({ port: PORT }, 'Documentation API starting');

  // Initialize database schema
  try {
    if (isQuestDbStrategy()) {
      await questdbClient.initialize();
      logger.info('QuestDB connection initialized');
    } else if (isPostgresStrategy()) {
      await ensurePrismaConnection();
      logger.info('Prisma/PostgreSQL connection initialized');
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

