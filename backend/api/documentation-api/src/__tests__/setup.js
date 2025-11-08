/**
 * Jest Test Setup
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY = "test-secret-key";
process.env.INTER_SERVICE_SECRET = "test-inter-service-secret";
process.env.LOG_LEVEL = "error"; // Reduce log noise during tests

// Mock console to avoid log spam
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
