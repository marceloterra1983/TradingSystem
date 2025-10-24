import '../../../../backend/shared/config/load-env.js';

const env = (key, defaultValue) => {
  const value = process.env[key];
  return value === undefined || value === '' ? defaultValue : value;
};

export const config = {
  server: {
    port: Number(env('B3_API_PORT', env('PORT', 3302))),
  },
  questdb: {
    httpUrl: env('B3_API_QUESTDB_HTTP_URL', env('QUESTDB_HTTP_URL', 'http://localhost:9002')),
    timeoutMs: Number(env('B3_API_QUESTDB_TIMEOUT', env('QUESTDB_HTTP_TIMEOUT', 10000))),
  },
  cors: {
    origin: env('B3_API_CORS_ORIGIN', env('CORS_ORIGIN', 'http://localhost:3103,http://localhost:3004')),
  },
  rateLimit: {
    windowMs: Number(env('B3_API_RATE_LIMIT_WINDOW_MS', env('RATE_LIMIT_WINDOW_MS', 60000))),
    max: Number(env('B3_API_RATE_LIMIT_MAX', env('RATE_LIMIT_MAX', 120))),
  },
  logging: {
    level: env('B3_API_LOG_LEVEL', env('LOG_LEVEL', 'info')),
  },
};

export function validateConfig(logger) {
  if (!config.questdb.httpUrl.startsWith('http')) {
    logger.warn(
      { questdbUrl: config.questdb.httpUrl },
      'QUESTDB_HTTP_URL does not look like an HTTP URL. Using fallback.'
    );
  }
}
