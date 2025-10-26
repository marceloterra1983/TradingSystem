import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import promClient from 'prom-client';
import { config, validateConfig } from './config.js';
import {
  initializeRepository,
  closeRepository,
  pingDatabase,
} from './db/messagesRepository.js';
import { messagesRouter } from './routes/messages.js';
import { channelsRouter } from './routes/channels.js';

const logger = pino({ level: config.logLevel });

validateConfig(logger);
await initializeRepository(logger);

const app = express();

const requestCounter = new promClient.Counter({
  name: 'telegram_gateway_api_http_requests_total',
  help: 'Total HTTP requests processed by Telegram Gateway API',
  labelNames: ['method', 'route', 'status'],
});

const requestDuration = new promClient.Histogram({
  name: 'telegram_gateway_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

promClient.collectDefaultMetrics({
  prefix: 'telegram_gateway_api_',
});

app.use(cors());
app.use(
  express.json({
    limit: '1mb',
  }),
);
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
  const endTimer = requestDuration.startTimer({
    method: req.method,
    route: req.route?.path || req.path,
  });
  res.on('finish', () => {
    requestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
    endTimer({
      status: res.statusCode,
    });
  });
  next();
});

const isPublicRoute = (path) => ['/health', '/metrics'].includes(path);

app.use((req, res, next) => {
  if (isPublicRoute(req.path)) {
    return next();
  }

  const headerToken =
    req.headers['x-gateway-token'] ||
    req.headers['x-api-token'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  if (!headerToken || headerToken !== config.apiToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  return next();
});

app.get('/health', async (req, res) => {
  try {
    await pingDatabase(req.log);
    res.json({
      status: 'healthy',
      service: 'telegram-gateway-api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      service: 'telegram-gateway-api',
      message: error.message,
    });
  }
});

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'telegram-gateway-api',
    endpoints: ['/health', '/metrics', '/api/messages', '/api/channels'],
  });
});

app.use('/api/channels', channelsRouter);
app.use('/api/messages', messagesRouter);

app.use((err, req, res, _next) => {
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Telegram Gateway API started');
});

const gracefulShutdown = async () => {
  logger.info('Shutting down Telegram Gateway API...');
  server.close(async () => {
    await closeRepository();
    logger.info('Telegram Gateway API stopped');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
