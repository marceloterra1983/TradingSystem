import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export interface LlamaIndexServiceStatus {
  ok: boolean;
  status: number;
  message: string;
}

export interface LlamaIndexCollectionInfo {
  name: string;
  count: number | null;
  aliasOf?: string | null;
}

export interface LlamaIndexStatusResponse {
  timestamp: string;
  services: {
    query: LlamaIndexServiceStatus;
    ingestion: LlamaIndexServiceStatus;
  };
  qdrant: {
    collection: string;
    ok: boolean;
    status: number;
    count: number | null;
    sample: string[];
  };
  collections?: LlamaIndexCollectionInfo[];
  gpuPolicy?: { [key: string]: unknown };
  documentation?: {
    docsDirectory?: string;
    totalDocuments?: number;
    indexedDocuments?: number;
    missingDocuments?: number;
    missingSample?: string[];
    indexedSample?: string[];
    error?: string;
    indexedScanTruncated?: boolean;
  };
}

interface LlamaIndexIngestionStatusCardProps {
  data: LlamaIndexStatusResponse | null;
  loading: boolean;
  error: string | null;
  ingesting: boolean;
  ingestionMessage: string | null;
  onRefresh: () => void;
  onIngest: () => void;
}

export function LlamaIndexIngestionStatusCard({
  data,
  loading,
  error,
  ingesting,
  ingestionMessage,
  onRefresh,
  onIngest,
}: LlamaIndexIngestionStatusCardProps): JSX.Element {
  const renderService = (label: string, status?: LlamaIndexServiceStatus) => {
    if (!status) return null;
    const Icon = status.ok ? CheckCircle2 : AlertCircle;
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${status.ok ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Badge variant={status.ok ? 'default' : 'destructive'}>{status.ok ? 'Healthy' : 'Issue'}</Badge>
          <span>{status.message}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ingestion Overview</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Última atualização: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '–'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading || ingesting} className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {ingestionMessage && !error && (
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
          {ingestionMessage}
        </div>
      )}

      {!error && (
        <div className="space-y-3">
          {renderService('Query Service', data?.services?.query)}
          {renderService('Ingestion Service', data?.services?.ingestion)}

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Qdrant</p>
              <Badge variant={data?.qdrant?.ok ? 'default' : 'destructive'}>
                {data?.qdrant?.ok ? 'Reachable' : 'Unavailable'}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <p>Coleção: <span className="font-medium">{data?.qdrant?.collection || '–'}</span></p>
              <p>Chunks indexados: <span className="font-medium">{data?.qdrant?.count ?? '–'}</span></p>
              {data?.qdrant?.sample?.length ? (
                <div className="mt-2">
                  <p className="font-medium text-slate-600 dark:text-slate-300">Amostra de documentos:</p>
                  <ul className="mt-1 space-y-1">
                    {data.qdrant.sample.map((path, idx) => (
                      <li key={`${path}-${idx}`} className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        • {path}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {data?.documentation && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Documentação</p>
                <Badge variant="outline">
                  {data.documentation.indexedDocuments ?? 0}/{data.documentation.totalDocuments ?? 0} docs
                </Badge>
              </div>
              {data.documentation.error ? (
                <p className="text-xs text-red-500 dark:text-red-400">{data.documentation.error}</p>
              ) : (
                <>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    {data.documentation.docsDirectory && (
                      <p>
                        Diretório: <code className="text-[10px] bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">{data.documentation.docsDirectory}</code>
                      </p>
                    )}
                    <p>
                      Total de arquivos: <span className="font-medium">{data.documentation.totalDocuments ?? '–'}</span>
                    </p>
                    <p>
                      Indexados: <span className="font-medium">{data.documentation.indexedDocuments ?? '–'}</span>
                    </p>
                    {data.documentation.indexedScanTruncated ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        * Amostra truncada para evitar scroll infinito (coleção grande).
                      </p>
                    ) : null}
                    <p>
                      Pendentes: <span className="font-medium text-amber-600 dark:text-amber-400">{data.documentation.missingDocuments ?? '–'}</span>
                    </p>
                    {data.documentation.missingDocuments && data.documentation.missingDocuments > 0 ? (
                      <Button
                        size="sm"
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={ingesting}
                        onClick={onIngest}
                      >
                        {ingesting ? 'Vetorizando…' : 'Vetorizá-los agora'}
                      </Button>
                    ) : null}
                  </div>

                  {(data.documentation.indexedSample?.length || data.documentation.missingSample?.length) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.documentation.indexedSample?.length ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Indexados (amostra)</p>
                          <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {data.documentation.indexedSample.map((item, idx) => (
                              <li key={`indexed-${idx}`} className="truncate">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {data.documentation.missingSample?.length ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pendentes (amostra)</p>
                          <ul className="space-y-1 text-[11px] text-amber-600 dark:text-amber-400">
                            {data.documentation.missingSample.map((item, idx) => (
                              <li key={`missing-${idx}`} className="truncate">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LlamaIndexIngestionStatusCard;
