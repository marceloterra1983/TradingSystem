# Code Examples & Patterns

> **Ready-to-use code snippets** organized by pattern
> **Last Updated:** 2025-11-05

## Overview

This directory contains production-ready code examples and patterns used throughout the TradingSystem project.

## Categories

- [Authentication](#authentication) - JWT, API keys, OAuth
- [Circuit Breaker](#circuit-breaker) - Fault tolerance with Opossum
- [Database](#database) - PostgreSQL, TimescaleDB, QuestDB
- [API Integration](#api-integration) - REST clients, error handling
- [State Management](#state-management) - Zustand stores, React Query
- [Testing](#testing) - Unit, integration, E2E tests

---

## Authentication

### JWT Authentication

**File:** [authentication/jwt-auth.ts](authentication/jwt-auth.ts)

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET!;

export function generateToken(userId: string, expiresIn = '1h') {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn }
  );
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### API Key Authentication

**File:** [authentication/api-key-auth.ts](authentication/api-key-auth.ts)

```typescript
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_SECRET_TOKEN;

  if (!apiKey || apiKey !== validKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}
```

---

## Circuit Breaker

### Basic Circuit Breaker

**File:** [circuit-breaker/opossum-basic.ts](circuit-breaker/opossum-basic.ts)

```typescript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

async function callExternalAPI(data: any) {
  const response = await fetch('https://api.example.com/data', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}

const breaker = new CircuitBreaker(callExternalAPI, options);

// Fallback
breaker.fallback(() => ({ error: 'Service unavailable' }));

// Events
breaker.on('open', () => console.error('Circuit breaker opened!'));
breaker.on('halfOpen', () => console.warn('Circuit breaker half-open'));
breaker.on('close', () => console.info('Circuit breaker closed'));

// Usage
try {
  const result = await breaker.fire(data);
} catch (error) {
  console.error('Circuit breaker error:', error);
}
```

---

## Database

### TimescaleDB Connection

**File:** [database/timescaledb-client.ts](database/timescaledb-client.ts)

```typescript
import { Pool } from 'pg';

class TimescaleClient {
  private pool: Pool;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    this.pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { error: error.message });
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1');
      return { status: 'connected' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default TimescaleClient;
```

### Redis Caching

**File:** [database/redis-cache.ts](database/redis-cache.ts)

```typescript
import Redis from 'ioredis';

class RedisCache {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '7079'),
      password: process.env.REDIS_PASSWORD
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 300) {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}

export default RedisCache;
```

---

## API Integration

### Axios Client with Interceptors

**File:** [api-integration/axios-client.ts](api-integration/axios-client.ts)

```typescript
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = process.env.API_TOKEN;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }
}

export default ApiClient;
```

---

## State Management

### Zustand Store

**File:** [state-management/zustand-store.ts](state-management/zustand-store.ts)

```typescript
import { create } from 'zustand';

interface Item {
  id: string;
  title: string;
  status: string;
}

interface Store {
  items: Item[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      set({ items: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addItem: async (item) => {
    const response = await fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(item)
    });
    const newItem = await response.json();
    set({ items: [...get().items, newItem] });
  },

  updateItem: async (id, updates) => {
    const response = await fetch(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    const updated = await response.json();
    set({
      items: get().items.map(item => item.id === id ? updated : item)
    });
  },

  deleteItem: async (id) => {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    set({ items: get().items.filter(item => item.id !== id) });
  }
}));
```

### React Query Integration

**File:** [state-management/react-query.ts](state-management/react-query.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => fetch('/api/items').then(res => res.json()),
    staleTime: 5 * 60 * 1000
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: Omit<Item, 'id'>) =>
      fetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(item)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  });
}
```

---

## Testing

### Unit Test Example

**File:** [testing/unit-test.spec.ts](testing/unit-test.spec.ts)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { parseSignal } from '../lib/parseSignal';

describe('parseSignal', () => {
  it('should parse BUY signal', () => {
    const input = 'BUY WINZ25 @ 120000';
    const result = parseSignal(input);

    expect(result).toEqual({
      direction: 'BUY',
      symbol: 'WINZ25',
      entryPrice: 120000
    });
  });

  it('should throw on invalid signal', () => {
    expect(() => parseSignal('INVALID')).toThrow();
  });
});
```

### Integration Test Example

**File:** [testing/integration-test.spec.ts](testing/integration-test.spec.ts)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('API Integration', () => {
  it('POST /items should create item', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({ title: 'Test Item', category: 'test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Item');
  });

  it('GET /items should return all items', async () => {
    const response = await request(app)
      .get('/api/items')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### E2E Test Example (Playwright)

**File:** [testing/e2e-test.spec.ts](testing/e2e-test.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Workspace Page', () => {
  test('should display items', async ({ page }) => {
    await page.goto('http://localhost:3103/#/workspace');
    await page.waitForSelector('[data-testid="workspace-item"]');

    const items = await page.locator('[data-testid="workspace-item"]').count();
    expect(items).toBeGreaterThan(0);
  });

  test('should create new item', async ({ page }) => {
    await page.goto('http://localhost:3103/#/workspace');
    await page.click('[data-testid="add-item-button"]');

    await page.fill('[name="title"]', 'Test Item');
    await page.click('[type="submit"]');

    await expect(page.locator('text=Test Item')).toBeVisible();
  });
});
```

---

## Usage

**Copy examples to your project:**
```bash
# Copy specific example
cp ref/examples/authentication/jwt-auth.ts src/lib/

# Copy entire category
cp -r ref/examples/database/* src/database/
```

**Run examples:**
```bash
# TypeScript examples
npx tsx ref/examples/circuit-breaker/opossum-basic.ts

# Test examples
npm run test ref/examples/testing/unit-test.spec.ts
```
