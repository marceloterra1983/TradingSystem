#!/usr/bin/env node
/**
 * TP Capital API Server (Containerized)
 *
 * Receives trading signals from Telegram Gateway via HTTP POST
 * Stores in TimescaleDB with idempotency checks
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import promClient from 'prom-client';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import TimescaleClient from './services/timescaleClient.js';
import ingestionRouter from './routes/ingestion.js';

// ========================================
// Application Initialization
// ========================================

const app = express();
const register = new promClient.Registry();

// Validate configuration
validateConfig(logger);

// Initialize TimescaleDB client
const timescaleClient = new TimescaleClient();

// Test database connection on startup
(async () => {
  try {
    await timescaleClient.testConnection();
    logger.info('✅ TimescaleDB connection validated');
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to connect to TimescaleDB on startup');
    process.exit(1);
  }
})();

// ========================================
// Prometheus Metrics
// ========================================

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'tp_capital_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'tp_capital_api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const messagesIngestedTotal = new promClient.Counter({
  name: 'tp_capital_api_messages_ingested_total',
  help: 'Total messages ingested from Gateway',
  labelNames: ['channel_id', 'result'],
  registers: [register],
});

// Expose metrics via app.locals for routes to access
app.locals.metrics = {
  httpRequestsTotal,
  httpRequestDuration,
  messagesIngestedTotal,
};

// Expose timescaleClient via app.locals
app.locals.timescaleClient = timescaleClient;

// ========================================
// Middleware
// ========================================

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, duration);

    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration.toFixed(3)}s`,
        ip: req.ip,
      },
      'HTTP request completed'
    );
  });

  next();
});

// ========================================
// Routes
// ========================================

// Health check
app.get('/health', (req, res) => {
  const dbStats = timescaleClient.getStats();

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tp-capital-api',
    version: '1.0.0',
    database: {
      connected: true,
      pool: dbStats,
    },
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error({ err: error }, 'Error collecting metrics');
    res.status(500).end();
  }
});

// API routes
app.use('/', ingestionRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.server.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// ========================================
// Server Startup
// ========================================

const server = app.listen(config.server.port, () => {
  logger.info(
    {
      port: config.server.port,
      env: config.server.nodeEnv,
      pid: process.pid,
    },
    '🚀 TP Capital API Server started'
  );

  logger.info(
    {
      timescale: {
        host: config.timescale.host,
        port: config.timescale.port,
        database: config.timescale.database,
        schema: config.timescale.schema,
      },
    },
    'Database configuration'
  );
});

// ========================================
// Graceful Shutdown
// ========================================

const gracefulShutdown = async (signal) => {
  logger.info({ signal }, '🛑 Received shutdown signal');

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Close database connections
    await timescaleClient.close();

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '❌ Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

export default app;
