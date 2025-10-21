import { ideasRepository } from '../repositories/ideasRepository.js';

class IdeasService {
  /**
   * Get all ideas with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Response with ideas
   */
  async getAllIdeas(filters = {}, pagination = {}) {
    const ideas = await ideasRepository.findAll(filters, pagination);
    const total = await ideasRepository.count(filters);

    return {
      success: true,
      count: ideas.length,
      total,
      data: ideas
    };
  }

  /**
   * Get idea by ID
   * @param {string} id - Idea ID
   * @returns {Promise<Object>} Response with idea
   */
  async getIdeaById(id) {
    const idea = await ideasRepository.findById(id);

    if (!idea) {
      return {
        success: false,
        error: 'Idea not found'
      };
    }

    return {
      success: true,
      data: idea
    };
  }

  /**
   * Create new idea
   * @param {Object} data - Idea data
   * @returns {Promise<Object>} Response with created idea
   */
  async createIdea(data) {
    // Validation
    const validation = this.validateIdeaData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      };
    }

    try {
      const idea = await ideasRepository.create(data);

      return {
        success: true,
        data: idea
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update existing idea
   * @param {string} id - Idea ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Response with updated idea
   */
  async updateIdea(id, data) {
    try {
      // Validate status transition if status is being updated
      if (data.status) {
        const existing = await ideasRepository.findById(id);
        if (!existing) {
          return {
            success: false,
            error: 'Idea not found'
          };
        }

        const validTransition = this.validateStatusTransition(existing.status, data.status);
        if (!validTransition.valid) {
          return {
            success: false,
            error: validTransition.message
          };
        }
      }

      const updated = await ideasRepository.update(id, data);

      return {
        success: true,
        data: updated
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete idea
   * @param {string} id - Idea ID
   * @returns {Promise<Object>} Response
   */
  async deleteIdea(id) {
    try {
      // Check if idea exists
      const idea = await ideasRepository.findById(id);
      if (!idea) {
        return {
          success: false,
          error: 'Idea not found'
        };
      }

      // TODO: Cascade delete files (Phase 4)

      await ideasRepository.delete(id);

      return {
        success: true,
        message: 'Idea deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get ideas grouped by status for Kanban view
   * @returns {Promise<Object>} Response with grouped ideas
   */
  async getIdeasKanban() {
    try {
      const grouped = await ideasRepository.getGroupedByStatus();

      return {
        success: true,
        data: grouped
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate idea data
   * @param {Object} data - Idea data to validate
   * @returns {Object} Validation result
   */
  validateIdeaData(data) {
    const errors = [];

    // Required fields
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      errors.push({ field: 'title', message: 'Title is required and must be non-empty string' });
    }

    if (data.title && data.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be 200 characters or less' });
    }

    if (!data.category || !['api', 'guide', 'reference', 'tutorial'].includes(data.category)) {
      errors.push({ field: 'category', message: 'Category is required and must be one of: api, guide, reference, tutorial' });
    }

    // Optional validations
    if (data.status && !['backlog', 'in_progress', 'done', 'cancelled'].includes(data.status)) {
      errors.push({ field: 'status', message: 'Status must be one of: backlog, in_progress, done, cancelled' });
    }

    if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, critical' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate status transition for Kanban workflow
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {Object} Validation result
   */
  validateStatusTransition(currentStatus, newStatus) {
    // Allow any transition for MVP
    // Future: Add workflow rules (e.g., can't go from done to backlog)

    const validStatuses = ['backlog', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return {
        valid: false,
        message: `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`
      };
    }

    return { valid: true };
  }
}

export const ideasService = new IdeasService();
