import { systemsRepository } from '../repositories/systemsRepository.js';
import { ideasRepository } from '../repositories/ideasRepository.js';
import { filesRepository } from '../repositories/filesRepository.js';
import { questdbClient } from '../utils/questdbClient.js';

/**
 * Service for generating statistics and analytics
 */
export const statsService = {
  /**
   * Get comprehensive statistics across all entities
   * @returns {Promise<Object>} Complete statistics object
   */
  async getOverallStatistics() {
    try {
      // Fetch all data in parallel
      const [systems, ideas, files] = await Promise.all([
        systemsRepository.findAll(),
        ideasRepository.findAll(),
        filesRepository.findAll()
      ]);

      // Systems statistics
      const systemsStats = this._calculateSystemsStats(systems);

      // Ideas statistics
      const ideasStats = await this._calculateIdeasStats(ideas);

      // Files statistics
      const filesStats = this._calculateFilesStats(files);

      // Combined statistics
      const combined = {
        total_entities: systems.length + ideas.length + files.length,
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: {
          systems: systemsStats,
          ideas: ideasStats,
          files: filesStats,
          combined,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calculate systems statistics
   * @private
   */
  _calculateSystemsStats(systems) {
    const total = systems.length;

    // Group by status
    const byStatus = {};
    for (const system of systems) {
      const status = system.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    // Group by tags
    const byTag = {};
    for (const system of systems) {
      if (system.tags) {
        const tags = system.tags.split(',').map(t => t.trim());
        for (const tag of tags) {
          byTag[tag] = (byTag[tag] || 0) + 1;
        }
      }
    }

    // Port distribution
    const ports = systems.map(s => s.port).filter(p => p);
    const minPort = ports.length > 0 ? Math.min(...ports) : null;
    const maxPort = ports.length > 0 ? Math.max(...ports) : null;

    return {
      total,
      by_status: byStatus,
      by_tag: byTag,
      online_count: byStatus.online || 0,
      offline_count: byStatus.offline || 0,
      degraded_count: byStatus.degraded || 0,
      port_range: ports.length > 0 ? { min: minPort, max: maxPort } : null
    };
  },

  /**
   * Calculate ideas statistics
   * @private
   */
  async _calculateIdeasStats(ideas) {
    const total = ideas.length;

    // Group by status (Kanban columns)
    const byStatus = {
      backlog: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0
    };

    for (const idea of ideas) {
      const status = idea.status || 'backlog';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    // Group by category
    const byCategory = {};
    for (const idea of ideas) {
      const category = idea.category || 'uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    // Group by priority
    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const idea of ideas) {
      const priority = idea.priority || 'medium';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }

    // Completion rate
    const completedCount = byStatus.done || 0;
    const completionRate = total > 0 ? ((completedCount / total) * 100).toFixed(2) : 0;

    // Time-based statistics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentIdeas = ideas.filter(i => {
      const createdAt = new Date(i.created_at);
      return createdAt >= last7Days;
    });

    const completedRecently = ideas.filter(i => {
      if (!i.completed_at) return false;
      const completedAt = new Date(i.completed_at);
      return completedAt >= last30Days;
    });

    return {
      total,
      by_status: byStatus,
      by_category: byCategory,
      by_priority: byPriority,
      completion_rate: parseFloat(completionRate),
      recent_activity: {
        created_last_7_days: recentIdeas.length,
        completed_last_30_days: completedRecently.length
      }
    };
  },

  /**
   * Calculate files statistics
   * @private
   */
  _calculateFilesStats(files) {
    const total = files.length;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    // Group by MIME type
    const byMimeType = {};
    for (const file of files) {
      const mimeType = file.mime_type || 'unknown';
      if (!byMimeType[mimeType]) {
        byMimeType[mimeType] = { count: 0, total_size: 0 };
      }
      byMimeType[mimeType].count++;
      byMimeType[mimeType].total_size += file.size || 0;
    }

    // Group by idea
    const byIdea = {};
    for (const file of files) {
      const ideaId = file.idea_id;
      if (!byIdea[ideaId]) {
        byIdea[ideaId] = { count: 0, total_size: 0 };
      }
      byIdea[ideaId].count++;
      byIdea[ideaId].total_size += file.size || 0;
    }

    // Average file size
    const avgSize = total > 0 ? Math.round(totalSize / total) : 0;

    // Largest files
    const largestFiles = [...files]
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        original_name: f.original_name,
        size: f.size,
        mime_type: f.mime_type
      }));

    return {
      total,
      total_size: totalSize,
      average_size: avgSize,
      by_mime_type: byMimeType,
      ideas_with_files: Object.keys(byIdea).length,
      largest_files: largestFiles
    };
  },

  /**
   * Get activity timeline (last 30 days)
   * @returns {Promise<Object>} Activity timeline
   */
  async getActivityTimeline() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query for ideas created in last 30 days
      const ideasQuery = `
        SELECT
          DATE_TRUNC('day', created_at) as date,
          count(*) as count
        FROM documentation_ideas
        WHERE created_at >= to_timestamp('${thirtyDaysAgo.toISOString()}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')
        GROUP BY date
        ORDER BY date DESC
      `;

      // Query for files uploaded in last 30 days
      const filesQuery = `
        SELECT
          DATE_TRUNC('day', uploaded_at) as date,
          count(*) as count,
          sum(size) as total_size
        FROM documentation_files
        WHERE uploaded_at >= to_timestamp('${thirtyDaysAgo.toISOString()}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')
        GROUP BY date
        ORDER BY date DESC
      `;

      const [ideasResult, filesResult] = await Promise.all([
        questdbClient.query(ideasQuery),
        questdbClient.query(filesQuery)
      ]);

      const ideasTimeline = ideasResult.dataset?.map(row => ({
        date: row[0],
        ideas_created: row[1]
      })) || [];

      const filesTimeline = filesResult.dataset?.map(row => ({
        date: row[0],
        files_uploaded: row[1],
        bytes_uploaded: row[2]
      })) || [];

      return {
        success: true,
        data: {
          ideas: ideasTimeline,
          files: filesTimeline,
          period: '30_days'
        }
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get health metrics for all systems
   * @returns {Promise<Object>} System health summary
   */
  async getSystemsHealth() {
    try {
      const systems = await systemsRepository.findAll();

      const health = {
        total_systems: systems.length,
        healthy: systems.filter(s => s.status === 'online').length,
        degraded: systems.filter(s => s.status === 'degraded').length,
        offline: systems.filter(s => s.status === 'offline').length,
        health_percentage: 0
      };

      if (health.total_systems > 0) {
        health.health_percentage = parseFloat(
          ((health.healthy / health.total_systems) * 100).toFixed(2)
        );
      }

      const systemsList = systems.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        port: s.port,
        url: s.url
      }));

      return {
        success: true,
        data: {
          summary: health,
          systems: systemsList
        }
      };
    } catch (error) {
      throw error;
    }
  }
};
