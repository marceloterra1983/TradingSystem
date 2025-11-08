/**
 * RAG Proxy Service
 * Handles communication with upstream LlamaIndex query service
 *
 * @module backend/api/documentation-api/src/services/RagProxyService
 */

import { randomUUID } from "crypto";
import fetch from "node-fetch";
import { createBearer } from "../../../../shared/auth/jwt.js";
import {
  ServiceUnavailableError,
  ExternalServiceError,
  ValidationError,
} from "../middleware/errorHandler.js";
import {
  createCircuitBreaker,
  formatCircuitBreakerError,
} from "../middleware/circuitBreaker.js";
import { createServiceAuthHeader } from "../../../../shared/middleware/serviceAuth.js";
import ThreeTierCache from "../middleware/threeTierCache.js";
import { createClient as createRedisClient } from "redis";

/**
 * RAG Proxy Service
 * Manages queries and searches through the LlamaIndex service
 */
export class RagProxyService {
  constructor(config = {}) {
    this.queryBaseUrl = (
      config.queryBaseUrl ||
      process.env.LLAMAINDEX_QUERY_URL ||
      "http://localhost:8202"
    ).replace(/\/+$/, "");
    this.collectionsServiceUrl = (
      config.collectionsServiceUrl ||
      process.env.RAG_COLLECTIONS_URL ||
      "http://rag-collections-service:3402"
    ).replace(/\/+$/, "");
    this.jwtSecret =
      config.jwtSecret || process.env.JWT_SECRET_KEY || "dev-secret";
    this.timeout = config.timeout || 30000; // 30 seconds default

    // JWT token cache (reduces overhead from 1-2ms to <0.1ms per request)
    this._tokenCache = {
      token: null,
      expiresAt: 0,
    };
    this._tokenTTL = config.tokenTTL || 5 * 60 * 1000; // 5 minutes default

    // Initialize Redis client for L2 cache (async, handles errors internally)
    this.redisClient = null; // Start with null, will be set if Redis is enabled
    this._initRedisClient().catch((err) => {
      console.warn("⚠️  Failed to initialize Redis client:", err.message);
    });

    // Initialize 3-tier cache (Memory + Redis + Qdrant)
    // Note: Redis client may be null (memory-only mode)
    this.cache = new ThreeTierCache({
      redisClient: this.redisClient,
      maxMemorySize: parseInt(process.env.CACHE_MEMORY_MAX) || 1000,
      memoryTTL: parseInt(process.env.CACHE_MEMORY_TTL) || 300000,
      redisTTL: parseInt(process.env.CACHE_REDIS_TTL) || 600,
    });

    // Circuit breakers for upstream services (fault tolerance)
    this._initCircuitBreakers();
  }

