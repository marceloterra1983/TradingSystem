import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'coverage/**',
        '**/*.config.js',
        '**/dist/**',
        '**/*.test.js'
      ]
    },
    include: ['src/**/*.test.js'],
    testTimeout: 10000
  }
});
