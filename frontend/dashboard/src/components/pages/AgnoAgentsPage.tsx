import { useMemo } from 'react';
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
import { Activity, BrainCircuit, BookOpen, ExternalLink, GaugeCircle, Radar, ShieldCheck, Workflow } from 'lucide-react';
import { apiConfig } from '../../config/api';

const DEFAULT_AGNO_BASE_URL = 'http://localhost:8200';

const sanitizeBaseUrl = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') {
    return DEFAULT_AGNO_BASE_URL;
  }
  return value.replace(/\/+$/, '') || DEFAULT_AGNO_BASE_URL;
};

const AGNO_BASE_URL = sanitizeBaseUrl(import.meta.env.VITE_AGNO_AGENTS_URL);

const buildDocsUrl = (relativePath: string) => {
  const normalizedBase = apiConfig.docsUrl.replace(/\/$/, '');
  const docsBase = normalizedBase.endsWith('/docs') ? normalizedBase : `${normalizedBase}/docs`;
  const normalizedPath = relativePath.replace(/^\//, '').replace(/\.md$/, '');
  return `${docsBase}/${normalizedPath}`;
};

const QUICK_LINKS = [
  {
    id: 'open-service',
    label: 'Abrir Agno Agents',
    helper: 'Interface FastAPI raiz do serviço',
    href: AGNO_BASE_URL,
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'swagger',
    label: 'Swagger UI',
    helper: 'Explorar endpoints REST',
    href: `${AGNO_BASE_URL}/docs`,
    icon: <ExternalLink className="w-4 h-4" />,
  },
  {
    id: 'metrics',
    label: 'Prometheus /metrics',
    helper: 'Sinais operacionais e alertas',
    href: `${AGNO_BASE_URL}/metrics`,
    icon: <GaugeCircle className="w-4 h-4" />,
  },
  {
    id: 'health',
    label: 'Health Check detalhado',
    helper: 'Status das dependências externas',
    href: `${AGNO_BASE_URL}/health?detailed=true`,
    icon: <ShieldCheck className="w-4 h-4" />,
  },
];

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
    href: buildDocsUrl('context/backend/architecture/decisions/2025-10-16-adr-0002-agno-framework'),
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

const HEALTH_SNIPPETS = [
  {
    id: 'curl-health',
    title: 'Health check completo',
    command: `curl -s ${AGNO_BASE_URL}/health?detailed=true | jq`,
  },
  {
    id: 'curl-metrics',
    title: 'Exportar métricas Prometheus',
    command: `curl -s ${AGNO_BASE_URL}/metrics | head`,
  },
  {
    id: 'curl-signals',
    title: 'Executar orquestração de sinais',
    command: `curl -X POST ${AGNO_BASE_URL}/api/v1/agents/signals \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "ORCHESTRATE",
    "data": {
      "symbols": ["PETR4", "WINZ25"],
      "include_tp_capital": true,
      "include_b3": true
    }
  }' | jq`,
  },
];

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function AgnoAgentsPage(): JSX.Element {
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
                Serviço Python 3.12 + FastAPI responsável por análise de mercado, avaliação de risco e orquestração de sinais.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="outline">Porta 8200</Badge>
                <Badge variant="outline">LLM opcional</Badge>
                <Badge variant="outline">Prometheus via /metrics</Badge>
                <Badge variant="outline">Circuit breaker + retry</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-sky-500" />
                    Agentes Especializados
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>MarketAnalysisAgent — correlação B3 + TP Capital + Workspace.</li>
                    <li>RiskManagementAgent — limites diários, tamanho de posição e horário.</li>
                    <li>SignalOrchestratorAgent — fluxo completo e métricas de decisão.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Radar className="w-4 h-4 text-emerald-500" />
                    Observabilidade
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Métricas: <code className="font-mono text-xs">agent_decisions_total</code>, <code className="font-mono text-xs">dependency_status</code>.</li>
                    <li>Health check com cache para modo simples e probes detalhadas sob demanda.</li>
                    <li>Alertas: AgentsDown, ErrorsHigh, DependencyUnhealthy, CircuitBreaker.</li>
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
                Acesso direto ao serviço FastAPI, health check, métricas e documentação interativa.
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
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{link.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{link.helper}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={handleOpen(link.href)} className="justify-start gap-2">
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
                Comandos prontos para diagnosticar o serviço e executar validações ponta-a-ponta.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HEALTH_SNIPPETS.map((snippet) => (
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
                Referências oficiais para requisitos, decisão arquitetural e guias operacionais do Agno.
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
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{doc.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{doc.description}</p>
                    <div>
                      <Button variant="ghost" className="gap-2 px-2" onClick={handleOpen(doc.href)}>
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
    ],
    []
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
