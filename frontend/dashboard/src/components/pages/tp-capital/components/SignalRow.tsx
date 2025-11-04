/**
 * SignalRow Component
 * 
 * Extracted from SignalsTable.tsx (Refactoring: 2025-11-04)
 * Displays a single signal row in the table
 * 
 * @module tp-capital/components
 */

import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { DeleteButton } from '../../../ui/action-buttons';
import { formatNumber } from '../utils';
import { SignalRow as SignalRowType } from '../types';

export interface SignalRowProps {
  signal: SignalRowType;
  onDelete: (ingestedAt: string) => Promise<void>;
  isDeleting: boolean;
}

/**
 * Signal row component with buy range, targets, stop, and actions
 * 
 * @param props - Signal data and handlers
 * @returns Table row component
 * 
 * @example
 * ```tsx
 * <SignalRow
 *   signal={signalData}
 *   onDelete={handleDelete}
 *   isDeleting={deletingId === signal.ingested_at}
 * />
 * ```
 */
export function SignalRow(props: SignalRowProps) {
  const { signal, onDelete, isDeleting } = props;

  const signalTypeBadge =
    signal.signal_type === 'Day Trade'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';

  return (
    <tr className="border-b dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
      {/* Asset */}
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono font-semibold text-base text-gray-900 dark:text-white">
            {signal.asset}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {signal.channel}
          </span>
        </div>
      </td>

      {/* Signal Type */}
      <td className="py-3 px-4">
        <span
          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md ${signalTypeBadge}`}
        >
          {signal.signal_type}
        </span>
      </td>

      {/* Buy Range */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span className="font-mono text-sm">
            {formatNumber(signal.buy_min)} - {formatNumber(signal.buy_max)}
          </span>
        </div>
      </td>

      {/* Targets */}
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1.5">
          {signal.target_1 && (
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                T1: {formatNumber(signal.target_1)}
              </span>
            </div>
          )}
          {signal.target_2 && (
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                T2: {formatNumber(signal.target_2)}
              </span>
            </div>
          )}
          {signal.target_final && (
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
              <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                Final: {formatNumber(signal.target_final)}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Stop */}
      <td className="py-3 px-4">
        {signal.stop && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
              {formatNumber(signal.stop)}
            </span>
          </div>
        )}
      </td>

      {/* Source */}
      <td className="py-3 px-4">
        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {signal.source}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <DeleteButton
          onClick={() => onDelete(signal.ingested_at)}
          disabled={isDeleting}
          confirmMessage="Tem certeza que deseja deletar este sinal?"
        />
      </td>
    </tr>
  );
}

