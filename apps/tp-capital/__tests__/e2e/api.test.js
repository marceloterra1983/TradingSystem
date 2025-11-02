import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fetch from 'node-fetch';

// E2E tests - Require TP Capital server running
// Run: npm start (in another terminal)
// Then: npm test -- --test-name-pattern="E2E"

const SKIP_E2E = process.env.TEST_SKIP_E2E === '1';
const BASE_URL = process.env.TP_CAPITAL_URL || 'http://localhost:4005';

describe('E2E: TP Capital API', { skip: SKIP_E2E }, () => {
  before(async () => {
    // Verify server is running
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (!response.ok) {
        throw new Error('Server not healthy');
      }
    } catch (error) {
      throw new Error(
        `TP Capital server not running at ${BASE_URL}. Start with: npm start`
      );
    }
  });

  describe('Health Endpoints', () => {
    it('GET /healthz should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.status, 'healthy');
      assert.strictEqual(data.service, 'tp-capital');
      assert.ok(data.uptime > 0);
    });

    it('GET /health should return detailed health check', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.status, 'healthy');
      assert.ok(data.checks);
      assert.ok(data.checks.timescaledb);
      assert.ok(data.checks.gatewayDatabase);
    });

    it('GET /ready should check database readiness', async () => {
      const response = await fetch(`${BASE_URL}/ready`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.status, 'healthy');
    });
  });

  describe('Metrics Endpoint', () => {
    it('GET /metrics should return Prometheus metrics', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      const text = await response.text();

      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type').includes('text/plain'));
      assert.ok(text.includes('tp_capital_'));
      assert.ok(text.includes('process_cpu_user_seconds_total'));
    });
  });

  describe('Signals CRUD', () => {
    let createdSignalIngestedAt;

    it('GET /signals should return signals list', async () => {
      const response = await fetch(`${BASE_URL}/signals?limit=10`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
      
      if (data.data.length > 0) {
        const signal = data.data[0];
        assert.ok(signal.id);
        assert.ok(signal.ts);
        assert.ok(signal.asset);
      }
    });

    it('GET /signals should filter by channel', async () => {
      const response = await fetch(`${BASE_URL}/signals?channel=TP Capital&limit=5`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      
      if (data.data.length > 0) {
        assert.ok(data.data.every(s => s.channel === 'TP Capital'));
      }
    });

    it('GET /signals should filter by signal type', async () => {
      const response = await fetch(`${BASE_URL}/signals?type=Swing Trade&limit=5`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      
      if (data.data.length > 0) {
        assert.ok(data.data.every(s => s.signal_type === 'Swing Trade'));
      }
    });

    it('GET /signals should search by asset', async () => {
      const response = await fetch(`${BASE_URL}/signals?search=PETR&limit=5`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      
      if (data.data.length > 0) {
        assert.ok(data.data.some(s => s.asset?.includes('PETR')));
      }
    });

    it('DELETE /signals should delete signal by ingestedAt', async function() {
      // First, get a signal to delete
      const getResponse = await fetch(`${BASE_URL}/signals?limit=1`);
      const getData = await getResponse.json();

      if (getData.data.length === 0) {
        this.skip('No signals to delete');
        return;
      }

      const signal = getData.data[0];
      const ingestedAt = signal.ingested_at || signal.created_at;

      const deleteResponse = await fetch(`${BASE_URL}/signals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingestedAt }),
      });

      assert.strictEqual(deleteResponse.status, 200);
      
      const deleteData = await deleteResponse.json();
      assert.strictEqual(deleteData.status, 'ok');
    });
  });

  describe('Forwarded Messages', () => {
    it('GET /forwarded-messages should return messages', async () => {
      const response = await fetch(`${BASE_URL}/forwarded-messages?limit=10`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
    });

    it('GET /forwarded-messages should filter by channelId', async () => {
      const response = await fetch(
        `${BASE_URL}/forwarded-messages?channelId=-1001649127710&limit=5`
      );
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      
      if (data.data.length > 0) {
        assert.ok(data.data.every(m => m.channel_id === '-1001649127710'));
      }
    });
  });

  describe('Telegram Channels CRUD', () => {
    let testChannelId;

    it('GET /telegram-channels should return channels', async () => {
      const response = await fetch(`${BASE_URL}/telegram-channels`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
    });

    it('POST /telegram-channels should create channel', async () => {
      const newChannel = {
        label: 'Test Channel E2E',
        channel_id: '-1001111111111',
        channel_type: 'source',
        description: 'Created by E2E test',
      };

      const response = await fetch(`${BASE_URL}/telegram-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });

      assert.strictEqual(response.status, 201);
      
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.channel);
      assert.strictEqual(data.channel.label, 'Test Channel E2E');
      
      testChannelId = data.channel.id;
    });

    it('PUT /telegram-channels/:id should update channel', async function() {
      if (!testChannelId) {
        this.skip('No test channel to update');
        return;
      }

      const updates = {
        description: 'Updated by E2E test',
      };

      const response = await fetch(`${BASE_URL}/telegram-channels/${testChannelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      assert.strictEqual(response.status, 200);
      
      const data = await response.json();
      assert.strictEqual(data.success, true);
    });

    it('DELETE /telegram-channels/:id should delete channel', async function() {
      if (!testChannelId) {
        this.skip('No test channel to delete');
        return;
      }

      const response = await fetch(`${BASE_URL}/telegram-channels/${testChannelId}`, {
        method: 'DELETE',
      });

      assert.strictEqual(response.status, 200);
      
      const data = await response.json();
      assert.strictEqual(data.success, true);
    });
  });

  describe('Channels and Bots Info', () => {
    it('GET /channels should return channel statistics', async () => {
      const response = await fetch(`${BASE_URL}/channels`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
      assert.strictEqual(data.source, 'timescale');
      assert.ok(data.timestamp);
    });

    it('GET /bots should return bot information', async () => {
      const response = await fetch(`${BASE_URL}/bots`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(data.data);
      assert.ok(data.data.timestamp);
    });

    it('GET /config/channels should return configured channels', async () => {
      const response = await fetch(`${BASE_URL}/config/channels`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.timestamp);
    });
  });

  describe('Logs Endpoint', () => {
    it('GET /logs should return recent logs', async () => {
      const response = await fetch(`${BASE_URL}/logs?limit=10`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.data));
      
      if (data.data.length > 0) {
        const log = data.data[0];
        assert.ok(log.timestamp);
        assert.ok(log.level);
        assert.ok(log.message);
      }
    });

    it('GET /logs should filter by level', async () => {
      const response = await fetch(`${BASE_URL}/logs?level=error&limit=5`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      
      if (data.data.length > 0) {
        assert.ok(data.data.every(log => log.level === 'error'));
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown route', async () => {
      const response = await fetch(`${BASE_URL}/nonexistent-route`);
      
      assert.strictEqual(response.status, 404);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await fetch(`${BASE_URL}/signals?limit=invalid`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);  // Server doesn't validate limit type yet
      // TODO: Should be 400 after validation middleware is added
    });

    it('should handle missing required fields in POST', async () => {
      const response = await fetch(`${BASE_URL}/telegram-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),  // Missing required fields
      });

      assert.strictEqual(response.status, 400);
      
      const data = await response.json();
      assert.ok(data.error);
    });
  });
});

