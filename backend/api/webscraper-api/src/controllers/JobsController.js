import axios from 'axios';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { incrementJobMetric, setActiveJobCount } from '../metrics.js';

const firecrawlProxyUrl = process.env.WEBSCRAPER_FIRECRAWL_PROXY_URL || 'http://localhost:3600';

function parsePagination(query) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildFilters(query) {
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.type) {
    where.type = query.type;
  }
  if (query.templateId) {
    where.templateId = query.templateId;
  }
  if (query.url) {
    where.url = {
      contains: query.url,
      mode: 'insensitive'
    };
  }
  if (query.dateFrom || query.dateTo) {
    where.startedAt = {};
    if (query.dateFrom) {
      where.startedAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.startedAt.lte = new Date(query.dateTo);
    }
  }
  return where;
}

async function refreshActiveJobGauge() {
  const activeJobs = await prisma.scrapeJob.count({
    where: { status: { in: ['running', 'pending'] } }
  });
  setActiveJobCount(activeJobs);
}

export async function listJobs(req, res, next) {
  try {
    const filters = buildFilters(req.query);
    const { page, limit, skip } = parsePagination(req.query);

    const [items, total] = await Promise.all([
      prisma.scrapeJob.findMany({
        where: filters,
        include: { template: true },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit
      }),
      prisma.scrapeJob.count({ where: filters })
    ]);

    await refreshActiveJobGauge();

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize: limit
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getJob(req, res, next) {
  try {
    const job = await prisma.scrapeJob.findFirst({
      where: { id: req.params.id },
      include: { template: true }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
}

export async function createJob(req, res, next) {
  try {
    const {
      type,
      url,
      status,
      templateId,
      options,
      results,
      error,
      firecrawlJobId,
      startedAt,
      completedAt,
      duration
    } = req.body;

    const job = await prisma.scrapeJob.create({
      data: {
        type,
        url,
        status,
        templateId,
        options,
        results,
        error,
        firecrawlJobId,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        completedAt: completedAt ? new Date(completedAt) : null,
        duration
      },
      include: { template: true }
    });

    incrementJobMetric(job.type, job.status);
    await refreshActiveJobGauge();

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const existing = await prisma.scrapeJob.findFirst({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    await prisma.scrapeJob.delete({
      where: {
        id_startedAt: {
          id: existing.id,
          startedAt: existing.startedAt
        }
      }
    });
    await refreshActiveJobGauge();
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Job not found' });
    } else {
      next(error);
    }
  }
}

async function rerunScrape(job) {
  const response = await axios.post(
    `${firecrawlProxyUrl}/api/v1/scrape`,
    job.options,
    {
      timeout: Number(process.env.WEBSCRAPER_FIRECRAWL_TIMEOUT ?? 30_000)
    }
  );
  const data = response.data;
  const status = data.success === false ? 'failed' : 'completed';
  const created = await prisma.scrapeJob.create({
    data: {
      type: 'scrape',
      url: job.url,
      status,
      templateId: job.templateId,
      options: job.options,
      results: data.data ?? data,
      error: data.error ?? null,
      startedAt: new Date(),
      completedAt: new Date()
    },
    include: { template: true }
  });
  incrementJobMetric(created.type, created.status);
  return created;
}

async function rerunCrawl(job) {
  const response = await axios.post(
    `${firecrawlProxyUrl}/api/v1/crawl`,
    job.options,
    {
      timeout: Number(process.env.WEBSCRAPER_FIRECRAWL_TIMEOUT ?? 30_000)
    }
  );
  const data = response.data;
  const status = data.success === false ? 'failed' : 'running';
  const created = await prisma.scrapeJob.create({
    data: {
      type: 'crawl',
      url: job.url,
      status,
      templateId: job.templateId,
      options: job.options,
      results: data.data ?? data,
      error: data.error ?? null,
      firecrawlJobId: data.data?.id ?? null,
      startedAt: new Date()
    },
    include: { template: true }
  });
  incrementJobMetric(created.type, created.status);
  return created;
}

export async function rerunJob(req, res, next) {
  try {
    const job = await prisma.scrapeJob.findFirst({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    let newJob;
    if (job.type === 'scrape') {
      newJob = await rerunScrape(job);
    } else if (job.type === 'crawl') {
      newJob = await rerunCrawl(job);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported job type: ${job.type}`
      });
    }

    await refreshActiveJobGauge();

    res.status(201).json({
      success: true,
      data: newJob
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error({ err: error }, 'Failed to rerun job via Firecrawl');
      return res.status(502).json({
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Firecrawl proxy error'
      });
    }
    next(error);
  }
}
