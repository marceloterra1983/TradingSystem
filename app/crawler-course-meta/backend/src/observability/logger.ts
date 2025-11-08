import pino from 'pino';
import env from '../config/env.js';

const logger = pino({
  transport: env.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
  level: process.env.LOG_LEVEL ?? 'info',
});

export default logger;
