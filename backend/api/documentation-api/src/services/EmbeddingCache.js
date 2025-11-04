/**
 * Embedding Cache Service
 * Caches Ollama embeddings to avoid regeneration (50-100ms → 0ms)
 */

import crypto from 'crypto';

class EmbeddingCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 5000;  // 5000 unique queries
    this.ttl = options.ttl || 3600000;  // 1 hour
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
  
  /**
   * Generate cache key from text
   */
  _generateKey(text) {
    return crypto
      .createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16);
  }
  
  /**
   * Get cached embedding
   * @param {string} text - Query text
   * @returns {Array<number> | null} - Embedding vector or null if miss
   */
  get(text) {
    const key = this._generateKey(text);
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      
      // Check if expired
      if (Date.now() - cached.timestamp < this.ttl) {
        this.hits++;
        
        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, cached);
        
        return cached.embedding;
      } else {
        // Expired
        this.cache.delete(key);
      }
    }
    
    this.misses++;
    return null;
  }
  
  /**
   * Set embedding in cache
   * @param {string} text - Query text
   * @param {Array<number>} embedding - Embedding vector
   */
  set(text, embedding) {
    const key = this._generateKey(text);
    
    // LRU eviction if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.evictions++;
    }
    
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      text: text.substring(0, 100),  // Store first 100 chars for debugging
    });
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%',
    };
  }
  
  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
  
  /**
   * Get cache size in MB (approximate)
   */
  getSizeEstimate() {
    // Each embedding: 384 floats * 4 bytes = 1536 bytes
    // Plus metadata: ~100 bytes
    // Total per entry: ~1.6KB
    
    const bytesPerEntry = 1636;
    const totalBytes = this.cache.size * bytesPerEntry;
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    
    return {
      entries: this.cache.size,
      estimatedMB: totalMB,
      maxEstimatedMB: ((this.maxSize * bytesPerEntry) / 1024 / 1024).toFixed(2),
    };
  }
}

export default EmbeddingCache;

