import express from 'express';
import fetch from 'node-fetch';
import { createHmac } from 'crypto';

const router = express.Router();

// Config
const QUERY_BASE_URL = (process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret';
const JWT_ALG = (process.env.JWT_ALGORITHM || 'HS256').toUpperCase();

// Minimal HS256 JWT (no external deps)
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHmacSha256(message, secret) {
  return base64url(createHmac('sha256', secret).update(message).digest());
}

function createJwt(payload) {
  if (JWT_ALG !== 'HS256') {
    throw new Error(`Unsupported JWT algorithm: ${JWT_ALG}`);
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;
  const signature = signHmacSha256(signingInput, JWT_SECRET);
  return `${signingInput}.${signature}`;
}

function bearer() {
  const now = Math.floor(Date.now() / 1000);
  const token = createJwt({ sub: 'dashboard', iat: now, exp: now + 3600 });
  return `Bearer ${token}`;
}

// GET /api/v1/rag/search?query=...&max_results=5
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || req.query.q || '').toString();
    const max = parseInt((req.query.max_results || req.query.k || '5').toString(), 10);
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const url = `${QUERY_BASE_URL}/search?query=${encodeURIComponent(query)}&max_results=${isFinite(max) ? max : 5}`;
    const upstream = await fetch(url, { headers: { Authorization: bearer() } });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/v1/rag/query { query, max_results }
router.post('/query', async (req, res) => {
  try {
    const { query, max_results } = req.body || {};
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const url = `${QUERY_BASE_URL}/query`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: bearer() },
      body: JSON.stringify({ query, max_results }),
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
    const upstream = await fetch(url, { headers: { Authorization: bearer() } });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
