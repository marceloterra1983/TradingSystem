/**
 * Timestamp Utilities with Timezone Support
 *
 * This module provides robust timestamp handling using date-fns-tz.
 * All timestamps are stored and transmitted in UTC, converted to
 * São Paulo timezone only for display.
 *
 * @module timestampUtils
 */

import { isValid } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Application timezone - default to São Paulo
 * Can be overridden via environment variable
 */
export const APP_TIMEZONE = import.meta.env.VITE_TIMEZONE || 'America/Sao_Paulo';

/**
 * Constants for validation
 */
const YEAR_2000_MS = 946684800000;
const YEAR_2100_MS = 4102444800000;
const YEAR_3000_MS = 32503680000000;

/**
 * Normalize timestamp from various formats to milliseconds (UTC)
 *
 * Handles:
 * - Unix timestamps in seconds (converts to milliseconds)
 * - Unix timestamps in milliseconds
 * - ISO 8601 strings
 * - Date objects
 *
 * @param timestamp - Timestamp in various formats
 * @returns Timestamp in milliseconds (UTC), or null if invalid
 */
export function normalizeTimestamp(timestamp: string | number | Date | null | undefined): number | null {
  if (!timestamp) return null;

  // Date object
  if (timestamp instanceof Date) {
    const ms = timestamp.getTime();
    return isNaN(ms) ? null : ms;
  }

  // String - could be ISO string or numeric string
  if (typeof timestamp === 'string') {
    // Try parsing as number first
    const asNumber = Number(timestamp);
    if (!isNaN(asNumber)) {
      // Recursively call with number
      return normalizeTimestamp(asNumber);
    }

    // Try parsing as ISO date string
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) return parsed;
    return null;
  }

  // Number - check if seconds or milliseconds
  if (typeof timestamp === 'number') {
    // Heuristic: timestamps before year 3000 are likely in seconds
    if (timestamp < YEAR_3000_MS / 1000) {
      // Check if it's in valid range as seconds (2000-2100)
      if (timestamp >= YEAR_2000_MS / 1000 && timestamp <= YEAR_2100_MS / 1000) {
        return timestamp * 1000; // Convert to milliseconds
      }
    }
    // Already in milliseconds
    if (timestamp >= YEAR_2000_MS && timestamp <= YEAR_2100_MS) {
      return timestamp;
    }
  }

  return null;
}

/**
 * Convert date string (YYYY-MM-DD) to timestamp in São Paulo timezone
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param endOfDay - If true, returns 23:59:59.999, else 00:00:00.000
 * @returns Timestamp in milliseconds (UTC)
 */
