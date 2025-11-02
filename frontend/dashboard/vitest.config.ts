import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.ts';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    ...(baseConfig.test ?? {}),
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 60000, // 60 seconds for tests with debounce
    coverage: {
      ...(baseConfig.test?.coverage ?? {}),
      enabled: false,
    },
  },
});
