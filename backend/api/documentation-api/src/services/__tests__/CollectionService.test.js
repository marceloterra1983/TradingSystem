/**
 * CollectionService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollectionService } from '../CollectionService.js';
import { ServiceUnavailableError, ExternalServiceError } from '../../middleware/errorHandler.js';

// Mock node-fetch
vi.mock('node-fetch');

describe('CollectionService', () => {
  let service;
  let mockConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      queryBaseUrl: 'http://localhost:8202',
      ingestionBaseUrl: 'http://localhost:8201',
      qdrantBaseUrl: 'http://localhost:6333',
      jwtSecret: 'test-secret',
      defaultCollection: 'test_collection',
      statusCacheTtl: 5000, // 5 seconds for testing
    };

    service = new CollectionService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(service.queryBaseUrl).toBe('http://localhost:8202');
      expect(service.ingestionBaseUrl).toBe('http://localhost:8201');
      expect(service.qdrantBaseUrl).toBe('http://localhost:6333');
      expect(service.defaultCollection).toBe('test_collection');
    });

    it('should use defaults when config not provided', () => {
      const defaultService = new CollectionService();
      expect(defaultService.defaultCollection).toBe('documentation__nomic');
    });

    it('should strip trailing slashes from URLs', () => {
      const configWithSlashes = {
        ...mockConfig,
        queryBaseUrl: 'http://localhost:8202/',
        ingestionBaseUrl: 'http://localhost:8201///',
      };
      const testService = new CollectionService(configWithSlashes);
      expect(testService.queryBaseUrl).toBe('http://localhost:8202');
      expect(testService.ingestionBaseUrl).toBe('http://localhost:8201');
    });
  });

  describe('cache management', () => {
    it('should cache status data', () => {
      const testData = { test: 'data', timestamp: Date.now() };
      service._setCachedStatus('test_collection', testData);

      const cached = service._getCachedStatus('test_collection');
      expect(cached).toEqual(testData);
    });

    it('should return null for expired cache', async () => {
      const expiredService = new CollectionService({ ...mockConfig, statusCacheTtl: 10 }); // 10ms
      expiredService._setCachedStatus('test_collection', { test: 'data' });

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      const cached = expiredService._getCachedStatus('test_collection');
      expect(cached).toBeNull();
    });

    it('should invalidate specific collection cache', () => {
      service._setCachedStatus('collection1', { data: 1 });
      service._setCachedStatus('collection2', { data: 2 });

      service.invalidateCache('collection1');

      expect(service._getCachedStatus('collection1')).toBeNull();
      expect(service._getCachedStatus('collection2')).not.toBeNull();
    });

    it('should invalidate all caches when no collection specified', () => {
      service._setCachedStatus('collection1', { data: 1 });
      service._setCachedStatus('collection2', { data: 2 });

      service.invalidateCache();

      expect(service._getCachedStatus('collection1')).toBeNull();
      expect(service._getCachedStatus('collection2')).toBeNull();
    });

    it('should handle case-insensitive collection names', () => {
      service._setCachedStatus('TestCollection', { data: 'test' });

      const cached1 = service._getCachedStatus('TestCollection');
      const cached2 = service._getCachedStatus('testcollection');
      const cached3 = service._getCachedStatus('TESTCOLLECTION');

      expect(cached1).toEqual(cached2);
      expect(cached2).toEqual(cached3);
    });
  });

  describe('_createToken', () => {
    it('should create JWT token with default claims', () => {
      const token = service._createToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should create token with additional claims', () => {
      const token = service._createToken({ role: 'admin' });
      expect(token).toBeTruthy();
    });

    it('should return null when no secret configured', () => {
      const noSecretService = new CollectionService({ ...mockConfig, jwtSecret: '' });
      const token = noSecretService._createToken();
      expect(token).toBeNull();
    });
  });

  describe('getHealth', () => {
    it('should return health status for all services', async () => {
      // Mock successful responses
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          // Query health
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: 'ok' })),
        })
        .mockResolvedValueOnce({
          // Ingestion health
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: 'ok' })),
        });

      global.fetch = mockFetch;

      const health = await service.getHealth();

      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
      expect(health.services).toHaveProperty('query');
      expect(health.services).toHaveProperty('ingestion');
      expect(health.services.query.ok).toBe(true);
      expect(health.services.ingestion.ok).toBe(true);
    });

    it('should handle service failures gracefully', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: 'ok' })),
        });

      global.fetch = mockFetch;

      await expect(service.getHealth()).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('validation', () => {
    it('should validate collection names', () => {
      expect(() => service.deleteCollection('')).rejects.toThrow();
      expect(() => service.deleteCollection('   ')).rejects.toThrow();
    });
  });
});
