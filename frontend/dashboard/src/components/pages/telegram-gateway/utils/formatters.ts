/**
 * Utility formatters for Telegram Gateway
 *
 * @deprecated Date/time formatters migrated to timestampUtils.
 * Use timestampUtils for robust timezone handling.
 */

import {
  normalizeTimestamp,
  formatRelativeTime as formatRelTsRobust,
  APP_TIMEZONE,
} from "../../../../utils/timestampUtils";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format uptime in milliseconds to human-readable string
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format date to readable string
 * @deprecated Use formatTimestamp from timestampUtils instead
 */
export function formatDate(dateString: string | number): string {
  const normalized = normalizeTimestamp(dateString);
  if (!normalized) return "–";

  try {
    const date = new Date(normalized);
    return formatInTimeZone(date, APP_TIMEZONE, "dd/MM/yyyy, HH:mm");
  } catch (error) {
    return "–";
  }
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * @deprecated Use formatRelativeTime from timestampUtils instead
 */
export function formatRelativeTime(dateString: string | number): string {
  const normalized = normalizeTimestamp(dateString);
  if (!normalized) return "–";

  return formatRelTsRobust(normalized);
}
