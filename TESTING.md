# Testing Guide

Comprehensive testing guide for TradingSystem project.

## Table of Contents

- [Overview](#overview)
- [Test Architecture](#test-architecture)
- [Running Tests](#running-tests)
- [Frontend Testing](#frontend-testing)
- [Backend Testing](#backend-testing)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The TradingSystem uses a comprehensive testing strategy across all layers:

- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test interactions between modules/services
- **E2E Tests**: Test complete user workflows (future)

### Test Stack

- **Frontend**: Vitest + React Testing Library + jsdom
- **Backend**: Jest + Supertest
- **CI/CD**: GitHub Actions

## Test Architecture

### Test Pyramid

```
       /\
      /E2E\
     /------\
    /  Int   \
   /----------\
  /    Unit    \
 /--------------\
```

- **Unit Tests**: 70% of tests, fast (<1s per test)
- **Integration Tests**: 20% of tests, moderate (<5s per test)
- **E2E Tests**: 10% of tests, slow (<30s per test)

### Directory Structure

```
frontend/dashboard/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts                    # Global test setup
│   │   ├── components/                 # Component tests
│   │   │   └── *.spec.tsx
│   │   ├── utils/                      # Utility tests
│   │   │   └── *.spec.ts
│   │   └── integration/                # Integration tests
│   │       └── *.test.ts
│   └── components/
│       └── __tests__/                  # Colocated tests
│           └── *.test.tsx
└── vitest.config.ts                    # Vitest configuration

backend/api/*/
├── src/
│   ├── __tests__/
│   │   └── setup.js                    # Global test setup
│   ├── routes/
│   │   └── __tests__/                  # Route tests
│   │       └── *.test.js
│   └── services/
│       └── __tests__/                  # Service tests
│           └── *.test.js
└── jest.config.js                      # Jest configuration
```

## Running Tests

### Quick Start

```bash
# Frontend tests
cd frontend/dashboard
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# Backend tests
cd backend/api/documentation-api
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# All tests (from project root)
npm run test:all           # Run all tests (future)
```

### Environment Variables

```bash
# Frontend Integration Tests (optional)
export DASHBOARD_API_INTEGRATION=true   # Enable integration tests
export VITE_DOCUMENTATION_API_URL=http://localhost:3402

# Backend Tests
export NODE_ENV=test
export LIBRARY_DB_STRATEGY=lowdb
export DB_PATH=./tests/tmp/test.json
```

## Frontend Testing

### Test Configuration

**vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

### Writing Component Tests

#### Basic Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '../MyComponent';

// Wrapper for components that use routing
const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />, { wrapper: TestWrapper });

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

#### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle button click', async () => {
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Click me</Button>);

  const button = screen.getByRole('button', { name: /click me/i });
  await userEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react';

it('should load data', async () => {
  const mockData = { id: 1, name: 'Test' };
  vi.mocked(fetchData).mockResolvedValue(mockData);

  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

#### Mocking Services

```typescript
// Mock external service
vi.mock('../../services/documentationService', () => ({
  __esModule: true,
  default: {
    search: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

import documentationService from '../../services/documentationService';

it('should call service', async () => {
  const mockResults = { total: 1, hits: [] };
  vi.mocked(documentationService.search).mockResolvedValue(mockResults);

  render(<SearchComponent />);

  // Trigger search
  await userEvent.type(screen.getByRole('textbox'), 'query');

  await waitFor(() => {
    expect(documentationService.search).toHaveBeenCalledWith('query');
  });
});
```

### Testing Custom Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

it('should fetch data', async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

### Integration Tests

Integration tests are **disabled by default** and require running services.

```bash
# Enable integration tests
export DASHBOARD_API_INTEGRATION=true

# Run specific integration tests
npm test -- src/__tests__/integration/api-integrations.test.ts
```

## Backend Testing

### Test Configuration

**jest.config.js**:
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Writing API Tests

#### Testing Routes

```javascript
import request from 'supertest';
import express from 'express';
import { itemsRouter } from '../items.js';

describe('Items API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/items', itemsRouter);
  });

  it('should get all items', async () => {
    const response = await request(app)
      .get('/api/items')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('should create item', async () => {
    const newItem = {
      title: 'Test Item',
      description: 'Test description',
      category: 'Features',
      priority: 'high',
    };

    const response = await request(app)
      .post('/api/items')
      .send(newItem)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject(newItem);
  });
});
```

#### Mocking Database

```javascript
import { getDbClient } from '../db/index.js';

jest.mock('../db/index.js');

describe('Database Operations', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      getItems: jest.fn(),
      createItem: jest.fn(),
    };
    getDbClient.mockReturnValue(mockDb);
  });

  it('should fetch items from database', async () => {
    mockDb.getItems.mockResolvedValue([{ id: 1 }]);

    const items = await mockDb.getItems();

    expect(items).toHaveLength(1);
  });
});
```

#### Testing Validation

```javascript
it('should reject invalid input', async () => {
  const invalidItem = {
    // Missing required fields
    title: '',
  };

  const response = await request(app)
    .post('/api/items')
    .send(invalidItem)
    .expect(400);

  expect(response.body.success).toBe(false);
  expect(response.body.errors).toHaveLength(1);
});
```

## Coverage Requirements

### Thresholds

- **Frontend (Dashboard)**:
  - Branches: 80%
  - Functions: 80%
  - Lines: 80%
  - Statements: 80%

- **Backend (APIs)**:
  - Branches: 70%
  - Functions: 70%
  - Lines: 70%
  - Statements: 70%

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

### Coverage Reports in CI

Coverage reports are:
- Uploaded to Codecov
- Available as GitHub Actions artifacts
- Commented on pull requests

## CI/CD Integration

### Automated Test Execution

Tests run automatically on:
- **Every push** to main/develop/feature branches
- **Every pull request**
- **Daily schedule** at 10 AM UTC

### GitHub Actions Workflow

```yaml
name: Test Automation

on:
  push:
    branches: [main, develop, feature/**]
  pull_request:
    branches: [main, develop]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
```

### Test Results

- Test results are uploaded as artifacts
- Coverage is reported to Codecov
- PR comments show coverage changes
- Failed tests block PR merges

## Best Practices

### 1. Test Pyramid

- Write more unit tests than integration tests
- Keep tests fast and independent
- Use mocks for external dependencies

### 2. Naming Conventions

```typescript
// Good test names
it('should render loading state when fetching data')
it('should display error message on failed API call')
it('should validate email format')

// Bad test names
it('works')
it('test1')
it('handles edge cases')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should update item status', async () => {
  // Arrange
  const item = { id: 1, status: 'new' };
  const mockUpdate = vi.fn();

  // Act
  await updateItemStatus(item.id, 'completed');

  // Assert
  expect(mockUpdate).toHaveBeenCalledWith(1, 'completed');
});
```

### 4. Test Isolation

```typescript
// Each test should be independent
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();

  // Clear localStorage
  localStorage.clear();
});

afterEach(() => {
  // Cleanup
  cleanup();
});
```

### 5. Avoid Implementation Details

```typescript
// Bad - tests implementation
expect(component.state.isLoading).toBe(true);

// Good - tests behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 6. Use Data-Testid Sparingly

```typescript
// Prefer accessible queries
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)

// Use data-testid only when necessary
screen.getByTestId('complex-component')
```

## Troubleshooting

### Common Issues

#### 1. "document is not defined"

**Solution**: Ensure `environment: 'jsdom'` in vitest.config.ts

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',  // Add this
  },
});
```

#### 2. "localStorage is not defined"

**Solution**: Mock localStorage in setup file

```typescript
// src/__tests__/setup.ts
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
  },
});
```

#### 3. "act() warning"

**Solution**: Wrap state updates in `waitFor`

```typescript
// Bad
await userEvent.click(button);
expect(screen.getByText('Updated')).toBeInTheDocument();

// Good
await userEvent.click(button);
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

#### 4. "Test timeout"

**Solution**: Increase timeout or check for infinite loops

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 10000);  // 10 seconds

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

#### 5. "Cannot find module"

**Solution**: Check path aliases in vitest.config.ts

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- src/__tests__/components/MyComponent.spec.tsx

# Run tests matching pattern
npm test -- --grep "should render"
```

### VS Code Integration

**.vscode/settings.json**:
```json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm test",
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure coverage thresholds are met
3. Run all tests before committing
4. Update this guide if needed

## License

MIT
