import axios from 'axios';
import { beforeAll, describe, expect, it } from 'vitest';
import '../../../../../shared/config/load-env.js';

const BASE_URL =
  process.env.FIRECRAWL_PROXY_TEST_URL?.replace(/\/$/, '') ||
  process.env.FIRECRAWL_PROXY_URL?.replace(/\/$/, '') ||
  'http://localhost:3600';
const HEALTH_URL = `${BASE_URL}/health`;

let proxyAvailable = true;

beforeAll(async () => {
  try {
    const response = await axios.get(HEALTH_URL, { timeout: 5000 });
    if (!response.data?.success) {
      proxyAvailable = false;
      console.warn('[integration] Firecrawl Proxy health check failed - skipping tests');
    }
  } catch (error) {
    proxyAvailable = false;
    console.warn('[integration] Firecrawl Proxy not reachable - skipping integration tests');
  }
});

describe('Firecrawl Proxy API integration', () => {
  const ensureProxy = () => {
    if (!proxyAvailable) {
      throw new Error('Firecrawl proxy not available for integration tests');
    }
  };

  it('GET /health returns status information', async () => {
    ensureProxy();

    const { data, status } = await axios.get(HEALTH_URL, { timeout: 5000 });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.service).toBe('firecrawl-proxy');
    expect(typeof data.data.firecrawl.reachable).toBe('boolean');
  });

  it('POST /api/v1/scrape succeeds with valid URL', async () => {
    ensureProxy();

    const { data, status } = await axios.post(
      `${BASE_URL}/api/v1/scrape`,
      {
        url: 'https://example.com',
        formats: ['markdown'],
        onlyMainContent: true
      },
      { timeout: 15000 }
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.markdown).toBe('string');
  });

  it('POST /api/v1/scrape rejects invalid URL', async () => {
    ensureProxy();

    try {
      await axios.post(
        `${BASE_URL}/api/v1/scrape`,
        { url: 'not-a-valid-url' },
        { timeout: 5000 }
      );
      throw new Error('request should have failed');
    } catch (error) {
      const response = error.response;
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    }
  });

  it('POST /api/v1/crawl rejects invalid limit', async () => {
    ensureProxy();

    try {
      await axios.post(
        `${BASE_URL}/api/v1/crawl`,
        { url: 'https://example.com', limit: 0 },
        { timeout: 5000 }
      );
      throw new Error('request should have failed');
    } catch (error) {
      const response = error.response;
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    }
  });

  it('GET /api/v1/crawl/:id returns 404 for unknown job', async () => {
    ensureProxy();

    try {
      await axios.get(`${BASE_URL}/api/v1/crawl/unknown-job-id-123`, { timeout: 5000 });
      throw new Error('request should have failed');
    } catch (error) {
      const response = error.response;
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    }
  });

  it('POST /api/v1/crawl and GET status succeed for valid payload', async () => {
    ensureProxy();

    const crawlResponse = await axios.post(
      `${BASE_URL}/api/v1/crawl`,
      {
        url: 'https://example.com',
        limit: 5,
        maxDepth: 1
      },
      { timeout: 20000 }
    );

    expect(crawlResponse.status).toBe(200);
    expect(crawlResponse.data.success).toBe(true);
    expect(typeof crawlResponse.data.data?.id).toBe('string');

    const crawlId = crawlResponse.data.data.id;

    const statusResponse = await axios.get(`${BASE_URL}/api/v1/crawl/${crawlId}`, {
      timeout: 20000
    });

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.data.success).toBe(true);
    expect(['scraping', 'completed', 'failed']).toContain(statusResponse.data.data.status);
    expect(typeof statusResponse.data.data.total).toBe('number');
  });
});
