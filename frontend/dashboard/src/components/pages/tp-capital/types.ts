/**
 * TP-Capital Type Definitions
 *
 * Centralized TypeScript interfaces and types
 *
 * @module tp-capital/types
 */

/**
 * Signal row data structure
 *
 * Represents a trading signal from TP Capital Telegram channel
 */
export interface SignalRow {
  id: number;
  ts: number | string;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number | null;
  buy_max: number | null;
  target_1: number | null;
  target_2: number | null;
  target_final: number | null;
  stop: number | null;
  raw_message: string;
  source: string;
  ingested_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch signals query parameters
 */
export interface FetchSignalsParams {
  limit: number;
  channel?: string;
  signalType?: string;
  search?: string;
  from?: string;
  to?: string;
}

/**
 * Fetch signals response
 */
export interface FetchSignalsResponse {
  rows: SignalRow[];
  usingFallback: boolean;
  errorMessage?: string;
}

/**
 * Log entry data structure
 */
export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: unknown;
}

/**
 * Fetch logs query parameters
 */
export interface FetchLogsParams {
  limit: number;
  level?: string;
}

/**
 * Fetch logs response
 */
export interface FetchLogsResponse {
  rows: LogEntry[];
  usingFallback: boolean;
  errorMessage?: string;
}

/**
 * Sync result state
 */
export interface SyncResult {
  show: boolean;
  success: boolean;
  message: string;
}
