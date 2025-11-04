import pg from 'pg';

/**
 * Database Initialization Service
 * 
 * Ensures databases and extensions exist before applications start.
 * Idempotent operations - safe to run multiple times.
 * 
 * @example
 * ```typescript
 * // In server startup
 * await DatabaseInitializer.initializeAllDatabases();
 * 
 * // Then initialize connection pools
 * DatabaseConnectionFactory.initialize('timescale', 'TIMESCALEDB');
 * ```
 */

export interface DatabaseSpec {
  name: string;
  extensions?: string[];
  schemas?: string[];
}

export class DatabaseInitializer {
  /**
   * Ensure a database exists, create if not
   * 
   * @param adminPort - Port of PostgreSQL instance (default: 7000)
   * @param dbName - Database name to create
   * @param extensions - PostgreSQL extensions to install (default: ['timescaledb'])
   * @param schemas - Additional schemas to create (default: [])
   */
  static async ensureDatabase(
    adminPort: number,
    dbName: string,
    extensions: string[] = ['timescaledb'],
    schemas: string[] = []
  ): Promise<void> {
    const user = process.env.TIMESCALEDB_USER || 'timescale';
    const password = process.env.TIMESCALEDB_PASSWORD;

    if (!password) {
      throw new Error('TIMESCALEDB_PASSWORD not set in environment');
    }

    const adminPool = new pg.Pool({
      host: 'localhost',
      port: adminPort,
      user,
      password,
      database: 'postgres', // Connect to default database
      max: 2, // Minimal pool for admin operations
    });

    try {
      console.log(`🔍 Checking database: ${dbName}`);

      // Check if database exists
      const checkResult = await adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );

      if (checkResult.rows.length === 0) {
        console.log(`   📝 Creating database: ${dbName}`);
        await adminPool.query(`CREATE DATABASE "${dbName}"`);
        console.log(`   ✅ Database created: ${dbName}`);
      } else {
        console.log(`   ✅ Database exists: ${dbName}`);
      }

      // Install extensions and create schemas
      if (extensions.length > 0 || schemas.length > 0) {
        const dbPool = new pg.Pool({
          host: 'localhost',
          port: adminPort,
          user,
          password,
          database: dbName,
          max: 2,
        });

        try {
          // Install extensions
          for (const ext of extensions) {
            try {
              await dbPool.query(`CREATE EXTENSION IF NOT EXISTS ${ext} CASCADE`);
              console.log(`   ✅ Extension enabled: ${ext}`);
            } catch (error: any) {
              // Some extensions may not be available, that's OK
              console.warn(`   ⚠️  Extension '${ext}' not available:`, error.message);
            }
          }

          // Create schemas
          for (const schema of schemas) {
            try {
              await dbPool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
              console.log(`   ✅ Schema created: ${schema}`);
            } catch (error: any) {
              console.warn(`   ⚠️  Failed to create schema '${schema}':`, error.message);
            }
          }
        } finally {
          await dbPool.end();
        }
      }
    } catch (error: any) {
      console.error(`❌ Failed to ensure database '${dbName}':`, error.message);
      throw error;
    } finally {
      await adminPool.end();
    }
  }

  /**
   * Initialize all required databases for TradingSystem
   * 
   * This is idempotent - safe to run on every startup
   */
  static async initializeAllDatabases(): Promise<void> {
    const port = parseInt(process.env.TIMESCALEDB_PORT || '7000');

    console.log('🚀 Initializing TradingSystem databases...');
    console.log(`   Port: ${port}`);
    console.log('');

    const databases: DatabaseSpec[] = [
      { 
        name: 'APPS-WORKSPACE', 
        extensions: ['timescaledb'],
        schemas: ['public']
      },
      { 
        name: 'APPS-TPCAPITAL', 
        extensions: ['timescaledb'],
        schemas: ['public']
      },
      { 
        name: 'tradingsystem', 
        extensions: ['timescaledb'],
        schemas: ['public']
      },
      { 
        name: 'telegram_messages', 
        extensions: ['timescaledb'],
        schemas: ['public']
      },
    ];

    for (const db of databases) {
      await this.ensureDatabase(
        port,
        db.name,
        db.extensions || [],
        db.schemas || []
      );
    }

    console.log('');
    console.log('✅ All databases initialized successfully');
  }

  /**
   * Verify all databases are accessible
   */
  static async verifyDatabases(): Promise<Record<string, boolean>> {
    const port = parseInt(process.env.TIMESCALEDB_PORT || '7000');
    const user = process.env.TIMESCALEDB_USER || 'timescale';
    const password = process.env.TIMESCALEDB_PASSWORD;

    const databases = [
      'APPS-WORKSPACE',
      'APPS-TPCAPITAL',
      'tradingsystem',
      'telegram_messages',
    ];

    const results: Record<string, boolean> = {};

    for (const dbName of databases) {
      const pool = new pg.Pool({
        host: 'localhost',
        port,
        user,
        password,
        database: dbName,
        max: 1,
      });

      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        results[dbName] = true;
        console.log(`✅ ${dbName}: accessible`);
      } catch (error: any) {
        results[dbName] = false;
        console.error(`❌ ${dbName}: not accessible -`, error.message);
      } finally {
        await pool.end();
      }
    }

    return results;
  }

  /**
   * Create initial tables for workspace
   * Only runs if tables don't exist
   */
  static async createWorkspaceTables(port: number = 7000): Promise<void> {
    const user = process.env.TIMESCALEDB_USER || 'timescale';
    const password = process.env.TIMESCALEDB_PASSWORD;

    const pool = new pg.Pool({
      host: 'localhost',
      port,
      user,
      password,
      database: 'APPS-WORKSPACE',
      max: 2,
    });

    try {
      console.log('🔧 Creating workspace tables...');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS workspace_items (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          priority INTEGER DEFAULT 3,
          status VARCHAR(50) DEFAULT 'pending',
          tags TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workspace_items_status 
        ON workspace_items(status);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workspace_items_category 
        ON workspace_items(category);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at 
        ON workspace_items(created_at DESC);
      `);

      console.log('✅ Workspace tables created/verified');
    } catch (error: any) {
      console.error('❌ Failed to create workspace tables:', error.message);
      throw error;
    } finally {
      await pool.end();
    }
  }

  /**
   * Complete initialization including tables
   */
  static async initializeComplete(): Promise<void> {
    // Step 1: Ensure databases exist
    await this.initializeAllDatabases();

    // Step 2: Create tables
    const port = parseInt(process.env.TIMESCALEDB_PORT || '7000');
    await this.createWorkspaceTables(port);

    // Step 3: Verify all accessible
    const verification = await this.verifyDatabases();
    const allHealthy = Object.values(verification).every(v => v === true);

    if (!allHealthy) {
      const failed = Object.entries(verification)
        .filter(([_, healthy]) => !healthy)
        .map(([name]) => name);
      throw new Error(`Some databases are not accessible: ${failed.join(', ')}`);
    }

    console.log('');
    console.log('🎉 Complete database initialization successful!');
  }
}

