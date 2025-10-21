import SystemsRepository from '../repositories/SystemsRepository.js';
import IdeasRepository from '../repositories/IdeasRepository.js';
import FilesRepository from '../repositories/FilesRepository.js';
import { logger } from '../config/logger.js';

class StatsService {
  constructor() {
    this.systemsRepository = SystemsRepository;
    this.ideasRepository = IdeasRepository;
    this.filesRepository = FilesRepository;
  }

  /**
   * Get overall dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [
        systemStats,
        ideaStats,
        fileStats,
        recentActivity
      ] = await Promise.all([
        this.getSystemStats(),
        this.getIdeaStats(),
        this.getFileStats(),
        this.getRecentActivity()
      ]);

      return {
        overview: {
          total_systems: systemStats.total,
          active_systems: systemStats.active,
          total_ideas: ideaStats.total,
          completed_ideas: ideaStats.completed,
          total_files: fileStats.total,
          total_storage_mb: Math.round(fileStats.total_size_bytes / (1024 * 1024))
        },
        systems: systemStats,
        ideas: ideaStats,
        files: fileStats,
        recent_activity: recentActivity
      };
    } catch (error) {
      logger.error('Failed to get dashboard stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      const allSystems = await this.systemsRepository.getAllSystems({});

      const stats = {
        total: allSystems.length,
        active: 0,
        inactive: 0,
        degraded: 0,
        unknown: 0,
        by_type: {},
        by_owner: {},
        by_status: {},
        health_trend: []
      };

      // Count by status
      allSystems.forEach(system => {
        const status = system.status?.toLowerCase() || 'unknown';
        stats.by_status[status] = (stats.by_status[status] || 0) + 1;

        if (status === 'active' || status === 'healthy') {
          stats.active++;
        } else if (status === 'inactive' || status === 'stopped') {
          stats.inactive++;
        } else if (status === 'degraded' || status === 'error') {
          stats.degraded++;
        } else {
          stats.unknown++;
        }

        // Count by type
        const type = system.type || 'unknown';
        stats.by_type[type] = (stats.by_type[type] || 0) + 1;

        // Count by owner
        const owner = system.owner || 'unknown';
        stats.by_owner[owner] = (stats.by_owner[owner] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get system stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get idea statistics
   */
  async getIdeaStats() {
    try {
      const allIdeas = await this.ideasRepository.getAllIdeas({});

      const stats = {
        total: allIdeas.length,
        completed: 0,
        in_progress: 0,
        pending: 0,
        blocked: 0,
        cancelled: 0,
        by_category: {},
        by_priority: {},
        by_status: {},
        completion_rate: 0,
        average_completion_days: 0
      };

      let completedCount = 0;
      let totalCompletionDays = 0;

      // Count by status and other metrics
      allIdeas.forEach(idea => {
        const status = idea.status?.toLowerCase() || 'pending';
        stats.by_status[status] = (stats.by_status[status] || 0) + 1;

        switch (status) {
          case 'done':
          case 'completed':
            stats.completed++;
            completedCount++;
            break;
          case 'in_progress':
          case 'working':
            stats.in_progress++;
            break;
          case 'pending':
          case 'backlog':
            stats.pending++;
            break;
          case 'blocked':
            stats.blocked++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
        }

        // Count by category
        const category = idea.category || 'uncategorized';
        stats.by_category[category] = (stats.by_category[category] || 0) + 1;

        // Count by priority
        const priority = idea.priority || 'medium';
        stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;

        // Calculate completion days
        if (idea.created_at && (status === 'done' || status === 'completed')) {
          const createdDate = new Date(idea.created_at);
          const updatedDate = idea.updated_at ? new Date(idea.updated_at) : new Date();
          const daysDiff = Math.ceil((updatedDate - createdDate) / (1000 * 60 * 60 * 24));
          totalCompletionDays += daysDiff;
        }
      });

      // Calculate rates
      stats.completion_rate = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;
      stats.average_completion_days = completedCount > 0 ? Math.round(totalCompletionDays / completedCount) : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get idea stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats() {
    try {
      const stats = await this.filesRepository.getStatistics();

      // Add additional calculated metrics
      const avgFileSizeMB = stats.total > 0 ? (stats.total_size / (1024 * 1024)) / stats.total : 0;
      const downloadsPerFile = stats.total > 0 ? stats.total_downloads / stats.total : 0;

      return {
        ...stats,
        average_size_mb: Math.round(avgFileSizeMB * 100) / 100,
        downloads_per_file: Math.round(downloadsPerFile * 100) / 100,
        total_size_mb: Math.round(stats.total_size / (1024 * 1024) * 100) / 100,
        storage_efficiency: {
          small_files_percentage: stats.total > 0 ? Math.round((stats.size_distribution.small / stats.total) * 100) : 0,
          large_files_percentage: stats.total > 0 ? Math.round(((stats.size_distribution.large + stats.size_distribution.xlarge) / stats.total) * 100) : 0
        }
      };
    } catch (error) {
      logger.error('Failed to get file stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recent activity across all entities
   */
  async getRecentActivity(days = 7) {
    try {
      // For now, return a placeholder since we don't have activity logging implemented
      // In a real implementation, this would query an activity log table
      return {
        total_activities: 0,
        activities: [],
        by_type: {
          systems: 0,
          ideas: 0,
          files: 0
        },
        period_days: days
      };
    } catch (error) {
      logger.error('Failed to get recent activity', {
        error: error.message,
        days
      });
      throw error;
    }
  }

  /**
   * Get health summary for all systems
   */
  async getHealthSummary() {
    try {
      const systems = await this.systemsRepository.getAllSystems({});

      const summary = {
        total: systems.length,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
        overall_health: 'unknown',
        last_checked: new Date().toISOString(),
        systems: []
      };

      systems.forEach(system => {
        const status = system.status?.toLowerCase() || 'unknown';
        let healthStatus = 'unknown';

        if (status === 'active' || status === 'healthy') {
          summary.healthy++;
          healthStatus = 'healthy';
        } else if (status === 'degraded' || status === 'warning') {
          summary.degraded++;
          healthStatus = 'degraded';
        } else if (status === 'error' || status === 'failed' || status === 'inactive') {
          summary.unhealthy++;
          healthStatus = 'unhealthy';
        } else {
          summary.unknown++;
        }

        summary.systems.push({
          id: system.id,
          name: system.name,
          type: system.type,
          status: system.status,
          health: healthStatus,
          url: system.url,
          last_checked: system.updated_at
        });
      });

      // Calculate overall health
      if (summary.total === 0) {
        summary.overall_health = 'no_systems';
      } else if (summary.healthy === summary.total) {
        summary.overall_health = 'healthy';
      } else if (summary.unhealthy > 0) {
        summary.overall_health = 'unhealthy';
      } else if (summary.degraded > 0) {
        summary.overall_health = 'degraded';
      } else {
        summary.overall_health = 'mixed';
      }

      return summary;
    } catch (error) {
      logger.error('Failed to get health summary', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get analytics data for charts
   */
  async getAnalyticsData(timeframe = '30d') {
    try {
      const [
        systemStats,
        ideaStats,
        fileStats
      ] = await Promise.all([
        this.getSystemStats(),
        this.getIdeaStats(),
        this.getFileStats()
      ]);

      return {
        timeframe,
        charts: {
          systems: {
            by_type: Object.entries(systemStats.by_type).map(([type, count]) => ({
              label: type,
              value: count
            })),
            by_status: Object.entries(systemStats.by_status).map(([status, count]) => ({
              label: status,
              value: count
            }))
          },
          ideas: {
            by_status: Object.entries(ideaStats.by_status).map(([status, count]) => ({
              label: status,
              value: count
            })),
            by_category: Object.entries(ideaStats.by_category).map(([category, count]) => ({
              label: category,
              value: count
            })),
            by_priority: Object.entries(ideaStats.by_priority).map(([priority, count]) => ({
              label: priority,
              value: count
            }))
          },
          files: {
            by_type: Object.entries(fileStats.by_mime_type).map(([type, count]) => ({
              label: type.split('/')[1] || type,
              value: count
            })),
            size_distribution: [
              { label: 'Small (<1MB)', value: fileStats.size_distribution.small },
              { label: 'Medium (1-10MB)', value: fileStats.size_distribution.medium },
              { label: 'Large (10-100MB)', value: fileStats.size_distribution.large },
              { label: 'X-Large (>100MB)', value: fileStats.size_distribution.xlarge }
            ],
            by_visibility: [
              { label: 'Public', value: fileStats.by_visibility.public.count },
              { label: 'Private', value: fileStats.by_visibility.private.count }
            ]
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get analytics data', {
        error: error.message,
        timeframe
      });
      throw error;
    }
  }

  /**
   * Search across all entity types
   */
  async globalSearch(query, filters = {}) {
    try {
      const {
        systems = true,
        ideas = true,
        files = true,
        limit = 20
      } = filters;

      const searchResults = {};

      if (systems) {
        try {
          const systemResults = await this.systemsRepository.searchSystems(query);
          searchResults.systems = systemResults.slice(0, limit);
        } catch (error) {
          logger.warn('Failed to search systems', { error: error.message });
          searchResults.systems = [];
        }
      }

      if (ideas) {
        try {
          const ideaResults = await this.ideasRepository.searchIdeas(query);
          searchResults.ideas = ideaResults.slice(0, limit);
        } catch (error) {
          logger.warn('Failed to search ideas', { error: error.message });
          searchResults.ideas = [];
        }
      }

      if (files) {
        try {
          const fileResults = await this.filesRepository.search(query);
          searchResults.files = fileResults.slice(0, limit);
        } catch (error) {
          logger.warn('Failed to search files', { error: error.message });
          searchResults.files = [];
        }
      }

      const totalResults = Object.values(searchResults).reduce((sum, results) => sum + results.length, 0);

      return {
        query,
        total_results: totalResults,
        results: searchResults,
        filters_applied: { systems, ideas, files, limit }
      };
    } catch (error) {
      logger.error('Failed to perform global search', {
        error: error.message,
        query,
        filters
      });
      throw error;
    }
  }
}

export default new StatsService();