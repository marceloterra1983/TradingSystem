# RAG Services - Database Schema

**Version**: 1.0.0  
**Database**: TimescaleDB (PostgreSQL + time-series extensions)  
**Schema**: `rag`  
**Last Updated**: 2025-11-02

---

## 📋 Overview

This directory contains the complete database schema for RAG (Retrieval-Augmented Generation) Services. The schema is designed to support document collections, vector embeddings, ingestion tracking, and query analytics.

### Key Features

✅ **Multi-collection support** - Multiple embedding models per collection  
✅ **Time-series optimization** - Hypertables for logs and jobs  
✅ **Full audit trail** - Track every document, chunk, and query  
✅ **Performance analytics** - Continuous aggregates for insights  
✅ **Orphan detection** - Identify chunks without source documents  
✅ **Change tracking** - File hashes for incremental updates

---

## 📂 Schema Files

| File | Description | Dependencies |
|------|-------------|--------------|
| `00_rag_schema_master.sql` | **Master import script** - Runs all files in order | *(Entry point)* |
| `01_rag_collections.sql` | Collections metadata table | None |
| `02_rag_documents.sql` | Documents metadata table | `collections` |
| `03_rag_chunks.sql` | Chunks and vector mappings | `documents`, `collections` |
| `04_rag_ingestion_jobs.sql` | Ingestion jobs (hypertable) | `collections` |
| `05_rag_query_logs.sql` | Query logs (hypertable) | `collections` |
| `06_rag_embedding_models.sql` | Embedding models catalog | None |

---

## 🗄️ Database Structure

### Core Tables

#### 1. **rag.collections**
Main collection configurations with metadata.

- **Purpose**: Store RAG collection settings (embedding model, chunk size, etc.)
- **Key Fields**: `name`, `directory`, `embedding_model`, `status`
- **Relationships**: Parent to `documents`, `chunks`, `ingestion_jobs`, `query_logs`

#### 2. **rag.documents**
Metadata for indexed documents.

- **Purpose**: Track individual files within collections
- **Key Fields**: `file_path`, `file_hash`, `indexed`, `index_status`
- **Relationships**: Child of `collections`, parent of `chunks`
- **Triggers**: Updates collection stats on change

#### 3. **rag.chunks**
Text chunks and their Qdrant vector mappings.

- **Purpose**: Map PostgreSQL records to Qdrant vector points
- **Key Fields**: `qdrant_point_id`, `content`, `chunk_index`
- **Relationships**: Child of `documents` and `collections`
- **Constraints**: Unique `(document_id, chunk_index)`, unique `(qdrant_point_id, qdrant_collection)`

### Time-Series Tables (Hypertables)

#### 4. **rag.ingestion_jobs** *(Hypertable)*
Tracks document ingestion jobs with performance metrics.

- **Partitioning**: By `started_at` (daily chunks)
- **Purpose**: Monitor ingestion performance and errors
- **Key Fields**: `job_type`, `status`, `duration_ms`, `throughput_docs_per_sec`
- **Compression**: Chunks older than 7 days
- **Retention**: 90 days (optional)
- **Continuous Aggregates**: `ingestion_jobs_daily_stats`

#### 5. **rag.query_logs** *(Hypertable)*
User query logs with detailed performance metrics.

- **Partitioning**: By `executed_at` (hourly chunks)
- **Purpose**: Analyze search patterns, performance, and user behavior
- **Key Fields**: `query_text`, `duration_ms`, `cache_hit`, `top_relevance_score`
- **Compression**: Chunks older than 7 days
- **Retention**: 90 days
- **Continuous Aggregates**: `query_logs_hourly_stats`, `popular_queries_daily`

### Auxiliary Tables

#### 6. **rag.embedding_models**
Catalog of available embedding models.

- **Purpose**: Track model characteristics and usage
- **Key Fields**: `name`, `dimensions`, `provider`, `usage_count`
- **Sample Data**: `nomic-embed-text`, `mxbai-embed-large`, `embeddinggemma`

---

## 📊 Entity Relationship Diagram

**PlantUML Diagram**: `docs/content/diagrams/rag-services-er-diagram.puml`

```
rag.collections (1) ----< (N) rag.documents
rag.collections (1) ----< (N) rag.chunks
rag.collections (1) ----< (N) rag.ingestion_jobs
rag.collections (1) ----< (N) rag.query_logs

rag.documents (1) ----< (N) rag.chunks
```

---

## 🚀 Installation

### Prerequisites

- PostgreSQL 14+ or TimescaleDB 2.x
- TimescaleDB extension installed
- `uuid-ossp` and `pgcrypto` extensions

### Quick Start

```bash
# 1. Navigate to schema directory
cd backend/data/timescaledb/rag/

# 2. Connect to database
psql -h localhost -p 5432 -U postgres -d tradingsystem

# 3. Run master script
\i 00_rag_schema_master.sql
```

### Alternative (from project root)

```bash
psql -h localhost -p 5432 -U postgres -d tradingsystem \
  -f backend/data/timescaledb/rag/00_rag_schema_master.sql
```

### Verification

```sql
-- Check installed tables
SELECT tablename FROM pg_tables WHERE schemaname = 'rag';

-- Check hypertables
SELECT hypertable_name FROM timescaledb_information.hypertables 
WHERE hypertable_schema = 'rag';

-- Check sample data
SELECT * FROM rag.collections;
SELECT * FROM rag.embedding_models;
```

---

## 📈 Performance Optimization

### Indexes

