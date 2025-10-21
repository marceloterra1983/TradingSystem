# LlamaIndex API Endpoints Specification

## Query Endpoints

### Natural Language Query
```
POST /api/v1/query
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "query": "string",
  "max_results": number,
  "filters": {
    "document_type": string[],
    "date_range": {
      "start": string,
      "end": string
    }
  }
}

Response:
{
  "answer": "string",
  "confidence": number,
  "sources": [
    {
      "document": "string",
      "excerpt": "string",
      "relevance": number
    }
  ],
  "metadata": {
    "processing_time": number,
    "tokens_used": number
  }
}
```

### Semantic Search
```
POST /api/v1/search
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "query": "string",
  "page": number,
  "page_size": number,
  "filters": {
    "document_type": string[],
    "tags": string[]
  }
}

Response:
{
  "results": [
    {
      "title": "string",
      "content": "string",
      "relevance": number,
      "metadata": {
        "path": "string",
        "last_updated": "string"
      }
    }
  ],
  "total": number,
  "page": number,
  "page_size": number
}
```

## Document Management

### Index Status
```
GET /api/v1/index/status
Authorization: Bearer <token>

Response:
{
  "total_documents": number,
  "total_chunks": number,
  "last_updated": "string",
  "storage_usage": {
    "embeddings_size": number,
    "metadata_size": number
  }
}
```

### Reindex Document
```
POST /api/v1/index/document
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "path": "string",
  "force": boolean
}

Response:
{
  "status": "success" | "error",
  "job_id": "string",
  "message": "string"
}
```

## Feedback Management

### Submit Feedback
```
POST /api/v1/feedback
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "query_id": "string",
  "relevance_score": number,
  "feedback_text": "string",
  "source_ratings": [
    {
      "source_id": "string",
      "rating": number
    }
  ]
}

Response:
{
  "status": "success" | "error",
  "message": "string"
}
```

## Health & Monitoring

### System Health
```
GET /api/v1/health
Authorization: Bearer <token>

Response:
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "vector_db": "up" | "down",
    "query_engine": "up" | "down",
    "document_processor": "up" | "down"
  },
  "metrics": {
    "query_latency_p95": number,
    "index_latency_p95": number,
    "error_rate": number
  }
}
```

## Rate Limits

- Query endpoints: 100 requests per minute per user
- Index operations: 10 requests per minute per user
- Bulk operations: 1 request per minute per user

## Error Responses

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": object
  }
}
```

Common error codes:
- `invalid_request`: Malformed request
- `unauthorized`: Invalid or missing authentication
- `rate_limited`: Rate limit exceeded
- `not_found`: Resource not found
- `internal_error`: Server error