import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation, useHistory } from '@docusaurus/router';
import FacetFilters from '../../components/FacetFilters';
import styles from './styles.module.css';

const DEBOUNCE_DELAY = 500;
const SEARCH_TIMEOUT = 10000; // 10 seconds

interface SearchResult {
  id: string;
  title: string;
  domain: string;
  type: string;
  tags: string[];
  status: string;
  path: string;
  summary: string;
  score: number;
}

interface Facets {
  domains: Array<{ value: string; count: number }>;
  types: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  statuses: Array<{ value: string; count: number }>;
}

interface SelectedFilters {
  domain?: string;
  type?: string;
  tags: string[];
  status?: string;
}

function SearchPage() {
  const location = useLocation();
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();

  // Get API URL from config customFields with fallback
  const apiUrl =
    (siteConfig.customFields?.searchApiUrl as string) || 'http://localhost:3400/api/v1/docs';

  const [query, setQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    tags: [],
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<Facets>({
    domains: [],
    types: [],
    tags: [],
    statuses: [],
  });
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Parse URL query string on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const domain = params.get('domain') || undefined;
    const type = params.get('type') || undefined;
    const tags = params.get('tags')?.split(',').filter(Boolean) || [];
    const status = params.get('status') || undefined;

    setQuery(q);
    setSelectedFilters({ domain, type, tags, status });
  }, [location.search]);

  // Debounced URL update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();

      if (query) params.set('q', query);
      if (selectedFilters.domain) params.set('domain', selectedFilters.domain);
      if (selectedFilters.type) params.set('type', selectedFilters.type);
      if (selectedFilters.tags.length > 0) params.set('tags', selectedFilters.tags.join(','));
      if (selectedFilters.status) params.set('status', selectedFilters.status);

      const newSearch = params.toString();
      if (newSearch !== location.search.substring(1)) {
        history.replace({ search: newSearch });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedFilters, history, location.search]);

  // Execute search
  const executeSearch = useCallback(async () => {
    // Cancel previous request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);

    setLoading(true);
    setError(null);

    // Create timeout promise
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedFilters.domain) params.set('domain', selectedFilters.domain);
      if (selectedFilters.type) params.set('type', selectedFilters.type);
      if (selectedFilters.tags.length > 0) params.set('tags', selectedFilters.tags.join(','));
      if (selectedFilters.status) params.set('status', selectedFilters.status);
      params.set('limit', '50');

      const response = await fetch(`${apiUrl}/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Search request timed out. The API may be slow or unavailable.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Search failed');
      }
      setResults([]);
      setTotalResults(0);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setAbortController(null);
    }
  }, [query, selectedFilters, abortController]);

  // Load facets
  const loadFacets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);

      const response = await fetch(`${apiUrl}/facets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load facets');

      const data = await response.json();
      setFacets(data.facets || { domains: [], types: [], tags: [], statuses: [] });
    } catch (err) {
      console.error('Failed to load facets:', err);
    }
  }, [query]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executeSearch();
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [executeSearch]);

  // Load facets on mount and query change
  useEffect(() => {
    loadFacets();
  }, [loadFacets]);

  const handleFilterChange = (filterType: string, value: string | string[]) => {
    if (filterType === 'tags') {
      setSelectedFilters((prev) => ({ ...prev, tags: value as string[] }));
    } else {
      setSelectedFilters((prev) => ({ ...prev, [filterType]: value || undefined }));
    }
  };

  const handleClearAllFilters = () => {
    setSelectedFilters({ tags: [] });
  };

  const getDomainBadgeClass = (domain: string) => {
    const domainClasses: Record<string, string> = {
      frontend: styles.badgeFrontend,
      backend: styles.badgeBackend,
      ops: styles.badgeOps,
      shared: styles.badgeShared,
    };
    return domainClasses[domain] || styles.badge;
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      active: styles.badgeActive,
      draft: styles.badgeDraft,
      deprecated: styles.badgeDeprecated,
    };
    return statusClasses[status] || styles.badge;
  };

  return (
    <Layout
      title="Search Documentation"
      description="Search across all TradingSystem documentation with faceted filtering"
    >
      <div className={styles.searchContainer}>
        <div className={styles.searchHeader}>
          <h1>Search Documentation</h1>
          <p>Search across 195+ documentation files with filters</p>
        </div>

        <div className={styles.searchInputSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search documentation... (press Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className={styles.clearButton} onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className={styles.layoutGrid}>
          <aside className={styles.sidebar}>
            <FacetFilters
              facets={facets}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearAllFilters}
            />
          </aside>

          <main className={styles.resultsArea}>
            <div className={styles.resultsHeader}>
              <div className={styles.resultCount}>
                {loading ? (
                  'Searching...'
                ) : (
                  <>
                    Found <strong>{totalResults}</strong> result{totalResults !== 1 ? 's' : ''}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className={styles.errorState}>
                <h3>❌ Search Error</h3>
                <p><strong>Error:</strong> {error}</p>
                <p><strong>API Endpoint:</strong> <code>{apiUrl}</code></p>
                <div className={styles.errorActions}>
                  <button onClick={executeSearch} className={styles.retryButton}>
                    🔄 Retry Search
                  </button>
                </div>
                <div className={styles.errorHelp}>
                  <p><strong>Troubleshooting:</strong></p>
                  <ul>
                    <li>Check Documentation API is running: <code>curl {apiUrl.replace('/docs', '')}/health</code></li>
                    <li>Verify CORS allows <code>http://localhost:3004</code></li>
                    <li>Check browser console (F12) for detailed errors</li>
                  </ul>
                </div>
              </div>
            )}

            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No results found</h3>
                <p>Try different keywords or remove some filters</p>
              </div>
            )}

            {!loading && !error && results.length > 0 && (
              <div className={styles.resultsList}>
                {results.map((result) => (
                  <article key={result.id} className={styles.resultCard}>
                    <Link to={useBaseUrl(result.path)} className={styles.resultTitle}>
                      {result.title}
                    </Link>

                    <div className={styles.resultMetadata}>
                      <span className={getDomainBadgeClass(result.domain)}>{result.domain}</span>
                      <span className={styles.badgeType}>{result.type}</span>
                      <span className={getStatusBadgeClass(result.status)}>{result.status}</span>
                    </div>

                    {result.tags && result.tags.length > 0 && (
                      <div className={styles.resultTags}>
                        {result.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className={styles.tagChip}>
                            {tag}
                          </span>
                        ))}
                        {result.tags.length > 5 && (
                          <span className={styles.tagChip}>+{result.tags.length - 5} more</span>
                        )}
                      </div>
                    )}

                    {result.summary && <p className={styles.resultSummary}>{result.summary}</p>}
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}

export default SearchPage;

