import express from "express";
import fs from "fs/promises";
import path from "path";
import { query, validationResult } from "express-validator";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/v1/docs/content?path=tools/runtime/docker-wsl/overview.mdx
 * Returns raw markdown content for a given file path
 */
router.get(
  "/content",
  [query("path").isString().isLength({ min: 1, max: 500 }).trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      const { path: filePath } = req.query;

      // Security: Prevent path traversal attacks
      if (filePath.includes("..") || filePath.startsWith("/")) {
        return res.status(400).json({
          success: false,
          error: "Invalid file path",
        });
      }

      // Resolve full path (docs/content is already set in markdownSearchService)
      const docsDir =
        global.markdownDocsDir ||
        path.join(process.cwd(), "../../../../docs/content");
      const fullPath = path.join(docsDir, filePath);

      logger.info({ filePath, fullPath }, "Reading markdown file");

      // Read file content
      const content = await fs.readFile(fullPath, "utf-8");

      res.json({
        success: true,
        path: filePath,
        content,
        size: content.length,
      });
    } catch (error) {
      logger.error(
        { error, path: req.query.path },
        "Failed to read markdown file",
      );

      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to read file",
      });
    }
  },
);

export default router;
