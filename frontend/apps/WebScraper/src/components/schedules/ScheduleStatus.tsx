import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock, PauseCircle, PlayCircle, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobSchedule } from '@/types';
import { formatDateTime, formatIntervalSeconds } from '@/utils/cron';
import { Spinner } from '@/components/ui/spinner';

export interface ScheduleStatusProps {
  schedules: JobSchedule[];
  isLoading: boolean;
}

function computeStats(schedules: JobSchedule[]) {
  const total = schedules.length;
  const enabled = schedules.filter(schedule => schedule.enabled).length;
  const disabled = total - enabled;
  const overdue = schedules.filter(
    schedule => schedule.enabled && schedule.nextRunAt && new Date(schedule.nextRunAt) < new Date()
  ).length;
  const dueSoon = schedules.filter(schedule => {
    if (!schedule.enabled || !schedule.nextRunAt) {
      return false;
    }
    const diffMs = new Date(schedule.nextRunAt).getTime() - Date.now();
    return diffMs > 0 && diffMs <= 60 * 60 * 1000;
  }).length;

  const successRate =
    schedules.reduce((sum, schedule) => sum + (schedule.runCount > 0 ? schedule.runCount - schedule.failureCount : 0), 0) /
    Math.max(
      1,
      schedules.reduce((sum, schedule) => sum + schedule.runCount, 0)
    );

  return {
    total,
    enabled,
    disabled,
    overdue,
    dueSoon,
    successRate: successRate * 100
  };
}

export function ScheduleStatus({ schedules, isLoading }: ScheduleStatusProps) {
  const stats = useMemo(() => computeStats(schedules), [schedules]);
  const upcoming = useMemo(() => {
    return schedules
      .filter(schedule => schedule.enabled && schedule.nextRunAt)
      .sort((a, b) => new Date(a.nextRunAt ?? 0).getTime() - new Date(b.nextRunAt ?? 0).getTime())
      .slice(0, 6);
  }, [schedules]);

  const failing = useMemo(() => {
    return schedules
      .filter(schedule => schedule.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 4);
  }, [schedules]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Execution status</CardTitle>
          <CardDescription>Health indicators for automated schedules.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <PlayCircle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Enabled</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.enabled}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats.disabled} disabled. Toggle from the list to pause executions.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Due soon</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.dueSoon}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Executions scheduled within the next hour. Keep infrastructure ready.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Overdue</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.overdue}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Schedules whose next run is in the past. Investigate infra or execution errors.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Success rate</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {Number.isFinite(stats.successRate) ? `${stats.successRate.toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Based on successful executions across all schedules.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Total schedules and status overview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-300">Total schedules</span>
            <Badge variant="outline">{stats.total}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-300">Enabled</span>
            <Badge variant="success">{stats.enabled}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-300">Disabled</span>
            <Badge variant="outline">{stats.disabled}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Upcoming executions</CardTitle>
          <CardDescription>Next scheduled runs ordered chronologically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No upcoming executions detected.
            </div>
          ) : (
            upcoming.map(schedule => (
              <div
                key={schedule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 px-4 py-3 text-sm dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{schedule.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{schedule.url}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {formatDateTime(schedule.nextRunAt as string)}
                  </span>
                  <Badge variant="outline">{schedule.scheduleType}</Badge>
                  {schedule.scheduleType === 'interval' && (
                    <Badge variant="info">{formatIntervalSeconds(schedule.intervalSeconds)}</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {failing.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedules with recent failures</CardTitle>
            <CardDescription>Monitor recurring issues and adjust configurations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {failing.map(schedule => (
              <div
                key={schedule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-100 px-4 py-3 text-sm dark:border-rose-900/40"
              >
                <div>
                  <p className="font-medium text-rose-600 dark:text-rose-300">{schedule.name}</p>
                  <p className="text-xs text-rose-500 dark:text-rose-200/80">
                    {schedule.failureCount} failure{schedule.failureCount === 1 ? '' : 's'} /
                    {schedule.runCount} total runs
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-rose-500 dark:text-rose-200/80">
                  <PauseCircle className="h-4 w-4" />
                  Last run {schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : 'never'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
