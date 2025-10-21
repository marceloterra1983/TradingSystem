import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cron from 'node-cron';
import axios from 'axios';
import prisma from '../../config/database.js';
import * as SchedulerService from '../../services/SchedulerService.js';
import { createTestSchedule, createTestTemplate } from '../testUtils.js';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({
      stop: vi.fn()
    }))
  }
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('SchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockReset();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await SchedulerService.shutdown();
    await prisma.scrapeJob.deleteMany();
    await prisma.jobSchedule.deleteMany();
  });

  describe('calculateNextRun', () => {
    it('calculates next run for cron schedules', () => {
      const next = SchedulerService.calculateNextRun({
        id: 'test',
        scheduleType: 'cron',
        cronExpression: '0 9 * * *'
      });
      expect(next).toBeInstanceOf(Date);
    });

    it('calculates next run for interval schedules', () => {
      const now = new Date();
      const next = SchedulerService.calculateNextRun(
        {
          id: 'interval',
          scheduleType: 'interval',
          intervalSeconds: 600
        },
        now
      );
      expect(next.getTime()).toBe(now.getTime() + 600 * 1000);
    });

    it('returns scheduledAt for one-time schedules', () => {
      const scheduledAt = new Date(Date.now() + 60_000);
      const next = SchedulerService.calculateNextRun({
        id: 'one-time',
        scheduleType: 'one-time',
        scheduledAt
      });
      expect(next.getTime()).toBeCloseTo(scheduledAt.getTime(), -2);
    });
  });

  describe('addSchedule', () => {
    it('registers cron task when schedule is enabled', async () => {
      const schedule = {
        id: 'cron-schedule',
        scheduleType: 'cron',
        cronExpression: '0 9 * * *',
        enabled: true
      };

      await SchedulerService.addSchedule(schedule);
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: expect.any(String) })
      );
    });

    it('ignores disabled schedules', async () => {
      await SchedulerService.addSchedule({
        id: 'disabled',
        scheduleType: 'cron',
        cronExpression: '0 9 * * *',
        enabled: false
      });
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('initializeScheduler', () => {
    it('loads enabled schedules and registers them', async () => {
      await createTestSchedule({ scheduleType: 'cron', cronExpression: '0 8 * * *' });
      await createTestSchedule({ scheduleType: 'interval', intervalSeconds: 120 });

      await SchedulerService.initializeScheduler();

      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe('handleScheduleCreated / handleScheduleDeleted', () => {
    it('invokes refresh gauge when schedules change', async () => {
      const template = await createTestTemplate();
      const schedule = await prisma.jobSchedule.create({
        data: {
          name: 'Handler Test',
          description: 'Verify handler integration',
          templateId: template.id,
          url: 'https://example.com',
          scheduleType: 'cron',
          cronExpression: '0 10 * * *',
          enabled: true,
          options: { formats: ['markdown'] },
          nextRunAt: new Date(Date.now() + 60_000)
        }
      });

      const refreshSpy = vi.spyOn(SchedulerService, 'refreshScheduleGauge');

      await SchedulerService.handleScheduleCreated(schedule);
      expect(refreshSpy).toHaveBeenCalled();

      await SchedulerService.handleScheduleDeleted(
        schedule.id,
        schedule.scheduleType,
        schedule.enabled
      );
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('scheduled execution', () => {
    it('creates jobs when interval schedule fires', async () => {
      vi.useFakeTimers();

      const template = await createTestTemplate();
      const schedule = await prisma.jobSchedule.create({
        data: {
          name: 'Interval Exec',
          description: 'Interval execution test',
          templateId: template.id,
          url: 'https://example.com',
          scheduleType: 'interval',
          intervalSeconds: 1,
          enabled: true,
          nextRunAt: new Date(Date.now() + 10),
          options: { formats: ['markdown'] }
        }
      });

      axios.post.mockResolvedValue({ data: { success: true, data: { markdown: '# Test' } } });

      await SchedulerService.handleScheduleCreated(schedule);

      vi.advanceTimersByTime(1_500);

      const jobs = await prisma.scrapeJob.findMany({ where: { scheduleId: schedule.id } });
      expect(jobs.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
