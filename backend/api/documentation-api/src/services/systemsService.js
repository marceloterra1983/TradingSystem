import { systemsRepository } from '../repositories/systemsRepository.js';

class SystemsService {
  /**
   * Get all systems with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Response with systems
   */
  async getAllSystems(filters = {}) {
    const systems = await systemsRepository.findAll(filters);
    const total = await systemsRepository.count(filters);

    return {
      success: true,
      count: systems.length,
      total,
      data: systems
    };
  }

  /**
   * Get system by ID
   * @param {string} id - System ID
   * @returns {Promise<Object>} Response with system
   */
  async getSystemById(id) {
    const system = await systemsRepository.findById(id);

    if (!system) {
      return {
        success: false,
        error: 'System not found'
      };
    }

    return {
      success: true,
      data: system
    };
  }

  /**
   * Create new system
   * @param {Object} data - System data
   * @returns {Promise<Object>} Response with created system
   */
  async createSystem(data) {
    // Validation
    const validation = this.validateSystemData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      };
    }

    try {
      const system = await systemsRepository.create(data);

      return {
        success: true,
        data: system
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update existing system
   * @param {string} id - System ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Response with updated system
   */
  async updateSystem(id, data) {
    try {
      const updated = await systemsRepository.update(id, data);

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
   * Delete system
   * @param {string} id - System ID
   * @returns {Promise<Object>} Response
   */
  async deleteSystem(id) {
    try {
      // Check if system exists
      const system = await systemsRepository.findById(id);
      if (!system) {
        return {
          success: false,
          error: 'System not found'
        };
      }

      await systemsRepository.delete(id);

      return {
        success: true,
        message: 'System deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate system data
   * @param {Object} data - System data to validate
   * @returns {Object} Validation result
   */
  validateSystemData(data) {
    const errors = [];

    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required and must be non-empty string' });
    }

    if (!data.port || typeof data.port !== 'number' || data.port < 1 || data.port > 65535) {
      errors.push({ field: 'port', message: 'Port is required and must be between 1-65535' });
    }

    // Optional validations
    if (data.status && !['online', 'offline', 'degraded'].includes(data.status)) {
      errors.push({ field: 'status', message: 'Status must be one of: online, offline, degraded' });
    }

    if (data.url && typeof data.url !== 'string') {
      errors.push({ field: 'url', message: 'URL must be a string' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const systemsService = new SystemsService();
