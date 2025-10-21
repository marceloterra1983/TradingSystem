---
title: LlamaIndex Implementation Plan
sidebar_position: 10
tags: [architecture, ai, rag, llamaindex, implementation]
domain: shared
type: guide
summary: Comprehensive implementation plan for integrating LlamaIndex RAG capabilities into TradingSystem
status: draft
last_review: 2025-10-17
---

# LlamaIndex Implementation Plan

## Executive Summary

### Objectives

This plan outlines the strategic implementation of LlamaIndex as the core Retrieval-Augmented Generation (RAG) framework for the TradingSystem platform. The primary objectives are:

1. **Knowledge Democratization**: Enable natural language querying of trading documentation, market analysis, and system knowledge
2. **Context-Aware AI**: Augment LLM responses with real-time trading data, historical patterns, and system documentation
3. **Operational Efficiency**: Reduce time-to-insight for traders and system operators through intelligent information retrieval
4. **System Intelligence**: Create a foundation for AI-powered trading assistants and decision support systems

### Success Criteria

- **Performance**: Query response time < 2 seconds (P95)
- **Accuracy**: RAG relevance score > 0.85 for technical queries
- **Coverage**: 100% of documentation indexed within 30 days
- **Availability**: 99.9% uptime for query engine
- **Scalability**: Support for 10,000+ documents and 100+ concurrent queries

### Timeline Overview

- **Phase 1 (Weeks 1-2)**: Foundation & Infrastructure
- **Phase 2 (Weeks 3-4)**: Data Ingestion & Indexing
- **Phase 3 (Weeks 5-6)**: Query Engine & Integration
- **Phase 4 (Weeks 7-8)**: Production Deployment & Optimization

---

## 1. Target Architecture

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     TradingSystem Frontend                       │
│                  (React Dashboard - Port 3101)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LlamaIndex Query API                          │
│                    (Express - Port 3600)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Query Engine │  │ Chat Memory  │  │ Context Manager   │    │
│  └──────────────┘  └──────────────┘  └───────────────────┘    │
└────────┬────────────────────┬──────────────────┬────────────────┘
         │                    │                  │
         │                    │                  │
         ▼                    ▼                  ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  Vector Store   │  │  Document Store  │  │  Embedding      │
│  (Qdrant)       │  │  (QuestDB)       │  │  Service        │
│  Port: 6333     │  │  Port: 9000      │  │  (Local/Remote) │
└─────────────────┘  └──────────────────┘  └─────────────────┘
         ▲                    ▲                  ▲
         │                    │                  │
         │                    │                  │
┌────────┴────────────────────┴──────────────────┴────────────────┐
│              Data Ingestion Pipeline (Python)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Loaders │  │ Splitters│  │Embedders │  │ Indexers │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Sources                                │
│  • Documentation (Markdown)     • Trading Logs (JSONL)          │
│  • Market Data (Parquet)        • System Metrics (Prometheus)   │
│  • PRDs & Specs (OpenSpec)      • API Documentation             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### LlamaIndex Query API (Port 3600)
- **Purpose**: REST API for querying indexed knowledge
- **Technology**: Node.js/Express + Python LlamaIndex (via IPC or gRPC)
- **Key Features**:
  - Natural language query processing
  - Multi-document retrieval
  - Conversational memory management
  - Response streaming
  - Query analytics and logging

#### Vector Store (Qdrant)
- **Purpose**: High-performance vector similarity search
- **Technology**: Qdrant (open-source, Rust-based)
- **Configuration**:
  - Collection per data domain (docs, logs, market-data)
  - HNSW indexing for fast approximate nearest neighbor search
  - Payload filtering for metadata-based refinement
  - Quantization for reduced memory footprint

#### Document Store (QuestDB)
- **Purpose**: Store original documents, metadata, and lineage
- **Schema**:
  ```sql
  CREATE TABLE documents (
    doc_id SYMBOL,
    content TEXT,
    doc_type SYMBOL,
    source_path SYMBOL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata STRING,
    embedding_model SYMBOL,
    index_version INT
  ) TIMESTAMP(created_at) PARTITION BY DAY;
  ```

#### Embedding Service
- **Purpose**: Generate vector embeddings for text
- **Options**:
  - **Local**: sentence-transformers (all-MiniLM-L6-v2) - Free, fast
  - **Remote**: OpenAI text-embedding-3-small - Higher quality
  - **Hybrid**: Local for bulk, remote for critical queries

#### Data Ingestion Pipeline
- **Purpose**: ETL for document processing and indexing
- **Technology**: Python + LlamaIndex data loaders
- **Modes**:
  - **Batch**: Full reindex (nightly)
  - **Incremental**: Watch file changes (inotify)
  - **On-demand**: API-triggered reindex

### 1.3 Data Flow Diagrams

#### Ingestion Flow
```
1. File Change Detected (inotify)
   ↓
2. Document Loader (SimpleDirectoryReader, CSVReader, JSONReader)
   ↓
3. Text Splitter (RecursiveCharacterTextSplitter, 512 tokens, 50 overlap)
   ↓
4. Embedding Generator (batch processing, 100 docs/min)
   ↓
5. Vector Store Insert (Qdrant collection)
   ↓
6. Metadata Store Update (QuestDB)
   ↓
7. Index Version Bump + Notification
```

