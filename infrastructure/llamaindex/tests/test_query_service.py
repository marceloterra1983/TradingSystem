"""
Tests for the query service.
"""

import os
import time
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from query_service.auth import create_access_token, SECRET_KEY, ALGORITHM
from query_service.cache import get_cache_client
from query_service.main import app

def test_health_check(test_client_query):
    """Test health check endpoint."""
    response = test_client_query.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.fixture
def test_token():
    """Create a test JWT token."""
    access_token = create_access_token(
        data={"sub": "test_user"},
    )
    return access_token

def test_authentication(test_client_query):
    """Test authentication requirements."""
    # Test without token
    response = test_client_query.post("/query", json={
        "query": "test query"
    })
    assert response.status_code == 401
    
    # Test with invalid token
    response = test_client_query.post(
        "/query",
        json={"query": "test query"},
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    
    # Test with expired token
    expired_token = jwt.encode(
        {"sub": "test_user", "exp": time.time() - 3600},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    response = test_client_query.post(
        "/query",
        json={"query": "test query"},
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_query_endpoint(
    test_client_query,
    test_token,
    qdrant_test_client,
    test_documents,
    mock_openai_embeddings
):
    """Test natural language query endpoint."""
    # First index some test documents
    # (In a real test, we'd use the ingestion service for this)
    
    response = test_client_query.post(
        "/query",
        json={
            "query": "What is Python programming?",
            "max_results": 2
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "confidence" in data
    assert "sources" in data
    assert len(data["sources"]) <= 2

@pytest.mark.asyncio
async def test_search_endpoint(
    test_client_query,
    test_token,
    qdrant_test_client,
    test_documents,
    mock_openai_embeddings
):
    """Test semantic search endpoint."""
    response = test_client_query.get(
        "/search",
        params={
            "query": "Python programming",
            "max_results": 2
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) <= 2
    for result in results:
        assert "content" in result
        assert "relevance" in result
        assert "metadata" in result

def test_rate_limiting(test_client_query, test_token):
    """Test rate limiting functionality."""
    # Configure a very low rate limit for testing
    app.state.rate_limit_requests = 2
    app.state.rate_limit_period = 60
    
    # Make requests until rate limited
    for _ in range(3):
        response = test_client_query.post(
            "/query",
            json={"query": "test query"},
            headers={"Authorization": f"Bearer {test_token}"}
        )
        if response.status_code == 429:
            break
    
    assert response.status_code == 429
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert "X-RateLimit-Reset" in response.headers

@pytest.mark.asyncio
async def test_caching(
    test_client_query,
    test_token,
    mock_openai_embeddings
):
    """Test query caching functionality."""
    cache = get_cache_client()
    
    # First query should miss cache
    response1 = test_client_query.post(
        "/query",
        json={"query": "test cache query"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response1.status_code == 200
    
    # Second identical query should hit cache
    response2 = test_client_query.post(
        "/query",
        json={"query": "test cache query"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response2.status_code == 200
    assert response1.json() == response2.json()

def test_error_handling(test_client_query, test_token):
    """Test error handling for invalid inputs."""
    # Test empty query
    response = test_client_query.post(
        "/query",
        json={"query": ""},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 422
    
    # Test invalid max_results
    response = test_client_query.post(
        "/query",
        json={
            "query": "test",
            "max_results": -1
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 422

def test_monitoring_metrics(test_client_query, test_token):
    """Test monitoring endpoints and metrics."""
    # Make some requests to generate metrics
    test_client_query.get("/health")
    test_client_query.post(
        "/query",
        json={"query": "test query"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    # Verify metrics endpoint
    response = test_client_query.get("/metrics")
    assert response.status_code == 200
    metrics_text = response.text
    
    # Check for expected metrics
    assert "query_processing_seconds" in metrics_text
    assert "queries_total" in metrics_text
    assert "cache_operations_total" in metrics_text
    assert "rate_limits_total" in metrics_text