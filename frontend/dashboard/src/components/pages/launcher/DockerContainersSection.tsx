import { useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Container,
  ExternalLink,
  Database,
  Activity,
  BarChart3,
  Brain,
  FileText,
  Box,
  Globe,
} from 'lucide-react';

interface DockerContainer {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  category: 'data' | 'monitoring' | 'ai' | 'docs' | 'infrastructure' | 'firecrawl';
  description: string;
  ports?: string[];
  url?: string;
}

const DOCKER_CONTAINERS: DockerContainer[] = [
  // Data Services
  {
    name: 'data-questdb',
    status: 'running',
    category: 'data',
    description: 'QuestDB (AI telemetry)',
    ports: ['9002', '9010', '8813'],
    url: 'http://localhost:9002',
  },
  {
    name: 'data-frontend-apps',
    status: 'running',
    category: 'data',
    description: 'PostgreSQL for frontend applications',
    ports: ['5444'],
  },
  {
    name: 'data-timescaledb',
    status: 'running',
    category: 'data',
    description: 'TimescaleDB (PostgreSQL time-series)',
    ports: ['5433'],
  },
  {
    name: 'data-timescaledb-pgadmin',
    status: 'running',
    category: 'data',
    description: 'pgAdmin (TimescaleDB UI)',
    ports: ['5050'],
    url: 'http://localhost:5050',
  },
  {
    name: 'data-timescaledb-pgweb',
    status: 'running',
    category: 'data',
    description: 'pgweb (Lightweight PostgreSQL client)',
    ports: ['8081'],
    url: 'http://localhost:8081',
  },
  {
    name: 'data-postgress-langgraph',
    status: 'running',
    category: 'data',
    description: 'PostgreSQL (Infrastructure)',
    ports: ['5432'],
  },
  
  // Monitoring Services
  {
    name: 'mon-prometheus',
    status: 'running',
    category: 'monitoring',
    description: 'Prometheus metrics collector',
    ports: ['9090'],
    url: 'http://localhost:9090',
  },
  {
    name: 'mon-grafana',
    status: 'running',
    category: 'monitoring',
    description: 'Grafana dashboards',
    ports: ['3000'],
    url: 'http://localhost:3000',
  },
  {
    name: 'mon-alertmanager',
    status: 'running',
    category: 'monitoring',
    description: 'Alert Manager',
    ports: ['9093'],
    url: 'http://localhost:9093',
  },
  {
    name: 'mon-alert-router',
    status: 'running',
    category: 'monitoring',
    description: 'Alert Router',
    ports: ['8080'],
    url: 'http://localhost:8080',
  },
  {
    name: 'data-timescaledb-exporter',
    status: 'running',
    category: 'monitoring',
    description: 'TimescaleDB Prometheus Exporter',
    ports: ['9187'],
  },
  
  // AI Services
  {
    name: 'infra-langgraph',
    status: 'running',
    category: 'ai',
    description: 'LangGraph orchestrator',
    ports: ['8111'],
    url: 'http://localhost:8111',
  },
  {
    name: 'infra-agno-agents',
    status: 'running',
    category: 'ai',
    description: 'Agno multi-agent framework',
    ports: ['8200'],
    url: 'http://localhost:8200',
  },
  {
    name: 'infra-llamaindex-query',
    status: 'running',
    category: 'ai',
    description: 'LlamaIndex Query Service',
    ports: ['3450'],
    url: 'http://localhost:3450',
  },
  {
    name: 'infra-llamaindex-ingestion',
    status: 'running',
    category: 'ai',
    description: 'LlamaIndex Ingestion Service',
  },
  {
    name: 'data-qdrant',
    status: 'running',
    category: 'ai',
    description: 'Qdrant vector database',
    ports: ['6333', '6334'],
    url: 'http://localhost:6333',
  },
  
  // Documentation Services (2-container architecture)
  {
    name: 'documentation',
    status: 'running',
    category: 'docs',
    description: 'NGINX serving static Docusaurus + OpenAPI/AsyncAPI specs',
    ports: ['3400'],
    url: 'http://localhost:3400',
  },
  {
    name: 'docs-api',
    status: 'running',
    category: 'docs',
    description: 'DocsAPI (Express + FlexSearch) - Search, validation, CRUD',
    ports: ['3401'],
    url: 'http://localhost:3401/health',
  },
  
  // Firecrawl Services
  {
    name: 'firecrawl-api',
    status: 'running',
    category: 'firecrawl',
    description: 'Main Firecrawl API service for web scraping',
    ports: ['3002'],
    url: 'http://localhost:3002',
  },
  {
    name: 'firecrawl-playwright',
    status: 'running',
    category: 'firecrawl',
    description: 'Browser automation service (Playwright)',
    ports: ['3000'],
  },
  {
    name: 'firecrawl-redis',
    status: 'running',
    category: 'firecrawl',
    description: 'Redis cache for queue management',
    ports: ['6379'],
  },
  {
    name: 'firecrawl-postgres',
    status: 'running',
    category: 'firecrawl',
    description: 'Internal PostgreSQL database',
  },
  
  // Application Services
  // Infrastructure Services
  {
    name: 'data-timescaledb-backup',
    status: 'running',
    category: 'infrastructure',
    description: 'TimescaleDB backup service',
  },
  {
    name: 'infra-langgraph-dev',
    status: 'running',
    category: 'infrastructure',
    description: 'LangGraph dev environment with Studio integration',
    ports: ['8112'],
    url: 'http://localhost:8112',
  },
  {
    name: 'infra-redis-dev',
    status: 'running',
    category: 'infrastructure',
    description: 'Redis for LangGraph dev environment',
    ports: ['6380'],
  },
  {
    name: 'infra-postgres-dev',
    status: 'running',
    category: 'infrastructure',
    description: 'PostgreSQL for LangGraph dev environment',
    ports: ['5443'],
  },
];

