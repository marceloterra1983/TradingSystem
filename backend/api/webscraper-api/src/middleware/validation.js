import { body, query, validationResult } from 'express-validator';
import { isValidCron } from 'cron-validator';

const jobStatuses = ['pending', 'running', 'completed', 'failed'];
const jobTypes = ['scrape', 'crawl'];
const scheduleTypes = ['cron', 'interval', 'one-time'];
const exportTypes = ['jobs', 'templates', 'schedules'];
const exportFormats = ['csv', 'json', 'parquet'];
const exportStatuses = ['pending', 'processing', 'completed', 'failed'];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
}

export const validateJobFilters = [
  query('status').optional().isIn(jobStatuses).withMessage('Invalid status provided'),
  query('type').optional().isIn(jobTypes).withMessage('Invalid job type provided'),
  query('templateId').optional().isUUID().withMessage('templateId must be a valid UUID'),
  query('url').optional().isString().trim(),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be an ISO8601 date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be an ISO8601 date'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
];

export const validateJobCreation = [
  body('type').isIn(jobTypes).withMessage('type must be either "scrape" or "crawl"'),
  body('url').isURL({ require_protocol: true }).withMessage('A valid HTTP/HTTPS URL is required'),
  body('status').isIn(jobStatuses).withMessage('Invalid job status'),
  body('options').isObject().withMessage('options must be a JSON object'),
  body('results').optional(),
  body('templateId').optional().isUUID(),
  handleValidationErrors
];

export const validateTemplateCreation = [
  body('name').isLength({ min: 3 }).withMessage('Template name must be at least 3 characters long'),
  body('description').optional().isString(),
  body('urlPattern')
    .optional()
    .custom(value => {
      try {
        new RegExp(value);
        return true;
      } catch {
        throw new Error('urlPattern must be a valid regular expression');
      }
    }),
  body('options').isObject().withMessage('Template options must be an object'),
  handleValidationErrors
];

export const validateTemplateUpdate = [
  body('name').optional().isLength({ min: 3 }).withMessage('Template name must be at least 3 characters long'),
  body('description').optional().isString(),
  body('urlPattern')
    .optional()
    .custom(value => {
      try {
        new RegExp(value);
        return true;
      } catch {
        throw new Error('urlPattern must be a valid regular expression');
      }
    }),
  body('options').optional().isObject().withMessage('Template options must be an object'),
  handleValidationErrors
];

export const validateScheduleFilters = [
  query('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled must be true or false')
    .toBoolean(),
  query('templateId')
   .optional()
   .isUUID()
   .withMessage('templateId must be a valid UUID'),
  query('scheduleType')
    .optional()
    .isIn(scheduleTypes)
    .withMessage('Invalid schedule type'),
  handleValidationErrors
];

export const validateScheduleCreation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Schedule name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('templateId').optional().isUUID().withMessage('templateId must be a valid UUID'),
  body('url')
    .isURL({ require_protocol: true })
    .withMessage('A valid HTTP/HTTPS URL is required'),
  body('scheduleType')
    .isIn(scheduleTypes)
    .withMessage('scheduleType must be cron, interval, or one-time'),
  body('cronExpression')
    .if(body('scheduleType').equals('cron'))
    .custom(value => {
      if (!isValidCron(value, { seconds: false })) {
        throw new Error('Invalid cron expression');
      }
      return true;
    }),
  body('intervalSeconds')
    .if(body('scheduleType').equals('interval'))
    .isInt({ min: 60, max: 86_400 })
    .withMessage('intervalSeconds must be between 60 and 86400 seconds'),
  body('scheduledAt')
    .if(body('scheduleType').equals('one-time'))
    .isISO8601()
    .withMessage('scheduledAt must be a valid ISO8601 date')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduledAt must be in the future');
      }
      return true;
    }),
  body('enabled').optional().isBoolean().withMessage('enabled must be true or false'),
  body('options').optional().isObject().withMessage('options must be an object'),
  handleValidationErrors
];

export const validateScheduleUpdate = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Schedule name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('templateId').optional().isUUID().withMessage('templateId must be a valid UUID'),
  body('url')
    .optional()
    .isURL({ require_protocol: true })
    .withMessage('A valid HTTP/HTTPS URL is required'),
  body('scheduleType')
    .optional()
    .isIn(scheduleTypes)
    .withMessage('scheduleType must be cron, interval, or one-time'),
  body('cronExpression')
    .optional()
    .custom(value => {
      if (value && !isValidCron(value, { seconds: false })) {
        throw new Error('Invalid cron expression');
      }
      return true;
    }),
  body('intervalSeconds')
    .optional()
    .isInt({ min: 60, max: 86_400 })
    .withMessage('intervalSeconds must be between 60 and 86400 seconds'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('scheduledAt must be a valid ISO8601 date')
    .custom(value => {
      if (value) {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('scheduledAt must be in the future');
        }
      }
      return true;
    }),
  body('enabled').optional().isBoolean().withMessage('enabled must be true or false'),
  body('options').optional().isObject().withMessage('options must be an object'),
  handleValidationErrors
];

export const validateExportFilters = [
  query('status')
    .optional()
    .isIn(exportStatuses)
    .withMessage('Invalid export status provided'),
  query('exportType')
    .optional()
    .isIn(exportTypes)
    .withMessage('Invalid export type provided'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO8601 date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO8601 date'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
];

export const validateExportCreation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Export name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('exportType')
    .isIn(exportTypes)
    .withMessage('exportType must be jobs, templates, schedules, or results'),
  body('formats')
    .isArray({ min: 1 })
    .withMessage('formats must be a non-empty array')
    .custom(formats => {
      const invalid = formats.filter(format => !exportFormats.includes(format));
      if (invalid.length > 0) {
        throw new Error(`Unsupported export formats: ${invalid.join(', ')}`);
      }
      return true;
    }),
  body('filters').optional().isObject().withMessage('filters must be an object'),
  handleValidationErrors
];
