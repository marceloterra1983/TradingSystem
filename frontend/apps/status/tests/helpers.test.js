/**
 * Service Launcher - Helper Functions Tests
 * Tests for utility and helper functions
 */

const {
  evaluateService,
  gatherServiceStatuses,
  summarizeStatuses,
  sortResultsBySeverity,
} = require('../server');

/**
 * Mock fetch globally
 */
function mockFetch(responseImpl) {
  const originalFetch = global.fetch;
  global.fetch = responseImpl;
  return () => {
    global.fetch = originalFetch;
  };
}

describe('Helper Functions', () => {
  describe('evaluateService', () => {
    // Note: Timeout testing with mocked fetch is complex due to AbortController behavior
    // Covered by existing status.test.js using real fetch with ECONNREFUSED

    it('should handle JSON response body', async () => {
      const restore = mockFetch(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ status: 'healthy', version: '1.0' }),
        body: true,
      }));

      try {
        const result = await evaluateService({
          id: 'json-service',
          name: 'JSON Service',
          description: 'Test',
          category: 'test',
          port: 8888,
          healthUrl: 'http://localhost:8888/health',
          method: 'GET',
          timeoutMs: 5000,
        });

        expect(result.status).toBe('ok');
        expect(result.details.body).toEqual({ status: 'healthy', version: '1.0' });
      } finally {
        restore();
      }
    });

    it('should handle text response body', async () => {
      const restore = mockFetch(async () => ({
        ok: false,
        status: 503,
        headers: { get: () => 'text/plain' },
        text: async () => 'Service temporarily unavailable',
        body: true,
      }));

      try {
        const result = await evaluateService({
          id: 'text-service',
          name: 'Text Service',
          description: 'Test',
          category: 'test',
          port: 7777,
          healthUrl: 'http://localhost:7777/health',
          method: 'GET',
          timeoutMs: 5000,
        });

        expect(result.status).toBe('degraded');
        expect(result.details.body).toBe('Service temporarily unavailable');
        expect(result.details.httpStatus).toBe(503);
      } finally {
        restore();
      }
    });

    it('should handle large response body with truncation', async () => {
      const longText = 'x'.repeat(500);
      const restore = mockFetch(async () => ({
        ok: false,
        status: 500,
        headers: { get: () => 'text/plain' },
        text: async () => longText,
        body: true,
      }));

      try {
        const result = await evaluateService({
          id: 'large-response',
          name: 'Large Response Service',
          description: 'Test',
          category: 'test',
          port: 6666,
          healthUrl: 'http://localhost:6666/health',
          method: 'GET',
          timeoutMs: 5000,
        });

        expect(result.status).toBe('degraded');
        expect(result.details.body).toContain('…'); // Truncated
        expect(result.details.body.length).toBeLessThan(longText.length);
      } finally {
        restore();
      }
    });

    it('should handle body parsing errors gracefully', async () => {
      const restore = mockFetch(async () => ({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: async () => {
          throw new Error('Invalid JSON');
        },
        body: true,
      }));

      try {
        const result = await evaluateService({
          id: 'bad-json',
          name: 'Bad JSON Service',
          description: 'Test',
          category: 'test',
          port: 5555,
          healthUrl: 'http://localhost:5555/health',
          method: 'GET',
          timeoutMs: 5000,
        });

        expect(result.status).toBe('degraded');
        expect(result.details.bodyError).toBe('Invalid JSON');
      } finally {
        restore();
      }
    });
  });

  describe('gatherServiceStatuses', () => {
    it('should gather statuses for multiple services in parallel', async () => {
      const restore = mockFetch(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: false,
      }));

      try {
        const services = [
          {
            id: 'service-1',
            name: 'Service 1',
            description: 'Test 1',
            category: 'test',
            port: 1111,
            healthUrl: 'http://localhost:1111/health',
            method: 'GET',
            timeoutMs: 5000,
          },
          {
            id: 'service-2',
            name: 'Service 2',
            description: 'Test 2',
            category: 'test',
            port: 2222,
            healthUrl: 'http://localhost:2222/health',
            method: 'GET',
            timeoutMs: 5000,
          },
        ];

        const results = await gatherServiceStatuses(services);

        expect(results).toHaveLength(2);
        expect(results[0].id).toBe('service-1');
        expect(results[1].id).toBe('service-2');
      } finally {
        restore();
      }
    });
  });

  describe('summarizeStatuses edge cases', () => {
    it('should handle empty service list', () => {
      const summary = summarizeStatuses([]);

      expect(summary.overallStatus).toBe('ok');
      expect(summary.totalServices).toBe(0);
      expect(summary.degradedCount).toBe(0);
      expect(summary.downCount).toBe(0);
      expect(summary.averageLatencyMs).toBeNull();
      expect(summary.services).toEqual([]);
    });

    it('should handle all services down', () => {
      const now = new Date().toISOString();
      const results = [
        {
          id: 'a',
          name: 'Service A',
          description: 'Down',
          category: 'api',
          port: 1,
          status: 'down',
          latencyMs: null,
          updatedAt: now,
          details: {},
        },
        {
          id: 'b',
          name: 'Service B',
          description: 'Down',
          category: 'api',
          port: 2,
          status: 'down',
          latencyMs: null,
          updatedAt: now,
          details: {},
        },
      ];

      const summary = summarizeStatuses(results);

      expect(summary.overallStatus).toBe('down');
      expect(summary.downCount).toBe(2);
      expect(summary.degradedCount).toBe(2); // down counts as degraded too
      expect(summary.averageLatencyMs).toBeNull();
    });

    it('should calculate average latency correctly with null values', () => {
      const now = new Date().toISOString();
      const results = [
        {
          id: 'a',
          name: 'Service A',
          description: 'Ok',
          category: 'api',
          port: 1,
          status: 'ok',
          latencyMs: 100,
          updatedAt: now,
          details: {},
        },
        {
          id: 'b',
          name: 'Service B',
          description: 'Down',
          category: 'api',
          port: 2,
          status: 'down',
          latencyMs: null,
          updatedAt: now,
          details: {},
        },
        {
          id: 'c',
          name: 'Service C',
          description: 'Ok',
          category: 'api',
          port: 3,
          status: 'ok',
          latencyMs: 200,
          updatedAt: now,
          details: {},
        },
      ];

      const summary = summarizeStatuses(results);

      expect(summary.averageLatencyMs).toBe(150); // (100 + 200) / 2
    });
  });

  describe('sortResultsBySeverity edge cases', () => {
    it('should handle empty array', () => {
      const sorted = sortResultsBySeverity([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single item', () => {
      const results = [{ status: 'ok', name: 'Single' }];
      const sorted = sortResultsBySeverity(results);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].name).toBe('Single');
    });

    it('should handle unknown status values', () => {
      const results = [
        { status: 'unknown', name: 'Z' },
        { status: 'ok', name: 'A' },
        { status: 'custom', name: 'M' },
      ];
      const sorted = sortResultsBySeverity(results);
      
      // Unknown/custom statuses should sort to end
      expect(sorted[0].status).toBe('ok');
    });
  });
});

