/**
 * Qdrant Cluster Connection Configuration
 * 
 * @module backend/shared/config/qdrant-cluster
 * @description Provides connection configuration for Qdrant 3-node cluster via load balancer
 */

import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Get Qdrant connection configuration
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Qdrant client configuration
 */
export function getQdrantConfig(options = {}) {
  const env = process.env.NODE_ENV || 'development';
  
  // Determine Qdrant URL based on environment
  let qdrantUrl;
  
  if (process.env.QDRANT_CLUSTER_ENABLED === 'true') {
    // Use cluster load balancer (production/staging)
    qdrantUrl = process.env.QDRANT_CLUSTER_URL || 'http://qdrant-lb:80';
  } else {
    // Use single instance (development/testing)
    qdrantUrl = process.env.QDRANT_URL || 'http://data-qdrant:6333';
  }
  
  return {
    url: qdrantUrl,
    
    // API key (if cluster has authentication enabled)
    apiKey: process.env.QDRANT_API_KEY || null,
    
    // Timeout configuration
    timeout: parseInt(process.env.QDRANT_TIMEOUT) || 30000,
    
    // Retry configuration
    maxRetries: parseInt(process.env.QDRANT_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.QDRANT_RETRY_DELAY) || 1000,
    
    // gRPC options (if using gRPC instead of HTTP)
    grpcPort: parseInt(process.env.QDRANT_GRPC_PORT) || 6334,
    
    // Prefer gRPC for better performance (if available)
    prefer_grpc: process.env.QDRANT_PREFER_GRPC === 'true',
  };
}

/**
 * Create Qdrant client instance
 * 
 * @param {Object} options - Configuration options
 * @returns {QdrantClient} Qdrant client instance
 */
export function createQdrantClient(options = {}) {
  const config = getQdrantConfig(options);
  
  const client = new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
    timeout: config.timeout,
  });
  
  return client;
}

/**
 * Test Qdrant cluster connectivity and health
 * 
 * @returns {Promise<Object>} Cluster health status
 */
export async function testQdrantCluster() {
  const client = createQdrantClient();
  
  try {
    // Test 1: Basic connectivity
    const collections = await client.getCollections();
    console.log(`✅ Qdrant accessible (${collections.collections.length} collections)`);
    
    // Test 2: Cluster status (if cluster mode enabled)
    if (process.env.QDRANT_CLUSTER_ENABLED === 'true') {
      try {
        const clusterInfo = await client.api('cluster', {
          method: 'GET',
        });
        
        console.log('✅ Qdrant cluster status:');
        console.log(`   Role: ${clusterInfo.raft_info.role}`);
        console.log(`   Term: ${clusterInfo.raft_info.term}`);
        console.log(`   Peers: ${Object.keys(clusterInfo.peers).length + 1} nodes`);
        console.log(`   Pending ops: ${clusterInfo.raft_info.pending_operations}`);
        
        return {
          healthy: true,
          mode: 'cluster',
          role: clusterInfo.raft_info.role,
          peers: Object.keys(clusterInfo.peers).length + 1,
        };
      } catch (error) {
        console.warn('⚠️  Cluster info not available (may be single instance)');
      }
    }
    
    return {
      healthy: true,
      mode: 'single',
      collections: collections.collections.length,
    };
    
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error.message);
    return {
      healthy: false,
      error: error.message,
    };
  }
}

/**
 * Get Qdrant cluster statistics
 * 
 * @returns {Promise<Object>} Cluster statistics
 */
export async function getQdrantClusterStats() {
  const client = createQdrantClient();
  
  try {
    const collections = await client.getCollections();
    const stats = {
      collections: [],
      totalPoints: 0,
      totalSegments: 0,
    };
    
    for (const collection of collections.collections) {
      const info = await client.getCollection(collection.name);
      stats.collections.push({
        name: collection.name,
        points: info.points_count,
        segments: info.segments_count,
        vectorSize: info.config.params.vectors?.size,
      });
      stats.totalPoints += info.points_count || 0;
      stats.totalSegments += info.segments_count || 0;
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get cluster stats:', error.message);
    return null;
  }
}

/**
 * Migration helper: Determine if cluster migration is needed
 * 
 * @returns {boolean} True if migration needed
 */
export function needsClusterMigration() {
  const clusterEnabled = process.env.QDRANT_CLUSTER_ENABLED === 'true';
  const migrationComplete = process.env.QDRANT_CLUSTER_MIGRATION_COMPLETE === 'true';
  
  return clusterEnabled && !migrationComplete;
}

export default {
  getQdrantConfig,
  createQdrantClient,
  testQdrantCluster,
  getQdrantClusterStats,
  needsClusterMigration,
};

