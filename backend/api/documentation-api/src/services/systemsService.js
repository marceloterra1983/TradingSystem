/**
 * Systems Service
 * Business logic for system management
 */

import { systemsRepository } from "../repositories/systemsRepository.js";

/**
 * Get all systems with optional filtering
 * @param {Object} filters - Optional filters (e.g. { status: 'online' })
 * @returns {Promise<Object>} Result with systems data
 */
export async function getAllSystems(filters = {}) {
  try {
    const systems = await systemsRepository.findAll(filters);
    const total = await systemsRepository.count(filters);

    return {
      success: true,
      data: systems,
      count: systems.length,
      total,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get system by ID
 * @param {string} id - System ID
 * @returns {Promise<Object>} Result with system data
 */
export async function getSystemById(id) {
  try {
    const system = await systemsRepository.findById(id);

    if (!system) {
      return {
        success: false,
        error: "System not found",
      };
    }

    return {
      success: true,
      data: system,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validate system data
 * @param {Object} systemData - System data to validate
 * @returns {Object} Validation result
 */
function validateSystemData(systemData) {
  const errors = [];

  // Required: name
  if (!systemData.name || systemData.name.trim() === "") {
    errors.push({ field: "name", message: "Name is required" });
  }

  // Port validation
  if (systemData.port !== undefined) {
    const port = Number(systemData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({
        field: "port",
        message: "Port must be between 1 and 65535",
      });
    }
  }

  // Status validation
  if (systemData.status) {
    const validStatuses = ["online", "offline", "maintenance"];
    if (!validStatuses.includes(systemData.status)) {
      errors.push({
        field: "status",
        message: "Status must be online, offline, or maintenance",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create new system
 * @param {Object} systemData - System data
 * @returns {Promise<Object>} Result with created system
 */
export async function createSystem(systemData) {
  try {
    // Validate
    const validation = validateSystemData(systemData);
    if (!validation.valid) {
      return {
        success: false,
        error: "Validation failed",
        errors: validation.errors,
      };
    }

    // Create
    const createdSystem = await systemsRepository.create(systemData);

    return {
      success: true,
      data: createdSystem,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update existing system
 * @param {string} id - System ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Result with updated system
 */
export async function updateSystem(id, updates) {
  try {
    // Check if exists
    const existing = await systemsRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        error: "System not found",
      };
    }

    // Validate updates
    const validation = validateSystemData({ ...existing, ...updates });
    if (!validation.valid) {
      return {
        success: false,
        error: "Validation failed",
        errors: validation.errors,
      };
    }

    // Update
    const updatedSystem = await systemsRepository.update(id, updates);

    return {
      success: true,
      data: updatedSystem,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete system
 * @param {string} id - System ID
 * @returns {Promise<Object>} Result
 */
export async function deleteSystem(id) {
  try {
    // Check if exists
    const existing = await systemsRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        error: "System not found",
      };
    }

    // Delete
    await systemsRepository.delete(id);

    return {
      success: true,
      message: "System deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get system statistics
 * @returns {Promise<Object>} Statistics
 */
export async function getSystemStats() {
  try {
    const allSystems = await systemsRepository.findAll({});

    const stats = {
      total: allSystems.length,
      byStatus: {
        online: 0,
        offline: 0,
        maintenance: 0,
      },
    };

    allSystems.forEach((system) => {
      if (stats.byStatus[system.status] !== undefined) {
        stats.byStatus[system.status]++;
      }
    });

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export as object for easier mocking in tests
export const systemsService = {
  getAllSystems,
  getSystemById,
  createSystem,
  updateSystem,
  deleteSystem,
  getSystemStats,
  validateSystemData,
};
