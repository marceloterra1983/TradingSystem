export interface SignalRow {
  ts: string | number;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number | null;
  buy_max: number | null;
  target_1: number | null;
  target_2: number | null;
  target_final: number | null;
  stop: number | null;
  raw_message?: string;
  source?: string;
  ingested_at: string;
}

export interface FetchParams {
  limit: number;
  channel?: string;
  signalType?: string;
  search?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: unknown;
}

export interface FetchSignalsResult {
  rows: SignalRow[];
  usingFallback: boolean;
  errorMessage?: string;
}

export interface FetchLogsResult {
  rows: LogEntry[];
  usingFallback: boolean;
  errorMessage?: string;
}

