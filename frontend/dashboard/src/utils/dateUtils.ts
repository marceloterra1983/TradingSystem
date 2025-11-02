/**
 * Date and time utilities for TradingSystem
 * All timestamps are displayed in São Paulo timezone (America/Sao_Paulo)
 */

const TIMEZONE = 'America/Sao_Paulo';
const LOCALE = 'pt-BR';

/**
 * Format a timestamp string to Brazilian format with São Paulo timezone
 * @param value - ISO timestamp string or Date object
 * @returns Formatted date string (dd/mm/yyyy, hh:mm:ss)
 */
export function formatTimestamp(
  value: string | Date | null | undefined,
): string {
  if (!value) return '–';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '–';
  }

  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a timestamp string to short Brazilian format with São Paulo timezone
 * @param value - ISO timestamp string or Date object
 * @returns Formatted date string (dd/mm/yyyy, hh:mm)
 */
export function formatTimestampShort(
  value: string | Date | null | undefined,
): string {
  if (!value) return '–';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '–';
  }

  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Format a timestamp string to date only (Brazilian format, São Paulo timezone)
 * @param value - ISO timestamp string or Date object
 * @returns Formatted date string (dd/mm/yyyy)
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '–';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '–';
  }

  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a timestamp to a short label (dd/MM)
 */
export function formatShortDate(
  value: string | Date | null | undefined,
): string {
  if (!value) {
    return '–';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '–';
  }

  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Format a timestamp string to time only (São Paulo timezone)
 * @param value - ISO timestamp string or Date object
 * @returns Formatted time string (hh:mm:ss)
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '–';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '–';
  }

  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get current date/time in São Paulo timezone
 * @returns Date object representing current São Paulo time
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Convert a UTC timestamp to São Paulo time
 * @param utcTimestamp - UTC timestamp string
 * @returns ISO string in São Paulo timezone
 */
export function utcToSaoPaulo(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
  });
}
