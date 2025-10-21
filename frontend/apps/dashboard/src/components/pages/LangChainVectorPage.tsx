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
import { apiConfig } from '../../config/api';
import { Boxes, Database, ExternalLink, Shield, Activity, Code, Gauge } from 'lucide-react';
import { DatabaseEmbedFrame } from './database/DatabaseEmbedFrame';

const DEFAULT_QDRANT_HTTP = 'http://localhost:6333';
const DEFAULT_QDRANT_GRPC = 'http://localhost:6334';

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

const resolveHttpUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return sanitize(env.VITE_QDRANT_URL || env.VITE_VECTOR_STORE_URL, DEFAULT_QDRANT_HTTP);
};

const resolveGrpcUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return sanitize(env.VITE_QDRANT_GRPC_URL, DEFAULT_QDRANT_GRPC);
};

const QDRANT_HTTP_URL = resolveHttpUrl();
const QDRANT_GRPC_URL = resolveGrpcUrl();

const buildDocsUrl = (relativePath: string) => {
  const normalizedBase = apiConfig.docsUrl.replace(/\/$/, '');
  const docsBase = normalizedBase.endsWith('/docs') ? normalizedBase : `${normalizedBase}/docs`;
  const normalizedPath = relativePath.replace(/^\//, '').replace(/\.md$/, '');
  return `${docsBase}/${normalizedPath}`;
};

const DOCUMENTATION_LINKS = [
  {
    id: 'directory-structure',
    label: 'AI & ML Tools Overview',
    description: 'Mapa geral dos serviços LangChain (LangGraph, LlamaIndex, Qdrant).',
    href: buildDocsUrl('DIRECTORY-STRUCTURE#ai-ml-tools'),
  },
  {
    id: 'deployment-guide',
    label: 'LlamaIndex Deployment Guide',
    description: 'Detalhes de configuração e operação para o vector store e serviços RAG.',
    href: buildDocsUrl('infrastructure/llamaindex/DEPLOYMENT'),
  },
];

const CLI_SNIPPETS = [
  {
    id: 'list-collections',
    title: 'Listar collections disponíveis',
    command: `curl -s ${QDRANT_HTTP_URL}/collections | jq`,
  },
  {
    id: 'create-collection',
    title: 'Criar nova collection',
    command: `curl -s -X PUT ${QDRANT_HTTP_URL}/collections/trading-insights \\
  -H 'Content-Type: application/json' \\
  -d '{\n    "vectors": {\n      "size": 1536,\n      "distance": "Cosine"\n    }\n  }' | jq`,
  },
  {
    id: 'search-vector',
    title: 'Executar busca vetorial (top 3)',
    command: `curl -s -X POST ${QDRANT_HTTP_URL}/collections/trading-insights/points/search \\
  -H 'Content-Type: application/json' \\
  -d '{\n    "vector": [0.1, 0.2, 0.3, ...],\n    "limit": 3\n  }' | jq`,
  },
];

function handleOpen(url: string) {
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

export function LangChainVectorPage(): JSX.Element {
  const sections = useMemo(
    () => [
      {
        id: 'vector-overview',
        content: (
          <CollapsibleCard cardId="vector-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-sky-600" />
                Qdrant Vector Store
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Camada de persistência vetorial utilizada pelos fluxos LangChain / LlamaIndex.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">HTTP {QDRANT_HTTP_URL}</Badge>
                <Badge variant="outline">gRPC {QDRANT_GRPC_URL}</Badge>
                <Badge variant="outline">Docker compose profile: ai-tools</Badge>
                <Badge variant="outline">Replication ready</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Principais coleções
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>
                      <code className="font-mono text-xs">trading-insights</code> – embeddings de sinais e contexto de mercado.
                    </li>
                    <li>
                      <code className="font-mono text-xs">docs-snippets</code> – trechos indexados para enriquecimento de documentos.
                    </li>
                    <li>
                      <code className="font-mono text-xs">workspace-ideas</code> – ideias priorizadas para suporte ao Agno Agents.
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Boas práticas
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Ativar API key e TLS em produção (variáveis QDRANT__SERVICE__*).</li>
                    <li>Realizar backups periódicos do volume <code className="font-mono text-xs">qdrant_data</code>.</li>
                    <li>Monitorar métricas de latência e cardinalidade via Prometheus.</li>
                  </ul>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'vector-access',
        content: (
          <CollapsibleCard cardId="vector-access">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-600" />
                Acesso rápido
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Links para APIs e endpoints principais do Qdrant.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <Boxes className="w-4 h-4 text-sky-600" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">API REST</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Endpoints para CRUD de embeddings e busca vetorial.</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleOpen(QDRANT_HTTP_URL)} className="justify-start gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Abrir API
                  </Button>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <Code className="w-4 h-4 text-emerald-600" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">gRPC Endpoint</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ideal para alto desempenho com SDKs oficiais.</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleOpen(QDRANT_GRPC_URL)} className="justify-start gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Abrir documentação
                  </Button>
                </div>
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'vector-docs',
        content: (
          <CollapsibleCard cardId="vector-docs">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Documentação & operações
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Referências oficiais e guias de operação do stack LangChain vector store.
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
        id: 'vector-cli-snippets',
        content: (
          <CollapsibleCard cardId="vector-cli-snippets">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Snippets CLI
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Comandos úteis para gerenciamento e troubleshooting do Qdrant.
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
        id: 'vector-dashboard',
        content: (
          <CollapsibleCard cardId="vector-dashboard" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-sky-600" />
                Qdrant Dashboard
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Interface nativa do Qdrant (localhost:6333/dashboard) para inspecionar collections e pontos.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <DatabaseEmbedFrame
                url={`${QDRANT_HTTP_URL}/dashboard`}
                title="Qdrant Dashboard"
                openLabel="Abrir em aba separada"
                iframeTitle="Qdrant Dashboard"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
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
      pageId="langchain-vector-page"
      title="LangChain Vector Store (Qdrant)"
      subtitle="Centralize links e operações do banco vetorial utilizado pelos fluxos LangChain/LlamaIndex."
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default LangChainVectorPage;
