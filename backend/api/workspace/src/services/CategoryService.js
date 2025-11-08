/**
 * Category Service
 *
 * Business logic layer for Category operations.
 *
 * Responsibilities:
 * - Category validation with caching
 * - Category CRUD operations
 * - Cache invalidation
 *
 * @module services/CategoryService
 */

export class CategoryService {
  /**
   * @param {Object} dbClient - Database client instance
   * @param {Object} logger - Logger instance
   */
  constructor(dbClient, logger) {
    this.db = dbClient;
    this.logger = logger;

    // In-memory cache for categories (they change rarely)
    this.categoriesCache = null;
    this.cacheExpiry = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all active categories (with caching)
   *
   * @param {boolean} forceRefresh - Force cache refresh
   * @returns {Promise<Array>} Array of categories
   */
  async getCategories(forceRefresh = false) {
    // Return cached if valid
    if (
      !forceRefresh &&
      this.categoriesCache &&
      Date.now() < this.cacheExpiry
    ) {
      this.logger.debug("Returning categories from cache");
      return this.categoriesCache;
    }

    this.logger.debug("Fetching categories from database");

    try {
      const categories = await this.db.getCategories();
      const normalized = categories.map((category, index) =>
        this.normalizeCategoryRecord(category, index),
      );

      // Update cache with normalized data
      this.categoriesCache = normalized;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      this.logger.info(
        { count: normalized.length },
        "Categories fetched and cached",
      );

      return normalized;
    } catch (error) {
      this.logger.error({ err: error }, "Failed to fetch categories");
      throw error;
    }
  }

  /**
   * Get list of valid category names (for validation)
   *
   * @returns {Promise<Array<string>>} Array of category names
   */
  async getValidCategoryNames() {
    const categories = await this.getCategories();
    return categories.map((cat) => cat.name);
  }

  /**
   * Validate if a category name is valid
   *
   * @param {string} categoryName - Category name to validate
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async isValidCategory(categoryName) {
    const validCategories = await this.getValidCategoryNames();
    return validCategories.includes(categoryName);
  }

  /**
   * Get a specific category by name
   *
   * @param {string} name - Category name
   * @returns {Promise<Object|null>} Category or null if not found
   */
  async getCategory(name) {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.name === name) || null;
  }

  /**
   * Normalize category records coming from different database strategies.
   * Ensures the HTTP layer always exposes the same contract (is_active, display_order, etc).
   *
   * @param {Object} record - Raw category record
   * @param {number} index - Position in the array (used as fallback for ordering)
   * @returns {Object} Normalized category
   */
  normalizeCategoryRecord(record, index = 0) {
    const id =
      record.id ?? record.name ?? record.display_name ?? `category-${index}`;
    const name = record.name ?? record.id ?? record.display_name ?? id;
    const fallbackOrder =
      typeof record.display_order === "number"
        ? record.display_order
        : typeof record.sort_order === "number"
          ? record.sort_order
          : typeof record.order === "number"
            ? record.order
            : index + 1;
    const isActive =
      typeof record.is_active === "boolean"
        ? record.is_active
        : typeof record.active === "boolean"
          ? record.active
          : true;

    return {
      ...record,
      id,
      name,
      display_name: record.display_name ?? record.displayName ?? name,
      description: record.description ?? record.display_name ?? null,
      color: record.color ?? "#6B7280",
      icon: record.icon ?? null,
      display_order: fallbackOrder,
      is_active: isActive,
      created_at: record.created_at ?? record.createdAt ?? null,
      updated_at: record.updated_at ?? record.updatedAt ?? null,
      created_by: record.created_by ?? record.createdBy ?? null,
    };
  }

  /**
   * Invalidate categories cache
   * Call this when categories are updated
   */
  invalidateCache() {
    this.logger.debug("Invalidating categories cache");
    this.categoriesCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Get category statistics
   *
   * @returns {Promise<Object>} Statistics (count, active, inactive)
   */
  async getStatistics() {
    try {
      const categories = await this.getCategories();

      return {
        total: categories.length,
        active: categories.filter((cat) => cat.is_active).length,
        inactive: categories.filter((cat) => !cat.is_active).length,
      };
    } catch (error) {
      this.logger.error({ err: error }, "Failed to fetch category statistics");
      throw error;
    }
  }
}
