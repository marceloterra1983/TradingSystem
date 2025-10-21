import { Router } from 'express';
import {
  listExports,
  getExport,
  createExport,
  downloadExport,
  deleteExport
} from '../controllers/ExportsController.js';
import {
  validateExportCreation,
  validateExportFilters
} from '../middleware/validation.js';

const router = Router();

router.get('/', validateExportFilters, listExports);
router.get('/:id', getExport);
router.get('/:id/download/:format', downloadExport);
router.post('/', validateExportCreation, createExport);
router.delete('/:id', deleteExport);

export default router;
