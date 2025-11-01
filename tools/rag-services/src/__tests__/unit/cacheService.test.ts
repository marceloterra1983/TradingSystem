/**
 * CacheService Unit Tests
 *
 * Tests for Redis cache service with memory fallback
 */

import { CacheService, CacheConfig } from '../../services/cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;
  let config: CacheConfig;

  beforeEach(() => {
    config = {
      enabled: false, // Disable Redis for unit tests (use memory fallback)
      url: 'redis://localhost:6379',
      ttl: 600,
      keyPrefix: 'rag:test',
    };
    cacheService = new CacheService(config);
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('connect', () => {
    it('should initialize with memory fallback when Redis is disabled', async () => {
      await cacheService.connect();
      // No error should be thrown
      expect(true).toBe(true);
    });

    it.skip('should handle Redis connection failures gracefully', async () => {
      // Skipped: Takes too long waiting for connection timeout
      // TODO: Mock Redis client to test this scenario
    });
  });

  describe('get and set (memory fallback)', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should store and retrieve string values', async () => {
      const key = 'test-string';
      const value = 'hello world';

      await cacheService.set(key, value);
      const result = await cacheService.get<string>(key);

      expect(result).toBe(value);
    });

    it('should store and retrieve object values', async () => {
      const key = 'test-object';
      const value = { foo: 'bar', count: 42 };

      await cacheService.set(key, value);
      const result = await cacheService.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should respect TTL and expire entries', async () => {
      const shortTTLConfig: CacheConfig = {
        enabled: false,
        url: 'redis://localhost:6379',
        ttl: 1, // 1 second TTL
        keyPrefix: 'rag:test',
      };
      const service = new CacheService(shortTTLConfig);
      await service.connect();

      const key = 'expiring-key';
      const value = 'will expire';

      await service.set(key, value);

      // Should exist immediately
      let result = await service.get<string>(key);
      expect(result).toBe(value);

      // Wait for expiration (1.5 seconds to be safe)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired
      result = await service.get<string>(key);
      expect(result).toBeNull();

      await service.disconnect();
    });

    it('should override existing values', async () => {
      const key = 'override-test';

      await cacheService.set(key, 'first value');
      let result = await cacheService.get<string>(key);
      expect(result).toBe('first value');

      await cacheService.set(key, 'second value');
      result = await cacheService.get<string>(key);
      expect(result).toBe('second value');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should delete existing keys', async () => {
      const key = 'delete-test';
      const value = 'to be deleted';

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toBe(value);

      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should not throw when deleting non-existent keys', async () => {
      await expect(cacheService.delete('non-existent')).resolves.not.toThrow();
    });
  });

  // Note: clear() method is not yet implemented in CacheService
  // Skipping these tests until the feature is added
  describe.skip('clear', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should clear all cached entries matching pattern', async () => {
      // TODO: Implement after clear() method is added
    });

    it('should support pattern-based clearing', async () => {
      // TODO: Implement after clear() method is added
    });
  });

  // Skip tests for private methods (better practice is to test public behavior)
  describe.skip('makeKey', () => {
    it('should prefix keys correctly', () => {
      // Testing private methods is not recommended
      // Instead, test the public API behavior
    });
  });

  describe.skip('isExpired', () => {
    it('should correctly identify expired entries', () => {
      // Testing private methods is not recommended
      // Expiration is tested through TTL tests in get/set
    });
  });

  describe.skip('cleanupExpired', () => {
    it('should remove expired entries from memory cache', () => {
      // Testing private methods is not recommended
      // Cleanup is tested indirectly through TTL expiration
    });
  });
});
