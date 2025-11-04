/**
 * SignalsStats Component
 * 
 * Extracted from SignalsTable.tsx (Refactoring: 2025-11-04)
 * Displays signal statistics and counts
 * 
 * @module tp-capital/components
 */

import { SignalRow } from '../types';

export interface SignalsStatsProps {
  signals: SignalRow[];
  filteredSignals: SignalRow[];
}

/**
 * Statistics summary for signals table
 * 
 * Shows total signals and filtered count.
 * 
 * @param props - Signal arrays
 * @returns Stats component
 * 
 * @example
 * ```tsx
 * <SignalsStats
 *   signals={allSignals}
 *   filteredSignals={visibleSignals}
 * />
 * ```
 */
export function SignalsStats(props: SignalsStatsProps) {
  const { signals, filteredSignals } = props;

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Exibindo{' '}
      <span className="font-semibold text-gray-900 dark:text-white">
        {filteredSignals.length}
      </span>{' '}
      de{' '}
      <span className="font-semibold text-gray-900 dark:text-white">
        {signals.length}
      </span>{' '}
      sinais
    </div>
  );
}

