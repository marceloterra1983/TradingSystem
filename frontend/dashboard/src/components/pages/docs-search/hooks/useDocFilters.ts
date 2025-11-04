/**
 * useDocFilters - Hook for filtering documentation results
 * Quick Win P1-2: Extract filter logic from DocsHybridSearchPage.tsx
 */

import { useState, useMemo } from 'react';
import type { SearchResult } from './useDocSearch';

export function useDocFilters(results: SearchResult[]) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      if (filterType !== 'all' && result.type !== filterType) return false;
      if (filterDomain !== 'all' && result.domain !== filterDomain) return false;
      if (filterStatus !== 'all' && result.status !== filterStatus) return false;
      return true;
    });
  }, [results, filterType, filterDomain, filterStatus]);

  const resetFilters = () => {
    setFilterType('all');
    setFilterDomain('all');
    setFilterStatus('all');
  };

  return {
    filteredResults,
    filterType,
    setFilterType,
    filterDomain,
    setFilterDomain,
    filterStatus,
    setFilterStatus,
    resetFilters,
  };
}

