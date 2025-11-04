"""
Pytest Configuration and Fixtures
Shared test setup for LlamaIndex Query Service
"""

import os
import pytest
from fastapi.testclient import TestClient

# Set test environment variables BEFORE importing app
os.environ['NODE_ENV'] = 'test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['INTER_SERVICE_SECRET'] = 'test-inter-service-secret'
os.environ['LOG_LEVEL'] = 'ERROR'
os.environ['QDRANT_HOST'] = 'localhost'
os.environ['QDRANT_PORT'] = '6333'
os.environ['OLLAMA_BASE_URL'] = 'http://localhost:11434'


@pytest.fixture
def test_client():
    """Create FastAPI test client"""
    from main import app
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create test JWT token for authentication"""
    from auth import create_test_token
    token = create_test_token({"sub": "test-user", "username": "test"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def service_auth_headers():
    """Create service authentication headers"""
    return {"X-Service-Token": os.getenv("INTER_SERVICE_SECRET")}


@pytest.fixture
def mock_qdrant_client(monkeypatch):
    """Mock Qdrant client for testing"""
    class MockQdrantClient:
        def get_collections(self):
            return ["documentation", "documentation__nomic"]
        
        def get_collection(self, name):
            return {
                "name": name,
                "status": "green",
                "points_count": 3087,
            }
        
        def count(self, collection_name, exact=True):
            class CountResponse:
                count = 3087
            return CountResponse()
        
        def search(self, collection_name, query_vector, limit=5):
            return [
                {"id": "1", "score": 0.95, "payload": {"text": "Test content"}},
            ]
    
    return MockQdrantClient()


@pytest.fixture
def mock_ollama_embed(monkeypatch):
    """Mock Ollama embedding for testing"""
    class MockEmbedding:
        async def aget_text_embedding(self, text):
            # Return fake embedding vector
            return [0.1] * 768
    
    return MockEmbedding()


@pytest.fixture(autouse=True)
def reset_circuit_breakers():
    """Reset circuit breakers between tests"""
    from circuit_breaker import get_circuit_breaker_states
    # Note: circuitbreaker library doesn't expose reset method
    # Tests should be independent and not rely on circuit state
    yield

