"""
LlamaIndex Query Service
Handles semantic search and question answering over the document collection.
"""

import os
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient

from llama_index.core import VectorStoreIndex, Settings
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

# Query type enum for request handling
QUERY_TYPE_SEMANTIC = "semantic"
QUERY_TYPE_SIMILARITY = "similarity"

from auth import get_current_user
from cache import get_cache_client
from rate_limit import rate_limiter
from monitoring import init_metrics, track_query_metrics

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

# Initialize Qdrant client
qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333))
)

# Initialize vector store
vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name="documentation"
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_ENABLED = bool(OPENAI_API_KEY)

if LLM_ENABLED:
    # Configure defaults for LLM and embeddings
    Settings.embed_model = OpenAIEmbedding()
    Settings.llm = OpenAI(temperature=0)
    index = VectorStoreIndex.from_vector_store(vector_store)
else:
    index = None
    logger.warning(
        "OPENAI_API_KEY not set. Query endpoints will return 503 until the key is configured."
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

@app.post("/query", response_model=QueryResponse)
@rate_limiter
async def query_documents(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a natural language query against the document collection.
    """
    if not LLM_ENABLED or index is None:
        raise HTTPException(
            status_code=503,
            detail="OpenAI integration is disabled. Set OPENAI_API_KEY to enable query endpoints."
        )
    try:
        # Check cache
        cache_key = f"query:{request.query}"
        cache_client = get_cache_client()
        cached_response = await cache_client.get(cache_key)
        if cached_response:
            return cached_response

        # Create query engine
        query_engine = index.as_query_engine(
            similarity_top_k=request.max_results,
            filters=request.filters,
        )

        # Execute query with metrics tracking
        with track_query_metrics():
            response = await query_engine.aquery(request.query)

        # Format response
        sources = []
        for node in response.source_nodes:
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
            answer=str(response),
            confidence=float(response.confidence) if hasattr(response, 'confidence') else 1.0,
            sources=sources,
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "user": current_user["username"],
                "query_type": "semantic"
            }
        )

        # Cache response
        await cache_client.set(cache_key, query_response, expire=3600)

        return query_response

    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )

@app.get("/search", response_model=List[SearchResult])
@rate_limiter
async def semantic_search(
    query: str,
    max_results: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform semantic search over the document collection.
    """
    if not LLM_ENABLED or index is None:
        raise HTTPException(
            status_code=503,
            detail="OpenAI integration is disabled. Set OPENAI_API_KEY to enable query endpoints."
        )
    try:
        # Check cache
        cache_key = f"search:{query}:{max_results}"
        cache_client = get_cache_client()
        cached_response = await cache_client.get(cache_key)
        if cached_response:
            return cached_response

        # Create query engine for similarity search
        query_engine = index.as_query_engine(
            similarity_top_k=max_results,
        )

        # Execute search with metrics tracking
        with track_query_metrics():
            response = await query_engine.aquery(query)

        # Format results
        results = []
        for node in response.source_nodes:
            text = getattr(node, "text", None) or getattr(getattr(node, "node", None), "text", "")
            meta = getattr(node, "metadata", None) or getattr(getattr(node, "node", None), "metadata", {})
            results.append(
                SearchResult(
                    content=text,
                    relevance=float(getattr(node, "score", 0.0) or 0.0),
                    metadata=meta,
                )
            )

        # Cache results
        await cache_client.set(cache_key, results, expire=3600)

        return results

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
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Service unhealthy"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
