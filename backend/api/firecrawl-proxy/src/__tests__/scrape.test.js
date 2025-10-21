import request from 'supertest';
import axios from 'axios';

vi.mock('axios', () => {
  const get = vi.fn();
  const post = vi.fn();
  const create = vi.fn(() => ({
    get,
    post
  }));

  return {
    __esModule: true,
    default: { get, post, create },
    get,
    post,
    create
  };
});

let app;
let resetRateLimiter;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.FIRECRAWL_PROXY_PORT = '0';
  process.env.CORS_ORIGIN = 'http://localhost:3103';
  process.env.FIRECRAWL_PROXY_BASE_URL = 'http://localhost:3002';
  process.env.FIRECRAWL_PROXY_RATE_LIMIT_MAX = '100';
  process.env.FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS = '60000';

  axios.get.mockResolvedValue({ data: { status: 'ok' } });

  const serverModule = await import('../server.js');
  app = serverModule.default;
  resetRateLimiter = serverModule.resetRateLimiter;
});

beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  if (typeof resetRateLimiter === 'function') {
    resetRateLimiter();
  }
});

describe('POST /api/v1/crawl', () => {
  it('creates crawl job for valid request', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        id: 'job-123',
        url: 'https://example.com'
      }
    });

    const response = await request(app)
      .post('/api/v1/crawl')
      .send({
        url: 'https://example.com',
        limit: 25,
        maxDepth: 3
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ id: 'job-123', url: 'https://example.com' });
  });

  it('returns validation error when url missing', async () => {
    const response = await request(app).post('/api/v1/crawl').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns validation error for invalid limit', async () => {
    const response = await request(app)
      .post('/api/v1/crawl')
      .send({
        url: 'https://example.com',
        limit: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns validation error for invalid maxDepth', async () => {
    const response = await request(app)
      .post('/api/v1/crawl')
      .send({
        url: 'https://example.com',
        maxDepth: 11
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/v1/crawl/:id', () => {
  it('returns crawl status for valid id', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        id: 'job-123',
        status: 'completed',
        total: 10,
        completed: 10,
        data: []
      }
    });

    const response = await request(app).get('/api/v1/crawl/job-123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('completed');
  });

  it('returns validation error for invalid id format', async () => {
    const response = await request(app).get('/api/v1/crawl/invalid id!');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 404 when crawl id not found', async () => {
    const error = new Error('Not Found');
    error.response = {
      status: 404,
      data: { error: 'Not Found' }
    };
    axios.get.mockRejectedValueOnce(error);

    const response = await request(app).get('/api/v1/crawl/job-missing');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/scrape', () => {
  it('returns scraped data for valid request', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          markdown: '# Example',
          metadata: { title: 'Example' }
        }
      }
    });

    const response = await request(app)
      .post('/api/v1/scrape')
      .send({
        url: 'https://example.com',
        formats: ['markdown'],
        onlyMainContent: true
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.markdown).toBe('# Example');
    expect(response.body.data.metadata.title).toBe('Example');
    expect(axios.post).toHaveBeenCalledWith('/v1/scrape', expect.objectContaining({ url: 'https://example.com' }));
  });

  it('returns validation error when url missing', async () => {
    const response = await request(app).post('/api/v1/scrape').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });

  it('returns validation error for invalid url', async () => {
    const response = await request(app)
      .post('/api/v1/scrape')
      .send({ url: 'ftp://invalid-url' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns validation error for invalid formats', async () => {
    const response = await request(app)
      .post('/api/v1/scrape')
      .send({
        url: 'https://example.com',
        formats: ['invalid']
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 503 when firecrawl unavailable', async () => {
    const error = new Error('connect ECONNREFUSED');
    error.code = 'ECONNREFUSED';
    axios.post.mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/api/v1/scrape')
      .send({
        url: 'https://example.com'
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Firecrawl service unavailable');
  });

  it('returns 504 when firecrawl times out', async () => {
    const error = new Error('timeout of 30000ms exceeded');
    error.code = 'ETIMEDOUT';
    axios.post.mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/api/v1/scrape')
      .send({
        url: 'https://example.com'
      });

    expect(response.status).toBe(504);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Firecrawl request timed out');
  });

  it('enforces rate limiting after 100 requests', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: { markdown: '# Example' }
      }
    });

    for (let i = 0; i < 100; i += 1) {
      const res = await request(app)
        .post('/api/v1/scrape')
        .send({ url: `https://example.com/${i}` });
      expect(res.status).toBe(200);
    }

    const response = await request(app)
      .post('/api/v1/scrape')
      .send({ url: 'https://example.com/rate' });

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Too many requests, please try again later');
  });
});
