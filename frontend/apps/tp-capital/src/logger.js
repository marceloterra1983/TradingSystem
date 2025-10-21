import pino from 'pino';
import { addLogEntry } from './logStore.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      : undefined
});

const levelsToTrack = ['fatal', 'error', 'warn', 'info', 'debug'];
levelsToTrack.forEach((level) => {
  const original = logger[level].bind(logger);
  logger[level] = (...args) => {
    const timestamp = new Date().toISOString();
    let message = '';
    let context;

    if (typeof args[0] === 'string') {
      message = args[0];
      if (args.length > 1) {
        context = args.slice(1);
      }
    } else {
      context = args[0];
      message = args[1] ?? '';
    }

    try {
      addLogEntry({
        timestamp,
        level,
        message: String(message),
        context: context === undefined ? null : JSON.parse(JSON.stringify(context))
      });
    } catch (error) {
      original({ err: error }, 'Failed to record log entry');
    }

    return original(...args);
  };
});
