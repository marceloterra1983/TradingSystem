/**
 * SignalsFilterBar Component
 *
 * Extracted from SignalsTable.tsx (Refactoring: 2025-11-04)
 * Responsible for filtering controls (channel, type, search, limit)
 *
 * @module tp-capital/components
 */

import { Button } from "../../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Input } from "../../../ui/input";
import { RefreshCcw, RotateCcw, FileDown, FileSpreadsheet } from '@/icons';
import { LIMIT_OPTIONS } from "../constants";

export interface SignalsFilterBarProps {
  // Filter state
  channelFilter: string;
  searchTerm: string;
  limit: number;
  fromDate: string;
  toDate: string;

  // Filter options
  channelOptions: string[];

  // Filter handlers
  onChannelFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;

  // Action handlers
  onRefresh: () => void;
  onSyncMessages: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;

  // Loading states
  isRefreshing: boolean;
  isSyncing: boolean;

  // Sync result
  syncResult?: {
    show: boolean;
    success: boolean;
    message: string;
  };
}

/**
 * Filter bar for TP-Capital signals table
 *
 * Provides filtering, search, and action controls in a compact layout.
 *
 * @param props - Filter configuration and handlers
 * @returns Filter bar component
 *
 * @example
 * ```tsx
 * <SignalsFilterBar
 *   channelFilter="all"
 *   onChannelFilterChange={setChannelFilter}
 *   // ... other props
 * />
 * ```
 */
export function SignalsFilterBar(props: SignalsFilterBarProps) {
  const {
    channelFilter,
    searchTerm,
    limit,
    fromDate,
    toDate,
    channelOptions,
    onChannelFilterChange,
    onSearchTermChange,
    onLimitChange,
    onFromDateChange,
    onToDateChange,
    onRefresh,
    onSyncMessages,
    onExportCsv,
    onExportJson,
    isRefreshing,
    isSyncing,
    syncResult,
  } = props;

  return (
    <div className="space-y-4">
      {/* Sync Messages Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncMessages}
          disabled={isSyncing}
          className="border-cyan-700 hover:bg-cyan-900/30 text-cyan-400"
          data-collapsible-ignore="true"
        >
          {isSyncing ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Checar Mensagens
            </>
          )}
        </Button>

        {syncResult?.show && (
          <div
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              syncResult.success
                ? "bg-emerald-950/50 border border-emerald-800 text-emerald-300"
                : "bg-red-950/50 border border-red-800 text-red-300"
            }`}
          >
            {syncResult.message}
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Channel Filter */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Canal
          </label>
          <Select value={channelFilter} onValueChange={onChannelFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {channelOptions.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex-1 min-w-[170px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Data inicial
          </label>
          <Input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex-1 min-w-[170px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Data final
          </label>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => onToDateChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Search Input */}
        <div className="flex-[2] min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Buscar
          </label>
          <Input
            type="text"
            placeholder="Ativo ou mensagem..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Limit Selector */}
        <div className="min-w-[100px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Limite
          </label>
          <Select
            value={String(limit)}
            onValueChange={(val) => onLimitChange(Number(val))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9"
            title="Atualizar dados"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-9"
            title="Exportar CSV"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportJson}
            className="h-9"
            title="Exportar JSON"
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
