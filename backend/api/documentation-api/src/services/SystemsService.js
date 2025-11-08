import systemsRepository from "../repositories/SystemsRepository.js";
import { logger } from "../config/logger.js";

/**
 * Service for managing documentation systems
 */
export class SystemsService {
  constructor() {
    this.repository = systemsRepository;
  }

  /**
   * Create a new documentation system
   */
  async createSystem(systemData, userId) {
    try {
      // Validate required fields
      this.validateSystemData(systemData);

      // Check if system with same name already exists
      const existing = await this.repository.findAll({ name: systemData.name });
      if (existing.length > 0) {
        throw new Error("System with this name already exists");
      }

      // Add audit trail
      const system = await this.repository.create({
        ...systemData,
        created_by: userId,
      });

      logger.info("System created successfully", {
        systemId: system.id,
        name: system.name,
        userId,
      });

      return system;
    } catch (error) {
      logger.error("Failed to create system", {
        error: error.message,
        data: systemData,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get system by ID
   */
  async getSystemById(id) {
    try {
      const system = await this.repository.findById(id);
      if (!system) {
        throw new Error("System not found");
      }
      return system;
    } catch (error) {
      logger.error("Failed to get system by ID", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get all systems with filtering
   */
  async getAllSystems(filters = {}) {
    try {
      return await this.repository.findAll(filters);
    } catch (error) {
      logger.error("Failed to get all systems", {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Update system
   */
  async updateSystem(id, updateData, userId) {
    try {
      // Check if system exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error("System not found");
      }

      // Validate update data
      this.validateUpdateData(updateData);

      // Update system
      const updatedSystem = await this.repository.update(id, updateData);

      logger.info("System updated successfully", {
        systemId: id,
        fields: Object.keys(updateData),
        userId,
      });

      return updatedSystem;
    } catch (error) {
      logger.error("Failed to update system", {
        error: error.message,
        id,
        updateData,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete system
   */
  async deleteSystem(id, userId) {
    try {
      // Check if system exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error("System not found");
      }

      // Check if system has associated ideas or files
      // Note: This would require additional repositories to be implemented

      await this.repository.delete(id);

      logger.info("System deleted successfully", {
        systemId: id,
        systemName: existing.name,
        userId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to delete system", {
        error: error.message,
        id,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check system health status
   */
  async checkSystemHealth(id) {
    try {
      const system = await this.repository.findById(id);
      if (!system) {
        throw new Error("System not found");
      }

      if (!system.url) {
        return {
          status: "unknown",
          message: "No URL configured for health check",
          response_time_ms: null,
        };
      }

      const startTime = Date.now();
      let status = "online";
      let responseTimeMs = null;
      let message = "System is accessible";

      try {
        // Simple HTTP health check
        const response = await fetch(system.url, {
          method: "GET",
          timeout: 10000, // 10 seconds
        });

        responseTimeMs = Date.now() - startTime;

        if (!response.ok) {
          status = "error";
          message = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        status = "offline";
        message = error.message;
        responseTimeMs = Date.now() - startTime;
      }

      // Update system status in database
      await this.repository.update(id, {
        status,
        last_checked: new Date().toISOString(),
        response_time_ms: responseTimeMs,
      });

      return {
        status,
        message,
        response_time_ms: responseTimeMs,
        last_checked: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to check system health", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Check health of all systems
   */
  async checkAllSystemsHealth() {
    try {
      const systems = await this.repository.findAll();
      const healthChecks = await Promise.allSettled(
        systems.map((system) => this.checkSystemHealth(system.id)),
      );

      const results = healthChecks.map((result, index) => ({
        system: systems[index],
        health:
          result.status === "fulfilled"
            ? result.value
            : {
                status: "error",
                message: result.reason.message,
                response_time_ms: null,
              },
      }));

      return results;
    } catch (error) {
      logger.error("Failed to check all systems health", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get systems by status
   */
  async getSystemsByStatus(status) {
    try {
      return await this.repository.findByStatus(status);
    } catch (error) {
      logger.error("Failed to get systems by status", {
        error: error.message,
        status,
      });
      throw error;
    }
  }

  /**
   * Get systems by type
   */
  async getSystemsByType(type) {
    try {
      return await this.repository.findByType(type);
    } catch (error) {
      logger.error("Failed to get systems by type", {
        error: error.message,
        type,
      });
      throw error;
    }
  }

  /**
   * Search systems
   */
  async searchSystems(query) {
    try {
      if (!query || query.trim().length < 2) {
        throw new Error("Search query must be at least 2 characters long");
      }

      return await this.repository.search(query.trim());
    } catch (error) {
      logger.error("Failed to search systems", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStatistics() {
    try {
      return await this.repository.getStatistics();
    } catch (error) {
      logger.error("Failed to get system statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate system data for creation
   */
  validateSystemData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push("Name is required");
    }

    if (data.name && data.name.length > 255) {
      errors.push("Name must be less than 255 characters");
    }

    if (!data.type) {
      errors.push("Type is required");
    }

    const validTypes = ["api", "webapp", "docs", "tool"];
    if (data.type && !validTypes.includes(data.type)) {
      errors.push(`Type must be one of: ${validTypes.join(", ")}`);
    }

    if (data.url && !this.isValidUrl(data.url)) {
      errors.push("URL must be a valid HTTP/HTTPS URL");
    }

    if (data.description && data.description.length > 1000) {
      errors.push("Description must be less than 1000 characters");
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Validate update data
   */
  validateUpdateData(data) {
    const errors = [];

    if (data.name && data.name.trim().length === 0) {
      errors.push("Name cannot be empty");
    }

    if (data.name && data.name.length > 255) {
      errors.push("Name must be less than 255 characters");
    }

    if (data.type) {
      const validTypes = ["api", "webapp", "docs", "tool"];
      if (!validTypes.includes(data.type)) {
        errors.push(`Type must be one of: ${validTypes.join(", ")}`);
      }
    }

    if (data.url && !this.isValidUrl(data.url)) {
      errors.push("URL must be a valid HTTP/HTTPS URL");
    }

    if (data.description && data.description.length > 1000) {
      errors.push("Description must be less than 1000 characters");
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Validate URL format
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return string.startsWith("http://") || string.startsWith("https://");
    } catch (_err) {
      return false;
    }
  }
}

export default new SystemsService();
