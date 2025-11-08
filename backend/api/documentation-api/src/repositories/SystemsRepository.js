import questDBClient from "../utils/questDBClient.js";
import { logger } from "../config/logger.js";
import { config } from "../config/appConfig.js";
import { createPostgresSystemsRepository } from "./postgres/SystemsRepository.js";

/**
 * Repository for managing documentation systems in QuestDB
 */
export class SystemsRepository {
  constructor() {
    this.tableName = "documentation_systems";
  }

  /**
   * Create a new documentation system
   */
  async create(systemData) {
    try {
      const id = questDBClient.generateUUID();
      const now = questDBClient.getCurrentTimestamp();

      const sql = `
        INSERT INTO ${this.tableName} (
          id, name, description, type, url, status, last_checked,
          response_time_ms, version, owner, tags, metadata,
          created_at, updated_at, designated_timestamp
        ) VALUES (
          :id, :name, :description, :type, :url, :status, :last_checked,
          :response_time_ms, :version, :owner, :tags, :metadata,
          :created_at, :updated_at, :designated_timestamp
        )
      `;

      const params = {
        id,
        name: systemData.name,
        description: systemData.description || null,
        type: systemData.type,
        url: systemData.url || null,
        status: systemData.status || "unknown",
        last_checked: systemData.last_checked || now,
        response_time_ms: systemData.response_time_ms || null,
        version: systemData.version || null,
        owner: systemData.owner || null,
        tags: systemData.tags ? JSON.stringify(systemData.tags) : null,
        metadata: systemData.metadata
          ? JSON.stringify(systemData.metadata)
          : null,
        created_at: now,
        updated_at: now,
        designated_timestamp: now,
      };

      await questDBClient.executeWrite(sql, params);

      logger.info("Documentation system created", {
        id,
        name: systemData.name,
      });

      return await this.findById(id);
    } catch (error) {
      logger.error("Failed to create documentation system", {
        error: error.message,
        data: systemData,
      });
      throw error;
    }
  }

