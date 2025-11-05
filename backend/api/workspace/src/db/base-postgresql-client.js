/**
 * Base PostgreSQL Client
 * 
 * Abstract base class for all PostgreSQL-compatible database clients.
 * Eliminates code duplication across NeonClient, PostgreSQLClient, and TimescaleDBClient.
 * 
 * Features:
 * - Connection pooling
 * - Automatic reconnection
 * - Query timeout handling
 * - Row mapping (snake_case → camelCase)
 * - JSONB and array handling
 * 
 * @abstract
 * @module db/base-postgresql-client
 */

import pg from 'pg';

export class BasePostgreSQLClient {
  /**
   * @param {Object} config - Database configuration
   * @param {string} config.host - Database host
   * @param {number} config.port - Database port
   * @param {string} config.database - Database name
   * @param {string} config.user - Database user
   * @param {string} config.password - Database password
   * @param {string} config.schema - Database schema
   * @param {string} config.table - Table name for items
   * @param {Object} [config.ssl] - SSL configuration
   * @param {number} [config.max] - Max pool connections
   * @param {number} [config.min] - Min pool connections
   * @param {number} [config.idleTimeoutMillis] - Idle timeout
   * @param {number} [config.connectionTimeoutMillis] - Connection timeout
   * @param {string} [config.connectionString] - Connection string (overrides individual params)
   */
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.ready = false;
    this.clientName = this.constructor.name;
  }

  /**
   * Initialize database connection pool
   * Must be called before any database operations
   */
  async init() {
    if (this.ready) return;

    try {
      const poolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.max || 20,
        min: this.config.min || 2,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
        
        // Set search path to specified schema
        options: `-c search_path=${this.config.schema},public`,
      };

      // Use connection string if provided (takes precedence)
      if (this.config.connectionString) {
        poolConfig.connectionString = this.config.connectionString;
        delete poolConfig.host;
        delete poolConfig.port;
        delete poolConfig.database;
        delete poolConfig.user;
        delete poolConfig.password;
      }

      this.pool = new pg.Pool(poolConfig);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error(`[${this.clientName}] Unexpected error on idle client:`, err);
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1 AS health_check');
      client.release();

      this.ready = true;
      console.log(`[${this.clientName}] Connected successfully to ${this.config.database}`);
    } catch (error) {
      console.error(`[${this.clientName}] Failed to initialize connection:`, error);
      throw error;
    }
  }

  /**
   * Map database row to API-friendly format
   * Converts snake_case to camelCase and handles null values
   * 
   * @param {Object} row - Database row
   * @returns {Object} Mapped row
   */
  mapRow(row) {
    if (!row) return null;

    return {
      ...row,
      id: String(row.id), // Convert integer ID to string for frontend compatibility
      tags: Array.isArray(row.tags) ? row.tags : [],
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      updatedAt: row.updated_at ?? row.created_at,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  /**
   * Map JavaScript field names to database column names
   * 
   * @param {string} jsField - JavaScript field name (camelCase)
   * @returns {string} Database column name (snake_case)
   */
  mapFieldName(jsField) {
    const fieldMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      createdBy: 'created_by',
      updatedBy: 'updated_by',
    };
    return fieldMap[jsField] || jsField;
  }

  /**
   * Get all items
   * 
   * @returns {Promise<Array>} Array of workspace items
   */
  async getItems() {
    await this.init();

    try {
      const query = `
        SELECT
          id,
          title,
          description,
          category,
          priority,
          status,
          tags,
          created_at,
          updated_at,
          created_by,
          updated_by,
          metadata
        FROM ${this.config.table}
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      console.error(`[${this.clientName}] Error fetching items:`, error);
      throw error;
    }
  }

  /**
   * Get a single item by ID
   * 
   * @param {string|number} id - Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async getItem(id) {
    await this.init();

    try {
      const query = `
        SELECT
          id,
          title,
          description,
          category,
          priority,
          status,
          tags,
          created_at,
          updated_at,
          created_by,
          updated_by,
          metadata
        FROM ${this.config.table}
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);
      return this.mapRow(result.rows[0]) || null;
    } catch (error) {
      console.error(`[${this.clientName}] Error fetching item:`, error);
      throw error;
    }
  }

  /**
   * Create a new item
   * 
   * @param {Object} item - Item data
   * @returns {Promise<Object>} Created item
   */
  async createItem(item) {
    await this.init();

    try {
      const query = `
        INSERT INTO ${this.config.table}
        (title, description, category, priority, status, tags, created_at, updated_at, created_by, updated_by, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          title,
          description,
          category,
          priority,
          status,
          tags,
          created_at,
          updated_at,
          created_by,
          updated_by,
          metadata
      `;

      const values = [
        item.title,
        item.description,
        item.category,
        item.priority || 'medium',
        item.status || 'new',
        Array.isArray(item.tags) ? item.tags : [],
        item.createdAt ? new Date(item.createdAt) : new Date(),
        item.updatedAt ? new Date(item.updatedAt) : new Date(),
        item.createdBy || null,
        item.updatedBy || null,
        item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      console.error(`[${this.clientName}] Error creating item:`, error);
      throw error;
    }
  }

  /**
   * Update an existing item
   * 
   * @param {string|number} id - Item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated item or null if not found
   */
  async updateItem(id, updates) {
    await this.init();

    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Add updated_at automatically
      updates.updatedAt = new Date().toISOString();

      Object.keys(updates).forEach((key) => {
        if (key === 'tags') {
          updateFields.push(`${this.mapFieldName(key)} = $${paramIndex}`);
          values.push(Array.isArray(updates[key]) ? updates[key] : []);
        } else if (key === 'metadata') {
          updateFields.push(`${this.mapFieldName(key)} = $${paramIndex}`);
          values.push(updates[key] && typeof updates[key] === 'object' ? updates[key] : {});
        } else if (key === 'createdAt' || key === 'updatedAt') {
          updateFields.push(`${this.mapFieldName(key)} = $${paramIndex}`);
          values.push(new Date(updates[key]));
        } else {
          updateFields.push(`${this.mapFieldName(key)} = $${paramIndex}`);
          values.push(updates[key]);
        }
        paramIndex++;
      });

      values.push(id); // Add id at the end

      const query = `
        UPDATE ${this.config.table}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          title,
          description,
          category,
          priority,
          status,
          tags,
          created_at,
          updated_at,
          created_by,
          updated_by,
          metadata
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRow(result.rows[0]);
    } catch (error) {
      console.error(`[${this.clientName}] Error updating item:`, error);
      throw error;
    }
  }

  /**
   * Delete an item
   * 
   * @param {string|number} id - Item ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteItem(id) {
    await this.init();

    try {
      const query = `DELETE FROM ${this.config.table} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`[${this.clientName}] Error deleting item:`, error);
      throw error;
    }
  }

  /**
   * Get categories
   * 
   * @returns {Promise<Array>} Array of categories
   */
  async getCategories() {
    await this.init();

    try {
      const query = `
        SELECT 
          name AS id,           -- Use 'name' as 'id' (PK - no separate id column exists)
          name,
          display_name,
          description,
          is_active,
          sort_order AS display_order,  -- Map 'sort_order' to 'display_order' for frontend compatibility
          created_at,
          updated_at
        FROM workspace.workspace_categories
        WHERE is_active = true
        ORDER BY sort_order
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(`[${this.clientName}] Error fetching categories:`, error);
      throw error;
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.ready = false;
      console.log(`[${this.clientName}] Connection pool closed`);
    }
  }
}

