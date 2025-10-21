import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { hostname } from 'node:os';

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

const destination = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{service} [{level}] {msg}'
    })
  : undefined;

const loggerConfig = {
  level: process.env.FIRECRAWL_PROXY_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  base: {
    pid: process.pid,
    hostname: hostname(),
    service: 'firecrawl-proxy'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
};

export const logger = destination ? pino(loggerConfig, destination) : pino(loggerConfig);

export default logger;
