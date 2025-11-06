/**
 * Unit Tests for Circuit Breaker Middleware
 * Tests circuit breaker creation, state management, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCircuitBreaker,
  getCircuitBreakerStats,
  formatCircuitBreakerError,
  circuitBreakerHealthMiddleware,
} from '../circuitBreaker.js';

describe('Circuit Breaker Middleware', () => {
  
  describe('createCircuitBreaker', () => {
    it('should create circuit breaker with default options', () => {
      const mockFn = vi.fn(async () => 'success');
      const breaker = createCircuitBreaker(mockFn, 'Test Service');
      
      expect(breaker).toBeDefined();
      expect(breaker.options.timeout).toBe(30000);
      expect(breaker.options.errorThresholdPercentage).toBe(50);
    });

    it('should allow custom options', () => {
      const mockFn = vi.fn(async () => 'success');
      const breaker = createCircuitBreaker(mockFn, 'Test Service', {
        timeout: 5000,
        errorThresholdPercentage: 75,
      });
      
      expect(breaker.options.timeout).toBe(5000);
      expect(breaker.options.errorThresholdPercentage).toBe(75);
    });

    it('should execute function successfully when circuit closed', async () => {
      const mockFn = vi.fn(async (arg) => `result: ${arg}`);
      const breaker = createCircuitBreaker(mockFn, 'Test Service');
      
      const result = await breaker.fire('test');
      
      expect(result).toBe('result: test');
      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });

  describe('getCircuitBreakerStats', () => {
    it('should return circuit breaker statistics', async () => {
      const mockFn = vi.fn(async () => 'success');
      const breaker = createCircuitBreaker(mockFn, 'Test Service');
      
      // Execute a successful call
      await breaker.fire();
      
      const stats = getCircuitBreakerStats(breaker);
      
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('stats');
      expect(stats).toHaveProperty('config');
      expect(stats.state).toBe('closed');  // Initially closed
      expect(stats.stats.fires).toBe(1);   // One call made
      expect(stats.stats.successes).toBe(1); // One success
    });

    it('should track failures in statistics', async () => {
      const mockFn = vi.fn(async () => {
        throw new Error('Service failed');
      });
      const breaker = createCircuitBreaker(mockFn, 'Test Service');
      
      // Disable fallback to avoid unhandled rejection in tests
      breaker.fallback(() => null);
      
      // Trigger a single failure
      try {
        await breaker.fire();
      } catch (error) {
        // Expected failure - either from mockFn or fallback
      }
      
      const stats = getCircuitBreakerStats(breaker);
      
      // Verify statistics tracked the failure
      expect(stats.stats.failures).toBe(1);
      expect(stats.stats.fires).toBe(1);
      expect(stats.stats.successes).toBe(0);
      
      // Note: Testing circuit opening requires multiple failures and timing
      // This is better tested in integration tests with real service failures
    });
  });

  describe('formatCircuitBreakerError', () => {
    it('should format error with service name', () => {
      const error = new Error('Breaker is open');
      const formatted = formatCircuitBreakerError(error, 'Ollama');
      
      expect(formatted.code).toBe('SERVICE_UNAVAILABLE');
      expect(formatted.message).toContain('Ollama');
      expect(formatted.details).toHaveProperty('service');
      expect(formatted.details.service).toBe('ollama');
      expect(formatted.details).toHaveProperty('retry_after');
    });

    it('should include retry_after time', () => {
      const error = new Error('Breaker is open');
      const formatted = formatCircuitBreakerError(error, 'Qdrant');
      
      expect(formatted.details.retry_after).toBe(30);  // 30 seconds default
    });

    it('should include circuit breaker description', () => {
      const error = new Error('Breaker is open');
      const formatted = formatCircuitBreakerError(error, 'Service');
      
      expect(formatted.details.description).toContain('Circuit breaker');
      expect(formatted.details.description).toContain('automatically');
    });
  });

  describe('circuitBreakerHealthMiddleware', () => {
    it('should add circuit breaker states to request', () => {
      const mockFn1 = vi.fn(async () => 'success');
      const mockFn2 = vi.fn(async () => 'success');
      
      const breakers = {
        service1: createCircuitBreaker(mockFn1, 'Service 1'),
        service2: createCircuitBreaker(mockFn2, 'Service 2'),
      };
      
      const middleware = circuitBreakerHealthMiddleware(breakers);
      
      const req = {};
      const res = {};
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(req.circuitBreakers).toBeDefined();
      expect(req.circuitBreakers.service1).toBeDefined();
      expect(req.circuitBreakers.service2).toBeDefined();
      expect(req.circuitBreakers.service1.state).toBe('closed');
      expect(req.circuitBreakers.service1.healthy).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });
});

