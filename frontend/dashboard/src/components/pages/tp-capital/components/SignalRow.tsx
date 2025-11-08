/**
 * SignalRow Component
 *
 * Extracted from SignalsTable.tsx (Refactoring: 2025-11-04)
 * Displays a single signal row in the table
 *
 * Updated 2025-11-04: 8 mandatory columns format
 * Horário/Data | Ativo | Compra Menor | Compra Maior | Alvo1 | Alvo2 | Alvo Final | Stop
 *
 * @module tp-capital/components
 */

import { AlertTriangle } from "lucide-react";
import { formatNumber, formatTimestamp } from "../utils";
import { SignalRow as SignalRowType } from "../types";

export interface SignalRowProps {
  signal: SignalRowType;
}

/**
 * Signal row component with mandatory 8 columns
 *
 * @param props - Signal data
 * @returns Table row component
 *
 * @example
 * ```tsx
 * <SignalRow signal={signalData} />
 * ```
 */
export function SignalRow(props: SignalRowProps) {
  const { signal } = props;

  const formattedTimestamp = formatTimestamp(signal.ts);
  const isDateObject =
    formattedTimestamp &&
    typeof formattedTimestamp === "object" &&
    "time" in formattedTimestamp;

  return (
    <tr className="border-b dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
      {/* Horário/Data */}
      <td className="py-3 px-4 whitespace-nowrap">
        {isDateObject ? (
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {formattedTimestamp.time}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedTimestamp.date}
            </span>
          </div>
        ) : (
          <span className="text-sm">{String(formattedTimestamp)}</span>
        )}
      </td>

      {/* Ativo */}
      <td className="py-3 px-4">
        <span className="font-mono font-semibold text-base text-gray-900 dark:text-white">
          {signal.asset}
        </span>
      </td>

      {/* Compra Menor */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {formatNumber(signal.buy_min)}
        </span>
      </td>

      {/* Compra Maior */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {formatNumber(signal.buy_max)}
        </span>
      </td>

      {/* Alvo 1 */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
          {formatNumber(signal.target_1)}
        </span>
      </td>

      {/* Alvo 2 */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
          {formatNumber(signal.target_2)}
        </span>
      </td>

      {/* Alvo Final */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400">
          {formatNumber(signal.target_final)}
        </span>
      </td>

      {/* Stop */}
      <td className="py-3 px-4 text-right">
        {signal.stop && (
          <div className="flex items-center justify-end gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
            <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
              {formatNumber(signal.stop)}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
