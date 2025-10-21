"""
Caching module for the query service.
"""

import os
from typing import Optional, Any
import json
from datetime import datetime

from cachetools import TTLCache
from redis import asyncio as aioredis

class BaseCache:
    """Base cache interface."""
    
    async def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError
    
    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        raise NotImplementedError
    
    async def delete(self, key: str) -> bool:
        raise NotImplementedError

class MemoryCache(BaseCache):
    """In-memory cache implementation using TTLCache."""
    
    def __init__(self, ttl: int = 3600, maxsize: int = 1000):
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)
    
    async def get(self, key: str) -> Optional[Any]:
        return self.cache.get(key)
    
    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        try:
            self.cache[key] = value
            return True
        except Exception:
            return False
    
    async def delete(self, key: str) -> bool:
        try:
            del self.cache[key]
            return True
        except KeyError:
            return False

class RedisCache(BaseCache):
    """Redis cache implementation."""
    
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
    
    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        try:
            value_str = json.dumps(value, default=str)
            await self.redis.setex(key, expire, value_str)
            return True
        except Exception:
            return False
    
    async def delete(self, key: str) -> bool:
        deleted = await self.redis.delete(key)
        return bool(deleted)

# Cache factory
def get_cache_client() -> BaseCache:
    """
    Get the appropriate cache client based on configuration.
    """
    cache_type = os.getenv("CACHE_TYPE", "memory")
    
    if cache_type == "redis":
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = os.getenv("REDIS_PORT", 6379)
        redis_url = f"redis://{redis_host}:{redis_port}"
        return RedisCache(redis_url)
    
    # Default to memory cache
    return MemoryCache()