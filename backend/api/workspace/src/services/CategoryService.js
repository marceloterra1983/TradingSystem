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
    if (!forceRefresh && this.categoriesCache && Date.now() < this.cacheExpiry) {
      this.logger.debug('Returning categories from cache');
      return this.categoriesCache;
    }
    
    this.logger.debug('Fetching categories from database');
    
    try {
      const categories = await this.db.getCategories();
      
      // Update cache
      this.categoriesCache = categories;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      
      this.logger.info({ count: categories.length }, 'Categories fetched and cached');
      
      return categories;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to fetch categories');
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
    return categories.map(cat => cat.name);
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
    return categories.find(cat => cat.name === name) || null;
  }

  /**
   * Invalidate categories cache
   * Call this when categories are updated
   */
  invalidateCache() {
    this.logger.debug('Invalidating categories cache');
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
        active: categories.filter(cat => cat.is_active).length,
        inactive: categories.filter(cat => !cat.is_active).length,
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to fetch category statistics');
      throw error;
    }
  }
}

