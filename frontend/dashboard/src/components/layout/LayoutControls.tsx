import {
  Columns2,
  Columns3,
  Columns4,
  RotateCcw,
  ChevronsDownUp,
  ChevronsUpDown,
  Rows,
} from "@/icons";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ColumnCount } from "../../hooks/useCustomLayout";
import { Button } from "../ui/button";

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

const COLUMN_OPTIONS: {
  value: ColumnCount;
  icon: LucideIcon;
  label: string;
}[] = [
  { value: 1, icon: Rows, label: "1 Coluna" },
  { value: 2, icon: Columns2, label: "2 Colunas" },
  { value: 3, icon: Columns3, label: "3 Colunas" },
  { value: 4, icon: Columns4, label: "4 Colunas" },
];

export function LayoutControls({
  columns,
  onColumnsChange,
  onReset,
  onToggleCollapseAll,
  allCollapsed = false,
}: LayoutControlsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* Collapse/Expand All */}
      {onToggleCollapseAll && (
        <Button
          onClick={onToggleCollapseAll}
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 text-gray-600 shadow-sm transition-colors dark:text-gray-300",
            "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
          )}
          title={
            allCollapsed ? "Expandir todos os cards" : "Recolher todos os cards"
          }
          aria-label={
            allCollapsed ? "Expandir todos os cards" : "Recolher todos os cards"
          }
          aria-pressed={allCollapsed}
        >
          {allCollapsed ? (
            <ChevronsDownUp className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Column Selector */}
      <div className="flex items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {COLUMN_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const isActive = columns === option.value;

          return (
            <Button
              key={option.value}
              onClick={() => onColumnsChange(option.value)}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-none border-none transition-colors",
                index === 0 && "rounded-l-md",
                index === COLUMN_OPTIONS.length - 1 && "rounded-r-md",
                isActive
                  ? "bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-500 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
              title={option.label}
              aria-label={option.label}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      {/* Reset Layout */}
      {onReset && (
        <Button
          onClick={onReset}
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 text-gray-600 shadow-sm transition-colors dark:text-gray-300",
            "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
          )}
          title="Resetar layout"
          aria-label="Resetar layout"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