#### Query Flow
```
1. User Query → Query API (POST /api/query)
   ↓
2. Query Preprocessing (intent detection, filter extraction)
   ↓
3. Embedding Generation (query vector)
   ↓
4. Vector Search (Qdrant top-k=10, score threshold=0.7)
   ↓
5. Reranking (optional, cross-encoder model)
   ↓
6. Context Assembly (top-3 chunks + metadata)
   ↓
7. LLM Prompt Construction (system + context + query)
   ↓
8. LLM Response Generation (streaming)
   ↓
9. Response Post-processing (citation linking)
   ↓
10. Return to User (JSON with sources)
```

### 1.4 Integration Points

| System Component | Integration Method | Data Flow Direction |
|------------------|-------------------|---------------------|
| Dashboard | REST API (Port 3600) | Bidirectional |
| Documentation Hub | File watcher + API | Docs → LlamaIndex |
| QuestDB | SQL queries + Insert | Bidirectional |
| Qdrant | gRPC/HTTP API | Write (ingest), Read (query) |
| Prometheus | Metrics scraping | LlamaIndex → Prometheus |
| Laucher | Health checks | Service status |

---

## 2. Implementation Roadmap

### Phase 1: Foundation & Infrastructure (Weeks 1-2)

#### Week 1: Environment Setup

**Deliverables:**
- [ ] Qdrant container deployed and accessible
- [ ] Python virtual environment with LlamaIndex dependencies
- [ ] Development documentation structure
- [ ] Initial architecture diagrams

**Tasks:**
1. **Qdrant Deployment**
   ```bash
   # Add to infrastructure/compose/docker-compose.ai.yml
   qdrant:
     image: qdrant/qdrant:v1.7.4
     ports:
       - "6333:6333"
       - "6334:6334"
     volumes:
       - ./data/qdrant:/qdrant/storage
     environment:
       QDRANT__SERVICE__GRPC_PORT: 6334
   ```

2. **Python Environment**
   ```bash
   cd backend/services/llamaindex-engine
   python3 -m venv venv
   source venv/bin/activate
   pip install llama-index==0.9.48 \
               llama-index-vector-stores-qdrant==0.2.0 \
               llama-index-embeddings-huggingface==0.1.0 \
               sentence-transformers==2.3.1 \
               qdrant-client==1.7.0
   ```

3. **Project Structure**
   ```
   backend/services/llamaindex-engine/
   ├── src/
   │   ├── ingest/
   │   │   ├── loaders.py         # Document loaders
   │   │   ├── splitters.py       # Text chunking
   │   │   └── pipeline.py        # ETL orchestration
   │   ├── query/
   │   │   ├── engine.py          # Query processing
   │   │   ├── reranker.py        # Result reranking
   │   │   └── chat_memory.py     # Conversation state
   │   ├── storage/
   │   │   ├── qdrant_store.py    # Vector store wrapper
   │   │   ├── questdb_store.py   # Metadata store
   │   │   └── embeddings.py      # Embedding service
   │   ├── api/
   │   │   ├── server.py          # Express/FastAPI server
   │   │   ├── routes.py          # API endpoints
   │   │   └── middleware.py      # Auth, logging
   │   └── config/
   │       ├── settings.py        # Configuration
   │       └── prompts.py         # System prompts
   ├── tests/
   ├── scripts/
   │   ├── reindex.py             # Manual reindex
   │   └── benchmark.py           # Performance tests
   ├── requirements.txt
   └── README.md
   ```

#### Week 2: Core Components

**Deliverables:**
- [ ] Basic document loader for Markdown files
- [ ] Qdrant collection creation and management
- [ ] Simple query endpoint (no LLM integration)
- [ ] Unit tests for core functions

**Example Code Snippets:**

```python
# src/storage/qdrant_store.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

class QdrantVectorStore:
    def __init__(self, host="localhost", port=6333):
        self.client = QdrantClient(host=host, port=port)
    
    def create_collection(self, name: str, vector_size: int = 384):
        """Create a new collection for a data domain."""
        self.client.recreate_collection(
            collection_name=name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )
    
    def upsert_documents(self, collection: str, documents: list):
        """Insert or update document embeddings."""
        points = [
            {
                "id": doc["id"],
                "vector": doc["embedding"],
                "payload": doc["metadata"]
            }
            for doc in documents
        ]
        self.client.upsert(collection_name=collection, points=points)
```

```python
# src/ingest/loaders.py
from llama_index.core import SimpleDirectoryReader
from pathlib import Path

class DocumentationLoader:
    def __init__(self, docs_path: Path):
        self.docs_path = docs_path
    
    def load_markdown_docs(self) -> list:
        """Load all markdown files from docs directory."""
        reader = SimpleDirectoryReader(
            input_dir=str(self.docs_path),
            recursive=True,
            required_exts=[".md"],
            filename_as_id=True
        )
        return reader.load_data()
```

### Phase 2: Data Ingestion & Indexing (Weeks 3-4)

#### Week 3: Multi-Source Ingestion

**Deliverables:**
- [ ] Loaders for Markdown, JSON, Parquet, CSV
- [ ] Metadata extraction (frontmatter, file stats)
- [ ] Incremental update detection
- [ ] Batch ingestion scripts

**Data Source Priorities:**
1. **High Priority**: Documentation (docs/context/), OpenSpec specs
2. **Medium Priority**: Trading logs (JSONL), API responses
3. **Low Priority**: Market data (Parquet) - large volume, selective indexing

**Loader Implementations:**

