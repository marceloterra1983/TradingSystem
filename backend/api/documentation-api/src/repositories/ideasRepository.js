import { questdbClient } from '../utils/questdbClient.js';
import { randomUUID } from 'crypto';

class IdeasRepository {
  constructor() {
    this.table = 'documentation_ideas';
  }

  /**
   * Find all ideas with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} List of ideas
   */
  async findAll(filters = {}, pagination = {}) {
    const options = {
      orderBy: 'ts DESC',
      limit: Math.min(pagination.limit || 20, 100),
      offset: pagination.offset || 0
    };

    // Build where clause
    const where = {};
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? filters.status : [filters.status];
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    const results = await questdbClient.select(this.table, options);

    // Handle search filter (post-query filtering for MVP)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return results.filter((idea) =>
        idea.title?.toLowerCase().includes(searchLower) ||
        idea.description?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Find idea by ID
   * @param {string} id - Idea ID
   * @returns {Promise<Object|null>} Idea or null
   */
  async findById(id) {
    const results = await questdbClient.select(this.table, {
      where: { id },
      limit: 1
    });
    return results[0] || null;
  }

  /**
   * Create new idea
   * @param {Object} data - Idea data
   * @returns {Promise<Object>} Created idea with ID
   */
  async create(data) {
    const now = new Date();
    const idea = {
      id: data.id || `idea-${randomUUID()}`,
      title: data.title,
      description: data.description || '',
      status: data.status || 'backlog',
      category: data.category,
      priority: data.priority || 'medium',
      tags: data.tags || '',
      created_by: data.created_by || null,
      assigned_to: data.assigned_to || null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      ts: now
    };

    await questdbClient.insert(this.table, idea);
    return idea;
  }

  /**
   * Update idea (using DELETE + INSERT pattern)
   * @param {string} id - Idea ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated idea
   */
  async update(id, data) {
    // Get existing idea
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Idea with id ${id} not found`);
    }

    // Delete old record
    await questdbClient.delete(this.table, { id });

    // Insert updated record
    const now = new Date();
    const updated = {
      id: existing.id,
      title: data.title !== undefined ? data.title : existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      status: data.status !== undefined ? data.status : existing.status,
      category: data.category !== undefined ? data.category : existing.category,
      priority: data.priority !== undefined ? data.priority : existing.priority,
      tags: data.tags !== undefined ? data.tags : existing.tags,
      created_by: existing.created_by,
      assigned_to: data.assigned_to !== undefined ? data.assigned_to : existing.assigned_to,
      created_at: existing.created_at,
      updated_at: now,
      // Set completed_at when status changes to 'done'
      completed_at: data.status === 'done' && existing.status !== 'done' ? now : existing.completed_at,
      ts: now
    };

    await questdbClient.insert(this.table, updated);
    return updated;
  }

  /**
   * Delete idea by ID
   * @param {string} id - Idea ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    await questdbClient.delete(this.table, { id });
    return true;
  }

  /**
   * Count ideas with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  async count(filters = {}) {
    const where = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    return await questdbClient.count(this.table, where);
  }

  /**
   * Get ideas grouped by status (for Kanban)
   * @returns {Promise<Object>} Ideas grouped by status
   */
  async getGroupedByStatus() {
    const allIdeas = await this.findAll({}, { limit: 1000 });

    const grouped = {
      backlog: [],
      in_progress: [],
      done: [],
      cancelled: []
    };

    allIdeas.forEach((idea) => {
      if (grouped[idea.status]) {
        grouped[idea.status].push(idea);
      }
    });

    return grouped;
  }
}

export const ideasRepository = new IdeasRepository();
