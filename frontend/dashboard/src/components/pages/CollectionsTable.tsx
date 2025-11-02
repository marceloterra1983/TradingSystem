import { useState, useEffect } from 'react';

interface Collection {
  name: string;
  displayName: string;
  embeddingModel: string;
  dimensions: number;
  description: string;
  source: string;
  enabled: boolean;
  priority: number;
  exists: boolean;
  count: number | null;
  status: 'ready' | 'empty' | 'not_created';
  metadata: {
    modelSize: string;
    language: string;
    optimizedFor: string;
  };
}

interface CollectionsResponse {
  success: boolean;
  defaultCollection: string;
  collections: Collection[];
  aliases: Record<string, string>;
  totalConfigured: number;
  totalExisting: number;
}

interface CollectionsTableProps {
  onSelectCollection?: (collectionName: string) => void;
  selectedCollection?: string;
}

export function CollectionsTable({
  onSelectCollection,
  selectedCollection,
}: CollectionsTableProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultCollection, setDefaultCollection] = useState<string>('');

  useEffect(() => {
    fetchCollections();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchCollections, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/v1/rag/collections');
      const data: CollectionsResponse = await response.json();

      if (data.success) {
        setCollections(data.collections);
        setDefaultCollection(data.defaultCollection);
        setError(null);
      } else {
        setError('Failed to load collections');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Ready
          </span>
        );
      case 'empty':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            ⚠ Empty
          </span>
        );
      case 'not_created':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            ○ Not Created
          </span>
        );
      default:
        return null;
    }
  };

  const formatCount = (count: number | null): string => {
    if (count === null) return '—';
    if (count === 0) return '0';
    return count.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading collections...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading collections
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Collections
          </div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {collections.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ready
          </div>
          <div className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-400">
            {collections.filter((c) => c.status === 'ready').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Chunks
          </div>
          <div className="mt-1 text-3xl font-semibold text-blue-600 dark:text-blue-400">
            {collections
              .reduce((sum, c) => sum + (c.count || 0), 0)
              .toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            across all collections
          </div>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Collection
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Model
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Dimensions
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Chunks
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {collections.map((collection) => (
                <tr
                  key={collection.name}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedCollection === collection.name
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {collection.displayName}
                          {collection.name === defaultCollection && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {collection.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {collection.metadata.optimizedFor}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {collection.embeddingModel}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {collection.metadata.modelSize}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {collection.dimensions}d
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`text-lg font-bold ${
                          collection.count && collection.count > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {formatCount(collection.count)}
                      </div>
                      {collection.count && collection.count > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          chunks
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(collection.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {collection.status === 'ready' && onSelectCollection && (
                      <button
                        onClick={() => onSelectCollection(collection.name)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          selectedCollection === collection.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {selectedCollection === collection.name
                          ? '✓ Selected'
                          : 'Select'}
                      </button>
                    )}
                    {collection.status !== 'ready' && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        Not available
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            Ready: Collection exists with chunks indexed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
            Empty: Collection exists but no chunks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
            Not Created: Collection not created yet
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          💡 Chunks are document segments stored in Qdrant. Each document is
          split into multiple chunks for better retrieval.
        </div>
      </div>
    </div>
  );
}

export default CollectionsTable;
