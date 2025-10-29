"""
LlamaIndex Query Service
Handles semantic search and question answering over the document collection.
"""

import os
import logging
import sys
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient, AsyncQdrantClient

from llama_index.core import VectorStoreIndex, Settings
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama

# Query type enum for request handling
QUERY_TYPE_SEMANTIC = "semantic"
QUERY_TYPE_SIMILARITY = "similarity"

try:  # Local package import (tests, running as module)
    from .auth import get_current_user
    from .cache import get_cache_client
    from .rate_limit import rate_limiter
    from .monitoring import init_metrics, track_query_metrics
except ImportError:  # pragma: no cover - fallback for production image layout
    from auth import get_current_user  # type: ignore
    from cache import get_cache_client  # type: ignore
    from rate_limit import rate_limiter  # type: ignore
    from monitoring import init_metrics, track_query_metrics  # type: ignore

# Ensure shared helpers are importable when running as a module or script
CURRENT_DIR = Path(__file__).resolve().parent
SHARED_DIR = CURRENT_DIR.parent / "shared"
if SHARED_DIR.exists() and str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

from gpu import (  # type: ignore # pylint: disable=wrong-import-position
    acquire_gpu_slot,
    build_gpu_metadata,
    describe_gpu_policy,
    get_ollama_gpu_options,
    GPU_COOLDOWN_SECONDS,
    GPU_FORCE_ENABLED,
    GPU_MAX_CONCURRENCY,
)

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LlamaIndex Query Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize metrics
init_metrics(app)

# Initialize Qdrant clients (sync + async)
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
async_qdrant_client = AsyncQdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
 
LEGACY_COLLECTION_PREFERENCE = ["documentation", "docs_index"]


def _get_collection_info(name: str) -> Tuple[bool, int]:
    """
    Inspect a Qdrant collection and return (exists, count).
    """
    try:
        qdrant_client.get_collection(name)
    except Exception as exc:  # pragma: no cover - diagnostics only
        logger.debug("Collection %s not available: %s", name, exc)
        return False, 0

    count_value = 0
    try:
        count_response = qdrant_client.count(collection_name=name, exact=True)
        count_value = getattr(count_response, "count", None) or 0
    except Exception as exc:  # pragma: no cover - diagnostics only
        logger.debug("Failed to count collection %s: %s", name, exc)
    return True, int(count_value)


def _select_active_collection(configured: str) -> Tuple[str, Tuple[bool, int]]:
    """
    Pick the best collection to query. If the configured collection is missing or empty,
    fall back to the first known legacy collection that has vectors.
    """
    normalized_configured = configured.strip() or "documentation"
    configured_exists, configured_count = _get_collection_info(normalized_configured)

    if configured_exists and configured_count > 0:
        return normalized_configured, (configured_exists, configured_count)

    for candidate in LEGACY_COLLECTION_PREFERENCE:
        if candidate == normalized_configured:
            continue
        exists, count = _get_collection_info(candidate)
        if exists and count > 0:
            logger.warning(
                "Configured QDRANT_COLLECTION '%s' missing or empty (exists=%s, count=%s). "
                "Falling back to legacy collection '%s' (%s vectors).",
                normalized_configured,
                configured_exists,
                configured_count,
                candidate,
                count,
            )
            return candidate, (exists, count)

    if not configured_exists:
        logger.warning(
            "Configured QDRANT_COLLECTION '%s' not found. Queries may return empty results until ingestion runs.",
            normalized_configured,
        )
    return normalized_configured, (configured_exists, configured_count)


# Initialize vector store (with alias fallback detection)
CONFIGURED_QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "documentation")
ACTIVE_QDRANT_COLLECTION, ACTIVE_COLLECTION_INFO = _select_active_collection(CONFIGURED_QDRANT_COLLECTION)
if ACTIVE_QDRANT_COLLECTION != CONFIGURED_QDRANT_COLLECTION:
    os.environ["QDRANT_COLLECTION"] = ACTIVE_QDRANT_COLLECTION

