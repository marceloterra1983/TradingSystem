const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateService,
  summarizeStatuses,
  sortResultsBySeverity,
  SERVICE_TARGETS,
} = require('../server');

function stubFetch(responseImpl) {
  const originalFetch = global.fetch;
  global.fetch = responseImpl;
  return () => {
    global.fetch = originalFetch;
  };
}

test('evaluateService returns ok for successful responses', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ status: 'ok' }),
    text: async () => '{"status":"ok"}',
    body: true,
  }));

  try {
    const result = await evaluateService({
      id: 'dummy',
      name: 'Dummy Service',
      description: 'Test double',
      category: 'test',
      port: 1234,
      healthUrl: 'http://localhost:1234/health',
      method: 'GET',
      timeoutMs: 50,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.details.httpStatus, 200);
    assert.equal(result.details.healthUrl, 'http://localhost:1234/health');
    assert.equal(typeof result.latencyMs, 'number');
    assert(Number.isFinite(result.latencyMs));
    assert.ok(Date.parse(result.updatedAt));
  } finally {
    restore();
  }
});

test('evaluateService returns degraded for non-200 responses', async () => {
  const restore = stubFetch(async () => ({
    ok: false,
    status: 503,
    headers: { get: () => 'text/plain' },
    text: async () => 'Service unavailable',
    body: true,
  }));

  try {
    const result = await evaluateService({
      id: 'dummy',
      name: 'Dummy Service',
      description: 'Test double',
      category: 'test',
      port: 1234,
      healthUrl: 'http://localhost:1234/health',
      method: 'GET',
      timeoutMs: 50,
    });

    assert.equal(result.status, 'degraded');
    assert.equal(result.details.httpStatus, 503);
    assert.equal(result.details.body, 'Service unavailable');
  } finally {
    restore();
  }
});

test('evaluateService returns down on fetch error', async () => {
  const restore = stubFetch(async () => {
    const error = new Error('connect ECONNREFUSED');
    error.code = 'ECONNREFUSED';
    throw error;
  });

  try {
    const result = await evaluateService({
      id: 'dummy',
      name: 'Dummy Service',
      description: 'Test double',
      category: 'test',
      port: 1234,
      healthUrl: 'http://localhost:1234/health',
      method: 'GET',
      timeoutMs: 10,
    });

    assert.equal(result.status, 'down');
    assert.equal(result.details.error, 'connect ECONNREFUSED');
    assert.equal(result.details.healthUrl, 'http://localhost:1234/health');
  } finally {
    restore();
  }
});

test('summarizeStatuses aggregates metrics correctly', () => {
  const now = new Date().toISOString();
  const results = [
    {
      id: 'a',
      name: 'Service A',
      description: 'ok service',
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
      description: 'degraded service',
      category: 'api',
      port: 2,
      status: 'degraded',
      latencyMs: 200,
      updatedAt: now,
      details: {},
    },
    {
      id: 'c',
      name: 'Service C',
      description: 'down service',
      category: 'api',
      port: 3,
      status: 'down',
      latencyMs: null,
      updatedAt: now,
      details: {},
    },
  ];

  const summary = summarizeStatuses(results);

  assert.equal(summary.overallStatus, 'down');
  assert.equal(summary.totalServices, 3);
  assert.equal(summary.degradedCount, 2);
  assert.equal(summary.downCount, 1);
  assert.equal(summary.averageLatencyMs, Math.round((100 + 200) / 2));
  assert.ok(Date.parse(summary.lastCheckAt));
  assert.equal(summary.services.length, 3);
});

test('sortResultsBySeverity orders results by status then name', () => {
  const results = [
    { status: 'ok', name: 'Zeta' },
    { status: 'down', name: 'Alpha' },
    { status: 'degraded', name: 'Beta' },
    { status: 'ok', name: 'Alpha' },
  ];

  const ordered = sortResultsBySeverity(results);
  assert.deepEqual(ordered.map((item) => item.status), ['down', 'degraded', 'ok', 'ok']);
  assert.deepEqual(
    ordered.filter((item) => item.status === 'ok').map((item) => item.name),
    ['Alpha', 'Zeta']
  );
});

test('SERVICE_TARGETS inclui serviços estendidos', () => {
  const ids = new Set(SERVICE_TARGETS.map((service) => service.id));
  ['dashboard-ui', 'docusaurus', 'prometheus', 'grafana', 'questdb-http'].forEach((expected) => {
    assert.ok(ids.has(expected), `Service target ${expected} deve estar cadastrado`);
  });
});
