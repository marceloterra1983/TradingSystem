# RAG Services API - Complete Developer Guide

**Version**: 1.0.0  
**Last Updated**: 2025-11-02  
**Status**: ✅ Production Ready

---

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [Code Examples](#code-examples)
- [SDKs](#sdks)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Performance](#performance)
- [Testing](#testing)
- [Support](#support)

---

## 🚀 Quick Start

### 1. Get Your API Token

```bash
curl -X POST http://localhost:3402/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your_password"}'
```

### 2. Make Your First Request

```bash
curl -X GET "http://localhost:3402/api/v1/rag/search?query=RAG%20architecture" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Install SDK (Optional)

<Tabs>
<TabItem value="typescript" label="TypeScript">

```bash
npm install @tradingsystem/rag-sdk
```

```typescript
import { RAGClient } from '@tradingsystem/rag-sdk';

const client = new RAGClient({
  baseURL: 'http://localhost:3402/api/v1',
  token: YOUR_JWT_TOKEN,
});

const results = await client.search('RAG architecture');
```

</TabItem>
<TabItem value="python" label="Python">

```bash
pip install tradingsystem-rag
```

```python
from tradingsystem_rag import RAGClient

client = RAGClient(
    base_url='http://localhost:3402/api/v1',
    token=YOUR_JWT_TOKEN
)

results = client.search('RAG architecture')
```

</TabItem>
</Tabs>

---

## 🏗️ API Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| **Development** | `http://localhost:3402/api/v1` |
| **Staging** | `https://staging-api.tradingsystem.com/api/v1` |
| **Production** | `https://api.tradingsystem.com/api/v1` |

### Endpoints Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Collections** | 6 | Manage RAG collections (CRUD + stats) |
| **Search** | 2 | Semantic search + Q&A |
| **Ingestion** | 2 | Trigger jobs + monitor progress |
| **Analytics** | 1 | Query and ingestion analytics |
| **Models** | 1 | List embedding models |
| **Health** | 1 | Service health check |

**Total**: 13 endpoints

---

## 🔐 Authentication

### JWT Bearer Token

All endpoints require authentication via JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle

1. **Obtain**: POST `/api/v1/auth/login`
2. **Use**: Include in `Authorization` header
3. **Refresh**: POST `/api/v1/auth/refresh` (before expiry)
4. **Expire**: After 1 hour (default)

### Example: Token Management

```typescript
class TokenManager {
  private token: string | null = null;
  private expiresAt: number = 0;
  
  async getToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.expiresAt - 60000) {
      return this.token;
    }
    
    // Refresh or obtain new token
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    this.token = data.data.token;
    this.expiresAt = new Date(data.data.expires_at).getTime();
    
    return this.token;
  }
}
```

---

## 📡 Core Endpoints

### Collections Management

```
GET    /rag/collections               - List collections
POST   /rag/collections               - Create collection
GET    /rag/collections/{id}          - Get collection
PUT    /rag/collections/{id}          - Update collection
DELETE /rag/collections/{id}          - Delete collection
GET    /rag/collections/{id}/stats    - Get statistics
```

### Search & Query

```
GET    /rag/search                    - Semantic search
POST   /rag/query                     - Question answering (Q&A)
```

### Ingestion

```
POST   /rag/collections/{id}/ingest  - Trigger ingestion
GET    /rag/jobs/{jobId}              - Get job status
```

### Analytics

```
GET    /rag/analytics/queries         - Query analytics
```

### Models

```
GET    /rag/models                    - List embedding models
```

### Health

```
GET    /health                        - Health check
```

---

## 💻 Code Examples

### Complete Workflow Example (TypeScript)

```typescript
// 1. Initialize client
const client = new RAGClient({
  baseURL: 'http://localhost:3402/api/v1',
  token: await getAuthToken(),
});

// 2. Create a new collection
const collection = await client.collections.create({
  name: 'product_docs__nomic',
  display_name: 'Product Documentation',
  directory: '/data/docs/products',
  embedding_model: 'nomic-embed-text',
});

console.log(`✅ Collection created: ${collection.id}`);

// 3. Trigger ingestion
const job = await client.ingestion.trigger(collection.id, {
  job_type: 'full_index',
});

console.log(`📥 Ingestion started: ${job.job_id}`);

// 4. Wait for completion
const finalStatus = await client.ingestion.waitForCompletion(job.job_id, {
  pollInterval: 2000,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent_complete}%`);
  },
});

