import { Router } from 'express';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  importTemplates,
  exportTemplates
} from '../controllers/TemplatesController.js';
import { validateTemplateCreation, validateTemplateUpdate } from '../middleware/validation.js';

const router = Router();

router.get('/', listTemplates);
router.get('/export', exportTemplates);
router.post('/import', importTemplates);
router.get('/:id', getTemplate);
router.post('/', validateTemplateCreation, createTemplate);
router.put('/:id', validateTemplateUpdate, updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
