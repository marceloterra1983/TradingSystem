import { Router } from 'express';
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  getScheduleHistory,
  listSchedules,
  toggleSchedule,
  updateSchedule
} from '../controllers/SchedulesController.js';
import {
  validateScheduleCreation,
  validateScheduleFilters,
  validateScheduleUpdate
} from '../middleware/validation.js';

const router = Router();

router.get('/', validateScheduleFilters, listSchedules);
router.get('/:id', getSchedule);
router.get('/:id/history', getScheduleHistory);
router.post('/', validateScheduleCreation, createSchedule);
router.put('/:id', validateScheduleUpdate, updateSchedule);
router.patch('/:id/toggle', toggleSchedule);
router.delete('/:id', deleteSchedule);

export default router;
