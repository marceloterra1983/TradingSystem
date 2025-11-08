import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      'src/__tests__/setup-act-env.ts',
      'src/__tests__/setup.ts',
    ],
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/setup.ts',
        'src/mocks/**',
        'src/__tests__/**',
        'vite.config.ts',
        'vitest.config.ts',
        'scripts/**',
      ],
      thresholds: {
        // TODO: Gradually increase these thresholds as test coverage improves
        // Target: 80% (currently ~10-60%)
        branches: 50,      // Current: 59.42%
        functions: 10,     // Current: ~10%
        lines: 10,         // Current: ~10%
        statements: 10,    // Current: 10.02%
      },
    },
  },
});
