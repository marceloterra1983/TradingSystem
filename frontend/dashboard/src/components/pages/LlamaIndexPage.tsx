import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Boxes, ShieldCheck, Workflow } from 'lucide-react';
import { checkHealth, endpointInfo, getMode, setMode, type ServiceMode } from '../../services/llamaIndexService';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import LlamaIndexQueryTool from './LlamaIndexQueryTool';
import LlamaIndexIngestionStatusCard, { type LlamaIndexStatusResponse } from './LlamaIndexIngestionStatusCard';
import LlamaIndexCollectionsCard from './LlamaIndexCollectionsCard';

const DEFAULT_QUERY_URL = 'http://localhost:8202';
const DEFAULT_QDRANT_URL = 'http://localhost:6333';

const sanitize = (value: string | undefined, fallback: string): string => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.replace(/\/+$/, '') || fallback;
};

const resolveQueryUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return sanitize(
    env.VITE_LLAMAINDEX_QUERY_URL ||
      env.VITE_LANGCHAIN_QUERY_URL ||
      env.VITE_RAG_QUERY_URL ||
      DEFAULT_QUERY_URL,
    DEFAULT_QUERY_URL
  );
};

const resolveQdrantUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return sanitize(env.VITE_QDRANT_URL, DEFAULT_QDRANT_URL);
};

