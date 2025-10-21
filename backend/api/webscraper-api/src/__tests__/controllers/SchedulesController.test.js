import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleHistory
} from '../../controllers/SchedulesController.js';
import { createTestSchedule, createTestJob, createTestTemplate } from '../testUtils.js';
import * as schedulerService from '../../services/SchedulerService.js';

function mockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('SchedulesController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSchedules', () => {
    it('returns schedules ordered with enabled first and calls gauge refresh', async () => {
      const template = await createTestTemplate({ name: 'Schedule Template' });
      await createTestSchedule({
        name: 'Enabled Schedule',
        enabled: true,
        templateId: template.id,
        nextRunAt: new Date(Date.now() + 60_000)
      });
      await createTestSchedule({
        name: 'Disabled Schedule',
        enabled: false,
        nextRunAt: new Date(Date.now() + 120_000)
      });

      const req = { query: {} };
      const res = mockResponse();

      const refreshSpy = vi
        .spyOn(schedulerService, 'refreshScheduleGauge')
        .mockResolvedValue();

      await listSchedules(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'Enabled Schedule' })
          ])
        })
      );
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('getSchedule', () => {
    it('returns schedule when found', async () => {
      const schedule = await createTestSchedule({ name: 'Lookup Schedule' });
      const res = mockResponse();
      await getSchedule({ params: { id: schedule.id } }, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: schedule.id })
        })
      );
    });

    it('returns 404 when schedule missing', async () => {
      const res = mockResponse();
      await getSchedule(
        { params: { id: '00000000-0000-0000-0000-000000000000' } },
        res,
        vi.fn()
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Schedule not found' });
    });
  });

  describe('createSchedule', () => {
    it('creates cron schedule and triggers scheduler handler', async () => {
      const res = mockResponse();
      const handleSpy = vi
        .spyOn(schedulerService, 'handleScheduleCreated')
        .mockResolvedValue();

      await createSchedule(
        {
          body: {
            name: 'Morning Scrape',
            description: 'Daily scrape at 9 AM',
            url: 'https://example.com',
            scheduleType: 'cron',
            cronExpression: '0 9 * * *',
            enabled: true,
            options: { formats: ['markdown'] }
          }
        },
        res,
        vi.fn()
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Morning Scrape',
            scheduleType: 'cron',
            nextRunAt: expect.anything()
          })
        })
      );
      expect(handleSpy).toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    it('updates schedule fields and restarts scheduler task', async () => {
      const schedule = await createTestSchedule({ scheduleType: 'cron', cronExpression: '0 9 * * *' });
      const res = mockResponse();
      const handleSpy = vi
        .spyOn(schedulerService, 'handleScheduleUpdated')
        .mockResolvedValue();

      await updateSchedule(
        {
          params: { id: schedule.id },
          body: {
            scheduleType: 'interval',
            intervalSeconds: 3_600,
            enabled: true
          }
        },
        res,
        vi.fn()
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduleType: 'interval',
            intervalSeconds: 3_600
          })
        })
      );
      expect(handleSpy).toHaveBeenCalled();
    });
  });

  describe('toggleSchedule', () => {
    it('disables enabled schedule and removes task', async () => {
      const schedule = await createTestSchedule({ enabled: true });
      const res = mockResponse();
      const deleteSpy = vi
        .spyOn(schedulerService, 'handleScheduleDeleted')
        .mockResolvedValue();

      await toggleSchedule({ params: { id: schedule.id } }, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ enabled: false })
        })
      );
      expect(deleteSpy).toHaveBeenCalled();
    });

    it('enables disabled schedule and schedules task', async () => {
      const schedule = await createTestSchedule({ enabled: false });
      const res = mockResponse();
      const createSpy = vi
        .spyOn(schedulerService, 'handleScheduleCreated')
        .mockResolvedValue();

      await toggleSchedule({ params: { id: schedule.id } }, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ enabled: true })
        })
      );
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('deleteSchedule', () => {
    it('deletes schedule and removes task', async () => {
      const schedule = await createTestSchedule();
      const res = mockResponse();
      const deleteSpy = vi
        .spyOn(schedulerService, 'handleScheduleDeleted')
        .mockResolvedValue();

      await deleteSchedule({ params: { id: schedule.id } }, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(deleteSpy).toHaveBeenCalledWith(schedule.id, schedule.scheduleType, schedule.enabled);
    });
  });

  describe('getScheduleHistory', () => {
    it('returns paginated jobs created by schedule', async () => {
      const schedule = await createTestSchedule();
      await createTestJob({ scheduleId: schedule.id, templateId: schedule.templateId });

      const res = mockResponse();
      await getScheduleHistory(
        { params: { id: schedule.id }, query: { page: '1', limit: '10' } },
        res,
        vi.fn()
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ scheduleId: schedule.id })
            ]),
            page: 1,
            pageSize: 10,
            total: 1
          })
        })
      );
    });
  });
});
