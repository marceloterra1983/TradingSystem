import express from 'express';
import StatsService from '../services/StatsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/v1/stats/dashboard
 * Get comprehensive dashboard statistics
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const timeframe = req.query.timeframe || '30d';
    const stats = await StatsService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
      timeframe
    });
  })
);

/**
 * GET /api/v1/stats/systems
 * Get system-specific statistics
 */
router.get(
  '/systems',
  asyncHandler(async (req, res) => {
    const stats = await StatsService.getSystemStats();

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * GET /api/v1/stats/ideas
 * Get idea-specific statistics
 */
router.get(
  '/ideas',
  asyncHandler(async (req, res) => {
    const stats = await StatsService.getIdeaStats();

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * GET /api/v1/stats/files
 * Get file-specific statistics
 */
router.get(
  '/files',
  asyncHandler(async (req, res) => {
    const stats = await StatsService.getFileStats();

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * GET /api/v1/stats/health
 * Get health summary for all systems
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const healthSummary = await StatsService.getHealthSummary();

    res.json({
      success: true,
      data: healthSummary
    });
  })
);

/**
 * GET /api/v1/stats/analytics
 * Get analytics data for charts and visualizations
 */
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const timeframe = req.query.timeframe || '30d';
    const analyticsData = await StatsService.getAnalyticsData(timeframe);

    res.json({
      success: true,
      data: analyticsData
    });
  })
);

/**
 * GET /api/v1/stats/search
 * Global search across all entity types
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const filters = {
      systems: req.query.systems !== 'false',
      ideas: req.query.ideas !== 'false',
      files: req.query.files !== 'false',
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const searchResults = await StatsService.globalSearch(query.trim(), filters);

    res.json({
      success: true,
      data: searchResults
    });
  })
);

/**
 * GET /api/v1/stats/activity
 * Get recent activity across all entities
 */
router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const activity = await StatsService.getRecentActivity(days);

    res.json({
      success: true,
      data: activity
    });
  })
);

export default router;
