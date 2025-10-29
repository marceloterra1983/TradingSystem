import express from 'express';
import fetch from 'node-fetch';
import { createHmac } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

const QUERY_BASE_URL = (process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
const INGESTION_BASE_URL = (process.env.LLAMAINDEX_INGESTION_URL || 'http://localhost:8201').replace(/\/+$/, '');
const QDRANT_BASE_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'documentation';
const COLLECTION_ALIASES = new Map([
  ['docs_index', 'documentation'],
  ['documentation_v1', 'documentation'],
]);
const DEFAULT_DOCS_DIR = process.env.LLAMAINDEX_DOCS_DIR || process.env.DOCS_DIR || path.join(process.cwd(), '../../docs/content');
const INGESTION_DOCS_DIR = process.env.LLAMAINDEX_INGESTION_DOCS_DIR || process.env.LLAMAINDEX_DOCS_DIR || '/data/docs';
const JWT_SECRET = process.env.JWT_SECRET_KEY || '';
const JWT_ALG = (process.env.JWT_ALGORITHM || 'HS256').toUpperCase();

function signJwt(payload) {
  if (!JWT_SECRET || JWT_ALG !== 'HS256') return null;
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = createHmac('sha256', JWT_SECRET).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${signature}`;
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, { timeout: 7000, ...options });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function computeDocsStats(baseDocsDir, normalizedIndexedPaths, rawSample, truncated) {
  try {
    const docsDir = baseDocsDir;
    const discoverFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const resPath = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            return discoverFiles(resPath);
          }
          if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
            return resPath;
          }
          return [];
        }),
      );
      return files.flat();
    };
    const allDocs = await discoverFiles(docsDir);
    const toRelative = (filePath) => path.relative(docsDir, filePath).replace(/\\/g, '/');
    const expectedPaths = new Set(allDocs.map(toRelative));
    const missing = Array.from(expectedPaths).filter((p) => !normalizedIndexedPaths.has(p));

    return {
      docsDirectory: docsDir,
      totalDocuments: expectedPaths.size,
      indexedDocuments: normalizedIndexedPaths.size,
      missingDocuments: missing.length,
      missingSample: missing.slice(0, 10),
      indexedSample: Array.from(normalizedIndexedPaths).slice(0, 10),
      indexedScanTruncated: truncated,
      indexedRawSample: rawSample,
    };
  } catch (scanErr) {
    return {
      error: scanErr?.message || 'Failed to scan documentation directory',
      docsDirectory: baseDocsDir,
    };
  }
}

async function fetchCollectionsSummary(mainCollection, mainCount) {
  try {
    const list = await fetchJson(`${QDRANT_BASE_URL}/collections`);
    if (!list.ok) return null;
    const collections = Array.isArray(list.data?.result?.collections)
      ? list.data.result.collections
      : [];
    const summary = [];
    const normalizedMain = (mainCollection || '').toLowerCase();
    const seen = new Set();
    for (const entry of collections) {
      const originalName = entry?.name || entry;
      if (!originalName) continue;
      const normalizedOriginal = originalName.toLowerCase();
      const aliasTarget = COLLECTION_ALIASES.get(normalizedOriginal);
      if (aliasTarget && aliasTarget.toLowerCase() === normalizedMain) {
        if (seen.has(`${normalizedMain}::alias::${normalizedOriginal}`)) continue;
        seen.add(`${normalizedMain}::alias::${normalizedOriginal}`);
      } else if (seen.has(normalizedOriginal)) {
        continue;
      } else {
        seen.add(normalizedOriginal);
      }
      const name = originalName;
      let count = null;
      if (typeof mainCount === 'number' && name === mainCollection) {
        count = mainCount;
      } else {
        const resp = await fetchJson(`${QDRANT_BASE_URL}/collections/${name}/points/count`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exact: true }),
        });
        const c = resp.data?.result?.count;
        if (typeof c === 'number') count = c;
      }
      const info = { name, count };
      if (aliasTarget && aliasTarget.toLowerCase() === normalizedMain) {
        info.aliasOf = mainCollection;
      }
      summary.push(info);
    }
    return summary;
  } catch {
    return null;
  }
}

router.get('/', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const health = {};

  const queryHealth = await fetchJson(`${QUERY_BASE_URL}/health`);
  const activeCollection = queryHealth.data?.collection || QDRANT_COLLECTION;
  const queryFallback = queryHealth.data?.fallbackApplied;
  health.query = {
    ok: queryHealth.ok,
    status: queryHealth.status,
    message: queryHealth.ok
      ? queryHealth.data?.collection
        ? `ok (${queryHealth.data.collection}${queryFallback ? ' • fallback' : ''})`
        : 'ok'
      : queryHealth.error || queryHealth.data?.detail || 'unavailable',
  };

  const ingestionHealth = await fetchJson(`${INGESTION_BASE_URL}/health`);
  health.ingestion = {
    ok: ingestionHealth.ok,
    status: ingestionHealth.status,
    message: ingestionHealth.ok ? 'ok' : ingestionHealth.error || ingestionHealth.data?.detail || 'unavailable',
  };

  const qdrantCount = await fetchJson(`${QDRANT_BASE_URL}/collections/${QDRANT_COLLECTION}/points/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exact: true }),
  });

  let gpuPolicy = null;
  const jwt = signJwt({ sub: 'documentation-api', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 });
  const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
  const gpuResp = await fetchJson(`${QUERY_BASE_URL}/gpu/policy`, { headers });
  if (gpuResp.ok) gpuPolicy = gpuResp.data;

  let indexedCount = null;
  const countData = qdrantCount.data?.result?.count;
  if (typeof countData === 'number') {
    indexedCount = countData;
  } else if (countData && typeof countData.count === 'number') {
    indexedCount = countData.count;
  }

  const indexedRawSample = [];
  const normalizedIndexedPaths = new Set();
  let scrollOffset = null;
  let iterations = 0;
  let truncated = false;
  const normalizeIndexedPath = (value) => {
    if (!value || typeof value !== 'string') return null;
    const normalized = value.replace(/\\/g, '/');
    const docsPos = normalized.lastIndexOf('/docs/');
    let candidate = null;
    if (docsPos >= 0) {
      candidate = normalized.slice(docsPos + '/docs/'.length);
    } else if (normalized.startsWith('/')) {
      candidate = normalized.slice(1);
    } else {
      candidate = normalized;
    }
    return /\.(md|mdx)$/i.test(candidate) ? candidate : null;
  };
  do {
    const payload = { limit: 1000, with_payload: true };
    if (scrollOffset) payload.offset = scrollOffset;
    const page = await fetchJson(`${QDRANT_BASE_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!page.ok) {
      truncated = true;
      break;
    }
    const points = Array.isArray(page.data?.result?.points) ? page.data.result.points : [];
    points.forEach((point) => {
      const rawPath = point.payload?.file_path || point.payload?.file || point.payload?.path || null;
      if (rawPath && indexedRawSample.length < 10) {
        indexedRawSample.push(rawPath);
      }
      const normalized = normalizeIndexedPath(rawPath);
      if (normalized) {
        normalizedIndexedPaths.add(normalized);
      }
    });
    scrollOffset = page.data?.result?.next_page_offset || null;
    iterations += 1;
    if (!scrollOffset || iterations > 50) {
      truncated = iterations > 50;
      break;
    }
  } while (true);

  const docsStats = await computeDocsStats(DEFAULT_DOCS_DIR, normalizedIndexedPaths, indexedRawSample, truncated);
  const collectionsSummary = await fetchCollectionsSummary(activeCollection, indexedCount);

  return res.json({
    timestamp,
    services: health,
    qdrant: {
      collection: activeCollection,
      ok: qdrantCount.ok,
      status: qdrantCount.status,
      count: indexedCount,
      sample: indexedRawSample,
    },
    gpuPolicy,
    documentation: docsStats,
    collections: collectionsSummary || [],
  });
});

router.post('/ingest', async (_req, res) => {
  const normalizedIndexedPaths = new Set();
  const docsStats = await computeDocsStats(DEFAULT_DOCS_DIR, normalizedIndexedPaths, [], false);

  if (docsStats.error) {
    return res.status(500).json({
      success: false,
      message: docsStats.error,
      documentation: docsStats,
    });
  }

  if ((docsStats.missingDocuments ?? 0) === 0) {
    return res.json({
      success: true,
      message: 'Todos os documentos já estão indexados.',
      documentation: docsStats,
    });
  }

  try {
    const ingestResp = await fetch(`${INGESTION_BASE_URL}/ingest/directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory_path: INGESTION_DOCS_DIR }),
      timeout: 60_000,
    });
    const text = await ingestResp.text();
    if (!ingestResp.ok) {
      return res.status(ingestResp.status).json({
        success: false,
        message: text || 'Falha ao iniciar ingestão',
      });
    }
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    return res.json({
      success: true,
      message: `Ingestão acionada para ${DEFAULT_DOCS_DIR}.`,
      ingestion: payload,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Erro ao acionar ingestão',
    });
  }
});

export default router;
