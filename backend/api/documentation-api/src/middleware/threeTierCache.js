/**
 * Three-Tier Caching Strategy
 * L1: In-Memory (< 1ms)
 * L2: Redis (1-2ms)
 * L3: Qdrant (5-10ms)
 */

import crypto from "crypto";

class ThreeTierCache {
  constructor(options = {}) {
    // L1: In-memory cache
    this.memoryCache = new Map();
    this.maxMemorySize = options.maxMemorySize || 1000;
    this.memoryTTL = options.memoryTTL || 300000; // 5 minutes

    // L2: Redis client (injected)
    this.redisClient = options.redisClient || null;
    this.redisTTL = options.redisTTL || 600; // 10 minutes (seconds)

    // Metrics
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Generate cache key from query parameters
   */
  generateKey(query, options = {}) {
    const keyData = {
      query: query.toLowerCase().trim(),
      maxResults: options.maxResults || 5,
      collection: options.collection || "default",
    };

    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(keyData))
      .digest("hex")
      .substring(0, 16);

    return `rag:query:${hash}`;
  }

  /**
   * Get from cache (tries all tiers)
   * @returns {Promise<{data: any, source: string, latency: string} | null>}
   */
  async get(key) {
    const start = Date.now();

    // L1: Memory Cache (fastest)
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);

      if (Date.now() - cached.timestamp < this.memoryTTL) {
        this.stats.l1Hits++;
        const latency = Date.now() - start;

        return {
          data: cached.data,
          source: "memory",
          latency: `${latency}ms`,
          tier: "L1",
        };
      } else {
        // Expired, remove from memory
        this.memoryCache.delete(key);
      }
    }

    // L2: Redis Cache
    if (this.redisClient) {
      try {
        const redisData = await this.redisClient.get(key);

        if (redisData) {
          const parsed = JSON.parse(redisData);

          // Promote to L1 (memory)
          this._setMemory(key, parsed);

          this.stats.l2Hits++;
          const latency = Date.now() - start;

          return {
            data: parsed,
            source: "redis",
            latency: `${latency}ms`,
            tier: "L2",
          };
        }
      } catch (error) {
        console.error("Redis cache error:", error.message);
        // Fall through to L3
      }
    }

    // L3: Cache miss (will query Qdrant)
    this.stats.misses++;
    return null;
  }

  /**
   * Set in cache (all tiers)
   */
  async set(key, data, options = {}) {
    const ttl = options.ttl || this.redisTTL;

    // L1: Memory
    this._setMemory(key, data);

    // L2: Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setex(key, ttl, JSON.stringify(data));
      } catch (error) {
        console.error("Redis set error:", error.message);
      }
    }

    this.stats.l3Hits++;
  }

  /**
   * Set in memory cache (with LRU eviction)
   */
  _setMemory(key, data) {
    // LRU eviction if full
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
      this.stats.evictions++;
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key) {
    // Remove from memory
    this.memoryCache.delete(key);

    // Remove from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error("Redis delete error:", error.message);
      }
    }
  }

  /**
   * Clear all caches
   */
  async clear() {
    this.memoryCache.clear();

    if (this.redisClient) {
      try {
        // Only clear RAG-related keys
        const keys = await this.redisClient.keys("rag:*");
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.error("Redis clear error:", error.message);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total =
      this.stats.l1Hits +
      this.stats.l2Hits +
      this.stats.l3Hits +
      this.stats.misses;

    return {
      ...this.stats,
      total,
      hitRate:
        total > 0
          ? (
              ((this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) /
                total) *
              100
            ).toFixed(2) + "%"
          : "0%",
      l1HitRate:
        total > 0 ? ((this.stats.l1Hits / total) * 100).toFixed(2) + "%" : "0%",
      l2HitRate:
        total > 0 ? ((this.stats.l2Hits / total) * 100).toFixed(2) + "%" : "0%",
      memoryCacheSize: this.memoryCache.size,
      memoryMaxSize: this.maxMemorySize,
    };
  }
}

export default ThreeTierCache;
