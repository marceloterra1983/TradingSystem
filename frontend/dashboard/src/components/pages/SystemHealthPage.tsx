/**
 * System Health Dashboard Page
 *
 * Displays comprehensive health status for all TradingSystem services,
 * infrastructure components, and dependencies.
 *
 * Part of: Phase 1.7 - Health Checks (Improvement Plan v1.0)
 */

import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  Wifi,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
} from "@/icons";

// Types
interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  responseTime?: number;
}

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  endpoint: string;
  version?: string;
  uptime?: number;
  timestamp: string;
  checks?: Record<string, HealthCheck>;
  responseTime?: number;
}

interface SystemHealthResponse {
  overallHealth: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: ServiceHealth[];
  infrastructure: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

// Status badge component
function StatusBadge({
  status,
}: {
  status: "healthy" | "degraded" | "unhealthy";
}) {
  const config = {
    healthy: {
      icon: CheckCircle2,
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-300",
      label: "Degraded",
    },
    unhealthy: {
      icon: AlertCircle,
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      label: "Unhealthy",
    },
  };

  const { icon: Icon, bg, text, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// Service card component
function ServiceCard({ service }: { service: ServiceHealth }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {service.name}
            </h3>
            {service.version && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                v{service.version}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4" />
            Endpoint
          </span>
          <a
            href={service.endpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
          >
            {service.endpoint}
          </a>
        </div>

        {service.responseTime && (
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Response Time
            </span>
            <span className="text-xs font-medium">
              {service.responseTime}ms
            </span>
          </div>
        )}

        {service.uptime && (
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              Uptime
            </span>
            <span className="text-xs font-medium">
              {formatUptime(service.uptime)}
            </span>
          </div>
        )}
      </div>

      {service.checks && Object.keys(service.checks).length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {expanded ? "Hide" : "Show"} dependency checks
            <span className="text-xs">
              ({Object.keys(service.checks).length})
            </span>
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              {Object.entries(service.checks).map(([name, check]) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {name}
                  </span>
                  <div className="flex items-center gap-2">
                    {check.responseTime && (
                      <span className="text-gray-500">
                        {check.responseTime}ms
                      </span>
                    )}
                    <StatusBadge status={check.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main component
export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health data
  const fetchHealth = async () => {
    try {
      setError(null);
      const response = await fetch("/api/health/system");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealth(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch health data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Export health report
  const exportReport = () => {
    if (!health) return;

    const blob = new Blob([JSON.stringify(health, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">
            Loading system health...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Failed to load system health
          </h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            System Health
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time monitoring of all services and infrastructure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>

          <button
            onClick={fetchHealth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={exportReport}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Overall status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Overall Status
          </h2>
          <StatusBadge status={health.overallHealth} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {health.summary.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Services
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
              {health.summary.healthy}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Healthy
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mb-1">
              {health.summary.degraded}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Degraded
            </div>
          </div>

          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">
              {health.summary.unhealthy}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Unhealthy
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(health.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Services */}
      {health.services.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Application Services ({health.services.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {health.services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>
      )}

      {/* Infrastructure */}
      {health.infrastructure.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Infrastructure ({health.infrastructure.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {health.infrastructure.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