vector_store = QdrantVectorStore(
    client=qdrant_client,
    aclient=async_qdrant_client,
    collection_name=ACTIVE_QDRANT_COLLECTION,
)
app.state.qdrant_collection = ACTIVE_QDRANT_COLLECTION
logger.info(
    "Vector store initialised. active_collection=%s (configured=%s, vectors=%s)",
    ACTIVE_QDRANT_COLLECTION,
    CONFIGURED_QDRANT_COLLECTION,
    ACTIVE_COLLECTION_INFO[1],
)
# Configure embeddings with Ollama (local)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# Support both OLLAMA_EMBED_MODEL (service-local) and OLLAMA_EMBEDDING_MODEL (repo-wide)
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL") or os.getenv("OLLAMA_EMBEDDING_MODEL") or "nomic-embed-text"
Settings.embed_model = OllamaEmbedding(
    model_name=OLLAMA_EMBED_MODEL,
    base_url=OLLAMA_BASE_URL,
    ollama_additional_kwargs=get_ollama_gpu_options(),
)

# Optionally configure LLM with Ollama (local) when model is provided
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL")
if OLLAMA_MODEL:
    Settings.llm = Ollama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        additional_kwargs=get_ollama_gpu_options(),
        keep_alive=os.getenv("OLLAMA_KEEP_ALIVE", os.getenv("LLAMAINDEX_KEEP_ALIVE", "5m")),
    )
    LLM_ENABLED = True
else:
    LLM_ENABLED = False

# Build index from existing vector store
index = VectorStoreIndex.from_vector_store(vector_store)

logger.info(
    "GPU policy: forced=%s, options=%s, max_concurrency=%s, cooldown=%s",
    GPU_FORCE_ENABLED,
    get_ollama_gpu_options(),
    GPU_MAX_CONCURRENCY,
    GPU_COOLDOWN_SECONDS,
)

class QueryRequest(BaseModel):
    """Query request model."""
    query: str
    max_results: Optional[int] = 5
    filters: Optional[dict] = None

class SearchResult(BaseModel):
    """Search result model."""
    content: str
    relevance: float
    metadata: dict

class QueryResponse(BaseModel):
    """Query response model."""
    answer: str
    confidence: float
    sources: List[SearchResult]
    metadata: dict


class GpuPolicyResponseModel(BaseModel):
    """GPU policy response model."""
    policy: dict
    options: dict
    maxConcurrency: int
    cooldownSeconds: float

