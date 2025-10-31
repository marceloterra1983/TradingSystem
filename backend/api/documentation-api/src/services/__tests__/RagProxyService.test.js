/**
 * RagProxyService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RagProxyService } from '../RagProxyService.js';
import { ValidationError, ServiceUnavailableError, ExternalServiceError } from '../../middleware/errorHandler.js';

// Mock node-fetch
vi.mock('node-fetch');

describe('RagProxyService', () => {
  let service;
  let mockConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      queryBaseUrl: 'http://localhost:8202',
      jwtSecret: 'test-secret',
      timeout: 5000,
    };

    service = new RagProxyService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(service.queryBaseUrl).toBe('http://localhost:8202');
      expect(service.jwtSecret).toBe('test-secret');
      expect(service.timeout).toBe(5000);
    });

    it('should use defaults when config not provided', () => {
      const defaultService = new RagProxyService();
      expect(defaultService.jwtSecret).toBe('dev-secret');
      expect(defaultService.timeout).toBe(30000);
    });

    it('should strip trailing slashes from URL', () => {
      const configWithSlash = {
        ...mockConfig,
        queryBaseUrl: 'http://localhost:8202///',
      };
      const testService = new RagProxyService(configWithSlash);
      expect(testService.queryBaseUrl).toBe('http://localhost:8202');
    });
  });

  describe('_getBearerToken', () => {
    it('should create Bearer token', () => {
      const token = service._getBearerToken();
      expect(token).toBeTruthy();
      expect(token).toMatch(/^Bearer\s+.+/);
    });

    it('should create different tokens each time (due to timestamp)', async () => {
      const token1 = service._getBearerToken();
      await new Promise(resolve => setTimeout(resolve, 10));
      const token2 = service._getBearerToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('query validation', () => {
    describe('_validateQuery', () => {
      it('should accept valid query strings', () => {
        expect(service._validateQuery('test query')).toBe('test query');
        expect(service._validateQuery('  trimmed  ')).toBe('trimmed');
      });

      it('should reject null or undefined', () => {
        expect(() => service._validateQuery(null)).toThrow(ValidationError);
        expect(() => service._validateQuery(undefined)).toThrow(ValidationError);
      });

      it('should reject non-string values', () => {
        expect(() => service._validateQuery(123)).toThrow(ValidationError);
        expect(() => service._validateQuery({})).toThrow(ValidationError);
        expect(() => service._validateQuery([])).toThrow(ValidationError);
      });

      it('should reject empty strings', () => {
        expect(() => service._validateQuery('')).toThrow(ValidationError);
        expect(() => service._validateQuery('   ')).toThrow(ValidationError);
      });

      it('should reject queries that are too long', () => {
        const longQuery = 'a'.repeat(10001);
        expect(() => service._validateQuery(longQuery)).toThrow(ValidationError);
        expect(() => service._validateQuery(longQuery)).toThrow(/too long/);
      });

      it('should accept queries at the length limit', () => {
        const maxQuery = 'a'.repeat(10000);
        expect(() => service._validateQuery(maxQuery)).not.toThrow();
      });
    });

    describe('_validateMaxResults', () => {
      it('should return default for null/undefined', () => {
        expect(service._validateMaxResults(null)).toBe(5);
        expect(service._validateMaxResults(undefined)).toBe(5);
      });

      it('should accept valid numbers', () => {
        expect(service._validateMaxResults(10)).toBe(10);
        expect(service._validateMaxResults('10')).toBe(10);
        expect(service._validateMaxResults(1)).toBe(1);
        expect(service._validateMaxResults(100)).toBe(100);
      });

      it('should enforce minimum value of 1', () => {
        expect(service._validateMaxResults(0)).toBe(1);
        expect(service._validateMaxResults(-5)).toBe(1);
      });

      it('should enforce maximum value of 100', () => {
        expect(service._validateMaxResults(101)).toBe(100);
        expect(service._validateMaxResults(1000)).toBe(100);
      });

      it('should return default for invalid values', () => {
        expect(service._validateMaxResults('invalid')).toBe(5);
        expect(service._validateMaxResults(NaN)).toBe(5);
        expect(service._validateMaxResults(Infinity)).toBe(5);
      });

      it('should floor decimal values', () => {
        expect(service._validateMaxResults(5.7)).toBe(5);
        expect(service._validateMaxResults(10.9)).toBe(10);
      });
    });
  });

  describe('search', () => {
    it('should make successful search request', async () => {
      const mockResponse = [
        { content: 'result 1', relevance: 0.9 },
        { content: 'result 2', relevance: 0.8 },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.search('test query', 5);

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockResponse);
      expect(result.metadata.query).toBe('test query');
      expect(result.metadata.maxResults).toBe(5);
    });

    it('should validate query before making request', async () => {
      await expect(service.search('', 5)).rejects.toThrow(ValidationError);
      await expect(service.search(null, 5)).rejects.toThrow(ValidationError);
    });

    it('should include collection parameter when provided', async () => {
      let capturedUrl;
      global.fetch = vi.fn().mockImplementation((url) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify([])),
        });
      });

      await service.search('test', 5, 'my_collection');

      expect(capturedUrl).toContain('collection=my_collection');
    });

    it('should handle upstream errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('Internal error'),
      });

      await expect(service.search('test', 5)).rejects.toThrow(ExternalServiceError);
    });

    it('should handle timeout errors', async () => {
      global.fetch = vi.fn().mockRejectedValue({
        name: 'AbortError',
        message: 'Request timeout',
      });

      await expect(service.search('test', 5)).rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('query', () => {
    it('should make successful query request', async () => {
      const mockResponse = {
        answer: 'This is the answer',
        confidence: 0.95,
        sources: [{ content: 'source 1' }],
        metadata: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.query('What is the answer?', 3);

      expect(result.success).toBe(true);
      expect(result.answer).toBe('This is the answer');
      expect(result.confidence).toBe(0.95);
      expect(result.sources).toHaveLength(1);
    });

    it('should validate query before making request', async () => {
      await expect(service.query('')).rejects.toThrow(ValidationError);
      await expect(service.query(null)).rejects.toThrow(ValidationError);
    });

    it('should normalize maxResults parameter', async () => {
      let capturedPayload;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify({ answer: 'test' })),
        });
      });

      await service.query('test', 101); // Should be clamped to 100
      expect(capturedPayload.max_results).toBe(100);

      await service.query('test', 0); // Should be increased to 1
      expect(capturedPayload.max_results).toBe(1);
    });
  });

  describe('getGpuPolicy', () => {
    it('should fetch GPU policy successfully', async () => {
      const mockPolicy = {
        forced: false,
        max_concurrency: 2,
        cooldown_seconds: 5,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockPolicy)),
      });

      const result = await service.getGpuPolicy();

      expect(result.success).toBe(true);
      expect(result.policy).toEqual(mockPolicy);
    });

    it('should handle errors when fetching policy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('Error'),
      });

      await expect(service.getGpuPolicy()).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({ status: 'ok' })),
      });

      const health = await service.checkHealth();

      expect(health.ok).toBe(true);
      expect(health.status).toBe(200);
    });

    it('should return unhealthy status on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await service.checkHealth();

      expect(health.ok).toBe(false);
      expect(health.error).toBe(true);
    });
  });

  describe('getRawResponse', () => {
    it('should return raw response for passthrough', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('raw text response'),
      });

      const response = await service.getRawResponse('/custom-endpoint');

      expect(response.status).toBe(200);
      expect(response.contentType).toBe('text/plain');
      expect(response.body).toBe('raw text response');
    });

    it('should support POST requests with payload', async () => {
      let capturedOptions;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedOptions = options;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve('{}'),
        });
      });

      await service.getRawResponse('/endpoint', 'POST', { data: 'test' });

      expect(capturedOptions.method).toBe('POST');
      expect(capturedOptions.body).toContain('test');
    });
  });
});
