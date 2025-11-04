import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadDatabaseConfig, validateDatabasePort, getDatabaseConnectionString } from './database.config';

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadDatabaseConfig', () => {
    it('should load valid configuration with defaults', () => {
      process.env.TIMESCALEDB_HOST = 'localhost';
      process.env.TIMESCALEDB_PORT = '7000';
      process.env.TIMESCALEDB_USER = 'timescale';
      process.env.TIMESCALEDB_PASSWORD = 'password123';
      process.env.TIMESCALEDB_DATABASE = 'testdb';

      const config = loadDatabaseConfig('TIMESCALEDB');

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(7000);
      expect(config.user).toBe('timescale');
      expect(config.password).toBe('password123');
      expect(config.database).toBe('testdb');
      expect(config.pool.max).toBe(10); // default
    });

    it('should enforce protected port range (7000-7999)', () => {
      process.env.TIMESCALEDB_HOST = 'localhost';
      process.env.TIMESCALEDB_PORT = '5432'; // Outside range
      process.env.TIMESCALEDB_USER = 'timescale';
      process.env.TIMESCALEDB_PASSWORD = 'password123';
      process.env.TIMESCALEDB_DATABASE = 'testdb';

      expect(() => loadDatabaseConfig('TIMESCALEDB')).toThrow(
        'Database port must be in protected range (7000-7999)'
      );
    });

    it('should validate required fields', () => {
      process.env.TIMESCALEDB_PORT = '7000';
      // Missing user, password, database

      expect(() => loadDatabaseConfig('TIMESCALEDB')).toThrow();
    });

    it('should use custom pool settings', () => {
      process.env.TIMESCALEDB_HOST = 'localhost';
      process.env.TIMESCALEDB_PORT = '7000';
      process.env.TIMESCALEDB_USER = 'timescale';
      process.env.TIMESCALEDB_PASSWORD = 'password123';
      process.env.TIMESCALEDB_DATABASE = 'testdb';
      process.env.TIMESCALEDB_POOL_MAX = '20';
      process.env.TIMESCALEDB_POOL_IDLE = '60000';

      const config = loadDatabaseConfig('TIMESCALEDB');

      expect(config.pool.max).toBe(20);
      expect(config.pool.idleTimeoutMillis).toBe(60000);
    });
  });

  describe('validateDatabasePort', () => {
    it('should accept ports in protected range', () => {
      expect(() => validateDatabasePort(7000, 'TimescaleDB')).not.toThrow();
      expect(() => validateDatabasePort(7500, 'QuestDB')).not.toThrow();
      expect(() => validateDatabasePort(7999, 'Qdrant')).not.toThrow();
    });

    it('should reject ports outside protected range', () => {
      expect(() => validateDatabasePort(5432, 'TimescaleDB')).toThrow(
        'outside protected database range'
      );
      expect(() => validateDatabasePort(3000, 'Redis')).toThrow();
      expect(() => validateDatabasePort(9000, 'QuestDB')).toThrow();
    });
  });

  describe('getDatabaseConnectionString', () => {
    it('should generate correct connection string', () => {
      const config = {
        host: 'localhost',
        port: 7000,
        user: 'timescale',
        password: 'pass123',
        database: 'testdb',
        ssl: false,
        pool: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 },
      };

      const connString = getDatabaseConnectionString(config);

      expect(connString).toBe('postgres://timescale:pass123@localhost:7000/testdb');
    });

    it('should include SSL parameter when enabled', () => {
      const config = {
        host: 'localhost',
        port: 7000,
        user: 'timescale',
        password: 'pass123',
        database: 'testdb',
        ssl: true,
        pool: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 },
      };

      const connString = getDatabaseConnectionString(config);

      expect(connString).toContain('sslmode=require');
    });

    it('should include schema parameter when provided', () => {
      const config = {
        host: 'localhost',
        port: 7000,
        user: 'timescale',
        password: 'pass123',
        database: 'testdb',
        ssl: false,
        schema: 'public',
        pool: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 },
      };

      const connString = getDatabaseConnectionString(config);

      expect(connString).toContain('schema=public');
    });
  });
});

