import './config/env.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { metricsMiddleware, metricsHandler, register } from './metrics.js';
import logger from './config/logger.js';
import jobsRouter from './routes/jobs.js';
import templatesRouter from './routes/templates.js';
import statisticsRouter, { historyRouter } from './routes/statistics.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import prisma, { testDatabaseConnection } from './config/database.js';
import schedulesRouter from './routes/schedules.js';
import {
  initializeScheduler,
  shutdown as shutdownScheduler
} from './services/SchedulerService.js';
import exportsRouter from './routes/exports.js';
import {
  initializeExportCleanup,
  shutdownExportCleanup
} from './services/ExportService.js';
import { ensureQuestDBSchema } from './services/QuestDBService.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) ?? [
  'http://localhost:3103',
  'http://localhost:3800',
  'http://localhost:3004'
];

const rateLimitWindowMs = Number(process.env.WEBSCRAPER_API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateLimitMax = Number(process.env.WEBSCRAPER_API_RATE_LIMIT_MAX ?? 100);

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);
app.use(limiter);
app.use(express.json({ limit: '2mb' }));
app.use(metricsMiddleware);
app.use(
  pinoHttp({
    logger,
    autoLogging: process.env.NODE_ENV !== 'test',
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    }
  })
);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'webscraper-api',
    version: '1.0.0',
    endpoints: [
      '/api/v1/jobs',
      '/api/v1/templates',
      '/api/v1/schedules',
      '/api/v1/exports',
      '/api/v1/statistics',
      '/api/v1/history',
      '/metrics',
      '/health'
    ]
  });
});

app.get('/health', async (_req, res) => {
  try {
    await testDatabaseConnection();
    res.json({
      success: true,
      service: 'webscraper-api',
      status: 'ok'
    });
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed');
    res.status(503).json({
      success: false,
      service: 'webscraper-api',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await metricsHandler());
});

app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/schedules', schedulesRouter);
app.use('/api/v1/exports', exportsRouter);
app.use('/api/v1/statistics', statisticsRouter);
app.use('/api/v1/history', historyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.WEBSCRAPER_API_PORT ?? 3700);

if (process.env.NODE_ENV !== 'test') {
  testDatabaseConnection()
    .then(async () => {
      const schedulerEnabled = process.env.WEBSCRAPER_SCHEDULER_ENABLED === 'true';
      const exportsEnabled = process.env.WEBSCRAPER_EXPORT_ENABLED !== 'false';
      app.listen(port, () => {
        logger.info({ port }, 'webscraper-api listening');
      });
      if (schedulerEnabled) {
        try {
          await initializeScheduler();
        } catch (error) {
          logger.error({ err: error }, 'Failed to initialise scheduler');
        }
      } else {
          logger.info(
          'Scheduler service disabled (WEBSCRAPER_SCHEDULER_ENABLED=false)'
        );
      }
      if (exportsEnabled) {
        try {
          await ensureQuestDBSchema();
          await initializeExportCleanup();
        } catch (error) {
          logger.error({ err: error }, 'Failed to initialise export cleanup scheduler');
        }
      } else {
        logger.info('Export service disabled (WEBSCRAPER_EXPORT_ENABLED=false)');
      }
    })
    .catch(error => {
      logger.error({ err: error }, 'Failed to initialise database connection');
      process.exit(1);
    });
}

async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, closing resources');
  try {
    await shutdownScheduler();
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanly shutdown scheduler');
  }
  try {
    await shutdownExportCleanup();
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanly shutdown export cleanup');
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
