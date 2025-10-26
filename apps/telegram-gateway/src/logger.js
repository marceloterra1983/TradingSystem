import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss', // Use system timezone (São Paulo: UTC-3)
      ignore: 'pid,hostname',
    },
  },
});
