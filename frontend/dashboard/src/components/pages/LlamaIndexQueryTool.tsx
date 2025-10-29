import * as React from 'react';
import {
  llamaIndexService,
  type QueryResponse,
  type SearchResultItem,
  type GpuPolicyResponse,
  type LlamaIndexGpuMetadata,
} from '../../services/llamaIndexService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Clock, Trash2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  type: 'llm' | 'search';
  answer?: QueryResponse;
  results?: SearchResultItem[];
  error?: string;
}

const formatSeconds = (value: number): string => {
  if (Number.isNaN(value)) return '-';
  if (value < 0.01) return '<0.01s';
  return `${value.toFixed(2)}s`;
};

function GpuSummary({ gpu }: { gpu?: LlamaIndexGpuMetadata }): JSX.Element | null {
  if (!gpu) return null;
  const forced = gpu.policy?.forced ?? false;
  const lockEnabled = gpu.lock?.enabled && gpu.lock?.path;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <Badge variant="outline">GPU</Badge>
      <span>Espera {formatSeconds(gpu.waitTimeSeconds)}</span>
      <span>Concorrência {gpu.maxConcurrency}</span>
      <span>{forced ? 'Forçado' : 'Modo automático'}</span>
      {lockEnabled && <span>Lock {gpu.lock?.path}</span>}
    </div>
  );
}

export function LlamaIndexQueryTool(): JSX.Element {
  const [text, setText] = React.useState('Explain our docs structure');
  const [maxResults, setMaxResults] = React.useState(3);
  const [useLlm, setUseLlm] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [gpuPolicy, setGpuPolicy] = React.useState<GpuPolicyResponse | null>(null);
  const [gpuPolicyError, setGpuPolicyError] = React.useState<string | null>(null);

  React.useEffect(() => {
    llamaIndexService
      .fetchGpuPolicy()
      .then((policy) => {
        setGpuPolicy(policy);
        setGpuPolicyError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Falha ao carregar política de GPU';
        setGpuPolicyError(message);
      });
  }, []);

  const handleCopy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const handleRun = async () => {
    setLoading(true);
    const queryId = `query-${Date.now()}`;

    try {
      if (useLlm) {
        const resp = await llamaIndexService.queryDocs(text, maxResults);
        const item: HistoryItem = {
          id: queryId,
          query: text,
          timestamp: new Date(),
          type: 'llm',
          answer: resp,
        };
        setHistory((prev) => [item, ...prev]);
      } else {
        const items = await llamaIndexService.search(text, maxResults);
        const item: HistoryItem = {
          id: queryId,
          query: text,
          timestamp: new Date(),
          type: 'search',
          results: items,
        };
        setHistory((prev) => [item, ...prev]);
      }
    } catch (e: any) {
      const item: HistoryItem = {
        id: queryId,
        query: text,
        timestamp: new Date(),
        type: useLlm ? 'llm' : 'search',
        error: e?.message || 'Unknown error',
      };
      setHistory((prev) => [item, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Limpar todo o histórico de queries?')) {
      setHistory([]);
    }
  };

  const handleDeleteItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-4">
      {gpuPolicy && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Badge variant="outline">GPU</Badge>
            <span className="font-semibold">{gpuPolicy.policy.forced ? 'Execução forçada na GPU' : 'GPU opcional'}</span>
          </div>
          <span>Concorrência máx.: {gpuPolicy.maxConcurrency}</span>
          <span>Cooldown: {formatSeconds(gpuPolicy.cooldownSeconds)}</span>
          {gpuPolicy.policy.interprocess_lock_enabled && gpuPolicy.policy.lock_path && (
            <span>Lock: {gpuPolicy.policy.lock_path}</span>
          )}
        </div>
      )}
      {gpuPolicyError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-700 dark:text-amber-300">
          {gpuPolicyError}
        </div>
      )}
      {/* Query Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3">
        <div className="md:col-span-2">
          <Label htmlFor="li-query">Query</Label>
          <Input
            id="li-query"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pergunta ou termos de busca"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleRun();
              }
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <Label htmlFor="li-max">Top-K</Label>
            <Input
              id="li-max"
              type="number"
              min={1}
              max={10}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value || '1', 10))}
            />
          </div>
          <label className="flex items-center gap-2 mt-6">
            <Checkbox checked={useLlm} onCheckedChange={(v) => setUseLlm(!!v)} />
            <span className="text-sm text-slate-600 dark:text-slate-400">Usar LLM (/query)</span>
          </label>
          <Button onClick={handleRun} disabled={loading} className="self-end">
            {loading ? 'Executando…' : 'Executar'}
          </Button>
        </div>
      </div>

      {/* History Header */}
      {history.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Histórico ({history.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-slate-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar tudo
          </Button>
        </div>
      )}

      {/* History Items */}
      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3"
          >
            {/* Query Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={item.type === 'llm' ? 'default' : 'outline'}>
                    {item.type === 'llm' ? 'LLM Query' : 'Search'}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.query}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteItem(item.id)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <GpuSummary gpu={item.answer?.metadata?.gpu} />
            {item.answer?.metadata?.collection && (
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Coleção ativa:&nbsp;
                <code className="bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">
                  {item.answer.metadata.collection}
                </code>
              </div>
            )}

            {/* Error */}
            {item.error && (
              <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 text-sm">
                {item.error}
              </div>
            )}

            {/* Search Results */}
            {item.results && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Resultados ({item.results.length}):
                </p>
                <ul className="space-y-2">
                  {item.results.map((r, idx) => (
                    <li key={idx} className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Score {r.relevance.toFixed(3)}</Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(`${item.id}-res-${idx}`, r.content)}
                          >
                            Copiar
                          </Button>
                          {copied === `${item.id}-res-${idx}` && (
                            <span className="text-xs text-emerald-600">✓</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                        {r.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* LLM Answer */}
            {item.answer && (
              <div className="space-y-3">
                {/* Answer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Conf {item.answer.confidence.toFixed(3)}</Badge>
                      <Badge variant="outline">Fontes {item.answer.sources.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(`${item.id}-answer`, item.answer!.answer)}
                      >
                        Copiar resposta
                      </Button>
                      {copied === `${item.id}-answer` && (
                        <span className="text-xs text-emerald-600">✓</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                    <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {item.answer.answer}
                    </p>
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Fontes utilizadas:
                  </p>
                  <div className="space-y-2">
                    {item.answer.sources.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">Score {s.relevance.toFixed(3)}</Badge>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(`${item.id}-src-${idx}`, s.content)}
                            >
                              Copiar fonte
                            </Button>
                            {copied === `${item.id}-src-${idx}` && (
                              <span className="text-xs text-emerald-600">✓</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                          {s.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {history.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">Nenhuma query executada ainda.</p>
          <p className="text-xs mt-1">Digite uma pergunta acima e clique em "Executar".</p>
        </div>
      )}
    </div>
  );
}

export default LlamaIndexQueryTool;
