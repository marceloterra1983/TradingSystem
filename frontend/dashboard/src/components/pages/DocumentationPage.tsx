import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buildDocsUrl } from '@/lib/docsUrl';
import documentationService, {
  SearchResult,
  SearchSuggestion,
} from '@/services/documentationService';
import { useDebounce } from '@/hooks/useDebounce';

const MIN_QUERY_LENGTH = 2;

export const DocumentationPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 400);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');

  useEffect(() => {
    let ignore = false;

    async function runSearch() {
      if (debouncedQuery.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setSelectedResult(null);
        setSuggestions([]);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        const [searchResponse, suggestionResponse] = await Promise.all([
          documentationService.search(debouncedQuery, {
            source: filterSource === 'all' ? undefined : filterSource,
            limit: 30,
          }),
          documentationService.getSuggestions(debouncedQuery, 5),
        ]);

        if (!ignore) {
          setResults(searchResponse.results ?? []);
          setSuggestions(suggestionResponse ?? []);
          setSelectedResult((current) => {
            if (!current) {
              return searchResponse.results?.[0] ?? null;
            }
            const stillExists = searchResponse.results?.find((r) => r.id === current.id);
            return stillExists ?? searchResponse.results?.[0] ?? null;
          });
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : 'Falha ao buscar na documentação';
          setError(message);
          setResults([]);
          setSuggestions([]);
          setSelectedResult(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void runSearch();
    return () => {
      ignore = true;
    };
  }, [debouncedQuery, filterSource]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
  };

  const filteredResults = useMemo(() => {
    if (filterSource === 'all') {
      return results;
    }
    return results.filter((result) => result.source === filterSource);
  }, [results, filterSource]);

  const sources = useMemo(() => {
    const unique = new Set<string>();
    results.forEach((result) => {
      if (result.source) {
        unique.add(result.source);
      }
    });
    return Array.from(unique);
  }, [results]);

  const openDocument = (result: SearchResult) => {
    if (result.path) {
      const href = result.path.startsWith('http')
        ? result.path
        : buildDocsUrl(result.path);
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (result.source) {
      window.open(result.source, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Documentação do TradingSystem
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Busque endpoints, eventos assíncronos e guias diretamente do portal oficial. Os
            resultados mostram metadados e links para o conteúdo completo no Docusaurus.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="flex flex-col gap-2">
              <label htmlFor="doc-search" className="text-sm font-medium text-slate-500">
                Buscar
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  id="doc-search"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
                  placeholder="Ex.: websocket health, asyncapi, kanban..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Filtros:</span>
                <button
                  className={`rounded-full px-3 py-1 ${
                    filterSource === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => setFilterSource('all')}
                >
                  Todos
                </button>
                {sources.map((source) => (
                  <button
                    key={source}
                    className={`rounded-full px-3 py-1 ${
                      filterSource === source
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                    onClick={() => setFilterSource(source)}
                  >
                    {source}
                  </button>
                ))}
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.text}-${suggestion.type ?? ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-3 md:col-span-1">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <Card className="border-red-300 bg-red-50 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                <CardContent className="p-3">{error}</CardContent>
              </Card>
            ) : filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-slate-500">
                  {debouncedQuery.length < MIN_QUERY_LENGTH
                    ? 'Digite pelo menos duas letras para buscar.'
                    : 'Nenhum resultado encontrado para esta consulta.'}
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <button
                  key={result.id}
                  className={`w-full rounded-lg border p-4 text-left transition hover:border-blue-400 ${
                    selectedResult?.id === result.id
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-slate-800'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {result.title || result.path || 'Resultado'}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                    {result.description || 'Sem descrição disponível'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {result.source && <Badge variant="secondary">{result.source}</Badge>}
                    {result.version && (
                      <Badge variant="outline" className="text-xs">
                        v{result.version}
                      </Badge>
                    )}
                    {result.score !== undefined && (
                      <span>score {(result.score * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="md:col-span-2">
            {selectedResult ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-4 text-lg">
                    <span>{selectedResult.title || selectedResult.path}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDocument(selectedResult)}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fonte: {selectedResult.source ?? 'desconhecida'}
                    {selectedResult.version ? ` • v${selectedResult.version}` : ''}
                    {selectedResult.method ? ` • ${selectedResult.method}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-slate-700 dark:text-slate-200">
                    {selectedResult.description || 'Sem descrição fornecida para este item.'}
                  </p>
                  {selectedResult.path && (
                    <div className="rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedResult.path}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Resultado mostrado a partir do índice interno. Para conteúdo completo,
                    utilize o portal oficial.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                  Selecione um resultado para ver detalhes.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;
