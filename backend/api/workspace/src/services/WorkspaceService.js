/**
 * Workspace Service
 *
 * Business logic layer for Workspace operations.
 * Separates business rules from HTTP controllers.
 *
 * Responsibilities:
 * - Data validation
 * - Business rules enforcement
 * - Orchestration of database operations
 * - Logging and error handling
 *
 * @module services/WorkspaceService
 */

export class WorkspaceService {
  /**
   * @param {Object} dbClient - Database client instance
   * @param {Object} logger - Logger instance
   */
  constructor(dbClient, logger) {
    this.db = dbClient;
    this.logger = logger;
    this.categoriesCache = null;
    this.cacheExpiry = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get valid categories (with caching)
   *
   * @returns {Promise<Array<string>>} List of valid category names
   */
  async getValidCategories() {
    const now = Date.now();

    // Return cached categories if valid
    if (this.categoriesCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.categoriesCache;
    }

    // Fetch fresh categories
    const categories = await this.db.getCategories();
    this.categoriesCache = categories.map((cat) => cat.name || cat.id);
    this.cacheExpiry = now + this.CACHE_TTL;

    this.logger.debug(
      { count: this.categoriesCache.length },
      "Categories cache refreshed",
    );
    return this.categoriesCache;
  }

  /**
   * Validate category exists
   *
   * @param {string} category - Category name to validate
   * @throws {Error} If category is invalid
   */
  async validateCategory(category) {
    const validCategories = await this.getValidCategories();

    if (!validCategories.includes(category)) {
      const error = new Error(
        `Invalid category '${category}'. Valid categories: ${validCategories.join(", ")}`,
      );
      error.statusCode = 400;
      error.code = "INVALID_CATEGORY";
      throw error;
    }
  }

  /**
   * Invalidate categories cache
   *
   * Called when categories are created/updated/deleted
   */
  invalidateCategoriesCache() {
    this.categoriesCache = null;
    this.cacheExpiry = null;
    this.logger.debug("Categories cache invalidated");
  }

  /**
   * Get all items with optional filtering
   *
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Filtered items
   */
  async getItems(filters = {}) {
    this.logger.debug({ filters }, "Fetching items");

    try {
      const items = await this.db.getItems();

      // Apply filters if provided
      let filteredItems = items;

      if (filters.category) {
        filteredItems = filteredItems.filter(
          (item) => item.category === filters.category,
        );
      }

      if (filters.status) {
        filteredItems = filteredItems.filter(
          (item) => item.status === filters.status,
        );
      }

      if (filters.priority) {
        filteredItems = filteredItems.filter(
          (item) => item.priority === filters.priority,
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(
          (item) =>
            item.title.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.tags?.some((tag) => tag.toLowerCase().includes(searchLower)),
        );
      }

      this.logger.info(
        { count: filteredItems.length },
        "Items fetched successfully",
      );
      return filteredItems;
    } catch (error) {
      this.logger.error({ err: error }, "Failed to fetch items");
      throw error;
    }
  }

  /**
   * Get a single item by ID
   *
   * @param {string|number} id - Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async getItem(id) {
    this.logger.debug({ id }, "Fetching item");

    try {
      const item = await this.db.getItem(id);

      if (!item) {
        this.logger.warn({ id }, "Item not found");
      }

      return item;
    } catch (error) {
      this.logger.error({ err: error, id }, "Failed to fetch item");
      throw error;
    }
  }

  /**
   * Create a new item
   *
   * @param {Object} itemData - Item data (validated)
   * @param {Object} user - User creating the item
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData, user = null) {
    this.logger.debug({ itemData, user }, "Creating item");

    try {
      // Validate category exists in database
      await this.validateCategory(itemData.category);

      // Apply business rules
      const item = {
        ...itemData,
        status: "new", // Always start as 'new'
        createdBy: user?.id || null,
        updatedBy: user?.id || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await this.db.createItem(item);

      this.logger.info(
        { itemId: created.id, title: created.title },
        "Item created successfully",
      );

      return created;
    } catch (error) {
      this.logger.error({ err: error, itemData }, "Failed to create item");
      throw error;
    }
  }

  /**
   * Update an existing item
   *
   * @param {string|number} id - Item ID
   * @param {Object} updates - Fields to update (validated)
   * @param {Object} user - User updating the item
   * @returns {Promise<Object|null>} Updated item or null if not found
   */
  async updateItem(id, updates, user = null) {
    this.logger.debug({ id, updates, user }, "Updating item");

    try {
      // Validate category if being updated
      if (updates.category) {
        await this.validateCategory(updates.category);
      }

      // Check if item exists
      const existing = await this.db.getItem(id);

      if (!existing) {
        this.logger.warn({ id }, "Item not found for update");
        return null;
      }

      // Apply business rules
      const updateData = {
        ...updates,
        updatedBy: user?.id || null,
        updatedAt: new Date().toISOString(),
      };

      const updated = await this.db.updateItem(id, updateData);

      this.logger.info(
        { itemId: id, changes: Object.keys(updates) },
        "Item updated successfully",
      );

      return updated;
    } catch (error) {
      this.logger.error({ err: error, id, updates }, "Failed to update item");
      throw error;
    }
  }

  /**
   * Delete an item
   *
   * @param {string|number} id - Item ID
   * @param {Object} user - User deleting the item
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteItem(id, user = null) {
    this.logger.debug({ id, user }, "Deleting item");

    try {
      // Check if item exists (for audit logging)
      const existing = await this.db.getItem(id);

      if (!existing) {
        this.logger.warn({ id }, "Item not found for deletion");
        return false;
      }

      const deleted = await this.db.deleteItem(id);

      if (deleted) {
        this.logger.info(
          {
            itemId: id,
            title: existing.title,
            deletedBy: user?.id,
          },
          "Item deleted successfully",
        );
      }

      return deleted;
    } catch (error) {
      this.logger.error({ err: error, id }, "Failed to delete item");
      throw error;
    }
  }

  /**
   * Get workspace statistics
   *
   * @returns {Promise<Object>} Statistics (counts by category, status, priority)
   */
  async getStatistics() {
    this.logger.debug("Fetching workspace statistics");

    try {
      const items = await this.db.getItems();

      const stats = {
        total: items.length,
        byCategory: {},
        byStatus: {},
        byPriority: {},
      };

      items.forEach((item) => {
        // Count by category
        stats.byCategory[item.category] =
          (stats.byCategory[item.category] || 0) + 1;

        // Count by status
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;

        // Count by priority
        stats.byPriority[item.priority] =
          (stats.byPriority[item.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.logger.error({ err: error }, "Failed to fetch statistics");
      throw error;
    }
  }
}