if (finalStatus.status === 'completed') {
  console.log(`✅ Ingestion completed!`);
  console.log(`  Documents: ${finalStatus.documents_processed}`);
  console.log(`  Chunks: ${finalStatus.chunks_generated}`);
  console.log(`  Duration: ${finalStatus.duration_ms}ms`);
} else {
  console.error(`❌ Ingestion failed: ${finalStatus.error_message}`);
}

// 5. Perform semantic search
const searchResults = await client.search('product features', {
  collection: collection.name,
  max_results: 10,
});

console.log(`\n🔍 Search results: ${searchResults.length}`);
searchResults.forEach((result, i) => {
  console.log(`\n[${i + 1}] Relevance: ${result.relevance.toFixed(2)}`);
  console.log(`    ${result.content.substring(0, 100)}...`);
});

// 6. Ask a question
const answer = await client.query('What are the key product features?', {
  collection: collection.name,
});

console.log(`\n💬 Answer (confidence: ${answer.confidence}):`);
console.log(answer.answer);
console.log(`\n📚 Sources: ${answer.sources.length}`);

// 7. Get analytics
const analytics = await client.analytics.getQueries(
  new Date(Date.now() - 24 * 60 * 60 * 1000),
  new Date(),
);

console.log(`\n📊 Analytics (last 24 hours):`);
console.log(`  Total queries: ${analytics.summary.total_queries}`);
console.log(`  Avg duration: ${analytics.summary.avg_duration_ms}ms`);
console.log(`  Cache hit rate: ${(analytics.summary.cache_hit_rate * 100).toFixed(1)}%`);
```

---

## 🎯 Use Cases

### 1. Documentation Search

```typescript
// Search across all documentation
const results = await client.search('database schema design', {
  max_results: 10,
  score_threshold: 0.7,
});

// Filter by specific collection
const apiDocs = await client.search('REST API authentication', {
  collection: 'api_docs__nomic',
});
```

### 2. AI-Powered Q&A

```typescript
// Get comprehensive answer with sources
const response = await client.query('How do I optimize database queries?');

console.log(response.answer);  // AI-generated answer
console.log(response.sources); // Source documents cited
```

### 3. Automated Ingestion

```typescript
// Set up file watcher integration
const collection = await client.collections.create({
  name: 'live_docs',
  directory: '/data/docs/live',
  auto_update: true,  // Enable file watcher
});

// Changes to /data/docs/live/* will trigger auto-ingestion
```

### 4. Multi-Model Comparison

```typescript
// Search with different embedding models
const [nomicResults, mxbaiResults] = await Promise.all([
  client.search('architecture', { collection: 'docs__nomic' }),
  client.search('architecture', { collection: 'docs__mxbai' }),
]);

// Compare relevance scores
console.log('Nomic avg relevance:', 
  nomicResults.reduce((sum, r) => sum + r.relevance, 0) / nomicResults.length
);
console.log('MXBAI avg relevance:', 
  mxbaiResults.reduce((sum, r) => sum + r.relevance, 0) / mxbaiResults.length
);
```

---

## ⚡ Performance Best Practices

### 1. Enable Caching

```typescript
// ✅ GOOD: Use cache for stats (4ms)
const stats = await client.collections.getStats('collection_id', true);

// ⚠️ AVOID: Always fetch fresh (6ms)
const stats = await client.collections.getStats('collection_id', false);
```

### 2. Optimize Result Limits

```typescript
// ✅ GOOD: Reasonable limit
const results = await client.search('query', { max_results: 5 });

// ⚠️ AVOID: Excessive results (slower)
const results = await client.search('query', { max_results: 100 });
```

### 3. Use Score Thresholds

```typescript
// ✅ GOOD: Filter low-quality results
const results = await client.search('query', { score_threshold: 0.7 });

// ⚠️ AVOID: Accept all results (noise)
const results = await client.search('query', { score_threshold: 0.0 });
```

### 4. Batch Operations

```typescript
// ✅ GOOD: Parallel independent requests
const results = await Promise.all([
  client.search('query1'),
  client.search('query2'),
  client.search('query3'),
]);

