/**
 * Neon PostgreSQL Client
 * 
 * Database client for Neon (serverless PostgreSQL) with branching support.
 * Compatible with standard PostgreSQL protocol but optimized for Neon's
 * separated storage and compute architecture.
 * 
 * Features:
 * - Connection pooling
 * - Automatic reconnection
 * - Query timeout handling
 * - Row mapping (snake_case → camelCase)
 * - JSONB and array handling
 * 
 * @module db/neon
 */

import pg from 'pg';
import { neonConfig } from '../config.js';

export class NeonClient {
  constructor() {
    this.pool = null;
    this.ready = false;
  }

  /**
   * Initialize database connection pool
   * Creates a connection pool with Neon-specific optimizations
   */
  async init() {
    if (this.ready) return;

    try {
      const poolConfig = {
        host: neonConfig.host,
        port: neonConfig.port,
        database: neonConfig.database,
        user: neonConfig.user,
        password: neonConfig.password,
        ssl: neonConfig.ssl,
        max: neonConfig.max,
        min: neonConfig.min || 2,
        idleTimeoutMillis: neonConfig.idleTimeoutMillis,
        connectionTimeoutMillis: neonConfig.connectionTimeoutMillis,
        
        // Set search path to workspace schema
        options: `-c search_path=${neonConfig.schema},public`,
        
        // Neon-specific optimizations
        statement_timeout: neonConfig.statementTimeout || 30000, // 30s default
        query_timeout: neonConfig.queryTimeout || 30000,
      };

      // Use connection string if provided (takes precedence)
      if (neonConfig.connectionString) {
        poolConfig.connectionString = neonConfig.connectionString;
        delete poolConfig.host;
        delete poolConfig.port;
        delete poolConfig.database;
        delete poolConfig.user;
        delete poolConfig.password;
      }

      this.pool = new pg.Pool(poolConfig);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle Neon client', err);
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1 AS health_check');
      client.release();

      this.ready = true;
      console.log('[NeonClient] Connected to Neon database successfully');
    } catch (error) {
      console.error('[NeonClient] Failed to initialize connection:', error);
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
        FROM ${neonConfig.table}
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      console.error('[NeonClient] Error fetching items:', error);
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
        FROM ${neonConfig.table}
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);
      return this.mapRow(result.rows[0]) || null;
    } catch (error) {
      console.error('[NeonClient] Error fetching item:', error);
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
        INSERT INTO ${neonConfig.table}
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
      console.error('[NeonClient] Error creating item:', error);
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
        UPDATE ${neonConfig.table}
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
      console.error('[NeonClient] Error updating item:', error);
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
      const query = `DELETE FROM ${neonConfig.table} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('[NeonClient] Error deleting item:', error);
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
        SELECT name, display_name, description, is_active, sort_order
        FROM workspace_categories
        WHERE is_active = true
        ORDER BY sort_order
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('[NeonClient] Error fetching categories:', error);
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
      console.log('[NeonClient] Connection pool closed');
    }
  }
}

