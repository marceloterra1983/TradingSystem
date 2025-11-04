import pg from 'pg';
import { loadDatabaseConfig, type DatabaseConfig } from '../config/database.config.js';

/**
 * Database Connection Factory
 * 
 * Centralized management of database connection pools.
 * Ensures single connection pool per database, proper error handling,
 * and health monitoring.
 * 
 * @example
 * ```typescript
 * // Initialize pool
 * DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
 * 
 * // Get pool
 * const pool = DatabaseConnectionFactory.getPool('timescale');
 * const result = await pool.query('SELECT * FROM items');
 * 
 * // Health check
 * const isHealthy = await DatabaseConnectionFactory.healthCheck('timescale');
 * 
 * // Get stats
 * const stats = DatabaseConnectionFactory.getStats('timescale');
 * console.log(`Active connections: ${stats.totalCount}`);
 * ```
 */

interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
}

interface PoolMetadata {
  name: string;
  config: DatabaseConfig;
  initializedAt: Date;
  lastHealthCheck?: Date;
  lastHealthStatus?: boolean;
}

export class DatabaseConnectionFactory {
  private static pools = new Map<string, pg.Pool>();
  private static metadata = new Map<string, PoolMetadata>();

  /**
   * Initialize a database connection pool
   * 
   * @param name - Unique pool name (e.g., 'timescale', 'questdb')
   * @param envPrefix - Environment variable prefix (e.g., 'TIMESCALEDB')
   */
  static initialize(name: string, envPrefix: string = 'TIMESCALEDB'): void {
    if (this.pools.has(name)) {
      console.warn(`⚠️  Pool '${name}' already initialized, skipping`);
      return;
    }

    console.log(`🔧 Initializing connection pool: ${name} (env: ${envPrefix}_*)`);

    const config = loadDatabaseConfig(envPrefix);

    const pool = new pg.Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });

    // Log pool errors
    pool.on('error', (err, client) => {
      console.error(`❌ Pool '${name}' error:`, err.message);
      console.error('   Stack:', err.stack);
    });

    // Log new connections (debug mode)
    if (process.env.DEBUG_DB === 'true') {
      pool.on('connect', (client) => {
        console.log(`🔌 Pool '${name}': New connection established`);
      });

      pool.on('remove', (client) => {
        console.log(`🔌 Pool '${name}': Connection removed`);
      });
    }

    this.pools.set(name, pool);
    this.metadata.set(name, {
      name,
      config,
      initializedAt: new Date(),
    });

    console.log(`✅ Pool '${name}' initialized successfully`);
    console.log(`   → ${config.host}:${config.port}/${config.database}`);
    console.log(`   → Max connections: ${config.pool.max}`);
  }

  /**
   * Get an initialized connection pool
   * 
   * @param name - Pool name
   * @returns PostgreSQL connection pool
   * @throws Error if pool not initialized
   */
  static getPool(name: string): pg.Pool {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(
        `Pool '${name}' not initialized. Call DatabaseConnectionFactory.initialize('${name}', 'ENV_PREFIX') first.`
      );
    }
    return pool;
  }

  /**
   * Check if a pool is initialized
   */
  static hasPool(name: string): boolean {
    return this.pools.has(name);
  }

  /**
   * Get pool metadata
   */
  static getMetadata(name: string): PoolMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Perform health check on database pool
   * 
   * @param name - Pool name
   * @returns true if healthy, false otherwise
   */
  static async healthCheck(name: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const pool = this.getPool(name);
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT 1 as health');
        const isHealthy = result.rows[0].health === 1;
        
        const metadata = this.metadata.get(name);
        if (metadata) {
          metadata.lastHealthCheck = new Date();
          metadata.lastHealthStatus = isHealthy;
        }
        
        const duration = Date.now() - startTime;
        console.log(`✅ Health check '${name}': OK (${duration}ms)`);
        
        return isHealthy;
      } finally {
        client.release();
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Health check '${name}': FAILED (${duration}ms)`);
      console.error(`   Error: ${error.message}`);
      
      const metadata = this.metadata.get(name);
      if (metadata) {
        metadata.lastHealthCheck = new Date();
        metadata.lastHealthStatus = false;
      }
      
      return false;
    }
  }

  /**
   * Get connection pool statistics
   */
  static getStats(name: string): PoolStats {
    const pool = this.getPool(name);
    
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      maxConnections: pool.options.max ?? 10,
    };
  }

  /**
   * Get all pool names
   */
  static listPools(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Close a specific pool
   */
  static async close(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (pool) {
      await pool.end();
      this.pools.delete(name);
      this.metadata.delete(name);
      console.log(`✅ Pool '${name}' closed`);
    }
  }

  /**
   * Close all connection pools
   * Should be called on application shutdown
   */
  static async closeAll(): Promise<void> {
    console.log('🔌 Closing all database connection pools...');
    
    for (const [name, pool] of this.pools) {
      try {
        await pool.end();
        console.log(`   ✅ Closed pool: ${name}`);
      } catch (error: any) {
        console.error(`   ❌ Failed to close pool '${name}':`, error.message);
      }
    }
    
    this.pools.clear();
    this.metadata.clear();
    
    console.log('✅ All pools closed');
  }

  /**
   * Get comprehensive health status for all pools
   */
  static async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const name of this.pools.keys()) {
      results[name] = await this.healthCheck(name);
    }
    
    return results;
  }

  /**
   * Get comprehensive stats for all pools
   */
  static getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    
    for (const name of this.pools.keys()) {
      stats[name] = this.getStats(name);
    }
    
    return stats;
  }
}

/**
 * Graceful shutdown handler
 * Call this on process termination signals
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n📡 Received ${signal}, gracefully shutting down...`);
  
  try {
    await DatabaseConnectionFactory.closeAll();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Register shutdown handlers
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