// ❌ BAD: Sequential requests
const r1 = await client.search('query1');
const r2 = await client.search('query2');
const r3 = await client.search('query3');
```

---

## 🧪 Testing

### Unit Tests

```typescript
// test/rag-client.test.ts
import { RAGClient } from '@tradingsystem/rag-sdk';
import { expect, describe, it, beforeEach } from '@jest/globals';

describe('RAGClient', () => {
  let client: RAGClient;
  
  beforeEach(() => {
    client = new RAGClient({
      baseURL: 'http://localhost:3402/api/v1',
      token: TEST_TOKEN,
    });
  });
  
  it('should list collections', async () => {
    const collections = await client.collections.list();
    expect(collections).toBeInstanceOf(Array);
    expect(collections.length).toBeGreaterThan(0);
  });
  
  it('should perform search', async () => {
    const results = await client.search('test query');
    expect(results).toBeInstanceOf(Array);
    results.forEach(result => {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('relevance');
      expect(result.relevance).toBeGreaterThanOrEqual(0);
      expect(result.relevance).toBeLessThanOrEqual(1);
    });
  });
});
```

### Integration Tests

```bash
# Run API tests
npm run test:api

# Expected output:
# ✅ GET /rag/collections (200 OK)
# ✅ POST /rag/collections (201 Created)
# ✅ GET /rag/search (200 OK)
# ✅ POST /rag/query (200 OK)
```

### Load Tests (K6)

```javascript
// tests/load/rag-api.k6.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.get(
    'http://localhost:3402/api/v1/rag/search?query=test&max_results=5',
    { headers: { Authorization: `Bearer ${__ENV.JWT_TOKEN}` } }
  );
  
  check(response, {
    'status 200': (r) => r.status === 200,
    'response < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 📊 Performance Benchmarks

### Response Times (p95)

| Endpoint | Cached | Fresh | Target |
|----------|--------|-------|--------|
| `GET /rag/collections` | 4ms | 6ms | < 10ms |
| `GET /rag/search` | 8ms | 12ms | < 50ms |
| `POST /rag/query` | 10ms | 5500ms | < 10s |
| `GET /rag/collections/{id}/stats` | 4ms | 6ms | < 10ms |

### Throughput

| Metric | Value | Notes |
|--------|-------|-------|
| **Max RPS** | 1000+ | With caching |
| **Concurrent Users** | 100+ | Sustained load |
| **Cache Hit Rate** | 80% | Typical usage |
| **Uptime** | 99.9% | SLA target |

---

## 🔒 Security

### Best Practices

#### 1. Never Expose Tokens

```typescript
// ❌ BAD: Token in code
const client = new RAGClient({
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
});

// ✅ GOOD: Token from environment
const client = new RAGClient({
  token: process.env.RAG_API_TOKEN,
});
```

#### 2. Use HTTPS in Production

```typescript
// ❌ BAD: HTTP in production
const baseURL = 'http://api.tradingsystem.com/api/v1';

// ✅ GOOD: HTTPS
const baseURL = 'https://api.tradingsystem.com/api/v1';
```

#### 3. Validate Input

```typescript
// ✅ GOOD: Validate before sending
function validateQuery(query: string): string {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }
  if (query.length > 1000) {
    throw new Error('Query too long (max 1000 chars)');
  }
  return query.trim();
}

const results = await client.search(validateQuery(userInput));
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: 401 Unauthorized

**Cause**: Token expired or invalid

**Solution**:
```typescript
try {
  const results = await client.search('query');
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Refresh token
    const newToken = await refreshAuthToken();
    client.setToken(newToken);
    
    // Retry request
    const results = await client.search('query');
  }
}
```

#### Issue: 429 Rate Limit Exceeded

**Cause**: Too many requests

**Solution**:
```typescript
try {
  const results = await client.search('query');
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details.retry_after; // seconds
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    const results = await client.search('query');
  }
}
```

#### Issue: 503 Service Unavailable

**Cause**: Ollama LLM service down

**Solution**:
```typescript
// Use search (no LLM) instead of query
const results = await client.search('query');  // ✅ Works without LLM

// OR wait for LLM to come back online
const health = await client.health.check();
if (health.services.ollama.status === 'connected') {
  const answer = await client.query('query');
}
```

---

## 📦 SDK Development

### Generate TypeScript SDK

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate SDK
openapi-generator-cli generate \
  -i backend/api/documentation-api/openapi/rag-services-v1.yaml \
  -g typescript-axios \
  -o sdk/typescript \
  --additional-properties=npmName=@tradingsystem/rag-sdk
```

