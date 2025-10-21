import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import '../../../../backend/shared/config/load-env.js';

import { metricsMiddleware, metricsHandler } from './metrics.js';
import scrapeRoutes from './routes/scrape.js';
import { errorHandler, notFoundHandler, rateLimitHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';
import { getFirecrawlUrl, testFirecrawlConnection } from './config/firecrawl.js';

const app = express();

const disableCors = process.env.DISABLE_CORS === 'true';
const rawCorsOrigin =
  process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== ''
    ? process.env.CORS_ORIGIN
    : 'http://localhost:3103,http://localhost:3004';

app.use(helmet());

if (!disableCors) {
  const corsOrigins =
    rawCorsOrigin === '*'
      ? undefined
      : rawCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(
    cors({
      origin: corsOrigins || undefined,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
} else {
  logger.info('CORS disabled - unified domain mode active');
}

const rateLimitWindowMs = parseInt(process.env.FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS || '60000', 10);
const rateLimitMax = parseInt(process.env.FIRECRAWL_PROXY_RATE_LIMIT_MAX || '100', 10);

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.path === '/metrics' || req.path === '/health'
});

app.use(limiter);
app.use(express.json({ limit: '2mb' }));
app.use(metricsMiddleware);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
        ip: req.ip
      },
      'request completed'
    );
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'firecrawl-proxy',
      version: '1.0.0',
      endpoints: {
        scrape: '/api/v1/scrape',
        crawl: '/api/v1/crawl',
        crawlStatus: '/api/v1/crawl/:id',
        health: '/health',
        metrics: '/metrics'
      }
    }
  });
});

app.get('/health', async (req, res, next) => {
  try {
    const reachable = await testFirecrawlConnection();
    res.json({
      success: true,
      data: {
        service: 'firecrawl-proxy',
        status: 'ok',
        firecrawl: {
          reachable,
          baseUrl: getFirecrawlUrl('')
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/metrics', metricsHandler);
app.use('/api/v1', scrapeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = parseInt(process.env.FIRECRAWL_PROXY_PORT || '3600', 10);

const startServer = async () => {
  app.listen(port, async () => {
    logger.info({ port, environment: process.env.NODE_ENV || 'development' }, 'firecrawl-proxy service started');

    try {
      const reachable = await testFirecrawlConnection();
      if (reachable) {
        logger.info({ firecrawlBaseUrl: getFirecrawlUrl('') }, 'firecrawl service reachable');
      } else {
        logger.warn({ firecrawlBaseUrl: getFirecrawlUrl('') }, 'firecrawl service unreachable');
      }
    } catch (error) {
      logger.error(
        { err: error, firecrawlBaseUrl: getFirecrawlUrl('') },
        'failed to verify firecrawl connectivity on startup'
      );
    }
  });
};

startServer();

export default app;

export const resetRateLimiter = (key = '::ffff:127.0.0.1') => {
  try {
    if (typeof limiter.resetKey === 'function') {
      limiter.resetKey(key);
      limiter.resetKey('127.0.0.1');
    }
    if (limiter.store && typeof limiter.store.resetAll === 'function') {
      limiter.store.resetAll();
    }
  } catch (error) {
    logger.warn({ err: error }, 'failed to reset rate limiter');
  }
};
