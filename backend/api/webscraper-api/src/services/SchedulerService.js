import axios from 'axios';
import cron from 'node-cron';
import cronParser from 'cron-parser';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import {
  incrementJobMetric,
  incrementScheduleExecution,
  observeScheduleExecutionDuration,
  setActiveJobCount,
  setScheduleCount
} from '../metrics.js';

const firecrawlProxyUrl =
  process.env.WEBSCRAPER_FIRECRAWL_PROXY_URL || 'http://localhost:3600';
const firecrawlTimeout = Number(process.env.WEBSCRAPER_FIRECRAWL_TIMEOUT ?? 30_000);
const maxConcurrentJobs = Number(
  process.env.WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS ?? 5
);
const retryAttempts = Number(process.env.WEBSCRAPER_SCHEDULER_RETRY_ATTEMPTS ?? 3);
const retryDelayMs = Number(process.env.WEBSCRAPER_SCHEDULER_RETRY_DELAY_MS ?? 1_000);
const maxFailuresBeforeDisable = Number(
  process.env.WEBSCRAPER_SCHEDULER_MAX_FAILURES ?? 10
);
const schedulerTimezone =
  process.env.WEBSCRAPER_SCHEDULER_TIMEZONE || process.env.TZ || 'UTC';

const activeTasks = new Map();
const activeExecutions = new Set();
const executionQueue = [];
const queuedScheduleIds = new Set();

let initialized = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeSchedule(schedule) {
  if (!schedule) {
    return null;
  }
  return {
    ...schedule,
    options: schedule.options ?? {},
    template: schedule.template
      ? { ...schedule.template, options: schedule.template.options ?? {} }
      : null
  };
}

function mergeOptions(templateOptions = {}, scheduleOptions = {}) {
  // Shallow merge by default. Nested objects (like headers) should also merge.
  const merged = { ...templateOptions, ...scheduleOptions };
  for (const key of Object.keys(templateOptions)) {
    if (
      typeof templateOptions[key] === 'object' &&
      !Array.isArray(templateOptions[key]) &&
      templateOptions[key] !== null &&
      typeof scheduleOptions[key] === 'object' &&
      !Array.isArray(scheduleOptions[key]) &&
      scheduleOptions[key] !== null
    ) {
      merged[key] = { ...templateOptions[key], ...scheduleOptions[key] };
    }
  }
  return merged;
}

function resolveJobType(schedule, mergedOptions = {}) {
  const type =
    mergedOptions.mode ||
    mergedOptions.type ||
    mergedOptions.jobType ||
    (mergedOptions.crawl === true ? 'crawl' : null) ||
    (mergedOptions.crawlOptions ? 'crawl' : null) ||
    schedule.jobType ||
    schedule.options?.mode ||
    schedule.options?.jobType ||
    (schedule.options?.crawl ? 'crawl' : null);
  return type === 'crawl' ? 'crawl' : 'scrape';
}

function resolveRequestPayload(schedule, mergedOptions) {
  if (mergedOptions && typeof mergedOptions === 'object' && mergedOptions.url) {
    return mergedOptions;
  }
  return {
    url: schedule.url,
    ...mergedOptions
  };
}

async function refreshActiveJobGauge() {
  const activeJobs = await prisma.scrapeJob.count({
    where: { status: { in: ['running', 'pending'] } }
  });
  setActiveJobCount(activeJobs);
}

export async function refreshScheduleGauge() {
  const grouped = await prisma.jobSchedule.groupBy({
    by: ['scheduleType', 'enabled'],
    _count: { _all: true }
  });

  const seen = new Set();
  for (const group of grouped) {
    const key = `${group.scheduleType}-${group.enabled}`;
    seen.add(key);
    setScheduleCount(group.scheduleType, group.enabled, group._count._all);
  }

  const scheduleTypes = ['cron', 'interval', 'one-time'];
  for (const type of scheduleTypes) {
    for (const enabled of [true, false]) {
      const key = `${type}-${enabled}`;
      if (!seen.has(key)) {
        setScheduleCount(type, enabled, 0);
      }
    }
  }
}

