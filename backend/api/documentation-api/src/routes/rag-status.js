import express from 'express';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { createServiceToken } from '../../../../shared/auth/jwt.js';

const router = express.Router();

const QUERY_BASE_URL = (process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
const INGESTION_BASE_URL = (process.env.LLAMAINDEX_INGESTION_URL || 'http://localhost:8201').replace(/\/+$/, '');
const QDRANT_BASE_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'documentation__nomic';
const COLLECTION_ALIASES = new Map([
  ['docs_index', 'documentation__nomic'],
  ['documentation', 'documentation__nomic'],
  ['documentation_v1', 'documentation__nomic'],
  ['docs_index_mxbai', 'documentation__nomic'],
]);
const DEFAULT_DOCS_DIR = process.env.LLAMAINDEX_DOCS_DIR || process.env.DOCS_DIR || path.join(process.cwd(), '../../docs/content');
const INGESTION_DOCS_DIR = process.env.LLAMAINDEX_INGESTION_DOCS_DIR || process.env.LLAMAINDEX_DOCS_DIR || '/data/docs';
const JWT_SECRET = process.env.JWT_SECRET_KEY || '';
const JWT_ALG = (process.env.JWT_ALGORITHM || 'HS256').toUpperCase();
const DEFAULT_REPOSITORY_DIR = process.env.LLAMAINDEX_REPOSITORY_DIR || '/data/tradingsystem';

// Status cache to avoid expensive Qdrant scroll on every request
// TTL: 30 seconds (configurable via STATUS_CACHE_TTL_MS env var)
const STATUS_CACHE_TTL_MS = Number(process.env.STATUS_CACHE_TTL_MS || 30000);
const statusCache = new Map();

function getCachedStatus(collection) {
  const key = collection.toLowerCase();
  const cached = statusCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > STATUS_CACHE_TTL_MS) {
    statusCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedStatus(collection, data) {
  const key = collection.toLowerCase();
  statusCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function invalidateStatusCache(collection) {
  if (collection) {
    const key = collection.toLowerCase();
    statusCache.delete(key);
  } else {
    statusCache.clear();
  }
}

/**
 * Create JWT token for documentation API service
 * @param {Object} additionalClaims - Additional claims to include
 * @returns {string|null} JWT token or null if secret not configured
 */
function createDocApiToken(additionalClaims = {}) {
  if (!JWT_SECRET) return null;
  try {
    return createServiceToken('documentation-api', JWT_SECRET, additionalClaims, { expiresIn: 600 });
  } catch (error) {
    console.error('Failed to create JWT token:', error);
    return null;
  }
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

async function detectOrphanChunks(normalizedIndexedPaths, allDocsFiles) {
  try {
    const existingFilesSet = new Set(allDocsFiles.map(f => f.path));
    const orphans = [];

    // Chunks indexed but file doesn't exist anymore
    for (const indexedPath of normalizedIndexedPaths) {
      if (!existingFilesSet.has(indexedPath)) {
        orphans.push(indexedPath);
      }
    }

    return orphans;
  } catch (error) {
    console.error('Error detecting orphan chunks:', error);
    return [];
  }
}

async function cleanOrphanChunks(targetCollection) {
  try {
    const collection = targetCollection || QDRANT_COLLECTION;
    
    // Get all points from Qdrant
    let allPoints = [];
    let scrollOffset = null;
    let iterations = 0;

    do {
      const payload = { limit: 1000, with_payload: true };
      if (scrollOffset) payload.offset = scrollOffset;
      
      const page = await fetchJson(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(collection)}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!page.ok) break;
      
      const points = Array.isArray(page.data?.result?.points) ? page.data.result.points : [];
      allPoints = allPoints.concat(points);
      
      scrollOffset = page.data?.result?.next_page_offset || null;
      iterations += 1;
      
      if (!scrollOffset || iterations > 100) break;
    } while (true);

    // Get existing files on disk
    const docsDir = DEFAULT_DOCS_DIR;
    const discoverFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const resPath = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            return discoverFiles(resPath);
          }
          if (entry.isFile() && /\.(md|mdx|txt|pdf)$/i.test(entry.name)) {
            return resPath;
          }
          return [];
        }),
      );
      return files.flat();
    };

    const allDocs = await discoverFiles(docsDir);
    const toRelative = (filePath) => path.relative(docsDir, filePath).replace(/\\/g, '/');
    const existingFiles = new Set(allDocs.map(toRelative));

    console.log(`Docs directory: ${docsDir}`);
    console.log(`Total points from Qdrant: ${allPoints.length}`);
    console.log(`Existing files on disk: ${existingFiles.size}`);
    console.log(`Sample existing files:`, Array.from(existingFiles).slice(0, 5));

    // Find orphan point IDs
    const orphanIds = [];
    const orphanPaths = [];
    for (const point of allPoints) {
      const filePath = point.payload?.file_path || point.payload?.path || null;
      if (!filePath) continue;
      
      // Normalize path (same logic as in main status route)
      let normalized = filePath.replace(/\\/g, '/');
      const docsPos = normalized.lastIndexOf('/docs/');
      if (docsPos >= 0) {
        normalized = normalized.slice(docsPos + '/docs/'.length);
      } else if (normalized.startsWith('/data/docs/')) {
        normalized = normalized.slice('/data/docs/'.length);
      } else if (normalized.startsWith('/')) {
        normalized = normalized.slice(1);
      }

      if (/\.(md|mdx|txt|pdf)$/i.test(normalized) && !existingFiles.has(normalized)) {
        orphanIds.push(point.id);
        if (orphanPaths.length < 10) {
          orphanPaths.push(normalized);
        }
      }
    }

    console.log(`Found ${orphanIds.length} orphan chunks. Sample:`, orphanPaths);

    // Delete orphan points
    if (orphanIds.length > 0) {
      const deleteResult = await fetchJson(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(collection)}/points/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: orphanIds,
        }),
      });

      return {
        success: deleteResult.ok,
        orphansFound: orphanIds.length,
        orphansDeleted: deleteResult.ok ? orphanIds.length : 0,
      };
    }

    return {
      success: true,
      orphansFound: 0,
      orphansDeleted: 0,
    };
  } catch (error) {
    console.error('Error cleaning orphan chunks:', error);
    return {
      success: false,
      error: error.message,
      orphansFound: 0,
      orphansDeleted: 0,
    };
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
          if (entry.isFile() && /\.(md|mdx|txt|pdf)$/i.test(entry.name)) {
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
    const missing = Array.from(expectedPaths).filter((p) => !normalizedIndexedPaths.has(p)).sort();

    // Get all files with sizes
    const allFilesWithSize = await Promise.all(
      allDocs.map(async (filePath) => {
        try {
          const stats = await fs.stat(filePath);
          return {
            path: toRelative(filePath),
            size: stats.size,
          };
        } catch {
          return {
            path: toRelative(filePath),
            size: 0,
          };
        }
      }),
    );
    const sortedAllFiles = allFilesWithSize.sort((a, b) => a.path.localeCompare(b.path));

    // Detect orphan chunks (indexed but file doesn't exist)
    const orphans = await detectOrphanChunks(normalizedIndexedPaths, sortedAllFiles);

    return {
      docsDirectory: docsDir,
      totalDocuments: expectedPaths.size,
      indexedDocuments: normalizedIndexedPaths.size,
      missingDocuments: missing.length,
      missingSample: missing,
      indexedSample: Array.from(normalizedIndexedPaths).sort(),
      indexedScanTruncated: truncated,
      indexedRawSample: rawSample.sort(),
      allFilesList: sortedAllFiles,
      orphanChunks: orphans.length,
      orphanSample: orphans.sort(),
    };
  } catch (scanErr) {
    return {
      error: scanErr?.message || 'Failed to scan documentation directory',
      docsDirectory: baseDocsDir,
    };
  }
}

