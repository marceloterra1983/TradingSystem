"""
Shared test fixtures and configuration.
"""

import os
import pytest
from fastapi.testclient import TestClient
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Import both services
from ingestion_service.main import app as ingestion_app
from query_service.main import app as query_app

@pytest.fixture
def test_client_ingestion():
    """Create a test client for the ingestion service."""
    with TestClient(ingestion_app) as client:
        yield client

@pytest.fixture
def test_client_query():
    """Create a test client for the query service."""
    with TestClient(query_app) as client:
        yield client

@pytest.fixture
async def qdrant_test_client():
    """Create a Qdrant test client with temporary collection."""
    # Connect to Qdrant
    client = QdrantClient(
        host=os.getenv("QDRANT_HOST", "localhost"),
        port=int(os.getenv("QDRANT_PORT", 6333))
    )
    
    # Create temporary collection
    client.recreate_collection(
        collection_name="test_collection",
        vectors_config=models.VectorParams(
            size=1536,  # OpenAI embedding size
            distance=models.Distance.COSINE
        )
    )
    
    yield client
    
    # Cleanup
    client.delete_collection("test_collection")

@pytest.fixture
def test_documents():
    """Sample test documents."""
    return [
        {
            "content": "This is a test document about Python programming.",
            "metadata": {
                "source": "test1.md",
                "type": "markdown"
            }
        },
        {
            "content": "Another test document about software architecture.",
            "metadata": {
                "source": "test2.md",
                "type": "markdown"
            }
        }
    ]

@pytest.fixture
def mock_openai_embeddings(monkeypatch):
    """Mock embeddings generation for providers used in tests (OpenAI/Ollama)."""
    def mock_get_embedding(*args, **kwargs):
        # Return fixed-size mock embedding
        return [0.1] * 1536

    # Try to patch OpenAI provider (legacy path used by some tests)
    try:
        monkeypatch.setattr(
            "llama_index.embeddings.openai.OpenAIEmbedding.get_text_embedding",
            mock_get_embedding
        )
        monkeypatch.setattr(
            "llama_index.embeddings.openai.OpenAIEmbedding.get_query_embedding",
            mock_get_embedding
        )
    except Exception:
        pass

    # Patch Ollama provider used by the services now
    try:
        monkeypatch.setattr(
            "llama_index.embeddings.ollama.OllamaEmbedding.get_text_embedding",
            mock_get_embedding
        )
        monkeypatch.setattr(
            "llama_index.embeddings.ollama.OllamaEmbedding.get_query_embedding",
            mock_get_embedding
        )
    except Exception:
        pass
