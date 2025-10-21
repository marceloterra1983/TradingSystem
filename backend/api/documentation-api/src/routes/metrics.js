import express from 'express';
import promClient from 'prom-client';
import searchMetrics from '../services/searchMetrics.js';

const router = express.Router();

promClient.collectDefaultMetrics();

router.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.send(metrics);
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).send('Failed to get metrics');
  }
});

router.get('/metrics/dashboard', async (req, res) => {
  try {
    const timeRange = req.query.range || '1h';
    const stats = await searchMetrics.getSearchStats(timeRange);
    res.json(stats);
  } catch (error) {
    console.error('Failed to get metrics dashboard:', error);
    res.status(500).json({
      error: 'Failed to get metrics dashboard',
      message: error.message,
    });
  }
});

export default router;
