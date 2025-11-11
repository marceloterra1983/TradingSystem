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
        // Progressive thresholds (Phase 1 baseline - Improvement Plan v1.0)
        // These values will gradually increase as test coverage improves
        // Current baseline: ~10-60% | Target (Phase 2): 75% | Final target: 85%
        branches: 50,      // Current: 59.42% → Phase 2: 70% → Final: 80%
        functions: 30,     // Current: ~10% → Phase 2: 70% → Final: 85%
        lines: 30,         // Current: ~10% → Phase 2: 75% → Final: 85%
        statements: 30,    // Current: 10.02% → Phase 2: 75% → Final: 85%
      },
      // Report all uncovered lines in console
      all: true,
      // Include source files for accurate coverage mapping
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
