import { describe, expect, it } from "vitest";
import {
  validateCrawlOptions,
  validateScrapeOptions,
  isValidUrl,
  isValidCrawlLimit,
  isValidCrawlDepth,
} from "../validation";

describe("validation helpers", () => {
  describe("isValidUrl", () => {
    it("accepts http/https URLs", () => {
      expect(isValidUrl("https://tradingsystem.local/docs")).toBe(true);
      expect(isValidUrl("http://localhost:9080/health")).toBe(true);
    });

    it("rejects unsupported protocols", () => {
      expect(isValidUrl("ftp://example.com")).toBe(false);
      expect(isValidUrl("javascript:alert('xss')")).toBe(false);
      expect(isValidUrl("")).toBe(false);
    });
  });

  describe("crawl limits", () => {
    it("validates allowed ranges", () => {
      expect(isValidCrawlLimit(1)).toBe(true);
      expect(isValidCrawlLimit(1000)).toBe(true);
      expect(isValidCrawlLimit(0)).toBe(false);
      expect(isValidCrawlLimit(1001)).toBe(false);
      expect(isValidCrawlLimit(undefined)).toBe(false);
    });

    it("validates crawl depth boundaries", () => {
      expect(isValidCrawlDepth(1)).toBe(true);
      expect(isValidCrawlDepth(10)).toBe(true);
      expect(isValidCrawlDepth(0)).toBe(false);
      expect(isValidCrawlDepth(11)).toBe(false);
      expect(isValidCrawlDepth(undefined)).toBe(false);
    });
  });

  describe("validateScrapeOptions", () => {
    it("returns valid when minimal required data is provided", () => {
      const result = validateScrapeOptions({
        url: "https://tradingsystem.local",
        formats: ["markdown"],
        waitFor: 5000,
        timeout: 15000,
        includeTags: ["div"],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.warnings).toMatchObject({
        includeTags: "Generic selectors may capture unwanted areas: div",
      });
    });

    it("detects invalid combinations", () => {
      const result = validateScrapeOptions(
        {
          url: "notaurl",
          formats: [],
          waitFor: -10,
          timeout: 500,
          includeTags: ["#valid", "??invalid"],
          excludeTags: ["??invalid"],
        },
        { requireUrl: true },
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toMatchObject({
        url: "Please provide a valid URL starting with http:// or https://",
        formats: "Select at least one output format",
        waitFor: "Wait time must be between 0 and 30000 milliseconds",
        timeout: "Timeout must be between 1000 and 120000 milliseconds",
        includeTags: "Invalid CSS selectors: ??invalid",
        excludeTags: "Invalid CSS selectors: ??invalid",
      });
    });

    it("adds warnings when defaults are missing in templates", () => {
      const result = validateScrapeOptions(
        {
          formats: ["markdown"],
        },
        { requireUrl: false },
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.warnings).toMatchObject({
        url: "No default URL provided. Users must supply one when running the template.",
      });
    });
  });

  describe("validateCrawlOptions", () => {
    it("aggregates errors and warnings", () => {
      const result = validateCrawlOptions({
        url: "notaurl",
        limit: 900,
        maxDepth: 6,
        scrapeOptions: {
          url: "notaurl",
          formats: [],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toMatchObject({
        url: "Please provide a valid URL starting with http:// or https://",
        formats: "Select at least one output format",
      });
      expect(result.warnings).toMatchObject({
        limit: "High page limits may take a long time to finish.",
        maxDepth: "Deep crawls may capture irrelevant pages.",
      });
    });
  });
});