  /**
   * Find system by ID
   */
  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = :id`;
      const rows = await questDBClient.executeSelect(sql, { id });

      if (rows.length === 0) {
        return null;
      }

      return this.transformRow(rows[0]);
    } catch (error) {
      logger.error("Failed to find system by ID", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get all systems with optional filtering
   */
  async findAll(filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params = {};

      if (filters.name) {
        sql += ` AND name = :name`;
        params.name = filters.name;
      }

      if (filters.status) {
        sql += ` AND status = :status`;
        params.status = filters.status;
      }

      if (filters.type) {
        sql += ` AND type = :type`;
        params.type = filters.type;
      }

      if (filters.owner) {
        sql += ` AND owner = :owner`;
        params.owner = filters.owner;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE '%${filters.search}%' OR description ILIKE '%${filters.search}%')`;
      }

      // Add ordering
      sql += ` ORDER BY updated_at DESC`;

      // Add limit if specified
      if (filters.limit) {
        sql += ` LIMIT ${filters.limit}`;
      }

      const rows = await questDBClient.executeSelect(sql, params);
      return rows.map((row) => this.transformRow(row));
    } catch (error) {
      logger.error("Failed to find systems", {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  async getAllSystems(filters = {}) {
    return this.findAll(filters);
  }

  /**
   * Update system by ID
   */
  async update(id, updateData) {
    try {
      const now = questDBClient.getCurrentTimestamp();

      const fields = [];
      const params = { id, updated_at: now };

      // Build dynamic update query
      const allowedFields = [
        "name",
        "description",
        "type",
        "url",
        "status",
        "last_checked",
        "response_time_ms",
        "version",
        "owner",
        "tags",
        "metadata",
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = :${field}`);

          if (field === "tags" || field === "metadata") {
            params[field] = updateData[field]
              ? JSON.stringify(updateData[field])
              : null;
          } else {
            params[field] = updateData[field];
          }
        }
      }

      if (fields.length === 0) {
        throw new Error("No valid fields to update");
      }

      fields.push("updated_at = :updated_at");

      const sql = `
        UPDATE ${this.tableName}
        SET ${fields.join(", ")}
        WHERE id = :id
      `;

      await questDBClient.executeWrite(sql, params);

      logger.info("Documentation system updated", {
        id,
        fields: fields.join(", "),
      });

      return await this.findById(id);
    } catch (error) {
      logger.error("Failed to update documentation system", {
        error: error.message,
        id,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Delete system by ID
   */
  async delete(id) {
    try {
      // First check if system exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error("System not found");
      }

      const sql = `DELETE FROM ${this.tableName} WHERE id = :id`;
      await questDBClient.executeWrite(sql, { id });

      logger.info("Documentation system deleted", { id, name: existing.name });

      return true;
    } catch (error) {
      logger.error("Failed to delete documentation system", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get systems by status
   */
  async findByStatus(status) {
    return this.findAll({ status });
  }

  /**
   * Get systems by type
   */
  async findByType(type) {
    return this.findAll({ type });
  }

  /**
   * Get systems by owner
   */
  async findByOwner(owner) {
    return this.findAll({ owner });
  }

  /**
   * Search systems by name or description
   */
  async search(query) {
    return this.findAll({ search: query });
  }

  /**
   * Get system statistics
   */
  async getStatistics() {
    try {
      const sql = `
        SELECT
          status,
          type,
          COUNT(*) as count,
          AVG(response_time_ms) as avg_response_time
        FROM ${this.tableName}
        GROUP BY status, type
        ORDER BY status, type
      `;

      const rows = await questDBClient.executeSelect(sql);

      const stats = {
        total: 0,
        by_status: {},
        by_type: {},
        avg_response_time: 0,
      };

      let totalResponseTime = 0;
      let responseTimeCount = 0;

      rows.forEach((row) => {
        stats.total += row.count;

        // Group by status
        if (!stats.by_status[row.status]) {
          stats.by_status[row.status] = 0;
        }
        stats.by_status[row.status] += row.count;

        // Group by type
        if (!stats.by_type[row.type]) {
          stats.by_type[row.type] = 0;
        }
        stats.by_type[row.type] += row.count;

        // Calculate average response time
        if (row.avg_response_time) {
          totalResponseTime += row.avg_response_time * row.count;
          responseTimeCount += row.count;
        }
      });

      if (responseTimeCount > 0) {
        stats.avg_response_time = Math.round(
          totalResponseTime / responseTimeCount,
        );
      }

      return stats;
    } catch (error) {
      logger.error("Failed to get system statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Transform database row to object with proper JSON parsing
   */
  transformRow(row) {
    if (!row) return null;

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_checked: row.last_checked ? new Date(row.last_checked) : null,
    };
  }
}

/**
 * Null Object Pattern for when database is disabled
 */
class NullSystemsRepository {
  async create() {
    throw new Error(
      'Systems management is disabled (database strategy is "none")',
    );
  }

  async findById() {
    return null;
  }

  async findAll() {
    return [];
  }

  async getAllSystems() {
    return [];
  }

  async update() {
    throw new Error(
      'Systems management is disabled (database strategy is "none")',
    );
  }

  async delete() {
    throw new Error(
      'Systems management is disabled (database strategy is "none")',
    );
  }

  async findByStatus() {
    return [];
  }

  async findByType() {
    return [];
  }

  async findByOwner() {
    return [];
  }

  async search() {
    return [];
  }

  async getStatistics() {
    return {
      total: 0,
      by_status: {},
      by_type: {},
      avg_response_time: 0,
    };
  }

  transformRow(row) {
    return row;
  }
}

let systemsRepositoryInstance = null;

export function getSystemsRepository() {
  if (!systemsRepositoryInstance) {
    if (config.database.strategy === "none") {
      logger.info("Using NullSystemsRepository (database disabled)");
      systemsRepositoryInstance = new NullSystemsRepository();
    } else if (config.database.strategy === "postgres") {
      systemsRepositoryInstance = createPostgresSystemsRepository();
    } else {
      systemsRepositoryInstance = new SystemsRepository();
    }
  }
  return systemsRepositoryInstance;
}

export default getSystemsRepository();
