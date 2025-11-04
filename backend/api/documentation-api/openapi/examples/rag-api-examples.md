# RAG Services API - Code Examples

Complete code examples for integrating with the RAG Services API in multiple languages.

---

## Table of Contents

- [Authentication](#authentication)
- [Collections Management](#collections-management)
- [Semantic Search](#semantic-search)
- [Question Answering](#question-answering)
- [Document Ingestion](#document-ingestion)
- [Analytics](#analytics)

---

## Authentication

All API requests require JWT authentication via the `Authorization: Bearer <token>` header.

### Obtain JWT Token

```bash
# cURL
curl -X POST http://localhost:3402/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-11-03T10:00:00Z"
  }
}
```

---

## Collections Management

### 1. List All Collections

#### cURL
```bash
curl -X GET "http://localhost:3402/api/v1/rag/collections?enabled=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript
```typescript
// Using fetch
const getCollections = async () => {
  const response = await fetch('http://localhost:3402/api/v1/rag/collections?enabled=true', {
    headers: {
      'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data.collections;
};

// Usage
const collections = await getCollections();
console.log(`Found ${collections.length} collections`);
```

#### Python
```python
import requests

def get_collections(token, enabled=True):
    """Get list of collections"""
    url = 'http://localhost:3402/api/v1/rag/collections'
    headers = {'Authorization': f'Bearer {token}'}
    params = {'enabled': enabled}
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    
    return response.json()['data']['collections']

# Usage
collections = get_collections(YOUR_JWT_TOKEN)
print(f"Found {len(collections)} collections")
```

#### TypeScript (with axios)
```typescript
import axios from 'axios';

interface Collection {
  id: string;
  name: string;
  display_name: string;
  status: 'pending' | 'indexing' | 'ready' | 'error';
  total_documents: number;
  indexed_documents: number;
}

const ragAPI = axios.create({
  baseURL: 'http://localhost:3402/api/v1',
  headers: {
    'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
  },
});

async function getCollections(enabled = true): Promise<Collection[]> {
  const response = await ragAPI.get('/rag/collections', {
    params: { enabled },
  });
  return response.data.data.collections;
}

// Usage
const collections = await getCollections();
console.log(collections.map(c => c.name));
```

---

### 2. Create New Collection

#### cURL
```bash
curl -X POST http://localhost:3402/api/v1/rag/collections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api_docs__nomic",
    "display_name": "API Documentation",
    "description": "API reference documentation",
    "directory": "/data/docs/content/api",
    "embedding_model": "nomic-embed-text",
    "chunk_size": 512,
    "chunk_overlap": 50,
    "file_types": ["md", "mdx"],
    "recursive": true,
    "enabled": true,
    "auto_update": true
  }'
```

#### JavaScript/TypeScript
```typescript
const createCollection = async (config: {
  name: string;
  directory: string;
  embedding_model: string;
  display_name?: string;
  description?: string;
}) => {
  const response = await fetch('http://localhost:3402/api/v1/rag/collections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chunk_size: 512,
      chunk_overlap: 50,
      file_types: ['md', 'mdx'],
      recursive: true,
      enabled: true,
      auto_update: true,
      ...config,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  return data.data;
};

// Usage
const collection = await createCollection({
  name: 'api_docs__nomic',
  display_name: 'API Documentation',
  directory: '/data/docs/content/api',
  embedding_model: 'nomic-embed-text',
});

console.log(`Collection created: ${collection.id}`);
```

#### Python
```python
def create_collection(token, config):
    """Create a new collection"""
    url = 'http://localhost:3402/api/v1/rag/collections'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'chunk_size': 512,
        'chunk_overlap': 50,
        'file_types': ['md', 'mdx'],
        'recursive': True,
        'enabled': True,
        'auto_update': True,
        **config,
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()['data']

# Usage
collection = create_collection(YOUR_JWT_TOKEN, {
    'name': 'api_docs__nomic',
    'display_name': 'API Documentation',
    'directory': '/data/docs/content/api',
    'embedding_model': 'nomic-embed-text',
})

print(f"Collection created: {collection['id']}")
```

---

### 3. Get Collection Statistics

#### cURL
```bash
curl -X GET "http://localhost:3402/api/v1/rag/collections/documentation__nomic/stats?use_cache=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript
```typescript
const getCollectionStats = async (collectionId: string, useCache = true) => {
  const response = await fetch(
    `http://localhost:3402/api/v1/rag/collections/${collectionId}/stats?use_cache=${useCache}`,
    {
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data.stats;
};

// Usage
const stats = await getCollectionStats('documentation__nomic');
console.log(`Documents: ${stats.metrics.total_documents}`);
console.log(`Chunks: ${stats.metrics.total_chunks}`);
console.log(`Cache hit rate: ${(stats.performance.cache_hit_rate * 100).toFixed(1)}%`);
```

---

## Semantic Search

### 1. Basic Search

#### cURL
```bash
curl -X GET "http://localhost:3402/api/v1/rag/search?query=How%20to%20configure%20RAG%20system&max_results=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript
```typescript
interface SearchResult {
  content: string;
  relevance: number;
  metadata: {
    source: string;
    title: string;
    chunk_index: number;
    collection: string;
  };
}

const search = async (
  query: string,
  options?: {
    collection?: string;
    max_results?: number;
    score_threshold?: number;
  }
): Promise<SearchResult[]> => {
  const params = new URLSearchParams({
    query,
    max_results: String(options?.max_results || 5),
  });
  
  if (options?.collection) {
    params.set('collection', options.collection);
  }
  
  if (options?.score_threshold) {
    params.set('score_threshold', String(options.score_threshold));
  }
  
  const response = await fetch(
    `http://localhost:3402/api/v1/rag/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data.results;
};

// Usage
const results = await search('How to configure RAG system', {
  collection: 'documentation__nomic',
  max_results: 5,
  score_threshold: 0.7,
});

results.forEach((result, index) => {
  console.log(`\n[${index + 1}] Relevance: ${result.relevance.toFixed(2)}`);
  console.log(`Source: ${result.metadata.source}`);
  console.log(`Content: ${result.content.substring(0, 100)}...`);
});
```

#### Python
```python
def search(token, query, collection=None, max_results=5, score_threshold=0.7):
    """Perform semantic search"""
    url = 'http://localhost:3402/api/v1/rag/search'
    headers = {'Authorization': f'Bearer {token}'}
    params = {
        'query': query,
        'max_results': max_results,
        'score_threshold': score_threshold,
    }
    
    if collection:
        params['collection'] = collection
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    
    return response.json()['data']['results']

# Usage
results = search(
    YOUR_JWT_TOKEN,
    'How to configure RAG system',
    collection='documentation__nomic',
    max_results=5
)

for i, result in enumerate(results, 1):
    print(f"\n[{i}] Relevance: {result['relevance']:.2f}")
    print(f"Source: {result['metadata']['source']}")
    print(f"Content: {result['content'][:100]}...")
```

---

## Question Answering

### 1. Ask a Question (with LLM)

#### cURL
```bash
curl -X POST http://localhost:3402/api/v1/rag/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does the RAG system work?",
    "collection": "documentation__nomic",
    "max_results": 5
  }'
```

#### JavaScript/TypeScript
```typescript
interface QueryResponse {
  answer: string;
  confidence: number;
  sources: SearchResult[];
  performance: {
    duration_ms: number;
    llm_generation_time_ms: number;
  };
}

const askQuestion = async (
  query: string,
  collection?: string,
  maxResults = 5
): Promise<QueryResponse> => {
  const response = await fetch('http://localhost:3402/api/v1/rag/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      collection,
      max_results: maxResults,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  return data.data;
};

// Usage
const response = await askQuestion('How does the RAG system work?', 'documentation__nomic');

console.log(`Answer (confidence: ${response.confidence}):\n`);
console.log(response.answer);
console.log(`\nSources: ${response.sources.length}`);
console.log(`Response time: ${response.performance.duration_ms}ms`);
```

#### Python
```python
def ask_question(token, query, collection=None, max_results=5):
    """Ask a question and get AI-generated answer"""
    url = 'http://localhost:3402/api/v1/rag/query'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'query': query,
        'max_results': max_results,
    }
    
    if collection:
        payload['collection'] = collection
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()['data']

# Usage
response = ask_question(
    YOUR_JWT_TOKEN,
    'How does the RAG system work?',
    collection='documentation__nomic'
)

print(f"Answer (confidence: {response['confidence']}):\n")
print(response['answer'])
print(f"\nSources: {len(response['sources'])}")
print(f"Response time: {response['performance']['duration_ms']}ms")
```

---

## Document Ingestion

### 1. Trigger Ingestion Job

#### cURL
```bash
# Full index
curl -X POST http://localhost:3402/api/v1/rag/collections/documentation__nomic/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "full_index",
    "force": false
  }'

# Incremental (specific files)
curl -X POST http://localhost:3402/api/v1/rag/collections/documentation__nomic/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "incremental",
    "file_paths": ["docs/content/api/workspace.mdx"]
  }'
```

#### JavaScript/TypeScript
```typescript
const triggerIngestion = async (
  collectionId: string,
  options?: {
    jobType?: 'full_index' | 'incremental' | 'single_document' | 'reindex';
    force?: boolean;
    filePaths?: string[];
  }
) => {
  const response = await fetch(
    `http://localhost:3402/api/v1/rag/collections/${collectionId}/ingest`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_type: options?.jobType || 'full_index',
        force: options?.force || false,
        file_paths: options?.filePaths,
      }),
    }
  );
  
  const data = await response.json();
  return data.data;
};

// Usage - Full index
const job = await triggerIngestion('documentation__nomic');
console.log(`Job started: ${job.job_id}`);
console.log(`Status: ${job.status}`);

// Usage - Incremental
const incrementalJob = await triggerIngestion('documentation__nomic', {
  jobType: 'incremental',
  filePaths: ['docs/content/api/workspace.mdx'],
});
```

#### Python
```python
def trigger_ingestion(token, collection_id, job_type='full_index', force=False, file_paths=None):
    """Trigger document ingestion job"""
    url = f'http://localhost:3402/api/v1/rag/collections/{collection_id}/ingest'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'job_type': job_type,
        'force': force,
    }
    
    if file_paths:
        payload['file_paths'] = file_paths
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()['data']

# Usage - Full index
job = trigger_ingestion(YOUR_JWT_TOKEN, 'documentation__nomic')
print(f"Job started: {job['job_id']}")
print(f"Status: {job['status']}")
```

---

### 2. Monitor Ingestion Job

#### JavaScript/TypeScript
```typescript
const getJobStatus = async (jobId: string) => {
  const response = await fetch(
    `http://localhost:3402/api/v1/rag/jobs/${jobId}`,
    {
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data;
};

// Poll job status until completion
const waitForJob = async (jobId: string, pollInterval = 2000) => {
  while (true) {
    const status = await getJobStatus(jobId);
    
    console.log(`Status: ${status.status}`);
    
    if (status.progress) {
      const pct = status.progress.percent_complete;
      const processed = status.progress.documents_processed;
      const total = status.progress.documents_total;
      console.log(`Progress: ${pct}% (${processed}/${total} documents)`);
    }
    
    if (['completed', 'failed', 'cancelled'].includes(status.status)) {
      return status;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
};

// Usage
const job = await triggerIngestion('documentation__nomic');
const finalStatus = await waitForJob(job.job_id);

if (finalStatus.status === 'completed') {
  console.log(`\n✅ Ingestion completed!`);
  console.log(`Documents processed: ${finalStatus.documents_processed}`);
  console.log(`Chunks generated: ${finalStatus.chunks_generated}`);
  console.log(`Duration: ${finalStatus.duration_ms}ms`);
} else {
  console.error(`❌ Ingestion failed: ${finalStatus.error_message}`);
}
```

---

## Analytics

### 1. Query Analytics

#### cURL
```bash
curl -X GET "http://localhost:3402/api/v1/rag/analytics/queries?start_time=2025-11-01T00:00:00Z&end_time=2025-11-02T00:00:00Z&granularity=hour" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript
```typescript
const getQueryAnalytics = async (
  startTime: Date,
  endTime: Date,
  options?: {
    collection?: string;
    granularity?: 'hour' | 'day' | 'week';
  }
) => {
  const params = new URLSearchParams({
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    granularity: options?.granularity || 'hour',
  });
  
  if (options?.collection) {
    params.set('collection', options.collection);
  }
  
  const response = await fetch(
    `http://localhost:3402/api/v1/rag/analytics/queries?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data;
};

// Usage - Last 24 hours
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const analytics = await getQueryAnalytics(yesterday, now, {
  granularity: 'hour',
});

console.log(`\nQuery Analytics (last 24 hours):`);
console.log(`Total queries: ${analytics.summary.total_queries}`);
console.log(`Avg duration: ${analytics.summary.avg_duration_ms}ms`);
console.log(`Cache hit rate: ${(analytics.summary.cache_hit_rate * 100).toFixed(1)}%`);
console.log(`\nTop queries:`);
analytics.top_queries.forEach((q, i) => {
  console.log(`  ${i + 1}. "${q.query}" (${q.count} times)`);
});
```

---

## Error Handling

### Best Practices

#### JavaScript/TypeScript
```typescript
class RAGAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'RAGAPIError';
  }
}

const ragFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    
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
  } catch (error) {
    if (error instanceof RAGAPIError) {
      throw error;
    }
    
    // Network error
    throw new RAGAPIError(
      'NETWORK_ERROR',
      'Failed to connect to API',
      0,
      { original: error }
    );
  }
};

