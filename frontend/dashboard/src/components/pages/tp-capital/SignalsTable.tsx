import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import { DeleteButton } from '../../ui/action-buttons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Input } from '../../ui/input';
import {
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  RefreshCcw,
  RotateCcw,
} from 'lucide-react';
import { LIMIT_OPTIONS } from './constants';
import { fetchSignals, deleteSignal } from './api';
import { formatNumber, formatTimestamp, toCsv, downloadFile } from './utils';

export function SignalsTable() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [channelFilter, setChannelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  // Message sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({
    show: false,
    success: false,
    message: '',
  });

  const query = useQuery({
    queryKey: ['tp-capital-signals', { limit }],
    queryFn: () => fetchSignals({ limit }),
    refetchInterval: (data) => {
      // @ts-expect-error React Query v5 type inference issue with custom result properties
      if (!data || data.usingFallback) return false;
      return 30000; // 30 segundos (antes: 5s - causa rate limit)
    },
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      window.console.info('TP Capital signals fetched', query.data.rows.length);
      setUsingFallbackData(query.data.usingFallback);
      setLastErrorMessage(query.data.errorMessage ?? null);
    } else if (query.error) {
      const message =
        query.error instanceof Error
          ? query.error.message
          : 'Failed to fetch TP Capital signals';
      setUsingFallbackData(true);
      setLastErrorMessage(message);
    }
  }, [query.data, query.error]);

  const signals = useMemo(() => query.data?.rows ?? [], [query.data]);

  const channelOptions = useMemo(() => {
    const set = new Set(signals.map((row) => row.channel).filter(Boolean));
    return Array.from(set).sort();
  }, [signals]);

  const typeOptions = useMemo(() => {
    const set = new Set(signals.map((row) => row.signal_type).filter(Boolean));
    return Array.from(set).sort();
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((row) => {
      const matchesChannel =
        channelFilter === 'all' || row.channel === channelFilter;
      const matchesType =
        typeFilter === 'all' || row.signal_type === typeFilter;
      const matchesSearch = searchTerm
        ? row.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (row.raw_message || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;
      return matchesChannel && matchesType && matchesSearch;
    });
  }, [signals, channelFilter, typeFilter, searchTerm]);

  const handleDelete = async (ingestedAt: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este sinal?')) {
      return;
    }

    setDeletingId(ingestedAt);
    try {
      await deleteSignal(ingestedAt);
      console.log('✅ Signal deleted successfully, refetching...');

      // Forçar refetch com invalidação da query
      await query.refetch();

      console.log('✅ Data refetched');
    } catch (error) {
      console.error('❌ Failed to delete signal:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao deletar sinal';
      alert(`Falha ao deletar sinal:\n\n${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

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
      // ✅ Using authenticated helper from utils/tpCapitalApi
      const { tpCapitalApi } = await import('../../../utils/tpCapitalApi');
      const response = await tpCapitalApi.post('/sync-messages');

      const result = await response.json();

      if (response.ok && result.success) {
        const messagesSynced = result.data?.messagesSynced || 0;
        setSyncResult({
          show: true,
          success: true,
          message:
            result.message || `${messagesSynced} mensagem(ns) sincronizada(s)`,
        });

        // Recarregar sinais após sincronização
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

      // Auto-hide após 5 segundos
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
        {/* Sync Messages Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMessages}
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

          {syncResult.show && (
            <div
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                syncResult.success
                  ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/50 border border-red-800 text-red-300'
              }`}
            >
              {syncResult.message}
            </div>
          )}
        </div>

        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Serviço TP-Capital indisponível</p>
                <p className="mt-1">
                  Exibindo dados de exemplo enquanto o serviço não está
                  acessível. Inicie o backend em `apps/tp-capital` com `npm run
                  dev` para restaurar os dados ao vivo.
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Quantidade
              </label>
              <Select
                value={String(limit)}
                onValueChange={(value) => setLimit(Number(value))}
              >
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="Limite" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} registros
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Canal
              </label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canais</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tipo
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Buscar
              </label>
              <Input
                type="text"
                placeholder="Ativo, mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex justify-start gap-1 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
                title="Atualizar dados"
              >
                <RefreshCcw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleExportCsv}
                disabled={filteredSignals.length === 0}
                title="Exportar CSV"
              >
                <FileSpreadsheet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleExportJson}
                disabled={filteredSignals.length === 0}
                title="Exportar JSON"
              >
                <FileDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 py-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Exibindo{' '}
            <span className="font-bold text-cyan-600 dark:text-cyan-400">
              {filteredSignals.length}
            </span>{' '}
            de <span className="font-bold">{signals.length}</span> registros
            {filteredSignals.length !== signals.length && (
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                (filtrados)
              </span>
            )}
          </div>
          {query.isFetching && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <RefreshCcw className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm bg-white dark:bg-slate-950">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                  DATA
                </th>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                  ATIVO
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  COMPRA MIN
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  COMPRA MAX
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  ALVO 1
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  ALVO 2
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  ALVO FINAL
                </th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">
                  STOP
                </th>
                <th className="px-3 py-2 font-medium text-center text-slate-900 dark:text-slate-100">
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((row, idx) => {
                const formattedDate = formatTimestamp(row.ts);
                const isDateObject =
                  formattedDate &&
                  typeof formattedDate === 'object' &&
                  'time' in formattedDate;
                return (
                  <tr
                    key={`${row.ingested_at}-${idx}`}
                    className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {isDateObject ? (
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {formattedDate.time}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formattedDate.date}
                          </span>
                        </div>
                      ) : (
                        <span>{String(formattedDate)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {row.asset}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.buy_min)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.buy_max)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.target_1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.target_2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.target_final)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(row.stop)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <DeleteButton
                        onClick={() => handleDelete(row.ingested_at)}
                        disabled={
                          deletingId === row.ingested_at || usingFallbackData
                        }
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredSignals.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    Nenhum sinal encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
