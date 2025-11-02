import { useState, useEffect } from 'react';
import { RefreshCw, Server, Plus } from 'lucide-react';
import documentationService, {
  System,
} from '../../services/documentationService';

export default function DocumentationSystemsPageSimple() {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSystems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await documentationService.getSystems();
      if (response.success) {
        setSystems(response.data);
      } else {
        setError('Failed to load systems');
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading systems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSystems();
  }, []);

  const handleRefresh = () => {
    void loadSystems();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'degraded':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Documentation Systems
          </h1>
          <p className="text-gray-500 mt-2">
            Manage all documentation systems and their configurations
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : systems.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No systems found
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first documentation system
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Create System
          </button>
        </div>
      ) : (
        /* Systems Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systems.map((system) => (
            <div
              key={system.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server
                    className="h-6 w-6"
                    style={{ color: system.color || '#3b82f6' }}
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{system.name}</h3>
                    {system.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {system.description}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
                    system.status,
                  )}`}
                >
                  {system.status || 'unknown'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {system.url && (
                  <div>
                    <span className="text-gray-500">URL:</span>{' '}
                    <a
                      href={system.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {system.url}
                    </a>
                  </div>
                )}
                {system.port && (
                  <div>
                    <span className="text-gray-500">Port:</span>{' '}
                    <span className="font-mono">{system.port}</span>
                  </div>
                )}
                {system.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {system.tags.split(',').map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Edit
                </button>
                <button className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {!loading && systems.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>{systems.length}</strong> systems total
          </div>
          <div className="text-sm text-gray-600">
            <strong>
              {systems.filter((s) => s.status === 'online').length}
            </strong>{' '}
            online
          </div>
        </div>
      )}
    </div>
  );
}
