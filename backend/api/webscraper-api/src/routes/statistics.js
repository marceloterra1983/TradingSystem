import { Router } from 'express';
import { getStatistics } from '../controllers/StatisticsController.js';
import { validateJobFilters } from '../middleware/validation.js';

const router = Router();

router.get('/', validateJobFilters, getStatistics);

export const historyRouter = Router();
historyRouter.get('/', validateJobFilters, getStatistics);

export default router;
