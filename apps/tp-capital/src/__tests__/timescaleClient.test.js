import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { timescaleClient } from '../timescaleClient.js';

// TimescaleClient is exported as singleton instance, not as class
// For tests, we'll use the singleton directly
const TimescaleClient = timescaleClient.constructor;

// ⚠️ Integration tests - Require TimescaleDB running
// Run: npm test -- --test-name-pattern="TimescaleClient"
// Skip if DB unavailable: TEST_SKIP_INTEGRATION=1 npm test

const SKIP_INTEGRATION = process.env.TEST_SKIP_INTEGRATION === '1';

describe('TimescaleClient', { skip: SKIP_INTEGRATION }, () => {
  let client;

  before(async () => {
    // Initialize client with test config
    process.env.TIMESCALEDB_DATABASE = 'APPS-TPCAPITAL-TEST';
    process.env.TIMESCALEDB_SCHEMA = 'tp_capital_test';
    
    client = new TimescaleClient();
    
    // Create test schema and table
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS tp_capital_test
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS tp_capital_test.tp_capital_signals (
        id SERIAL,
        ts TIMESTAMPTZ NOT NULL,
        channel TEXT,
        signal_type TEXT,
        asset TEXT NOT NULL,
        buy_min NUMERIC,
        buy_max NUMERIC,
        target_1 NUMERIC,
        target_2 NUMERIC,
        target_final NUMERIC,
        stop NUMERIC,
        raw_message TEXT,
        source TEXT DEFAULT 'telegram',
        ingested_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, ts)
      )
    `);
  });

  after(async () => {
    // Cleanup test schema
    await client.query('DROP SCHEMA IF EXISTS tp_capital_test CASCADE');
    await client.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await client.query('TRUNCATE TABLE tp_capital_test.tp_capital_signals');
  });

  describe('healthcheck', () => {
    it('should return true when database is reachable', async () => {
      const healthy = await client.healthcheck();
      assert.strictEqual(healthy, true);
    });
  });

  describe('insertSignal', () => {
    it('should insert valid signal and return id and ts', async () => {
      const signal = {
        ts: new Date('2025-11-01T12:00:00Z'),
        channel: 'TP Capital',
        signal_type: 'Swing Trade',
        asset: 'PETR4',
        buy_min: 25.50,
        buy_max: 26.00,
        target_1: 28.00,
        target_2: 30.00,
        target_final: 35.00,
        stop: 24.00,
        raw_message: 'ATIVO: PETR4 COMPRA: 25.50 A 26.00',
        source: 'test',
      };

      const result = await client.insertSignal(signal);

      assert.ok(result.id, 'Should return id');
      assert.ok(result.ts, 'Should return ts');
      assert.strictEqual(typeof result.id, 'number');
    });

    it('should handle numeric timestamp (milliseconds)', async () => {
      const timestamp = Date.now();
      const signal = {
        ts: timestamp,
        asset: 'VALE3',
        buy_min: 50.00,
        raw_message: 'Test',
      };

      const result = await client.insertSignal(signal);
      assert.ok(result.id);
    });

    it('should handle null values for optional fields', async () => {
      const signal = {
        ts: new Date(),
        asset: 'ITUB4',
        buy_min: 25.00,
        raw_message: 'Minimal signal',
        // Campos opcionais omitidos
      };

      const result = await client.insertSignal(signal);
      assert.ok(result.id);

      // Verify null values were stored
      const rows = await client.fetchSignals({ limit: 1 });
      assert.strictEqual(rows[0].target_1, null);
      assert.strictEqual(rows[0].target_2, null);
    });

    it('should set default timestamps (ingested_at, created_at)', async () => {
      const signal = {
        ts: new Date(),
        asset: 'BBDC4',
        buy_min: 20.00,
        raw_message: 'Test',
      };

      await client.insertSignal(signal);

      const rows = await client.fetchSignals({ limit: 1 });
      assert.ok(rows[0].ingested_at);
      assert.ok(rows[0].created_at);
      assert.ok(rows[0].updated_at);
    });
  });

  describe('fetchSignals', () => {
    beforeEach(async () => {
      // Insert test data
      const signals = [
        {
          ts: new Date('2025-11-01T10:00:00Z'),
          channel: 'TP Capital',
          signal_type: 'Swing Trade',
          asset: 'PETR4',
          buy_min: 25.00,
          raw_message: 'Signal 1',
        },
        {
          ts: new Date('2025-11-01T11:00:00Z'),
          channel: 'TP Capital',
          signal_type: 'Swing Trade',
          asset: 'VALE3',
          buy_min: 50.00,
          raw_message: 'Signal 2',
        },
        {
          ts: new Date('2025-11-01T12:00:00Z'),
          channel: 'Other Channel',
          signal_type: 'Day Trade',
          asset: 'PETR4',
          buy_min: 26.00,
          raw_message: 'Signal 3',
        },
      ];

      for (const signal of signals) {
        await client.insertSignal(signal);
      }
    });

    it('should fetch all signals when no filter', async () => {
      const rows = await client.fetchSignals({});
      
      assert.strictEqual(rows.length, 3);
      assert.ok(rows[0].id);
      assert.ok(rows[0].ts);
      assert.ok(rows[0].asset);
    });

    it('should filter by channel', async () => {
      const rows = await client.fetchSignals({ channel: 'TP Capital' });
      
      assert.strictEqual(rows.length, 2);
      assert.ok(rows.every(r => r.channel === 'TP Capital'));
    });

    it('should filter by signal_type', async () => {
      const rows = await client.fetchSignals({ signalType: 'Day Trade' });
      
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].signal_type, 'Day Trade');
    });

    it('should filter by time range (fromTs, toTs)', async () => {
      const fromTs = Date.parse('2025-11-01T10:30:00Z');
      const toTs = Date.parse('2025-11-01T11:30:00Z');
      
      const rows = await client.fetchSignals({ fromTs, toTs });
      
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].asset, 'VALE3');
    });

    it('should limit results', async () => {
      const rows = await client.fetchSignals({ limit: 2 });
      
      assert.strictEqual(rows.length, 2);
    });

    it('should order by ts DESC (most recent first)', async () => {
      const rows = await client.fetchSignals({});
      
      const timestamps = rows.map(r => new Date(r.ts).getTime());
      const sorted = [...timestamps].sort((a, b) => b - a);
      assert.deepStrictEqual(timestamps, sorted);
    });

    it('should combine multiple filters', async () => {
      const rows = await client.fetchSignals({
        channel: 'TP Capital',
        signalType: 'Swing Trade',
        limit: 1,
      });
      
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].channel, 'TP Capital');
      assert.strictEqual(rows[0].signal_type, 'Swing Trade');
    });
  });

  describe('deleteSignalByIngestedAt', () => {
    it('should delete signal by created_at timestamp', async () => {
      const signal = {
        ts: new Date(),
        asset: 'PETR4',
        buy_min: 25.00,
        raw_message: 'To be deleted',
      };

      await client.insertSignal(signal);
      
      const before = await client.fetchSignals({});
      assert.strictEqual(before.length, 1);

      const ingestedAt = before[0].created_at;
      await client.deleteSignalByIngestedAt(ingestedAt);

      const after = await client.fetchSignals({});
      assert.strictEqual(after.length, 0);
    });
  });

  describe('CRUD: Telegram Bots', () => {
    it('should create, read, update, delete telegram bot', async () => {
      // Create
      const bot = {
        id: 'bot-test-123',
        username: 'test_bot',
        token: 'TOKEN123',
        bot_type: 'Sender',
        description: 'Test bot',
      };

      await client.createTelegramBot(bot);

      // Read
      const bots = await client.getTelegramBots();
      assert.strictEqual(bots.length, 1);
      assert.strictEqual(bots[0].username, 'test_bot');

      // Update
      await client.updateTelegramBot('bot-test-123', {
        description: 'Updated description',
      });

      const updated = await client.getTelegramBots();
      assert.strictEqual(updated[0].description, 'Updated description');

      // Delete (soft delete)
      await client.deleteTelegramBot('bot-test-123');

      const afterDelete = await client.getTelegramBots();
      assert.strictEqual(afterDelete.length, 0);
    });
  });

  describe('CRUD: Telegram Channels', () => {
    it('should create, read, update, delete telegram channel', async () => {
      // Create
      const channel = {
        id: 'channel-test-123',
        label: 'Test Channel',
        channel_id: '-1001234567890',
        channel_type: 'source',
        description: 'Test channel',
      };

      await client.createTelegramChannel(channel);

      // Read
      const channels = await client.getTelegramChannels();
      assert.strictEqual(channels.length, 1);
      assert.strictEqual(channels[0].label, 'Test Channel');

      // Update
      await client.updateTelegramChannel('channel-test-123', {
        description: 'Updated description',
      });

      const updated = await client.getTelegramChannels();
      assert.strictEqual(updated[0].description, 'Updated description');

      // Delete (soft delete)
      await client.deleteTelegramChannel('channel-test-123');

      const afterDelete = await client.getTelegramChannels();
      assert.strictEqual(afterDelete.length, 0);
    });
  });

  describe('getChannelsWithStats', () => {
    beforeEach(async () => {
      // Insert signals from different channels
      const signals = [
        { ts: new Date(), channel: 'Channel A', asset: 'PETR4', buy_min: 25.00, raw_message: 'A1' },
        { ts: new Date(), channel: 'Channel A', asset: 'VALE3', buy_min: 50.00, raw_message: 'A2' },
        { ts: new Date(), channel: 'Channel B', asset: 'ITUB4', buy_min: 25.00, raw_message: 'B1' },
      ];

      for (const signal of signals) {
        await client.insertSignal(signal);
      }
    });

    it('should return channel statistics', async () => {
      const stats = await client.getChannelsWithStats();
      
      assert.strictEqual(stats.length, 2);
      
      const channelA = stats.find(s => s.channel === 'Channel A');
      const channelB = stats.find(s => s.channel === 'Channel B');
      
      assert.strictEqual(channelA.signal_count, '2');
      assert.strictEqual(channelB.signal_count, '1');
      assert.ok(channelA.last_signal);
    });
  });
});