@app.post("/query", response_model=QueryResponse)
@rate_limiter
async def query_documents(
    payload: QueryRequest,
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a natural language query against the document collection.
    """
    if not LLM_ENABLED or index is None:
        raise HTTPException(
            status_code=503,
            detail="LLM não configurado. Defina OLLAMA_MODEL para habilitar respostas geradas."
        )
    try:
        # Check cache
        cache_key = f"query:{payload.query}"
        cache_client = get_cache_client()
        cached_response = await cache_client.get(cache_key)
        if cached_response:
            response.headers["X-GPU-Wait-Seconds"] = "0"
            response.headers["X-GPU-Max-Concurrency"] = str(GPU_MAX_CONCURRENCY)
            return cached_response

        async with acquire_gpu_slot("query") as gpu_usage:
            query_engine = index.as_query_engine(
                similarity_top_k=payload.max_results,
                filters=payload.filters,
            )

            with track_query_metrics():
                li_response = await query_engine.aquery(payload.query)

        # Format response
        sources = []
        for node in li_response.source_nodes:
            # Support both NodeWithScore.node.text and NodeWithScore.text
            text = getattr(node, "text", None) or getattr(getattr(node, "node", None), "text", "")
            meta = getattr(node, "metadata", None) or getattr(getattr(node, "node", None), "metadata", {})
            sources.append(
                SearchResult(
                    content=text,
                    relevance=float(getattr(node, "score", 0.0) or 0.0),
                    metadata=meta,
                )
            )

        query_response = QueryResponse(
            answer=str(li_response),
            confidence=float(li_response.confidence) if hasattr(li_response, 'confidence') else 1.0,
            sources=sources,
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "user": current_user["username"],
                "query_type": "semantic",
                "collection": ACTIVE_QDRANT_COLLECTION,
                "gpu": build_gpu_metadata(
                    gpu_usage["wait_time_seconds"],
                    operation=gpu_usage.get("operation"),
                    lock_owner=gpu_usage.get("lock_owner"),
                ),
            }
        )

        response.headers["X-GPU-Wait-Seconds"] = f"{gpu_usage['wait_time_seconds']:.4f}"
        response.headers["X-GPU-Max-Concurrency"] = str(GPU_MAX_CONCURRENCY)

        # Cache response
        response_payload = query_response.model_dump()
        await cache_client.set(cache_key, response_payload, expire=3600)

        return response_payload

    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )


@app.get("/gpu/policy", response_model=GpuPolicyResponseModel)
async def gpu_policy() -> GpuPolicyResponseModel:
    """Expose the effective GPU coordination policy for UI/automation."""
    return GpuPolicyResponseModel(
        policy=dict(describe_gpu_policy()),
        options=get_ollama_gpu_options(),
        maxConcurrency=GPU_MAX_CONCURRENCY,
        cooldownSeconds=GPU_COOLDOWN_SECONDS,
    )

@app.get("/search", response_model=List[SearchResult])
@rate_limiter
async def semantic_search(
    query: str,
    request: Request,
    response: Response,
    max_results: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform semantic search over the document collection.
    """
    # Allow search without LLM; requires only embeddings
    try:
        # Check cache
        cache_key = f"search:{query}:{max_results}"
        cache_client = get_cache_client()
        cached_response = await cache_client.get(cache_key)
        if cached_response:
            response.headers["X-GPU-Wait-Seconds"] = "0"
            response.headers["X-GPU-Max-Concurrency"] = str(GPU_MAX_CONCURRENCY)
            return cached_response

        async with acquire_gpu_slot("search") as gpu_usage:
            query_engine = index.as_query_engine(
                similarity_top_k=max_results,
                response_mode="no_text",
            )

            with track_query_metrics(query_type="similarity"):
                li_response = await query_engine.aquery(query)

        # Format results
        results = []
        for node in li_response.source_nodes:
            text = getattr(node, "text", None) or getattr(getattr(node, "node", None), "text", "")
            meta = getattr(node, "metadata", None) or getattr(getattr(node, "node", None), "metadata", {})
            results.append(
                SearchResult(
                    content=text,
                    relevance=float(getattr(node, "score", 0.0) or 0.0),
                    metadata=meta,
                )
            )

        response.headers["X-GPU-Wait-Seconds"] = f"{gpu_usage['wait_time_seconds']:.4f}"
        response.headers["X-GPU-Max-Concurrency"] = str(GPU_MAX_CONCURRENCY)

        # Cache results
        payload = [item.model_dump() for item in results]
        await cache_client.set(cache_key, payload, expire=3600)

        return payload

    except Exception as e:
        logger.error(f"Error performing search: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error performing search: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    try:
        # Check Qdrant connection
        qdrant_client.get_collections()
        exists, current_count = _get_collection_info(ACTIVE_QDRANT_COLLECTION)
        return {
            "status": "healthy",
            "collection": ACTIVE_QDRANT_COLLECTION,
            "collectionExists": exists,
            "vectors": current_count,
            "configuredCollection": CONFIGURED_QDRANT_COLLECTION,
            "fallbackApplied": ACTIVE_QDRANT_COLLECTION != CONFIGURED_QDRANT_COLLECTION,
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Service unhealthy"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
