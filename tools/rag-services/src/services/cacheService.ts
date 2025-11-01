/**
 * Redis Cache Service
 *
 * Provides caching functionality for collection metrics and stats
 * with configurable TTL and optional fallback to memory cache
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  enabled: boolean;
  url: string;
  ttl: number; // seconds
  keyPrefix: string;
}

export class CacheService {
  private client: RedisClientType | null = null;
  private config: CacheConfig;
  private memoryCache: Map<string, { value: string; expires: number }> = new Map();
  private isConnected = false;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Redis cache is disabled, using memory fallback');
      return;
    }

    try {
      this.client = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection limit reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis cache service initialized', {
        url: this.config.url,
        ttl: this.config.ttl,
      });
    } catch (error) {
      logger.error('Failed to connect to Redis, falling back to memory cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis cache service disconnected');
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.makeKey(key);

    try {
      // Try Redis first
      if (this.client && this.isConnected) {
        const value = await this.client.get(fullKey);
        if (value) {
          logger.debug('Cache HIT (Redis)', { key: fullKey });
          return JSON.parse(value) as T;
        }
      }

      // Fallback to memory cache
      const cached = this.memoryCache.get(fullKey);
      if (cached && cached.expires > Date.now()) {
        logger.debug('Cache HIT (Memory)', { key: fullKey });
        return JSON.parse(cached.value) as T;
      }

      // Clean up expired memory cache entry
      if (cached) {
        this.memoryCache.delete(fullKey);
      }

      logger.debug('Cache MISS', { key: fullKey });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const fullKey = this.makeKey(key);
    const cacheTTL = ttl ?? this.config.ttl;
    const serialized = JSON.stringify(value);

    try {
      // Set in Redis
      if (this.client && this.isConnected) {
        await this.client.setEx(fullKey, cacheTTL, serialized);
        logger.debug('Cache SET (Redis)', { key: fullKey, ttl: cacheTTL });
      }

      // Also set in memory cache as fallback
      this.memoryCache.set(fullKey, {
        value: serialized,
        expires: Date.now() + cacheTTL * 1000,
      });
      logger.debug('Cache SET (Memory)', { key: fullKey, ttl: cacheTTL });
    } catch (error) {
      logger.error('Cache set error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.makeKey(key);

    try {
      if (this.client && this.isConnected) {
        await this.client.del(fullKey);
      }
      this.memoryCache.delete(fullKey);
      logger.debug('Cache DELETE', { key: fullKey });
    } catch (error) {
      logger.error('Cache delete error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.makeKey(pattern);

    try {
      if (this.client && this.isConnected) {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          logger.info('Cache DELETE pattern', { pattern: fullPattern, count: keys.length });
        }
      }

      // Clear matching keys from memory cache
      const memoryKeys = Array.from(this.memoryCache.keys()).filter((k) =>
        k.startsWith(this.config.keyPrefix),
      );
      memoryKeys.forEach((k) => this.memoryCache.delete(k));
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern: fullPattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.config.enabled && this.isConnected;
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      enabled: this.config.enabled,
      connected: this.isConnected,
      url: this.config.url,
      ttl: this.config.ttl,
      memoryKeys: this.memoryCache.size,
    };
  }

  /**
   * Create full cache key with prefix
   */
  private makeKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Clean expired memory cache entries
   */
  cleanMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Singleton instance
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    const config: CacheConfig = {
      enabled: process.env.REDIS_ENABLED === 'true',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      ttl: parseInt(process.env.REDIS_CACHE_TTL || '600', 10), // 10 minutes default
      keyPrefix: 'rag:collections',
    };
    cacheService = new CacheService(config);
  }
  return cacheService;
}
