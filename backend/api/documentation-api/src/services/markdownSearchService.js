import FlexSearch from 'flexsearch';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../utils/logger.js';

/**
 * Markdown Search Service
 *
 * Indexes markdown documentation with frontmatter metadata using FlexSearch.
 * Supports faceted filtering by domain, type, tags, and status.
 */
class MarkdownSearchService {
  constructor(docsDir) {
    this.docsDir = docsDir;
    this.index = null;
    this.docsById = {}; // In-memory document store by ID
    this.facetCache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000, // 5 minutes
    };
    this.lastReindexTime = null;
    this.reindexLock = false;
    this.stats = {
      totalFiles: 0,
      totalDomains: 0,
      totalTypes: 0,
      totalTags: 0,
      totalStatuses: 0,
    };

    // Initialize FlexSearch Document index
    this.initializeIndex();
  }

  /**
   * Initialize FlexSearch Document index with configuration
   */
  initializeIndex() {
    this.index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'summary', 'content'],
        store: [
          'title',
          'domain',
          'type',
          'tags',
          'status',
          'path',
          'summary',
          'last_review',
        ],
        tag: 'tags', // Enable tag-based filtering
      },
      tokenize: 'forward',
      cache: true,
      context: {
        resolution: 9,
        depth: 3,
        bidirectional: true,
      },
    });

    logger.info('FlexSearch index initialized for markdown documentation');
  }

  /**
   * Parse frontmatter from markdown content
   * @param {string} content - Raw markdown content
   * @returns {object} - Parsed frontmatter and content
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return null;
    }

    try {
      const frontmatter = yaml.load(match[1]);
      const bodyContent = match[2];
      return { frontmatter, content: bodyContent };
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse frontmatter');
      return null;
    }
  }

  /**
   * Extract first N characters of content for search
   * @param {string} content - Markdown content
   * @param {number} maxChars - Maximum characters to extract
   * @returns {string} - Extracted content
   */
  extractContent(content, maxChars = 500) {
    // Remove markdown syntax for cleaner search
    let cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with text
      .replace(/[#*_~]/g, '') // Remove markdown formatting
      .trim();

    return cleanContent.substring(0, maxChars);
  }

  /**
   * Generate unique ID from file path
   * @param {string} filePath - File path
   * @returns {string} - Unique ID
   */
  generateId(filePath) {
    return filePath
      .replace(/\\/g, '/')
      .replace(/\.md$/, '')
      .replace(/[^a-zA-Z0-9/-]/g, '-')
      .toLowerCase();
  }

  /**
   * Check if file should be excluded from indexing
   * @param {string} filePath - File path
   * @returns {boolean} - True if should be excluded
   */
  shouldExclude(filePath) {
    const excludePatterns = [
      'node_modules',
      '.git',
      'build',
      'dist',
      '.next',
      'coverage',
      'temp',
      'tmp',
    ];

    return excludePatterns.some((pattern) => filePath.includes(pattern));
  }

  /**
   * Recursively scan directory for markdown files
   * @param {string} dir - Directory to scan
   * @returns {Promise<string[]>} - Array of file paths
   */
  async scanDirectory(dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (this.shouldExclude(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn({ err: error, dir }, 'Failed to scan directory');
    }

    return files;
  }

  /**
   * Index all markdown files in docs directory
   * @returns {Promise<object>} - Indexing statistics
   */
  async indexMarkdownFiles() {
    // Prevent concurrent reindexing
    if (this.reindexLock) {
      logger.warn('Reindexing already in progress, skipping');
      return { error: 'Reindexing in progress' };
    }

    // Debounce reindexing (max once per minute)
    if (this.lastReindexTime && Date.now() - this.lastReindexTime < 60000) {
      logger.warn('Reindex called too soon, skipping');
      return { error: 'Reindex rate limit' };
    }

    this.reindexLock = true;
    const startTime = Date.now();

    try {
      // Clear existing index and docs map
      this.initializeIndex();
      this.docsById = {};

      // Scan for markdown files
      const files = await this.scanDirectory(this.docsDir);
      logger.info({ fileCount: files.length }, 'Scanning markdown files');

      let indexed = 0;
      const domains = new Set();
      const types = new Set();
      const tags = new Set();
      const statuses = new Set();
      const errors = [];

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = this.parseFrontmatter(content);

          if (!parsed || !parsed.frontmatter) {
            errors.push({ file: filePath, error: 'No frontmatter' });
            continue;
          }

          const { frontmatter, content: bodyContent } = parsed;

          // Validate required fields
          if (!frontmatter.title || !frontmatter.domain || !frontmatter.type) {
            errors.push({
              file: filePath,
              error: 'Missing required frontmatter fields',
            });
            continue;
          }

          // Generate document ID
          const id = this.generateId(path.relative(this.docsDir, filePath));

          // Generate relative path for links
          const relativePath = path
            .relative(this.docsDir, filePath)
            .replace(/\\/g, '/')
            .replace(/\.md$/, '');

          // Extract content for full-text search
          const searchContent = this.extractContent(bodyContent);

          // Prepare document for indexing
          const doc = {
            id,
            title: frontmatter.title,
            domain: frontmatter.domain,
            type: frontmatter.type,
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
            status: frontmatter.status || 'active',
            path: `/docs/${relativePath}`,
            summary: frontmatter.summary || '',
            content: searchContent,
            last_review: frontmatter.last_review || '',
          };

          // Add to index
          this.index.add(doc);

          // Store in docsById map
          this.docsById[id] = doc;

          // Collect statistics
          domains.add(doc.domain);
          types.add(doc.type);
          statuses.add(doc.status);
          doc.tags.forEach((tag) => tags.add(tag));

          indexed++;
        } catch (error) {
          errors.push({ file: filePath, error: error.message });
          logger.warn({ err: error, file: filePath }, 'Failed to index file');
        }
      }

      // Update statistics
      this.stats = {
        totalFiles: indexed,
        totalDomains: domains.size,
        totalTypes: types.size,
        totalTags: tags.size,
        totalStatuses: statuses.size,
      };

      // Clear facet cache
      this.facetCache.data = null;
      this.facetCache.timestamp = null;

      this.lastReindexTime = Date.now();
      const duration = Date.now() - startTime;

      logger.info(
        {
          indexed,
          domains: domains.size,
          types: types.size,
          tags: tags.size,
          errors: errors.length,
          duration_ms: duration,
        },
        'Markdown indexing complete'
      );

      return {
        files: indexed,
        domains: domains.size,
        types: types.size,
        tags: tags.size,
        statuses: statuses.size,
        duration_ms: duration,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
      };
    } finally {
      this.reindexLock = false;
    }
  }

  /**
   * Search markdown documentation with faceted filtering
   * @param {string} query - Search query
   * @param {object} filters - Faceted filters {domain, type, tags[], status}
   * @param {number} limit - Maximum results
   * @returns {Promise<object>} - Search results
   */
  async search(query, filters = {}, limit = 20) {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    try {
      let documents = [];

      // Execute FlexSearch query or use full doc list
      if (query && query.trim().length > 0) {
        // Search with query using enriched results
        let searchOptions = {
          query: query.trim(),
          limit: limit * 3, // Get more results for post-filtering
          enrich: true, // Get enriched results with doc field
        };

        if (filters.tags && filters.tags.length > 0) {
          // Use tag-based search if tags filter provided
          searchOptions.tag = filters.tags;
        }

        const results = this.index.search(searchOptions);

        // Extract documents from enriched results
        if (Array.isArray(results)) {
          const docMap = new Map();
          results.forEach((fieldResult) => {
            if (fieldResult && fieldResult.result) {
              fieldResult.result.forEach((enrichedResult) => {
                const docId = enrichedResult.id;
                if (!docMap.has(docId)) {
                  // Read from docsById instead of internal store
                  const doc = this.docsById[docId];
                  if (doc) {
                    docMap.set(docId, { ...doc, score: 1.0 });
                  }
                }
              });
            }
          });
          documents = Array.from(docMap.values());
        }
      } else {
        // No query: bypass FlexSearch and use full document list from docsById
        documents = Object.values(this.docsById).map((doc) => ({
          ...doc,
          score: 1.0,
        }));
      }

      // Post-filter by domain, type, status, tags
      if (filters.domain) {
        documents = documents.filter((doc) => doc.domain === filters.domain);
      }
      if (filters.type) {
        documents = documents.filter((doc) => doc.type === filters.type);
      }
      if (filters.status) {
        documents = documents.filter((doc) => doc.status === filters.status);
      }
      // Additional tags filtering (if not handled by FlexSearch tag search)
      if (filters.tags && filters.tags.length > 0) {
        documents = documents.filter((doc) =>
          filters.tags.every((tag) => doc.tags.includes(tag))
        );
      }

      // Limit results
      documents = documents.slice(0, limit);

      return {
        total: documents.length,
        results: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          domain: doc.domain,
          type: doc.type,
          tags: doc.tags,
          status: doc.status,
          path: doc.path,
          summary: doc.summary,
          score: doc.score,
        })),
      };
    } catch (error) {
      logger.error({ err: error, query, filters }, 'Search failed');
      throw error;
    }
  }

  /**
   * Compute facet counts for current query
   * @param {string} query - Search query (optional)
   * @returns {Promise<object>} - Facet counts
   */
  async getFacets(query = '') {
    // Check cache
    if (
      this.facetCache.data &&
      this.facetCache.timestamp &&
      Date.now() - this.facetCache.timestamp < this.facetCache.ttl &&
      !query // Only cache for no-query facets
    ) {
      return this.facetCache.data;
    }

    try {
      let documents;

      if (query && query.trim().length > 0) {
        // Get matching documents via search with increased limit
        const searchResult = await this.search(query, {}, 10000);
        documents = searchResult.results;
      } else {
        // No query: iterate over all docs from docsById to avoid undercounting
        documents = Object.values(this.docsById);
      }

      // Aggregate facets
      const domainCounts = {};
      const typeCounts = {};
      const tagCounts = {};
      const statusCounts = {};

      documents.forEach((doc) => {
        // Count domains
        domainCounts[doc.domain] = (domainCounts[doc.domain] || 0) + 1;

        // Count types
        typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;

        // Count statuses
        statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;

        // Count tags
        doc.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Convert to array format with counts
      const facets = {
        domains: Object.entries(domainCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        types: Object.entries(typeCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        tags: Object.entries(tagCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50), // Top 50 tags
        statuses: Object.entries(statusCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
      };

      // Cache facets if no query
      if (!query) {
        this.facetCache.data = facets;
        this.facetCache.timestamp = Date.now();
      }

      return facets;
    } catch (error) {
      logger.error({ err: error, query }, 'Failed to compute facets');
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   * @param {string} query - Partial query
   * @param {number} limit - Maximum suggestions
   * @returns {Promise<array>} - Suggestions
   */
  async suggest(query, limit = 5) {
    if (!this.index || !query || query.trim().length < 2) {
      return [];
    }

    try {
      // Search titles only with prefix matching using enriched results
      const results = this.index.search({
        query: query.trim(),
        limit,
        index: ['title'], // Search only in titles
        enrich: true, // Get enriched results
      });

      // Extract documents from enriched results
      const suggestions = [];
      if (Array.isArray(results)) {
        results.forEach((fieldResult) => {
          if (fieldResult && fieldResult.result) {
            fieldResult.result.forEach((enrichedResult) => {
              const docId = enrichedResult.id;
              // Read from docsById instead of internal store
              const doc = this.docsById[docId];
              if (doc && suggestions.length < limit) {
                suggestions.push({
                  text: doc.title,
                  domain: doc.domain,
                  type: doc.type,
                  path: doc.path,
                });
              }
            });
          }
        });
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error({ err: error, query }, 'Suggestion failed');
      return [];
    }
  }

  /**
   * Rebuild entire index
   * @returns {Promise<object>} - Reindexing statistics
   */
  async reindex() {
    logger.info('Manual reindex triggered');
    return this.indexMarkdownFiles();
  }

  /**
   * Get indexing statistics
   * @returns {object} - Statistics
   */
  getStats() {
    return {
      ...this.stats,
      lastReindexTime: this.lastReindexTime,
      cacheValid:
        this.facetCache.data !== null && this.facetCache.timestamp !== null,
    };
  }
}

export default MarkdownSearchService;