const CATEGORY_META = {
  data: {
    label: 'Data',
    icon: Database,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  monitoring: {
    label: 'Monitoring',
    icon: BarChart3,
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  ai: {
    label: 'AI/ML',
    icon: Brain,
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    textClass: 'text-pink-700 dark:text-pink-300',
  },
  docs: {
    label: 'Docs',
    icon: FileText,
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    textClass: 'text-teal-700 dark:text-teal-300',
  },
  firecrawl: {
    label: 'Firecrawl',
    icon: Globe,
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  infrastructure: {
    label: 'Infrastructure',
    icon: Box,
    bgClass: 'bg-gray-100 dark:bg-gray-900/30',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
} as const;

type Category = keyof typeof CATEGORY_META;

const STATUS_META = {
  running: {
    label: 'Running',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle,
  },
  stopped: {
    label: 'Stopped',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-gray-400',
    textClass: 'text-gray-500 dark:text-gray-400',
    icon: Activity,
  },
};

export function DockerContainersSection() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | Category>('all');

  const categoryEntries = Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][];

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const filteredContainers = selectedCategory === 'all'
    ? DOCKER_CONTAINERS
    : DOCKER_CONTAINERS.filter(c => c.category === selectedCategory);

  const runningCount = DOCKER_CONTAINERS.filter(c => c.status === 'running').length;
  const stoppedCount = DOCKER_CONTAINERS.filter(c => c.status === 'stopped').length;

  return (
    <CollapsibleCard cardId="launcher-docker-containers">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CollapsibleCardTitle>Docker Containers</CollapsibleCardTitle>
          </div>
          <CollapsibleCardDescription>
            Infrastructure, databases, monitoring and AI services
          </CollapsibleCardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Atualizar status dos containers"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {runningCount} containers ativos
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stoppedCount > 0 ? `${stoppedCount} parados` : 'Todos os containers operacionais'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300 md:grid-cols-3">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Total</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {DOCKER_CONTAINERS.length}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Running</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {runningCount}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Stopped</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {stoppedCount}
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              All ({DOCKER_CONTAINERS.length})
            </button>
            {categoryEntries.map(([key, meta]) => {
              const count = DOCKER_CONTAINERS.filter(c => c.category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === key
                      ? `${meta.bgClass} ${meta.textClass}`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <meta.icon className="h-3 w-3" />
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Container List */}
          <div className="space-y-3">
            {filteredContainers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum container nesta categoria.
              </p>
            ) : (
              filteredContainers.map((container) => {
                const statusMeta = STATUS_META[container.status];
                const categoryMeta = CATEGORY_META[container.category];

                return (
                  <div
                    key={container.name}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <Container className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {container.name}
                          </p>
                          {container.url && container.status === 'running' ? (
                            <a
                              href={container.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              title={`Abrir ${container.name}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
                          {container.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${categoryMeta.bgClass} ${categoryMeta.textClass}`}>
                            <categoryMeta.icon className="h-3 w-3" />
                            {categoryMeta.label}
                          </span>
                          {container.ports && container.ports.length > 0 ? (
                            <span className="text-gray-500 dark:text-gray-400">
                              Ports: {container.ports.join(', ')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`} />
                      <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}







