import express from "express";
import path from "path";
import { query, validationResult } from "express-validator";
import { fileURLToPath } from "url";
import VersionSearchService from "../services/versionSearchService.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../../../");
const specsDir = path.join(projectRoot, "docs/spec");
const searchService = new VersionSearchService(specsDir);

searchService.initialize().catch((error) => {
  console.error("Failed to initialize search index:", error);
});

const validateSearch = [
  query("q").trim().notEmpty().withMessage("Search query is required"),
  query("type").optional().isIn(["endpoint", "schema", "channel", "message"]),
  query("source").optional().isIn(["openapi", "asyncapi", "schema"]),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  },
];

router.get("/search", validateSearch, async (req, res) => {
  try {
    const { q, type, source, limit } = req.query;
    const results = searchService.search(q, {
      type,
      source,
      limit: limit || 10,
    });

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: "Search failed",
      message: error.message,
    });
  }
});

router.get(
  "/suggest",
  [
    query("q").trim().notEmpty().withMessage("Query is required"),
    query("limit").optional().isInt({ min: 1, max: 10 }).toInt(),
  ],
  async (req, res) => {
    try {
      const { q, limit } = req.query;
      const suggestions = searchService.suggest(q, limit || 5);
      res.json({ suggestions });
    } catch (error) {
      console.error("Suggestion error:", error);
      res.status(500).json({
        error: "Failed to get suggestions",
        message: error.message,
      });
    }
  },
);

router.post("/reindex", async (_req, res) => {
  try {
    const result = await searchService.indexDocumentation();
    res.json(result);
  } catch (error) {
    console.error("Reindex error:", error);
    res.status(500).json({
      error: "Failed to reindex documentation",
      message: error.message,
    });
  }
});

export default router;
