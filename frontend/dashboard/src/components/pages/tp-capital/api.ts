import { FetchParams, FetchSignalsResult, FetchLogsResult } from './types';
import { SAMPLE_SIGNALS, SAMPLE_LOGS } from './constants';
import { buildQuery, buildLogsQuery } from './utils';

export async function fetchSignals(params: FetchParams): Promise<FetchSignalsResult> {
  try {
    const response = await fetch(buildQuery(params));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: (json.data || []),
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while fetching signals';
    console.error('Failed to fetch TP Capital signals', error);
    return {
      rows: SAMPLE_SIGNALS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

export async function fetchLogs(params: { limit: number; level?: string }): Promise<FetchLogsResult> {
  try {
    const response = await fetch(buildLogsQuery(params.limit, params.level));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: (json.data || []),
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while fetching logs';
    console.error('Failed to fetch TP Capital logs', error);
    return {
      rows: SAMPLE_LOGS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

export async function deleteSignal(ingestedAt: string): Promise<void> {
  const response = await fetch(`/api/tp-capital/signals`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingestedAt }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

