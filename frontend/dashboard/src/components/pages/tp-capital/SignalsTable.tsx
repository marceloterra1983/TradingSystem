/**
 * SignalsTable Component - Refactored Version
 * 
 * Displays TP-Capital trading signals with filtering, export, and sync capabilities.
 * 
 * Refactoring (2025-11-04):
 * - Extracted sub-components (SignalsFilterBar, SignalRow, SignalsStats)
 * - Reduced from 494 lines to ~280 lines (43% reduction)
 * - Improved modularity and testability
 * - Centralized constants
 * - Better separation of concerns
 * 
 * @module tp-capital
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../../ui/collapsible-card';
import { AlertCircle } from 'lucide-react';
import { fetchSignals } from './api';
import { toCsv, downloadFile } from './utils';
import { searchInMultiple } from './utils/filterHelpers';
import { SignalsFilterBar, SignalRow, SignalsStats } from './components';
import { DEFAULT_LIMIT } from './constants';

/**
 * Main signals table component
 * 
 * Features:
 * - Real-time data fetching with TanStack Query
 * - Client-side filtering (channel, type, search)
 * - CSV/JSON export
 * - Message synchronization
 * - Fallback sample data on service unavailable
 * 
 * @returns Signals table component
 */
export function SignalsTable() {
  // State management
  const [limit, setLimit] = useState(200); // Aumentado para 200 (era 10) - mostrar mais sinais
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState({
    show: false,
    success: false,
    message: '',
  });

  // Data fetching
  const query = useQuery({
    queryKey: ['tp-capital-signals', limit],
    queryFn: () => fetchSignals({ limit }),
    refetchInterval: 30000, // 30 seconds
    staleTime: 10000, // 10 seconds
  });

  const signals = query.data?.rows ?? [];
  const usingFallbackData = query.data?.usingFallback ?? false;
  const lastErrorMessage = query.data?.errorMessage;

  // Derive filter options from data
  const channelOptions = useMemo(() => {
    const channels = new Set(signals.map((s) => s.channel));
    return Array.from(channels).sort();
  }, [signals]);

  // Apply filters
  const filteredSignals = useMemo(() => {
    let filtered = signals;

    // SEMPRE filtrar checkpoints (canal system - registros internos)
    filtered = filtered.filter((s) => s.asset !== '__checkpoint__' && s.channel !== 'system');

    if (channelFilter !== 'all') {
      filtered = filtered.filter((s) => s.channel === channelFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((s) =>
        searchInMultiple(searchTerm, s.asset, s.raw_message, s.channel)
      );
    }

    return filtered;
  }, [signals, channelFilter, searchTerm]);

  // Reset filters when limit changes
  useEffect(() => {
    setChannelFilter('all');
    setSearchTerm('');
  }, [limit]);

  // Handlers
  const handleExportCsv = () => {
    const csv = toCsv(filteredSignals);
    downloadFile('tp-capital-signals.csv', 'text/csv;charset=utf-8', csv);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(filteredSignals, null, 2);
    downloadFile('tp-capital-signals.json', 'application/json', json);
  };

  const handleSyncMessages = async () => {
    setIsSyncing(true);
    setSyncResult({ show: false, success: false, message: '' });

    try {
      const { tpCapitalApi } = await import('../../../utils/tpCapitalApi');
      const response = await tpCapitalApi.post('/sync-messages');
      const result = await response.json();

      if (response.ok && result.success) {
        const messagesSynced = result.data?.messagesSynced || 0;
        setSyncResult({
          show: true,
          success: true,
          message: result.message || `${messagesSynced} mensagem(ns) sincronizada(s)`,
        });

        // Reload signals after sync
        if (messagesSynced > 0) {
          await query.refetch();
        }
      } else {
        setSyncResult({
          show: true,
          success: false,
          message: result.message || 'Erro ao sincronizar mensagens',
        });
      }
    } catch (error) {
      setSyncResult({
        show: true,
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Erro ao conectar com o serviço de sincronização',
      });
    } finally {
      setIsSyncing(false);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setSyncResult({ show: false, success: false, message: '' });
      }, 5000);
    }
  };

  return (
    <CollapsibleCard cardId="tp-capital-signals">
      <CollapsibleCardHeader>
        <div>
          <CollapsibleCardTitle>Sinais de Opções</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Sinais ingestados do canal TP Capital via Telegram
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>

      <CollapsibleCardContent className="space-y-4">
        {/* Fallback Data Warning */}
        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Serviço TP-Capital indisponível</p>
                <p className="mt-1">
                  Exibindo dados de exemplo enquanto o serviço não está acessível.
                  Inicie o backend em `apps/tp-capital` com `npm run dev` para
                  restaurar os dados ao vivo.
                </p>
                {lastErrorMessage && (
                  <p className="mt-1 text-xs opacity-80">
                    Erro original: {lastErrorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <SignalsFilterBar
          channelFilter={channelFilter}
          typeFilter="all"
          searchTerm={searchTerm}
          limit={limit}
          channelOptions={channelOptions}
          typeOptions={[]}
          onChannelFilterChange={setChannelFilter}
          onTypeFilterChange={() => {}}
          onSearchTermChange={setSearchTerm}
          onLimitChange={setLimit}
          onRefresh={() => query.refetch()}
          onSyncMessages={handleSyncMessages}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
          isRefreshing={query.isFetching}
          isSyncing={isSyncing}
          syncResult={syncResult}
        />

        {/* Stats */}
        <SignalsStats signals={signals} filteredSignals={filteredSignals} />

        {/* Loading State */}
        {query.isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Carregando sinais...
          </div>
        )}

        {/* Table */}
        {!query.isLoading && (
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm bg-white dark:bg-gray-950">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Horário/Data
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Ativo
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Compra Min.
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Compra Max.
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Alvo 1
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Alvo 2
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Alvo Final
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Stop
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSignals.map((signal) => (
                  <SignalRow
                    key={signal.ingested_at}
                    signal={signal}
                  />
                ))}
                {filteredSignals.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      {searchTerm || channelFilter !== 'all'
                        ? 'Nenhum sinal encontrado com os filtros aplicados'
                        : 'Nenhum sinal disponível'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

