/**
 * Unit tests for timestamp utilities
 *
 * These tests verify robust timestamp handling across different
 * formats, timezones, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeTimestamp,
  dateStringToSaoPauloTimestamp,
  formatTimestamp,
  formatRelativeTime,
  formatISO,
  isValidTimestamp,
  parseTimestampSafe,
  getTodayInSaoPaulo,
  APP_TIMEZONE,
} from '../timestampUtils';

describe('timestampUtils', () => {
  describe('normalizeTimestamp', () => {
    it('should convert Unix timestamp in seconds to milliseconds', () => {
      // 2023-11-05 16:00:00 UTC (in seconds)
      const seconds = 1699200000;
      const result = normalizeTimestamp(seconds);

      expect(result).toBe(1699200000000); // Milliseconds
    });

    it('should keep Unix timestamp in milliseconds as-is', () => {
      const milliseconds = 1699200000000;
      const result = normalizeTimestamp(milliseconds);

      expect(result).toBe(1699200000000);
    });

    it('should parse ISO 8601 strings', () => {
      const isoString = '2025-11-05T12:00:00.000Z';
      const result = normalizeTimestamp(isoString);

      expect(result).toBe(Date.parse(isoString));
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-11-05T12:00:00.000Z');
      const result = normalizeTimestamp(date);

      expect(result).toBe(date.getTime());
    });

    it('should return null for invalid inputs', () => {
      expect(normalizeTimestamp(null)).toBeNull();
      expect(normalizeTimestamp(undefined)).toBeNull();
      expect(normalizeTimestamp('')).toBeNull();
      expect(normalizeTimestamp('invalid')).toBeNull();
    });

    it('should return null for timestamps out of range', () => {
      // Year 1999 (too old)
      const year1999 = new Date('1999-01-01').getTime();
      expect(normalizeTimestamp(year1999)).toBeNull();

      // Year 2200 (too far in future)
      const year2200 = new Date('2200-01-01').getTime();
      expect(normalizeTimestamp(year2200)).toBeNull();
    });

    it('should handle invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(normalizeTimestamp(invalidDate)).toBeNull();
    });
  });

  describe('dateStringToSaoPauloTimestamp', () => {
    it('should convert date string to midnight in São Paulo time', () => {
      const dateStr = '2025-11-05';
      const result = dateStringToSaoPauloTimestamp(dateStr, false);

      expect(result).not.toBeNull();

      // Verify the timestamp represents midnight in São Paulo
      const date = new Date(result!);
      const formatted = date.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
      });

      expect(formatted).toContain('00:00:00');
    });

    it('should convert date string to end of day in São Paulo time', () => {
      const dateStr = '2025-11-05';
      const result = dateStringToSaoPauloTimestamp(dateStr, true);

      expect(result).not.toBeNull();

      // Verify the timestamp represents 23:59:59.999 in São Paulo
      const date = new Date(result!);
      const formatted = date.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
      });

      expect(formatted).toContain('23:59:59');
    });

    it('should return null for invalid date strings', () => {
      expect(dateStringToSaoPauloTimestamp('', false)).toBeNull();
      expect(dateStringToSaoPauloTimestamp('invalid', false)).toBeNull();
      expect(dateStringToSaoPauloTimestamp('2025-13-01', false)).toBeNull(); // Invalid month
    });

    it('should handle different date formats correctly', () => {
      const dateStr = '2025-01-15';
      const result = dateStringToSaoPauloTimestamp(dateStr, false);

      expect(result).not.toBeNull();

      const date = new Date(result!);
      const formatted = date.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      expect(formatted).toContain('01/15/2025');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp in São Paulo timezone', () => {
      // 2025-11-05 12:00:00 UTC
      const timestamp = Date.parse('2025-11-05T12:00:00.000Z');
      const result = formatTimestamp(timestamp, false);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('date');
      expect(result!.date).toBe('05/11/2025');
    });

    it('should include milliseconds when requested', () => {
      const timestamp = Date.parse('2025-11-05T12:00:00.123Z');
      const result = formatTimestamp(timestamp, true);

      expect(result).not.toBeNull();
      expect(result!.time).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('should return null for invalid timestamps', () => {
      expect(formatTimestamp(null)).toBeNull();
      expect(formatTimestamp(undefined)).toBeNull();
      expect(formatTimestamp('invalid')).toBeNull();
    });

    it('should handle different input formats', () => {
      const timestamp = 1699200000000;

      // Number
      const result1 = formatTimestamp(timestamp);
      expect(result1).not.toBeNull();

      // String
      const result2 = formatTimestamp(String(timestamp));
      expect(result2).not.toBeNull();

      // Date
      const result3 = formatTimestamp(new Date(timestamp));
      expect(result3).not.toBeNull();
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-05T12:00:00.000Z'));
    });

    it('should format recent timestamps correctly', () => {
      const now = Date.now();

      // 15 seconds ago (above "agora mesmo" threshold of 10s)
      expect(formatRelativeTime(now - 15000)).toBe('há 15s');

      // 30 minutes ago
      expect(formatRelativeTime(now - 30 * 60 * 1000)).toBe('há 30min');

      // 5 hours ago
      expect(formatRelativeTime(now - 5 * 60 * 60 * 1000)).toBe('há 5h');

      // 1 day ago
      expect(formatRelativeTime(now - 24 * 60 * 60 * 1000)).toBe('ontem');

      // 3 days ago
      expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('há 3 dias');
    });

    it('should format very recent timestamps as "agora mesmo"', () => {
      const now = Date.now();
      // Below 10 second threshold
      expect(formatRelativeTime(now - 5000)).toBe('agora mesmo');
      expect(formatRelativeTime(now - 500)).toBe('agora mesmo');

      // Above 10 second threshold
      expect(formatRelativeTime(now - 15000)).toBe('há 15s');
    });

    it('should format old timestamps as absolute date', () => {
      const now = Date.now();
      const oldTimestamp = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      const result = formatRelativeTime(oldTimestamp);
      expect(result).toMatch(/\d{2}\/\d{2}/); // Should be dd/MM format
    });

    it('should return "?" for invalid timestamps', () => {
      expect(formatRelativeTime(null as any)).toBe('?');
      expect(formatRelativeTime(undefined as any)).toBe('?');
      expect(formatRelativeTime('invalid')).toBe('?');
    });
  });

  describe('formatISO', () => {
    it('should format timestamp as ISO 8601 UTC string', () => {
      const timestamp = Date.parse('2025-11-05T12:00:00.000Z');
      const result = formatISO(timestamp);

      expect(result).toBe('2025-11-05T12:00:00.000Z');
    });

    it('should return null for invalid timestamps', () => {
      expect(formatISO(null)).toBeNull();
      expect(formatISO(undefined)).toBeNull();
      expect(formatISO('invalid')).toBeNull();
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamps', () => {
      const validTimestamp = Date.parse('2025-11-05T12:00:00.000Z');
      expect(isValidTimestamp(validTimestamp)).toBe(true);
    });

    it('should return false for timestamps out of range', () => {
      const year1999 = new Date('1999-01-01').getTime();
      const year2200 = new Date('2200-01-01').getTime();

      expect(isValidTimestamp(year1999)).toBe(false);
      expect(isValidTimestamp(year2200)).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
      expect(isValidTimestamp('invalid')).toBe(false);
    });
  });

  describe('parseTimestampSafe', () => {
    it('should return primary timestamp if valid', () => {
      const primary = Date.parse('2025-11-05T12:00:00.000Z');
      const fallback = Date.parse('2025-11-04T12:00:00.000Z');

      const result = parseTimestampSafe(primary, fallback);
      expect(result).toBe(primary);
    });

    it('should return fallback if primary is invalid', () => {
      const primary = 'invalid';
      const fallback = Date.parse('2025-11-04T12:00:00.000Z');

      const result = parseTimestampSafe(primary, fallback);
      expect(result).toBe(fallback);
    });

    it('should return current time if both are invalid', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const result = parseTimestampSafe('invalid', null);
      expect(result).toBe(now);
    });
  });

  describe('getTodayInSaoPaulo', () => {
    it('should return midnight of today in São Paulo timezone', () => {
      const result = getTodayInSaoPaulo();

      const date = new Date(result);
      const formatted = date.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
      });

      expect(formatted).toContain('00:00:00');
    });
  });

  describe('APP_TIMEZONE', () => {
    it('should be set to America/Sao_Paulo', () => {
      expect(APP_TIMEZONE).toBe('America/Sao_Paulo');
    });
  });
});