export function calculateNextRun(schedule, fromDate = new Date()) {
  if (schedule.scheduleType === 'cron') {
    if (!schedule.cronExpression) {
      return null;
    }
    try {
      const iterator = cronParser.parseExpression(schedule.cronExpression, {
        currentDate: fromDate,
        tz: schedulerTimezone
      });
      return iterator.next().toDate();
    } catch (error) {
      logger.error(
        { err: error, scheduleId: schedule.id },
        'Failed to calculate next run for cron schedule'
      );
      return null;
    }
  }

  if (schedule.scheduleType === 'interval') {
    const seconds = Number(schedule.intervalSeconds ?? 0);
    if (!seconds) {
      return null;
    }
    return new Date(fromDate.getTime() + seconds * 1000);
  }

  if (schedule.scheduleType === 'one-time') {
    return schedule.scheduledAt ? new Date(schedule.scheduledAt) : null;
  }

  return null;
}

function processExecutionQueue() {
  while (executionQueue.length > 0 && activeExecutions.size < maxConcurrentJobs) {
    const entry = executionQueue.shift();
    if (!entry) {
      break;
    }
    const { scheduleId, triggeredFromInterval } = entry;
    queuedScheduleIds.delete(scheduleId);
    if (activeExecutions.has(scheduleId)) {
      continue;
    }
    runScheduleExecution(scheduleId, { triggeredFromInterval });
  }
}

