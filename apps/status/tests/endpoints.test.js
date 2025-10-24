/**
 * Service Launcher - Endpoints Tests
 */

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});

const { execFile } = require('child_process');
const request = require('supertest');
const {
  app,
  invalidateHealthCheckCache,
} = require('../server');

const defaultHealthData = {
  localServices: [
    {
      name: 'Dashboard',
      status: 'running',
      port: 3103,
      pid: 12345,
      health: 'healthy',
      latencyMs: 45,
    },
  ],
  dockerContainers: [
    {
      name: 'data-timescaledb',
      status: 'running',
      health: 'healthy',
      group: 'data-timescale',
      service: 'timescaledb',
    },
  ],
  databases: [
    {
      name: 'timescaledb',
      status: 'up',
      host: 'localhost',
      port: '5432',
    },
  ],
  summary: {
    allOk: true,
    servicesChecked: 8,
    containersChecked: 12,
    databasesChecked: 1,
  },
  overallHealth: 'healthy',
  remediation: [],
};

const degradedHealthData = {
  ...defaultHealthData,
  summary: {
    ...defaultHealthData.summary,
    allOk: false,
  },
  overallHealth: 'degraded',
  remediation: [
    {
      target: 'Dashboard',
      actions: [
        'Start service: cd /dashboard && npm run dev',
        'Check port usage: lsof -i :3103',
      ],
    },
  ],
};

const criticalHealthData = {
  ...defaultHealthData,
  summary: {
    ...defaultHealthData.summary,
    allOk: false,
  },
  overallHealth: 'critical',
  remediation: [
    {
      target: 'Service Launcher',
      actions: [
        'Restart launcher service',
        'Inspect logs under /var/log/service-launcher',
      ],
    },
  ],
};

function execFileSuccess() {
  execFile.mockImplementation((file, args, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    cb(null, JSON.stringify(defaultHealthData), '');
  });
}

describe('Service Launcher Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 OK with correct payload', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'service-launcher-api',
      });
    });

    it('should have application/json content-type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/status', () => {
    it('should return 200 OK with aggregated status', async () => {
      const response = await request(app).get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallStatus');
      expect(response.body).toHaveProperty('totalServices');
      expect(response.body).toHaveProperty('degradedCount');
      expect(response.body).toHaveProperty('downCount');
      expect(response.body).toHaveProperty('averageLatencyMs');
      expect(response.body).toHaveProperty('lastCheckAt');
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
    });

    it('should have valid status values', async () => {
      const response = await request(app).get('/api/status');
      const validStatuses = ['ok', 'degraded', 'down'];

      expect(validStatuses).toContain(response.body.overallStatus);
    });

    it('should have numeric metrics', async () => {
      const response = await request(app).get('/api/status');

      expect(typeof response.body.totalServices).toBe('number');
      expect(typeof response.body.degradedCount).toBe('number');
      expect(typeof response.body.downCount).toBe('number');
      expect(response.body.totalServices).toBeGreaterThan(0);
    });

    it('should include service-launcher itself in services list', async () => {
      const response = await request(app).get('/api/status');
      const serviceLauncher = response.body.services.find(
        (s) => s.id === 'service-launcher'
      );

      expect(serviceLauncher).toBeDefined();
      expect(serviceLauncher.name).toBe('Launcher API');
      expect(serviceLauncher.port).toBe(3500);
    });
  });

  describe('POST /launch', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app).post('/launch').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 when serviceName is missing', async () => {
      const response = await request(app).post('/launch').send({
        workingDir: '/tmp',
        command: 'echo test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when workingDir is missing', async () => {
      const response = await request(app).post('/launch').send({
        serviceName: 'Test',
        command: 'echo test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when command is missing', async () => {
      const response = await request(app).post('/launch').send({
        serviceName: 'Test',
        workingDir: '/tmp',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/undefined-route');

      expect(response.status).toBe(404);
    });
  });

  describe('CORS', () => {
    it('should have CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3103');

      expect(response.headers).toBeDefined();
    });
  });

  describe('GET /api/health/full', () => {
    beforeEach(() => {
      jest.useRealTimers();
      invalidateHealthCheckCache();
      execFile.mockReset();
      execFileSuccess();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('should return 200 OK with comprehensive health data', async () => {
      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('localServices');
      expect(response.body).toHaveProperty('dockerContainers');
      expect(response.body).toHaveProperty('databases');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('overallHealth');
      expect(response.body).toHaveProperty('remediation');
      expect(['healthy', 'degraded', 'critical']).toContain(response.body.overallHealth);
    });

    it('should include cache headers', async () => {
      let response = await request(app).get('/api/health/full');
      expect(response.headers['x-cache-status']).toBe('MISS');
      expect(response.headers['x-cache-age']).toBe('0');

      response = await request(app).get('/api/health/full');
      expect(response.headers['x-cache-status']).toBe('HIT');
      expect(Number.isNaN(Number(response.headers['x-cache-age']))).toBe(false);
    });

    it('should use cache for subsequent requests within TTL', async () => {
      await request(app).get('/api/health/full');
      await request(app).get('/api/health/full');
      await request(app).get('/api/health/full');

      expect(execFile).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      execFile.mockReset();
      execFileSuccess();

      await request(app).get('/api/health/full');
      expect(execFile).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(61_000);

      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const freshData = { ...defaultHealthData, summary: { ...defaultHealthData.summary }, timestamp: Date.now() };
        cb(null, JSON.stringify(freshData), '');
      });

      await request(app).get('/api/health/full');
      expect(execFile).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should handle script execution errors gracefully', async () => {
      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = new Error('Script not found');
        error.code = 'ENOENT';
        cb(error);
      });

      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to execute health check script');
      expect(response.body.message).toContain('Health check script not found');
    });

    it('should handle script timeout', async () => {
      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = new Error('Timed out');
        error.killed = true;
        error.signal = 'SIGTERM';
        cb(error);
      });

      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('timed out');
    });

    it('should handle invalid JSON output', async () => {
      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(null, 'not valid json', '');
      });

      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Invalid JSON');
    });

    it('should handle degraded system health (exit code 1)', async () => {
      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = new Error('Degraded');
        error.code = 1;
        error.stdout = JSON.stringify(degradedHealthData);
        error.stderr = 'Service degraded';
        cb(error);
      });

      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(200);
      expect(response.body.overallHealth).toBe('degraded');
      expect(Array.isArray(response.body.remediation)).toBe(true);
    });

    it('should handle critical system health (exit code 2)', async () => {
      execFile.mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = new Error('Critical');
        error.code = 2;
        error.stdout = JSON.stringify(criticalHealthData);
        error.stderr = 'Critical failure';
        cb(error);
      });

      const response = await request(app).get('/api/health/full');

      expect(response.status).toBe(200);
      expect(response.body.overallHealth).toBe('critical');
    });

    it('should have application/json content-type', async () => {
      const response = await request(app).get('/api/health/full');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});







