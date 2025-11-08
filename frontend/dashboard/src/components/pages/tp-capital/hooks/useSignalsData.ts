/**
 * useSignalsData - Hook for fetching TP Capital signals
 * Quick Win P1-4: Extract data fetching logic from SignalsTable.tsx
 */

import { useState, useEffect, useCallback } from "react";
import { tpCapitalApi } from "../../../../utils/tpCapitalApi";

export interface Signal {
  id: string;
  asset: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: string;
  status: "active" | "closed" | "cancelled";
  channelId?: string;
  confidence?: number;
}

export interface UseSignalsDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSignalsData(options: UseSignalsDataOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await tpCapitalApi.get("/signals");
      const data = await response.json();

      setSignals(data.signals || data.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar signals";
      setError(message);
      console.error("[useSignalsData] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();

    if (autoRefresh) {
      const timer = setInterval(fetchSignals, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [fetchSignals, autoRefresh, refreshInterval]);

  return {
    signals,
    loading,
    error,
    refetch: fetchSignals,
  };
}
