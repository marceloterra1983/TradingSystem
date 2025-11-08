import express from "express";
import { query, validationResult } from "express-validator";
import SemanticSearchService from "../services/semanticSearchService.js";

const router = express.Router();
const service = new SemanticSearchService();

const validate = [
  query("q").trim().notEmpty().withMessage("Query is required"),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  },
];

router.get("/search", validate, async (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = await service.search(q, Number(limit) || 5);
    res.json({ total: results.length, results });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Semantic search failed", message: error.message });
  }
});

export default router;
