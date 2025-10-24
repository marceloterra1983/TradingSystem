import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import promClient from 'prom-client';
import rateLimit from 'express-rate-limit';

import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import {
  checkHealth,
  checkDetailedHealth,
  fetchAdjustments,
  fetchLatestDxy,
  fetchIndicatorsDaily,
  fetchLatestGammaLevels,
  fetchLatestIndicators,
  fetchLatestSnapshots,
  fetchVolSurface,
} from './questdbClient.js';

validateConfig(logger);

const app = express();
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });

// QuestDB query duration histogram
export const questdbQueryDuration = new promClient.Histogram({
  name: 'questdb_query_duration_seconds',
  help: 'Duration of QuestDB queries in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

// CORS configuration
// When using unified domain (tradingsystem.local), CORS is not needed
// Only enable CORS when accessing APIs directly via different ports
const disableCors = process.env.DISABLE_CORS === 'true';

const corsOrigins =
  config.cors.origin && config.cors.origin !== '*'
    ? config.cors.origin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : undefined;

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  req.log = logger.child({ correlationId: req.correlationId });
  next();
});

// Access logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.log.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      correlationId: req.correlationId,
    }, 'HTTP request');
  });
  next();
});

// Add CORS middleware only if not using unified domain
if (!disableCors) {
  app.use(cors(corsOrigins ? { origin: corsOrigins, credentials: true } : undefined));
} else {
  logger.info('CORS disabled - Using unified domain mode');
}

app.use(limiter);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(express.json());

app.get('/health', async (req, res) => {
  const detailed = req.query.detailed === 'true';

  if (detailed) {
    const health = await checkDetailedHealth();
    const allTablesOk = Object.values(health.tables).every((t) => t.ok);
    res.json({
      status: health.questdb && allTablesOk ? 'ok' : 'degraded',
      ...health,
    });
  } else {
    const questdbHealthy = await checkHealth();
    res.json({ status: questdbHealthy ? 'ok' : 'error', questdb: questdbHealthy });
  }
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    endpoints: ['/health', '/overview', '/adjustments', '/vol-surface', '/indicators/daily', '/gamma-levels', '/dxy'],
    message: 'B3 API',
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

app.get('/overview', async (req, res) => {
  const start = Date.now();
  try {
    const [snapshots, indicators, gamma, dxy] = await Promise.all([
      fetchLatestSnapshots(),
      fetchLatestIndicators(),
      fetchLatestGammaLevels(),
      fetchLatestDxy(),
    ]);
    questdbQueryDuration.labels('/overview', 'success').observe((Date.now() - start) / 1000);
    res.json({
      data: {
        snapshots,
        indicators,
        gammaLevels: gamma,
        dxy,
      },
    });
  } catch (error) {
    questdbQueryDuration.labels('/overview', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch overview');
    res.status(500).json({ error: 'Failed to fetch overview', correlationId: req.correlationId });
  }
});

app.get('/adjustments', async (req, res) => {
  const start = Date.now();
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 120;
    const instrument = req.query.instrument ? String(req.query.instrument).toUpperCase() : undefined;
    const contract = req.query.contract ? String(req.query.contract) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const rows = await fetchAdjustments({
      limit,
      instrument,
      contract,
      from,
      to,
    });
    questdbQueryDuration.labels('/adjustments', 'success').observe((Date.now() - start) / 1000);
    res.json({ data: rows });
  } catch (error) {
    questdbQueryDuration.labels('/adjustments', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch adjustments');
    res.status(500).json({ error: 'Failed to fetch adjustments', correlationId: req.correlationId });
  }
});

app.get('/vol-surface', async (req, res) => {
  const start = Date.now();
  try {
    const contract = req.query.contract ? String(req.query.contract) : undefined;
    const rows = await fetchVolSurface({ contractMonth: contract });
    questdbQueryDuration.labels('/vol-surface', 'success').observe((Date.now() - start) / 1000);
    res.json({ data: rows });
  } catch (error) {
    questdbQueryDuration.labels('/vol-surface', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch vol surface');
    res.status(500).json({ error: 'Failed to fetch vol surface', correlationId: req.correlationId });
  }
});

app.get('/indicators/daily', async (req, res) => {
  const start = Date.now();
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 180;
    const rows = await fetchIndicatorsDaily(limit);
    questdbQueryDuration.labels('/indicators/daily', 'success').observe((Date.now() - start) / 1000);
    res.json({ data: rows });
  } catch (error) {
    questdbQueryDuration.labels('/indicators/daily', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch daily indicators');
    res.status(500).json({ error: 'Failed to fetch daily indicators', correlationId: req.correlationId });
  }
});

app.get('/gamma-levels', async (req, res) => {
  const start = Date.now();
  try {
    const rows = await fetchLatestGammaLevels();
    questdbQueryDuration.labels('/gamma-levels', 'success').observe((Date.now() - start) / 1000);
    res.json({ data: rows });
  } catch (error) {
    questdbQueryDuration.labels('/gamma-levels', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch gamma levels');
    res.status(500).json({ error: 'Failed to fetch gamma levels', correlationId: req.correlationId });
  }
});

app.get('/dxy', async (req, res) => {
  const start = Date.now();
  try {
    const rows = await fetchLatestDxy();
    questdbQueryDuration.labels('/dxy', 'success').observe((Date.now() - start) / 1000);
    res.json({ data: rows });
  } catch (error) {
    questdbQueryDuration.labels('/dxy', 'error').observe((Date.now() - start) / 1000);
    req.log.error({ err: error, correlationId: req.correlationId }, 'Failed to fetch DXY ticks');
    res.status(500).json({ error: 'Failed to fetch DXY ticks', correlationId: req.correlationId });
  }
});

const server = app.listen(config.server.port, () => {
  logger.info({ port: config.server.port }, 'B3 API listening');
});

process.on('SIGINT', () => {
  logger.info('Shutting down');
  server.close(() => process.exit(0));
});