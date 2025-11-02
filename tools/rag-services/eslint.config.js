// ESLint Flat Config (v9+)
// Replaces .eslintrc.json

import eslintTs from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '!eslint.config.js']
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': eslintTs
    },
    rules: {
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Code quality
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],

      // Best practices
      'require-await': 'off', // Handled by @typescript-eslint
      '@typescript-eslint/require-await': 'error',
      'no-return-await': 'off', // Handled by @typescript-eslint
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Style (defer to Prettier)
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline']
    }
  }
];
