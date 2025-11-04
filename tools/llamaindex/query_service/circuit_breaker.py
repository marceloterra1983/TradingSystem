"""
Circuit Breaker Implementation for RAG Services
Protects against cascading failures when calling Ollama and Qdrant
"""

import logging
from typing import Callable, Any
from circuitbreaker import circuit, CircuitBreakerError

logger = logging.getLogger(__name__)

# Circuit breaker configuration
FAILURE_THRESHOLD = 5      # Open after 5 consecutive failures
RECOVERY_TIMEOUT = 30      # Attempt recovery after 30 seconds
EXPECTED_EXCEPTION = Exception  # Catch all exceptions

class CircuitBreakerMonitor:
    """Monitor circuit breaker state for observability"""
    
    def __init__(self):
        self.states = {
            'ollama_embedding': 'closed',
            'ollama_generation': 'closed',
            'qdrant_search': 'closed',
        }
    
    def on_state_change(self, name: str, old_state: str, new_state: str):
        """Callback when circuit breaker state changes"""
        self.states[name] = new_state
        logger.warning(
            "Circuit breaker state changed: %s %s → %s",
            name, old_state, new_state
        )
    
    def get_all_states(self) -> dict:
        """Get current state of all circuit breakers"""
        return self.states.copy()


# Global monitor instance
_monitor = CircuitBreakerMonitor()


@circuit(
    failure_threshold=FAILURE_THRESHOLD,
    recovery_timeout=RECOVERY_TIMEOUT,
    expected_exception=EXPECTED_EXCEPTION,
    name='ollama_embedding'
)
async def generate_embedding_with_protection(embed_model, text: str) -> list:
    """
    Generate text embedding with circuit breaker protection.
    
    Args:
        embed_model: Ollama embedding model instance
        text: Text to embed
    
    Returns:
        Embedding vector (list of floats)
    
    Raises:
        CircuitBreakerError: When circuit is open (Ollama unavailable)
        Exception: Original exception if circuit is closed
    """
    try:
        # Call actual embedding generation
        result = await embed_model.aget_text_embedding(text)
        logger.debug("Embedding generated successfully via circuit breaker")
        return result
    except Exception as e:
        logger.error("Embedding generation failed: %s", str(e))
        raise


@circuit(
    failure_threshold=FAILURE_THRESHOLD,
    recovery_timeout=RECOVERY_TIMEOUT,
    expected_exception=EXPECTED_EXCEPTION,
    name='ollama_generation'
)
async def generate_answer_with_protection(llm, prompt: str) -> str:
    """
    Generate LLM answer with circuit breaker protection.
    
    Args:
        llm: Ollama LLM instance
        prompt: Prompt text
    
    Returns:
        Generated answer text
    
    Raises:
        CircuitBreakerError: When circuit is open (Ollama LLM unavailable)
    """
    try:
        result = await llm.acomplete(prompt)
        logger.debug("LLM generation successful via circuit breaker")
        return str(result)
    except Exception as e:
        logger.error("LLM generation failed: %s", str(e))
        raise


@circuit(
    failure_threshold=FAILURE_THRESHOLD,
    recovery_timeout=RECOVERY_TIMEOUT,
    expected_exception=EXPECTED_EXCEPTION,
    name='qdrant_search'
)
async def search_vectors_with_protection(
    retriever, 
    query_str: str
) -> Any:
    """
    Search vectors in Qdrant with circuit breaker protection.
    
    Args:
        retriever: Query engine or retriever instance
        query_str: Query string
    
    Returns:
        Search results
    
    Raises:
        CircuitBreakerError: When circuit is open (Qdrant unavailable)
    """
    try:
        result = await retriever.aquery(query_str)
        logger.debug("Vector search successful via circuit breaker")
        return result
    except Exception as e:
        logger.error("Vector search failed: %s", str(e))
        raise


def get_circuit_breaker_states() -> dict:
    """
    Get current state of all circuit breakers.
    
    Returns:
        Dict with circuit breaker names and states (closed, open, half_open)
    """
    return _monitor.get_all_states()


def format_circuit_breaker_error(error: CircuitBreakerError, service_name: str) -> dict:
    """
    Format circuit breaker error for HTTP response.
    
    Args:
        error: CircuitBreakerError instance
        service_name: Name of failed service (e.g., "Ollama", "Qdrant")
    
    Returns:
        Dict with error details for HTTP response
    """
    return {
        "code": "SERVICE_UNAVAILABLE",
        "message": f"{service_name} service is temporarily unavailable",
        "details": {
            "service": service_name.lower(),
            "circuit_breaker_state": "open",
            "retry_after": RECOVERY_TIMEOUT,
            "description": "Circuit breaker is open due to repeated failures. Service will attempt recovery automatically."
        }
    }

