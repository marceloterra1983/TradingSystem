import pg from 'pg';
import { timescaledbConfig } from '../config.js';

export class TimescaleDBClient {
  constructor() {
    this.pool = null;
    this.ready = false;
  }

  mapRow(row) {
    if (!row) return null;
    return {
      ...row,
      id: String(row.id), // Convert integer ID to string for frontend compatibility
      tags: Array.isArray(row.tags) ? row.tags : [],
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      updatedAt: row.updatedAt ?? row.createdAt,
    };
  }

  async init() {
    if (this.ready) return;

    try {
      const poolConfig = {
        ssl: timescaledbConfig.ssl,
        max: timescaledbConfig.max,
        idleTimeoutMillis: timescaledbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: timescaledbConfig.connectionTimeoutMillis,
      };

      if (timescaledbConfig.connectionString) {
        poolConfig.connectionString = timescaledbConfig.connectionString;
      } else {
        poolConfig.host = timescaledbConfig.host;
        poolConfig.port = timescaledbConfig.port;
        poolConfig.database = timescaledbConfig.database;
        poolConfig.user = timescaledbConfig.user;
        poolConfig.password = timescaledbConfig.password;
      }

      if (timescaledbConfig.schema) {
        poolConfig.options = `-c search_path=${timescaledbConfig.schema},public`;
      }

      this.pool = new pg.Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize TimescaleDB connection:', error);
      throw error;
    }
  }

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
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          updated_by as "updatedBy",
          metadata
        FROM ${timescaledbConfig.table}
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

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
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          updated_by as "updatedBy",
          metadata
        FROM ${timescaledbConfig.table}
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);
      return this.mapRow(result.rows[0]) || null;
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  }

  async createItem(item) {
    await this.init();

    try {
      const query = `
        INSERT INTO ${timescaledbConfig.table}
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
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          updated_by as "updatedBy",
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
        item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async updateItem(id, updates) {
    await this.init();

    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Add updated_at automatically
      updates.updatedAt = new Date().toISOString();

      Object.keys(updates).forEach(key => {
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
        UPDATE ${timescaledbConfig.table}
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
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          updated_by as "updatedBy",
          metadata
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRow(result.rows[0]);
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async deleteItem(id) {
    await this.init();

    try {
      const query = `DELETE FROM ${timescaledbConfig.table} WHERE id = $1`;
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  mapFieldName(jsField) {
    const fieldMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      createdBy: 'created_by',
      updatedBy: 'updated_by'
    };
    return fieldMap[jsField] || jsField;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.ready = false;
    }
  }
}
