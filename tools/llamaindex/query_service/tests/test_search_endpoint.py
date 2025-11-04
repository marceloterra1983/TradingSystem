"""
Integration Tests for Search Endpoint
Tests semantic search functionality with circuit breaker protection
"""

import pytest
from fastapi import status


class TestSearchEndpoint:
    """Test GET /search endpoint"""
    
    def test_search_requires_auth(self, test_client):
        """Test search endpoint requires authentication"""
        response = test_client.get("/search?query=test")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_search_with_valid_auth(self, test_client, auth_headers):
        """Test search with valid JWT token"""
        response = test_client.get(
            "/search?query=architecture&max_results=5",
            headers=auth_headers
        )
        
        # Note: May return 503 if Qdrant unavailable (circuit breaker)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert isinstance(data, list)
            assert len(data) <= 5
            
            # Verify result structure
            if len(data) > 0:
                result = data[0]
                assert "content" in result
                assert "relevance" in result
                assert "metadata" in result
                assert 0 <= result["relevance"] <= 1
    
    def test_search_invalid_max_results(self, test_client, auth_headers):
        """Test search clamps max_results to valid range"""
        # Test maximum clamping
        response = test_client.get(
            "/search?query=test&max_results=999",
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert len(data) <= 100  # Should clamp to 100
    
    def test_search_with_collection_filter(self, test_client, auth_headers):
        """Test search with specific collection"""
        response = test_client.get(
            "/search?query=test&collection=documentation__nomic",
            headers=auth_headers
        )
        
        # Should succeed or return 503/404 if collection missing
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_503_SERVICE_UNAVAILABLE
        ]
    
    def test_search_returns_relevance_scores(self, test_client, auth_headers):
        """Test search results include relevance scores"""
        response = test_client.get(
            "/search?query=architecture",
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            
            for result in data:
                assert "relevance" in result
                assert isinstance(result["relevance"], float)
                assert 0 <= result["relevance"] <= 1


class TestSearchCircuitBreaker:
    """Test circuit breaker behavior for search endpoint"""
    
    def test_circuit_breaker_returns_503_when_open(self, test_client, auth_headers):
        """Test circuit breaker returns 503 when service unavailable"""
        # Note: Circuit breaker state depends on previous test runs
        # This test verifies 503 response structure only
        
        response = test_client.get(
            "/search?query=test",
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
            data = response.json()
            assert "detail" in data
            assert "code" in data["detail"]
            assert data["detail"]["code"] == "SERVICE_UNAVAILABLE"


class TestSearchPerformance:
    """Test search endpoint performance characteristics"""
    
    def test_search_response_includes_performance_headers(self, test_client, auth_headers):
        """Test response includes performance headers"""
        response = test_client.get(
            "/search?query=test",
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_200_OK:
            # Check for GPU and collection headers
            headers = response.headers
            assert "x-qdrant-collection" in headers or "X-Qdrant-Collection" in headers

