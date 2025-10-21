import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import promClient from 'prom-client';
import { config } from './config.js';
import { getDbClient } from './db/index.js';
import { itemsRouter } from './routes/items.js';

const logger = pino({ level: config.logLevel });
const app = express();

const requestCounter = new promClient.Counter({
  name: 'tradingsystem_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const requestDuration = new promClient.Histogram({
  name: 'tradingsystem_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

promClient.collectDefaultMetrics();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  pinoHttp({
    logger,
    customLogLevel(req, res, err) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

app.use((req, res, next) => {
  const end = requestDuration.startTimer({
    method: req.method,
    route: req.path,
  });
  res.on('finish', () => {
    requestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
    end({ status: res.statusCode });
  });
  next();
});

app.get('/health', async (req, res) => {
  const db = getDbClient();
  try {
    await db.getItems();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'workspace-api',
      dbStrategy: config.dbStrategy,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Health check failed');
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      errors: [error.message],
    });
  }
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use('/api/items', itemsRouter);

app.use((err, req, res, _next) => {
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Workspace API started');
});

const gracefulShutdown = () => {
  logger.info('Shutting down workspace API...');
  server.close(() => {
    logger.info('Workspace API stopped');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
