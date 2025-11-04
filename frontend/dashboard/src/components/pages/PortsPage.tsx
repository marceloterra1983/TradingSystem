import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/card';

// ============================================================================
// Types
// ============================================================================

interface PortInfo {
  port: number;
  internalPort: number | null;
  externalPort: number;
  frontendPort: number | null;
  frontendPath: string | null;
  service: {
    id: string;
    name: string;
    description: string;
    category: string;
  };
  status: 'healthy' | 'unhealthy' | 'unknown';
  health: {
    isHealthy: boolean;
    responseTimeMs: number;
    lastChecked: string;
  };
  urls: {
    health: string;
    base: string;
    frontend: string | null;
  };
}

interface CategoryStats {
  total: number;
  healthy: number;
  unhealthy: number;
}

interface PortsResponse {
  success: boolean;
  timestamp: string;
  durationMs: number;
  stats: {
    total: number;
    healthy: number;
    unhealthy: number;
    byCategory: Record<string, CategoryStats>;
  };
  ports: PortInfo[];
}

// ============================================================================
// API Service
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_SERVICE_LAUNCHER_URL || 'http://localhost:3500';

async function fetchPorts(): Promise<PortsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ports`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ports: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// Utility Functions
// ============================================================================

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    api: 'text-blue-400',
    ui: 'text-purple-400',
    docs: 'text-indigo-400',
    monitoring: 'text-orange-400',
    data: 'text-green-400',
    messaging: 'text-pink-400',
    'ai-tools': 'text-cyan-400',
    internal: 'text-gray-400',
  };
  return colors[category] || 'text-gray-400';
}

function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    api: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ui: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    docs: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    monitoring: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    data: 'bg-green-500/20 text-green-400 border-green-500/30',
    messaging: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'ai-tools': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    internal: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function formatResponseTime(ms: number): string {
  if (ms < 100) return `${ms}ms`;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatLastChecked(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return date.toLocaleTimeString();
}

// ============================================================================
// Components
// ============================================================================

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color = 'text-gray-400' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string; 
  color?: string;
}) {
  return (
    <Card className="bg-[color:var(--ts-surface-default)] border-[color:var(--ts-surface-border)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-sm text-[color:var(--ts-text-muted)]">{label}</span>
          </div>
          <div className={cn('text-2xl font-bold', color)}>{value}</div>
          {trend && (
            <div className="text-xs text-[color:var(--ts-text-muted)] mt-1">
              {trend}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CategoryCard({ 
  category, 
  stats 
}: { 
  category: string; 
  stats: CategoryStats;
}) {
  const healthPercentage = stats.total > 0 
    ? Math.round((stats.healthy / stats.total) * 100) 
    : 0;
  
  return (
    <Card className="bg-[color:var(--ts-surface-default)] border-[color:var(--ts-surface-border)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          'px-2.5 py-1 rounded-md text-xs font-medium border capitalize',
          getCategoryBadgeColor(category)
        )}>
          {category}
        </span>
        <span className="text-sm text-[color:var(--ts-text-muted)]">
          {stats.healthy}/{stats.total}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-[color:var(--ts-surface-muted)] rounded-full h-2 mb-2">
        <div 
          className={cn(
            'h-2 rounded-full transition-all duration-500',
            healthPercentage === 100 ? 'bg-green-500' : 
            healthPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${healthPercentage}%` }}
        />
      </div>
      
      <div className="text-xs text-[color:var(--ts-text-muted)]">
        {healthPercentage}% healthy
      </div>
    </Card>
  );
}

type SortField = 'status' | 'port' | 'name' | 'category' | 'responseTime';
type SortDirection = 'asc' | 'desc';