All tables include optimized indexes for common queries:
- **Foreign keys**: Indexed for joins
- **Status fields**: Filtered indexes for active records
- **Timestamps**: Descending indexes for recent data
- **JSONB fields**: GIN indexes for metadata searches
- **Full-text search**: GIN indexes on text fields

### TimescaleDB Features

#### Hypertables
- **Automatic partitioning**: Daily (ingestion_jobs) and hourly (query_logs) chunks
- **Parallel queries**: Distributed across chunks
- **Retention policies**: Auto-drop old data

#### Compression
- **Columnar storage**: 10x compression ratio
- **Policy**: Compress chunks older than 7 days
- **Benefits**: Reduced storage, faster scans

#### Continuous Aggregates
- **Real-time analytics**: Pre-computed aggregations
- **Auto-refresh**: Updated every 15-60 minutes
- **Views**: `ingestion_jobs_daily_stats`, `query_logs_hourly_stats`, `popular_queries_daily`

---

## 🔍 Common Queries

### Collection Management

```sql
-- Get all collections with stats
SELECT * FROM rag.collections ORDER BY name;

-- Get collection by name
SELECT * FROM rag.collections WHERE name = 'documentation__nomic';

-- Get collections needing indexing
SELECT * FROM rag.collections 
WHERE status = 'pending' AND enabled = TRUE;
```

### Document Operations

```sql
-- Get documents for a collection
SELECT * FROM rag.v_documents_with_collections
WHERE collection_name = 'documentation__nomic';

-- Find documents needing indexing
SELECT * FROM rag.documents
WHERE indexed = FALSE AND index_status = 'pending';

-- Find documents with errors
SELECT * FROM rag.documents
WHERE index_status = 'error'
ORDER BY error_count DESC;
```

### Query Analytics

```sql
-- Recent queries (last 24 hours)
SELECT * FROM rag.v_recent_queries LIMIT 20;

-- Slow queries (> 1000ms)
SELECT * FROM rag.v_slow_queries LIMIT 10;

-- Query statistics (last 24 hours)
SELECT * FROM rag.get_query_statistics(
    NOW() - INTERVAL '24 hours',
    NOW(),
    NULL  -- All collections
);

-- Popular queries (last 7 days)
SELECT 
    query_text,
    COUNT(*) AS query_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms
FROM rag.query_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY query_count DESC
LIMIT 20;
```

### Ingestion Monitoring

```sql
-- Recent ingestion jobs
SELECT * FROM rag.v_recent_ingestion_jobs LIMIT 20;

-- Active jobs
SELECT * FROM rag.get_active_ingestion_jobs(
    (SELECT id FROM rag.collections WHERE name = 'documentation__nomic')
);

-- Failed jobs
SELECT * FROM rag.v_failed_ingestion_jobs;

-- Daily statistics
SELECT * FROM rag.ingestion_jobs_daily_stats
WHERE day > NOW() - INTERVAL '30 days'
ORDER BY day DESC;
```

---

## 🛠️ Maintenance

### Vacuum and Analyze

```sql
-- Run after bulk inserts/updates
VACUUM ANALYZE rag.collections;
VACUUM ANALYZE rag.documents;
VACUUM ANALYZE rag.chunks;
```

### Compress Hypertables Manually

```sql
-- Compress older chunks
SELECT compress_chunk(chunk)
FROM show_chunks('rag.ingestion_jobs', older_than => INTERVAL '7 days')
AS chunk;

SELECT compress_chunk(chunk)
FROM show_chunks('rag.query_logs', older_than => INTERVAL '7 days')
AS chunk;
```

### Refresh Continuous Aggregates

```sql
-- Manual refresh (if needed)
CALL refresh_continuous_aggregate('rag.ingestion_jobs_daily_stats', NULL, NULL);
CALL refresh_continuous_aggregate('rag.query_logs_hourly_stats', NULL, NULL);
CALL refresh_continuous_aggregate('rag.popular_queries_daily', NULL, NULL);
```

---

## 🗑️ Rollback / Cleanup

### Drop Schema

```sql
-- ⚠️ WARNING: This will delete ALL RAG data
DROP SCHEMA rag CASCADE;
```

### Drop Individual Tables

```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS rag.query_logs CASCADE;
DROP TABLE IF EXISTS rag.ingestion_jobs CASCADE;
DROP TABLE IF EXISTS rag.chunks CASCADE;
DROP TABLE IF EXISTS rag.documents CASCADE;
DROP TABLE IF EXISTS rag.embedding_models CASCADE;
DROP TABLE IF EXISTS rag.collections CASCADE;
```

---

## 📚 Documentation

- **ER Diagram**: `docs/content/diagrams/rag-services-er-diagram.puml`
- **API Documentation**: `docs/content/api/rag-services.mdx`
- **Architecture**: `docs/content/tools/rag/architecture.mdx`
- **Schema Reference**: `docs/content/database/rag-schema.mdx`

---

## 🐛 Troubleshooting

### Issue: Hypertable creation fails

**Solution**: Ensure TimescaleDB extension is installed:
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Issue: Foreign key constraints fail

**Solution**: Run schema files in correct order (use master script).

### Issue: Permission denied

**Solution**: Grant appropriate permissions:
```sql
GRANT USAGE ON SCHEMA rag TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA rag TO your_user;
```

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-02 | Initial schema design with all tables |

---

## 🤝 Contributing

When modifying the schema:

1. **Update version number** in each SQL file
2. **Add migration script** for existing deployments
3. **Update ER diagram** (`rag-services-er-diagram.puml`)
4. **Update documentation** (`docs/content/database/rag-schema.mdx`)
5. **Test locally** before committing

---

**Questions or Issues?** Contact the Architecture Guild or open an issue in the repository.

