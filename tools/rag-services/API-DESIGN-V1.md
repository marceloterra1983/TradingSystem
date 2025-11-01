# RAG Services - RESTful API Design v1.0

**Status:** Production-Ready Design
**Version:** 1.0.0
**Base URL:** `http://localhost:3402/api/v1`
**Date:** 2025-11-01

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Architecture Principles](#architecture-principles)
3. [Resource Model](#resource-model)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [Request/Response Format](#requestresponse-format)
7. [Error Handling](#error-handling)
8. [Versioning Strategy](#versioning-strategy)
9. [Rate Limiting](#rate-limiting)
10. [Caching Strategy](#caching-strategy)
11. [Security](#security)
12. [Performance](#performance)
13. [OpenAPI Specification](#openapi-specification)

---

## API Overview

### Purpose
RESTful API for managing RAG (Retrieval-Augmented Generation) collections, embeddings, and document ingestion for the Trading System project.

### Key Features
- ✅ Collection CRUD operations
- ✅ Document ingestion (file/directory)
- ✅ Embedding model management
- ✅ Real-time file watching
- ✅ Semantic search
- ✅ Administrative operations
- ✅ Health monitoring
- ✅ JWT authentication
- ✅ Role-based access control

### Technology Stack
- **Framework:** Express.js (Node.js/TypeScript)
- **Validation:** Zod schemas
- **Authentication:** JWT (jsonwebtoken)
- **Documentation:** Swagger/OpenAPI 3.0
- **Vector Database:** Qdrant
- **Embedding Engine:** LlamaIndex + Ollama

---

## Architecture Principles

### RESTful Design
1. **Resource-Based:** Collections, Models, Documents
2. **HTTP Methods:** GET, POST, PUT, DELETE, PATCH
3. **Stateless:** Each request contains all necessary information
4. **HATEOAS:** Hypermedia links in responses (where applicable)

### API Layering
```
┌─────────────────────────────────────┐
│   Client (Dashboard, CLI, SDK)     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   API Gateway (Future - Kong/Traefik) │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   RAG Services API (Express.js)     │
│   ├── Routes                        │
│   ├── Middleware (Auth, Validation) │
│   ├── Controllers                   │
│   └── Services (Business Logic)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   External Services                 │
│   ├── Qdrant (Vector DB)           │
│   ├── LlamaIndex (Ingestion)       │
│   ├── Ollama (Embeddings)          │
│   └── Redis (Cache)                │
└─────────────────────────────────────┘
```

### Design Patterns
- **Service Layer Pattern:** Business logic separated from routes
- **Repository Pattern:** Data access abstraction
- **Factory Pattern:** Service instantiation
- **Observer Pattern:** File watcher events
- **Circuit Breaker:** External service resilience (planned)

---

## Resource Model

### Core Resources

#### 1. Collection
Primary resource representing a RAG collection.

```typescript
interface Collection {
  name: string;                          // Unique identifier (lowercase, alphanumeric, -, _)
  description: string;                   // Human-readable description
  directory: string;                     // Source directory path (absolute)
  embeddingModel: 'nomic-embed-text' | 'mxbai-embed-large';
  chunkSize: number;                     // 128-2048 (default: 512)
  chunkOverlap: number;                  // 0-512 (default: 50)
  fileTypes: string[];                   // e.g., ['md', 'mdx', 'txt']
  recursive: boolean;                    // Recurse subdirectories
  enabled: boolean;                      // Collection active state
  autoUpdate: boolean;                   // File watcher enabled
  createdAt: string;                     // ISO 8601 timestamp (read-only)
  updatedAt: string;                     // ISO 8601 timestamp (read-only)
  stats?: CollectionStats;               // Embedded stats (optional)
}
```

#### 2. CollectionStats
Statistics for a collection.

```typescript
interface CollectionStats {
  vectorsCount: number;                  // Total embeddings in Qdrant
  pointsCount: number;                   // Total points in vector DB
  segmentsCount: number;                 // Qdrant segments
  status: 'ready' | 'indexing' | 'error' | 'missing';
  totalFiles: number;                    // Files tracked
  indexedFiles: number;                  // Files ingested
  pendingFiles: number;                  // Files awaiting ingestion
  orphanChunks: number;                  // Chunks without source files
  chunkCount: number;                    // Total chunks
  lastUpdate: string;                    // ISO 8601 timestamp
}
```

#### 3. EmbeddingModel
Available embedding models.

```typescript
interface EmbeddingModel {
  name: string;                          // Model identifier
  dimensions: number;                    // Vector dimensions
  description: string;                   // Model description
  isDefault: boolean;                    // Default model flag
  available: boolean;                    // Model availability
  capabilities: string[];                // e.g., ['semantic-search', 'clustering']
  performance: 'fast' | 'balanced' | 'quality';
  useCase: string;                       // Recommended use case
}
```

#### 4. IngestionJob
Document ingestion operation.

```typescript
interface IngestionJob {
  jobId: string;                         // UUID
  collectionName: string;                // Target collection
  type: 'file' | 'directory';            // Ingestion type
  source: string;                        // File/directory path
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;                      // 0-100
  filesProcessed: number;                // Files ingested
  filesTotal: number;                    // Total files
  chunksCreated: number;                 // Chunks generated
  errors: string[];                      // Error messages
  startedAt: string;                     // ISO 8601 timestamp
  completedAt?: string;                  // ISO 8601 timestamp
}
```

#### 5. SearchResult
Semantic search result.

```typescript
interface SearchResult {
  id: string;                            // Document ID
  score: number;                         // Relevance score (0-1)
  content: string;                       // Document excerpt
  metadata: {
    source: string;                      // Source file path
    collection: string;                  // Collection name
    chunkIndex: number;                  // Chunk index in document
    [key: string]: any;                  // Additional metadata
  };
}
```

### Resource Relationships

```
Collection (1) ──── (N) Documents
           │
           ├──── (1) EmbeddingModel
           │
           └──── (1) CollectionStats

IngestionJob (N) ──── (1) Collection

SearchQuery ──── (N) SearchResults
         │
         └──── (1) Collection
```

---

## API Endpoints

### Base Structure
```
/api/v1/
├── rag/
│   ├── collections/               # Collection management
│   ├── models/                    # Embedding models
│   ├── directories/               # Directory browsing
│   └── search/                    # Semantic search (future)
├── admin/                         # Administrative operations
│   └── cache/                     # Cache management
└── /health                        # Health check (root level)
```

---

### 1. Collections API

#### List All Collections
```http
GET /api/v1/rag/collections
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include` | string | `basic` | `basic`, `stats`, `all` |
| `enabled` | boolean | - | Filter by enabled status |
| `model` | string | - | Filter by embedding model |
| `sort` | string | `name` | Sort field (`name`, `createdAt`, `updatedAt`) |
| `order` | string | `asc` | Sort order (`asc`, `desc`) |
| `page` | number | `1` | Page number (pagination) |
| `limit` | number | `20` | Items per page (max: 100) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "name": "documentation",
        "description": "Project documentation",
        "directory": "/data/docs",
        "embeddingModel": "nomic-embed-text",
        "chunkSize": 512,
        "chunkOverlap": 50,
        "fileTypes": ["md", "mdx"],
        "recursive": true,
        "enabled": true,
        "autoUpdate": true,
        "createdAt": "2025-11-01T00:00:00Z",
        "updatedAt": "2025-11-01T12:00:00Z",
        "stats": {
          "vectorsCount": 4116,
          "pointsCount": 4116,
          "status": "ready",
          "totalFiles": 135,
          "indexedFiles": 135,
          "pendingFiles": 0,
          "chunkCount": 4116
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "abc-123",
    "version": "v1"
  }
}
```

---

#### Get Collection by Name
```http
GET /api/v1/rag/collections/:name
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✅ | Collection name |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `useCache` | boolean | `false` | Use cached stats |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "collection": {
      "name": "documentation",
      "description": "Project documentation",
      "directory": "/data/docs",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "fileTypes": ["md", "mdx"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true,
      "createdAt": "2025-11-01T00:00:00Z",
      "updatedAt": "2025-11-01T12:00:00Z",
      "stats": {
        "vectorsCount": 4116,
        "pointsCount": 4116,
        "segmentsCount": 1,
        "status": "ready",
        "totalFiles": 135,
        "indexedFiles": 135,
        "pendingFiles": 0,
        "orphanChunks": 0,
        "chunkCount": 4116,
        "lastUpdate": "2025-11-01T12:00:00Z"
      }
    }
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "abc-123",
    "version": "v1"
  }
}
```

**Errors:**
- `404 Not Found` - Collection not found
- `500 Internal Server Error` - Server error

---

#### Create Collection
```http
POST /api/v1/rag/collections
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "api-docs",
  "description": "API documentation collection",
  "directory": "/data/docs/api",
  "embeddingModel": "mxbai-embed-large",
  "chunkSize": 512,
  "chunkOverlap": 50,
  "fileTypes": ["md", "mdx", "txt"],
  "recursive": true,
  "enabled": true,
  "autoUpdate": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "collection": {
      "name": "api-docs",
      "description": "API documentation collection",
      "directory": "/data/docs/api",
      "embeddingModel": "mxbai-embed-large",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "fileTypes": ["md", "mdx", "txt"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true,
      "createdAt": "2025-11-01T12:30:00Z",
      "updatedAt": "2025-11-01T12:30:00Z"
    },
    "message": "Collection created successfully. Initial ingestion started."
  },
  "meta": {
    "timestamp": "2025-11-01T12:30:00Z",
    "requestId": "xyz-456",
    "version": "v1"
  }
}
```

**Validation Rules:**
- `name`: 1-50 chars, lowercase, alphanumeric + `-_`
- `description`: 1-200 chars
- `directory`: Absolute path, no `..`, must exist
- `embeddingModel`: `nomic-embed-text` | `mxbai-embed-large`
- `chunkSize`: 128-2048
- `chunkOverlap`: 0-512
- `fileTypes`: Array, 1-10 items, alphanumeric

**Errors:**
- `400 Bad Request` - Validation error
- `409 Conflict` - Collection already exists
- `500 Internal Server Error` - Server error

---

#### Update Collection
```http
PUT /api/v1/rag/collections/:name
Content-Type: application/json
```

**Request Body (partial):**
```json
{
  "description": "Updated description",
  "enabled": false,
  "autoUpdate": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "collection": {
      "name": "api-docs",
      "description": "Updated description",
      "enabled": false,
      "autoUpdate": false,
      "updatedAt": "2025-11-01T13:00:00Z"
    },
    "message": "Collection updated successfully"
  },
  "meta": {
    "timestamp": "2025-11-01T13:00:00Z",
    "requestId": "def-789",
    "version": "v1"
  }
}
```

**Errors:**
- `400 Bad Request` - Validation error
- `404 Not Found` - Collection not found
- `500 Internal Server Error` - Server error

---

#### Delete Collection
```http
DELETE /api/v1/rag/collections/:name
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deleteVectors` | boolean | `false` | Also delete vectors from Qdrant |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Collection 'api-docs' deleted successfully",
    "vectorsDeleted": true
  },
  "meta": {
    "timestamp": "2025-11-01T14:00:00Z",
    "requestId": "ghi-012",
    "version": "v1"
  }
}
```

**Errors:**
- `404 Not Found` - Collection not found
- `500 Internal Server Error` - Server error

---

#### Trigger Collection Ingestion
```http
POST /api/v1/rag/collections/:name/ingest
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "directory",
  "force": false
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "message": "Ingestion job queued for collection 'api-docs'"
  },
  "meta": {
    "timestamp": "2025-11-01T14:30:00Z",
    "requestId": "jkl-345",
    "version": "v1"
  }
}
```

---

#### Get Collection Stats
```http
GET /api/v1/rag/collections/:name/stats
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `useCache` | boolean | `true` | Use cached stats (10min TTL) |
| `detailed` | boolean | `false` | Include file-level details |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stats": {
      "vectorsCount": 4116,
      "pointsCount": 4116,
      "segmentsCount": 1,
      "status": "ready",
      "totalFiles": 135,
      "indexedFiles": 135,
      "pendingFiles": 0,
      "orphanChunks": 0,
      "chunkCount": 4116,
      "lastUpdate": "2025-11-01T12:00:00Z",
      "cacheHit": true
    }
  },
  "meta": {
    "timestamp": "2025-11-01T15:00:00Z",
    "requestId": "mno-678",
    "version": "v1"
  }
}
```

---

### 2. Models API

#### List Available Models
```http
GET /api/v1/rag/models
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `available` | boolean | - | Filter by availability |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "nomic-embed-text",
        "dimensions": 384,
        "description": "Fast and efficient embedding model",
        "isDefault": true,
        "available": true,
        "capabilities": ["semantic-search", "classification", "clustering"],
        "performance": "fast",
        "useCase": "General purpose documentation"
      },
      {
        "name": "mxbai-embed-large",
        "dimensions": 1024,
        "description": "High-quality embeddings",
        "isDefault": false,
        "available": true,
        "capabilities": ["semantic-search", "high-precision"],
        "performance": "quality",
        "useCase": "Complex technical documentation"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-01T15:30:00Z",
    "requestId": "pqr-901",
    "version": "v1"
  }
}
```

---

#### Get Model Details
```http
GET /api/v1/rag/models/:name
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "model": {
      "name": "nomic-embed-text",
      "dimensions": 384,
      "description": "Fast and efficient embedding model",
      "isDefault": true,
      "available": true,
      "capabilities": ["semantic-search", "classification", "clustering"],
      "performance": "fast",
      "useCase": "General purpose documentation",
      "stats": {
        "collectionsUsing": 2,
        "totalDocuments": 5432
      }
    }
  },
  "meta": {
    "timestamp": "2025-11-01T16:00:00Z",
    "requestId": "stu-234",
    "version": "v1"
  }
}
```

---

### 3. Directories API

#### List Directory Contents
```http
GET /api/v1/rag/directories
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | `/data/docs` | Directory path |
| `recursive` | boolean | `false` | Include subdirectories |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "path": "/data/docs",
    "entries": [
      {
        "name": "api",
        "path": "/data/docs/api",
        "isDirectory": true,
        "size": 4096,
        "modified": "2025-11-01T10:00:00Z"
      },
      {
        "name": "README.md",
        "path": "/data/docs/README.md",
        "isDirectory": false,
        "size": 1234,
        "modified": "2025-11-01T09:00:00Z"
      }
    ],
    "totalEntries": 2
  },
  "meta": {
    "timestamp": "2025-11-01T16:30:00Z",
    "requestId": "vwx-567",
    "version": "v1"
  }
}
```

**Security:**
- Only allowed base paths: `/data/docs`, `/data/tradingsystem`, project root
- Directory traversal (`..`) blocked
- Symlinks validated

---

### 4. Admin API (Protected)

**Authentication:** All admin endpoints require JWT authentication.

```http
Authorization: Bearer <token>
```

#### Get Cache Statistics
```http
GET /api/v1/admin/cache/stats
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "cache": {
      "type": "memory",
      "enabled": true,
      "connected": false,
      "memoryKeys": 42,
      "ttl": 600
    },
    "timestamp": "2025-11-01T17:00:00Z"
  },
  "meta": {
    "timestamp": "2025-11-01T17:00:00Z",
    "requestId": "yza-890",
    "version": "v1"
  }
}
```

---

#### Invalidate Cache Key
```http
DELETE /api/v1/admin/cache/:key
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Cache key invalidated successfully",
    "key": "collections:stats:documentation"
  },
  "meta": {
    "timestamp": "2025-11-01T17:30:00Z",
    "requestId": "bcd-123",
    "version": "v1"
  }
}
```

---

#### Clear Cache Pattern
```http
DELETE /api/v1/admin/cache
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pattern` | string | `*` | Cache key pattern (glob) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Cache cleared successfully",
    "pattern": "collections:*",
    "keysCleared": 15
  },
  "meta": {
    "timestamp": "2025-11-01T18:00:00Z",
    "requestId": "efg-456",
    "version": "v1"
  }
}
```

---

### 5. Health & Monitoring

#### Health Check
```http
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T18:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "cache": {
      "status": "disconnected",
      "enabled": true,
      "memoryKeys": 42,
      "ttl": 600
    },
    "ingestion": {
      "status": "healthy",
      "url": "http://rag-llamaindex-ingest:8201"
    },
    "fileWatcher": {
      "status": "active",
      "enabled": true,
      "watchedDirectories": 2,
      "eventsProcessed": 1234
    },
    "collections": {
      "total": 3,
      "enabled": 3,
      "autoUpdate": 2
    }
  }
}
```

**Errors:**
- `503 Service Unavailable` - Unhealthy state

---

## Authentication & Authorization

### JWT Authentication

#### Token Generation
```typescript
POST /api/v1/auth/login (future endpoint)
Content-Type: application/json

{
  "username": "admin",
  "password": "secure-password"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "userId": "user-123",
      "role": "admin"
    }
  }
}
```

#### Token Payload
```json
{
  "userId": "user-123",
  "role": "admin",
  "iat": 1699000000,
  "exp": 1699086400,
  "iss": "rag-services"
}
```

#### Token Usage
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access Control (RBAC)

| Endpoint | Public | User | Admin |
|----------|--------|------|-------|
| `GET /health` | ✅ | ✅ | ✅ |
| `GET /api/v1/rag/collections` | ✅ | ✅ | ✅ |
| `GET /api/v1/rag/collections/:name` | ✅ | ✅ | ✅ |
| `POST /api/v1/rag/collections` | ❌ | ✅ | ✅ |
| `PUT /api/v1/rag/collections/:name` | ❌ | ✅ | ✅ |
| `DELETE /api/v1/rag/collections/:name` | ❌ | ❌ | ✅ |
| `POST /api/v1/rag/collections/:name/ingest` | ❌ | ✅ | ✅ |
| `GET /api/v1/rag/models` | ✅ | ✅ | ✅ |
| `GET /api/v1/rag/directories` | ❌ | ✅ | ✅ |
| `GET /api/v1/admin/*` | ❌ | ❌ | ✅ |
| `DELETE /api/v1/admin/*` | ❌ | ❌ | ✅ |

### Security Best Practices
- ✅ JWT secrets minimum 32 characters
- ✅ Token expiration: 24 hours
- ✅ HTTPS required in production
- ✅ Rate limiting per user/IP
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (N/A - no SQL)
- ✅ Directory traversal prevention
- ✅ CORS policy enforcement

---

## Request/Response Format

### Standard Response Wrapper

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Resource data
  },
  "message": "Optional success message",
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "abc-123",
    "version": "v1"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": "name",
        "message": "String must contain at least 1 character(s)",
        "code": "too_small"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "abc-123",
    "version": "v1"
  }
}
```

### Content Types
- Request: `application/json`
- Response: `application/json`
- Charset: `UTF-8`

### Headers

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
X-Request-ID: <optional-uuid>
```

**Response Headers:**
```http
Content-Type: application/json; charset=utf-8
X-Request-ID: <uuid>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699087200
Cache-Control: public, max-age=600
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST |
| `202` | Accepted | Async operation queued |
| `204` | No Content | Successful DELETE (no body) |
| `400` | Bad Request | Validation error, malformed request |
| `401` | Unauthorized | Missing/invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable Entity | Semantic validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `502` | Bad Gateway | External service error |
| `503` | Service Unavailable | Service down/maintenance |
| `504` | Gateway Timeout | External service timeout |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `COLLECTION_NOT_FOUND` | 404 | Collection doesn't exist |
| `COLLECTION_ALREADY_EXISTS` | 409 | Collection name conflict |
| `MODEL_NOT_FOUND` | 404 | Model doesn't exist |
| `DIRECTORY_NOT_FOUND` | 404 | Directory doesn't exist |
| `INGESTION_ERROR` | 500 | Ingestion failed |
| `QDRANT_ERROR` | 502 | Qdrant service error |
| `CACHE_ERROR` | 500 | Cache operation failed |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Error Response Examples

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": "chunkSize",
        "message": "Number must be greater than or equal to 128",
        "code": "too_small"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "abc-123",
    "version": "v1"
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "COLLECTION_NOT_FOUND",
    "message": "Collection 'nonexistent' not found"
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "def-456",
    "version": "v1"
  }
}
```

**Rate Limit (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 60
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00Z",
    "requestId": "ghi-789",
    "version": "v1"
  }
}
```

---

## Versioning Strategy

### URL-Based Versioning
**Current Approach:** Version in URL path

```
/api/v1/rag/collections
/api/v2/rag/collections (future)
```

**Advantages:**
- ✅ Clear and explicit
- ✅ Easy to route
- ✅ Simple for clients
- ✅ Cacheable per version

**Version Lifecycle:**
- v1: Current stable version
- v2: Future version (breaking changes)
- Deprecated versions: Supported for 6 months after new version release

### Migration Strategy

**Deprecation Header:**
```http
Deprecation: true
Sunset: Sun, 01 Nov 2026 12:00:00 GMT
Link: </api/v2/rag/collections>; rel="successor-version"
```

**Breaking vs Non-Breaking Changes:**

**Non-Breaking (same version):**
- Adding optional fields
- Adding new endpoints
- Adding optional query parameters
- Expanding enums (with backwards compatibility)

**Breaking (new version):**
- Removing fields
- Changing field types
- Removing endpoints
- Changing authentication
- Changing response structure

---

## Rate Limiting

### Strategy
**Token Bucket Algorithm** with `express-rate-limit`

### Limits

| Endpoint Category | Limit | Window | Status Code |
|------------------|-------|--------|-------------|
| Public endpoints | 100 req | 15 min | 429 |
| Authenticated | 500 req | 15 min | 429 |
| Admin endpoints | 100 req | 15 min | 429 |
| Ingestion | 10 req | 1 hour | 429 |
| Search (future) | 50 req | 1 min | 429 |

### Headers

**Rate Limit Info:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699087200
```

**After Limit Exceeded:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

### Implementation
```typescript
import rateLimit from 'express-rate-limit';

const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

app.use('/api/v1', publicRateLimit);
```

---

## Caching Strategy

### Cache Levels

#### 1. Application Cache (Redis/Memory)
- **TTL:** 10 minutes default
- **Keys:** Collection stats, model availability
- **Invalidation:** Manual (admin endpoint) or TTL

#### 2. HTTP Cache Headers
```http
Cache-Control: public, max-age=600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 01 Nov 2025 12:00:00 GMT
```

#### 3. Client-Side Cache
- Encouraged via `Cache-Control` headers
- ETags for conditional requests

### Cache Keys Pattern
```
collections:list
collections:stats:<name>
collections:details:<name>
models:list
models:details:<name>
```

### Cache Invalidation Events
- Collection created/updated/deleted → Clear `collections:*`
- Model availability change → Clear `models:*`
- Manual admin clear → Clear by pattern

---

## Security

### Input Validation
- ✅ Zod schema validation on all inputs
- ✅ Path traversal prevention (`..` blocked)
- ✅ Filename sanitization
- ✅ Regex validation for names
- ✅ Max file size limits (10MB)

### Authentication Security
- ✅ JWT with strong secrets (32+ chars)
- ✅ Token expiration (24h)
- ✅ HTTPS only in production
- ✅ No sensitive data in logs

### CORS Policy
```typescript
{
  origin: process.env.FRONTEND_URL || 'http://localhost:3103',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Performance

### Optimization Techniques

#### 1. Connection Pooling
- HTTP client keep-alive
- Reusable axios instances
- Connection limits

#### 2. Async Operations
- Non-blocking I/O
- Promise.all for parallel requests
- Background ingestion jobs

#### 3. Pagination
- Default: 20 items per page
- Maximum: 100 items per page
- Cursor-based pagination (future)

#### 4. Field Selection
- `?include=basic|stats|all`
- Reduce payload size
- On-demand data loading

#### 5. Compression
```typescript
import compression from 'compression';
app.use(compression());
```

### Performance Targets
- **Latency:**
  - GET endpoints: < 100ms (p95)
  - POST/PUT: < 500ms (p95)
  - Ingestion: < 5s per document

- **Throughput:**
  - 100 req/s sustained
  - 500 req/s burst

---

## OpenAPI Specification

(Continued in separate file: `openapi.yaml`)

---

## Implementation Plan

### Phase 1: Core API ✅
- [x] Collections CRUD
- [x] Models listing
- [x] Directory browsing
- [x] Admin cache operations
- [x] Health check
- [x] JWT authentication
- [x] Request validation

### Phase 2: Enhancements 🚧
- [ ] Search API
- [ ] Ingestion job tracking
- [ ] Pagination
- [ ] Rate limiting
- [ ] OpenAPI spec generation
- [ ] Client SDKs (TypeScript, Python)

### Phase 3: Advanced Features 📋
- [ ] Webhooks
- [ ] Batch operations
- [ ] Real-time updates (WebSocket)
- [ ] API gateway integration
- [ ] Multi-tenancy
- [ ] GraphQL endpoint

---

## Client SDK Examples

### TypeScript/JavaScript
```typescript
import { RAGClient } from '@trading-system/rag-client';

const client = new RAGClient({
  baseURL: 'http://localhost:3402',
  apiKey: 'your-jwt-token',
});

// List collections
const collections = await client.collections.list();

// Create collection
const newCollection = await client.collections.create({
  name: 'docs',
  description: 'Documentation',
  directory: '/data/docs',
  embeddingModel: 'nomic-embed-text',
});

// Get stats
const stats = await client.collections.getStats('docs');
```

### Python
```python
from rag_client import RAGClient

client = RAGClient(
    base_url='http://localhost:3402',
    api_key='your-jwt-token'
)

# List collections
collections = client.collections.list()

# Create collection
new_collection = client.collections.create(
    name='docs',
    description='Documentation',
    directory='/data/docs',
    embedding_model='nomic-embed-text'
)
```

### cURL
```bash
# List collections
curl http://localhost:3402/api/v1/rag/collections

# Create collection
curl -X POST http://localhost:3402/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "docs",
    "description": "Documentation",
    "directory": "/data/docs",
    "embeddingModel": "nomic-embed-text"
  }'

# Get stats (with auth)
curl http://localhost:3402/api/v1/rag/collections/docs/stats \
  -H "Authorization: Bearer <token>"
```

---

## Monitoring & Observability

### Metrics (Prometheus)
```
# HTTP metrics
http_request_duration_seconds
http_requests_total
http_request_size_bytes
http_response_size_bytes

# Business metrics
collections_total
collections_enabled_total
ingestion_jobs_total
ingestion_duration_seconds
cache_hits_total
cache_misses_total
```

### Logging
```json
{
  "level": "info",
  "message": "Request completed",
  "requestId": "abc-123",
  "method": "GET",
  "path": "/api/v1/rag/collections",
  "statusCode": 200,
  "duration": "45ms",
  "timestamp": "2025-11-01T12:00:00Z"
}
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-01
**Next Review:** 2025-12-01
