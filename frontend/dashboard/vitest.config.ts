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
      reporter: ['text', 'json', 'html', 'json-summary', 'lcov'],
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
        // Progressive thresholds (baseline enforced in CI via coverage-gate script)
        branches: 50,
        functions: 30,
        lines: 30,
        statements: 30,
      },
      // Report all uncovered lines in console
      all: true,
      // Include source files for accurate coverage mapping
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
