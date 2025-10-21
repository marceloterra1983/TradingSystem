import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { hostname } from 'node:os';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    pid: process.pid,
    hostname: hostname(),
    service: 'documentation-api'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
}, pinoPretty({
  colorize: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
  messageFormat: '{service} [{level}] {msg}'
}));

export default logger;