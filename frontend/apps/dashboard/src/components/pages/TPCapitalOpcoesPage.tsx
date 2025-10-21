import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../ui/collapsible-card";
import { Button } from "../ui/button";
import { DeleteButton } from "../ui/action-buttons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { AlertCircle, FileDown, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { getApiUrl } from '../../config/api';

const API_BASE_URL = getApiUrl('tpCapital');

function resolveTpCapitalBase(): string {
  const candidate = API_BASE_URL && API_BASE_URL.trim().length > 0 ? API_BASE_URL : '/api/tp-capital';
  // If it's already an absolute URL, return as-is
  if (/^https?:\/\//i.test(candidate)) {
    return candidate.replace(/\/$/, '');
  }
  // Otherwise, return the relative path as-is (for Vite proxy)
  return candidate.replace(/\/$/, '');
}

// Dev-only: surface the resolved base URL once for diagnostics
if (import.meta.env.DEV) {
  const base = resolveTpCapitalBase();
  // eslint-disable-next-line no-console
  console.debug('[tp-capital] base =', base);
}

interface SignalRow {
  ts: string;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number | null;
  buy_max: number | null;
  target_1: number | null;
  target_2: number | null;
  target_final: number | null;
  stop: number | null;
  raw_message?: string;
  source?: string;
  ingested_at: string;
}

interface FetchParams {
  limit: number;
  channel?: string;
  signalType?: string;
  search?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: unknown;
}

const LIMIT_OPTIONS = [100, 250, 500, 1000];
const LOG_LIMIT_OPTIONS = [50, 100, 200];
const SAMPLE_SIGNALS: SignalRow[] = [
  {
    ts: '2025-01-10T13:45:00.000Z',
    channel: 'tp-capital-premium',
    signal_type: 'Swing Trade',
    asset: 'PETR4',
    buy_min: 32.15,
    buy_max: 32.45,
    target_1: 32.9,
    target_2: 33.25,
    target_final: 33.7,
    stop: 31.6,
    raw_message: 'Compra em PETR4 entre 32,15 e 32,45 com alvos em 32,90 / 33,25 / 33,70',
    source: 'sample',
    ingested_at: '2025-01-10T13:45:03.000Z',
  },
  {
    ts: '2025-01-10T14:05:00.000Z',
    channel: 'tp-capital-premium',
    signal_type: 'Day Trade',
    asset: 'WINJ25',
    buy_min: 130450,
    buy_max: 130520,
    target_1: 130700,
    target_2: 130820,
    target_final: 130980,
    stop: 130260,
    raw_message: 'Compra em WINJ25 acima de 130.450 com proteção curta, alvos 130.700/130.820/130.980',
    source: 'sample',
    ingested_at: '2025-01-10T14:05:04.000Z',
  },
];

const SAMPLE_LOGS: LogEntry[] = [
  {
    timestamp: '2025-01-10T14:09:12.000Z',
    level: 'warn',
    message: 'API de sinais indisponível. Ativando dados de exemplo.',
    context: { service: 'tp-capital-signals', hint: 'Verifique se o backend está rodando na porta 3201.' },
  },
  {
    timestamp: '2025-01-10T14:09:11.000Z',
    level: 'info',
    message: 'Nenhuma atualização em tempo real. Aguardando serviço retornar.',
  },
];

function buildQuery(params: FetchParams) {
  const base = resolveTpCapitalBase();
  // Build query string manually for relative paths
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(params.limit));
  if (params.channel && params.channel !== "all") {
    queryParams.set("channel", params.channel);
  }
  if (params.signalType && params.signalType !== "all") {
    queryParams.set("type", params.signalType);
  }
  if (params.search) {
    queryParams.set("search", params.search);
  }
  return `${base}/signals?${queryParams.toString()}`;
}

function buildLogsQuery(limit: number, level?: string) {
  const base = resolveTpCapitalBase();
  // Build query string manually for relative paths
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  if (level && level !== "all") {
    queryParams.set("level", level);
  }
  return `${base}/logs?${queryParams.toString()}`;
}

interface FetchSignalsResult {
  rows: SignalRow[];
  usingFallback: boolean;
  errorMessage?: string;
}

interface FetchLogsResult {
  rows: LogEntry[];
  usingFallback: boolean;
  errorMessage?: string;
}

