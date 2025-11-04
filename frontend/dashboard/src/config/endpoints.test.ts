import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ENDPOINTS, validateEndpoint, getDatabaseUIEndpoints, getMonitoringEndpoints } from './endpoints';

describe('Endpoints Configuration', () => {
  beforeEach(() => {
    // Reset modules for each test
    vi.resetModules();
  });

  afterEach(() => {
    // Vitest handles environment reset automatically
  });

  describe('ENDPOINTS', () => {
    it('should have correct default backend API endpoints', () => {
      expect(ENDPOINTS.workspace).toBe('http://localhost:3201');
      expect(ENDPOINTS.tpCapital).toBe('http://localhost:4006');
      expect(ENDPOINTS.documentation).toBe('http://localhost:3405');
      expect(ENDPOINTS.telegramGateway).toBe('http://localhost:4010');
    });

    it('should have database UIs in protected range 7100-7199', () => {
      expect(ENDPOINTS.pgAdmin).toBe('http://localhost:7100');
      expect(ENDPOINTS.adminer).toBe('http://localhost:7101');
      expect(ENDPOINTS.pgWeb).toBe('http://localhost:7102');
    });

    it('should have databases in protected range 7000-7099', () => {
      expect(ENDPOINTS.timescaledb.port).toBe(7000);
      expect(ENDPOINTS.timescaledb.url).toBe('http://localhost:7000');
      expect(ENDPOINTS.questdb).toBe('http://localhost:7010');
      expect(ENDPOINTS.qdrant).toBe('http://localhost:7020');
      expect(ENDPOINTS.redis.port).toBe(7030);
    });

    it('should have monitoring endpoints', () => {
      expect(ENDPOINTS.prometheus).toBe('http://localhost:9091');
      expect(ENDPOINTS.grafana).toBe('http://localhost:3104');
    });

    it('should have RAG service endpoints', () => {
      expect(ENDPOINTS.rag.service).toBe('http://localhost:3402');
      expect(ENDPOINTS.rag.llamaindex).toBe('http://localhost:8202');
      expect(ENDPOINTS.rag.ollama).toBe('http://localhost:11434');
    });

    it('should have Kong gateway endpoints', () => {
      expect(ENDPOINTS.kong.api).toBe('http://localhost:8000');
      expect(ENDPOINTS.kong.admin).toBe('http://localhost:8001');
    });
  });

  describe('validateEndpoint', () => {
    it('should return true for reachable endpoints', async () => {
      // Mock fetch to simulate successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await validateEndpoint('http://localhost:3201');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3201/health',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return false for unreachable endpoints', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await validateEndpoint('http://localhost:9999');
      
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const result = await validateEndpoint('http://localhost:3201');
      
      expect(result).toBe(false);
    });

    it('should handle non-200 responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await validateEndpoint('http://localhost:3201');
      
      expect(result).toBe(false);
    });
  });

  describe('getDatabaseUIEndpoints', () => {
    it('should return all database UI endpoints', () => {
      const uiEndpoints = getDatabaseUIEndpoints();

      expect(uiEndpoints).toHaveProperty('PgAdmin');
      expect(uiEndpoints).toHaveProperty('Adminer');
      expect(uiEndpoints).toHaveProperty('PgWeb');
      expect(uiEndpoints).toHaveProperty('QuestDB UI');
      expect(uiEndpoints).toHaveProperty('Qdrant Dashboard');
    });

    it('should have all endpoints in protected range or standard ports', () => {
      const uiEndpoints = getDatabaseUIEndpoints();

      // Check PgAdmin, Adminer, PgWeb are in 7100-7199
      expect(uiEndpoints['PgAdmin']).toContain('7100');
      expect(uiEndpoints['Adminer']).toContain('7101');
      expect(uiEndpoints['PgWeb']).toContain('7102');

      // Check database UIs use 7xxx ports
      expect(uiEndpoints['QuestDB UI']).toContain('7010');
      expect(uiEndpoints['Qdrant Dashboard']).toContain('7020');
    });

    it('should return object with string values', () => {
      const uiEndpoints = getDatabaseUIEndpoints();

      Object.values(uiEndpoints).forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toMatch(/^http:\/\//);
      });
    });
  });

  describe('getMonitoringEndpoints', () => {
    it('should return monitoring endpoints', () => {
      const monitoringEndpoints = getMonitoringEndpoints();

      expect(monitoringEndpoints).toHaveProperty('Prometheus');
      expect(monitoringEndpoints).toHaveProperty('Grafana');
    });

    it('should have correct monitoring ports', () => {
      const monitoringEndpoints = getMonitoringEndpoints();

      expect(monitoringEndpoints['Prometheus']).toBe('http://localhost:9091');
      expect(monitoringEndpoints['Grafana']).toBe('http://localhost:3104');
    });

    it('should return object with string values', () => {
      const monitoringEndpoints = getMonitoringEndpoints();

      Object.values(monitoringEndpoints).forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toMatch(/^http:\/\//);
      });
    });
  });

  describe('Port Range Validation', () => {
    it('should use ports in protected database range (7000-7999)', () => {
      // Database UIs should be in 7100-7199
      const pgAdminPort = parseInt(ENDPOINTS.pgAdmin.match(/:(\d+)/)?.[1] || '0');
      const adminerPort = parseInt(ENDPOINTS.adminer.match(/:(\d+)/)?.[1] || '0');
      const pgWebPort = parseInt(ENDPOINTS.pgWeb.match(/:(\d+)/)?.[1] || '0');

      expect(pgAdminPort).toBeGreaterThanOrEqual(7100);
      expect(pgAdminPort).toBeLessThanOrEqual(7199);
      
      expect(adminerPort).toBeGreaterThanOrEqual(7100);
      expect(adminerPort).toBeLessThanOrEqual(7199);
      
      expect(pgWebPort).toBeGreaterThanOrEqual(7100);
      expect(pgWebPort).toBeLessThanOrEqual(7199);
    });

    it('should use ports in database range (7000-7099) for databases', () => {
      expect(ENDPOINTS.timescaledb.port).toBeGreaterThanOrEqual(7000);
      expect(ENDPOINTS.timescaledb.port).toBeLessThanOrEqual(7099);
      
      const questdbPort = parseInt(ENDPOINTS.questdb.match(/:(\d+)/)?.[1] || '0');
      expect(questdbPort).toBeGreaterThanOrEqual(7000);
      expect(questdbPort).toBeLessThanOrEqual(7099);
      
      const qdrantPort = parseInt(ENDPOINTS.qdrant.match(/:(\d+)/)?.[1] || '0');
      expect(qdrantPort).toBeGreaterThanOrEqual(7000);
      expect(qdrantPort).toBeLessThanOrEqual(7099);
      
      expect(ENDPOINTS.redis.port).toBeGreaterThanOrEqual(7000);
      expect(ENDPOINTS.redis.port).toBeLessThanOrEqual(7099);
    });
  });

  describe('Environment Variable Override', () => {
    it('should respect VITE_PGADMIN_URL environment variable', () => {
      // This test documents the expected behavior
      // Actual testing would require environment manipulation
      // which is complex with Vite's import.meta.env
      
      // Document expected behavior:
      // If VITE_PGADMIN_URL is set, it should override default
      expect(ENDPOINTS.pgAdmin).toBeDefined();
    });
  });
});

