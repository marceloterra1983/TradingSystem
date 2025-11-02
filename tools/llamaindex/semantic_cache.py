"""
Semantic Query Caching for RAG System

OPT-007: Semantic Query Caching
- Expected: ~4950ms latency reduction (5000ms -> 50ms for cached queries)
- Similarity-based caching using sentence embeddings
- Redis-backed with sentence-transformers for similarity matching
"""

import json
import logging
import hashlib
from typing import Optional, Dict, Any, List
import numpy as np
from sentence_transformers import SentenceTransformer
import redis

logger = logging.getLogger(__name__)


class SemanticCache:
    """
    Semantic caching system for RAG queries using sentence embeddings
    """

    def __init__(
        self,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_db: int = 2,
        embedding_model: str = "all-MiniLM-L6-v2",
        similarity_threshold: float = 0.95,
        ttl: int = 3600
    ):
        """
        Initialize semantic cache

        Args:
            redis_host: Redis server host
            redis_port: Redis server port
            redis_db: Redis database number (use separate DB for semantic cache)
            embedding_model: Sentence transformer model name
            similarity_threshold: Minimum similarity for cache hit (0.0-1.0)
            ttl: Cache TTL in seconds (default: 1 hour)
        """
        self.redis = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=False  # Keep binary for numpy arrays
        )

        self.encoder = SentenceTransformer(embedding_model)
        self.similarity_threshold = similarity_threshold
        self.ttl = ttl

        logger.info(
            f"Semantic cache initialized with {embedding_model}, "
            f"similarity threshold: {similarity_threshold}"
        )

    def _encode_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for query

        Args:
            query: Query text

        Returns:
            Query embedding as numpy array
        """
        return self.encoder.encode(query, convert_to_numpy=True)

    def _compute_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Compute cosine similarity between two embeddings

        Args:
            emb1: First embedding
            emb2: Second embedding

        Returns:
            Cosine similarity score (0.0-1.0)
        """
        return float(
            np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        )

    def _generate_cache_key(self, query: str) -> str:
        """
        Generate deterministic cache key from query

        Args:
            query: Query text

        Returns:
            Cache key (MD5 hash)
        """
        return f"semantic:{hashlib.md5(query.encode()).hexdigest()}"

    async def get(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response for semantically similar query

        Args:
            query: Query text

        Returns:
            Cached response dict or None if no similar query found
        """
        try:
            query_embedding = self._encode_query(query)

            # Get all semantic cache keys
            cache_keys = self.redis.keys("semantic:*")

            if not cache_keys:
                logger.debug("No cached queries found")
                return None

            # Find most similar cached query
            max_similarity = 0.0
            best_match_key = None

            for key in cache_keys:
                cached_data = self.redis.hgetall(key)

                if not cached_data or b'embedding' not in cached_data:
                    continue

                # Deserialize cached embedding
                cached_embedding = np.frombuffer(
                    cached_data[b'embedding'],
                    dtype=np.float32
                )

                # Compute similarity
                similarity = self._compute_similarity(query_embedding, cached_embedding)

                if similarity > max_similarity:
                    max_similarity = similarity
                    best_match_key = key

            # Check if best match exceeds threshold
            if max_similarity >= self.similarity_threshold:
                cached_data = self.redis.hgetall(best_match_key)

                result = {
                    'answer': cached_data[b'answer'].decode('utf-8'),
                    'sources': json.loads(cached_data[b'sources'].decode('utf-8')),
                    'original_query': cached_data[b'query'].decode('utf-8'),
                    'similarity': max_similarity,
                    'cached': True
                }

                logger.info(
                    f"Semantic cache HIT (similarity: {max_similarity:.4f}): "
                    f"{query[:50]}... -> {result['original_query'][:50]}..."
                )

                return result

            logger.debug(
                f"Semantic cache MISS (max similarity: {max_similarity:.4f} "
                f"< threshold: {self.similarity_threshold})"
            )

            return None

        except Exception as e:
            logger.error(f"Semantic cache get error: {e}")
            return None

    async def set(
        self,
        query: str,
        answer: str,
        sources: List[Dict[str, Any]]
    ) -> bool:
        """
        Cache query response with semantic embedding

        Args:
            query: Query text
            answer: Generated answer
            sources: List of source documents

        Returns:
            True if cached successfully
        """
        try:
            query_embedding = self._encode_query(query)
            cache_key = self._generate_cache_key(query)

            # Store as Redis hash with TTL
            self.redis.hset(
                cache_key,
                mapping={
                    'query': query,
                    'answer': answer,
                    'sources': json.dumps(sources),
                    'embedding': query_embedding.tobytes(),
                    'similarity_threshold': str(self.similarity_threshold)
                }
            )

            self.redis.expire(cache_key, self.ttl)

            logger.info(f"Cached query: {query[:50]}...")

            return True

        except Exception as e:
            logger.error(f"Semantic cache set error: {e}")
            return False

    def invalidate(self, pattern: str = "semantic:*") -> int:
        """
        Invalidate cached queries matching pattern

        Args:
            pattern: Redis key pattern

        Returns:
            Number of keys deleted
        """
        try:
            keys = self.redis.keys(pattern)

            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} semantic cache entries")
                return deleted

            return 0

        except Exception as e:
            logger.error(f"Semantic cache invalidation error: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """
        Get semantic cache statistics

        Returns:
            Cache statistics dict
        """
        try:
            keys = self.redis.keys("semantic:*")

            return {
                'total_cached_queries': len(keys),
                'similarity_threshold': self.similarity_threshold,
                'ttl_seconds': self.ttl,
                'embedding_model': self.encoder.get_sentence_embedding_dimension()
            }

        except Exception as e:
            logger.error(f"Failed to get semantic cache stats: {e}")
            return {'error': str(e)}


# Global semantic cache instance
_semantic_cache: Optional[SemanticCache] = None


def get_semantic_cache() -> SemanticCache:
    """
    Get or create global semantic cache instance

    Returns:
        SemanticCache instance
    """
    global _semantic_cache

    if _semantic_cache is None:
        _semantic_cache = SemanticCache()

    return _semantic_cache
