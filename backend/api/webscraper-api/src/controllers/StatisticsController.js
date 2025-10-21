import prisma from '../config/database.js';

function percentage(part, total) {
  if (!total) return 0;
  return part / total;
}

export async function getStatistics(req, res, next) {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

    const whereClause = {};
    if (dateFrom || dateTo) {
      whereClause.startedAt = {};
      if (dateFrom) {
        whereClause.startedAt.gte = dateFrom;
      }
      if (dateTo) {
        whereClause.startedAt.lte = dateTo;
      }
    }

    const [totalJobs, templateTotal, statusCounts, typeCounts, recentJobs, jobsPerDayRaw, popularTemplatesRaw] =
      await Promise.all([
        prisma.scrapeJob.count({ where: whereClause }),
        prisma.template.count(),
        prisma.scrapeJob.groupBy({
          by: ['status'],
          _count: true,
          where: whereClause
        }),
        prisma.scrapeJob.groupBy({
          by: ['type'],
          _count: true,
          where: whereClause
        }),
        prisma.scrapeJob.findMany({
          where: whereClause,
          include: { template: true },
          orderBy: [{ createdAt: 'desc' }],
          take: 5
        }),
        prisma.$queryRaw`
          SELECT TO_CHAR(date_trunc('day', COALESCE("started_at", "created_at")), 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS count
          FROM "scrape_jobs"
          WHERE ($1::timestamp IS NULL OR COALESCE("started_at", "created_at") >= $1)
            AND ($2::timestamp IS NULL OR COALESCE("started_at", "created_at") <= $2)
          GROUP BY day
          ORDER BY day DESC
          LIMIT 7
        `,
        prisma.scrapeJob.groupBy({
          by: ['templateId'],
          _count: { _all: true },
          where: {
            templateId: { not: null },
            ...whereClause
          },
          orderBy: { _count: { _all: 'desc' } },
          take: 5
        })
      ]);

    const byStatus = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      { completed: 0, running: 0, pending: 0, failed: 0 }
    );

    const byType = typeCounts.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      { scrape: 0, crawl: 0 }
    );

    const jobsPerDay = jobsPerDayRaw
      .map(row => ({
        date: row.day,
        count: Number(row.count)
      }))
      .reverse();

    const templateIds = popularTemplatesRaw.map(item => item.templateId).filter(Boolean);
    const templateMap = templateIds.length
      ? await prisma.template.findMany({
          where: { id: { in: templateIds } }
        })
      : [];

    const popularTemplates = popularTemplatesRaw
      .map(item => {
        const template = templateMap.find(t => t.id === item.templateId);
        return {
          templateId: item.templateId,
          name: template?.name ?? 'Unknown',
          usageCount: item._count._all
        };
      })
      .filter(item => item.templateId);

    res.json({
      success: true,
      data: {
        totals: {
          jobs: totalJobs,
          templates: templateTotal,
          successRate: percentage(byStatus.completed, totalJobs)
        },
        byStatus: {
          completed: byStatus.completed ?? 0,
          running: byStatus.running ?? 0,
          pending: byStatus.pending ?? 0,
          failed: byStatus.failed ?? 0
        },
        byType: {
          scrape: byType.scrape ?? 0,
          crawl: byType.crawl ?? 0
        },
        recentJobs,
        jobsPerDay,
        popularTemplates
      }
    });
  } catch (error) {
    next(error);
  }
}