// Usage with error handling
try {
  const results = await search('test query');
  console.log(results);
} catch (error) {
  if (error instanceof RAGAPIError) {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        console.error(`Rate limit hit. Retry after ${error.details.retry_after}s`);
        break;
      case 'UNAUTHORIZED':
        console.error('Authentication failed. Please login again.');
        break;
      case 'COLLECTION_NOT_FOUND':
        console.error(`Collection not found: ${error.details.id}`);
        break;
      default:
        console.error(`API error: ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### Python
```python
class RAGAPIError(Exception):
    """RAG API error with structured details"""
    def __init__(self, code, message, status_code, details=None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

def rag_request(method, url, token, **kwargs):
    """Make API request with error handling"""
    headers = {'Authorization': f'Bearer {token}'}
    if 'json' in kwargs:
        headers['Content-Type'] = 'application/json'
    
    kwargs.setdefault('headers', {}).update(headers)
    
    try:
        response = requests.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json()
            error = error_data.get('error', {})
            raise RAGAPIError(
                error.get('code', 'UNKNOWN'),
                error.get('message', 'Unknown error'),
                response.status_code,
                error.get('details')
            )
        
        return response.json()
    except requests.RequestException as e:
        raise RAGAPIError('NETWORK_ERROR', f'Failed to connect: {e}', 0)

# Usage with error handling
try:
    results = search(YOUR_JWT_TOKEN, 'test query')
    print(results)
except RAGAPIError as e:
    if e.code == 'RATE_LIMIT_EXCEEDED':
        print(f"Rate limit hit. Retry after {e.details.get('retry_after')}s")
    elif e.code == 'UNAUTHORIZED':
        print('Authentication failed. Please login again.')
    else:
        print(f"API error ({e.code}): {e.message}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

---

## Complete SDK Examples

### TypeScript SDK (Recommended)

```typescript
// rag-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

export class RAGClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 30000,
    });
    
    // Error interceptor
    this.client.interceptors.response.use(
      response => response,
      this.handleError
    );
  }
  
  private handleError(error: AxiosError) {
    if (error.response) {
      const data: any = error.response.data;
      throw new RAGAPIError(
        data.error?.code || 'UNKNOWN',
        data.error?.message || 'Unknown error',
        error.response.status,
        data.error?.details
      );
    }
    throw error;
  }
  
  // Collections
  async listCollections(params?: { enabled?: boolean }) {
    const response = await this.client.get('/rag/collections', { params });
    return response.data.data.collections;
  }
  
  async createCollection(config: CreateCollectionConfig) {
    const response = await this.client.post('/rag/collections', config);
    return response.data.data;
  }
  
  async getCollectionStats(id: string, useCache = true) {
    const response = await this.client.get(`/rag/collections/${id}/stats`, {
      params: { use_cache: useCache },
    });
    return response.data.data.stats;
  }
  
  // Search
  async search(query: string, options?: SearchOptions) {
    const response = await this.client.get('/rag/search', {
      params: { query, ...options },
    });
    return response.data.data.results;
  }
  
  async query(query: string, options?: QueryOptions) {
    const response = await this.client.post('/rag/query', {
      query,
      ...options,
    });
    return response.data.data;
  }
  
  // Ingestion
  async triggerIngestion(collectionId: string, options?: IngestionOptions) {
    const response = await this.client.post(
      `/rag/collections/${collectionId}/ingest`,
      options
    );
    return response.data.data;
  }
  
  async getJobStatus(jobId: string) {
    const response = await this.client.get(`/rag/jobs/${jobId}`);
    return response.data.data;
  }
  
  // Analytics
  async getQueryAnalytics(startTime: Date, endTime: Date, options?: AnalyticsOptions) {
    const response = await this.client.get('/rag/analytics/queries', {
      params: {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        ...options,
      },
    });
    return response.data.data;
  }
}

// Usage
const client = new RAGClient('http://localhost:3402/api/v1', YOUR_JWT_TOKEN);

const collections = await client.listCollections({ enabled: true });
const results = await client.search('How to configure RAG?');
const answer = await client.query('How does RAG work?');
```

---

**For more examples and complete SDK implementations, see the [GitHub repository](https://github.com/tradingsystem/rag-services-sdk).**

