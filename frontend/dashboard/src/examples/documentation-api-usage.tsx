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
  filters: SearchFilters,
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
// Example 4: Get documentation facets (domain/type/tags/status)
async function getDocsFacets(query = '') {
  const url = query
    ? `/api/v1/docs/facets?q=${encodeURIComponent(query)}`
    : '/api/v1/docs/facets';
  const response = await fetch(url);
  return response.json();
}

// Example 5: Getting Search Suggestions
async function getSearchSuggestions(query: string) {
  const response = await fetch(
    `/api/v1/suggest?q=${encodeURIComponent(query)}`,
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

    // Get documentation facets
    const facets = await getDocsFacets('architecture');

    // Get search suggestions
    const suggestions = await getSearchSuggestions('clean arch');
  };

  return <div>{/* Your search UI components */}</div>;
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

// Example 7: Search documentation content (Markdown index)
async function docsSearch(
  query: string,
  opts?: {
    domain?: string;
    type?: string;
    tags?: string[];
    status?: string;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (opts?.domain) params.set('domain', opts.domain);
  if (opts?.type) params.set('type', opts.type);
  if (opts?.tags?.length) params.set('tags', opts.tags.join(','));
  if (opts?.status) params.set('status', opts.status);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const response = await fetch(`/api/v1/docs/search?${params.toString()}`);
  return response.json();
}

// Example 8: Get suggestions from documentation titles
// See getSearchSuggestions above

export {
  basicSearch,
  advancedSearch,
  useDocumentationSearch,
  getDocument,
  getSearchSuggestions,
  useDebounceSearch,
  docsSearch,
  getDocsFacets,
};
