import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RedisTelegramCache } from '../RedisTelegramCache.js';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('RedisTelegramCache', () => {
  let cache;
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      pipeline: jest.fn(() => mockRedis),
      setex: jest.fn(() => mockRedis),
      zadd: jest.fn(() => mockRedis),
      exec: jest.fn(() => Promise.resolve([[null, 'OK'], [null, 1], [null, 'OK']])),
      exists: jest.fn(),
      get: jest.fn(),
      zrange: jest.fn(),
      zremrangebyscore: jest.fn(),
      ping: jest.fn(() => Promise.resolve('PONG')),
      quit: jest.fn(() => Promise.resolve()),
      on: jest.fn()
    };

    Redis.mockImplementation(() => mockRedis);

    cache = new RedisTelegramCache({
      host: 'localhost',
      port: 6379,
      hotCacheTTL: 3600,
      dedupCacheTTL: 7200
    });
  });

  afterEach(async () => {
    await cache.disconnect();
    jest.clearAllMocks();
  });

  describe('cacheMessage', () => {
    it('should cache message with pipeline', async () => {
      const message = {
        channel_id: '-1001649127710',
        message_id: '123456',
        text: 'BUY PETR4 8.50-8.55',
        received_at: '2025-11-03T10:00:00Z',
        status: 'received',
        metadata: { source: 'telegram' }
      };

      const result = await cache.cacheMessage(message);

      expect(result).toBe(true);
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'telegram:msg:-1001649127710:123456',
        3600,
        expect.stringContaining('BUY PETR4')
      );
      expect(mockRedis.zadd).toHaveBeenCalled();
      expect(mockRedis.exec).toHaveBeenCalled();
    });

    it('should handle cache error gracefully', async () => {
      mockRedis.exec.mockRejectedValueOnce(new Error('Redis connection lost'));

      const message = {
        channel_id: '-1001649127710',
        message_id: '999999',
        text: 'TEST',
        received_at: '2025-11-03T10:00:00Z'
      };

      const result = await cache.cacheMessage(message);

      expect(result).toBe(false);
      expect(cache.metrics.cacheErrors).toBe(1);
    });
  });

  describe('isDuplicate', () => {
    it('should return true if message exists in cache', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await cache.isDuplicate('-1001649127710', '123456');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('telegram:dedup:-1001649127710:123456');
      expect(cache.metrics.cacheHits).toBe(1);
    });

    it('should return false if message does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await cache.isDuplicate('-1001649127710', '789012');

      expect(result).toBe(false);
      expect(cache.metrics.cacheMisses).toBe(1);
    });

    it('should return false on Redis error (fail open)', async () => {
      mockRedis.exists.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await cache.isDuplicate('-1001649127710', '123456');

      expect(result).toBe(false);  // Fail open: better to process twice than skip
      expect(cache.metrics.cacheErrors).toBe(1);
    });
  });

  describe('getUnprocessedMessages', () => {
    it('should fetch messages from cache', async () => {
      mockRedis.zrange.mockResolvedValueOnce(['123456', '123457', '123458']);
      
      mockRedis.pipeline.mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ text: 'MSG1', status: 'received' })],
          [null, JSON.stringify({ text: 'MSG2', status: 'received' })],
          [null, JSON.stringify({ text: 'MSG3', status: 'received' })]
        ])
      });

      const messages = await cache.getUnprocessedMessages('-1001649127710', 100);

      expect(messages).toHaveLength(3);
      expect(messages[0].text).toBe('MSG1');
      expect(cache.metrics.cacheHits).toBe(1);
    });

    it('should return empty array if no messages in cache', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);

      const messages = await cache.getUnprocessedMessages('-1001649127710', 100);

      expect(messages).toEqual([]);
      expect(cache.metrics.cacheMisses).toBe(1);
    });

    it('should filter out non-received messages', async () => {
      mockRedis.zrange.mockResolvedValueOnce(['123456', '123457']);
      
      mockRedis.pipeline.mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ text: 'MSG1', status: 'received' })],
          [null, JSON.stringify({ text: 'MSG2', status: 'published' })]
        ])
      });

      const messages = await cache.getUnprocessedMessages('-1001649127710', 100);

      expect(messages).toHaveLength(1);  // Only 'received' status
      expect(messages[0].text).toBe('MSG1');
    });
  });

  describe('markAsProcessed', () => {
    it('should update message status in cache', async () => {
      const existingMessage = {
        text: 'BUY PETR4',
        status: 'received',
        received_at: '2025-11-03T10:00:00Z'
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingMessage));
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await cache.markAsProcessed('-1001649127710', '123456');

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'telegram:msg:-1001649127710:123456',
        3600,
        expect.stringContaining('"status":"published"')
      );
    });

    it('should return false if message not in cache', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cache.markAsProcessed('-1001649127710', '999999');

      expect(result).toBe(false);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired messages from sorted set', async () => {
      mockRedis.zremrangebyscore.mockResolvedValueOnce(42);

      const removed = await cache.cleanupExpired('-1001649127710');

      expect(removed).toBe(42);
      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        'telegram:channel:-1001649127710:recent',
        0,
        expect.any(Number)
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true if Redis responds to PING', async () => {
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const healthy = await cache.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should return false if Redis is unavailable', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection refused'));

      const healthy = await cache.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should calculate cache hit rate correctly', () => {
      cache.metrics.cacheHits = 80;
      cache.metrics.cacheMisses = 20;

      const stats = cache.getStats();

      expect(stats.hits).toBe(80);
      expect(stats.misses).toBe(20);
      expect(stats.totalRequests).toBe(100);
      expect(stats.hitRate).toBe(0.8);
    });

    it('should handle zero requests', () => {
      const stats = cache.getStats();

      expect(stats.hitRate).toBe(0);
    });
  });
});

