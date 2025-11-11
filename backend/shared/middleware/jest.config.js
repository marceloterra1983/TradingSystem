/**
 * Jest Configuration
 * For testing shared middleware components
 */

export default {
  // Use node as test environment
  testEnvironment: 'node',

  // Transform ES modules
  transform: {},

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!coverage/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Module name mapper for @ imports (if needed)
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/../$1'
  }
};