| Data Source | Loader Type | Chunk Strategy | Metadata |
|-------------|-------------|----------------|----------|
| Markdown Docs | MarkdownReader | By heading (H1-H3) | Title, tags, domain, last_review |
| OpenSpec | JSONReader | Per requirement | Change ID, status, spec path |
| Trading Logs | JSONLReader | By event | Timestamp, service, level |
| Parquet Files | PandasReader | By time window | Symbol, date range, record count |

#### Week 4: Indexing & Optimization

**Deliverables:**
- [ ] Embedding generation pipeline (batch + streaming)
- [ ] Collection strategy (single vs multi-collection)
- [ ] Index versioning system
- [ ] Performance benchmarks (throughput, latency)

**Embedding Strategy:**

```python
# src/storage/embeddings.py
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.dimension = 384  # Model output size
    
    def embed_batch(self, texts: list[str], batch_size=32) -> list:
        """Generate embeddings in batches."""
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeddings = self.model.encode(
                batch,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            embeddings.extend(batch_embeddings.tolist())
        return embeddings
```

**Collection Strategy:**

Option A: **Single Collection** (Recommended)
- All documents in one collection
- Use payload filters for domain-specific queries
- Simpler management, easier cross-domain search

Option B: **Multi-Collection**
- Separate collections per domain (docs, logs, market-data)
- Better isolation, independent scaling
- More complex query routing

### Phase 3: Query Engine & Integration (Weeks 5-6)

#### Week 5: Query Engine Development

**Deliverables:**
- [ ] REST API with query endpoints
- [ ] LLM integration (OpenAI/Claude/Grok)
- [ ] Response streaming support
- [ ] Citation and source linking

**API Specification:**

```yaml
# OpenAPI 3.0
paths:
  /api/query:
    post:
      summary: Execute RAG query
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                  example: "How do I configure ProfitDLL?"
                filters:
                  type: object
                  properties:
                    domain: { type: string, enum: [backend, frontend, shared] }
                    doc_type: { type: string }
                top_k: { type: integer, default: 3 }
                stream: { type: boolean, default: false }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  answer: { type: string }
                  sources:
                    type: array
                    items:
                      type: object
                      properties:
                        file_path: { type: string }
                        score: { type: number }
                        excerpt: { type: string }
```

**Query Engine Implementation:**

```python
# src/query/engine.py
from llama_index.core import VectorStoreIndex, ServiceContext
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine

class TradingSystemQueryEngine:
    def __init__(self, vector_store, llm, embedding_model):
        self.index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            service_context=ServiceContext.from_defaults(
                llm=llm,
                embed_model=embedding_model
            )
        )
    
    def query(self, query_str: str, filters: dict = None, top_k: int = 3):
        """Execute RAG query with optional filters."""
        retriever = VectorIndexRetriever(
            index=self.index,
            similarity_top_k=top_k,
            filters=filters
        )
        query_engine = RetrieverQueryEngine(retriever=retriever)
        response = query_engine.query(query_str)
        
        return {
            "answer": response.response,
            "sources": [
                {
                    "file_path": node.metadata.get("file_path"),
                    "score": node.score,
                    "excerpt": node.get_content()[:200]
                }
                for node in response.source_nodes
            ]
        }
```

#### Week 6: Frontend Integration

**Deliverables:**
- [ ] Chat UI component in Dashboard
- [ ] Query history and bookmarks
- [ ] Source document viewer
- [ ] Feedback mechanism (thumbs up/down)

**React Component Example:**

```tsx
// frontend/apps/dashboard/src/components/AIAssistant/QueryPanel.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export const QueryPanel = () => {
  const [query, setQuery] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['rag-query', query],
    queryFn: () => fetch('http://localhost:3600/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(res => res.json()),
    enabled: query.length > 3
  });
  
  return (
    <div className="query-panel">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about TradingSystem..."
      />
      {isLoading && <Spinner />}
      {data && (
        <>
          <div className="answer">{data.answer}</div>
          <div className="sources">
            {data.sources.map((src, i) => (
              <SourceCard key={i} {...src} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

### Phase 4: Production Deployment & Optimization (Weeks 7-8)

#### Week 7: Production Readiness

**Deliverables:**
- [ ] Docker Compose integration
- [ ] Health checks and monitoring
- [ ] Backup and disaster recovery
- [ ] Load testing results

**Docker Compose Configuration:**

```yaml
# infrastructure/compose/docker-compose.ai.yml
services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    restart: unless-stopped
    ports:
      - "6333:6333"
    volumes:
      - ../../data/qdrant:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  llamaindex-api:
    build: ../../backend/services/llamaindex-engine
    restart: unless-stopped
    ports:
      - "3600:3600"
    environment:
      QDRANT_HOST: qdrant
      QDRANT_PORT: 6333
      QUESTDB_HOST: questdb
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - qdrant
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3600/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Week 8: Optimization & Documentation

**Deliverables:**
- [ ] Query performance optimization (< 2s P95)
- [ ] Embedding cache implementation
- [ ] Operational runbook
- [ ] User documentation

**Optimization Checklist:**
- [ ] Enable Qdrant quantization for memory efficiency
- [ ] Implement query result caching (Redis)
- [ ] Tune chunk sizes (test 256, 512, 1024 tokens)
- [ ] Optimize reranking threshold
- [ ] Implement embedding precomputation for common queries

---

## 3. Data Ingestion Strategy

### 3.1 Source Prioritization

