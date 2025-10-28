import express from 'express';
import { query, validationResult } from 'express-validator';
import SemanticSearchService from '../services/semanticSearchService.js';

// Router and shared instances
const router = express.Router();
let markdownSearchService; // injected by initializeHybridRoute
const semanticService = new SemanticSearchService();

export function initializeHybridRoute(deps) {
  markdownSearchService = deps.markdownSearchService;
}

const validate = [
  query('q').trim().isLength({ min: 2, max: 200 }).withMessage('Query is required (min 2 chars)'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('alpha').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  query('domain').optional().isString(),
  query('type').optional().isString(),
  query('tags').optional().isString(),
  query('status').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  },
];

function normalizeScores(mapOfScores) {
  const scores = Array.from(mapOfScores.values());
  if (scores.length === 0) return new Map();
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const denom = max - min || 1;
  const out = new Map();
  for (const [k, v] of mapOfScores.entries()) {
    out.set(k, (v - min) / denom);
  }
  return out;
}

function basePathFromUrl(url) {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}

function applyFilters(doc, filters) {
  if (filters.domain && doc.domain && doc.domain !== filters.domain) return false;
  if (filters.type && doc.type && doc.type !== filters.type) return false;
  if (filters.status && doc.status && doc.status !== filters.status) return false;
  if (filters.tags && filters.tags.length > 0) {
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    for (const t of filters.tags) if (!tags.includes(t)) return false;
  }
  return true;
}

router.get('/search-hybrid', validate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const alpha = typeof req.query.alpha === 'number' ? req.query.alpha : 0.65;

    // Parse filters
    const tagArray = req.query.tags
      ? String(req.query.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];
    const filters = {
      domain: req.query.domain || undefined,
      type: req.query.type || undefined,
      status: req.query.status || undefined,
      tags: tagArray,
    };

    // 1) Lexical via FlexSearch (enriched)
    const lexScoresById = new Map();
    const lexDocsById = new Map();
    if (!markdownSearchService || !markdownSearchService.index) {
      throw new Error('Markdown search index not ready');
    }
    const lexRaw = markdownSearchService.index.search({
      query: q.trim(),
      limit: Number(limit) * 4,
      enrich: true,
    });
    if (Array.isArray(lexRaw)) {
      for (const field of lexRaw) {
        for (const r of field.result || []) {
          const id = r.id;
          const score = typeof r.score === 'number' ? r.score : 1;
          const doc = markdownSearchService.docsById?.[id];
          if (!doc) continue;
          // Apply post filters
          if (!applyFilters(doc, filters)) continue;
          lexDocsById.set(id, doc);
          const prev = lexScoresById.get(id) || 0;
          if (score > prev) lexScoresById.set(id, score);
        }
      }
    }
    const lexNorm = normalizeScores(lexScoresById);
    // Build a basePath -> lexicalScore map
    const baseLex = new Map();
    for (const [id, doc] of lexDocsById.entries()) {
      const url = doc.path; // already "/docs/..."
      const base = basePathFromUrl(url);
      const s = lexNorm.get(id) ?? 0;
      const prev = baseLex.get(base) || 0;
      if (s > prev) baseLex.set(base, s);
    }

    // 2) Semantic via Qdrant
    const semRaw = await semanticService.search(q, Number(limit) * 4);
    const semanticItems = [];
    for (const item of semRaw) {
      const p = item.payload || {};
      // Apply filters on semantic payload, best-effort
      if (!applyFilters(p, filters)) continue;
      semanticItems.push({
        id: item.id,
        score: typeof item.score === 'number' ? item.score : 0,
        path: p.path,
        url: p.url || (p.path ? `/docs/${String(p.path).replace(/\.mdx?$/, '')}` : undefined),
        title: p.title || p.path,
        tags: p.tags || [],
        domain: p.domain || undefined,
        type: p.type || undefined,
        snippet: p.content || '',
      });
    }

    // 3) Merge + rerank
    const results = [];
    const seen = new Set();
    const qLower = q.toLowerCase();
    for (const it of semanticItems) {
      const url = it.url || it.path || '';
      if (!url) continue;
      const base = basePathFromUrl(url);
      const lex = baseLex.get(base) || 0; // lexical support for same page
      let combined = alpha * it.score + (1 - alpha) * lex;
      // Light heuristic boosts
      const titleLc = String(it.title || '').toLowerCase();
      if (titleLc.includes(qLower)) combined += 0.05;
      if (Array.isArray(it.tags) && it.tags.some((t) => String(t).toLowerCase().includes(qLower))) {
        combined += 0.02;
      }
      results.push({
        title: it.title,
        url,
        path: it.path,
        snippet: it.snippet,
        score: Number(combined.toFixed(6)),
        source: 'hybrid',
        components: { semantic: true, lexical: lex > 0 },
        tags: it.tags,
        domain: it.domain,
        type: it.type,
      });
      seen.add(url);
    }

    // Add leftover strong lexical hits (no semantic match)
    for (const [id, doc] of lexDocsById.entries()) {
      const url = doc.path;
      if (seen.has(url)) continue;
      const lex = lexNorm.get(id) || 0;
      const combined = (1 - alpha) * lex; // no semantic support
      results.push({
        title: doc.title,
        url,
        path: url,
        snippet: doc.summary || '',
        score: Number(combined.toFixed(6)),
        source: 'hybrid',
        components: { semantic: false, lexical: true },
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        domain: doc.domain,
        type: doc.type,
      });
    }

    // Sort and slice
    results.sort((a, b) => b.score - a.score);
    const final = results.slice(0, Number(limit));

    return res.json({ total: final.length, results: final, alpha });
  } catch (error) {
    return res.status(500).json({ error: 'Hybrid search failed', message: error.message });
  }
});

export default router;

