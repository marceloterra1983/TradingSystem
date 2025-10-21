import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue';
import parser from 'cron-parser';

export interface CronValidationOptions {
  allowBlank?: boolean;
}

export interface CronValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CronDescriptionOptions {
  locale?: string;
  use24HourTimeFormat?: boolean;
}

export interface NextExecutionsOptions {
  count?: number;
  timezone?: string;
  currentDate?: Date;
}

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function validateCron(expression: string, options: CronValidationOptions = {}): CronValidationResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return options.allowBlank
      ? { isValid: true }
      : { isValid: false, error: 'Cron expression is required' };
  }

  const valid = isValidCron(trimmed, { seconds: false });
  if (!valid) {
    return {
      isValid: false,
      error: 'Invalid cron expression. Expected format: "minute hour day-of-month month day-of-week"'
    };
  }
  return { isValid: true };
}

export function describeCron(expression: string, options: CronDescriptionOptions = {}): string {
  try {
    return cronstrue.toString(expression, {
      locale: options.locale,
      use24HourTimeFormat: options.use24HourTimeFormat ?? true
    });
  } catch {
    return expression;
  }
}

export function getNextExecutions(expression: string, options: NextExecutionsOptions = {}): Date[] {
  const { count = 5, timezone = DEFAULT_TIMEZONE, currentDate } = options;
  if (!validateCron(expression).isValid) {
    return [];
  }

  try {
    const interval = parser.parseExpression(expression, {
      currentDate: currentDate ?? new Date(),
      tz: timezone
    });
    const dates: Date[] = [];
    for (let index = 0; index < count; index += 1) {
      dates.push(interval.next().toDate());
    }
    return dates;
  } catch {
    return [];
  }
}

export function formatIntervalSeconds(seconds?: number | null): string {
  if (!seconds) {
    return 'Every N minutes';
  }

  if (seconds < 60) {
    return `Every ${seconds}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `Every ${minutes} min`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return `Every ${hours} h`;
  }

  const days = hours / 24;
  return `Every ${days} day${days > 1 ? 's' : ''}`;
}

export function formatDateTime(value: string | Date, locale?: string, timeZone?: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat(locale ?? undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone ?? DEFAULT_TIMEZONE
  }).format(date);
}