| Priority | Data Source | Volume | Update Frequency | Indexing Strategy |
|----------|-------------|--------|------------------|-------------------|
| P0 | Documentation (docs/) | ~500 files | Daily | Full reindex nightly |
| P0 | OpenSpec (openspec/) | ~100 files | On change | Incremental |
| P1 | API Docs (backend/api/) | ~50 files | Weekly | Incremental |
| P2 | Trading Logs | ~1GB/day | Real-time | Windowed (last 7 days) |
| P3 | Market Data | ~10GB/day | Real-time | Aggregated summaries only |

### 3.2 Transformation Pipeline

```
Raw Document → Preprocessing → Chunking → Enrichment → Embedding → Indexing
```

**Preprocessing:**
- Remove boilerplate (headers, footers)
- Extract frontmatter metadata
- Clean markdown artifacts
- Normalize whitespace

**Chunking Strategies:**

| Document Type | Strategy | Chunk Size | Overlap |
|---------------|----------|------------|---------|
| Markdown Docs | Semantic (by heading) | 512 tokens | 50 tokens |
| Code Files | AST-based (by function) | 256 tokens | 30 tokens |
| Logs | Fixed-size | 128 tokens | 20 tokens |
| CSV/Parquet | Row-based | 100 rows | 10 rows |

**Enrichment:**
- Add document path as metadata
- Extract key entities (symbols, services, dates)
- Compute document summary
- Tag with domain/type

### 3.3 Incremental Updates

**File Watcher Implementation:**

```python
# src/ingest/watcher.py
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class DocumentWatcher(FileSystemEventHandler):
    def __init__(self, ingestion_pipeline):
        self.pipeline = ingestion_pipeline
    
    def on_modified(self, event):
        if event.src_path.endswith('.md'):
            self.pipeline.reindex_file(event.src_path)
    
    def on_created(self, event):
        if event.src_path.endswith('.md'):
            self.pipeline.index_file(event.src_path)
    
    def on_deleted(self, event):
        if event.src_path.endswith('.md'):
            self.pipeline.delete_from_index(event.src_path)

# Usage
observer = Observer()
observer.schedule(DocumentWatcher(pipeline), path='docs/', recursive=True)
observer.start()
```

---

## 4. Vector Storage & Embedding Management

### 4.1 Vector Store Selection: Qdrant

**Rationale:**
- ✅ Open-source, self-hosted (no vendor lock-in)
- ✅ Excellent performance (Rust-based)
- ✅ Rich filtering capabilities (payload-based)
- ✅ Good LlamaIndex integration
- ✅ Low operational overhead

**Alternatives Considered:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Qdrant | Fast, self-hosted, feature-rich | Requires separate service | **SELECTED** |
| Weaviate | GraphQL API, schema management | Higher complexity | Overkill for MVP |
| Pinecone | Managed, scalable | Cloud-only, cost | Against on-premise requirement |
| ChromaDB | Embedded, simple | Limited scale | Good for prototyping |

### 4.2 Collection Design

**Recommended Structure: Single Collection with Namespaces**

```python
# Collection: tradingsystem_knowledge
# Namespaces via payload.namespace field

collections = {
    "tradingsystem_knowledge": {
        "vector_size": 384,  # all-MiniLM-L6-v2
        "distance": "Cosine",
        "payloads": {
            "namespace": "string",  # docs, logs, market_data
            "domain": "string",     # backend, frontend, shared
            "doc_type": "string",   # md, json, csv, parquet
            "file_path": "string",
            "created_at": "datetime",
            "tags": "string[]"
        }
    }
}
```

### 4.3 Embedding Model Selection

**Primary Model: all-MiniLM-L6-v2**
- Dimension: 384
- Speed: ~1000 docs/sec on CPU
- Quality: Sufficient for technical documentation
- Cost: Free (local inference)

**Upgrade Path: OpenAI text-embedding-3-small**
- Dimension: 1536 (configurable)
- Quality: Superior for complex queries
- Cost: $0.02 / 1M tokens
- Use case: Production, high-value queries

### 4.4 Storage Optimization

**Quantization:**
```python
# Enable scalar quantization to reduce memory by 4x
collection_params = {
    "quantization_config": {
        "scalar": {
            "type": "int8",
            "quantile": 0.99
        }
    }
}
```

**Payload Indexing:**
```python
# Index frequently filtered fields
client.create_payload_index(
    collection_name="tradingsystem_knowledge",
    field_name="namespace",
    field_schema="keyword"
)
```

---

## 5. Query Engine Design

### 5.1 Query Processing Pipeline

```
User Query
  ↓
Intent Detection (routing)
  ↓
Query Rewriting (expansion, clarification)
  ↓
Filter Extraction (domain, doc_type, date_range)
  ↓
Embedding Generation
  ↓
Vector Search (top-k retrieval)
  ↓
Reranking (cross-encoder, optional)
  ↓
Context Assembly
  ↓
Prompt Construction
  ↓
LLM Generation
  ↓
Response Post-processing
  ↓
Return with Citations
```

### 5.2 Retrieval Strategies

**Hybrid Search:**
- Vector search (semantic similarity)
- Keyword search (BM25, via payload)
- Combine scores: `final_score = 0.7 * vector_score + 0.3 * keyword_score`

**Multi-Step Retrieval:**
1. **Broad Retrieval**: top-k=20 from vector store
2. **Reranking**: Use cross-encoder to score relevance
3. **Top-N Selection**: Keep top-3 for LLM context

