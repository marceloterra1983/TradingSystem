/**
 * useSignalsFilters - Hook for filtering signals
 * Quick Win P1-4: Extract filter logic from SignalsTable.tsx
 */

import { useState, useMemo } from 'react';
import type { Signal } from './useSignalsData';

export interface SignalsFilters {
  asset: string;
  direction: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export function useSignalsFilters(signals: Signal[]) {
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      // Filter by asset
      if (filterAsset !== 'all' && signal.asset !== filterAsset) {
        return false;
      }

      // Filter by direction
      if (filterDirection !== 'all' && signal.direction !== filterDirection) {
        return false;
      }

      // Filter by status
      if (filterStatus !== 'all' && signal.status !== filterStatus) {
        return false;
      }

      // Filter by date range
      if (filterDateFrom) {
        const signalDate = new Date(signal.timestamp);
        const fromDate = new Date(filterDateFrom);
        if (signalDate < fromDate) return false;
      }

      if (filterDateTo) {
        const signalDate = new Date(signal.timestamp);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (signalDate > toDate) return false;
      }

      return true;
    });
  }, [signals, filterAsset, filterDirection, filterStatus, filterDateFrom, filterDateTo]);

  const resetFilters = () => {
    setFilterAsset('all');
    setFilterDirection('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return {
    filteredSignals,
    filters: {
      asset: filterAsset,
      direction: filterDirection,
      status: filterStatus,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    },
    setFilterAsset,
    setFilterDirection,
    setFilterStatus,
    setFilterDateFrom,
    setFilterDateTo,
    resetFilters,
  };
}

