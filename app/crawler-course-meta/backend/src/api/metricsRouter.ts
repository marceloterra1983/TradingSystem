import { Router } from 'express';
import { metricsRegister } from '../observability/metrics.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

export default router;
