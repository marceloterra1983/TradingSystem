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
  Globe,
  Server,
} from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  fullUrl?: string;
}

interface ServiceEndpoints {
  name: string;
  baseUrl: string;
  icon: typeof Server;
  color: string;
  endpoints: Endpoint[];
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const SERVICES_ENDPOINTS: ServiceEndpoints[] = [
  // Service Launcher API
  {
    name: 'Service Launcher API',
    baseUrl: 'http://localhost:3500',
    icon: Server,
    color: 'text-blue-600 dark:text-blue-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check endpoint' },
      { method: 'GET', path: '/api/status', description: 'Get all services status' },
      { method: 'POST', path: '/launch', description: 'Launch a service in terminal' },
      { method: 'GET', path: '/circuit-breaker', description: 'Get circuit breaker stats' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  
  // Workspace API
  {
    name: 'Workspace API',
    baseUrl: 'http://localhost:3200',
    icon: Server,
    color: 'text-cyan-600 dark:text-cyan-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check endpoint' },
      { method: 'GET', path: '/api/items', description: 'List all workspace items' },
      { method: 'POST', path: '/api/items', description: 'Create a new workspace item' },
      { method: 'PUT', path: '/api/items/:id', description: 'Update an existing workspace item' },
      { method: 'DELETE', path: '/api/items/:id', description: 'Delete a workspace item' },
      { method: 'GET', path: '/api/prds/:language', description: 'Get PRD by language (en/pt)' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  
  // TP Capital API
  {
    name: 'TP Capital API',
    baseUrl: 'http://localhost:3201',
    icon: Server,
    color: 'text-orange-600 dark:text-orange-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check with QuestDB status' },
      { method: 'GET', path: '/signals', description: 'Get trading signals from QuestDB' },
      { method: 'DELETE', path: '/signals', description: 'Delete all signals (maintenance)' },
      { method: 'GET', path: '/logs', description: 'Get ingestion logs (limit via query)' },
      { method: 'GET', path: '/bots', description: 'List configured Telegram bots' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  
  // B3 Market Data API
  {
    name: 'B3 Market Data API',
    baseUrl: 'http://localhost:3302',
    icon: Server,
    color: 'text-green-600 dark:text-green-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check endpoint' },
      { method: 'GET', path: '/overview', description: 'Market overview and summary' },
      { method: 'GET', path: '/adjustments', description: 'Daily adjustments data' },
      { method: 'GET', path: '/vol-surface', description: 'Volatility surface data' },
      { method: 'GET', path: '/indicators/daily', description: 'Daily indicators' },
      { method: 'GET', path: '/gamma-levels', description: 'Gamma exposure levels' },
      { method: 'GET', path: '/dxy', description: 'Dollar Index (DXY) data' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  
  // Documentation API
  {
    name: 'Documentation API',
    baseUrl: 'http://localhost:3400',
    icon: Server,
    color: 'text-purple-600 dark:text-purple-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check with index stats' },
      { method: 'GET', path: '/docs', description: 'ReDoc API documentation UI' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
  
  // Firecrawl Proxy API
  {
    name: 'Firecrawl Proxy API',
    baseUrl: 'http://localhost:3600',
    icon: Server,
    color: 'text-pink-600 dark:text-pink-400',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check with Firecrawl status' },
      { method: 'POST', path: '/api/v1/scrape', description: 'Scrape a single URL' },
      { method: 'POST', path: '/api/v1/crawl', description: 'Crawl multiple pages' },
      { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
    ],
  },
];

export function EndpointsSection() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('all');

  const handleCopy = (fullUrl: string) => {
    void navigator.clipboard.writeText(fullUrl);
    setCopiedEndpoint(fullUrl);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const filteredServices = selectedService === 'all'
    ? SERVICES_ENDPOINTS
    : SERVICES_ENDPOINTS.filter(s => s.name === selectedService);

  const totalEndpoints = SERVICES_ENDPOINTS.reduce((sum, service) => sum + service.endpoints.length, 0);

  return (
    <CollapsibleCard cardId="launcher-endpoints">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CollapsibleCardTitle>API Endpoints</CollapsibleCardTitle>
          </div>
          <CollapsibleCardDescription>
            All available REST API endpoints across services
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
                  Distribuídos em {SERVICES_ENDPOINTS.length} serviços
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {Object.entries(METHOD_COLORS).map(([method, colorClass]) => {
                  const count = SERVICES_ENDPOINTS.reduce(
                    (sum, service) =>
                      sum + service.endpoints.filter((e) => e.method === method).length,
                    0
                  );
                  return (
                    <div key={method} className="text-center">
                      <span className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${colorClass}`}>
                        {method}
                      </span>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Service Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedService('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedService === 'all'
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              All Services ({SERVICES_ENDPOINTS.length})
            </button>
            {SERVICES_ENDPOINTS.map((service) => (
              <button
                key={service.name}
                onClick={() => setSelectedService(service.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedService === service.name
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {service.name.replace(' API', '')} ({service.endpoints.length})
              </button>
            ))}
          </div>

          {/* Endpoints List */}
          <div className="space-y-6">
            {filteredServices.map((service) => (
              <div
                key={service.name}
                className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <service.icon className={`h-5 w-5 ${service.color}`} />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {service.name}
                    </h3>
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

                <div className="space-y-2">
                  {service.endpoints.map((endpoint, idx) => {
                    const fullUrl = `${service.baseUrl}${endpoint.path}`;
                    const isCopied = copiedEndpoint === fullUrl;

                    return (
                      <div
                        key={idx}
                        className="group flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              METHOD_COLORS[endpoint.method]
                            }`}
                          >
                            {endpoint.method}
                          </span>
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
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}









