import express from "express";
import path from "path";
import { body, param, validationResult } from "express-validator";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import VersionManager from "../services/versionManager.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../../../");
const specsDir = path.join(projectRoot, "docs/spec");
const versionManager = new VersionManager(specsDir);

versionManager.initialize().catch(console.error);

router.get("/versions", async (_req, res) => {
  try {
    const versions = await versionManager.listVersions();
    res.json(versions);
  } catch (error) {
    res.status(500).json({
      error: "Failed to list versions",
      message: error.message,
    });
  }
});

router.get(
  "/versions/:version",
  [param("version").isString().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const version = await versionManager.getVersion(req.params.version);
      res.json(version);
    } catch (error) {
      res.status(error.message.includes("not found") ? 404 : 500).json({
        error: "Failed to get version",
        message: error.message,
      });
    }
  },
);

router.post(
  "/versions",
  [body("type").optional().isIn(["major", "minor", "patch"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const version = await versionManager.createVersion(req.body.type);
      res.status(201).json(version);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create version",
        message: error.message,
      });
    }
  },
);

router.get(
  "/versions/compare/:v1/:v2",
  [param("v1").isString().notEmpty(), param("v2").isString().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const comparison = await versionManager.compareVersions(
        req.params.v1,
        req.params.v2,
      );
      res.json(comparison);
    } catch (error) {
      res.status(500).json({
        error: "Failed to compare versions",
        message: error.message,
      });
    }
  },
);

router.get(
  "/versions/:version/spec/:type",
  [
    param("version").isString().notEmpty(),
    param("type").isIn(["openapi", "asyncapi"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const version = await versionManager.getVersion(req.params.version);
      const specPath = version.specs[req.params.type];

      res.sendFile(specPath, {
        headers: {
          "Content-Type": "text/yaml",
        },
      });
    } catch (error) {
      res.status(error.message.includes("not found") ? 404 : 500).json({
        error: "Failed to get spec file",
        message: error.message,
      });
    }
  },
);

router.get(
  "/versions/:version/status",
  [param("version").isString().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const version = await versionManager.getVersion(req.params.version);

      let openApiStatus = "healthy";
      try {
        await fs.access(version.specs.openapi);
      } catch {
        openApiStatus = "error";
      }

      let asyncApiStatus = "healthy";
      try {
        await fs.access(version.specs.asyncapi);
      } catch {
        asyncApiStatus = "error";
      }

      const stats = await versionManager.getVersionStats(req.params.version);

      res.json({
        openapi: openApiStatus,
        asyncapi: asyncApiStatus,
        lastUpdated: version.lastUpdated,
        version: version.version,
        endpoints: stats.endpoints,
        channels: stats.channels,
      });
    } catch (error) {
      res.status(error.message.includes("not found") ? 404 : 500).json({
        error: "Failed to get version status",
        message: error.message,
      });
    }
  },
);

export default router;