**Metadata Filtering:**
```python
# Example: Query only backend documentation from last 30 days
filters = {
    "must": [
        {"key": "domain", "match": {"value": "backend"}},
        {"key": "created_at", "range": {
            "gte": "2025-09-14T00:00:00Z"
        }}
    ]
}
```

### 5.3 LLM Integration

**Supported Models:**
- OpenAI: gpt-4-turbo, gpt-3.5-turbo
- Anthropic: claude-3-opus, claude-3-sonnet
- xAI: grok-beta
- Local: llama-3-70b (via Ollama)

**Prompt Template:**

```python
SYSTEM_PROMPT = """You are an expert assistant for the TradingSystem platform.
Answer questions based ONLY on the provided context documents.
If the answer is not in the context, say "I don't have enough information."
Always cite sources using [Source: filename] format.

Context:
{context}

User Query: {query}
"""
```

### 5.4 Response Handling

**Citation Linking:**
```python
def add_citations(response: str, sources: list) -> str:
    """Add clickable links to source documents."""
    for i, source in enumerate(sources):
        citation = f"[{i+1}]"
        link = f"[{citation}](http://localhost:3004/docs/{source['file_path']})"
        response = response.replace(citation, link)
    return response
```

**Streaming Support:**
```python
async def stream_query(query: str):
    """Stream LLM response chunks."""
    async for chunk in llm.astream(prompt):
        yield json.dumps({"chunk": chunk}) + "\n"
```

---

## 6. Observability & Monitoring

### 6.1 Metrics

**Query Metrics (Prometheus):**
```python
# Query latency histogram
query_latency = Histogram(
    'query_duration_seconds',
    'Query execution time',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

# Retrieval quality gauge
retrieval_score = Gauge(
    'retrieval_avg_score',
    'Average relevance score of retrieved documents'
)

# LLM token usage counter
llm_tokens = Counter(
    'llm_tokens_total',
    'Total tokens consumed',
    ['model', 'type']  # type = prompt | completion
)
```

**System Metrics:**
- Qdrant memory usage
- Embedding throughput (docs/sec)
- Index size (GB)
- Cache hit rate

### 6.2 Logging

**Structured Logging (JSON):**
```python
import structlog

log = structlog.get_logger()

log.info(
    "query_executed",
    query=query_str,
    user_id=user_id,
    retrieval_count=len(sources),
    avg_score=avg_score,
    llm_model=model_name,
    duration_ms=duration
)
```

**Log Aggregation:**
- Ship logs to QuestDB for time-series analysis
- Create Grafana dashboard for query analytics

### 6.3 Alerting

**Critical Alerts:**
- Query latency P95 > 3s (warning), > 5s (critical)
- Qdrant connection failures
- Embedding service unavailable
- Disk space < 10GB

**Configuration (Prometheus Alertmanager):**
```yaml
groups:
  - name: llamaindex
    rules:
      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, query_duration_seconds) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Query latency P95 is {{ $value }}s"
```

### 6.4 Debugging Tools

**Query Explainer:**
```bash
# CLI tool to inspect query execution
python -m llamaindex.debug explain-query \
  --query "How does ProfitDLL work?" \
  --show-embeddings \
  --show-scores
```

**Index Inspector:**
```bash
# View index statistics
python -m llamaindex.debug inspect-index \
  --collection tradingsystem_knowledge \
  --show-duplicates \
  --show-coverage
```

---

## 7. Security & Governance

### 7.1 Access Control

**API Authentication:**
- JWT tokens (same as other TradingSystem APIs)
- Rate limiting: 100 queries/minute per user
- CORS configuration for dashboard origin only

**Data Access Policies:**
```python
# Role-based filtering
def apply_user_filters(user_role: str, base_filters: dict):
    if user_role == "trader":
        # Can access docs, logs, but not internal specs
        base_filters["must"].append({
            "key": "namespace",
            "match": {"any": ["docs", "logs"]}
        })
    elif user_role == "admin":
        # Full access
        pass
    return base_filters
```

### 7.2 Data Privacy

**Sensitive Data Handling:**
- Do NOT index credentials, API keys, personal data
- Implement redaction for logs containing PII
- Encrypt embeddings at rest (Qdrant encryption)

**Compliance:**
- GDPR: Right to deletion (remove user-specific queries from logs)
- LGPD: Data minimization (index only necessary fields)

### 7.3 Version Control

**Index Versioning:**
```sql
-- Track index versions in QuestDB
CREATE TABLE index_versions (
    version_id INT,
    created_at TIMESTAMP,
    documents_count INT,
    embedding_model SYMBOL,
    changes_summary STRING
) TIMESTAMP(created_at);
```

**Rollback Capability:**
- Snapshot Qdrant collections before major reindexes
- Keep last 3 versions for quick rollback

### 7.4 Audit Trail

