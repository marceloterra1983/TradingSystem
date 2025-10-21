import questDBClient from '../utils/questDBClient.js';
import { logger } from '../config/logger.js';
import { config } from '../config/appConfig.js';
import { createPostgresIdeasRepository } from './postgres/IdeasRepository.js';

/**
 * Repository for managing documentation ideas in QuestDB
 */
export class IdeasRepository {
  constructor() {
    this.tableName = 'documentation_ideas';
  }

  /**
   * Create a new documentation idea
   */
  async create(ideaData) {
    try {
      const id = questDBClient.generateUUID();
      const now = questDBClient.getCurrentTimestamp();

      const sql = `
        INSERT INTO ${this.tableName} (
          id, title, description, status, category, priority,
          assigned_to, created_by, system_id, tags,
          estimated_hours, actual_hours, due_date,
          created_at, updated_at, designated_timestamp
        ) VALUES (
          :id, :title, :description, :status, :category, :priority,
          :assigned_to, :created_by, :system_id, :tags,
          :estimated_hours, :actual_hours, :due_date,
          :created_at, :updated_at, :designated_timestamp
        )
      `;

      const params = {
        id,
        title: ideaData.title,
        description: ideaData.description || null,
        status: ideaData.status || 'backlog',
        category: ideaData.category,
        priority: ideaData.priority || 'medium',
        assigned_to: ideaData.assigned_to || null,
        created_by: ideaData.created_by,
        system_id: ideaData.system_id || null,
        tags: ideaData.tags ? JSON.stringify(ideaData.tags) : null,
        estimated_hours: ideaData.estimated_hours || null,
        actual_hours: ideaData.actual_hours || null,
        due_date: ideaData.due_date || null,
        created_at: now,
        updated_at: now,
        designated_timestamp: now
      };

      await questDBClient.executeWrite(sql, params);

      logger.info('Documentation idea created', { id, title: ideaData.title });

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to create documentation idea', {
        error: error.message,
        data: ideaData
      });
      throw error;
    }
  }

  /**
   * Find idea by ID
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
      logger.error('Failed to find idea by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get all ideas with optional filtering and pagination
   */
  async findAll(filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params = {};

      // Add filters
      if (filters.status) {
        sql += ` AND status = :status`;
        params.status = filters.status;
      }

      if (filters.category) {
        sql += ` AND category = :category`;
        params.category = filters.category;
      }

      if (filters.priority) {
        sql += ` AND priority = :priority`;
        params.priority = filters.priority;
      }

      if (filters.assigned_to) {
        sql += ` AND assigned_to = :assigned_to`;
        params.assigned_to = filters.assigned_to;
      }

      if (filters.created_by) {
        sql += ` AND created_by = :created_by`;
        params.created_by = filters.created_by;
      }

      if (filters.system_id) {
        sql += ` AND system_id = :system_id`;
        params.system_id = filters.system_id;
      }

      if (filters.search) {
        sql += ` AND (title ILIKE '%${filters.search}%' OR description ILIKE '%${filters.search}%')`;
      }

      // Add date range filter for due dates
      if (filters.due_date_from) {
        sql += ` AND due_date >= :due_date_from`;
        params.due_date_from = filters.due_date_from;
      }

      if (filters.due_date_to) {
        sql += ` AND due_date <= :due_date_to`;
        params.due_date_to = filters.due_date_to;
      }

      // Add ordering
      const orderBy = filters.order_by || 'updated_at';
      const orderDirection = filters.order_direction || 'DESC';
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (filters.limit) {
        sql += ` LIMIT ${filters.limit}`;
      }

      if (filters.offset) {
        sql += ` OFFSET ${filters.offset}`;
      }

      const rows = await questDBClient.executeSelect(sql, params);
      return rows.map(row => this.transformRow(row));
    } catch (error) {
      logger.error('Failed to find ideas', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Update idea by ID
   */
  async update(id, updateData) {
    try {
      const now = questDBClient.getCurrentTimestamp();

      const fields = [];
      const params = { id, updated_at: now };

      // Build dynamic update query
      const allowedFields = [
        'title', 'description', 'status', 'category', 'priority',
        'assigned_to', 'system_id', 'tags', 'estimated_hours',
        'actual_hours', 'due_date'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = :${field}`);

          if (field === 'tags') {
            params[field] = updateData[field] ? JSON.stringify(updateData[field]) : null;
          } else {
            params[field] = updateData[field];
          }
        }
      }

      // Handle completed_at when status changes to 'done'
      if (updateData.status === 'done') {
        fields.push('completed_at = :completed_at');
        params.completed_at = now;
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = :updated_at');

      const sql = `
        UPDATE ${this.tableName}
        SET ${fields.join(', ')}
        WHERE id = :id
      `;

      await questDBClient.executeWrite(sql, params);

      logger.info('Documentation idea updated', { id, fields: fields.join(', ') });

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update documentation idea', {
        error: error.message,
        id,
        updateData
      });
      throw error;
    }
  }

  /**
   * Delete idea by ID
   */
  async delete(id) {
    try {
      // First check if idea exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Idea not found');
      }

      const sql = `DELETE FROM ${this.tableName} WHERE id = :id`;
      await questDBClient.executeWrite(sql, { id });

      logger.info('Documentation idea deleted', { id, title: existing.title });

      return true;
    } catch (error) {
      logger.error('Failed to delete documentation idea', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get ideas by status (for Kanban board)
   */
  async findByStatus(status) {
    return this.findAll({ status, order_by: 'priority', order_direction: 'DESC' });
  }

  /**
   * Get ideas by category
   */
  async findByCategory(category) {
    return this.findAll({ category });
  }

  /**
   * Get ideas by priority
   */
  async findByPriority(priority) {
    return this.findAll({ priority });
  }

  /**
   * Get ideas assigned to user
   */
  async findByAssignee(assignedTo) {
    return this.findAll({ assigned_to: assignedTo });
  }

  /**
   * Get ideas created by user
   */
  async findByCreator(createdBy) {
    return this.findAll({ created_by: createdBy });
  }

  /**
   * Get ideas for a specific system
   */
  async findBySystem(systemId) {
    return this.findAll({ system_id: systemId });
  }

  /**
   * Search ideas by title or description
   */
  async search(query) {
    return this.findAll({ search: query });
  }

  /**
   * Get overdue ideas
   */
  async findOverdue() {
    const now = questDBClient.getCurrentTimestamp();
    return this.findAll({
      due_date_to: now,
      status: ['backlog', 'todo', 'in_progress']
    });
  }

  /**
   * Get ideas statistics
   */
  async getStatistics() {
    try {
      const sql = `
        SELECT
          status,
          category,
          priority,
          assigned_to,
          COUNT(*) as count,
          AVG(estimated_hours) as avg_estimated_hours,
          AVG(actual_hours) as avg_actual_hours
        FROM ${this.tableName}
        GROUP BY status, category, priority, assigned_to
        ORDER BY status, category, priority
      `;

      const rows = await questDBClient.executeSelect(sql);

      const stats = {
        total: 0,
        by_status: {},
        by_category: {},
        by_priority: {},
        by_assignee: {},
        hours: {
          total_estimated: 0,
          total_actual: 0,
          completion_rate: 0
        }
      };

      let totalEstimated = 0;
      let totalActual = 0;
      let completedCount = 0;

      rows.forEach(row => {
        stats.total += row.count;

        // Group by status
        if (!stats.by_status[row.status]) {
          stats.by_status[row.status] = 0;
        }
        stats.by_status[row.status] += row.count;

        // Group by category
        if (!stats.by_category[row.category]) {
          stats.by_category[row.category] = 0;
        }
        stats.by_category[row.category] += row.count;

        // Group by priority
        if (!stats.by_priority[row.priority]) {
          stats.by_priority[row.priority] = 0;
        }
        stats.by_priority[row.priority] += row.count;

        // Group by assignee
        if (!stats.by_assignee[row.assigned_to]) {
          stats.by_assignee[row.assigned_to] = 0;
        }
        stats.by_assignee[row.assigned_to] += row.count;

        // Calculate hours
        if (row.avg_estimated_hours) {
          totalEstimated += row.avg_estimated_hours * row.count;
        }
        if (row.avg_actual_hours) {
          totalActual += row.avg_actual_hours * row.count;
        }

        if (row.status === 'done') {
          completedCount += row.count;
        }
      });

      stats.hours.total_estimated = Math.round(totalEstimated);
      stats.hours.total_actual = Math.round(totalActual);

      if (stats.total > 0) {
        stats.hours.completion_rate = Math.round((completedCount / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get idea statistics', {
        error: error.message
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
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      due_date: row.due_date ? new Date(row.due_date) : null,
      completed_at: row.completed_at ? new Date(row.completed_at) : null,
      estimated_hours: row.estimated_hours ? parseInt(row.estimated_hours) : null,
      actual_hours: row.actual_hours ? parseInt(row.actual_hours) : null
    };
  }
}

let repositoryInstance = null;

export function getIdeasRepository() {
  if (!repositoryInstance) {
    if (config.database.strategy === 'postgres') {
      repositoryInstance = createPostgresIdeasRepository();
    } else {
      repositoryInstance = new IdeasRepository();
    }
  }
  return repositoryInstance;
}

export default getIdeasRepository();
