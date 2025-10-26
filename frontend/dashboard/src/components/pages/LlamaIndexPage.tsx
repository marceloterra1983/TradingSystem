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
import { Activity, BookOpen, Boxes, ExternalLink, GaugeCircle, ShieldCheck, Workflow } from 'lucide-react';
import { DatabaseEmbedFrame } from './database/DatabaseEmbedFrame';
import { buildDocsUrl } from '../../lib/docsUrl';

const DEFAULT_QUERY_URL = 'http://localhost:3450';
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

interface QuickLink {
  id: string;
  label: string;
  helper: string;
  href: string;
  icon: JSX.Element;
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'query-root',
    label: 'Query Service API',
    helper: 'Endpoint principal para consultas RAG (FastAPI)',
    href: QUERY_BASE_URL,
    icon: <Workflow className="w-4 h-4 text-sky-600" />,
  },
  {
    id: 'query-swagger',
    label: 'Swagger /docs',
    helper: 'Explore endpoints REST do serviço de consultas',
    href: `${QUERY_BASE_URL}/docs`,
    icon: <ExternalLink className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'query-health',
    label: 'Health Check (Query)',
    helper: 'Status do serviço de consultas e dependências',
    href: `${QUERY_BASE_URL}/health`,
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'qdrant-dashboard',
    label: 'Qdrant API',
    helper: 'Vector store utilizado pelo LangChain / LlamaIndex',
    href: QDRANT_BASE_URL,
    icon: <Boxes className="w-4 h-4 text-amber-600" />,
  },
];

const DOCUMENTATION_LINKS = [
  {
    id: 'implementation-plan',
    label: 'LlamaIndex Implementation Plan',
    description: 'Roadmap completo, integrações e arquitetura RAG.',
    href: buildDocsUrl('context/shared/product/plans/llamaindex-implementation-plan'),
  },
  {
    id: 'infra-deployment',
    label: 'Infrastructure LlamaIndex DEPLOYMENT',
    description: 'Guia operacional para serviços de ingestion e query.',
    href: buildDocsUrl('infrastructure/llamaindex/DEPLOYMENT'),
  },
];

const CLI_SNIPPETS = [
  {
    id: 'query-health',
    title: 'Verificar saúde do Query Service',
    command: `curl -s ${QUERY_BASE_URL}/health | jq`,
  },
  {
    id: 'ingestion-health',
    title: 'Checar saúde do Ingestion Service (docker exec)',
    command: `docker exec infra-llamaindex_ingestion curl -s http://localhost:8000/health | jq`,
  },
  {
    id: 'list-collections',
    title: 'Listar collections no Qdrant',
    command: `curl -s ${QDRANT_BASE_URL}/collections | jq`,
  },
];

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function LlamaIndexPage(): JSX.Element {
  const sections = useMemo(
    () => [
      {
        id: 'llamaindex-overview',
        content: (
          <CollapsibleCard cardId="llamaindex-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-sky-600" />
                LlamaIndex RAG Services
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Infraestrutura de Retrieval-Augmented Generation integrada ao LangChain, com ingestão assíncrona e exposição REST.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Query: porta 3450</Badge>
                <Badge variant="outline">Ingestion: porta interna 8000</Badge>
                <Badge variant="outline">Qdrant: portas 6333/6334</Badge>
                <Badge variant="outline">OpenAI (LLM opcional)</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Fluxo de consultas
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Endpoint REST (`/query`) retorna contexto enriquecido + resposta.</li>
                    <li>Integração direta com LangGraph e Agno Agents para decisões.</li>
                    <li>Suporte a cache, rate limiting e logging estruturado.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <GaugeCircle className="w-4 h-4 text-emerald-500" />
                    Observabilidade e segurança
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Métricas Prometheus na porta 8000 (ingestion) e 8000/metrics.</li>
                    <li>JWT opcional para proteger endpoints externos.</li>
                    <li>APIs com logs enriquecidos e suporte a tracing futuro.</li>
                  </ul>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'llamaindex-actions',
        content: (
          <CollapsibleCard cardId="llamaindex-actions">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Acesso rápido
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Interfaces expostas para consulta, documentação e health-check do stack LangChain/LlamaIndex.
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
        id: 'llamaindex-docs',
        content: (
          <CollapsibleCard cardId="llamaindex-docs">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Documentação e suporte
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Consulte guias de implementação, roadmap e detalhes operacionais.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-3">
                {DOCUMENTATION_LINKS.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{item.description}</p>
                    <Button variant="outline" onClick={handleOpen(item.href)} className="gap-2">
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
        id: 'llamaindex-cli',
        content: (
          <CollapsibleCard cardId="llamaindex-cli">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Snippets CLI
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Comandos para troubleshooting, health checks e inspeção do vector store.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                {CLI_SNIPPETS.map((snippet) => (
                  <div key={snippet.id} className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{snippet.title}</p>
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
        id: 'llamaindex-swagger',
        content: (
          <CollapsibleCard cardId="llamaindex-swagger" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                Query API (Swagger UI)
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Teste requisições do serviço de consultas LlamaIndex sem sair do dashboard.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <DatabaseEmbedFrame
                url={`${QUERY_BASE_URL}/docs`}
                title="LlamaIndex Swagger UI"
                openLabel="Abrir em aba separada"
                iframeTitle="LlamaIndex Swagger UI"
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ],
    []
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