**Query Audit Log:**
```sql
CREATE TABLE query_audit (
    query_id SYMBOL,
    timestamp TIMESTAMP,
    user_id SYMBOL,
    query_text STRING,
    filters STRING,
    results_count INT,
    avg_score DOUBLE,
    llm_model SYMBOL,
    duration_ms INT
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

---

## 8. Risk Management

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Embedding model drift (quality degradation) | Medium | High | Version control, A/B testing, rollback plan |
| Qdrant performance degradation at scale | Medium | Medium | Load testing, quantization, sharding strategy |
| LLM API rate limits/outages | High | Medium | Local fallback model (llama-3), request queuing |
| Incorrect/hallucinated responses | High | High | Citation requirement, confidence thresholding, user feedback loop |
| Index corruption | Low | High | Daily backups, replication, health checks |

### 8.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| High query costs (OpenAI API) | Medium | Medium | Budget alerts, local model for low-priority queries |
| Disk space exhaustion (embeddings) | Medium | Medium | Disk monitoring, auto-cleanup of old versions |
| Lack of user adoption | Medium | High | User training, intuitive UI, high-quality responses |
| Maintenance burden | Medium | Medium | Automated reindexing, self-healing, documentation |

### 8.3 Data Quality Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Outdated documentation indexed | High | Medium | Incremental updates, freshness scoring |
| Duplicate or conflicting information | Medium | Medium | Deduplication, version reconciliation |
| Poor chunking leading to fragmented context | Medium | High | Chunk size tuning, semantic chunking |
| Metadata missing or incorrect | Low | Low | Validation scripts, schema enforcement |

### 8.4 Mitigation Plan Summary

**Proactive Measures:**
- Comprehensive testing before production
- Gradual rollout (10% → 50% → 100% traffic)
- User feedback mechanisms (thumbs up/down)
- Regular model evaluation against test queries

**Reactive Measures:**
- Automated rollback on high error rates
- Manual override to disable RAG (fallback to standard search)
- On-call rotation for critical issues
- Incident postmortems and learnings

---

## 9. Dependencies & Prerequisites

### 9.1 Infrastructure Dependencies

| Dependency | Version | Purpose | Status |
|------------|---------|---------|--------|
| Python | 3.11+ | LlamaIndex runtime | ✅ Available |
| Node.js | 18+ | API server | ✅ Available |
| Docker | 24+ | Container orchestration | ✅ Available |
| Qdrant | 1.7+ | Vector storage | 🔲 To deploy |
| QuestDB | 7.3+ | Metadata storage | ✅ Available |

### 9.2 Service Dependencies

| Service | Dependency Type | Criticality | Fallback |
|---------|----------------|-------------|----------|
| LLM API (OpenAI/Claude) | External | High | Local llama-3 |
| Embedding Service | Internal | High | Precomputed cache |
| Qdrant | Internal | Critical | None (service unavailable) |
| QuestDB | Internal | Medium | In-memory cache |

### 9.3 Team Skills Required

| Skill Area | Level | Team Member | Training Needed |
|------------|-------|-------------|-----------------|
| Python (LlamaIndex) | Intermediate | Backend Dev | 1 week onboarding |
| Vector Databases | Beginner | DevOps | 2 days workshop |
| NLP/Embeddings | Beginner | All | 1 day overview |
| Prompt Engineering | Beginner | All | 3 days practice |

---

## 10. Timeline & Milestones

### 10.1 Gantt Chart (Text Representation)

```
Week 1:  [====== Foundation Setup ======]
Week 2:  [====== Core Components ======]
Week 3:  [====== Multi-Source Ingest =====]
Week 4:  [====== Indexing Optimization ===]
Week 5:  [====== Query Engine Dev ========]
Week 6:  [====== Frontend Integration ====]
Week 7:  [====== Production Deploy ======]
Week 8:  [====== Optimization & Docs ====]

Milestones:
├─ Week 2: ✓ Basic Query Working
├─ Week 4: ✓ Full Documentation Indexed
├─ Week 6: ✓ Dashboard Integration Complete
└─ Week 8: ✓ Production Launch
```

### 10.2 Detailed Schedule

#### Phase 1: Foundation (Weeks 1-2)
**Start**: 2025-10-15  
**End**: 2025-10-28  
**Deliverables**:
- Qdrant deployed and tested
- Python environment with LlamaIndex
- Basic query endpoint (no LLM)
- Unit tests for core functions

**Key Activities**:
- Day 1-2: Infrastructure setup (Qdrant, Python venv)
- Day 3-5: Project scaffolding, directory structure
- Day 6-8: Document loaders (Markdown)
- Day 9-10: Vector store integration
- Day 11-14: Testing and documentation

#### Phase 2: Ingestion (Weeks 3-4)
**Start**: 2025-10-29  
**End**: 2025-11-11  
**Deliverables**:
- All documentation sources ingested
- Embedding pipeline operational
- Incremental update mechanism
- Performance benchmarks

**Key Activities**:
- Day 15-17: Multi-source loaders (JSON, CSV, Parquet)
- Day 18-20: Metadata extraction and enrichment
- Day 21-23: Embedding generation pipeline
- Day 24-26: Batch indexing scripts
- Day 27-28: File watcher for incremental updates

#### Phase 3: Query Engine (Weeks 5-6)
**Start**: 2025-11-12  
**End**: 2025-11-25  
**Deliverables**:
- REST API with query endpoints
- LLM integration (OpenAI/Claude)
- Frontend chat component
- User feedback mechanism

**Key Activities**:
- Day 29-31: Query engine development
- Day 32-34: LLM integration and prompt engineering
- Day 35-37: API server (Express/FastAPI)
- Day 38-40: Frontend React component
- Day 41-42: Integration testing

#### Phase 4: Production (Weeks 7-8)
**Start**: 2025-11-26  
**End**: 2025-12-09  
**Deliverables**:
- Production deployment
- Monitoring and alerting
- Operational documentation
- User training materials

**Key Activities**:
- Day 43-45: Docker Compose integration
- Day 46-48: Prometheus metrics and Grafana dashboards
- Day 49-51: Load testing and optimization
- Day 52-54: Documentation and runbooks
- Day 55-56: User training and launch

### 10.3 Critical Path

```
Foundation → Ingestion → Query Engine → Frontend → Production
    ↓           ↓            ↓             ↓           ↓
   Day 14     Day 28       Day 42       Day 42      Day 56
