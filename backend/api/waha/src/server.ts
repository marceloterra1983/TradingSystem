import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { handleWebhook } from './routes/webhook.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignorePaths: ['/healthz']
    }
  } as any)
);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/webhooks/waha', handleWebhook);

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT },
    'WAHA webhook service listening for incoming events'
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down WAHA webhook service');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
