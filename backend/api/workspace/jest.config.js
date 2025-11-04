/**
 * Jest Configuration for Workspace API
 * Unit and integration tests for workspace management service
 */

export default {
  // Use Node environment for backend testing
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/server.js',  // Exclude server bootstrap
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'html', 'json-summary', 'lcov'],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
};