const QUERY_BASE_URL = resolveQueryUrl();
const QDRANT_BASE_URL = resolveQdrantUrl();

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function LlamaIndexPage(): JSX.Element {
  const [statusData, setStatusData] = useState<LlamaIndexStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestionMessage, setIngestionMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async (preserveMessage = false) => {
    setStatusLoading(true);
    setStatusError(null);
    if (!preserveMessage) {
      setIngestionMessage(null);
    }
    try {
      const resp = await fetch('/api/v1/rag/status');
      const raw = await resp.text();
      if (!resp.ok) {
        throw new Error(raw || `Request failed (${resp.status})`);
      }
      const json = raw ? (JSON.parse(raw) as LlamaIndexStatusResponse) : null;
      setStatusData(json);
    } catch (err: any) {
      const rawMessage = err?.message || 'Falha ao carregar status do LlamaIndex';
      const friendly =
        rawMessage.includes('401') || rawMessage.toLowerCase().includes('credenciais')
          ? 'A requisição foi rejeitada (401). Certifique-se de que o Documentation API (porta 3401) esteja em execução ou configure um VITE_LLAMAINDEX_JWT para acesso direto.'
          : rawMessage;
      setStatusError(friendly);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleIngest = useCallback(async () => {
    setIngesting(true);
    setIngestionMessage(null);
    try {
      const resp = await fetch('/api/v1/rag/status/ingest', { method: 'POST' });
      const raw = await resp.text();
      if (!resp.ok) {
        throw new Error(raw || `Request failed (${resp.status})`);
      }
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { message: raw };
      }
      setIngestionMessage(payload?.message || 'Ingestão acionada.');
      await fetchStatus(true);
    } catch (err: any) {
      setIngestionMessage(err?.message || 'Falha ao acionar ingestão.');
    } finally {
      setIngesting(false);
    }
  }, [fetchStatus]);

  const docsTotal = statusData?.documentation?.totalDocuments ?? null;
  const docsIndexed = statusData?.documentation?.indexedDocuments ?? null;
  const docsMissing = statusData?.documentation?.missingDocuments ?? null;
  const chunkCount = statusData?.qdrant?.count ?? null;
  const primaryCollection = statusData?.qdrant?.collection;
  const collections = statusData?.collections ?? [];

  const formatNumber = (value: number | null | undefined) =>
    typeof value === 'number' ? value.toLocaleString() : '–';

  const envVars = import.meta.env as Record<string, string | undefined>;
  const apiBaseUrl = (envVars.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const directQueryBase = QUERY_BASE_URL;
  const proxyQueryBase = apiBaseUrl ? `${apiBaseUrl}/api/v1/rag` : undefined;
  const qdrantBase = QDRANT_BASE_URL;

  const quickLinks = useMemo(() => [
    {
      id: 'query-api',
      label: 'Query Service API',
      helper: proxyQueryBase ? 'via docs-api (/api/v1/rag)' : 'Endpoint direto para o serviço',
      href: proxyQueryBase ?? directQueryBase,
      icon: <Workflow className="w-4 h-4 text-sky-600" />,
    },
    {
      id: 'query-swagger',
      label: 'Swagger /docs',
      helper: 'Documentação interativa do Query service',
      href: `${directQueryBase.replace(/\/+$/, '')}/docs`,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'qdrant',
      label: 'Qdrant API',
      helper: 'Vector store utilizado pelo LangChain / LlamaIndex',
      href: qdrantBase,
      icon: <Boxes className="w-4 h-4 text-amber-600" />,
    },
  ], [directQueryBase, proxyQueryBase, qdrantBase]);

  const stats = [
    {
      id: 'docs-indexed',
      label: 'Documentos indexados',
      value: formatNumber(docsIndexed),
      helper: docsTotal != null ? `${formatNumber(docsIndexed)} / ${formatNumber(docsTotal)}` : '—',
    },
    {
      id: 'docs-pending',
      label: 'Pendentes',
      value: formatNumber(docsMissing),
      helper: docsTotal != null ? `${formatNumber(docsMissing)} restantes` : '—',
    },
    {
      id: 'chunks',
      label: 'Chunks no Qdrant',
      value: formatNumber(chunkCount),
      helper: primaryCollection ? `Coleção ${primaryCollection}` : undefined,
    },
  ];

  const sections = useMemo(
    () => [
      {
        id: 'llamaindex-overview',
        content: (
          <CollapsibleCard cardId="llamaindex-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-sky-600" />
                LlamaIndex
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Status resumido dos serviços e links úteis.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                <LlamaIndexEndpointBanner />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4"
                    >
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{stat.value}</p>
                      {stat.helper && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{stat.helper}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-3">
                  <p className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2">Atalhos</p>
                  <div className="flex flex-wrap gap-2">
                    {quickLinks.map((link) => (
                      <Button key={link.id} variant="outline" size="sm" onClick={handleOpen(link.href)} className="gap-2">
                        {link.icon}
                        {link.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'llamaindex-status',
        content: (
          <CollapsibleCard cardId="llamaindex-status" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Ingestão e saúde
              </CollapsibleCardTitle>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <LlamaIndexIngestionStatusCard
                data={statusData}
                loading={statusLoading}
                error={statusError}
                ingesting={ingesting}
                ingestionMessage={ingestionMessage}
                onRefresh={handleRefresh}
                onIngest={handleIngest}
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'llamaindex-collections',
        content: (
          <CollapsibleCard cardId="llamaindex-collections">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                Coleções vetoriais
              </CollapsibleCardTitle>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <LlamaIndexCollectionsCard
                collections={collections}
                primaryCollection={primaryCollection}
                chunkCount={chunkCount}
                loading={statusLoading}
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'llamaindex-interactive',
        content: (
          <CollapsibleCard cardId="llamaindex-interactive" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-sky-600" />
                Interactive Query Tool
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Execute semantic search (/search) ou respostas com LLM (/query) diretamente do dashboard.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <LlamaIndexQueryTool />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ],
    [collections, chunkCount, handleIngest, handleRefresh, ingestionMessage, ingesting, primaryCollection, quickLinks, statusData, statusError, statusLoading]
  );

  return (
    <CustomizablePageLayout
      pageId="llamaindex-page"
      title="LlamaIndex / LangChain RAG"
      subtitle="Gerencie serviços de ingestão, consulta e vector store do stack LangChain/LlamaIndex."
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default LlamaIndexPage;

function LlamaIndexEndpointBanner(): JSX.Element {
  const lsKey = 'llamaindex.mode';
  const [mode, setModeState] = useState<ServiceMode>(() => {
    try {
      const m = typeof window !== 'undefined' ? (window.localStorage.getItem(lsKey) as ServiceMode | null) : null;
      if (m === 'proxy' || m === 'direct' || m === 'auto') {
        setMode(m);
        return m;
      }
    } catch {}
    return getMode();
  });
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [healthMsg, setHealthMsg] = useState<string>('');
  const [healthUrl, setHealthUrl] = useState<string>('');
  const [, setFailCount] = useState(0);
  const [showSuggest, setShowSuggest] = useState(false);
  const suppressKey = 'llamaindex.suppressProxySuggest';

  useEffect(() => {
    try { window.localStorage.setItem(lsKey, mode); } catch {}
  }, [mode]);

  const info = endpointInfo();

  async function doHealthCheck() {
    try {
      setHealth('unknown');
      setHealthMsg('');
      const latest = await checkHealth();
      setHealthUrl(latest.url);
      if (latest.status === 'ok') {
        setHealth('ok');
        setHealthMsg('OK');
        setFailCount(0);
      } else {
        setHealth('error');
        setHealthMsg(latest.message || 'Erro');
        if (latest.resolved === 'direct') {
          setFailCount((c) => {
            const n = c + 1;
            try {
              const sup = typeof window !== 'undefined' ? window.localStorage.getItem(suppressKey) : null;
              if (n >= 2 && sup !== '1') setShowSuggest(true);
            } catch {}
            return n;
          });
        }
      }
    } catch (e: any) {
      setHealth('error');
      setHealthMsg(e?.message || 'Network error');
      const latestInfo = endpointInfo();
      if (latestInfo.resolved === 'direct') {
        setFailCount((c) => {
          const n = c + 1;
          try {
            const sup = typeof window !== 'undefined' ? window.localStorage.getItem(suppressKey) : null;
            if (n >= 2 && sup !== '1') setShowSuggest(true);
          } catch {}
          return n;
        });
      }
    }
  }

  useEffect(() => {
    doHealthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Auto health every 30s
  useEffect(() => {
    const id = setInterval(() => { doHealthCheck(); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <>
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Endpoint em uso:</span>
            <Badge variant="outline">{info.resolved.toUpperCase()}</Badge>
          </div>
          <div className="mt-1 font-mono text-xs break-all text-slate-700 dark:text-slate-300">{info.url}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Saúde:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                {health === 'ok' ? (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-400 cursor-help">OK</Badge>
                ) : health === 'error' ? (
                  <Badge variant="outline" className="text-red-700 border-red-400 cursor-help">
                    {healthMsg || 'Erro'}{info.resolved === 'direct' ? ' (Possível CORS/porta)' : ''}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="cursor-help">Testando…</Badge>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs break-all">{healthUrl || endpointInfo().url}</div>
              </TooltipContent>
            </Tooltip>
          </div>
          {health === 'error' && info.resolved === 'direct' && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Dica: use modo <code className="font-mono">proxy</code> com domínio unificado para evitar CORS.
            </div>
          )}
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(info.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1000);
                } catch {}
              }}
            >
              {copied ? 'Copiado' : 'Copiar URL'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={doHealthCheck}
            >
              Testar
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">Modo</label>
          <select
            className="text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
            value={mode}
            onChange={(e) => {
              const m = e.target.value as ServiceMode;
              setMode(m);
              setModeState(m);
            }}
          >
            <option value="auto">auto</option>
            <option value="proxy">proxy</option>
            <option value="direct">direct</option>
          </select>
          {/* Open Swagger link adjusted by mode */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const env = import.meta.env as Record<string, string | undefined>;
              const direct = (env.VITE_LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
              window.open(`${direct}/docs`, '_blank', 'noopener,noreferrer');
            }}
            title={endpointInfo().resolved === 'proxy' ? 'Abrir Swagger do Query (direct)' : 'Abrir Swagger do Query'}
          >
            Abrir Swagger{endpointInfo().resolved === 'proxy' ? ' (direct)' : ''}
          </Button>
        </div>
      </div>
    </div>
    <Dialog open={showSuggest} onOpenChange={setShowSuggest}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recomendar uso de Proxy</DialogTitle>
          <DialogDescription>
            Detectamos falhas consecutivas ao acessar o endpoint em modo <code className="font-mono">direct</code>. Recomendamos alternar para <code className="font-mono">proxy</code> usando domínio unificado para evitar CORS e problemas de porta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              try { window.localStorage.setItem(suppressKey, '1'); } catch {}
              setShowSuggest(false);
            }}
          >
            Não mostrar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowSuggest(false); doHealthCheck(); }}
          >
            Tentar novamente
          </Button>
          <Button
            onClick={() => {
              setMode('proxy');
              setModeState('proxy');
              setShowSuggest(false);
              // Quick recheck
              setTimeout(() => doHealthCheck(), 500);
            }}
          >
            Alternar para Proxy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
