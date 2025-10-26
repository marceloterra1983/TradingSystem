import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from "../../ui/collapsible-card";
import { Button } from "../../ui/button";
import { DeleteButton } from "../../ui/action-buttons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Input } from "../../ui/input";
import { AlertCircle, FileDown, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { LIMIT_OPTIONS } from './constants';
import { fetchSignals, deleteSignal } from './api';
import { formatNumber, formatTimestamp, toCsv, downloadFile } from './utils';

export function SignalsTable() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [channelFilter, setChannelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['tp-capital-signals', { limit }],
    queryFn: () => fetchSignals({ limit }),
    refetchInterval: (data) => {
      // @ts-expect-error React Query v5 type inference issue with custom result properties
      if (!data || data.usingFallback) return false;
      return 5000;
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
        query.error instanceof Error ? query.error.message : 'Failed to fetch TP Capital signals';
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
      const matchesChannel = channelFilter === 'all' || row.channel === channelFilter;
      const matchesType = typeFilter === 'all' || row.signal_type === typeFilter;
      const matchesSearch = searchTerm
        ? row.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (row.raw_message || '').toLowerCase().includes(searchTerm.toLowerCase())
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao deletar sinal';
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
        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Serviço TP-Capital indisponível</p>
                <p className="mt-1">
                  Exibindo dados de exemplo enquanto o serviço não está acessível.
                  Inicie o backend em `apps/tp-capital` com `npm run dev` para restaurar os dados ao vivo.
                </p>
                {lastErrorMessage && (
                  <p className="mt-1 text-xs opacity-80">Erro original: {lastErrorMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 items-end">
            <div>
              <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
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
              <Input
                type="text"
                placeholder="Buscar..."
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

        <div className="text-sm text-slate-600 dark:text-slate-400">
          Exibindo {filteredSignals.length} de {signals.length} registros
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm bg-white dark:bg-slate-950">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">DATA</th>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">CANAL</th>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">TIPO</th>
                <th className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">ATIVO</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">COMPRA MIN</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">COMPRA MAX</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">ALVO 1</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">ALVO 2</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">ALVO FINAL</th>
                <th className="px-3 py-2 font-medium text-right text-slate-900 dark:text-slate-100">STOP</th>
                <th className="px-3 py-2 font-medium text-center text-slate-900 dark:text-slate-100">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((row, idx) => (
                <tr key={`${row.ingested_at}-${idx}`} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">{formatTimestamp(row.ts)}</td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{row.channel}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {row.signal_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">{row.asset}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.buy_min)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.buy_max)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.target_1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.target_2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.target_final)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{formatNumber(row.stop)}</td>
                  <td className="px-3 py-2 text-center">
                    <DeleteButton
                      onClick={() => handleDelete(row.ingested_at)}
                      disabled={deletingId === row.ingested_at || usingFallbackData}
                    />
                  </td>
                </tr>
              ))}
              {filteredSignals.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
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