```

**Critical Dependencies:**
1. Qdrant deployment MUST complete before ingestion
2. Embedding pipeline MUST work before query engine
3. Query engine MUST be stable before frontend integration
4. All components MUST pass load testing before production

### 10.4 Buffer & Contingency

- **Technical Buffer**: 1 week reserved for unforeseen issues
- **Integration Buffer**: 3 days for cross-team coordination
- **Testing Buffer**: 2 days for comprehensive QA

**Go/No-Go Criteria for Production:**
- [ ] Query latency P95 < 3 seconds
- [ ] Qdrant uptime > 99% in staging
- [ ] User acceptance testing passed (5+ users)
- [ ] All documentation complete
- [ ] Monitoring and alerting operational

---

## 11. Responsibilities (RACI Matrix)

| Task/Deliverable | Backend Dev | DevOps | Frontend Dev | Tech Lead | Stakeholders |
|------------------|-------------|--------|--------------|-----------|--------------|
| Infrastructure Setup | C | **R** | I | **A** | I |
| Python Environment | **R** | C | I | **A** | I |
| Document Loaders | **R** | I | I | **A** | C |
| Embedding Pipeline | **R** | C | I | **A** | I |
| Vector Store Config | C | **R** | I | **A** | I |
| Query Engine Dev | **R** | I | C | **A** | I |
| API Development | **R** | C | I | **A** | I |
| Frontend Integration | C | I | **R** | **A** | I |
| Monitoring Setup | C | **R** | I | **A** | I |
| Load Testing | C | **R** | I | **A** | I |
| Documentation | C | C | C | **R** | I |
| User Training | C | I | C | **A** | **R** |
| Production Deploy | C | **R** | I | **A** | I |

**Legend:**
- **R**: Responsible (does the work)
- **A**: Accountable (final approval)
- **C**: Consulted (provides input)
- **I**: Informed (kept in the loop)

---

## 12. Post-Implementation Checklist

### 12.1 Technical Verification

- [ ] **Qdrant Health**: Collection accessible, no errors in logs
- [ ] **Embedding Quality**: Sample queries return relevant results (manual review)
- [ ] **Query Latency**: P95 < 2s, P99 < 5s (load test results)
- [ ] **LLM Integration**: Responses include citations, no hallucinations detected
- [ ] **API Stability**: No 5xx errors in last 24 hours
- [ ] **Frontend**: Chat UI renders correctly, handles errors gracefully
- [ ] **Monitoring**: Grafana dashboards display metrics, alerts firing correctly
- [ ] **Backups**: Qdrant snapshots created successfully

### 12.2 Data Quality Verification

- [ ] **Coverage**: 100% of priority documentation indexed
- [ ] **Freshness**: Index updated within 1 hour of doc changes
- [ ] **Deduplication**: No duplicate chunks detected (run dedup script)
- [ ] **Metadata Integrity**: All documents have required fields (file_path, created_at)
- [ ] **Chunk Quality**: Sample chunks are semantically complete (manual review)

### 12.3 Operational Readiness

- [ ] **Runbook**: Operational procedures documented
- [ ] **On-Call**: Escalation paths defined, on-call rotation established
- [ ] **Rollback Plan**: Tested rollback to previous index version
- [ ] **Disaster Recovery**: Backup restoration tested successfully
- [ ] **Capacity Planning**: Disk space projections for next 6 months documented

### 12.4 User Acceptance

- [ ] **User Testing**: 5+ users tested and provided feedback
- [ ] **Documentation**: User guide published to Documentation Hub
- [ ] **Training**: Team training session conducted (1 hour)
- [ ] **Feedback Mechanism**: Thumbs up/down working, data flowing to analytics
- [ ] **Support**: FAQs created, support channel established (#llamaindex-support)

### 12.5 Governance & Compliance

- [ ] **Access Control**: Role-based filtering tested and working
- [ ] **Data Privacy**: Sensitive data exclusion validated
- [ ] **Audit Trail**: Query logs captured in QuestDB
- [ ] **Version Control**: Index version documented, changelog updated
- [ ] **Compliance**: GDPR/LGPD requirements reviewed and met

---

## 13. Success Metrics & KPIs

### 13.1 Technical KPIs

| Metric | Target | Measurement Method | Frequency |
|--------|--------|-------------------|-----------|
| Query Latency (P95) | < 2s | Prometheus histogram | Real-time |
| Query Latency (P99) | < 5s | Prometheus histogram | Real-time |
| Retrieval Relevance Score | > 0.85 | Manual evaluation (50 queries) | Weekly |
| Index Freshness | < 1 hour lag | File modification time vs index time | Hourly |
| API Uptime | > 99.9% | Prometheus up/down | Real-time |
| LLM Token Cost | < $50/month | Usage tracking | Daily |

### 13.2 Business KPIs

| Metric | Target | Measurement Method | Frequency |
|--------|--------|-------------------|-----------|
| Daily Active Users | 10+ | User ID tracking | Daily |
| Queries Per Day | 50+ | Query count | Daily |
| User Satisfaction | > 80% positive | Thumbs up/down ratio | Weekly |
| Time to Answer | 50% reduction vs manual search | User survey | Monthly |
| Adoption Rate | 80% of team | Usage logs | Monthly |

### 13.3 Quality Metrics

| Metric | Target | Measurement Method | Frequency |
|--------|--------|-------------------|-----------|
| Citation Accuracy | > 95% | Manual verification | Weekly |
| Hallucination Rate | < 5% | Manual review + user reports | Weekly |
| Query Success Rate | > 90% | "Useful" feedback ratio | Daily |
| Context Relevance | > 80% | Top-3 contains answer (manual eval) | Weekly |

### 13.4 Continuous Improvement

**Monthly Review:**
- Analyze top 20 queries (what are users asking?)
- Identify low-scoring queries (where are we failing?)
- Review user feedback (thumbs down reasons)
- Update index strategy based on usage patterns

**Quarterly Evaluation:**
- Benchmark against test query set (100 queries)
- Compare embedding models (quality vs cost)
- Evaluate LLM alternatives (GPT-4 vs Claude vs local)
- Reassess chunking strategy based on context relevance

---

## 14. Appendices

### 14.1 Glossary

| Term | Definition |
|------|------------|
| **RAG** | Retrieval-Augmented Generation - technique to enhance LLM responses with external knowledge |
| **Embedding** | Vector representation of text, enabling semantic similarity search |
| **Chunk** | Segment of a document (e.g., 512 tokens) stored as a separate indexed unit |
| **Vector Store** | Database optimized for storing and searching high-dimensional vectors |
| **Reranking** | Secondary scoring step to improve relevance of retrieved results |
| **Quantization** | Compression technique to reduce memory usage of vectors |
| **HNSW** | Hierarchical Navigable Small World - graph-based algorithm for approximate nearest neighbor search |
| **Top-k** | Number of most similar results to retrieve (e.g., top-5) |

### 14.2 Reference Links

- **LlamaIndex Documentation**: https://docs.llamaindex.ai/
- **Qdrant Documentation**: https://qdrant.tech/documentation/
- **sentence-transformers Models**: https://huggingface.co/sentence-transformers
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **Prometheus Best Practices**: https://prometheus.io/docs/practices/

### 14.3 Configuration Templates

**Environment Variables (.env):**
```bash
# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=

