import { Router } from 'express';
import {
  listJobs,
  getJob,
  createJob,
  deleteJob,
  rerunJob
} from '../controllers/JobsController.js';
import { validateJobFilters, validateJobCreation } from '../middleware/validation.js';

const router = Router();

router.get('/', validateJobFilters, listJobs);
router.get('/:id', getJob);
router.post('/', validateJobCreation, createJob);
router.delete('/:id', deleteJob);
router.post('/:id/rerun', rerunJob);

export default router;
