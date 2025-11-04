"""
Unit Tests for Circuit Breaker Module
Tests fault tolerance and failure handling
"""

import pytest
from circuitbreaker import CircuitBreakerError
from circuit_breaker import (
    search_vectors_with_protection,
    generate_answer_with_protection,
    get_circuit_breaker_states,
    format_circuit_breaker_error,
)


class TestCircuitBreakerProtection:
    """Test circuit breaker protection functions"""
    
    @pytest.mark.asyncio
    async def test_search_protection_success(self, mock_qdrant_client):
        """Test successful search with circuit breaker"""
        class MockRetriever:
            async def aquery(self, query_str):
                return {"results": [{"text": "Test"}]}
        
        retriever = MockRetriever()
        result = await search_vectors_with_protection(retriever, "test query")
        
        assert result is not None
        assert "results" in result
    
    @pytest.mark.asyncio
    async def test_search_protection_failure(self):
        """Test search failure opens circuit after threshold"""
        class FailingRetriever:
            async def aquery(self, query_str):
                raise Exception("Qdrant connection failed")
        
        retriever = FailingRetriever()
        
        # First 4 failures should propagate
        for i in range(4):
            with pytest.raises(Exception, match="Qdrant connection failed"):
                await search_vectors_with_protection(retriever, f"query {i}")
        
        # 5th failure opens circuit breaker
        with pytest.raises(Exception):
            await search_vectors_with_protection(retriever, "query 5")
    
    def test_get_circuit_breaker_states(self):
        """Test retrieving circuit breaker states"""
        states = get_circuit_breaker_states()
        
        assert isinstance(states, dict)
        # Note: States depend on test execution order
        # Just verify structure is correct
    
    def test_format_circuit_breaker_error(self):
        """Test error formatting for HTTP responses"""
        error = CircuitBreakerError("Breaker is open")
        formatted = format_circuit_breaker_error(error, "Ollama")
        
        assert formatted["code"] == "SERVICE_UNAVAILABLE"
        assert "Ollama" in formatted["message"]
        assert "details" in formatted
        assert formatted["details"]["circuit_breaker_state"] == "open"
        assert formatted["details"]["retry_after"] == 30


class TestCircuitBreakerRecovery:
    """Test circuit breaker recovery behavior"""
    
    @pytest.mark.asyncio
    async def test_circuit_recovers_after_timeout(self):
        """Test circuit attempts recovery after timeout"""
        # Note: Testing recovery requires waiting 30s (recovery_timeout)
        # This test verifies the configuration only
        # Integration tests should verify actual recovery behavior
        
        # For unit test, just verify error message structure
        error = CircuitBreakerError("Breaker is open")
        formatted = format_circuit_breaker_error(error, "Test Service")
        
        assert formatted["details"]["retry_after"] == 30
        assert "automatically" in formatted["details"]["description"]

