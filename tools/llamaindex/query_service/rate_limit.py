"""
Rate limiting module for the query service.
Implements token bucket algorithm for rate limiting.
"""

import os
import time
from typing import Dict, Tuple
from datetime import datetime
from functools import wraps

from fastapi import HTTPException, Request
from pydantic import BaseModel

class TokenBucket:
    """Token bucket rate limiter implementation."""
    
    def __init__(self, tokens: int, seconds: int):
        self.tokens = tokens
        self.seconds = seconds
        self.last_update = time.time()
        self.current_tokens = tokens
    
    def _update_tokens(self):
        """Update available tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_update
        new_tokens = elapsed * (self.tokens / self.seconds)
        self.current_tokens = min(self.tokens, self.current_tokens + new_tokens)
        self.last_update = now
    
    def consume(self, tokens: int = 1) -> bool:
        """
        Try to consume tokens from the bucket.
        Returns True if successful, False if not enough tokens.
        """
        self._update_tokens()
        if self.current_tokens >= tokens:
            self.current_tokens -= tokens
            return True
        return False

class RateLimiter:
    """Rate limiter for API endpoints."""
    
    def __init__(self):
        self.buckets: Dict[str, TokenBucket] = {}
        self.requests_per_period = int(os.getenv("RATE_LIMIT_REQUESTS", 100))
        self.period_seconds = int(os.getenv("RATE_LIMIT_PERIOD", 60))
    
    def get_bucket(self, key: str) -> TokenBucket:
        """Get or create a token bucket for the given key."""
        if key not in self.buckets:
            self.buckets[key] = TokenBucket(
                self.requests_per_period,
                self.period_seconds
            )
        return self.buckets[key]
    
    async def check_rate_limit(self, key: str) -> Tuple[bool, Dict]:
        """
        Check if the request should be rate limited.
        Returns (allowed, headers) tuple.
        """
        bucket = self.get_bucket(key)
        allowed = bucket.consume()
        
        # Calculate rate limit headers
        headers = {
            "X-RateLimit-Limit": str(self.requests_per_period),
            "X-RateLimit-Remaining": str(int(bucket.current_tokens)),
            "X-RateLimit-Reset": str(int(bucket.last_update + self.period_seconds))
        }
        
        return allowed, headers

# Global rate limiter instance
_rate_limiter = RateLimiter()

def rate_limiter(func):
    """Decorator to apply rate limiting to endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get("request") or args[0]
        
        # Get client identifier (IP address or user token)
        client_id = request.client.host
        if "authorization" in request.headers:
            client_id = request.headers["authorization"]
        
        # Check rate limit
        allowed, headers = await _rate_limiter.check_rate_limit(client_id)
        
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests",
                headers=headers
            )
        
        # Add rate limit headers to response
        response = await func(*args, **kwargs)
        
        # If response is a Pydantic model, we need to handle it differently
        if isinstance(response, BaseModel):
            return response
        
        # Assuming response is a dict or similar
        if isinstance(response, dict):
            response.update({"headers": headers})
        
        return response
    
    return wrapper