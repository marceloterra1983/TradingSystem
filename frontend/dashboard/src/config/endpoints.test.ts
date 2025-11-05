import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type EndpointsModule = typeof import('./endpoints');

const ENV_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_TP_CAPITAL_API_URL',
  'VITE_DOCUMENTATION_API_URL',
  'VITE_TELEGRAM_GATEWAY_API_URL',
  'VITE_PGADMIN_URL',
  'VITE_ADMINER_URL',
  'VITE_PGWEB_URL',
  'VITE_TIMESCALEDB_PORT',
  'VITE_QUESTDB_URL',
  'VITE_QDRANT_URL',
  'VITE_REDIS_PORT',
  'VITE_PROMETHEUS_URL',
  'VITE_GRAFANA_URL',
  'VITE_RAG_SERVICE_URL',
  'VITE_LLAMAINDEX_URL',
  'VITE_OLLAMA_URL',
  'VITE_KONG_API_URL',
  'VITE_KONG_ADMIN_URL',
] as const;

type EnvKey = typeof ENV_KEYS[number];

type EnvOverrides = Partial<Record<EnvKey, string>>;

const DEFAULT_ENV: Record<EnvKey, string> = ENV_KEYS.reduce((env, key) => {
  // Force empty string so `||` fallbacks inside endpoints.ts activate
  env[key] = '';
  return env;
}, {} as Record<EnvKey, string>);

async function loadEndpointsModule(
  overrides: EnvOverrides = {},
): Promise<EndpointsModule> {
  vi.resetModules();
  vi.unstubAllEnvs();

  const resolvedEnv: Record<EnvKey, string> = {
    ...DEFAULT_ENV,
    ...overrides,
  };

  ENV_KEYS.forEach((key) => {
    vi.stubEnv(key, resolvedEnv[key]);
  });

  return import('./endpoints');
}

const originalFetch = globalThis.fetch;

let endpointsModule: EndpointsModule;

beforeEach(async () => {
  endpointsModule = await loadEndpointsModule();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Endpoints Configuration', () => {
  describe('ENDPOINTS', () => {
    it('should have correct default backend API endpoints', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.workspace).toBe('http://localhost:3210');
      expect(ENDPOINTS.tpCapital).toBe('http://localhost:4008');
      expect(ENDPOINTS.documentation).toBe('http://localhost:3405');
      expect(ENDPOINTS.telegramGateway).toBe('http://localhost:4010');
    });

    it('should have database UIs in protected range 7100-7199', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.pgAdmin).toBe('http://localhost:7100');
      expect(ENDPOINTS.adminer).toBe('http://localhost:7101');
      expect(ENDPOINTS.pgWeb).toBe('http://localhost:7102');
    });

    it('should have databases in protected range 7000-7099', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.timescaledb.port).toBe(7000);
      expect(ENDPOINTS.timescaledb.url).toBe('http://localhost:7000');
      expect(ENDPOINTS.questdb).toBe('http://localhost:7010');
      expect(ENDPOINTS.qdrant).toBe('http://localhost:7020');
      expect(ENDPOINTS.redis.port).toBe(7030);
    });

    it('should have monitoring endpoints', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.prometheus).toBe('http://localhost:9091');
      expect(ENDPOINTS.grafana).toBe('http://localhost:3104');
    });

    it('should have RAG service endpoints', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.rag.service).toBe('http://localhost:3402');
      expect(ENDPOINTS.rag.llamaindex).toBe('http://localhost:8202');
      expect(ENDPOINTS.rag.ollama).toBe('http://localhost:11434');
    });

    it('should have Kong gateway endpoints', () => {
      const { ENDPOINTS } = endpointsModule;

      expect(ENDPOINTS.kong.api).toBe('http://localhost:8000');
      expect(ENDPOINTS.kong.admin).toBe('http://localhost:8001');
    });
  });

  describe('validateEndpoint', () => {
    it('should return true for reachable endpoints', async () => {
      const { validateEndpoint } = endpointsModule;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await validateEndpoint('http://localhost:3210');

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3210/health',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should return false for unreachable endpoints', async () => {
      const { validateEndpoint } = endpointsModule;

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await validateEndpoint('http://localhost:9999');

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      const { validateEndpoint } = endpointsModule;

      globalThis.fetch = vi.fn().mockImplementation((_url, options: RequestInit = {}) => {
        const signal = options.signal as AbortSignal | undefined;
        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        });
      });

      const result = await validateEndpoint('http://localhost:3210', 5);

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle non-200 responses', async () => {
      const { validateEndpoint } = endpointsModule;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await validateEndpoint('http://localhost:3210');

      expect(result).toBe(false);
    });
  });

  describe('getDatabaseUIEndpoints', () => {
    it('should return all database UI endpoints', () => {
      const { getDatabaseUIEndpoints } = endpointsModule;
      const uiEndpoints = getDatabaseUIEndpoints();

      expect(uiEndpoints).toHaveProperty('PgAdmin');
      expect(uiEndpoints).toHaveProperty('Adminer');
      expect(uiEndpoints).toHaveProperty('PgWeb');
      expect(uiEndpoints).toHaveProperty('QuestDB UI');
      expect(uiEndpoints).toHaveProperty('Qdrant Dashboard');
    });

    it('should have all endpoints in protected range or standard ports', () => {
      const { getDatabaseUIEndpoints } = endpointsModule;
      const uiEndpoints = getDatabaseUIEndpoints();

      expect(uiEndpoints['PgAdmin']).toContain('7100');
      expect(uiEndpoints['Adminer']).toContain('7101');
      expect(uiEndpoints['PgWeb']).toContain('7102');
      expect(uiEndpoints['QuestDB UI']).toContain('7010');
      expect(uiEndpoints['Qdrant Dashboard']).toContain('7020');
    });

    it('should return object with string values', () => {
      const { getDatabaseUIEndpoints } = endpointsModule;
      const uiEndpoints = getDatabaseUIEndpoints();

      Object.values(uiEndpoints).forEach((endpoint) => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toMatch(/^http:\/\//);
      });
    });
  });

  describe('getMonitoringEndpoints', () => {
    it('should return monitoring endpoints', () => {
      const { getMonitoringEndpoints } = endpointsModule;
      const monitoringEndpoints = getMonitoringEndpoints();

      expect(monitoringEndpoints).toHaveProperty('Prometheus');
      expect(monitoringEndpoints).toHaveProperty('Grafana');
    });

    it('should have correct monitoring ports', () => {
      const { getMonitoringEndpoints } = endpointsModule;
      const monitoringEndpoints = getMonitoringEndpoints();

      expect(monitoringEndpoints['Prometheus']).toBe('http://localhost:9091');
      expect(monitoringEndpoints['Grafana']).toBe('http://localhost:3104');
    });

    it('should return object with string values', () => {
      const { getMonitoringEndpoints } = endpointsModule;
      const monitoringEndpoints = getMonitoringEndpoints();

      Object.values(monitoringEndpoints).forEach((endpoint) => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toMatch(/^http:\/\//);
      });
    });
  });

  describe('Port Range Validation', () => {
    it('should use ports in protected database range (7000-7999)', () => {
      const { ENDPOINTS } = endpointsModule;

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
      const { ENDPOINTS } = endpointsModule;

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
    it('should respect VITE_PGADMIN_URL environment variable', async () => {
      const customPgAdmin = 'http://custom-pgadmin:7100';
      const moduleWithOverride = await loadEndpointsModule({
        VITE_PGADMIN_URL: customPgAdmin,
      });

      expect(moduleWithOverride.ENDPOINTS.pgAdmin).toBe(customPgAdmin);
    });
  });
});
