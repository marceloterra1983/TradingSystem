import ideasRepository from '../repositories/IdeasRepository.js';
import systemsRepository from '../repositories/SystemsRepository.js';
import { logger } from '../config/logger.js';

/**
 * Service for managing documentation ideas
 */
export class IdeasService {
  constructor() {
    this.repository = ideasRepository;
    this.systemsRepository = systemsRepository;
  }

  /**
   * Create a new documentation idea
   */
  async createIdea(ideaData, userId) {
    try {
      // Validate required fields
      this.validateIdeaData(ideaData);

      // Validate system reference if provided
      if (ideaData.system_id) {
        const system = await this.systemsRepository.findById(ideaData.system_id);
        if (!system) {
          throw new Error('Referenced system not found');
        }
      }

      // Create idea
      const idea = await this.repository.create({
        ...ideaData,
        created_by: userId
      });

      logger.info('Idea created successfully', {
        ideaId: idea.id,
        title: idea.title,
        userId
      });

      return idea;
    } catch (error) {
      logger.error('Failed to create idea', {
        error: error.message,
        data: ideaData,
        userId
      });
      throw error;
    }
  }

  /**
   * Get idea by ID
   */
  async getIdeaById(id) {
    try {
      const idea = await this.repository.findById(id);
      if (!idea) {
        throw new Error('Idea not found');
      }

      // Include system information if referenced
      if (idea.system_id) {
        idea.system = await this.systemsRepository.findById(idea.system_id);
      }

      return idea;
    } catch (error) {
      logger.error('Failed to get idea by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get all ideas with filtering and pagination
   */
  async getAllIdeas(filters = {}) {
    try {
      // Validate pagination parameters
      if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (filters.offset && filters.offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      const ideas = await this.repository.findAll(filters);

      // Include system information for ideas with system_id
      for (const idea of ideas) {
        if (idea.system_id) {
          idea.system = await this.systemsRepository.findById(idea.system_id);
        }
      }

      return ideas;
    } catch (error) {
      logger.error('Failed to get all ideas', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Update idea
   */
  async updateIdea(id, updateData, userId) {
    try {
      // Check if idea exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error('Idea not found');
      }

      // Validate update data
      this.validateUpdateData(updateData);

      // Validate system reference if provided
      if (updateData.system_id) {
        const system = await this.systemsRepository.findById(updateData.system_id);
        if (!system) {
          throw new Error('Referenced system not found');
        }
      }

      // Update idea
      const updatedIdea = await this.repository.update(id, updateData);

      // Include system information if referenced
      if (updatedIdea.system_id) {
        updatedIdea.system = await this.systemsRepository.findById(updatedIdea.system_id);
      }

      logger.info('Idea updated successfully', {
        ideaId: id,
        fields: Object.keys(updateData),
        userId
      });

      return updatedIdea;
    } catch (error) {
      logger.error('Failed to update idea', {
        error: error.message,
        id,
        updateData,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete idea
   */
  async deleteIdea(id, userId) {
    try {
      // Check if idea exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error('Idea not found');
      }

      await this.repository.delete(id);

      logger.info('Idea deleted successfully', {
        ideaId: id,
        title: existing.title,
        userId
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete idea', {
        error: error.message,
        id,
        userId
      });
      throw error;
    }
  }

  /**
   * Update idea status (for Kanban board)
   */
  async updateIdeaStatus(id, status, userId) {
    try {
      const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      return await this.updateIdea(id, { status }, userId);
    } catch (error) {
      logger.error('Failed to update idea status', {
        error: error.message,
        id,
        status,
        userId
      });
      throw error;
    }
  }

  /**
   * Assign idea to user
   */
  async assignIdea(id, assignedTo, userId) {
    try {
      return await this.updateIdea(id, { assigned_to: assignedTo }, userId);
    } catch (error) {
      logger.error('Failed to assign idea', {
        error: error.message,
        id,
        assignedTo,
        userId
      });
      throw error;
    }
  }

  /**
   * Get ideas for Kanban board
   */
  async getKanbanIdeas(filters = {}) {
    try {
      const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
      const kanbanData = {};

      for (const status of validStatuses) {
        kanbanData[status] = await this.repository.findByStatus(status);
      }

      // Apply additional filters
      if (filters.assigned_to) {
        for (const status in kanbanData) {
          kanbanData[status] = kanbanData[status].filter(
            idea => idea.assigned_to === filters.assigned_to
          );
        }
      }

      if (filters.system_id) {
        for (const status in kanbanData) {
          kanbanData[status] = kanbanData[status].filter(
            idea => idea.system_id === filters.system_id
          );
        }
      }

      // Include system information
      for (const status in kanbanData) {
        for (const idea of kanbanData[status]) {
          if (idea.system_id) {
            idea.system = await this.systemsRepository.findById(idea.system_id);
          }
        }
      }

      return kanbanData;
    } catch (error) {
      logger.error('Failed to get Kanban ideas', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get ideas by status
   */
  async getIdeasByStatus(status) {
    try {
      return await this.repository.findByStatus(status);
    } catch (error) {
      logger.error('Failed to get ideas by status', {
        error: error.message,
        status
      });
      throw error;
    }
  }

  /**
   * Get ideas by category
   */
  async getIdeasByCategory(category) {
    try {
      return await this.repository.findByCategory(category);
    } catch (error) {
      logger.error('Failed to get ideas by category', {
        error: error.message,
        category
      });
      throw error;
    }
  }

  /**
   * Get ideas by priority
   */
  async getIdeasByPriority(priority) {
    try {
      return await this.repository.findByPriority(priority);
    } catch (error) {
      logger.error('Failed to get ideas by priority', {
        error: error.message,
        priority
      });
      throw error;
    }
  }

  /**
   * Get ideas assigned to user
   */
  async getIdeasAssignedTo(assignedTo) {
    try {
      return await this.repository.findByAssignee(assignedTo);
    } catch (error) {
      logger.error('Failed to get ideas assigned to user', {
        error: error.message,
        assignedTo
      });
      throw error;
    }
  }

  /**
   * Get ideas created by user
   */
  async getIdeasCreatedBy(createdBy) {
    try {
      return await this.repository.findByCreator(createdBy);
    } catch (error) {
      logger.error('Failed to get ideas created by user', {
        error: error.message,
        createdBy
      });
      throw error;
    }
  }

  /**
   * Get ideas for a specific system
   */
  async getIdeasForSystem(systemId) {
    try {
      const ideas = await this.repository.findBySystem(systemId);
      const system = await this.systemsRepository.findById(systemId);

      return {
        system,
        ideas
      };
    } catch (error) {
      logger.error('Failed to get ideas for system', {
        error: error.message,
        systemId
      });
      throw error;
    }
  }

  /**
   * Get overdue ideas
   */
  async getOverdueIdeas() {
    try {
      return await this.repository.findOverdue();
    } catch (error) {
      logger.error('Failed to get overdue ideas', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search ideas
   */
  async searchIdeas(query) {
    try {
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters long');
      }

      return await this.repository.search(query.trim());
    } catch (error) {
      logger.error('Failed to search ideas', {
        error: error.message,
        query
      });
      throw error;
    }
  }

  /**
   * Get idea statistics
   */
  async getIdeaStatistics() {
    try {
      return await this.repository.getStatistics();
    } catch (error) {
      logger.error('Failed to get idea statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate idea data for creation
   */
  validateIdeaData(data) {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (data.title && data.title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (!data.category) {
      errors.push('Category is required');
    }

    const validCategories = ['new_feature', 'improvement', 'bug_fix', 'content', 'structure'];
    if (data.category && !validCategories.includes(data.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    if (data.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(data.priority)) {
        errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (data.estimated_hours && (data.estimated_hours < 1 || data.estimated_hours > 1000)) {
      errors.push('Estimated hours must be between 1 and 1000');
    }

    if (data.actual_hours && (data.actual_hours < 0 || data.actual_hours > 10000)) {
      errors.push('Actual hours must be between 0 and 10000');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate update data
   */
  validateUpdateData(data) {
    const errors = [];

    if (data.title && data.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    }

    if (data.title && data.title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (data.category) {
      const validCategories = ['new_feature', 'improvement', 'bug_fix', 'content', 'structure'];
      if (!validCategories.includes(data.category)) {
        errors.push(`Category must be one of: ${validCategories.join(', ')}`);
      }
    }

    if (data.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(data.priority)) {
        errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }

    if (data.status) {
      const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (data.estimated_hours && (data.estimated_hours < 1 || data.estimated_hours > 1000)) {
      errors.push('Estimated hours must be between 1 and 1000');
    }

    if (data.actual_hours && (data.actual_hours < 0 || data.actual_hours > 10000)) {
      errors.push('Actual hours must be between 0 and 10000');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }
}

export default new IdeasService();