async function runScheduleExecution(scheduleId, { triggeredFromInterval = false } = {}) {
  queuedScheduleIds.delete(scheduleId);

  if (activeExecutions.has(scheduleId)) {
    return;
  }

  if (activeExecutions.size >= maxConcurrentJobs) {
    if (!queuedScheduleIds.has(scheduleId)) {
      executionQueue.push({ scheduleId, triggeredFromInterval });
      queuedScheduleIds.add(scheduleId);
    }
    return;
  }

  activeExecutions.add(scheduleId);
  const startTime = Date.now();
  let executionStatus = 'success';

  try {
    const schedule = await prisma.jobSchedule.findFirst({
      where: { id: scheduleId },
      include: { template: true }
    });

    if (!schedule) {
      logger.warn({ scheduleId }, 'Skipping execution for deleted schedule');
      return;
    }

    if (!schedule.enabled) {
      logger.info({ scheduleId }, 'Schedule disabled, skipping execution');
      removeSchedule(scheduleId);
      return;
    }

    const sanitized = sanitizeSchedule(schedule);
    const mergedOptions = mergeOptions(
      sanitized.template?.options ?? {},
      sanitized.options ?? {}
    );
    const jobType = resolveJobType(sanitized, mergedOptions);
    const payload = resolveRequestPayload(sanitized, mergedOptions);

    let attempt = 0;
    let lastError = null;
    let jobRecord = null;

    while (attempt < retryAttempts) {
      try {
        const endpoint = jobType === 'crawl' ? 'crawl' : 'scrape';
        const response = await axios.post(
          `${firecrawlProxyUrl}/api/v1/${endpoint}`,
          payload,
          { timeout: firecrawlTimeout }
        );

        const responseData = response.data ?? {};
        const success =
          responseData.success === undefined ? true : responseData.success;
        const jobStatus =
          jobType === 'crawl'
            ? success
              ? 'running'
              : 'failed'
            : success
              ? 'completed'
              : 'failed';

        jobRecord = await prisma.scrapeJob.create({
          data: {
            type: jobType,
            url: sanitized.url,
            status: jobStatus,
            templateId: sanitized.templateId,
            scheduleId: sanitized.id,
            options: payload,
            results: responseData.data ?? responseData,
            error: responseData.error ?? null,
            firecrawlJobId: responseData.data?.id ?? null,
            startedAt: new Date(),
            completedAt: jobType === 'scrape' ? new Date() : null
          },
          include: { template: true }
        });

        incrementJobMetric(jobRecord.type, jobRecord.status);
        await refreshActiveJobGauge();
        break;
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= retryAttempts) {
          executionStatus = 'failed';
          if (axios.isAxiosError(error)) {
            logger.error(
              {
                err: error,
                scheduleId,
                attempt
              },
              'Scheduler execution failed after retries'
            );
          } else {
            logger.error(
              {
                err: error,
                scheduleId,
                attempt
              },
              'Scheduler execution encountered unexpected error'
            );
          }
          break;
        }

        const delayMs = retryDelayMs * 2 ** (attempt - 1);
        logger.warn(
          {
            scheduleId,
            attempt,
            delayMs
          },
          'Scheduled execution failed, retrying'
        );
        await delay(delayMs);
      }
    }

    const finishedAt = new Date();
    const nextRun = calculateNextRun(sanitized, finishedAt);

    const updates = {
      lastRunAt: finishedAt,
      nextRunAt: nextRun,
      runCount: { increment: executionStatus === 'success' ? 1 : 0 },
      failureCount: { increment: executionStatus === 'failed' ? 1 : 0 }
    };

    if (executionStatus === 'failed') {
      updates.error = lastError?.message ?? 'Unknown execution error';
    }

    const updatedSchedule = await prisma.jobSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: updates.lastRunAt,
        nextRunAt: updates.nextRunAt,
        runCount: { increment: executionStatus === 'success' ? 1 : 0 },
        failureCount: { increment: executionStatus === 'failed' ? 1 : 0 },
        enabled:
          executionStatus === 'failed' &&
          sanitized.failureCount + 1 >= maxFailuresBeforeDisable
            ? false
            : sanitized.enabled
      }
    });

    incrementScheduleExecution(sanitized.scheduleType, executionStatus);
    observeScheduleExecutionDuration(
      sanitized.scheduleType,
      (Date.now() - startTime) / 1000
    );

    if (
      executionStatus === 'failed' &&
      sanitized.failureCount + 1 >= maxFailuresBeforeDisable
    ) {
      logger.warn(
        { scheduleId },
        'Schedule auto-disabled after maximum failures reached'
      );
      removeSchedule(scheduleId);
    } else if (sanitized.scheduleType === 'one-time') {
      await prisma.jobSchedule.update({
        where: { id: scheduleId },
        data: { enabled: false, nextRunAt: null }
      });
      removeSchedule(scheduleId);
    } else if (sanitized.scheduleType === 'interval' && !triggeredFromInterval) {
      // For interval schedules triggered manually (e.g., immediate due), ensure repeating interval continues.
      const entry = activeTasks.get(scheduleId);
      if (entry && entry.type === 'interval' && !entry.intervalHandle) {
        const seconds = Number(updatedSchedule.intervalSeconds ?? 0);
        if (seconds > 0) {
          entry.intervalHandle = setInterval(
            () => runScheduleExecution(scheduleId, { triggeredFromInterval: true }),
            seconds * 1000
          );
          activeTasks.set(scheduleId, entry);
        }
      }
    }
  } catch (error) {
    executionStatus = 'failed';
    logger.error({ err: error, scheduleId }, 'Unexpected scheduler execution error');
  } finally {
    activeExecutions.delete(scheduleId);
    processExecutionQueue();
  }
}

function scheduleCronTask(schedule) {
  if (!schedule.cronExpression) {
    logger.warn({ scheduleId: schedule.id }, 'Cron schedule missing expression');
    return;
  }

  try {
    const task = cron.schedule(
      schedule.cronExpression,
      () => runScheduleExecution(schedule.id),
      {
        timezone: schedulerTimezone
      }
    );
    activeTasks.set(schedule.id, { type: 'cron', task });
  } catch (error) {
    logger.error({ err: error, scheduleId: schedule.id }, 'Failed to register cron task');
  }
}

