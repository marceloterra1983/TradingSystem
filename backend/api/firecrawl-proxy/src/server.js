import express from "express";
import axios from "axios";

// Shared modules
import { createLogger } from "../../../shared/logger/index.js";
import {
  configureCors,
  configureRateLimit,
  configureHelmet,
  createErrorHandler,
  createNotFoundHandler,
  createCorrelationIdMiddleware,
} from "../../../shared/middleware/index.js";
import { createHealthCheckHandler } from "../../../shared/middleware/health.js";
import {
  configureCompression,
  compressionMetrics,
} from "../../../shared/middleware/compression.js";

const app = express();
const PORT = process.env.PORT || 3600;
const FIRECRAWL_API_URL =
  process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Initialize logger
const logger = createLogger("firecrawl-proxy", {
  version: "1.0.0",
  base: {
    firecrawlApiUrl: FIRECRAWL_API_URL,
    hasApiKey: !!FIRECRAWL_API_KEY,
  },
});

// Middleware stack
app.use(createCorrelationIdMiddleware());
app.use(compressionMetrics);
app.use(configureCompression({ logger }));
app.use(configureHelmet({ logger }));
app.use(configureCors({ logger }));
app.use(configureRateLimit({ logger }));
app.use(express.json());

// Health check endpoint - comprehensive check
app.get(
  "/health",
  createHealthCheckHandler({
    serviceName: "firecrawl-proxy",
    version: "1.0.0",
    logger,
    checks: {
      firecrawlApi: async () => {
        if (!FIRECRAWL_API_KEY) {
          throw new Error("API key not configured");
        }
        // Simple connectivity check to Firecrawl API
        try {
          await axios.get(`${FIRECRAWL_API_URL}/health`, {
            timeout: 5000,
            validateStatus: () => true, // Accept any status
          });
          return "connected";
        } catch (error) {
          if (error.code === "ECONNABORTED") {
            throw new Error("timeout");
          }
          // Even if endpoint doesn't exist, connection is OK
          return "reachable";
        }
      },
    },
  }),
);

// Readiness probe
app.get(
  "/ready",
  createHealthCheckHandler({
    serviceName: "firecrawl-proxy",
    version: "1.0.0",
    logger,
    checks: {
      apiKey: async () => {
        if (!FIRECRAWL_API_KEY) {
          throw new Error("API key not configured");
        }
        return "configured";
      },
    },
  }),
);

// Liveness probe
app.get("/healthz", (req, res) => {
  res.json({
    status: "healthy",
    service: "firecrawl-proxy",
    uptime: process.uptime(),
  });
});

// Scrape endpoint
app.post("/api/scrape", async (req, res) => {
  try {
    const { url, ...options } = req.body;

    if (!url) {
      logger.warn("Scrape request missing URL");
      return res.status(400).json({ error: "URL is required" });
    }

    if (!FIRECRAWL_API_KEY) {
      logger.error("FIRECRAWL_API_KEY not configured");
      return res.status(500).json({
        error: "Firecrawl API key not configured",
        message: "Please set FIRECRAWL_API_KEY environment variable",
      });
    }

    logger.info({ url }, "Scraping URL");

    const response = await axios.post(
      `${FIRECRAWL_API_URL}/v0/scrape`,
      { url, ...options },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds
      },
    );

    logger.info({ url, status: response.status }, "Scrape successful");
    res.json(response.data);
  } catch (error) {
    logger.error({ error: error.message, url: req.body.url }, "Scrape failed");

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Request timeout" });
    }

    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
      firecrawlApiUrl: FIRECRAWL_API_URL,
    });
  }
});

// Crawl endpoint (for multiple pages)
app.post("/api/crawl", async (req, res) => {
  try {
    const { url, ...options } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({
        error: "Firecrawl API key not configured",
      });
    }

    logger.info({ url }, "Starting crawl");

    const response = await axios.post(
      `${FIRECRAWL_API_URL}/v0/crawl`,
      { url, ...options },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    logger.info({ url, jobId: response.data?.jobId }, "Crawl started");
    res.json(response.data);
  } catch (error) {
    logger.error({ error: error.message, url: req.body.url }, "Crawl failed");
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Check crawl status
app.get("/api/crawl/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({
        error: "Firecrawl API key not configured",
      });
    }

    const response = await axios.get(
      `${FIRECRAWL_API_URL}/v0/crawl/status/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    logger.error(
      { error: error.message, jobId: req.params.jobId },
      "Status check failed",
    );
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Error handling middleware
app.use(createNotFoundHandler({ logger }));
app.use(
  createErrorHandler({
    logger,
    includeStack: process.env.NODE_ENV !== "production",
  }),
);

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.startup("Firecrawl Proxy server started", {
    port: PORT,
    firecrawlApiUrl: FIRECRAWL_API_URL,
    hasApiKey: !!FIRECRAWL_API_KEY,
  });

  if (!FIRECRAWL_API_KEY) {
    logger.warn("⚠️  FIRECRAWL_API_KEY not set - API calls will fail");
  }
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, "Shutdown signal received");

  const timeout = setTimeout(() => {
    logger.error("Shutdown timeout - forcing exit");
    process.exit(1);
  }, 10000);

  try {
    // Close server
    await new Promise((resolve) => {
      server.close(resolve);
      logger.info("HTTP server closed");
    });

    clearTimeout(timeout);
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    clearTimeout(timeout);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
});
