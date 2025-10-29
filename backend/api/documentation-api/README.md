# Documentation API — Semantic Search (Local)

This service now supports local semantic search using Ollama embeddings and Qdrant.

## Prerequisites

- Docker running
- Qdrant and Ollama containers
- Embedding model available in Ollama (default: `nomic-embed-text`)

## Environment

Set in the repo `.env` (see `.env.example`):

- `QDRANT_URL` (default `http://localhost:6333`)
- `QDRANT_COLLECTION` (default `documentation`)
- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `OLLAMA_EMBEDDING_MODEL` (default `nomic-embed-text`)
- Optional chunking: `DOCS_CHUNK_SIZE=800`, `DOCS_CHUNK_OVERLAP=120`

## Start local services

```
docker compose -f tools/compose/docker-compose.database.yml up -d qdrant
docker compose -f tools/compose/docker-compose.individual.yml up -d ollama
docker exec -it ollama ollama pull nomic-embed-text
```

## Install dependencies

```
cd backend/api/documentation-api
npm install
```

## Index documentation into Qdrant

```
# Basic chunker
npm run semantic:index

# LlamaIndex ingestion (headings-aware chunking)
npm run semantic:index:llama

# Or auto-pick by env (SEMANTIC_INDEXER=llamaindex|basic; default basic)
SEMANTIC_INDEXER=llamaindex npm run semantic:index:auto
```

The indexer scans `docs/content`, chunks markdown/MDX, calls Ollama for embeddings, and upserts vectors into Qdrant.

## Run the API

```
npm run dev
```

Health and routes:

- Root: `http://localhost:3400/`
- Semantic search: `GET http://localhost:3400/api/v1/semantic/search?q=como%20instalar`

## Files

- Indexer: `src/scripts/index-docs-to-qdrant.js`
- Service: `src/services/semanticSearchService.js`
- Route: `src/routes/semantic.js`
- Config: `src/config/appConfig.js`