export function dateStringToSaoPauloTimestamp(dateStr: string, endOfDay = false): number | null {
  if (!dateStr) return null;

  try {
    // Parse date components
    const [year, month, day] = dateStr.split('-').map(Number);

    if (!year || !month || !day) return null;

    // Validate date components
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Create time string
    const timeStr = endOfDay ? '23:59:59.999' : '00:00:00.000';
    const dateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${timeStr}`;

    // Parse as date and convert from São Paulo time to UTC
    const localDate = new Date(dateTimeStr);

    // Check if date is valid
    if (!isValid(localDate)) {
      return null;
    }

    const utcDate = fromZonedTime(localDate, APP_TIMEZONE);
    const timestamp = utcDate.getTime();

    // Return null if result is NaN
    return isNaN(timestamp) ? null : timestamp;
  } catch (error) {
    console.error('[dateStringToSaoPauloTimestamp] Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Format timestamp for display in São Paulo timezone
 *
 * @param timestamp - Timestamp in milliseconds (UTC)
 * @param includeMilliseconds - Whether to include milliseconds in display
 * @returns Formatted timestamp object with time and date strings
 */
export function formatTimestamp(
  timestamp: string | number | Date | null | undefined,
  includeMilliseconds = false
): { time: string; date: string } | null {
  const normalizedTs = normalizeTimestamp(timestamp);

  if (!normalizedTs) {
    return null;
  }

  try {
    const date = new Date(normalizedTs);

    if (!isValid(date)) {
      return null;
    }

    // Format time
    let timeFormat = 'HH:mm:ss';
    if (includeMilliseconds) {
      timeFormat = 'HH:mm:ss.SSS';
    }
    const time = formatInTimeZone(date, APP_TIMEZONE, timeFormat);

    // Format date
    const dateStr = formatInTimeZone(date, APP_TIMEZONE, 'dd/MM/yyyy');

    return { time, date: dateStr };
  } catch (error) {
    console.error('[formatTimestamp] Error formatting timestamp:', timestamp, error);
    return null;
  }
}

/**
 * Format relative time (e.g., "há 5 minutos", "ontem")
 *
 * @param timestamp - Timestamp to format
 * @returns Relative time string in Portuguese
 */
export function formatRelativeTime(timestamp: string | number | Date | null | undefined): string {
  const normalizedTs = normalizeTimestamp(timestamp);

  if (!normalizedTs) {
    return '?';
  }

  try {
    // Use UTC for calculation (timezone-agnostic)
    const now = Date.now();
    const diffMs = now - normalizedTs;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Recent times
    if (diffSeconds < 10) return 'agora mesmo';
    if (diffSeconds < 60) return `há ${diffSeconds}s`;
    if (diffMinutes < 60) return `há ${diffMinutes}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;

    // Format absolute date in São Paulo timezone
    const date = new Date(normalizedTs);
    return formatInTimeZone(date, APP_TIMEZONE, 'dd/MM');
  } catch (error) {
    console.error('[formatRelativeTime] Error formatting timestamp:', timestamp, error);
    return '?';
  }
}

/**
 * Format timestamp as ISO 8601 string (UTC)
 * For API requests and storage
 *
 * @param timestamp - Timestamp to format
 * @returns ISO 8601 string with UTC timezone (e.g., "2025-11-05T12:00:00.000Z")
 */
export function formatISO(timestamp: string | number | Date | null | undefined): string | null {
  const normalizedTs = normalizeTimestamp(timestamp);

  if (!normalizedTs) {
    return null;
  }

  try {
    const date = new Date(normalizedTs);
    return date.toISOString();
  } catch (error) {
    console.error('[formatISO] Error formatting timestamp:', timestamp, error);
    return null;
  }
}

/**
 * Validate timestamp is within reasonable range (2000-2100)
 *
 * @param timestamp - Timestamp to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimestamp(timestamp: string | number | Date | null | undefined): boolean {
  const normalizedTs = normalizeTimestamp(timestamp);

  if (!normalizedTs) {
    return false;
  }

  return normalizedTs >= YEAR_2000_MS && normalizedTs <= YEAR_2100_MS;
}

/**
 * Parse timestamp with validation and fallback
 *
 * @param primary - Primary timestamp value
 * @param fallback - Fallback timestamp if primary is invalid
 * @returns Normalized timestamp in milliseconds, or Date.now() if both invalid
 */
export function parseTimestampSafe(
  primary: string | number | Date | null | undefined,
  fallback: string | number | Date | null | undefined
): number {
  const primaryTs = normalizeTimestamp(primary);
  if (primaryTs && isValidTimestamp(primaryTs)) {
    return primaryTs;
  }

  const fallbackTs = normalizeTimestamp(fallback);
  if (fallbackTs && isValidTimestamp(fallbackTs)) {
    return fallbackTs;
  }

  console.warn('[parseTimestampSafe] Both timestamps invalid, using current time', {
    primary,
    fallback,
  });

  return Date.now();
}

/**
 * Get current timestamp in São Paulo timezone
 * Returns midnight of today
 *
 * @returns Timestamp in milliseconds (UTC)
 */
export function getTodayInSaoPaulo(): number {
  const now = new Date();
  const saoPauloNow = toZonedTime(now, APP_TIMEZONE);

  // Set to midnight
  saoPauloNow.setHours(0, 0, 0, 0);

  // Convert back to UTC
  const utcMidnight = fromZonedTime(saoPauloNow, APP_TIMEZONE);

  return utcMidnight.getTime();
}

/**
 * Legacy support - export default timezone
 */
export const DEFAULT_TIMEZONE = APP_TIMEZONE;
