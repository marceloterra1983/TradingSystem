import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExternalLink, Copy, Eye, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import documentationService, { DocsHybridItem } from '../../services/documentationService';
import { DocPreviewModal } from './DocPreviewModal';
import { normalizeDocsApiPath, resolveDocsPreviewUrl } from '../../utils/docusaurus';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../ui/select';

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STORAGE_KEY_RESULTS = 'docsHybridSearch_results';
const STORAGE_KEY_QUERY = 'docsHybridSearch_lastQuery';
const HYBRID_SEARCH_LIMIT = 50;

type FacetOption = {
  value: string;
  label: string;
  count: number;
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  planned: 'Planejado',
  completed: 'Concluído',
  accepted: 'Aceito',
  deprecated: 'Depreciado',
};

const STATUS_ORDER = ['active', 'planned', 'accepted', 'completed', 'draft', 'deprecated'];

const UNCLASSIFIED_LABEL = 'Não classificado';

const toTitleCase = (segment: string): string => {
  const lower = segment.toLowerCase();
  if (segment === '›') {
    return segment;
  }
  if (lower.length <= 3) {
    return segment.toUpperCase();
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatFacetLabel = (raw?: string): string => {
  if (!raw) {
    return UNCLASSIFIED_LABEL;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return UNCLASSIFIED_LABEL;
  }
  const cleaned = trimmed
    .replace(/\.mdx?$/i, '')
    .replace(/\.md$/i, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\//g, ' › ');
  if (!cleaned) {
    return UNCLASSIFIED_LABEL;
  }
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(toTitleCase)
    .join(' ');
};

const normalizeTag = (tag?: string): string => tag?.trim().toLowerCase() ?? '';

const formatTagLabel = (raw?: string): string => {
  if (!raw) {
    return UNCLASSIFIED_LABEL;
  }
  const cleaned = raw.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return UNCLASSIFIED_LABEL;
  }
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(toTitleCase)
    .join(' ');
};

const formatStatusLabel = (raw?: string): string => {
  if (!raw) {
    return STATUS_LABEL_MAP.active;
  }
  const normalized = raw.toLowerCase();
  return STATUS_LABEL_MAP[normalized] ?? formatFacetLabel(raw);
};

const buildFacetOptions = (
  items: { value: string; count: number }[] | undefined,
  formatter: (value: string) => string
): FacetOption[] => {
  if (!items || items.length === 0) {
    return [];
  }

  return items
    .filter((item): item is { value: string; count: number } => Boolean(item?.value))
    .map((item) => ({
      value: item.value,
      label: formatter(item.value),
      count: item.count ?? 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });
};

const getStoredQuery = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return localStorage.getItem(STORAGE_KEY_QUERY) || '';
  } catch {
    return '';
  }
};

export default function DocsHybridSearchPage(): JSX.Element {
  // Initialize from localStorage if available
  const [query, setQuery] = useState<string>(getStoredQuery);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>(getStoredQuery);
  const [alpha, setAlpha] = useState(0.65);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DocsHybridItem[]>(() => {
    console.log('[DocsSearch] Initializing results state');
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RESULTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[DocsSearch] Restored', parsed.length, 'results from localStorage');
        return parsed;
      }
    } catch (e) {
      console.error('[DocsSearch] Failed to restore results from localStorage:', e);
    }
    return [];
  });
  const [facets, setFacets] = useState<{ domains: { value: string; count: number }[]; types: { value: string; count: number }[]; statuses: { value: string; count: number }[]; tags: { value: string; count: number }[] }>({ domains: [], types: [], statuses: [], tags: [] });

  // Modal state for preview
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; title: string; url: string; docPath: string }>({
    isOpen: false,
    title: '',
    url: '',
    docPath: '',
  });
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [docPreviews, setDocPreviews] = useState<Record<string, { status: 'idle' | 'loading' | 'ready' | 'error'; content?: string; error?: string }>>({});

  const stripFrontmatter = useCallback(
    (raw: string) => raw.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/u, '').trim(),
    [],
  );

  const deriveDocPath = useCallback((result: DocsHybridItem) => {
    if (result.path && result.path.trim().length > 0) {
      return `/${result.path.replace(/^\/+/, '')}`;
    }
    return normalizeDocsApiPath(result.url, 'next');
  }, []);

  const fetchDocContent = useCallback(
    async (key: string, docPath: string) => {
      setDocPreviews((prev) => {
        const current = prev[key];
        if (current?.status === 'loading') {
          return prev;
        }
        return { ...prev, [key]: { status: 'loading' } };
      });

      try {
        const raw = await documentationService.getDocContent(docPath);
        const content = stripFrontmatter(raw);
        setDocPreviews((prev) => ({ ...prev, [key]: { status: 'ready', content } }));
      } catch (err) {
        setDocPreviews((prev) => ({
          ...prev,
          [key]: {
            status: 'error',
            error: err instanceof Error ? err.message : 'Falha ao carregar documento',
          },
        }));
      }
    },
    [stripFrontmatter],
  );

  const handleToggleInlinePreview = useCallback(
    (result: DocsHybridItem) => {
      const docPath = deriveDocPath(result);
      const shouldExpand = !expandedDocs[docPath];
      setExpandedDocs((prev) => ({ ...prev, [docPath]: shouldExpand }));
      if (shouldExpand) {
        const previewState = docPreviews[docPath];
        if (!previewState || previewState.status === 'error') {
          void fetchDocContent(docPath, docPath);
        }
      }
    },
    [deriveDocPath, expandedDocs, docPreviews, fetchDocContent],
  );

  // Modal preview handler - opens in-page modal overlay
  const openPreview = (result: DocsHybridItem) => {
    const normalizedPath = normalizeDocsApiPath(result.url, 'next');
    const previewUrl = resolveDocsPreviewUrl(result.url, 'next', { absolute: true });

    console.log('[DocsSearch] Opening preview modal:', {
      originalUrl: result.url,
      normalizedPath,
      previewUrl,
    });

    setPreviewModal({
      isOpen: true,
      title: result.title,
      url: previewUrl,
      docPath: deriveDocPath(result),
    });
  };

  // Persist results to localStorage
  useEffect(() => {
    console.log('[DocsSearch] Results changed:', results.length, 'items');
    try {
      if (results.length > 0) {
        localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
        console.log('[DocsSearch] Saved results to localStorage');
      }
    } catch (e) {
      console.error('[DocsSearch] Failed to save results to localStorage:', e);
    }
  }, [results]);

  // Persist last searched query
  useEffect(() => {
    if (lastSearchedQuery) {
      try {
        localStorage.setItem(STORAGE_KEY_QUERY, lastSearchedQuery);
      } catch (e) {
        console.error('[DocsSearch] Failed to save query to localStorage:', e);
      }
    }
  }, [lastSearchedQuery]);

  // Filters
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [dtype, setDtype] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  const debouncedQuery = useDebouncedValue(query, 400);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    console.log('[DocsSearch] Component mounted/remounted');
    return () => {
      console.log('[DocsSearch] Component unmounting');
      mounted.current = false;
    };
  }, []);

  const domainOptions = useMemo(
    () => buildFacetOptions(facets.domains, formatFacetLabel),
    [facets.domains]
  );

  const typeOptions = useMemo(
    () => buildFacetOptions(facets.types, formatFacetLabel),
    [facets.types]
  );

  const statusOptions = useMemo(() => {
    const base = buildFacetOptions(facets.statuses, formatStatusLabel);
    return base
      .map((option) => ({
        ...option,
        sortOrder: STATUS_ORDER.indexOf(option.value.toLowerCase()),
      }))
      .sort((a, b) => {
        if (a.sortOrder !== -1 && b.sortOrder !== -1) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== -1) {
          return -1;
        }
        if (b.sortOrder !== -1) {
          return 1;
        }
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.label.localeCompare(b.label);
      })
      .map(({ sortOrder, ...rest }) => rest);
  }, [facets.statuses]);

  const domainTotal = useMemo(
    () => domainOptions.reduce((acc, option) => acc + option.count, 0),
    [domainOptions]
  );
  const typeTotal = useMemo(
    () => typeOptions.reduce((acc, option) => acc + option.count, 0),
    [typeOptions]
  );
  const statusTotal = useMemo(
    () => statusOptions.reduce((acc, option) => acc + option.count, 0),
    [statusOptions]
  );
  const normalizedSelectedTags = useMemo(
    () => tags.map(normalizeTag).filter(Boolean),
    [tags]
  );

  // Load facets (no-query baseline) once
  useEffect(() => {
    async function loadFacets() {
      try {
        const f = await documentationService.getDocsFacets('');
        if (mounted.current) setFacets({ domains: f.domains || [], types: f.types || [], statuses: f.statuses || [], tags: f.tags || [] });
      } catch (e) {
        // noop
      }
    }
    void loadFacets();
  }, []);

  useEffect(() => {
    async function run() {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        // Don't clear results - keep previous search visible
        // User can manually clear by typing a new search
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Try hybrid search first (semantic + lexical)
        console.log('[DocsSearch] Trying hybrid search for:', debouncedQuery);
        const data = await documentationService.docsHybridSearch(
          debouncedQuery,
          {
            alpha,
            limit: HYBRID_SEARCH_LIMIT,
            domain,
            type: dtype,
            status,
            tags,
          }
        );
        console.log('[DocsSearch] Hybrid search succeeded:', data.results.length, 'results');
        if (mounted.current) {
          setResults(data.results);
          setLastSearchedQuery(debouncedQuery);
        }
      } catch (e) {
        // Fallback to lexical-only search if hybrid fails (Qdrant/Ollama unavailable)
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log('[DocsSearch] Hybrid search failed:', errorMsg);
        console.log('[DocsSearch] Attempting lexical fallback...');

        if (errorMsg.includes('Qdrant') || errorMsg.includes('Ollama') || errorMsg.includes('timeout') || errorMsg.includes('Hybrid search failed')) {
          try {
            const lexicalData = await documentationService.docsLexicalSearch(
              debouncedQuery,
              {
                limit: HYBRID_SEARCH_LIMIT,
                domain,
                type: dtype,
                status,
                tags,
              }
            );
            console.log('[DocsSearch] Lexical search succeeded:', lexicalData.results.length, 'results');
            if (mounted.current) {
              // Convert lexical results to hybrid format
              const convertedResults: DocsHybridItem[] = lexicalData.results.map((r) => {
                // Ensure URL uses proxy prefix for same-origin Docusaurus access
                let docUrl = r.path;
                if (!docUrl.startsWith('/docs/')) {
                  docUrl = `/docs/${docUrl.replace(/^\/+/, '')}`;
                }
                return {
                  title: r.title,
                  url: docUrl,
                  path: r.path,
                  snippet: r.summary,
                  score: r.score || 0,
                  source: 'lexical' as const,
                  components: { semantic: false, lexical: true },
                  tags: r.tags,
                  domain: r.domain,
                  type: r.type,
                  status: r.status,
                };
              });
              console.log('[DocsSearch] Setting', convertedResults.length, 'converted results');
              setResults(convertedResults);
              setLastSearchedQuery(debouncedQuery);
            }
          } catch (lexErr) {
            console.error('[DocsSearch] Lexical search also failed:', lexErr);
            if (mounted.current) setError(lexErr instanceof Error ? lexErr.message : 'Search failed');
          }
        } else {
          console.error('[DocsSearch] Non-recoverable error:', errorMsg);
          if (mounted.current) setError(errorMsg || 'Search failed');
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    run();
  }, [debouncedQuery, alpha, domain, dtype, status, tags]);

  const alphaPct = useMemo(() => Math.round(alpha * 100), [alpha]);
  const filteredResults = useMemo(() => {
    if (results.length === 0) {
      return results;
    }

    return results.filter((result) => {
      if (domain && result.domain !== domain) {
        return false;
      }
      if (dtype && result.type !== dtype) {
        return false;
      }
      if (status && (result.status ?? 'active') !== status) {
        return false;
      }
      if (normalizedSelectedTags.length > 0) {
        const resultTags = Array.isArray(result.tags)
          ? result.tags.map(normalizeTag).filter(Boolean)
          : [];
        return normalizedSelectedTags.every((tag) => resultTags.includes(tag));
      }
      return true;
    });
  }, [results, domain, dtype, status, normalizedSelectedTags]);

  const tagSuggestions = useMemo(() => {
    if (filteredResults.length === 0) {
      return [];
    }

    const map = new Map<string, { value: string; count: number }>();
    filteredResults.forEach((result) => {
      (result.tags ?? []).forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized || normalizedSelectedTags.includes(normalized)) {
          return;
        }
        const existing = map.get(normalized);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(normalized, { value: tag, count: 1 });
        }
      });
    });

    return Array.from(map.entries())
      .sort((a, b) => {
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        return a[1].value.localeCompare(b[1].value);
      })
      .map(([normalized, data]) => ({
        normalized,
        value: data.value,
        label: formatTagLabel(data.value),
        count: data.count,
      }))
      .slice(0, 12);
  }, [filteredResults, normalizedSelectedTags]);

  const sections = useMemo(() => {
    return [
      {
        id: 'hybrid-config',
        content: (
          <CollapsibleCard cardId="hybrid-config" defaultCollapsed={false}>
          <CollapsibleCardHeader>
            <CollapsibleCardTitle>Consulta e ajustes</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Alpha pondera o peso da semântica (Qdrant) vs. lexical (FlexSearch).
            </CollapsibleCardDescription>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <div className="space-y-4">
              {/* Query principal */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Buscar documentação
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex.: docker, workspace api, docusaurus"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && query.trim()) {
                        setQuery((q) => q.trim());
                      }
                      if (e.key === 'Escape') {
                        setQuery('');
                        setResults([]);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => setQuery((q) => q.trim())}
                    disabled={!query.trim()}
                    className="w-24"
                  >
                    Buscar
                  </Button>
                  {(query || results.length > 0) && (
                    <Button
                      onClick={() => {
                        setQuery('');
                        setResults([]);
                        setError(null);
                        setLastSearchedQuery('');
                        // Clear localStorage
                        try {
                          localStorage.removeItem(STORAGE_KEY_RESULTS);
                          localStorage.removeItem(STORAGE_KEY_QUERY);
                          console.log('[DocsSearch] Cleared localStorage');
                        } catch (e) {
                          console.error('[DocsSearch] Failed to clear localStorage:', e);
                        }
                      }}
                      variant="outline"
                      className="w-24"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros principais */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Domínio
                  </label>
                  <Select
                    value={domain ?? '__all__'}
                    onValueChange={(value) => setDomain(value === '__all__' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todos os domínios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        Todos ({domainTotal})
                      </SelectItem>
                      {domainOptions.slice(0, 40).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tipo
                  </label>
                  <Select
                    value={dtype ?? '__all__'}
                    onValueChange={(value) => setDtype(value === '__all__' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        Todos ({typeTotal})
                      </SelectItem>
                      {typeOptions.slice(0, 60).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <Select
                    value={status ?? '__all__'}
                    onValueChange={(value) => setStatus(value === '__all__' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        Todos ({statusTotal})
                      </SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags selecionadas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 py-1">
                    Tags ativas:
                  </span>
                  {tags.map((t) => {
                    const normalizedTag = normalizeTag(t);
                    return (
                      <Badge
                        key={normalizedTag || t}
                        variant="secondary"
                        className="cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600"
                        onClick={() =>
                          setTags((arr) =>
                          arr.filter((x) => normalizeTag(x) !== normalizedTag)
                          )
                        }
                      >
                        {formatTagLabel(t)} ×
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Tags disponíveis (sugestões) */}
              {tagSuggestions.length > 0 && tags.length < 5 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Tags disponíveis (clique para adicionar):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.map((suggestion) => (
                      <Badge
                        key={suggestion.normalized}
                        variant="outline"
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() =>
                          setTags((arr) => {
                            const normalized = normalizeTag(suggestion.value);
                            if (
                              !normalized ||
                              arr.some((existing) => normalizeTag(existing) === normalized)
                            ) {
                              return arr;
                            }
                            return [...arr, suggestion.value];
                          })
                        }
                      >
                        {suggestion.label} ({suggestion.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuração Alpha (menos destaque) */}
              <details className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <summary className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                  Configurações avançadas (Alpha: {alphaPct}%)
                </summary>
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Alpha pondera semântica vs. lexical (0% = apenas lexical, 100% = apenas semântico)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500 mt-1">
                    <span>Lexical</span>
                    <span>Híbrido</span>
                    <span>Semântico</span>
                  </div>
                </div>
              </details>

              {/* Status da busca */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
              {loading && results.length === 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                  Carregando resultados...
                </div>
              )}
            </div>
          </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'hybrid-results',
        content: (
          <CollapsibleCard cardId="hybrid-results" defaultCollapsed={false}>
          <CollapsibleCardHeader>
            <CollapsibleCardTitle>Resultados</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              {filteredResults.length > 0 ? (
                <>
                  {filteredResults.length} itens
                  {results.length > filteredResults.length && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      (filtrando de {results.length})
                    </span>
                  )}
                  {lastSearchedQuery && lastSearchedQuery !== query && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      (última busca: "{lastSearchedQuery}")
                    </span>
                  )}
                </>
              ) : 'Nenhum resultado'}
            </CollapsibleCardDescription>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <ul className="space-y-3">
              {filteredResults.map((r) => {
                const normalizedPath = normalizeDocsApiPath(r.url, 'next');
                const fullDocUrl = resolveDocsPreviewUrl(r.url, 'next', { absolute: true });
                const docPath = deriveDocPath(r);
                const isExpanded = !!expandedDocs[docPath];
                const inlinePreview = docPreviews[docPath];

                return (
                  <li
                    key={`${r.url}-${r.score}`}
                    className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => openPreview(r)}
                        className="font-medium text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 text-left"
                        title="Clique para abrir documento no Docusaurus (popup)"
                      >
                        {r.title}
                        <Eye className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleInlinePreview(r)}
                          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title={isExpanded ? 'Ocultar prévia inline' : 'Mostrar prévia inline'}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <Badge variant="outline">score {r.score.toFixed(3)}</Badge>
                        {r.components.semantic && <Badge variant="outline">semantic</Badge>}
                        {r.components.lexical && <Badge variant="outline">lexical</Badge>}
                        <Button
                          variant="outline"
                          onClick={() => void navigator.clipboard?.writeText(fullDocUrl)}
                          className="h-8 px-2"
                          title={`Copiar link (${normalizedPath})`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => window.open(fullDocUrl, '_blank')}
                          className="h-8 px-2"
                          title={`Abrir em nova aba (${normalizedPath})`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {r.snippet && (
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">{r.snippet}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.tags?.slice(0, 6).map((t) => {
                        const normalizedTag = normalizeTag(t);
                        return (
                          <Badge key={normalizedTag || t} variant="secondary">
                            {formatTagLabel(t)}
                          </Badge>
                        );
                      })}
                      {r.domain && <Badge variant="outline">{formatFacetLabel(r.domain)}</Badge>}
                      {r.type && <Badge variant="outline">{formatFacetLabel(r.type)}</Badge>}
                      {r.status && (
                        <Badge variant="outline">{formatStatusLabel(r.status)}</Badge>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40">
                        {inlinePreview?.status === 'loading' && (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Carregando prévia…</span>
                          </div>
                        )}
                        {inlinePreview?.status === 'error' && (
                          <div className="space-y-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{inlinePreview.error ?? 'Falha ao carregar a prévia.'}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchDocContent(docPath, docPath)}
                              className="h-8 w-fit"
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        )}
                        {inlinePreview?.status === 'ready' && (
                          <div className="max-h-80 overflow-y-auto px-4 py-3">
                            <div className="prose prose-slate dark:prose-invert prose-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                {inlinePreview.content ?? ''}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {!inlinePreview && (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Preparando prévia…</span>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ];
  }, [
    query,
    alphaPct,
    alpha,
    error,
    loading,
    results,
    filteredResults,
    lastSearchedQuery,
    domain,
    dtype,
    status,
    tags,
    domainOptions,
    typeOptions,
    statusOptions,
    tagSuggestions,
    expandedDocs,
    docPreviews,
    handleToggleInlinePreview,
    deriveDocPath,
    fetchDocContent,
  ]);

  return (
    <>
      <CustomizablePageLayout
        pageId="docs-hybrid-search"
        title="Docs Hybrid Search"
        subtitle="Busca híbrida (lexical + vetorial) com reranking leve e âncoras."
        sections={sections}
        defaultColumns={1}
      />

      {/* Preview Modal */}
      <DocPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, title: '', url: '', docPath: '' })}
        title={previewModal.title}
        url={previewModal.url}
        docPath={previewModal.docPath}
      />
    </>
  );
}
