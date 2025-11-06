/**
 * Systems Repository
 * Data access layer for systems management
 * 
 * NOTE: This is a stub implementation for testing purposes.
 * Replace with actual database integration when ready.
 */

// In-memory storage for development
const systems = new Map();
let nextId = 1;

/**
 * Find all systems with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of systems
 */
export async function findAll(filters = {}) {
  let results = Array.from(systems.values());
  
  // Apply filters
  if (filters.status) {
    results = results.filter(system => system.status === filters.status);
  }
  
  if (filters.name) {
    results = results.filter(system => 
      system.name.toLowerCase().includes(filters.name.toLowerCase())
    );
  }
  
  return results;
}

/**
 * Find system by ID
 * @param {string} id - System ID
 * @returns {Promise<Object|null>} System or null if not found
 */
export async function findById(id) {
  return systems.get(id) || null;
}

/**
 * Create new system
 * @param {Object} systemData - System data
 * @returns {Promise<Object>} Created system
 */
export async function create(systemData) {
  const id = `sys-${nextId++}`;
  const system = {
    id,
    ...systemData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  systems.set(id, system);
  return system;
}

/**
 * Update system
 * @param {string} id - System ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated system
 */
export async function update(id, updates) {
  const system = systems.get(id);
  if (!system) {
    throw new Error('System not found');
  }
  
  const updated = {
    ...system,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  systems.set(id, updated);
  return updated;
}

/**
 * Delete system
 * @param {string} id - System ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteSystem(id) {
  return systems.delete(id);
}

// Alias for delete (used by tests)
export const deleteFunc = deleteSystem;

/**
 * Count systems with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<number>} Count
 */
export async function count(filters = {}) {
  const results = await findAll(filters);
  return results.length;
}

// Export as object for easier mocking
export const systemsRepository = {
  findAll,
  findById,
  create,
  update,
  delete: deleteSystem,
  count
};

