"""
Embedding Cache for LlamaIndex Query Service
Caches Ollama embeddings to avoid regeneration (50-100ms → 0ms)
"""

import hashlib
import time
from typing import List, Optional, Dict, Any
from collections import OrderedDict


class EmbeddingCache:
    """LRU cache for embeddings"""
    
    def __init__(self, max_size: int = 10000, ttl: int = 3600):
        """
        Initialize embedding cache
        
        Args:
            max_size: Maximum number of cached embeddings
            ttl: Time-to-live in seconds (default: 1 hour)
        """
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def _generate_key(self, text: str) -> str:
        """Generate cache key from text"""
        normalized = text.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    def get(self, text: str) -> Optional[List[float]]:
        """
        Get cached embedding
        
        Args:
            text: Query text
            
        Returns:
            Embedding vector or None if cache miss
        """
        key = self._generate_key(text)
        
        if key in self.cache:
            cached = self.cache[key]
            
            # Check if expired
            if time.time() - cached['timestamp'] < self.ttl:
                self.hits += 1
                
                # Move to end (LRU)
                self.cache.move_to_end(key)
                
                return cached['embedding']
            else:
                # Expired, remove
                del self.cache[key]
        
        self.misses += 1
        return None
    
    def set(self, text: str, embedding: List[float]) -> None:
        """
        Set embedding in cache
        
        Args:
            text: Query text
            embedding: Embedding vector
        """
        key = self._generate_key(text)
        
        # LRU eviction if full
        if len(self.cache) >= self.max_size:
            # Remove oldest (first item)
            self.cache.popitem(last=False)
            self.evictions += 1
        
        self.cache[key] = {
            'embedding': embedding,
            'timestamp': time.time(),
            'text_preview': text[:100],  # For debugging
        }
    
    def invalidate(self, text: str) -> None:
        """Invalidate specific cache entry"""
        key = self._generate_key(text)
        if key in self.cache:
            del self.cache[key]
    
    def clear(self) -> None:
        """Clear entire cache"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self.hits + self.misses
        
        return {
            'hits': self.hits,
            'misses': self.misses,
            'evictions': self.evictions,
            'hit_rate': f"{(self.hits / total * 100):.2f}%" if total > 0 else "0%",
            'cache_size': len(self.cache),
            'max_size': self.max_size,
            'utilization': f"{(len(self.cache) / self.max_size * 100):.2f}%",
        }
    
    def get_size_estimate(self) -> Dict[str, Any]:
        """Estimate cache memory usage"""
        # Each embedding: 384 floats * 4 bytes = 1536 bytes
        # Plus metadata: ~200 bytes
        # Total: ~1.7KB per entry
        
        bytes_per_entry = 1736
        total_bytes = len(self.cache) * bytes_per_entry
        total_mb = total_bytes / 1024 / 1024
        
        return {
            'entries': len(self.cache),
            'estimated_mb': f"{total_mb:.2f}",
            'max_estimated_mb': f"{(self.max_size * bytes_per_entry / 1024 / 1024):.2f}",
        }


# Global singleton instance
_embedding_cache = None


def get_embedding_cache(max_size: int = 10000, ttl: int = 3600) -> EmbeddingCache:
    """Get global embedding cache instance"""
    global _embedding_cache
    
    if _embedding_cache is None:
        _embedding_cache = EmbeddingCache(max_size=max_size, ttl=ttl)
    
    return _embedding_cache

