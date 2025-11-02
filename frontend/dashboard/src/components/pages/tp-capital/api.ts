import { FetchParams, FetchSignalsResult, FetchLogsResult } from './types';
import { SAMPLE_SIGNALS, SAMPLE_LOGS } from './constants';
import { buildLogsQuery, buildDeleteUrl } from './utils';

export async function fetchSignals(
  params: FetchParams,
): Promise<FetchSignalsResult> {
  try {
    // Dynamic import to avoid bundling issues
    const { tpCapitalApi } = await import('../../../utils/tpCapitalApi');
    
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.channel) queryParams.set('channel', params.channel);
    if (params.signalType) queryParams.set('type', params.signalType);
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    const endpoint = query ? `/signals?${query}` : '/signals';

    // ✅ Using authenticated helper
    const response = await tpCapitalApi.get(endpoint);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: json.data || [],
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while fetching signals';
    console.error('Failed to fetch TP Capital signals', error);
    return {
      rows: SAMPLE_SIGNALS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

export async function fetchLogs(params: {
  limit: number;
  level?: string;
}): Promise<FetchLogsResult> {
  try {
    const response = await fetch(buildLogsQuery(params.limit, params.level));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: json.data || [],
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while fetching logs';
    console.error('Failed to fetch TP Capital logs', error);
    return {
      rows: SAMPLE_LOGS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

export async function deleteSignal(ingestedAt: string): Promise<void> {
  const url = buildDeleteUrl();

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingestedAt }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Erro ao deletar sinal (HTTP ${response.status}): ${errorText}`,
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Não foi possível conectar ao serviço TP-Capital. Verifique se o backend está rodando.',
      );
    }
    throw error;
  }
}