function PortsTable({ ports }: { ports: PortInfo[] }) {
  const [sortField, setSortField] = React.useState<SortField>('port');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[color:var(--ts-accent-strong)]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[color:var(--ts-accent-strong)]" />
    );
  };

  // Sort ports based on current field and direction
  const sortedPorts = React.useMemo(() => {
    const sorted = [...ports].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'status':
          aValue = a.health.isHealthy ? 1 : 0;
          bValue = b.health.isHealthy ? 1 : 0;
          break;
        case 'port':
          aValue = a.port;
          bValue = b.port;
          break;
        case 'name':
          aValue = a.service.name.toLowerCase();
          bValue = b.service.name.toLowerCase();
          break;
        case 'category':
          aValue = a.service.category.toLowerCase();
          bValue = b.service.category.toLowerCase();
          break;
        case 'responseTime':
          aValue = a.health.responseTimeMs;
          bValue = b.health.responseTimeMs;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [ports, sortField, sortDirection]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--ts-surface-border)]">
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)] cursor-pointer hover:bg-[color:var(--ts-surface-hover)] transition-colors select-none"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center gap-2">
                Status
                <SortIcon field="status" />
              </div>
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)] cursor-pointer hover:bg-[color:var(--ts-surface-hover)] transition-colors select-none"
              onClick={() => handleSort('port')}
            >
              <div className="flex items-center gap-2">
                Port Externa (Host)
                <SortIcon field="port" />
              </div>
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)]">
              Port Interna (Container)
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)]">
              Port Frontend (Proxy)
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)] cursor-pointer hover:bg-[color:var(--ts-surface-hover)] transition-colors select-none"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-2">
                Service
                <SortIcon field="name" />
              </div>
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)] cursor-pointer hover:bg-[color:var(--ts-surface-hover)] transition-colors select-none"
              onClick={() => handleSort('category')}
            >
              <div className="flex items-center gap-2">
                Category
                <SortIcon field="category" />
              </div>
            </th>
            <th 
              className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)] cursor-pointer hover:bg-[color:var(--ts-surface-hover)] transition-colors select-none"
              onClick={() => handleSort('responseTime')}
            >
              <div className="flex items-center gap-2">
                Response Time
                <SortIcon field="responseTime" />
              </div>
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)]">
              Last Checked
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[color:var(--ts-text-primary)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPorts.map((port) => (
            <tr
              key={port.port}
              className={cn(
                'border-b border-[color:var(--ts-surface-border)]',
                'hover:bg-[color:var(--ts-surface-hover)] transition-colors'
              )}
            >
              {/* Status */}
              <td className="py-3 px-4">
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                  port.health.isHealthy 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                )}>
                  {port.health.isHealthy ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {port.health.isHealthy ? 'Healthy' : 'Down'}
                </div>
              </td>

              {/* External Port */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-12 h-8 rounded-lg bg-[color:var(--ts-accent-soft)]">
                    <span className="text-sm font-bold text-[color:var(--ts-accent-strong)]">
                      {port.externalPort}
                    </span>
                  </div>
                </div>
              </td>

              {/* Internal Port */}
              <td className="py-3 px-4">
                {port.internalPort ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-12 h-8 rounded-lg bg-gray-500/20">
                      <span className="text-sm font-medium text-[color:var(--ts-text-muted)]">
                        {port.internalPort}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--ts-text-muted)] italic">
                    N/A
                  </span>
                )}
              </td>

              {/* Frontend Port */}
              <td className="py-3 px-4">
                {port.frontendPort ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-12 h-8 rounded-lg bg-purple-500/20">
                        <span className="text-sm font-medium text-purple-400">
                          {port.frontendPort}
                        </span>
                      </div>
                    </div>
                    {port.frontendPath && (
                      <span className="text-xs text-[color:var(--ts-text-muted)] font-mono">
                        {port.frontendPath}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--ts-text-muted)] italic">
                    Direct
                  </span>
                )}
              </td>

              {/* Service */}
              <td className="py-3 px-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Server className={cn('h-4 w-4', getCategoryColor(port.service.category))} />
                    <span className="font-semibold text-sm text-[color:var(--ts-text-primary)]">
                      {port.service.name}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--ts-text-muted)] ml-6">
                    {port.service.description}
                  </div>
                </div>
              </td>

              {/* Category */}
              <td className="py-3 px-4">
                <span className={cn(
                  'inline-flex px-2 py-1 rounded-md text-xs font-medium border capitalize',
                  getCategoryBadgeColor(port.service.category)
                )}>
                  {port.service.category}
                </span>
              </td>

              {/* Response Time */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[color:var(--ts-text-muted)]" />
                  <span className="text-sm text-[color:var(--ts-text-primary)]">
                    {formatResponseTime(port.health.responseTimeMs)}
                  </span>
                </div>
              </td>

              {/* Last Checked */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[color:var(--ts-text-muted)]" />
                  <span className="text-sm text-[color:var(--ts-text-muted)]">
                    {formatLastChecked(port.health.lastChecked)}
                  </span>
                </div>
              </td>

              {/* Actions */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <a
                    href={port.urls.base}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 text-xs text-[color:var(--ts-accent-strong)]',
                      'hover:underline'
                    )}
                    title="Open Service"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={port.urls.health}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 text-xs text-[color:var(--ts-text-muted)]',
                      'hover:text-[color:var(--ts-text-primary)]'
                    )}
                    title="Health Endpoint"
                  >
                    <Activity className="h-3.5 w-3.5" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PortsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<PortsResponse>({
    queryKey: ['ports'],
    queryFn: fetchPorts,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 3000,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--ts-accent-strong)] mx-auto mb-3" />
          <p className="text-sm text-[color:var(--ts-text-muted)]">
            Loading port information...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="bg-[color:var(--ts-surface-default)] border-[color:var(--ts-surface-border)] p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[color:var(--ts-text-primary)] mb-1">
                Failed to Load Ports
              </h3>
              <p className="text-sm text-[color:var(--ts-text-muted)] mb-3">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
              <button
                onClick={() => refetch()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-[color:var(--ts-accent-soft)] text-[color:var(--ts-accent-strong)]',
                  'hover:bg-[color:var(--ts-accent-soft)] transition-colors'
                )}
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, ports } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ts-text-primary)] mb-1">
            Ports Overview
          </h1>
          <p className="text-sm text-[color:var(--ts-text-muted)]">
            Real-time monitoring of all TradingSystem service ports
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[color:var(--ts-text-muted)]">
          <Activity className="h-4 w-4 animate-pulse text-green-400" />
          Auto-refreshing every 5s
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Total Services"
          value={stats.total}
          color="text-blue-400"
        />
        <StatCard
          icon={CheckCircle}
          label="Healthy Services"
          value={stats.healthy}
          trend={`${Math.round((stats.healthy / stats.total) * 100)}% uptime`}
          color="text-green-400"
        />
        <StatCard
          icon={XCircle}
          label="Unhealthy Services"
          value={stats.unhealthy}
          color="text-red-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Query Time"
          value={`${data.durationMs}ms`}
          color="text-purple-400"
        />
      </div>

      {/* Category Stats */}
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--ts-text-primary)] mb-3">
          By Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats.byCategory).map(([category, categoryStats]) => (
            <CategoryCard
              key={category}
              category={category}
              stats={categoryStats}
            />
          ))}
        </div>
      </div>

      {/* Ports List */}
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--ts-text-primary)] mb-3">
          All Services ({ports.length})
        </h2>
        <Card className="bg-[color:var(--ts-surface-default)] border-[color:var(--ts-surface-border)]">
          <PortsTable ports={ports} />
        </Card>
      </div>

      {/* Footer Timestamp */}
      <div className="text-center text-xs text-[color:var(--ts-text-muted)] pt-4 border-t border-[color:var(--ts-surface-border)]">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

