import prisma from '../config/database.js';
import {
  calculateNextRun,
  handleScheduleCreated,
  handleScheduleDeleted,
  handleScheduleUpdated,
  refreshScheduleGauge
} from '../services/SchedulerService.js';

function buildFilters(query) {
  const where = {};
  if (query.enabled !== undefined) {
    if (query.enabled === 'true' || query.enabled === true) {
      where.enabled = true;
    } else if (query.enabled === 'false' || query.enabled === false) {
      where.enabled = false;
    }
  }
  if (query.templateId) {
    where.templateId = query.templateId;
  }
  if (query.scheduleType) {
    where.scheduleType = query.scheduleType;
  }
  return where;
}

function parseScheduleInput(body, existing = {}) {
  const payload = {
    name: body.name ?? existing.name,
    description:
      body.description === undefined ? existing.description : body.description,
    templateId:
      body.templateId === undefined ? existing.templateId : body.templateId,
    url: body.url ?? existing.url,
    scheduleType: body.scheduleType ?? existing.scheduleType,
    cronExpression:
      body.scheduleType === 'cron'
        ? body.cronExpression
        : body.scheduleType
            ? null
            : existing.scheduleType === 'cron'
              ? existing.cronExpression
              : null,
    intervalSeconds:
      body.scheduleType === 'interval'
        ? Number(body.intervalSeconds ?? existing.intervalSeconds ?? 0)
        : body.scheduleType
            ? null
            : existing.scheduleType === 'interval'
              ? existing.intervalSeconds
              : null,
    scheduledAt:
      body.scheduleType === 'one-time'
        ? body.scheduledAt
        : body.scheduleType
            ? null
            : existing.scheduleType === 'one-time'
              ? existing.scheduledAt
              : null,
    enabled:
      body.enabled === undefined ? existing.enabled ?? true : Boolean(body.enabled),
    options: body.options ?? existing.options ?? {}
  };

  if (payload.scheduleType === 'interval' && payload.intervalSeconds) {
    payload.intervalSeconds = Number(payload.intervalSeconds);
  }

  if (payload.scheduleType === 'one-time' && payload.scheduledAt) {
    payload.scheduledAt = new Date(payload.scheduledAt);
  }

  return payload;
}

export async function listSchedules(req, res, next) {
  try {
    const where = buildFilters(req.query);
    const schedules = await prisma.jobSchedule.findMany({
      where,
      include: { template: true },
      orderBy: [
        { enabled: 'desc' },
        { nextRunAt: 'asc' },
        { name: 'asc' }
      ]
    });
    await refreshScheduleGauge();
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(req, res, next) {
  try {
    const schedule = await prisma.jobSchedule.findFirst({
      where: { id: req.params.id },
      include: { template: true }
    });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const payload = parseScheduleInput(req.body);
    const scheduleForNextRun = {
      ...payload,
      id: 'temp',
      nextRunAt: payload.nextRunAt,
      scheduledAt: payload.scheduledAt,
      intervalSeconds: payload.intervalSeconds
    };

    const nextRunAt = calculateNextRun(scheduleForNextRun);

    const schedule = await prisma.jobSchedule.create({
      data: {
        name: payload.name,
        description: payload.description,
        templateId: payload.templateId,
        url: payload.url,
        scheduleType: payload.scheduleType,
        cronExpression: payload.scheduleType === 'cron' ? payload.cronExpression : null,
        intervalSeconds:
          payload.scheduleType === 'interval' ? payload.intervalSeconds : null,
        scheduledAt:
          payload.scheduleType === 'one-time' ? payload.scheduledAt : null,
        enabled: payload.enabled,
        nextRunAt,
        options: payload.options
      },
      include: { template: true }
    });

    await handleScheduleCreated(schedule);

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    if (error.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Template reference is invalid'
      });
    } else {
      next(error);
    }
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const existing = await prisma.jobSchedule.findFirst({
      where: { id: req.params.id },
      include: { template: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    const payload = parseScheduleInput(req.body, existing);
    const scheduleForNextRun = {
      ...existing,
      ...payload
    };

    const nextRunAt = calculateNextRun(scheduleForNextRun);

    const data = {
      name: payload.name,
      description: payload.description,
      templateId: payload.templateId,
      url: payload.url,
      scheduleType: payload.scheduleType,
      cronExpression:
        payload.scheduleType === 'cron' ? payload.cronExpression : null,
      intervalSeconds:
        payload.scheduleType === 'interval' ? payload.intervalSeconds : null,
      scheduledAt:
        payload.scheduleType === 'one-time' ? payload.scheduledAt : null,
      enabled: payload.enabled,
      options: payload.options,
      nextRunAt
    };

    const schedule = await prisma.jobSchedule.update({
      where: { id: req.params.id },
      data,
      include: { template: true }
    });

    await handleScheduleUpdated(schedule);

    res.json({ success: true, data: schedule });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Schedule name must be unique'
      });
    } else if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Schedule not found' });
    } else {
      next(error);
    }
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const existing = await prisma.jobSchedule.findFirst({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    await prisma.jobSchedule.delete({
      where: { id: req.params.id }
    });

    await handleScheduleDeleted(existing.id, existing.scheduleType, existing.enabled);

    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Schedule not found' });
    } else {
      next(error);
    }
  }
}

export async function toggleSchedule(req, res, next) {
  try {
    const existing = await prisma.jobSchedule.findFirst({
      where: { id: req.params.id },
      include: { template: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    const enabled = !existing.enabled;
    let nextRunAt = existing.nextRunAt;

    if (enabled) {
      nextRunAt = calculateNextRun({ ...existing, enabled: true });
    }

    const schedule = await prisma.jobSchedule.update({
      where: { id: req.params.id },
      data: { enabled, nextRunAt },
      include: { template: true }
    });

    if (enabled) {
      await handleScheduleCreated(schedule);
    } else {
      await handleScheduleDeleted(schedule.id, schedule.scheduleType, schedule.enabled);
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleHistory(req, res, next) {
  try {
    const schedule = await prisma.jobSchedule.findFirst({
      where: { id: req.params.id }
    });

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      scheduleId: schedule.id
    };

    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.type) {
      where.type = req.query.type;
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.startedAt = {};
      if (req.query.dateFrom) {
        where.startedAt.gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        where.startedAt.lte = new Date(req.query.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      prisma.scrapeJob.findMany({
        where,
        include: { template: true },
        orderBy: [{ startedAt: 'desc' }],
        skip,
        take: limit
      }),
      prisma.scrapeJob.count({ where })
    ]);

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
