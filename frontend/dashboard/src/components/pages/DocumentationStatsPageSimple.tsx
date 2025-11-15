import { useState, useEffect } from "react";
import { RefreshCw, Server, Lightbulb, FileText, TrendingUp } from "@/icons";
import documentationService from "../../services/documentationService";

interface DocumentationStatsPayload {
  systems?: {
    total?: number;
    online_count?: number;
    by_status?: Record<string, number>;
  };
  ideas?: {
    total?: number;
    completion_rate?: number;
    by_status?: Record<string, number>;
    by_category?: Record<string, number>;
    by_priority?: Record<string, number>;
  };
  files?: {
    total?: number;
    total_size_mb?: number;
  };
}

export default function DocumentationStatsPageSimple() {
  const [stats, setStats] = useState<DocumentationStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await documentationService.getStatistics();
      if (response.success) {
        setStats(response.data);
      } else {
        setError("Failed to load statistics");
      }
    } catch (err) {
      setError((err as Error).message);
      console.error("Error loading statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleRefresh = () => {
    void loadStats();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Documentation Statistics
          </h1>
          <p className="text-gray-500 mt-2">
            Analytics and insights for documentation systems and ideas
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Systems Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Total Systems
            </span>
            <Server className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.systems?.total || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.systems?.online_count || 0} online
          </p>
        </div>

        {/* Ideas Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Total Ideas
            </span>
            <Lightbulb className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.ideas?.total || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.ideas?.by_status?.in_progress || 0} in progress
          </p>
        </div>

        {/* Files Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Total Files
            </span>
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.files?.total || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.files?.total_size_mb?.toFixed(2) || 0} MB
          </p>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Completion Rate
            </span>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {stats.ideas?.completion_rate !== undefined
              ? `${(stats.ideas.completion_rate * 100).toFixed(0)}%`
              : "N/A"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.ideas?.by_status?.done || 0} completed
          </p>
        </div>
      </div>

      {/* Systems by Status */}
      {stats.systems?.by_status && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Systems by Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.systems.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      status === "online"
                        ? "bg-green-500"
                        : status === "offline"
                          ? "bg-red-500"
                          : status === "degraded"
                            ? "bg-orange-500"
                            : "bg-yellow-500"
                    }`}
                  />
                  <span className="text-sm capitalize">{status}</span>
                </div>
                <span className="text-sm font-semibold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ideas by Status */}
      {stats.ideas?.by_status && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Ideas by Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.ideas.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      status === "done"
                        ? "bg-green-500"
                        : status === "in_progress"
                          ? "bg-blue-500"
                          : status === "cancelled"
                            ? "bg-red-500"
                            : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm capitalize">
                    {status.replace("_", " ")}
                  </span>
                </div>
                <span className="text-sm font-semibold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ideas by Category */}
      {stats.ideas?.by_category && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Ideas by Category</h2>
          <div className="space-y-3">
            {Object.entries(stats.ideas.by_category).map(
              ([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm capitalize">{category}</span>
                  <span className="text-sm font-semibold">
                    {count as number}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Ideas by Priority */}
      {stats.ideas?.by_priority && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Ideas by Priority</h2>
          <div className="space-y-3">
            {Object.entries(stats.ideas.by_priority).map(
              ([priority, count]) => (
                <div
                  key={priority}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        priority === "high"
                          ? "bg-red-500"
                          : priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                      }`}
                    />
                    <span className="text-sm capitalize">{priority}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {count as number}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
