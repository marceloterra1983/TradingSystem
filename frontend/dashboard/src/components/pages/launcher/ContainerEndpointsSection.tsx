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
  ExternalLink,
  Copy,
  Check,
  Container,
  Database,
  BarChart3,
  Brain,
  FileText,
} from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiEndpoint {
  method?: HttpMethod;
  path: string;
  description: string;
}

interface ContainerService {
  name: string;
  baseUrl: string;
  description: string;
  category: 'data' | 'monitoring' | 'ai' | 'docs' | 'infrastructure';
  type: 'web-ui' | 'api' | 'both';
  ports: string[];
  endpoints: ApiEndpoint[];
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PATCH:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

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
  infrastructure: {
    label: 'Infrastructure',
    icon: Container,
    bgClass: 'bg-gray-100 dark:bg-gray-900/30',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
};

const CONTAINER_SERVICES: ContainerService[] = [
  // Data Services
  {
    name: 'QuestDB',
    baseUrl: 'http://localhost:9000',
    description: 'High-performance time-series database',
    category: 'data',
    type: 'both',
    ports: ['9000', '9009', '8812', '9003'],
    endpoints: [
      { path: '/', description: 'Web Console UI' },
      { method: 'GET', path: '/exec', description: 'Execute SQL query' },
      { method: 'POST', path: '/imp', description: 'Import CSV data' },
      { method: 'GET', path: '/exp', description: 'Export query results' },
      { path: ':9009', description: 'InfluxDB Line Protocol (ILP) ingestion' },
      { path: ':8812', description: 'PostgreSQL wire protocol' },
    ],
  },
  {
    name: 'QuestDB (Infrastructure)',
    baseUrl: 'http://localhost:9002',
    description: 'Secondary QuestDB instance for infrastructure metrics',
    category: 'data',
    type: 'both',
    ports: ['9002', '9010', '8813'],
    endpoints: [
      { path: '/', description: 'Web Console UI' },
      { method: 'GET', path: '/exec', description: 'Execute SQL query' },
      { path: ':9010', description: 'InfluxDB Line Protocol (ILP)' },
      { path: ':8813', description: 'PostgreSQL wire protocol' },
    ],
  },
  {
    name: 'TimescaleDB',
    baseUrl: 'postgresql://localhost:5433',
    description: 'PostgreSQL-based time-series database',
    category: 'data',
    type: 'api',
    ports: ['5433'],
    endpoints: [
      { path: ':5433', description: 'PostgreSQL connection (pgwire)' },
    ],
  },
  {
    name: 'pgAdmin',
    baseUrl: 'http://localhost:5050',
    description: 'PostgreSQL/TimescaleDB web administration',
    category: 'data',
    type: 'web-ui',
    ports: ['5050'],
    endpoints: [
      { path: '/', description: 'Dashboard and server management' },
      { path: '/browser/', description: 'Database browser' },
      { path: '/tools/query', description: 'Query tool' },
    ],
  },
  {
    name: 'pgweb',
    baseUrl: 'http://localhost:8081',
    description: 'Lightweight PostgreSQL web client',
    category: 'data',
    type: 'web-ui',
    ports: ['8081'],
    endpoints: [
      { path: '/', description: 'Query interface' },
      { method: 'GET', path: '/api/info', description: 'Database info' },
      { method: 'POST', path: '/api/query', description: 'Execute query' },
    ],
  },
  {
    name: 'PostgreSQL (Infrastructure)',
    baseUrl: 'postgresql://localhost:5432',
    description: 'PostgreSQL for infrastructure services',
    category: 'data',
    type: 'api',
    ports: ['5432'],
    endpoints: [
      { path: ':5432', description: 'PostgreSQL connection (pgwire)' },
    ],
  },

  // Monitoring Services
  {
    name: 'Prometheus',
    baseUrl: 'http://localhost:9090',
    description: 'Metrics collection and time-series database',
    category: 'monitoring',
    type: 'both',
    ports: ['9090'],
    endpoints: [
      { path: '/', description: 'Web UI and Graph Explorer' },
      {
        method: 'GET',
        path: '/api/v1/query',
        description: 'Instant query (PromQL)',
      },
      {
        method: 'GET',
        path: '/api/v1/query_range',
        description: 'Range query (PromQL)',
      },
      {
        method: 'GET',
        path: '/api/v1/series',
        description: 'List time series',
      },
      {
        method: 'GET',
        path: '/api/v1/labels',
        description: 'List label names',
      },
      {
        method: 'GET',
        path: '/api/v1/targets',
        description: 'Active scrape targets',
      },
      {
        method: 'GET',
        path: '/api/v1/rules',
        description: 'Alert and recording rules',
      },
      { method: 'GET', path: '/api/v1/alerts', description: 'Active alerts' },
    ],
  },
  {
    name: 'Grafana',
    baseUrl: 'http://localhost:3000',
    description: 'Metrics visualization and dashboards',
    category: 'monitoring',
    type: 'web-ui',
    ports: ['3000'],
    endpoints: [
      { path: '/', description: 'Home dashboard' },
      { path: '/dashboards', description: 'Dashboard browser' },
      { path: '/explore', description: 'Data exploration' },
      {
        method: 'GET',
        path: '/api/dashboards/home',
        description: 'Home dashboard API',
      },
      { method: 'GET', path: '/api/search', description: 'Search dashboards' },
      {
        method: 'POST',
        path: '/api/datasources/proxy/:id/api/v1/query',
        description: 'Proxy Prometheus query',
      },
    ],
  },
  {
    name: 'AlertManager',
    baseUrl: 'http://localhost:9093',
    description: 'Alert management and routing',
    category: 'monitoring',
    type: 'both',
    ports: ['9093'],
    endpoints: [
      { path: '/', description: 'Web UI' },
      {
        method: 'GET',
        path: '/api/v2/alerts',
        description: 'List active alerts',
      },
      { method: 'POST', path: '/api/v2/alerts', description: 'Create alert' },
      { method: 'GET', path: '/api/v2/silences', description: 'List silences' },
      {
        method: 'POST',
        path: '/api/v2/silences',
        description: 'Create silence',
      },
      {
        method: 'GET',
        path: '/api/v2/status',
        description: 'AlertManager status',
      },
    ],
  },
  {
    name: 'Alert Router',
    baseUrl: 'http://localhost:8080',
    description: 'Custom alert routing service',
    category: 'monitoring',
    type: 'api',
    ports: ['8080'],
    endpoints: [
      {
        method: 'POST',
        path: '/webhook',
        description: 'Receive alerts webhook',
      },
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  {
    name: 'TimescaleDB Exporter',
    baseUrl: 'http://localhost:9187',
    description: 'Prometheus exporter for TimescaleDB metrics',
    category: 'monitoring',
    type: 'api',
    ports: ['9187'],
    endpoints: [
      {
        method: 'GET',
        path: '/metrics',
        description: 'Prometheus metrics endpoint',
      },
    ],
  },

  // AI/ML Services
  {
    name: 'LangGraph',
    baseUrl: 'http://localhost:8111',
    description: 'LangChain workflow orchestration',
    category: 'ai',
    type: 'both',
    ports: ['8111'],
    endpoints: [
      { path: '/', description: 'Studio UI' },
      { method: 'POST', path: '/invoke', description: 'Invoke workflow' },
      { method: 'GET', path: '/threads', description: 'List threads' },
      { method: 'POST', path: '/threads/:id', description: 'Create thread' },
      {
        method: 'GET',
        path: '/threads/:id/state',
        description: 'Get thread state',
      },
    ],
  },
  {
    name: 'Agno Agents',
    baseUrl: 'http://localhost:8200',
    description: 'Multi-agent framework',
    category: 'ai',
    type: 'both',
    ports: ['8200'],
    endpoints: [
      { path: '/', description: 'Dashboard UI' },
      { method: 'GET', path: '/health', description: 'Health check' },
      {
        method: 'POST',
        path: '/api/agents/execute',
        description: 'Execute agent task',
      },
      { method: 'GET', path: '/api/agents', description: 'List agents' },
      { method: 'GET', path: '/api/tasks', description: 'List tasks' },
      { method: 'GET', path: '/api/metrics', description: 'Agent metrics' },
    ],
  },
  {
    name: 'LlamaIndex Query',
    baseUrl: 'http://localhost:3450',
    description: 'RAG query service',
    category: 'ai',
    type: 'api',
    ports: ['3450'],
    endpoints: [
      { method: 'POST', path: '/query', description: 'Query documents (RAG)' },
      {
        method: 'GET',
        path: '/indexes',
        description: 'List available indexes',
      },
      { method: 'GET', path: '/health', description: 'Health check' },
    ],
  },
  {
    name: 'Qdrant',
    baseUrl: 'http://localhost:6333',
    description: 'Vector database',
    category: 'ai',
    type: 'both',
    ports: ['6333', '6334'],
    endpoints: [
      { path: '/', description: 'Web UI Dashboard' },
      { method: 'GET', path: '/collections', description: 'List collections' },
      {
        method: 'POST',
        path: '/collections/{name}',
        description: 'Create collection',
      },
      {
        method: 'PUT',
        path: '/collections/{name}/points',
        description: 'Upsert points (vectors)',
      },
      {
        method: 'POST',
        path: '/collections/{name}/points/search',
        description: 'Search similar vectors',
      },
      {
        method: 'GET',
        path: '/collections/{name}/points/{id}',
        description: 'Get point by ID',
      },
      { path: ':6334', description: 'gRPC API (high-performance)' },
    ],
  },

  // Documentation Services
  {
    name: 'DocsSPECS',
    baseUrl: 'http://localhost:3001',
    description: 'OpenAPI/AsyncAPI specifications viewer',
    category: 'docs',
    type: 'web-ui',
    ports: ['3001'],
    endpoints: [
      { path: '/', description: 'Swagger UI' },
      { path: '/redoc', description: 'ReDoc UI' },
      {
        method: 'GET',
        path: '/openapi.json',
        description: 'OpenAPI specification',
      },
    ],
  },
];

export function ContainerEndpointsSection() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredServices =
    selectedCategory === 'all'
      ? CONTAINER_SERVICES
      : CONTAINER_SERVICES.filter((s) => s.category === selectedCategory);

  const totalEndpoints = CONTAINER_SERVICES.reduce(
    (sum, service) => sum + service.endpoints.length,
    0,
  );
  const webUiCount = CONTAINER_SERVICES.filter(
    (s) => s.type === 'web-ui' || s.type === 'both',
  ).length;
  const apiCount = CONTAINER_SERVICES.filter(
    (s) => s.type === 'api' || s.type === 'both',
  ).length;

  return (
    <CollapsibleCard cardId="launcher-container-endpoints">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <CollapsibleCardTitle>Container Endpoints</CollapsibleCardTitle>
          </div>
          <CollapsibleCardDescription>
            REST APIs and Web UIs exposed by Docker containers
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {totalEndpoints} endpoints disponíveis
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {CONTAINER_SERVICES.length} serviços • {webUiCount} Web UIs •{' '}
                  {apiCount} APIs
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {Object.entries(METHOD_COLORS).map(([method, colorClass]) => {
                  const count = CONTAINER_SERVICES.reduce(
                    (sum, service) =>
                      sum +
                      service.endpoints.filter((e) => e.method === method)
                        .length,
                    0,
                  );
                  return (
                    <div key={method} className="text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${colorClass}`}
                      >
                        {method}
                      </span>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {count}
                      </p>
                    </div>
                  );
                })}
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
              All Services ({CONTAINER_SERVICES.length})
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = CONTAINER_SERVICES.filter(
                (s) => s.category === key,
              ).length;
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

          {/* Services List */}
          <div className="space-y-6">
            {filteredServices.map((service) => {
              const categoryMeta = CATEGORY_META[service.category];

              return (
                <div
                  key={service.name}
                  className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <categoryMeta.icon
                        className={`h-5 w-5 ${categoryMeta.textClass}`}
                      />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {service.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({service.endpoints.length} endpoints)
                      </span>
                    </div>
                    <a
                      href={service.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {service.baseUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    {service.description} • Ports: {service.ports.join(', ')}
                  </p>

                  <div className="space-y-2">
                    {service.endpoints.map((endpoint, idx) => {
                      const fullUrl = endpoint.path.startsWith(':')
                        ? `${service.baseUrl.replace(/:\d+$/, '')}${endpoint.path}`
                        : `${service.baseUrl}${endpoint.path}`;
                      const isCopied = copiedUrl === fullUrl;

                      return (
                        <div
                          key={idx}
                          className="group flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                        >
                          <div className="flex flex-1 items-center gap-3">
                            {endpoint.method && (
                              <span
                                className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                  METHOD_COLORS[endpoint.method]
                                }`}
                              >
                                {endpoint.method}
                              </span>
                            )}
                            <code className="flex-1 text-xs text-gray-700 dark:text-gray-300">
                              {endpoint.path}
                            </code>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {endpoint.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopy(fullUrl)}
                              title="Copy full URL"
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            {!endpoint.path.startsWith(':') && (
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