### Generate Python SDK

```bash
# Generate SDK
openapi-generator-cli generate \
  -i backend/api/documentation-api/openapi/rag-services-v1.yaml \
  -g python \
  -o sdk/python \
  --additional-properties=packageName=tradingsystem_rag
```

### Manual SDK Template

```typescript
// sdk/typescript/src/RAGClient.ts
export class RAGClient {
  constructor(private config: ClientConfig) {
    this.baseURL = config.baseURL;
    this.token = config.token;
  }
  
  // Collections namespace
  get collections() {
    return {
      list: (params?) => this._get('/rag/collections', params),
      create: (data) => this._post('/rag/collections', data),
      get: (id) => this._get(`/rag/collections/${id}`),
      update: (id, data) => this._put(`/rag/collections/${id}`, data),
      delete: (id) => this._delete(`/rag/collections/${id}`),
      getStats: (id, useCache = true) => 
        this._get(`/rag/collections/${id}/stats`, { use_cache: useCache }),
    };
  }
  
  // Search methods
  async search(query: string, options?: SearchOptions) {
    return this._get('/rag/search', { query, ...options });
  }
  
  async query(query: string, options?: QueryOptions) {
    return this._post('/rag/query', { query, ...options });
  }
  
  // Private HTTP methods
  private async _get(path: string, params?: any) {
    const url = new URL(path, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    
    return this._handleResponse(response);
  }
  
  private async _post(path: string, body: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    return this._handleResponse(response);
  }
  
  private async _handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json();
      throw new RAGAPIError(
        error.error.code,
        error.error.message,
        response.status,
        error.error.details
      );
    }
    
    return await response.json();
  }
}
```

---

## 📚 Resources

### Documentation

- **[OpenAPI Spec](pathname:///specs/rag-services-v1.yaml)** - Complete API specification
- **[Code Examples](examples/rag-api-examples.md)** - Multi-language examples
- **[Postman Collection](postman/RAG-Services-API.postman_collection.json)** - Import to Postman
- **[Database Schema](../../../docs/content/database/rag-schema.mdx)** - Schema documentation
- **[Architecture](../../../docs/content/tools/rag/architecture.mdx)** - System design

### Tools

- **Swagger UI**: http://localhost:3402/api-docs (interactive testing)
- **Redocusaurus**: http://localhost:3400/api/rag-services (beautiful docs)
- **Postman**: Import collection for quick testing

### Community

- **GitHub**: https://github.com/tradingsystem/rag-services
- **Discord**: https://discord.gg/tradingsystem
- **Stack Overflow**: Tag `tradingsystem-rag`

---

## 🆘 Support

### Getting Help

1. **Documentation**: Check this guide and related docs
2. **Examples**: Review code examples for your use case
3. **GitHub Issues**: Search existing issues or create new one
4. **Discord**: Ask in `#api-support` channel
5. **Email**: api@tradingsystem.com (enterprise support)

### Reporting Bugs

When reporting issues, include:
- ✅ Request URL and method
- ✅ Request headers and body
- ✅ Response status and body
- ✅ Expected vs actual behavior
- ✅ Client SDK version (if applicable)

**Template**:
```markdown
## Bug Report

**Endpoint**: GET /rag/search
**Request**:
```bash
curl -X GET "..." -H "Authorization: Bearer ..."
```

**Expected**: 200 OK with results
**Actual**: 500 Internal Server Error

**Error Response**:
```json
{ "error": { "code": "...", "message": "..." } }
```

**Environment**: Development
**SDK**: @tradingsystem/rag-sdk v1.0.0
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🎉 Changelog

### v1.0.0 (2025-11-02)

**Initial Release**:
- ✅ Collections management (6 endpoints)
- ✅ Semantic search + Q&A (2 endpoints)
- ✅ Ingestion jobs (2 endpoints)
- ✅ Analytics (1 endpoint)
- ✅ Models catalog (1 endpoint)
- ✅ Health check (1 endpoint)
- ✅ TypeScript SDK
- ✅ Python SDK
- ✅ OpenAPI 3.0 spec
- ✅ Postman collection

---

**Questions?** Contact us at api@tradingsystem.com or open an issue on GitHub.