  /**
   * Initialize Redis client for caching
   * @private
   */
  async _initRedisClient() {
    const redisEnabled = process.env.REDIS_ENABLED === "true";

    if (!redisEnabled) {
      console.log(
        "ℹ️  Redis disabled (REDIS_ENABLED=false) - using memory-only cache",
      );
      this.redisClient = null;
      return;
    }

    try {
      this.redisClient = createRedisClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            // Max 3 retries before giving up
            if (retries > 3)
              return new Error("Redis connection failed after 3 retries");
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.redisClient.on("error", (err) => {
        // Suppress noisy connection errors when Redis is not available
        if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
          // Only log once
          if (!this._redisErrorLogged) {
            console.warn("⚠️  Redis connection failed:", err.message);
            this._redisErrorLogged = true;
          }
        } else {
          console.error("Redis client error:", err.message);
        }
      });

      await this.redisClient.connect();
      console.log("✅ Redis client connected for 3-tier cache");
    } catch (error) {
      console.warn(
        "⚠️  Redis unavailable, using memory-only cache:",
        error.message,
      );
      this.redisClient = null;
    }
  }

  /**
   * Initialize circuit breakers for upstream services
   * @private
   */
  _initCircuitBreakers() {
    // Circuit breaker for LlamaIndex Query Service
    this.queryCircuitBreaker = createCircuitBreaker(
      async (url, options) => {
        const response = await fetch(url, options);
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          contentType:
            response.headers.get("content-type") || "application/json",
          body: text,
          data: text ? this._parseJson(text) : null,
        };
      },
      "LlamaIndex Query Service",
      { timeout: this.timeout },
    );

    // Circuit breaker for RAG Collections Service
    this.collectionsCircuitBreaker = createCircuitBreaker(
      async (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          const text = await response.text();
          return {
            ok: response.ok,
            status: response.status,
            body: text,
            data: text ? this._parseJson(text) : null,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
      "RAG Collections Service",
      { timeout: this.timeout },
    );
  }

  /**
   * Get circuit breaker states for health checks
   */
  getCircuitBreakerStates() {
    return {
      llamaindex_query: {
        state: this.queryCircuitBreaker.opened
          ? "open"
          : this.queryCircuitBreaker.halfOpen
            ? "half-open"
            : "closed",
        stats: this.queryCircuitBreaker.stats,
      },
      rag_collections: {
        state: this.collectionsCircuitBreaker.opened
          ? "open"
          : this.collectionsCircuitBreaker.halfOpen
            ? "half-open"
            : "closed",
        stats: this.collectionsCircuitBreaker.stats,
      },
    };
  }

  /**
   * Create Bearer token for authentication with caching
   * Caches token for 5 minutes to reduce JWT signing overhead
   * @private
   */
  _getBearerToken() {
    const now = Date.now();

    // Return cached token if still valid
    if (this._tokenCache.token && now < this._tokenCache.expiresAt) {
      return this._tokenCache.token;
    }

    // Generate new token
    const token = createBearer(
      { sub: "dashboard", jti: randomUUID() },
      this.jwtSecret,
    );

    // Cache token with expiration
    this._tokenCache.token = token;
    this._tokenCache.expiresAt = now + this._tokenTTL;

    return token;
  }

  /**
   * Make upstream request with authentication and circuit breaker protection
   * @private
   */
  async _makeRequest(url, options = {}, useCircuitBreaker = true) {
    const headers = {
      ...options.headers,
      Authorization: this._getBearerToken(),
      ...createServiceAuthHeader(), // Add X-Service-Token for inter-service auth
    };

    const requestOptions = {
      ...options,
      headers,
      timeout: options.timeout || this.timeout,
    };

    try {
      // Determine which circuit breaker to use based on URL
      const breaker = url.includes(this.queryBaseUrl)
        ? this.queryCircuitBreaker
        : this.collectionsCircuitBreaker;

      if (useCircuitBreaker) {
        // Use circuit breaker for fault tolerance
        return await breaker.fire(url, requestOptions);
      } else {
        // Direct call (for health checks, etc.)
        const response = await fetch(url, requestOptions);
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          contentType:
            response.headers.get("content-type") || "application/json",
          body: text,
          data: text ? this._parseJson(text) : null,
        };
      }
    } catch (error) {
      // Handle circuit breaker errors specifically
      if (error.message && error.message.includes("Breaker is open")) {
        const serviceName = url.includes(this.queryBaseUrl)
          ? "LlamaIndex Query Service"
          : "RAG Collections Service";
        throw new ServiceUnavailableError(serviceName, {
          reason: "Circuit breaker open",
          retryAfter: Math.ceil(CIRCUIT_BREAKER_OPTIONS.resetTimeout / 1000),
        });
      }

      if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
        throw new ServiceUnavailableError("Upstream service", {
          reason: "Request timeout",
          timeout: this.timeout,
        });
      }
      throw new ExternalServiceError("Upstream service", error);
    }
  }

  /**
   * Safely parse JSON
   * @private
   */
  _parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Validate query parameters
   * @private
   */
  _validateQuery(query) {
    if (typeof query !== "string") {
      throw new ValidationError("Query must be a non-empty string");
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new ValidationError("Query cannot be empty");
    }

    if (trimmed.length > 10000) {
      throw new ValidationError("Query is too long (max 10000 characters)");
    }

    return trimmed;
  }

  /**
   * Validate and normalize max_results parameter
   * @private
   */
  _validateMaxResults(maxResults) {
    if (maxResults === null || maxResults === undefined) {
      return 5; // Default value
    }

    const num = Number(maxResults);

    if (isNaN(num) || !Number.isFinite(num)) {
      return 5;
    }

    if (num < 1) return 1;
    if (num > 100) return 100;

    return Math.floor(num);
  }

  /**
   * Normalize score threshold parameter
   * @private
   */
  _normalizeScoreThreshold(scoreThreshold) {
    if (scoreThreshold === null || scoreThreshold === undefined) {
      return 0.7;
    }

    const numeric = Number(scoreThreshold);
    if (Number.isNaN(numeric) || !Number.isFinite(numeric)) {
      return 0.7;
    }

    if (numeric < 0) return 0;
    if (numeric > 1) return 1;

    return numeric;
  }

  /**
   * Perform semantic search
   */
  async search(query, maxResults = 5, collection = null) {
    // Validate inputs
    const validQuery = this._validateQuery(query);
    const validMaxResults = this._validateMaxResults(maxResults);

    // 🚀 QUICK WIN: Check cache first
    const cacheKey = this.cache.generateKey(validQuery, {
      maxResults: validMaxResults,
      collection,
    });
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        _cacheHit: true,
        _cacheSource: cached.source,
        _cacheTier: cached.tier,
        _cacheLatency: cached.latency,
      };
    }

    // Build URL with query parameters
    const url = new URL(`${this.queryBaseUrl}/search`);
    url.searchParams.set("query", validQuery);
    url.searchParams.set("max_results", String(validMaxResults));

    if (collection && collection.trim().length > 0) {
      url.searchParams.set("collection", collection.trim());
    }

    // Make request
    const response = await this._makeRequest(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        "LlamaIndex search",
        new Error(response.body || "Search request failed"),
        { statusCode: response.status },
      );
    }

    const result = {
      success: true,
      results: response.data || [],
      metadata: {
        query: validQuery,
        maxResults: validMaxResults,
        collection: collection || null,
      },
      _cacheHit: false,
    };

    // 🚀 QUICK WIN: Store in cache
    this.cache.set(cacheKey, result).catch((err) => {
      console.warn("Cache set failed:", err.message);
    });

    return result;
  }

  /**
   * Perform semantic search using the RAG Collections Service (vector-first)
   */
  async queryCollectionsService(query, options = {}) {
    const validQuery = this._validateQuery(query);
    const limit = this._validateMaxResults(
      options.limit ?? options.max_results ?? 10,
    );
    const scoreThreshold = this._normalizeScoreThreshold(
      options.score_threshold,
    );

    const payload = {
      query: validQuery,
      limit,
      score_threshold: scoreThreshold,
    };

    if (options.collection && options.collection.trim().length > 0) {
      payload.collection = options.collection.trim();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.collectionsServiceUrl}/api/v1/rag/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      const data = bodyText ? this._parseJson(bodyText) : null;

      if (!response.ok || !data?.success) {
        const errorMessage =
          data?.error?.message ||
          bodyText ||
          "Collections service query failed";
        throw new ExternalServiceError(
          "RAG Collections service",
          new Error(errorMessage),
          { statusCode: response.status },
        );
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ServiceUnavailableError("RAG Collections service", {
          reason: "Request timeout",
          timeout: this.timeout,
        });
      }
      if (
        error instanceof ServiceUnavailableError ||
        error instanceof ExternalServiceError
      ) {
        throw error;
      }
      throw new ExternalServiceError("RAG Collections service", error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Perform question answering with context
   */
  async query(queryText, maxResults = 5, collection = null) {
    // Validate inputs
    const validQuery = this._validateQuery(queryText);
    const validMaxResults = this._validateMaxResults(maxResults);

    // Build request payload
    const payload = {
      query: validQuery,
      max_results: validMaxResults,
    };

    if (collection && collection.trim().length > 0) {
      payload.collection = collection.trim();
    }

    // ========================================================================
    // 🚀 QUICK WIN: 3-Tier Cache (Memory + Redis + Qdrant)
    // Expected: 70% cache hit rate, 3-5x speedup for cached queries
    // ========================================================================
    const cacheKey = this.cache.generateKey(validQuery, {
      maxResults: validMaxResults,
      collection,
    });

    // Try cache first (L1: Memory < 1ms, L2: Redis 1-2ms)
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        _cacheHit: true,
        _cacheSource: cached.source,
        _cacheTier: cached.tier,
        _cacheLatency: cached.latency,
      };
    }
    // ========================================================================

    // Cache miss - Make request to upstream
    const response = await this._makeRequest(`${this.queryBaseUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        "LlamaIndex query",
        new Error(response.body || "Query request failed"),
        { statusCode: response.status },
      );
    }

    const result = {
      success: true,
      answer: response.data?.answer || "",
      confidence: response.data?.confidence || 0,
      sources: response.data?.sources || [],
      metadata: response.data?.metadata || {},
      _cacheHit: false,
    };

    // 🚀 QUICK WIN: Store in cache for future requests
    this.cache.set(cacheKey, result).catch((err) => {
      console.warn("Cache set failed:", err.message);
    });

    return result;
  }

  /**
   * Get GPU policy information
   */
  async getGpuPolicy() {
    const response = await this._makeRequest(
      `${this.queryBaseUrl}/gpu/policy`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new ExternalServiceError(
        "LlamaIndex GPU policy",
        new Error(response.body || "GPU policy request failed"),
        { statusCode: response.status },
      );
    }

    return {
      success: true,
      policy: response.data || {},
    };
  }

  /**
   * Check service health (includes circuit breaker status)
   */
  async checkHealth() {
    try {
      const response = await this._makeRequest(
        `${this.queryBaseUrl}/health`,
        { method: "GET", timeout: 5000 },
        false, // Don't use circuit breaker for health checks
      );

      return {
        ok: response.ok,
        status: response.status,
        message: response.data?.message || response.data?.status || "unknown",
        data: response.data,
        circuitBreakers: this.getCircuitBreakerStates(),
        cache: this.cache.getStats(), // Include cache statistics in health check
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        message: error.message,
        error: true,
        circuitBreakers: this.getCircuitBreakerStates(),
      };
    }
  }

  /**
   * Get raw response (for passthrough scenarios)
   * Use this when you need to return the upstream response directly
   */
  async getRawResponse(endpoint, method = "GET", payload = null) {
    const url = `${this.queryBaseUrl}${endpoint}`;
    const options = {
      method,
      headers: { Authorization: this._getBearerToken() },
    };

    if (
      payload &&
      (method === "POST" || method === "PUT" || method === "PATCH")
    ) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    const response = await this._makeRequest(url, options);

    return {
      status: response.status,
      contentType: response.contentType,
      body: response.body,
    };
  }
}

export default RagProxyService;