# QuestDB Configuration
QUESTDB_HOST=localhost
QUESTDB_PORT=9000

# Embedding Configuration
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DEVICE=cpu  # or cuda

# LLM Configuration
LLM_PROVIDER=openai  # or anthropic, xai, ollama
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo

# Query Configuration
DEFAULT_TOP_K=3
MIN_RELEVANCE_SCORE=0.7
MAX_CONTEXT_LENGTH=4000

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

**Docker Compose Override (docker-compose.override.yml):**
```yaml
version: '3.8'

services:
  llamaindex-api:
    environment:
      LOG_LEVEL: debug
      ENABLE_QUERY_CACHE: true
      CACHE_TTL_SECONDS: 300
    volumes:
      - ./dev-data:/data
    ports:
      - "3600:3600"
      - "9091:9091"  # Prometheus metrics
```

### 14.4 Sample Queries for Testing

**Basic Documentation Queries:**
1. "How do I configure ProfitDLL for market data?"
2. "What are the main microservices in TradingSystem?"
3. "Explain the Clean Architecture layers used in this project"
4. "What ports do the backend APIs run on?"
5. "How do I start the Documentation Hub?"

**Advanced Queries:**
1. "Compare WebSocket vs HTTP for market data communication"
2. "What are the risk management rules for order execution?"
3. "Show me the data flow from ProfitDLL to the execution stack (Gateway + Order Manager)"
4. "What's the difference between DayTrade and Consolidated positions?"
5. "List all OpenSpec changes related to authentication"

**Edge Cases:**
1. "What is the meaning of life?" (should refuse - out of scope)
2. "Delete all trading records" (should refuse - security)
3. "Show me the API keys" (should refuse - security)
4. Query in Portuguese: "Como funciona o ProfitDLL?" (should handle multilingual)

---

## 15. Conclusion

This implementation plan provides a comprehensive roadmap for integrating LlamaIndex into the TradingSystem platform. The 8-week timeline is aggressive but achievable with dedicated resources and clear ownership.

**Key Success Factors:**
1. **Prioritization**: Focus on documentation indexing first (highest ROI)
2. **Iterative Approach**: MVP in 4 weeks, refinement in remaining 4 weeks
3. **User Feedback**: Continuous validation with real users
4. **Technical Excellence**: Robust monitoring, testing, and documentation

**Next Steps:**
1. **Immediate (Week 1)**: Secure budget approval, allocate team
2. **Short-term (Weeks 2-4)**: Execute Phase 1 & 2 (foundation + ingestion)
3. **Medium-term (Weeks 5-8)**: Complete query engine and deploy to production
4. **Long-term (Post-launch)**: Expand to market data, logs, and advanced analytics

**Expected Outcomes:**
- 50% reduction in time-to-answer for technical queries
- 80% user adoption within 2 months of launch
- Foundation for AI-powered trading assistants (future capability)
- Significant improvement in developer onboarding experience

This plan is a living document. Adjust timelines, technologies, and priorities based on team feedback, technical discoveries, and business needs.

---

**Document Control:**
- **Version**: 1.0
- **Author**: Traycer AI Planning
- **Date**: 2025-10-14
- **Status**: Draft (awaiting stakeholder review)
- **Next Review**: 2025-10-21 (post-team discussion)
