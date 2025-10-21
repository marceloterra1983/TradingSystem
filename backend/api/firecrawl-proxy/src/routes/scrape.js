import { Router } from 'express';

import FirecrawlService from '../services/FirecrawlService.js';
import { handleValidationErrors, validation } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const router = Router();

router.post(
  '/scrape',
  validation.scrapeRequest,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { url, formats } = req.body;
    const start = process.hrtime.bigint();

    const result = await FirecrawlService.scrape(req.body);
    const payload = result?.data ?? result;

    const durationMs = Number((process.hrtime.bigint() - start) / BigInt(1e6));

    logger.info(
      {
        action: 'scrape',
        url,
        formats,
        durationMs,
        userId: req.get('x-user-id') || null,
        ip: req.ip
      },
      'scrape request proxied to firecrawl'
    );

    res.json({
      success: true,
      data: payload
    });
  })
);

router.post(
  '/crawl',
  validation.crawlRequest,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { url, limit } = req.body;
    const start = process.hrtime.bigint();

    const result = await FirecrawlService.crawl(req.body);

    const durationMs = Number((process.hrtime.bigint() - start) / BigInt(1e6));

    logger.info(
      {
        action: 'crawl',
        url,
        limit,
        jobId: result.id,
        durationMs,
        userId: req.get('x-user-id') || null,
        ip: req.ip
      },
      'crawl job submitted to firecrawl'
    );

    res.json({
      success: true,
      data: {
        id: result.id,
        url: result.url
      }
    });
  })
);

router.get(
  '/crawl/:id',
  validation.crawlId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await FirecrawlService.getCrawlStatus(id);

    logger.info(
      {
        action: 'crawl-status',
        crawlId: id,
        status: result.status,
        userId: req.get('x-user-id') || null,
        ip: req.ip
      },
      'crawl status retrieved from firecrawl'
    );

    res.json({
      success: true,
      data: result
    });
  })
);

export default router;
