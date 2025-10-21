import axios from 'axios';

import { logger } from './logger.js';

export const firecrawlConfig = {
  baseURL:
    process.env.FIRECRAWL_PROXY_BASE_URL || process.env.FIRECRAWL_BASE_URL || 'http://localhost:3002',
  timeout: parseInt(process.env.FIRECRAWL_PROXY_TIMEOUT || process.env.FIRECRAWL_TIMEOUT || '30000', 10),
  headers: {
    'Content-Type': 'application/json'
  }
};

export const getFirecrawlUrl = (suffix = '') => {
  if (!suffix) {
    return firecrawlConfig.baseURL;
  }

  return `${firecrawlConfig.baseURL}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
};

export const testFirecrawlConnection = async () => {
  try {
    await axios.get(getFirecrawlUrl('/v0/health/readiness'), {
      timeout: firecrawlConfig.timeout
    });
    return true;
  } catch (error) {
    logger.warn(
      {
        err: error,
        baseUrl: firecrawlConfig.baseURL
      },
      'firecrawl connectivity test failed'
    );
    return false;
  }
};

export default firecrawlConfig;
