import express from "express";
import { query, validationResult } from "express-validator";
import logger from "../utils/logger.js";

const router = express.Router();

// Import will be injected by server.js
let markdownSearchService;
let searchMetrics;

/**
 * Initialize route with dependencies
 * @param {object} deps - Dependencies
 */
export function initializeRoute(deps) {
  markdownSearchService = deps.markdownSearchService;
  searchMetrics = deps.searchMetrics;
}

/**
 * Validation middleware
 */
const validateSearch = [
  query("q").optional().isString().isLength({ min: 2, max: 200 }).trim(),
  query("domain").optional().isString().trim().isLength({ min: 1, max: 100 }),
  query("type").optional().isString().trim().isLength({ min: 1, max: 100 }),
  query("tags").optional().isString(),
  query("status").optional().isString().trim().isLength({ min: 1, max: 50 }),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const validateSuggest = [
  query("q").isString().isLength({ min: 2, max: 200 }).trim(),
  query("limit").optional().isInt({ min: 1, max: 10 }).toInt(),
];

const validateFacets = [
  query("q").optional().isString().isLength({ min: 0, max: 200 }).trim(),
];

/**
 * Rate limiting for reindex endpoint
 */
const reindexRateLimit = (() => {
  let lastReindex = 0;
  const minInterval = 60000; // 1 minute

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastReindex < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - lastReindex)) / 1000);
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message: `Please wait ${waitTime} seconds before reindexing again`,
      });
    }
    lastReindex = now;
    next();
  };
})();

/**
 * Main search endpoint
 * GET /api/v1/docs/search?q=query&domain=frontend&type=guide&tags=ui,dark-mode&status=active&limit=20
 */
router.get("/search", validateSearch, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const startTime = Date.now();

  try {
    const { q = "", domain, type, tags, status, limit = 20 } = req.query;

    // Parse tags
    const tagArray = tags
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .slice(0, 10) // Max 10 tags
      : [];

    // Build filters
    const filters = {};
    if (domain) filters.domain = domain;
    if (type) filters.type = type;
    if (tagArray.length > 0) filters.tags = tagArray;
    if (status) filters.status = status;

    // Execute search
    const results = await markdownSearchService.search(q, filters, limit);

    const duration = Date.now() - startTime;

    // Record metrics
    if (searchMetrics) {
      searchMetrics.recordFacetedSearch(q, filters, results.total);
    }

    logger.info(
      {
        query: q,
        filters,
        resultCount: results.total,
        duration_ms: duration,
      },
      "Search executed",
    );

    res.json({
      success: true,
      total: results.total,
      results: results.results,
      query: {
        q,
        filters,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Search endpoint error");

    if (searchMetrics) {
      searchMetrics.recordError("search");
    }

    res.status(500).json({
      success: false,
      error: "Search failed",
      message: error.message,
    });
  }
});

/**
 * Facets endpoint
 * GET /api/v1/docs/facets?q=query
 */
router.get("/facets", validateFacets, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { q = "" } = req.query;

    const facets = await markdownSearchService.getFacets(q);

    // Record metrics
    if (searchMetrics) {
      searchMetrics.recordFacetRequest();
    }

    logger.debug({ query: q, facetCounts: facets }, "Facets computed");

    res.json({
      success: true,
      facets,
    });
  } catch (error) {
    logger.error({ err: error }, "Facets endpoint error");

    if (searchMetrics) {
      searchMetrics.recordError("facets");
    }

    res.status(500).json({
      success: false,
      error: "Facets computation failed",
      message: error.message,
    });
  }
});

/**
 * Autocomplete suggestions endpoint
 * GET /api/v1/docs/suggest?q=dar&limit=5
 */
router.get("/suggest", validateSuggest, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { q, limit = 5 } = req.query;

    const suggestions = await markdownSearchService.suggest(q, limit);

    logger.debug(
      { query: q, suggestionCount: suggestions.length },
      "Suggestions generated",
    );

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    logger.error({ err: error }, "Suggest endpoint error");

    res.status(500).json({
      success: false,
      error: "Suggestion failed",
      message: error.message,
    });
  }
});

/**
 * Reindex endpoint
 * POST /api/v1/docs/reindex
 */
router.post("/reindex", reindexRateLimit, async (req, res) => {
  try {
    logger.info("Reindex triggered via API");

    const result = await markdownSearchService.reindex();

    if (result.error) {
      return res.status(429).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      indexed: result,
    });
  } catch (error) {
    logger.error({ err: error }, "Reindex endpoint error");

    res.status(500).json({
      success: false,
      error: "Reindex failed",
      message: error.message,
    });
  }
});

/**
 * Stats endpoint (optional, for monitoring)
 * GET /api/v1/docs/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = markdownSearchService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ err: error }, "Stats endpoint error");

    res.status(500).json({
      success: false,
      error: "Failed to get stats",
      message: error.message,
    });
  }
});

export default router;
