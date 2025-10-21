import { body, param, validationResult } from 'express-validator';

const validateStringArray = (value) => {
  if (!Array.isArray(value)) {
    throw new Error('Must be an array');
  }
  value.forEach((item) => {
    if (typeof item !== 'string') {
      throw new Error('Array items must be strings');
    }
    if (item.length === 0) {
      throw new Error('Array items cannot be empty');
    }
    if (item.length > 2048) {
      throw new Error('Array items exceed maximum length');
    }
  });
  return true;
};

const scrapeFormats = [
  'markdown',
  'html',
  'rawHtml',
  'links',
  'screenshot',
  'screenshot@fullPage',
  'json'
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: errors.array()
  });
};

export const validation = {
  scrapeRequest: [
    body('url')
      .exists({ checkFalsy: true })
      .withMessage('URL is required')
      .bail()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('URL must be valid and use http/https')
      .isLength({ max: 2048 })
      .withMessage('URL exceeds maximum length'),
    body('formats')
      .optional()
      .custom(validateStringArray)
      .bail()
      .custom((formats) => {
        formats.forEach((format) => {
          if (!scrapeFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}`);
          }
        });
        return true;
      }),
    body('onlyMainContent').optional().isBoolean().withMessage('onlyMainContent must be a boolean'),
    body('waitFor')
      .optional()
      .isInt({ min: 0, max: 30000 })
      .withMessage('waitFor must be an integer between 0 and 30000'),
    body('timeout')
      .optional()
      .isInt({ min: 1000, max: 60000 })
      .withMessage('timeout must be between 1000 and 60000 milliseconds'),
    body('includeTags').optional().custom(validateStringArray),
    body('excludeTags').optional().custom(validateStringArray)
  ],
  crawlRequest: [
    body('url')
      .exists({ checkFalsy: true })
      .withMessage('URL is required')
      .bail()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('URL must be valid and use http/https')
      .isLength({ max: 2048 })
      .withMessage('URL exceeds maximum length'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('limit must be between 1 and 1000'),
    body('maxDepth')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('maxDepth must be between 1 and 10'),
    body('excludePaths').optional().custom(validateStringArray),
    body('includePaths').optional().custom(validateStringArray),
    body('scrapeOptions')
      .optional()
      .custom((value) => {
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          throw new Error('scrapeOptions must be an object');
        }
        return true;
      }),
    body('allowBackwardLinks')
      .optional()
      .isBoolean()
      .withMessage('allowBackwardLinks must be a boolean'),
    body('allowExternalLinks')
      .optional()
      .isBoolean()
      .withMessage('allowExternalLinks must be a boolean')
  ],
  crawlId: [
    param('id')
      .exists({ checkFalsy: true })
      .withMessage('Crawl ID is required')
      .bail()
      .isAlphanumeric('en-US', { ignore: '-_' })
      .withMessage('Crawl ID must be alphanumeric')
      .isLength({ max: 100 })
      .withMessage('Crawl ID exceeds maximum length')
  ]
};

export default validation;
