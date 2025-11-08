import { jest } from "@jest/globals";

/**
 * Jest Test Setup for Workspace API
 * Global configuration and mocks for all tests
 */

// Ensure Jest globals exist when running in pure ESM mode
if (!globalThis.jest) {
  globalThis.jest = jest;
}

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.LIBRARY_DB_STRATEGY = "lowdb";
process.env.DB_PATH = "./tests/tmp/ideas.test.json";
process.env.PORT = "3299"; // Different port for tests
process.env.LOG_LEVEL = "silent"; // Silence logs during tests

// Increase timeout for all tests
jest.setTimeout(30000);

// Global beforeEach
beforeEach(() => {
  // Clear any cached modules between tests
  jest.clearAllMocks();
});

// Global afterEach
afterEach(() => {
  // Cleanup
});

// Global afterAll
afterAll(() => {
  // Final cleanup
});
