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
    httpUrl: env('QUESTDB_HTTP_URL', 'http://localhost:9002'),
    timeoutMs: Number(env('QUESTDB_HTTP_TIMEOUT', 10000)),
  },
  cors: {
    origin: env('CORS_ORIGIN', 'http://localhost:3101,http://localhost:3030,http://b3.localhost'),
  },
  rateLimit: {
    windowMs: Number(env('RATE_LIMIT_WINDOW_MS', 60000)),
    max: Number(env('RATE_LIMIT_MAX', 120)),
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
