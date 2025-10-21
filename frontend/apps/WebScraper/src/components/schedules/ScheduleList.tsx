import { useMemo } from 'react';
import { Calendar, Clock, Edit3, History, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { JobSchedule } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Spinner } from '../ui/spinner';
import { describeCron, formatIntervalSeconds } from '../../utils/cron';

export interface ScheduleListProps {
  schedules: JobSchedule[];
  isLoading: boolean;
  searchTerm: string;
  onEdit: (schedule: JobSchedule) => void;
  onDelete: (scheduleId: string) => void;
  onToggle: (scheduleId: string) => void;
  onViewHistory: (scheduleId: string) => void;
  deletingId?: string | null;
  togglingId?: string | null;
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return 'Unknown';
  }
  const diffMs = target.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (minutes === 0) {
    return 'Now';
  }
  const abs = Math.abs(minutes);
  if (abs < 60) {
    return minutes > 0 ? `in ${abs} min` : `${abs} min ago`;
  }
  const hours = Math.round(abs / 60);
  if (hours < 24) {
    return minutes > 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return minutes > 0 ? `in ${days}d` : `${days}d ago`;
}

function describeSchedule(schedule: JobSchedule) {
  if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
    try {
      return describeCron(schedule.cronExpression);
    } catch (error) {
      console.warn('Invalid cron expression', error);
      return schedule.cronExpression;
    }
  }
  if (schedule.scheduleType === 'interval') {
    return formatIntervalSeconds(schedule.intervalSeconds);
  }
  if (schedule.scheduleType === 'one-time') {
    return schedule.scheduledAt
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(schedule.scheduledAt))
      : 'One-time run';
  }
  return 'Unknown schedule';
}

function failureRate(schedule: JobSchedule) {
  if (!schedule.runCount) {
    return 0;
  }
  return (schedule.failureCount / schedule.runCount) * 100;
}

function statusColor(schedule: JobSchedule) {
  if (!schedule.enabled) {
    return 'bg-slate-400';
  }
  if (schedule.nextRunAt && new Date(schedule.nextRunAt) < new Date()) {
    return 'bg-amber-500';
  }
  if (failureRate(schedule) >= 30) {
    return 'bg-rose-500';
  }
  return 'bg-emerald-500';
}

export function ScheduleList({
  schedules,
  isLoading,
  searchTerm,
  onEdit,
  onDelete,
  onToggle,
  onViewHistory,
  deletingId,
  togglingId
}: ScheduleListProps) {
  const filtered = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const result = schedules
      .slice()
      .sort((a, b) => {
        if (a.enabled !== b.enabled) {
          return a.enabled ? -1 : 1;
        }
        const nextA = a.nextRunAt ? new Date(a.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
        const nextB = b.nextRunAt ? new Date(b.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
        return nextA - nextB;
      })
      .filter(schedule => {
        if (!normalized) {
          return true;
        }
        return [schedule.name, schedule.description, schedule.url]
          .filter(Boolean)
          .some(value => value!.toLowerCase().includes(normalized));
      });
    return result;
  }, [schedules, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {searchTerm
          ? 'No schedules match your search terms.'
          : 'No schedules yet. Create one to automate recurring scraping jobs.'}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(schedule => {
          const relativeNext = formatRelativeTime(schedule.nextRunAt);
          const relativeLast = formatRelativeTime(schedule.lastRunAt);
          const failurePercentage = failureRate(schedule);
          return (
            <div
              key={schedule.id}
              className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <span className={clsx('mt-1 h-2.5 w-2.5 rounded-full', statusColor(schedule))} />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {schedule.name}
                    </h3>
                    <Badge variant={schedule.enabled ? 'success' : 'outline'}>
                      {schedule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="info">{schedule.scheduleType}</Badge>
                    {schedule.template && (
                      <Badge variant="outline">Template: {schedule.template.name}</Badge>
                    )}
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{schedule.description}</p>
                  )}
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2 break-all">
                      <Calendar className="h-4 w-4" />
                      <span>{schedule.url}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{describeSchedule(schedule)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Next run</span>
                  <span className="font-medium text-slate-900 dark:text-slate-200">{relativeNext}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last run</span>
                  <span>{relativeLast}</span>
                </div>
                <div className="flex justify-between">
                  <span>Runs / Failures</span>
                  <span>
                    {schedule.runCount} / {schedule.failureCount}
                    {schedule.runCount ? ` (${failurePercentage.toFixed(0)}%)` : ''}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(schedule)}
                  className="flex-1"
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={schedule.enabled ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => onToggle(schedule.id)}
                      isLoading={togglingId === schedule.id}
                      disabled={togglingId !== null && togglingId !== undefined && togglingId !== schedule.id}
                    >
                      {schedule.enabled ? (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" /> Disable
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" /> Enable
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {schedule.enabled ? 'Pause schedule execution' : 'Resume schedule execution'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewHistory(schedule.id)}
                      disabled={Boolean(togglingId) || Boolean(deletingId)}
                    >
                      <History className="mr-2 h-4 w-4" /> History
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View jobs triggered by this schedule</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(schedule.id)}
                      isLoading={deletingId === schedule.id}
                      disabled={deletingId !== null && deletingId !== undefined && deletingId !== schedule.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete schedule</TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
