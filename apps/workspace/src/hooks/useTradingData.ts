import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// ✅ Custom hook seguindo as regras React do Playbooks
export interface TradingData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  lastUpdate: Date;
}

export interface UseTradingDataReturn {
  data: TradingData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook para buscar dados de trading
 * Segue as regras: custom hooks para lógica reutilizável
 */
export function useTradingData(symbol: string): UseTradingDataReturn {
  const [error, setError] = useState<Error | null>(null);

  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['trading-data', symbol],
    queryFn: async (): Promise<TradingData> => {
      const response = await fetch(`/api/trading/${symbol}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados para ${symbol}`);
      }
      return response.json();
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // 1 minuto
    enabled: !!symbol,
  });

  const handleError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else {
      setError(new Error('Erro desconhecido ao buscar dados de trading'));
    }
  }, []);

  useEffect(() => {
    if (queryError) {
      handleError(queryError);
    } else {
      setError(null);
    }
  }, [queryError, handleError]);

  return {
    data: data || null,
    loading: isLoading,
    error,
    refetch: () => {
      setError(null);
      void refetch();
    }
  };
}

/**
 * Hook para múltiplos símbolos
 * Demonstra composição ao invés de herança
 */
export function useMultipleTradingData(symbols: string[]) {
  console.warn('useMultipleTradingData is deprecated; use individual useTradingData calls instead.', symbols);
  return {
    data: [] as TradingData[],
    loading: false,
    hasError: false,
    refetchAll: () => undefined,
    results: symbols.map(() => ({ data: null, loading: false, error: null, refetch: () => undefined })),
  };
}
