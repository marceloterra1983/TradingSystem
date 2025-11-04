import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnectionFactory } from './connectionFactory';

describe('DatabaseConnectionFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TIMESCALEDB_HOST = 'localhost';
    process.env.TIMESCALEDB_PORT = '7000';
    process.env.TIMESCALEDB_USER = 'timescale';
    process.env.TIMESCALEDB_PASSWORD = 'password123';
    process.env.TIMESCALEDB_DATABASE = 'testdb';
  });

  afterEach(async () => {
    await DatabaseConnectionFactory.closeAll();
    process.env = originalEnv;
  });

  describe('initialize', () => {
    it('should initialize a pool successfully', () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      expect(DatabaseConnectionFactory.hasPool('timescale')).toBe(true);
      expect(DatabaseConnectionFactory.listPools()).toContain('timescale');
    });

    it('should not reinitialize existing pool', () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      expect(DatabaseConnectionFactory.listPools().length).toBe(1);
    });

    it('should store metadata', () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      const metadata = DatabaseConnectionFactory.getMetadata('timescale');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('timescale');
      expect(metadata?.config.port).toBe(7000);
    });
  });

  describe('getPool', () => {
    it('should return initialized pool', () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      const pool = DatabaseConnectionFactory.getPool('timescale');
      expect(pool).toBeDefined();
      expect(pool.options.port).toBe(7000);
    });

    it('should throw if pool not initialized', () => {
      expect(() => DatabaseConnectionFactory.getPool('nonexistent')).toThrow(
        "Pool 'nonexistent' not initialized"
      );
    });
  });

  describe('getStats', () => {
    it('should return pool statistics', () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      const stats = DatabaseConnectionFactory.getStats('timescale');
      
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
      expect(stats).toHaveProperty('maxConnections');
      expect(stats.maxConnections).toBe(10); // default
    });
  });

  describe('close', () => {
    it('should close specific pool', async () => {
      DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
      
      await DatabaseConnectionFactory.close('timescale');
      
      expect(DatabaseConnectionFactory.hasPool('timescale')).toBe(false);
    });
  });

  describe('closeAll', () => {
    it('should close all pools', async () => {
      DatabaseConnectionFactory.initialize('pool1', 'TIMESCALEDB');
      
      process.env.TIMESCALEDB_DATABASE = 'testdb2';
      DatabaseConnectionFactory.initialize('pool2', 'TIMESCALEDB');
      
      await DatabaseConnectionFactory.closeAll();
      
      expect(DatabaseConnectionFactory.listPools().length).toBe(0);
    });
  });
});

