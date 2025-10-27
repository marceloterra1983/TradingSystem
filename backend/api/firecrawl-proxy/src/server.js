import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const app = express();
const PORT = process.env.PORT || 3600;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'firecrawl-proxy',
    version: '1.0.0',
    firecrawlApiUrl: FIRECRAWL_API_URL,
    hasApiKey: !!FIRECRAWL_API_KEY
  });
});

// Scrape endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, ...options } = req.body;

    if (!url) {
      logger.warn('Scrape request missing URL');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!FIRECRAWL_API_KEY) {
      logger.error('FIRECRAWL_API_KEY not configured');
      return res.status(500).json({
        error: 'Firecrawl API key not configured',
        message: 'Please set FIRECRAWL_API_KEY environment variable'
      });
    }

    logger.info({ url }, 'Scraping URL');

    const response = await axios.post(
      `${FIRECRAWL_API_URL}/v0/scrape`,
      { url, ...options },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      }
    );

    logger.info({ url, status: response.status }, 'Scrape successful');
    res.json(response.data);
  } catch (error) {
    logger.error({ error: error.message, url: req.body.url }, 'Scrape failed');

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timeout' });
    }

    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
      firecrawlApiUrl: FIRECRAWL_API_URL
    });
  }
});

// Crawl endpoint (for multiple pages)
app.post('/api/crawl', async (req, res) => {
  try {
    const { url, ...options } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({
        error: 'Firecrawl API key not configured'
      });
    }

    logger.info({ url }, 'Starting crawl');

    const response = await axios.post(
      `${FIRECRAWL_API_URL}/v0/crawl`,
      { url, ...options },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info({ url, jobId: response.data?.jobId }, 'Crawl started');
    res.json(response.data);
  } catch (error) {
    logger.error({ error: error.message, url: req.body.url }, 'Crawl failed');
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// Check crawl status
app.get('/api/crawl/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({
        error: 'Firecrawl API key not configured'
      });
    }

    const response = await axios.get(
      `${FIRECRAWL_API_URL}/v0/crawl/status/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    logger.error({ error: error.message, jobId: req.params.jobId }, 'Status check failed');
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.url,
    availableEndpoints: [
      'GET /health',
      'POST /api/scrape',
      'POST /api/crawl',
      'GET /api/crawl/status/:jobId'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info({
    port: PORT,
    firecrawlApiUrl: FIRECRAWL_API_URL,
    hasApiKey: !!FIRECRAWL_API_KEY
  }, 'Firecrawl Proxy server started');

  if (!FIRECRAWL_API_KEY) {
    logger.warn('⚠️  FIRECRAWL_API_KEY not set - API calls will fail');
  }
});
