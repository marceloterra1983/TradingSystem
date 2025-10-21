import express from "express";
import { RateLimiterMode } from "../types";
import expressWs from "express-ws";
import { searchController } from "../controllers/v2/search";
import { x402SearchController } from "../controllers/v2/x402-search";
import { scrapeController } from "../controllers/v2/scrape";
import { batchScrapeController } from "../controllers/v2/batch-scrape";
import { crawlController } from "../controllers/v2/crawl";
import { crawlParamsPreviewController } from "../controllers/v2/crawl-params-preview";
import { crawlStatusController } from "../controllers/v2/crawl-status";
import { mapController } from "../controllers/v2/map";
import { crawlErrorsController } from "../controllers/v2/crawl-errors";
import { ongoingCrawlsController } from "../controllers/v2/crawl-ongoing";
import { scrapeStatusController } from "../controllers/v2/scrape-status";
import { creditUsageController } from "../controllers/v2/credit-usage";
import { tokenUsageController } from "../controllers/v2/token-usage";
import { crawlCancelController } from "../controllers/v2/crawl-cancel";
import { concurrencyCheckController } from "../controllers/v2/concurrency-check";
import { crawlStatusWSController } from "../controllers/v2/crawl-status-ws";
import { extractController } from "../controllers/v2/extract";
import { extractStatusController } from "../controllers/v2/extract-status";
import {
  authMiddleware,
  checkCreditsMiddleware,
  blocklistMiddleware,
  countryCheck,
  idempotencyMiddleware,
  requestTimingMiddleware,
  wrap,
} from "./shared";
import { queueStatusController } from "../controllers/v2/queue-status";
import { creditUsageHistoricalController } from "../controllers/v2/credit-usage-historical";
import { tokenUsageHistoricalController } from "../controllers/v2/token-usage-historical";
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402";

expressWs(express());

export const v2Router = express.Router();

// Add timing middleware to all v2 routes
v2Router.use(requestTimingMiddleware("v2"));

// Configure payment middleware to enable micropayment-protected endpoints
// This middleware handles payment verification and processing for premium API features
// x402 payments protocol - https://github.com/coinbase/x402
v2Router.use(
  paymentMiddleware(
    (process.env.X402_PAY_TO_ADDRESS as `0x${string}`) ||
      "0x0000000000000000000000000000000000000000",
    {
      "POST /x402/search": {
        price: process.env.X402_ENDPOINT_PRICE_USD as string,
        network: process.env.X402_NETWORK as
          | "base-sepolia"
          | "base"
          | "avalanche-fuji"
          | "avalanche"
          | "iotex",
        config: {
          discoverable: true,
          description:
            "The search endpoint combines web search (SERP) with Firecrawl's scraping capabilities to return full page content for any query. Requires micropayment via X402 protocol",
          mimeType: "application/json",
          maxTimeoutSeconds: 120,
          inputSchema: {
            body: {
              query: {
                type: "string",
                description: "Search query to find relevant web pages",
                required: true,
              },
              sources: {
                type: "array",
                description: "Sources to search (web, news, images)",
                required: false,
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return (max 10)",
                required: false,
              },
              scrapeOptions: {
                type: "object",
                description: "Options for scraping the found pages",
                required: false,
              },
              asyncScraping: {
                type: "boolean",
                description: "Whether to return job IDs for async scraping",
                required: false,
              },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  web: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        markdown: { type: "string" },
                      },
                    },
                  },
                  news: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        title: { type: "string" },
                        snippet: { type: "string" },
                        markdown: { type: "string" },
                      },
                    },
                  },
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        title: { type: "string" },
                        markdown: { type: "string" },
                      },
                    },
                  },
                },
              },
              scrapeIds: {
                type: "object",
                description:
                  "Job IDs for async scraping (if asyncScraping is true)",
                properties: {
                  web: { type: "array", items: { type: "string" } },
                  news: { type: "array", items: { type: "string" } },
                  images: { type: "array", items: { type: "string" } },
                },
              },
              creditsUsed: { type: "number" },
            },
          },
        },
      },
    },
    facilitator,
  ),
);

v2Router.post(
  "/search",
  authMiddleware(RateLimiterMode.Search),
  countryCheck,
  checkCreditsMiddleware(),
  blocklistMiddleware,
  wrap(searchController),
);

v2Router.post(
  "/scrape",
  authMiddleware(RateLimiterMode.Scrape),
  countryCheck,
  checkCreditsMiddleware(1),
  blocklistMiddleware,
  wrap(scrapeController),
);

v2Router.get(
  "/scrape/:jobId",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(scrapeStatusController),
);

v2Router.post(
  "/batch/scrape",
  authMiddleware(RateLimiterMode.Scrape),
  countryCheck,
  checkCreditsMiddleware(),
  blocklistMiddleware,
  wrap(batchScrapeController),
);

v2Router.post(
  "/map",
  authMiddleware(RateLimiterMode.Map),
  checkCreditsMiddleware(1),
  blocklistMiddleware,
  wrap(mapController),
);

v2Router.post(
  "/crawl",
  authMiddleware(RateLimiterMode.Crawl),
  countryCheck,
  checkCreditsMiddleware(),
  blocklistMiddleware,
  idempotencyMiddleware,
  wrap(crawlController),
);

v2Router.post(
  "/crawl/params-preview",
  authMiddleware(RateLimiterMode.Crawl),
  checkCreditsMiddleware(),
  wrap(crawlParamsPreviewController),
);

v2Router.get(
  "/crawl/ongoing",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(ongoingCrawlsController),
);

v2Router.get(
  "/crawl/active",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(ongoingCrawlsController),
);

v2Router.get(
  "/crawl/:jobId",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(crawlStatusController),
);

v2Router.delete(
  "/crawl/:jobId",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(crawlCancelController),
);

v2Router.ws("/crawl/:jobId", crawlStatusWSController);

v2Router.get(
  "/batch/scrape/:jobId",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap((req: any, res: any) => crawlStatusController(req, res, true)),
);

v2Router.delete(
  "/batch/scrape/:jobId",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(crawlCancelController),
);

v2Router.get(
  "/crawl/:jobId/errors",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(crawlErrorsController),
);

v2Router.post(
  "/extract",
  authMiddleware(RateLimiterMode.Extract),
  countryCheck,
  checkCreditsMiddleware(1),
  blocklistMiddleware,
  wrap(extractController),
);

v2Router.get(
  "/extract/:jobId",
  authMiddleware(RateLimiterMode.ExtractStatus),
  wrap(extractStatusController),
);

v2Router.get(
  "/team/credit-usage",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(creditUsageController),
);

v2Router.get(
  "/team/credit-usage/historical",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(creditUsageHistoricalController),
);

v2Router.get(
  "/team/token-usage",
  authMiddleware(RateLimiterMode.ExtractStatus),
  wrap(tokenUsageController),
);

v2Router.get(
  "/team/token-usage/historical",
  authMiddleware(RateLimiterMode.ExtractStatus),
  wrap(tokenUsageHistoricalController),
);

v2Router.get(
  "/concurrency-check",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(concurrencyCheckController),
);

v2Router.get(
  "/team/queue-status",
  authMiddleware(RateLimiterMode.CrawlStatus),
  wrap(queueStatusController),
);

v2Router.post(
  "/x402/search",
  authMiddleware(RateLimiterMode.Search),
  countryCheck,
  blocklistMiddleware,
  wrap(x402SearchController),
);