function scheduleIntervalTask(schedule) {
  const seconds = Number(schedule.intervalSeconds ?? 0);
  if (!seconds) {
    logger.warn({ scheduleId: schedule.id }, 'Interval schedule missing intervalSeconds');
    return;
  }

  const intervalMs = seconds * 1000;
  const nextRunAt = schedule.nextRunAt
    ? new Date(schedule.nextRunAt)
    : new Date(Date.now() + intervalMs);
  const delayMs = Math.max(nextRunAt.getTime() - Date.now(), 0);

  const entry = { type: 'interval', timeoutHandle: null, intervalHandle: null };

  const startIntervalLoop = () => {
    entry.intervalHandle = setInterval(
      () => runScheduleExecution(schedule.id, { triggeredFromInterval: true }),
      intervalMs
    );
    activeTasks.set(schedule.id, entry);
  };

  if (delayMs > 0) {
    entry.timeoutHandle = setTimeout(async () => {
      entry.timeoutHandle = null;
      await runScheduleExecution(schedule.id);
      startIntervalLoop();
    }, delayMs);
  } else {
    runScheduleExecution(schedule.id).catch(error =>
      logger.error({ err: error }, 'Failed to execute immediate interval schedule')
    );
    startIntervalLoop();
  }

  activeTasks.set(schedule.id, entry);
}

function scheduleOneTimeTask(schedule) {
  const target = schedule.nextRunAt || schedule.scheduledAt;
  if (!target) {
    logger.warn({ scheduleId: schedule.id }, 'One-time schedule missing date');
    return;
  }

  const delayMs = Math.max(new Date(target).getTime() - Date.now(), 0);
  const timeoutHandle = setTimeout(async () => {
    await runScheduleExecution(schedule.id);
  }, delayMs);

  activeTasks.set(schedule.id, { type: 'timeout', timeoutHandle });
}

export async function addSchedule(schedule) {
  const sanitized = sanitizeSchedule(schedule);
  if (!sanitized?.enabled) {
    return;
  }

  removeSchedule(sanitized.id);

  if (sanitized.scheduleType === 'cron') {
    scheduleCronTask(sanitized);
  } else if (sanitized.scheduleType === 'interval') {
    scheduleIntervalTask(sanitized);
  } else if (sanitized.scheduleType === 'one-time') {
    scheduleOneTimeTask(sanitized);
  } else {
    logger.warn({ scheduleId: sanitized.id }, 'Unsupported schedule type');
  }
}

export function removeSchedule(scheduleId) {
  const entry = activeTasks.get(scheduleId);
  if (!entry) {
    return;
  }

  if (entry.type === 'cron' && entry.task) {
    entry.task.stop();
  } else if (entry.type === 'interval') {
    if (entry.timeoutHandle) {
      clearTimeout(entry.timeoutHandle);
    }
    if (entry.intervalHandle) {
      clearInterval(entry.intervalHandle);
    }
  } else if (entry.type === 'timeout' && entry.timeoutHandle) {
    clearTimeout(entry.timeoutHandle);
  }

  activeTasks.delete(scheduleId);
  queuedScheduleIds.delete(scheduleId);
  for (let index = executionQueue.length - 1; index >= 0; index -= 1) {
    if (executionQueue[index].scheduleId === scheduleId) {
      executionQueue.splice(index, 1);
    }
  }
}

export async function updateSchedule(schedule) {
  removeSchedule(schedule.id);
  await addSchedule(schedule);
}

export async function initializeScheduler() {
  if (initialized) {
    return;
  }

  const schedules = await prisma.jobSchedule.findMany({
    where: { enabled: true },
    include: { template: true },
    orderBy: [{ nextRunAt: 'asc' }]
  });

  for (const schedule of schedules) {
    await addSchedule(schedule);
  }

  await refreshScheduleGauge();
  initialized = true;
  logger.info(
    { count: schedules.length, timezone: schedulerTimezone },
    'Scheduler service initialized'
  );
}

export async function shutdown() {
  for (const scheduleId of activeTasks.keys()) {
    removeSchedule(scheduleId);
  }
  activeTasks.clear();
  initialized = false;
  logger.info('Scheduler service stopped');
}

export async function restartScheduler() {
  await shutdown();
  await initializeScheduler();
}

export async function handleScheduleCreated(schedule) {
  await addSchedule(schedule);
  await refreshScheduleGauge();
}

export async function handleScheduleUpdated(schedule) {
  await updateSchedule(schedule);
  await refreshScheduleGauge();
}

export async function handleScheduleDeleted(scheduleId, _scheduleType, _enabled) {
  removeSchedule(scheduleId);
  await refreshScheduleGauge();
}
