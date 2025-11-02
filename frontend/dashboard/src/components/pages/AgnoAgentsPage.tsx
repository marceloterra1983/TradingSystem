import { useEffect, useMemo, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Activity,
  BrainCircuit,
  BookOpen,
  ExternalLink,
  GaugeCircle,
  ListTree,
  Radar,
  Rocket,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { buildDocsUrl } from '../../lib/docsUrl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';

const DEFAULT_AGNO_BASE_URL = 'http://localhost:8201';

const sanitizeBaseUrl = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') {
    return DEFAULT_AGNO_BASE_URL;
  }
  return value.replace(/\/+$/, '') || DEFAULT_AGNO_BASE_URL;
};

const ENV_DEFAULT_BASE_URL = sanitizeBaseUrl(
  import.meta.env.VITE_AGNO_AGENTS_URL,
);

type AgentArg = {
  name: string;
  type: string;
  default?: unknown;
  resolvedDefault?: unknown;
  description?: string;
};

type AgentDescriptor = {
  id: string;
  name: string;
  role?: string;
  instructions?: string;
  runtime?: string;
  entry?: string;
  env?: string[];
  args?: AgentArg[];
};

function useAgentsRegistry(baseUrl: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentDescriptor[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/v1/agents/registry`);
        if (!res.ok) throw new Error(`registry http ${res.status}`);
        const list: any[] = await res.json();
        // Fetch per-agent args descriptor (resolved defaults)
        const details = await Promise.all(
          list.map(async (m) => {
            try {
              const r = await fetch(`${baseUrl}/api/v1/agents/${m.id}/args`);
              if (!r.ok) throw new Error('args not available');
              const d = await r.json();
              return d as AgentDescriptor;
            } catch {
              return {
                id: m.id,
                name: m.name ?? m.id,
                role: m.role,
                instructions: m.instructions,
                runtime: m.runtime,
                entry: m.entry,
                env: m.env,
                args: [],
              } as AgentDescriptor;
            }
          }),
        );
        if (!cancelled) setAgents(details);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar agentes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, reloadTick]);

  const refresh = () => setReloadTick((v) => v + 1);

  return { loading, error, agents, refresh };
}

// Removed unused static QUICK_LINKS that referenced AGNO_BASE_URL.

const DOCUMENTATION_LINKS = [
  {
    id: 'prd',
    label: 'PRD Integração Agno',
    href: buildDocsUrl('context/shared/product/prd/pt/agno-integration-prd'),
    description: 'Visão de produto, requisitos e roadmap.',
  },
  {
    id: 'adr',
    label: 'ADR-0002 - Agno Framework',
    href: buildDocsUrl(
      'context/backend/architecture/decisions/2025-10-16-adr-0002-agno-framework',
    ),
    description: 'Decisão arquitetural para adoção do Agno.',
  },
  {
    id: 'implementation-guide',
    label: 'Guia de Implementação',
    href: buildDocsUrl('context/backend/guides/agno-agents-guide'),
    description: 'Setup local, variáveis de ambiente e endpoints.',
  },
  {
    id: 'service-map',
    label: 'Service Map (Backend)',
    href: buildDocsUrl('context/backend/architecture/service-map'),
    description: 'Portas padrão, stack e notas operacionais.',
  },
];

// Removed unused static HEALTH_SNIPPETS.

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function AgnoAgentsPage(): JSX.Element {
  // Persist base URL selection in localStorage
  const lsKey = 'agno.baseUrl';
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(lsKey)
          : null;
      return sanitizeBaseUrl(stored || ENV_DEFAULT_BASE_URL);
    } catch {
      return ENV_DEFAULT_BASE_URL;
    }
  });
  const [tmpUrl, setTmpUrl] = useState<string>(baseUrl);
  const [pinging, setPinging] = useState(false);
  const [pingOk, setPingOk] = useState<boolean | null>(null);
  const [pingText, setPingText] = useState<string>('');

  useEffect(() => {
    try {
      window.localStorage.setItem(lsKey, baseUrl);
    } catch {}
  }, [baseUrl]);

  const quickLinks = useMemo(
    () => [
      {
        id: 'open-service',
        label: 'Abrir Agno Agents',
        helper: 'Interface FastAPI raiz do serviço',
        href: baseUrl,
        icon: <Activity className="w-4 h-4" />,
      },
      {
        id: 'swagger',
        label: 'Swagger UI',
        helper: 'Explorar endpoints REST',
        href: `${baseUrl}/docs`,
        icon: <ExternalLink className="w-4 h-4" />,
      },
      {
        id: 'metrics',
        label: 'Prometheus /metrics',
        helper: 'Sinais operacionais e alertas',
        href: `${baseUrl}/metrics`,
        icon: <GaugeCircle className="w-4 h-4" />,
      },
      {
        id: 'health',
        label: 'Health Check detalhado',
        helper: 'Status das dependências externas',
        href: `${baseUrl}/health?detailed=true`,
        icon: <ShieldCheck className="w-4 h-4" />,
      },
    ],
    [baseUrl],
  );

  const healthSnippets = useMemo(
    () => [
      {
        id: 'curl-health',
        title: 'Health check completo',
        command: `curl -s ${baseUrl}/health?detailed=true | jq`,
      },
      {
        id: 'curl-metrics',
        title: 'Exportar métricas Prometheus',
        command: `curl -s ${baseUrl}/metrics | head`,
      },
      {
        id: 'curl-signals',
        title: 'Executar orquestração de sinais',
        command: `curl -X POST ${baseUrl}/api/v1/agents/signals \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{\\n    "action": "ORCHESTRATE",\\n    "data": {\\n      "symbols": ["PETR4", "WINZ25"],\\n      "include_tp_capital": true,\\n      "include_b3": true\\n    }\\n  }' | jq`,
      },
    ],
    [baseUrl],
  );

  const sections = useMemo(
    () => [
      {
        id: 'agno-overview',
        content: (
          <CollapsibleCard cardId="agno-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-sky-500" />
                Agno Multi-Agent Framework
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Serviço Python 3.12 + FastAPI responsável por análise de
                mercado, avaliação de risco e orquestração de sinais.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="outline">
                  {(() => {
                    try {
                      return new URL(baseUrl).host;
                    } catch {
                      return baseUrl;
                    }
                  })()}
                </Badge>
                <Badge variant="outline">LLM opcional</Badge>
                <Badge variant="outline">Prometheus via /metrics</Badge>
                <Badge variant="outline">Circuit breaker + retry</Badge>
              </div>

              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-2">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Base URL do Agno Agents
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                  <Input
                    value={tmpUrl}
                    onChange={(e) => setTmpUrl(e.target.value)}
                    placeholder="http://localhost:8211"
                  />
                  <Button variant="outline" onClick={() => setTmpUrl(baseUrl)}>
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setPinging(true);
                      setPingOk(null);
                      setPingText('');
                      try {
                        const url = sanitizeBaseUrl(tmpUrl);
                        const res = await fetch(`${url}/health`);
                        if (!res.ok) {
                          setPingOk(false);
                          setPingText(`HTTP ${res.status}`);
                        } else {
                          setPingOk(true);
                          setPingText('OK');
                        }
                      } catch (e: any) {
                        setPingOk(false);
                        setPingText(e?.message || 'Network error');
                      } finally {
                        setPinging(false);
                      }
                    }}
                  >
                    Testar
                  </Button>
                  <Button
                    onClick={async () => {
                      setBaseUrl(sanitizeBaseUrl(tmpUrl));
                      // auto-test after saving
                      setPinging(true);
                      setPingOk(null);
                      setPingText('');
                      try {
                        const url = sanitizeBaseUrl(tmpUrl);
                        const res = await fetch(`${url}/health`);
                        if (!res.ok) {
                          setPingOk(false);
                          setPingText(`HTTP ${res.status}`);
                        } else {
                          setPingOk(true);
                          setPingText('OK');
                        }
                      } catch (e: any) {
                        setPingOk(false);
                        setPingText(e?.message || 'Network error');
                      } finally {
                        setPinging(false);
                      }
                    }}
                  >
                    Salvar
                  </Button>
                  <div className="text-xs">
                    {pinging && (
                      <span className="text-slate-500">Testando…</span>
                    )}
                    {!pinging && pingOk === true && (
                      <span className="text-emerald-600">
                        {pingText || 'OK'}
                      </span>
                    )}
                    {!pinging && pingOk === false && (
                      <span className="text-red-600">{pingText || 'Erro'}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Persistido em localStorage (chave{' '}
                  <code className="font-mono">agno.baseUrl</code>).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-sky-500" />
                    Agentes Especializados
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>
                      MarketAnalysisAgent — correlação TP Capital + Workspace.
                    </li>
                    <li>
                      RiskManagementAgent — limites diários, tamanho de posição
                      e horário.
                    </li>
                    <li>
                      SignalOrchestratorAgent — fluxo completo e métricas de
                      decisão.
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Radar className="w-4 h-4 text-emerald-500" />
                    Observabilidade
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>
                      Métricas:{' '}
                      <code className="font-mono text-xs">
                        agent_decisions_total
                      </code>
                      ,{' '}
                      <code className="font-mono text-xs">
                        dependency_status
                      </code>
                      .
                    </li>
                    <li>
                      Health check com cache para modo simples e probes
                      detalhadas sob demanda.
                    </li>
                    <li>
                      Alertas: AgentsDown, ErrorsHigh, DependencyUnhealthy,
                      CircuitBreaker.
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'agno-quick-actions',
        content: (
          <CollapsibleCard cardId="agno-quick-actions">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Ações rápidas
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Acesso direto ao serviço FastAPI, health check, métricas e
                documentação interativa.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        {link.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {link.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {link.helper}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleOpen(link.href)}
                      className="justify-start gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir em nova aba
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'agno-health-snippets',
        content: (
          <CollapsibleCard cardId="agno-health-snippets">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Health check &amp; cURL Snippets
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Comandos prontos para diagnosticar o serviço e executar
                validações ponta-a-ponta.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {healthSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                      <GaugeCircle className="w-4 h-4 text-indigo-500" />
                      {snippet.title}
                    </h4>
                    <pre className="text-xs rounded bg-slate-900 text-slate-100 overflow-x-auto p-3 leading-relaxed">
                      <code>{snippet.command}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'agno-documentation',
        content: (
          <CollapsibleCard cardId="agno-documentation">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-500" />
                Documentação complementar
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Referências oficiais para requisitos, decisão arquitetural e
                guias operacionais do Agno.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-3">
                {DOCUMENTATION_LINKS.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {doc.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {doc.description}
                    </p>
                    <div>
                      <Button
                        variant="ghost"
                        className="gap-2 px-2"
                        onClick={handleOpen(doc.href)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir documento
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'agno-agents-registry',
        content: <AgentsRegistrySection baseUrl={baseUrl} />,
      },
    ],
    [baseUrl, quickLinks, healthSnippets],
  );

  return (
    <CustomizablePageLayout
      pageId="agno-agents"
      title="Agno Agents"
      subtitle="Monitoramento, documentação e atalhos operacionais para o framework multi-agente"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default AgnoAgentsPage;

function AgentsRegistrySection({ baseUrl }: { baseUrl: string }) {
  const { loading, error, agents, refresh } = useAgentsRegistry(baseUrl);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    since: '',
    dry: false,
    model: '',
    maxContext: '',
    noValidate: false,
    outDir: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openRunDialog(agent: AgentDescriptor) {
    if (agent.id !== 'docusaurus-daily') return; // por enquanto apenas docusaurus-daily
    // preencher defaults a partir dos resolved
    const sinceDefault = 'local-midnight';
    const modelDefault = (agent.args || []).find((a) => a.name === 'model')
      ?.resolvedDefault as string | undefined;
    const maxDefault = (agent.args || []).find((a) => a.name === 'maxContext')
      ?.resolvedDefault as number | undefined;
    const outDirDefault = (agent.args || []).find((a) => a.name === 'outDir')
      ?.resolvedDefault as string | undefined;
    setForm({
      since: sinceDefault,
      dry: false,
      model: modelDefault || '',
      maxContext: maxDefault ? String(maxDefault) : '',
      noValidate: false,
      outDir: outDirDefault || '',
    });
    setResult(null);
    setErrorMsg(null);
    setOpenId(agent.id);
  }

  async function submitRun() {
    if (openId !== 'docusaurus-daily') return;
    setSubmitting(true);
    setResult(null);
    setErrorMsg(null);
    try {
      const payload: any = {
        dry: !!form.dry,
        noValidate: !!form.noValidate,
      };
      if (form.since && form.since !== 'local-midnight')
        payload.since = form.since;
      if (form.model) payload.model = form.model;
      if (form.maxContext) payload.maxContext = Number(form.maxContext);
      if (form.outDir) payload.outDir = form.outDir;
      const res = await fetch(`${baseUrl}/api/v1/agents/docs/daily/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = await res.json();
      setResult(data?.report_file || 'Executado com sucesso.');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Falha ao executar agente');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CollapsibleCard cardId="agno-agents-registry" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle className="flex items-center gap-2">
          <ListTree className="w-4 h-4 text-sky-500" />
          Agentes (manifests e argumentos)
        </CollapsibleCardTitle>
        <CollapsibleCardDescription>
          Lista dos agentes locais com papel, instruções, variáveis e
          argumentos.
        </CollapsibleCardDescription>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {loading && (
          <div className="text-sm text-slate-500">Carregando agentes…</div>
        )}
        {error && (
          <div className="text-sm text-red-600 flex flex-col gap-2">
            <div>Erro: {error}</div>
            <div className="text-slate-600 dark:text-slate-400">
              Verifique se o serviço está acessível em{' '}
              <code className="font-mono">{baseUrl}</code> e a CORS permite{' '}
              <code className="font-mono">http://localhost:3103</code>.
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={refresh}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
        {!loading && !error && agents.length === 0 && (
          <div className="text-sm text-slate-500">
            Nenhum agente encontrado.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {agent.name}{' '}
                    <span className="text-slate-500 text-xs">({agent.id})</span>
                  </div>
                  {agent.role && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {agent.role}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {agent.runtime && (
                    <Badge variant="outline">{agent.runtime}</Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => openRunDialog(agent)}
                    disabled={agent.id !== 'docusaurus-daily'}
                    className="gap-2"
                    title={
                      agent.id !== 'docusaurus-daily'
                        ? 'Execução por UI disponível inicialmente apenas para docusaurus-daily'
                        : 'Executar agora'
                    }
                  >
                    <Rocket className="w-4 h-4" />
                    Executar agora
                  </Button>
                </div>
              </div>

              {agent.instructions && (
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {agent.instructions}
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {agent.entry && (
                  <div>
                    <span className="font-mono">entry:</span> {agent.entry}
                  </div>
                )}
                {agent.env && agent.env.length > 0 && (
                  <div className="mt-1">
                    <span className="font-mono">env:</span>{' '}
                    {agent.env.join(', ')}
                  </div>
                )}
              </div>

              {agent.args && agent.args.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Argumentos
                  </div>
                  <div className="space-y-1">
                    {agent.args.map((a) => (
                      <div
                        key={a.name}
                        className="text-xs text-slate-700 dark:text-slate-300 flex flex-col border border-slate-100 dark:border-slate-800 rounded p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">--{a.name}</span>
                          <Badge variant="outline">{a.type}</Badge>
                        </div>
                        {a.description && (
                          <div className="text-slate-500 mt-1">
                            {a.description}
                          </div>
                        )}
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {'default' in a && (
                            <div className="text-slate-500">
                              <span className="font-mono">default:</span>{' '}
                              <span className="break-all">
                                {String(a.default)}
                              </span>
                            </div>
                          )}
                          {'resolvedDefault' in a &&
                            a.resolvedDefault !== undefined && (
                              <div className="text-slate-500">
                                <span className="font-mono">resolved:</span>{' '}
                                <span className="break-all">
                                  {String(a.resolvedDefault)}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Dialog
          open={!!openId}
          onOpenChange={(v) => {
            if (!v) setOpenId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Executar agente</DialogTitle>
              <DialogDescription>
                Preencha os parâmetros (deixe em branco para usar defaults).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">since</label>
                  <Input
                    value={form.since}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, since: e.target.value }))
                    }
                    placeholder="local-midnight ou 2025-10-27 00:00"
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox
                    checked={form.dry}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, dry: !!v }))
                    }
                  />
                  <span className="text-xs text-slate-600">
                    dry (não escreve arquivos)
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500">model</label>
                  <Input
                    value={form.model}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, model: e.target.value }))
                    }
                    placeholder="ex.: llama3.1:8b"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">maxContext</label>
                  <Input
                    type="number"
                    value={form.maxContext}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxContext: e.target.value }))
                    }
                    placeholder="ex.: 20000"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.noValidate}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, noValidate: !!v }))
                    }
                  />
                  <span className="text-xs text-slate-600">noValidate</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500">outDir</label>
                  <Input
                    value={form.outDir}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, outDir: e.target.value }))
                    }
                    placeholder="docs/content/reports/daily"
                  />
                </div>
              </div>
              {errorMsg && (
                <div className="text-sm text-red-600">{errorMsg}</div>
              )}
              {result && (
                <div className="text-sm text-emerald-600 break-all">
                  {result}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenId(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button onClick={submitRun} disabled={submitting}>
                {submitting ? 'Executando…' : 'Executar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
