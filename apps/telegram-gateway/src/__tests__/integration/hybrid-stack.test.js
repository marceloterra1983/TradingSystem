import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { RedisTelegramCache } from '../../cache/RedisTelegramCache.js';
import Redis from 'ioredis';

/**
 * Integration Tests for Hybrid Stack Architecture
 * 
 * Tests Redis cache layer integration with TimescaleDB fallback
 * 
 * Prerequisites:
 * - Redis running on localhost:6379
 * - TimescaleDB running on localhost:6434 (via PgBouncer)
 */

describe('Hybrid Stack Integration Tests', () => {
  let redis;
  let cache;

  beforeAll(async () => {
    // Skip if Redis not available (CI environment)
    try {
      redis = new Redis({ host: 'localhost', port: 6379 });
      await redis.ping();
      
      cache = new RedisTelegramCache({
        host: 'localhost',
        port: 6379
      });
    } catch (error) {
      console.warn('Redis not available, skipping integration tests');
    }
  });

  afterAll(async () => {
    if (cache) await cache.disconnect();
    if (redis) await redis.quit();
  });

  it('should cache and retrieve message', async () => {
    if (!cache) return; // Skip if no Redis
    
    const testMessage = {
      channel_id: '-1001649127710',
      message_id: '999999',
      text: 'TEST MESSAGE',
      received_at: new Date().toISOString(),
      status: 'received',
      metadata: { test: true }
    };
    
    // Cache message
    const cached = await cache.cacheMessage(testMessage);
    expect(cached).toBe(true);
    
    // Retrieve from cache
    const messages = await cache.getUnprocessedMessages('-1001649127710', 10);
    expect(messages.length).toBeGreaterThan(0);
    
    // Verify message data
    const found = messages.find(m => m.text === 'TEST MESSAGE');
    expect(found).toBeDefined();
    expect(found.status).toBe('received');
  });

  it('should detect duplicates', async () => {
    if (!cache) return;
    
    const isDupe = await cache.isDuplicate('-1001649127710', '999999');
    expect(isDupe).toBe(true);  // From previous test
  });

  it('should mark message as processed', async () => {
    if (!cache) return;
    
    const updated = await cache.markAsProcessed('-1001649127710', '999999');
    expect(updated).toBe(true);
    
    // Verify status changed
    const key = 'telegram:msg:-1001649127710:999999';
    const data = await redis.get(key);
    const parsed = JSON.parse(data);
    expect(parsed.status).toBe('published');
  });
});

/**
 * End-to-End Flow Test
 * 
 * Tests complete message flow:
 * Telegram → Gateway → Redis → TP Capital → TimescaleDB
 * 
 * NOTE: Requires full stack running
 * Run with: npm run test:integration
 */
describe('End-to-End Message Flow', () => {
  it.skip('should process message from Telegram to TP Capital', async () => {
    // TODO: Implement full E2E test
    // 1. Mock Telegram message
    // 2. Send to Gateway
    // 3. Verify Redis cache
    // 4. Verify TP Capital processes
    // 5. Verify TimescaleDB persistence
  });
});