/**
 * Infer embedding model from collection name
 */
function inferEmbeddingModel(collectionName) {
  if (!collectionName) return null;
  const lower = collectionName.toLowerCase();

  // Match by collection name suffix/infix
  if (lower.includes('gemma')) return 'embeddinggemma:latest';
  if (lower.includes('nomic')) return 'nomic-embed-text';
  if (lower.includes('mxbai')) return 'mxbai-embed-large';
  if (lower.includes('e5')) return 'intfloat/multilingual-e5-large';
  if (lower.includes('mini') && lower.includes('lm')) return 'all-minilm-l6-v2';

  // Default fallback (read from env)
  return process.env.OLLAMA_EMBED_MODEL || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
}

/**
 * Get chunk size recommendation for an embedding model
 */
function getRecommendedChunkSize(modelName) {
  if (!modelName) return 512;
  const lower = modelName.toLowerCase();

  // mxbai-embed-large has 512 token context window - use smaller chunks
  if (lower.includes('mxbai')) return 256;

  // Most other models have larger context windows (8192+)
  return 512;
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

      // Infer embedding model from collection name
      const embeddingModel = inferEmbeddingModel(name);
      const recommendedChunkSize = getRecommendedChunkSize(embeddingModel);

      const info = {
        name,
        count,
        embeddingModel,
        recommendedChunkSize,
      };
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

router.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();

  const queryHealth = await fetchJson(`${QUERY_BASE_URL}/health`);
  const ingestionHealth = await fetchJson(`${INGESTION_BASE_URL}/health`);

  const buildMessage = (source) => {
    if (!source) return 'unavailable';
    if (source.ok) {
      const data = source.data || {};
      return data.message || data.status || 'ok';
    }
    return source.error || (source.data && (source.data.message || source.data.detail)) || 'unavailable';
  };

  const payload = {
    timestamp,
    services: {
      query: {
        ok: queryHealth.ok && (queryHealth.data?.status || '').toLowerCase() !== 'missing',
        status: queryHealth.status,
        message: buildMessage(queryHealth),
        collection: queryHealth.data?.collection ?? queryHealth.data?.configuredCollection ?? null,
      },
      ingestion: {
        ok: ingestionHealth.ok && (ingestionHealth.data?.status || '').toLowerCase() !== 'degraded',
        status: ingestionHealth.status,
        message: buildMessage(ingestionHealth),
      },
    },
  };

  return res.json(payload);
});

