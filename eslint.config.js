export default [
  {
    // Configuração global de arquivos ignorados
    ignores: [
      // Dependencies
      '**/node_modules/**',
      'node_modules/**',
      
      // Build outputs
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/*.min.js',
      
      // Coverage
      '**/coverage/**',
      '**/.nyc_output/**',
      
      // Logs
      '**/*.log',
      '**/logs/**',
      
      // Environment files
      '**/.env',
      '**/.env.*',
      
      // IDEs e extensões
      '**/.vscode/**',
      '**/.vscode-extensions/**',
      '**/.idea/**',
      '**/*.swp',
      '**/*.swo',
      
      // Documentation
      '**/*.md',
      
      // Tools e configurações
      'tools/**',
      '.husky/**',
      '.git/**',
      
      // Assets gerados e outras áreas não monitoradas do frontend
      'frontend/**/dist/**',
      'frontend/**/build/**',
      'frontend/**/coverage/**',
      'docs/**',
      'docs_legacy/**',
      
      // Scripts com shebang
      '**/migrate-lowdb-to-timescaledb.js',
    ],
  },
  {
    // Configuração para arquivos JavaScript gerais
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals essenciais
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        
        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        
        // Web APIs disponíveis no Node.js moderno
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        
        // Performance API
        performance: 'readonly',
        
        // Other globals
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: {
      // Regras básicas
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'no-undef': 'error',
    },
  },
  {
    // Configuração específica para arquivos de teste
    files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        
        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        
        // Web APIs
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        performance: 'readonly',
        
        // Test framework globals (Jest/Vitest)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Regras mais relaxadas para testes
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'no-undef': 'error',
    },
  },
];
