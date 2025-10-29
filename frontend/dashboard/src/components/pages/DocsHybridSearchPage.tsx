import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ExternalLink, Copy, Eye } from 'lucide-react';
import documentationService, { DocsHybridItem } from '../../services/documentationService';
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

export default function DocsHybridSearchPage(): JSX.Element {
  // Initialize from localStorage if available
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_QUERY) || '';
    } catch {
      return '';
    }
  });
  const [alpha, setAlpha] = useState(0.65);
  const [limit, setLimit] = useState(10);
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

  // Popup window handler
  const openPreview = (url: string, title: string) => {
    const width = Math.min(1200, window.innerWidth * 0.8);
    const height = Math.min(900, window.innerHeight * 0.9);
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'docPreview',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`
    );
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
        const data = await documentationService.docsHybridSearch(debouncedQuery, {
          alpha,
          limit,
          domain,
          type: dtype,
          status,
          tags,
        });
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
            const lexicalData = await documentationService.docsLexicalSearch(debouncedQuery, {
              limit,
              domain,
              type: dtype,
              status,
              tags,
            });
            console.log('[DocsSearch] Lexical search succeeded:', lexicalData.results.length, 'results');
            if (mounted.current) {
              // Convert lexical results to hybrid format
              const convertedResults: DocsHybridItem[] = lexicalData.results.map((r) => {
                // Ensure URL points to Docusaurus (port 3205)
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
  }, [debouncedQuery, alpha, limit, domain, dtype, status, tags]);

  const alphaPct = useMemo(() => Math.round(alpha * 100), [alpha]);

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

              {/* Filtros em grid compacto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Domínio</label>
                  <Select value={domain ?? '__all__'} onValueChange={(v) => setDomain(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {facets.domains.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.value} ({d.count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tipo</label>
                  <Select value={dtype ?? '__all__'} onValueChange={(v) => setDtype(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {facets.types.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.value} ({t.count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Status</label>
                  <Select value={status ?? '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {facets.statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.value} ({s.count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Limite</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 10)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Tags selecionadas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 py-1">
                    Tags ativas:
                  </span>
                  {tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600"
                      onClick={() => setTags((arr) => arr.filter((x) => x !== t))}
                    >
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tags disponíveis (sugestões) */}
              {facets.tags.length > 0 && tags.length < 5 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Tags disponíveis (clique para adicionar):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {facets.tags.slice(0, 12).filter(t => !tags.includes(t.value)).map((t) => (
                      <Badge
                        key={t.value}
                        variant="outline"
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => setTags((arr) => [...arr, t.value])}
                      >
                        {t.value} ({t.count})
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
              {loading && (
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
              {results.length > 0 ? (
                <>
                  {results.length} itens
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
              {results.map((r) => {
                // Use proxied docs URL for same-origin access in iframe
                const docUrl = r.url.startsWith('/docs') ? r.url : `/docs${r.url}`;
                // For external link, use direct Docusaurus URL
                const fullDocUrl = `http://localhost:3205${r.url}`;

                return (
                <li key={`${r.url}-${r.score}`} className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => openPreview(fullDocUrl, r.title)}
                      className="font-medium text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 text-left"
                      title="Clique para abrir preview em popup"
                    >
                      {r.title}
                      <Eye className="w-4 h-4" />
                    </button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">score {r.score.toFixed(3)}</Badge>
                  {r.components.semantic && <Badge variant="outline">semantic</Badge>}
                  {r.components.lexical && <Badge variant="outline">lexical</Badge>}
                  <Button
                    variant="outline"
                    onClick={() => void navigator.clipboard?.writeText(fullDocUrl)}
                    className="h-8 px-2"
                    title="Copiar link completo"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => window.open(fullDocUrl, '_blank')}
                    className="h-8 px-2"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                  </div>
                  {r.snippet && (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">{r.snippet}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.tags?.slice(0, 6).map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                    {r.domain && <Badge variant="outline">{r.domain}</Badge>}
                    {r.type && <Badge variant="outline">{r.type}</Badge>}
                  </div>
                </li>
                );
              })}
            </ul>
          </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ];
  }, [query, alphaPct, alpha, limit, error, loading, results, lastSearchedQuery]);

  return (
    <CustomizablePageLayout
      pageId="docs-hybrid-search"
      title="Docs Hybrid Search"
      subtitle="Busca híbrida (lexical + vetorial) com reranking leve e âncoras."
      sections={sections}
      defaultColumns={1}
    />
  );
}
