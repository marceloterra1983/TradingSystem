import express from 'express';
import fetch from 'node-fetch';
import { createBearer } from '../../../../shared/auth/jwt.js';

const router = express.Router();

// Config
const QUERY_BASE_URL = (process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret';

/**
 * Create Bearer token for dashboard service
 * @returns {string} Bearer token string
 */
function getBearerToken() {
  return createBearer({ sub: 'dashboard' }, JWT_SECRET);
}

// GET /api/v1/rag/search?query=...&max_results=5
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || req.query.q || '').toString();
    const max = parseInt((req.query.max_results || req.query.k || '5').toString(), 10);
    const collection = (req.query.collection || req.query.col || '').toString().trim();
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const url = new URL(`${QUERY_BASE_URL}/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('max_results', Number.isFinite(max) ? String(max) : '5');
    if (collection) {
      url.searchParams.set('collection', collection);
    }
    const upstream = await fetch(url.toString(), { headers: { Authorization: getBearerToken() } });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/v1/rag/query { query, max_results }
router.post('/query', async (req, res) => {
  try {
    const { query, max_results, collection } = req.body || {};
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const url = `${QUERY_BASE_URL}/query`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: getBearerToken() },
      body: JSON.stringify({ query, max_results, collection }),
    });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/v1/rag/gpu/policy
router.get('/gpu/policy', async (_req, res) => {
  try {
    const url = `${QUERY_BASE_URL}/gpu/policy`;
    const upstream = await fetch(url, { headers: { Authorization: getBearerToken() } });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
