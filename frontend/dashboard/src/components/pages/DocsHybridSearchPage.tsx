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
import { ExternalLink, Copy } from 'lucide-react';
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

export default function DocsHybridSearchPage(): JSX.Element {
  const [query, setQuery] = useState('');
  const [alpha, setAlpha] = useState(0.65);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DocsHybridItem[]>([]);
  const [facets, setFacets] = useState<{ domains: { value: string; count: number }[]; types: { value: string; count: number }[]; statuses: { value: string; count: number }[]; tags: { value: string; count: number }[] }>({ domains: [], types: [], statuses: [], tags: [] });

  // Filters
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [dtype, setDtype] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const debouncedQuery = useDebouncedValue(query, 400);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
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
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await documentationService.docsHybridSearch(debouncedQuery, {
          alpha,
          limit,
          domain,
          type: dtype,
          status,
          tags,
        });
        if (mounted.current) setResults(data.results);
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Search failed');
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
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Query</label>
                <Input
                  placeholder="Ex.: docker, workspace api, docusaurus"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium mb-1">Alpha ({alphaPct}%)</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-1">Domínio</label>
              <Select value={domain ?? ''} onValueChange={(v) => setDomain(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {facets.domains.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.value} ({d.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <Select value={dtype ?? ''} onValueChange={(v) => setDtype(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {facets.types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.value} ({t.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={status ?? ''} onValueChange={(v) => setStatus(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {facets.statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.value} ({s.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite e pressione Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const t = tagInput.trim();
                      if (t && !tags.includes(t)) setTags((arr) => [...arr, t]);
                      setTagInput('');
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const t = tagInput.trim();
                    if (t && !tags.includes(t)) setTags((arr) => [...arr, t]);
                    setTagInput('');
                  }}
                  disabled={!tagInput.trim()}
                >
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags((arr) => arr.filter((x) => x !== t))}>
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
              {facets.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {facets.tags.slice(0, 10).map((t) => (
                    <Badge key={t.value} variant="outline" className="cursor-pointer" onClick={() => !tags.includes(t.value) && setTags((arr) => [...arr, t.value])}>
                      {t.value} ({t.count})
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full md:w-28">
              <label className="block text-sm font-medium mb-1">Limite</label>
              <Input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 10)} />
            </div>
            <Button onClick={() => setQuery((q) => q.trim())} disabled={!query}>Buscar</Button>
          </div>
            {error && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            {loading && (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">Carregando…</div>
            )}
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
              {results.length > 0 ? `${results.length} itens` : 'Nenhum resultado'}
            </CollapsibleCardDescription>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={`${r.url}-${r.score}`} className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-2">
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1">
                      {r.title}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">score {r.score.toFixed(3)}</Badge>
                  {r.components.semantic && <Badge variant="outline">semantic</Badge>}
                  {r.components.lexical && <Badge variant="outline">lexical</Badge>}
                  <Button
                    variant="outline"
                    onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${r.url}`)}
                    className="h-8 px-2"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
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
              ))}
            </ul>
          </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ];
  }, [query, alphaPct, alpha, limit, error, loading, results]);

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
