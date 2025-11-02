import { useState, useEffect, useCallback } from 'react';

interface Collection {
  name: string;
  displayName: string;
  embeddingModel: string;
  dimensions: number;
  status: 'ready' | 'empty' | 'not_created';
  count: number | null;
}

interface CollectionSelectorProps {
  value: string;
  onChange: (collectionName: string) => void;
  className?: string;
  onLoaded?: (collections: Collection[]) => void;
  autoSelectFirst?: boolean;
}

export function CollectionSelector({
  value,
  onChange,
  className = '',
  onLoaded,
  autoSelectFirst = false,
}: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/rag/collections');
      const data = await response.json();

      if (data.success) {
        // Filtrar apenas coleções prontas
        const readyCollections = data.collections.filter(
          (c: Collection) => c.status === 'ready',
        );
        setCollections(readyCollections);
        onLoaded?.(readyCollections);

        if (autoSelectFirst && readyCollections.length > 0) {
          const hasValue = readyCollections.some(
            (collection: Collection) => collection.name === value,
          );
          if (!hasValue) {
            onChange(readyCollections[0].name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  }, [autoSelectFirst, onChange, onLoaded, value]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No collections available
      </div>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor="collection-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Collection
      </label>
      <select
        id="collection-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {collections.map((collection) => (
          <option key={collection.name} value={collection.name}>
            {collection.displayName} ({collection.count?.toLocaleString() || 0}{' '}
            docs, {collection.dimensions}d)
          </option>
        ))}
      </select>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {collections.find((c) => c.name === value)?.embeddingModel ||
          'Select a collection'}
      </div>
    </div>
  );
}

export default CollectionSelector;
