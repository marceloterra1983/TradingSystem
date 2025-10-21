import { Columns2, Columns3, Columns4, RotateCcw, ChevronsDownUp, ChevronsUpDown, Rows } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ColumnCount } from '../../hooks/useCustomLayout';

/**
 * Layout Controls Component
 * Allows users to change grid column count and collapse/expand all cards
 */

interface LayoutControlsProps {
  /** Current number of columns */
  columns: ColumnCount;
  /** Callback when column count changes */
  onColumnsChange: (columns: ColumnCount) => void;
  /** Optional reset callback */
  onReset?: () => void;
  /** Optional collapse/expand all callback */
  onToggleCollapseAll?: () => void;
  /** Whether all cards are collapsed */
  allCollapsed?: boolean;
}

const COLUMN_OPTIONS: { value: ColumnCount; icon: LucideIcon; label: string }[] = [
  { value: 1, icon: Rows, label: '1 Coluna' },
  { value: 2, icon: Columns2, label: '2 Colunas' },
  { value: 3, icon: Columns3, label: '3 Colunas' },
  { value: 4, icon: Columns4, label: '4 Colunas' },
];

export function LayoutControls({
  columns,
  onColumnsChange,
  onReset,
  onToggleCollapseAll,
  allCollapsed = false
}: LayoutControlsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* Collapse/Expand All Button - First position (highlighted in yellow) */}
      {onToggleCollapseAll && (
        <button
          onClick={onToggleCollapseAll}
          className={cn(
            'p-1.5 rounded transition-all',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
            'shadow-sm'
          )}
          title={allCollapsed ? 'Expandir todos os cards' : 'Recolher todos os cards'}
        >
          {allCollapsed ? (
            <ChevronsDownUp className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Column Selector - Subtle Buttons */}
      <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        {COLUMN_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = columns === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onColumnsChange(option.value)}
              className={cn(
                'p-1.5 rounded transition-all',
                isActive
                  ? 'bg-cyan-500 text-white shadow-sm dark:bg-cyan-600'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
              title={option.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Reset Button - Subtle */}
      {onReset && (
        <button
          onClick={onReset}
          className={cn(
            'p-1.5 rounded transition-all',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
            'shadow-sm'
          )}
          title="Resetar layout"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
