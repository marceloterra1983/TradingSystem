/**
 * ESLint configuration for the B3 API (Node.js ESM).
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2023: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
};
