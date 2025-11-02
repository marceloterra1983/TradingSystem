import { useMemo } from 'react';
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
import {
  Activity,
  BrainCircuit,
  ExternalLink,
  Gauge,
  Network,
  Server,
  Workflow,
} from 'lucide-react';
import { DatabaseEmbedFrame } from './database/DatabaseEmbedFrame';
import { buildDocsUrl } from '../../lib/docsUrl';

const DEFAULT_LANGGRAPH_URL = 'http://localhost:8111';

const sanitizeBaseUrl = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') {
    return DEFAULT_LANGGRAPH_URL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_LANGGRAPH_URL;
  }
  return trimmed.replace(/\/+$/, '') || DEFAULT_LANGGRAPH_URL;
};

const resolveLangGraphUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return sanitizeBaseUrl(
    env.VITE_LANGGRAPH_URL ||
      env.VITE_LANGGRAPH_BASE_URL ||
      env.VITE_LANGCHAIN_URL ||
      DEFAULT_LANGGRAPH_URL,
  );
};

const LANGGRAPH_BASE_URL = resolveLangGraphUrl();

interface QuickLink {
  id: string;
  label: string;
  helper: string;
  href: string;
  icon: JSX.Element;
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'open-langgraph',
    label: 'Abrir LangGraph API',
    helper: 'Endpoint raiz com metadados do serviço',
    href: LANGGRAPH_BASE_URL,
    icon: <Workflow className="w-4 h-4 text-sky-600" />,
  },
  {
    id: 'swagger-ui',
    label: 'Swagger / FastAPI Docs',
    helper: 'Documentação interativa dos endpoints',
    href: `${LANGGRAPH_BASE_URL}/docs`,
    icon: <ExternalLink className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'metrics',
    label: 'Prometheus /metrics',
    helper: 'Coleta de métricas de workflows e dependências',
    href: `${LANGGRAPH_BASE_URL}/metrics`,
    icon: <Gauge className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'health',
    label: 'Health Check detalhado',
    helper: 'Status das integrações Agno, DocsAPI, Firecrawl',
    href: `${LANGGRAPH_BASE_URL}/health`,
    icon: <Activity className="w-4 h-4 text-amber-600" />,
  },
];

const DOCUMENTATION_LINKS = [
  {
    id: 'guide',
    label: 'LangGraph Implementation Guide',
    description: 'Setup, pipelines e observabilidade completa.',
    href: buildDocsUrl('context/backend/guides/langgraph-implementation-guide'),
  },
  {
    id: 'infra-readme',
    label: 'Infrastructure LangGraph README',
    description: 'Arquitetura, variáveis de ambiente e quick start.',
    href: buildDocsUrl('infrastructure/langgraph/README'),
  },
];

const CLI_SNIPPETS = [
  {
    id: 'health-cli',
    title: 'Verificar status das dependências',
    command: `curl -s ${LANGGRAPH_BASE_URL}/health | jq`,
  },
  {
    id: 'metrics-cli',
    title: 'Exportar métricas Prometheus',
    command: `curl -s ${LANGGRAPH_BASE_URL}/metrics | head`,
  },
  {
    id: 'run-workflow',
    title: 'Executar workflow de trading (paper mode)',
    command: `curl -s -X POST ${LANGGRAPH_BASE_URL}/workflows/trading/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "execution_mode": "paper",
    "symbols": ["WINZ25", "PETR4"],
    "parameters": {
      "include_tp_capital": true,
      "include_workspace": true
    }
  }' | jq`,
  },
];

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function LangGraphPage(): JSX.Element {
  const sections = useMemo(
    () => [
      {
        id: 'langgraph-overview',
        content: (
          <CollapsibleCard cardId="langgraph-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-sky-600" />
                LangGraph Orchestrator
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                State machine determinística para workflows de trading e
                documentação com persistência e telemetria.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Porta 8111</Badge>
                <Badge variant="outline">FastAPI + LangGraph</Badge>
                <Badge variant="outline">PostgreSQL checkpoints</Badge>
                <Badge variant="outline">QuestDB eventos</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-sky-500" />
                    Workflows disponíveis
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>
                      <strong>Trading:</strong> análise → risco → execução (modo
                      paper/live).
                    </li>
                    <li>
                      <strong>Docs:</strong> review e enrichment integrados ao
                      DocsAPI + Firecrawl.
                    </li>
                    <li>
                      Suporte a idempotência, rollback e checkpoints por etapa.
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-500" />
                    Dependências críticas
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Agno Agents (8200) – análise de mercado e risco.</li>
                    <li>
                      DocsAPI (3400) e Firecrawl Proxy (3600) – fluxo de
                      documentação.
                    </li>
                    <li>
                      PostgreSQL / QuestDB para persistência e telemetria.
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'langgraph-quick-actions',
        content: (
          <CollapsibleCard cardId="langgraph-quick-actions">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                Acesso rápido
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Abra as interfaces expostas pelo serviço LangGraph e monitore
                dependências em segundos.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {QUICK_LINKS.map((link) => (
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
        id: 'langgraph-docs',
        content: (
          <CollapsibleCard cardId="langgraph-docs">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-600" />
                Documentação & suporte
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Guias oficiais, ADRs e materiais de operação do LangGraph.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-3">
                {DOCUMENTATION_LINKS.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.label}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {item.description}
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleOpen(item.href)}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir documentação
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'langgraph-cli-snippets',
        content: (
          <CollapsibleCard cardId="langgraph-cli-snippets">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Snippets CLI úteis
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Comandos prontos para validação, observabilidade e execução de
                workflows.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                {CLI_SNIPPETS.map((snippet) => (
                  <div key={snippet.id} className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {snippet.title}
                    </p>
                    <pre className="bg-slate-900/90 text-slate-50 text-xs p-3 rounded-lg overflow-x-auto">
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
        id: 'langgraph-swagger',
        content: (
          <CollapsibleCard cardId="langgraph-swagger" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                API Explorer (Swagger)
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Explore e teste os endpoints FastAPI diretamente no dashboard.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <DatabaseEmbedFrame
                url={`${LANGGRAPH_BASE_URL}/docs`}
                title="LangGraph Swagger UI"
                openLabel="Abrir em aba separada"
                iframeTitle="LangGraph Swagger UI"
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ],
    [],
  );

  return (
    <CustomizablePageLayout
      pageId="langgraph-page"
      title="LangGraph Orchestrator"
      subtitle="Gerencie workflows multi-agente, health checks e observabilidade do serviço LangGraph (LangChain)."
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default LangGraphPage;
