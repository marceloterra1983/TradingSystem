import axios from 'axios';

import firecrawlConfig, { getFirecrawlUrl } from '../config/firecrawl.js';
import { logger } from '../config/logger.js';
import { recordCrawlJob, recordCrawlStatusCheck, recordScrape } from '../metrics.js';

const httpClient = axios.create({
  baseURL: firecrawlConfig.baseURL,
  timeout: firecrawlConfig.timeout,
  headers: firecrawlConfig.headers
});

const computeDurationSeconds = (start) => {
  const diffNs = process.hrtime.bigint() - start;
  return Number(diffNs) / 1e9;
};

const handleAxiosError = (error, context) => {
  if (error.response) {
    const apiError = new Error(
      error.response.data?.error || error.response.data?.message || 'Firecrawl API error'
    );
    apiError.response = error.response;
    apiError.statusCode = error.response.status;
    apiError.context = context;
    return apiError;
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    const connError = new Error('Firecrawl service unavailable');
    connError.code = error.code;
    connError.statusCode = 503;
    connError.context = context;
    return connError;
  }

  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    const timeoutError = new Error('Firecrawl request timed out');
    timeoutError.code = error.code;
    timeoutError.statusCode = 504;
    timeoutError.context = context;
    return timeoutError;
  }

  const genericError = new Error(error.message || 'Unexpected Firecrawl error');
  genericError.code = error.code;
  genericError.statusCode = error.status;
  genericError.context = context;
  return genericError;
};

class FirecrawlService {
  static async scrape(options) {
    const start = process.hrtime.bigint();

    try {
      const response = await httpClient.post('/v1/scrape', {
        url: options.url,
        formats: options.formats,
        onlyMainContent: options.onlyMainContent,
        waitFor: options.waitFor,
        timeout: options.timeout,
        includeTags: options.includeTags,
        excludeTags: options.excludeTags
      });

      const durationSeconds = computeDurationSeconds(start);
      recordScrape('success', durationSeconds);

      logger.info(
        {
          action: 'scrape',
          url: options.url,
          durationSeconds
        },
        'firecrawl scrape completed'
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      const durationSeconds = computeDurationSeconds(start);
      recordScrape('failure', durationSeconds);

      const mappedError = handleAxiosError(error, 'scrape');

      logger.error(
        {
          action: 'scrape',
          url: options.url,
          durationSeconds,
          err: mappedError
        },
        'firecrawl scrape failed'
      );

      throw mappedError;
    }
  }

  static async crawl(options) {
    const start = process.hrtime.bigint();

    try {
      const response = await httpClient.post('/v1/crawl', {
        url: options.url,
        limit: options.limit,
        maxDepth: options.maxDepth,
        excludePaths: options.excludePaths,
        includePaths: options.includePaths,
        scrapeOptions: options.scrapeOptions,
        allowBackwardLinks: options.allowBackwardLinks,
        allowExternalLinks: options.allowExternalLinks
      });

      recordCrawlJob('success');

      logger.info(
        {
          action: 'crawl',
          url: options.url,
          limit: options.limit,
          maxDepth: options.maxDepth,
          jobId: response.data?.id,
          durationSeconds: computeDurationSeconds(start)
        },
        'firecrawl crawl job created'
      );

      return response.data;
    } catch (error) {
      recordCrawlJob('failure');

      const mappedError = handleAxiosError(error, 'crawl');

      logger.error(
        {
          action: 'crawl',
          url: options.url,
          limit: options.limit,
          maxDepth: options.maxDepth,
          err: mappedError
        },
        'firecrawl crawl job failed'
      );

      throw mappedError;
    }
  }

  static async getCrawlStatus(crawlId) {
    try {
      const response = await httpClient.get(`/v1/crawl/${crawlId}`);

      recordCrawlStatusCheck(response.data?.status || 'unknown');

      return response.data;
    } catch (error) {
      const mappedError = handleAxiosError(error, 'crawl-status');

      recordCrawlStatusCheck('error');

      logger.error(
        {
          action: 'crawl-status',
          crawlId,
          err: mappedError
        },
        'firecrawl crawl status retrieval failed'
      );

      throw mappedError;
    }
  }
}

export default FirecrawlService;
