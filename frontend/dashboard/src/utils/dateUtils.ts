/**
 * Date and time utilities for TradingSystem
 * All timestamps are displayed in São Paulo timezone (America/Sao_Paulo)
 *
 * @deprecated Most functions in this file are deprecated. Use timestampUtils instead.
 * This file is kept for backward compatibility.
 */

import {
  normalizeTimestamp,
  formatTimestamp as formatTsRobust,
  APP_TIMEZONE,
} from "./timestampUtils";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = APP_TIMEZONE;

/**
 * Format a timestamp string to Brazilian format with São Paulo timezone
 * @param value - ISO timestamp string, number, or Date object
 * @returns Formatted date string (dd/mm/yyyy, hh:mm:ss)
 * @deprecated Use formatTimestamp from timestampUtils instead
 */
export function formatTimestamp(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "–";

  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return typeof value === "string" ? value : "–";
  }

  const result = formatTsRobust(normalized, false);
  if (!result) return "–";

  return `${result.date}, ${result.time}`;
}

/**
 * Format a timestamp string to short Brazilian format with São Paulo timezone
 * @param value - ISO timestamp string, number, or Date object
 * @returns Formatted date string (dd/mm/yyyy, hh:mm)
 * @deprecated Use formatTimestamp from timestampUtils instead
 */
export function formatTimestampShort(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "–";

  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return typeof value === "string" ? value : "–";
  }

  try {
    const date = new Date(normalized);
    return formatInTimeZone(date, TIMEZONE, "dd/MM/yyyy, HH:mm");
  } catch (error) {
    return "–";
  }
}

/**
 * Format a timestamp string to date only (Brazilian format, São Paulo timezone)
 * @param value - ISO timestamp string, number, or Date object
 * @returns Formatted date string (dd/mm/yyyy)
 * @deprecated Use formatTimestamp from timestampUtils and extract date field
 */
export function formatDate(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "–";

  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return typeof value === "string" ? value : "–";
  }

  const result = formatTsRobust(normalized, false);
  return result?.date || "–";
}

/**
 * Format a timestamp to a short label (dd/MM)
 * @deprecated Use formatInTimeZone from date-fns-tz directly
 */
export function formatShortDate(
  value: string | number | Date | null | undefined,
): string {
  if (!value) {
    return "–";
  }

  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return typeof value === "string" ? value : "–";
  }

  try {
    const date = new Date(normalized);
    return formatInTimeZone(date, TIMEZONE, "dd/MM");
  } catch (error) {
    return "–";
  }
}

/**
 * Format a timestamp string to time only (São Paulo timezone)
 * @param value - ISO timestamp string, number, or Date object
 * @returns Formatted time string (hh:mm:ss)
 * @deprecated Use formatTimestamp from timestampUtils and extract time field
 */
export function formatTime(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return "–";

  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return typeof value === "string" ? value : "–";
  }

  const result = formatTsRobust(normalized, false);
  return result?.time || "–";
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
 * @returns Formatted string in São Paulo timezone
 * @deprecated Use formatTimestamp from timestampUtils instead
 */
export function utcToSaoPaulo(utcTimestamp: string | number): string {
  const normalized = normalizeTimestamp(utcTimestamp);
  if (!normalized) return "–";

  const result = formatTsRobust(normalized, false);
  if (!result) return "–";

  return `${result.date}, ${result.time}`;
}