async function fetchSignals(params: FetchParams): Promise<FetchSignalsResult> {
  try {
    const response = await fetch(buildQuery(params));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: (json.data || []) as SignalRow[],
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while fetching signals';
    console.error('Failed to fetch TP Capital signals', error);
    return {
      rows: SAMPLE_SIGNALS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

async function fetchLogs(params: { limit: number; level?: string }): Promise<FetchLogsResult> {
  try {
    const response = await fetch(buildLogsQuery(params.limit, params.level));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      rows: (json.data || []) as LogEntry[],
      usingFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while fetching logs';
    console.error('Failed to fetch TP Capital logs', error);
    return {
      rows: SAMPLE_LOGS,
      usingFallback: true,
      errorMessage: message,
    };
  }
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "?";
  }
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimestamp(ts: string) {
  if (!ts) return "?";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatContext(context: unknown) {
  if (context === null || context === undefined) {
    return "-";
  }
  try {
    return JSON.stringify(context, null, 2);
  } catch (error) {
    return String(context);
  }
}

function levelBadgeClass(level: string) {
  switch (level) {
    case "error":
      return "bg-red-100 text-red-600";
    case "warn":
      return "bg-amber-100 text-amber-600";
    case "debug":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-emerald-100 text-emerald-600";
  }
}

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(rows: SignalRow[]) {
  const headers = [
    "DATA",
    "CANAL",
    "TIPO",
    "ATIVO",
    "COMPRA_MIN",
    "COMPRA_MAX",
    "ALVO_1",
    "ALVO_2",
    "ALVO_FINAL",
    "STOP",
  ];
  const csvRows = rows.map((row) => [
    formatTimestamp(row.ts),
    row.channel,
    row.signal_type,
    row.asset,
    formatNumber(row.buy_min),
    formatNumber(row.buy_max),
    formatNumber(row.target_1),
    formatNumber(row.target_2),
    formatNumber(row.target_final),
    formatNumber(row.stop),
  ].join(";"));
  return [headers.join(";"), ...csvRows].join("\n");
}

function SignalTableCard() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limit, setLimit] = useState(500);
  const [channelFilter, setChannelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const query = useQuery<FetchSignalsResult>({
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

  const handleCsvDownload = () => {
    downloadFile('tp-capital-signals.csv', 'text/csv;charset=utf-8', toCsv(filteredSignals));
  };

  const handleExcelDownload = () => {
    downloadFile('tp-capital-signals.xls', 'application/vnd.ms-excel', toCsv(filteredSignals));
  };

  const handleDelete = async (row: SignalRow) => {
    if (usingFallbackData) {
      window.alert('Não é possível deletar sinais enquanto os dados de exemplo estiverem ativos. Inicie o serviço TP-Capital para habilitar exclusões.');
      return;
    }
    if (deletingId) {
      return;
    }
    if (!window.confirm('Remover este sinal da base?')) {
      return;
    }

    setDeletingId(row.ingested_at);
    try {
      const base = resolveTpCapitalBase();
      const response = await fetch(`${base}/signals`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingestedAt: row.ingested_at }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete signal');
      }

      await query.refetch();
    } catch (error) {
      window.console.error('Failed to delete TP Capital signal', error);
      window.alert('Erro ao excluir sinal. Consulte os logs.');
    } finally {
      setDeletingId(null);
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
        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Serviço TP-Capital indisponível</p>
                <p className="mt-1">
                  Exibindo dados de exemplo enquanto o serviço não está acessível. Inicie o backend em
                  <code className="mx-1 rounded bg-white/60 px-1 py-0.5 dark:bg-slate-900/60">frontend/apps/tp-capital</code>
                  com <code className="mx-1 rounded bg-white/60 px-1 py-0.5 dark:bg-slate-900/60">npm run dev</code> para restaurar os dados ao vivo.
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
                <SelectTrigger className="h-8 w-full min-w-[120px] text-sm">
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
                <SelectTrigger className="h-8 w-full min-w-[150px] text-sm">
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
                <SelectTrigger className="h-8 w-full min-w-[150px] text-sm">
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
            <div className="sm:col-span-2 lg:col-span-1">
              <Input
                placeholder="Buscar ativo ou texto"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-8 w-full text-sm"
              />
            </div>
            <div className="flex justify-start gap-1 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
                title="Atualizar"
              >
                <RefreshCcw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleCsvDownload}
                title="Download CSV"
              >
                <FileDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleExcelDownload}
                title="Download Excel"
              >
                <FileSpreadsheet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
        <div className="min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-100 text-left text-xs uppercase">
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Canal</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Ativo</th>
                <th className="px-3 py-2 font-semibold text-right">Compra Min</th>
                <th className="px-3 py-2 font-semibold text-right">Compra Max</th>
                <th className="px-3 py-2 font-semibold text-right">Alvo 1</th>
                <th className="px-3 py-2 font-semibold text-right">Alvo 2</th>
                <th className="px-3 py-2 font-semibold text-right">Alvo Final</th>
                <th className="px-3 py-2 font-semibold text-right">Stop</th>
                <th className="px-3 py-2 font-semibold text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                    Carregando sinais...
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-red-500">
                    Falha ao carregar sinais. Consulte o console do navegador para detalhes.
                  </td>
                </tr>
              ) : filteredSignals.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                    Nenhum sinal recebido.
                  </td>
                </tr>
              ) : (
                filteredSignals.map((row, index) => {
                  const isDeletingRow = deletingId === row.ingested_at;
                  return (
                    <tr
                      key={`${row.ingested_at}-${row.channel}-${row.asset}-${index}`}
                      className="border-b border-slate-200 text-sm text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-3 py-2">{formatTimestamp(row.ts)}</td>
                      <td className="px-3 py-2">{row.channel || 'Desconhecido'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
                          {row.signal_type || 'Swing Trade'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                        {row.asset}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-300">
                        {formatNumber(row.buy_min)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-300">
                        {formatNumber(row.buy_max)}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-300">
                        {formatNumber(row.target_1)}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-300">
                        {formatNumber(row.target_2)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-500 dark:text-orange-300 font-semibold">
                        {formatNumber(row.target_final)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-500 dark:text-red-300 font-semibold">
                        {formatNumber(row.stop)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <DeleteButton
                          onClick={() => { void handleDelete(row); }}
                          disabled={isDeletingRow}
                          tooltip="Remover sinal"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

function LogsCard() {
  const [limit, setLimit] = useState(100);
  const [levelFilter, setLevelFilter] = useState('all');
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const logsQuery = useQuery<FetchLogsResult>({
    queryKey: ['tp-capital-logs', { limit, levelFilter }],
    queryFn: () => fetchLogs({ limit, level: levelFilter === 'all' ? undefined : levelFilter }),
    refetchInterval: (data) => {
      // @ts-expect-error React Query v5 type inference issue with custom result properties
      if (!data || data.usingFallback) return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (logsQuery.data) {
      setUsingFallbackData(logsQuery.data.usingFallback);
      setLastErrorMessage(logsQuery.data.errorMessage ?? null);
    } else if (logsQuery.error) {
      const message =
        logsQuery.error instanceof Error
          ? logsQuery.error.message
          : 'Failed to fetch TP Capital logs';
      setUsingFallbackData(true);
      setLastErrorMessage(message);
    }
  }, [logsQuery.data, logsQuery.error]);

  const logs = useMemo(() => logsQuery.data?.rows ?? [], [logsQuery.data]);

  return (
    <CollapsibleCard cardId="tp-capital-logs">
      <CollapsibleCardHeader>
        <div>
          <CollapsibleCardTitle>Logs de Ingestão</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Logs do serviço de ingestão do Telegram em tempo real
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent className="space-y-4">
        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Logs indisponíveis</p>
                <p className="mt-1">
                  Mostrando logs de exemplo porque não foi possível acessar o endpoint de ingestão.
                  Reinicie o serviço TP-Capital para recuperar os logs reais.
                </p>
                {lastErrorMessage && (
                  <p className="mt-1 text-xs opacity-80">Erro original: {lastErrorMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
            <div>
              <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger className="h-8 w-full min-w-[120px] text-sm">
                  <SelectValue placeholder="Limite" />
                </SelectTrigger>
                <SelectContent>
                  {LOG_LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} itens
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-8 w-full min-w-[150px] text-sm">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os niveis</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                  <SelectItem value="warn">Alertas</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-start gap-1 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => void logsQuery.refetch()}
                disabled={logsQuery.isFetching}
                title="Atualizar logs"
              >
                <RefreshCcw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
        <div className="min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-100 text-left text-xs uppercase">
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Nivel</th>
                <th className="px-3 py-2 font-semibold">Mensagem</th>
                <th className="px-3 py-2 font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    Carregando logs...
                  </td>
                </tr>
              ) : logsQuery.isError ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-red-500">
                    Falha ao carregar logs. Consulte o console do navegador para detalhes.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    Nenhum log registrado.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={`${log.timestamp}-${log.level}-${index}`}
                    className="border-b border-slate-200 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${levelBadgeClass(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2">{log.message}</td>
                    <td className="px-3 py-2">
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 px-2 py-1 text-xs text-slate-100">
                        {formatContext(log.context)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export function TPCapitalOpcoesPage() {
  const sections = [
    {
      id: 'tp-capital-opcoes-table',
      content: <SignalTableCard />,
    },
    {
      id: 'tp-capital-opcoes-logs',
      content: <LogsCard />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="tp-capital-opcoes"
      title="TP CAPITAL | OPCOES"
      subtitle="Sinais ingestados via Telegram"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default TPCapitalOpcoesPage;
