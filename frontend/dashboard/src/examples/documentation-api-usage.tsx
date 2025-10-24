// Example of using the Documentation Search API

import { useState, useEffect } from 'react';

interface SearchResult {
  content: string;
  relevance: number;
  metadata: {
    source: string;
    title?: string;
    type?: string;
    lastUpdated?: string;
  };
}

interface SearchFilters {
  type?: string[];
  updated?: string;
  author?: string;
}

// Example 1: Basic Search
async function basicSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
  return response.json();
}

// Example 2: Advanced Search with Filters
async function advancedSearch(
  query: string,
  filters: SearchFilters
): Promise<SearchResult[]> {
  const response = await fetch('/api/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, filters }),
  });
  return response.json();
}

// Example 3: Real-time Search Hook
function useDocumentationSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, filters?: SearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await advancedSearch(query, filters || {});
      setResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, error, search };
}

// Example 4: Getting Document Details
async function getDocument(path: string) {
  const response = await fetch(`/api/v1/documents/${encodeURIComponent(path)}`);
  return response.json();
}

// Example 5: Getting Search Suggestions
async function getSearchSuggestions(query: string) {
  const response = await fetch(
    `/api/v1/suggestions?q=${encodeURIComponent(query)}`
  );
  return response.json();
}

// Example Usage in a Component
function DocumentationSearch() {
  const { results, isLoading, error, search } = useDocumentationSearch();

  const handleSearch = async () => {
    // Basic search
    const basicResults = await basicSearch('clean architecture');

    // Advanced search with filters
    const advancedResults = await advancedSearch('clean architecture', {
      type: ['markdown'],
      updated: '2024',
    });

    // Get document details
    const document = await getDocument('/docs/architecture/overview.md');

    // Get search suggestions
    const suggestions = await getSearchSuggestions('clean arch');
  };

  return (
    <div>
      {/* Your search UI components */}
    </div>
  );
}

// Example 6: Real-time Search with Debounce
function useDebounceSearch(delay = 300) {
  const [query, setQuery] = useState('');
  const { results, isLoading, error, search } = useDocumentationSearch();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        search(query);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
  };
}

// Example 7: Searching with Context
interface SearchContext {
  path?: string;
  relatedTo?: string[];
  excludePaths?: string[];
}

async function contextualSearch(
  query: string,
  context: SearchContext
): Promise<SearchResult[]> {
  const response = await fetch('/api/v1/search/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, context }),
  });
  return response.json();
}

// Example 8: Getting Related Documents
async function getRelatedDocuments(path: string): Promise<SearchResult[]> {
  const response = await fetch(
    `/api/v1/documents/${encodeURIComponent(path)}/related`
  );
  return response.json();
}

export {
  basicSearch,
  advancedSearch,
  useDocumentationSearch,
  getDocument,
  getSearchSuggestions,
  useDebounceSearch,
  contextualSearch,
  getRelatedDocuments,
};