/**
 * Jest Test Setup
 * Runs before all tests
 */

import { logger } from '../utils/logger';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3403';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.LLAMAINDEX_INGESTION_URL = 'http://localhost:8201';
process.env.LLAMAINDEX_QUERY_URL = 'http://localhost:8202';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.COLLECTIONS_CONFIG_PATH = '/tmp/test-collections-config.json';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.beforeAll(() => {
  logger.info('Starting test suite...');
});

global.afterAll(() => {
  logger.info('Test suite completed.');
});