router.get('/', async (req, res) => {
  const requestedCollectionRaw = (req.query?.collection || req.query?.col || '').toString().trim();
  const targetCollection = requestedCollectionRaw || QDRANT_COLLECTION;

  // Check cache first
  const cached = getCachedStatus(targetCollection);
  if (cached) {
    // Add cache headers
    res.set('X-Cache-Status', 'hit');
    res.set('Cache-Control', `private, max-age=${Math.floor(STATUS_CACHE_TTL_MS / 1000)}`);
    return res.json(cached);
  }

  res.set('X-Cache-Status', 'miss');
  const timestamp = new Date().toISOString();
  const health = {};

  const healthUrl = requestedCollectionRaw
    ? `${QUERY_BASE_URL}/health?collection=${encodeURIComponent(requestedCollectionRaw)}`
    : `${QUERY_BASE_URL}/health`;
  const queryHealth = await fetchJson(healthUrl);
  const reportedCollection = queryHealth.data?.collection || targetCollection;
  const queryFallback = queryHealth.data?.fallbackApplied;
  const collectionExists = queryHealth.data?.collectionExists;
  const queryHealthy = queryHealth.ok && queryHealth.data?.status !== 'missing';
  health.query = {
    ok: queryHealthy,
    status: queryHealth.status,
    message: queryHealthy
      ? reportedCollection
        ? `ok (${reportedCollection}${queryFallback ? ' • fallback' : ''})`
        : 'ok'
      : queryHealth.error || queryHealth.data?.message || queryHealth.data?.detail || 'unavailable',
    collection: reportedCollection,
  };
  if (requestedCollectionRaw && collectionExists === false) {
    health.query.ok = false;
    health.query.message = `coleção ${reportedCollection} indisponível`;
  }

  const ingestionHealth = await fetchJson(`${INGESTION_BASE_URL}/health`);
  health.ingestion = {
    ok: ingestionHealth.ok,
    status: ingestionHealth.status,
    message: ingestionHealth.ok ? 'ok' : ingestionHealth.error || ingestionHealth.data?.detail || 'unavailable',
  };

  const qdrantCount = await fetchJson(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(targetCollection)}/points/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exact: true }),
  });

  let gpuPolicy = null;
  const jwt = createDocApiToken();
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
  const uniqueIndexedSample = [];
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
    return /\.(md|mdx|txt|pdf)$/i.test(candidate) ? candidate : null;
  };
  if (qdrantCount.ok) {
    do {
      const payload = { limit: 1000, with_payload: true };
      if (scrollOffset) payload.offset = scrollOffset;
      const page = await fetchJson(`${QDRANT_BASE_URL}/collections/${encodeURIComponent(targetCollection)}/points/scroll`, {
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
        if (rawPath) {
          indexedRawSample.push(rawPath);
        }
        const normalized = normalizeIndexedPath(rawPath);
      if (normalized) {
        if (!normalizedIndexedPaths.has(normalized)) {
          uniqueIndexedSample.push(normalized);
        }
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
  }

  // Use global mapping if available (set by collection creation), otherwise use defaults
  const collectionDirectories = new Map();
  
  // Load from global mapping (runtime created collections)
  if (global.collectionDirectoryMapping && global.collectionDirectoryMapping.size > 0) {
    for (const [name, dir] of global.collectionDirectoryMapping.entries()) {
      collectionDirectories.set(name, dir);
    }
  }
  
  // Add hardcoded defaults (if not already in mapping)
  if (!collectionDirectories.has(QDRANT_COLLECTION.toLowerCase())) {
    collectionDirectories.set(QDRANT_COLLECTION.toLowerCase(), DEFAULT_DOCS_DIR);
  }
  if (DEFAULT_REPOSITORY_DIR && !collectionDirectories.has('repository')) {
    collectionDirectories.set('repository', DEFAULT_REPOSITORY_DIR);
  }

  const targetDirectory =
    collectionDirectories.get(targetCollection.toLowerCase()) || DEFAULT_DOCS_DIR;

  let docsStats = null;
  try {
    const directoryExists = await fs
      .stat(targetDirectory)
      .then((stat) => stat.isDirectory())
      .catch(() => false);

    if (directoryExists) {
      docsStats = await computeDocsStats(targetDirectory, normalizedIndexedPaths, indexedRawSample, truncated);
      if (docsStats && (!docsStats.indexedSample || docsStats.indexedSample.length === 0)) {
        docsStats.indexedSample = [...uniqueIndexedSample];
      }
    } else {
      docsStats = {
        docsDirectory: targetDirectory,
        totalDocuments: null,
        indexedDocuments: null,
        missingDocuments: null,
        missingSample: [],
        indexedSample: [...uniqueIndexedSample],
        indexedScanTruncated: truncated,
      };
    }
  } catch (scanError) {
    docsStats = {
      docsDirectory: targetDirectory,
      totalDocuments: null,
      indexedDocuments: null,
      missingDocuments: null,
      missingSample: [],
      indexedSample: [...uniqueIndexedSample],
      indexedScanTruncated: truncated,
      error: scanError?.message || `Failed to scan directory ${targetDirectory}`,
    };
  }
  const uniqueIndexedCount = normalizedIndexedPaths.size;
  const collectionsSummary = await fetchCollectionsSummary(targetCollection, indexedCount);

  const responsePayload = {
    timestamp,
    requestedCollection: targetCollection,
    services: health,
    qdrant: {
      collection: targetCollection,
      activeCollection: queryHealth.data?.activeCollection,
      ok: qdrantCount.ok,
      status: qdrantCount.status,
      count: indexedCount,
      sample: indexedRawSample,
    },
    gpuPolicy,
    documentation: docsStats
      ? {
          ...docsStats,
          collection: targetCollection,
          indexedUniqueDocuments: uniqueIndexedCount,
          indexedUniqueSample: uniqueIndexedSample.sort(),
        }
      : docsStats,
    collections: collectionsSummary || [],
  };

  // Cache the response for 30 seconds
  setCachedStatus(targetCollection, responsePayload);

  return res.json(responsePayload);
});

router.post('/ingest', async (req, res) => {
  const rawCollectionName =
    (req.body?.collection_name ||
      req.body?.collection ||
      req.body?.collectionName ||
      req.query?.collection ||
      '').toString().trim();
  const rawEmbeddingModel =
    (req.body?.embedding_model ||
      req.body?.embeddingModel ||
      req.query?.embedding_model ||
      req.query?.embeddingModel ||
      '').toString().trim();
  const rawChunkSize =
    req.body?.chunk_size ??
    req.body?.chunkSize ??
    req.query?.chunk_size ??
    req.query?.chunkSize ??
    null;
  const rawChunkOverlap =
    req.body?.chunk_overlap ??
    req.body?.chunkOverlap ??
    req.query?.chunk_overlap ??
    req.query?.chunkOverlap ??
    null;

  // Infer model from collection name if not provided
  const effectiveModel = rawEmbeddingModel || inferEmbeddingModel(rawCollectionName);

  // Use recommended chunk size for the model if not explicitly provided
  const effectiveChunkSize = rawChunkSize !== null && rawChunkSize !== undefined && !Number.isNaN(Number(rawChunkSize))
    ? Number(rawChunkSize)
    : getRecommendedChunkSize(effectiveModel);

  // Get target directory for the collection
  let targetIngestDirectory = INGESTION_DOCS_DIR;
  if (rawCollectionName && global.collectionDirectoryMapping) {
    const mappedDir = global.collectionDirectoryMapping.get(rawCollectionName.toLowerCase());
    if (mappedDir) {
      // Convert relative path to absolute for ingestion service (expects /data/... paths)
      targetIngestDirectory = mappedDir.startsWith('/') ? mappedDir : `/data/${mappedDir}`;
    }
  }

  const ingestPayload = {
    directory_path: targetIngestDirectory,
  };
  if (rawCollectionName) {
    ingestPayload.collection_name = rawCollectionName;
  }
  if (effectiveModel) {
    ingestPayload.embedding_model = effectiveModel;
  }
  if (effectiveChunkSize !== null && effectiveChunkSize !== undefined) {
    ingestPayload.chunk_size = effectiveChunkSize;
  }
  if (rawChunkOverlap !== null && rawChunkOverlap !== undefined && !Number.isNaN(Number(rawChunkOverlap))) {
    ingestPayload.chunk_overlap = Number(rawChunkOverlap);
  }

  try {
    const ingestResp = await fetch(`${INGESTION_BASE_URL}/ingest/directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestPayload),
      timeout: 60_000,
    });
    const text = await ingestResp.text();
    if (!ingestResp.ok) {
      return res.status(ingestResp.status).json({
        success: false,
        message: text || 'Falha ao iniciar ingestão',
      });
    }
    let responsePayload;
    try {
      responsePayload = text ? JSON.parse(text) : null;
    } catch {
      responsePayload = { raw: text };
    }

    // Invalidate cache for this collection after ingestion starts
    invalidateStatusCache(rawCollectionName || targetCollection);

    return res.json({
      success: true,
      message: `Ingestão acionada para ${DEFAULT_DOCS_DIR}.`,
      ingestion: responsePayload,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Erro ao acionar ingestão',
    });
  }
});

router.post('/clean-orphans', async (req, res) => {
  try {
    const collection = req.body?.collection || req.query?.collection || QDRANT_COLLECTION;
    
    const result = await cleanOrphanChunks(collection);

    if (result.success) {
      // Invalidate cache for this collection after cleaning orphans
      if (result.orphansDeleted > 0) {
        invalidateStatusCache(collection);
      }

      return res.json({
        success: true,
        message: result.orphansDeleted > 0
          ? `${result.orphansDeleted} chunks órfãos removidos com sucesso.`
          : 'Nenhum chunk órfão encontrado.',
        orphansFound: result.orphansFound,
        orphansDeleted: result.orphansDeleted,
        collection,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error || 'Falha ao limpar chunks órfãos',
        orphansFound: result.orphansFound,
        orphansDeleted: result.orphansDeleted,
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Erro ao limpar chunks órfãos',
    });
  }
});

router.post('/delete-collection', async (req, res) => {
  const rawCollection = (req.body?.collection || req.body?.name || '').toString().trim();
  if (!rawCollection) {
    return res.status(400).json({
      success: false,
      message: 'Parâmetro "collection" é obrigatório',
    });
  }

  try {
    const response = await fetch(`${INGESTION_BASE_URL}/documents/${encodeURIComponent(rawCollection)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const raw = await response.text();
    let payload = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      return res.status(response.status || 500).json({
        success: false,
        collection: rawCollection,
        message: typeof payload === 'string' ? payload : payload?.message || `Falha ao remover coleção ${rawCollection}`,
      });
    }

    return res.json({
      success: true,
      collection: rawCollection,
      message:
        (typeof payload === 'object' && payload?.message) ||
        `Coleção ${rawCollection} removida com sucesso.`,
      raw: payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      collection: rawCollection,
      message: error?.message || `Erro ao remover coleção ${rawCollection}`,
    });
  }
});

export default router;
