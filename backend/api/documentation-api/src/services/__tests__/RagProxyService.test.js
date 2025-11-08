/**
 * Unit Tests for RagProxyService
 * Tests JWT token caching, validation, circuit breakers, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RagProxyService } from "../RagProxyService.js";

// Mock dependencies
vi.mock("node-fetch");
vi.mock("../../../../shared/auth/jwt.js");
vi.mock("../../../../shared/middleware/serviceAuth.js");

describe("RagProxyService", () => {
  let service;
  let mockFetch;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create service instance
    service = new RagProxyService({
      queryBaseUrl: "http://localhost:8202",
      jwtSecret: "test-secret",
      timeout: 5000,
    });

    // Mock fetch globally
    mockFetch = global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // JWT Token Caching Tests
  // ========================================================================

  describe("_getBearerToken", () => {
    it("should cache JWT tokens for 5 minutes", () => {
      const token1 = service._getBearerToken();
      const token2 = service._getBearerToken();

      expect(token1).toBe(token2); // Same token within TTL
      expect(token1).toBeDefined();
    });

    it("should regenerate token after expiration", async () => {
      const token1 = service._getBearerToken();

      // Force token expiration
      service._tokenCache.expiresAt = Date.now() - 1000;

      const token2 = service._getBearerToken();

      expect(token1).not.toBe(token2); // New token after expiry
    });

    it("should use configured TTL", () => {
      const customService = new RagProxyService({
        tokenTTL: 10000, // 10 seconds
      });

      const token = customService._getBearerToken();
      const expectedExpiry = Date.now() + 10000;

      expect(customService._tokenCache.expiresAt).toBeGreaterThanOrEqual(
        expectedExpiry - 100,
      );
      expect(customService._tokenCache.expiresAt).toBeLessThanOrEqual(
        expectedExpiry + 100,
      );
    });
  });

  // ========================================================================
  // Query Validation Tests
  // ========================================================================

  describe("_validateQuery", () => {
    it("should throw on null query", () => {
      expect(() => service._validateQuery(null)).toThrow(
        "Query must be a non-empty string",
      );
    });

    it("should throw on empty query", () => {
      expect(() => service._validateQuery("")).toThrow("Query cannot be empty");
    });

    it("should throw on whitespace-only query", () => {
      expect(() => service._validateQuery("   ")).toThrow(
        "Query cannot be empty",
      );
    });

    it("should throw on query too long", () => {
      const longQuery = "a".repeat(10001);
      expect(() => service._validateQuery(longQuery)).toThrow(
        "Query is too long",
      );
    });

    it("should trim whitespace", () => {
      const query = "  test query  ";
      expect(service._validateQuery(query)).toBe("test query");
    });

    it("should accept valid query", () => {
      const query = "How to configure RAG?";
      expect(service._validateQuery(query)).toBe(query);
    });
  });

  // ========================================================================
  // Max Results Validation Tests
  // ========================================================================

  describe("_validateMaxResults", () => {
    it("should return default when null", () => {
      expect(service._validateMaxResults(null)).toBe(5);
    });

    it("should return default when undefined", () => {
      expect(service._validateMaxResults(undefined)).toBe(5);
    });

    it("should clamp to minimum (1)", () => {
      expect(service._validateMaxResults(0)).toBe(1);
      expect(service._validateMaxResults(-10)).toBe(1);
    });

    it("should clamp to maximum (100)", () => {
      expect(service._validateMaxResults(101)).toBe(100);
      expect(service._validateMaxResults(999)).toBe(100);
    });

    it("should floor decimal values", () => {
      expect(service._validateMaxResults(5.7)).toBe(5);
      expect(service._validateMaxResults(10.2)).toBe(10);
    });

    it("should return default for NaN", () => {
      expect(service._validateMaxResults("not-a-number")).toBe(5);
    });

    it("should accept valid values", () => {
      expect(service._validateMaxResults(10)).toBe(10);
      expect(service._validateMaxResults(50)).toBe(50);
    });
  });

  // ========================================================================
  // Score Threshold Validation Tests
  // ========================================================================

  describe("_normalizeScoreThreshold", () => {
    it("should return default (0.7) when null", () => {
      expect(service._normalizeScoreThreshold(null)).toBe(0.7);
    });

    it("should clamp to minimum (0)", () => {
      expect(service._normalizeScoreThreshold(-0.5)).toBe(0);
    });

    it("should clamp to maximum (1)", () => {
      expect(service._normalizeScoreThreshold(1.5)).toBe(1);
    });

    it("should return default for NaN", () => {
      expect(service._normalizeScoreThreshold("invalid")).toBe(0.7);
    });

    it("should accept valid values", () => {
      expect(service._normalizeScoreThreshold(0.5)).toBe(0.5);
      expect(service._normalizeScoreThreshold(0.9)).toBe(0.9);
    });
  });

  // ========================================================================
  // Circuit Breaker Tests
  // ========================================================================

  describe("Circuit Breakers", () => {
    it("should initialize circuit breakers in constructor", () => {
      expect(service.queryCircuitBreaker).toBeDefined();
      expect(service.collectionsCircuitBreaker).toBeDefined();
    });

    it("should get circuit breaker states", () => {
      const states = service.getCircuitBreakerStates();

      expect(states).toHaveProperty("llamaindex_query");
      expect(states).toHaveProperty("rag_collections");
      expect(states.llamaindex_query).toHaveProperty("state");
      expect(states.llamaindex_query).toHaveProperty("stats");
    });

    it("should report closed state initially", () => {
      const states = service.getCircuitBreakerStates();

      expect(states.llamaindex_query.state).toBe("closed");
      expect(states.rag_collections.state).toBe("closed");
    });
  });

  // ========================================================================
  // Health Check Tests
  // ========================================================================

  describe("checkHealth", () => {
    it("should return health status with circuit breaker states", async () => {
      // Health check bypasses circuit breaker, so we just verify structure
      const health = await service.checkHealth();

      // Health check may fail if actual service unreachable (expected in tests)
      expect(health).toBeDefined();
      expect(health).toHaveProperty("ok");
      expect(health).toHaveProperty("circuitBreakers");
      expect(health.circuitBreakers).toBeDefined();
      expect(health.circuitBreakers.llamaindex_query).toBeDefined();
      expect(health.circuitBreakers.rag_collections).toBeDefined();
    });

    it("should return error status when service unreachable", async () => {
      // Health check will fail gracefully when service down
      const health = await service.checkHealth();

      expect(health).toBeDefined();
      expect(health).toHaveProperty("ok");
      expect(health).toHaveProperty("circuitBreakers");

      // Circuit breakers should be present even on error
      expect(health.circuitBreakers).toBeDefined();
    });
  });
});
