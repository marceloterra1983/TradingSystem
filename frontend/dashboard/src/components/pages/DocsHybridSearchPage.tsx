import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../ui/collapsible-card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  ExternalLink,
  Copy,
  Eye,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from '@/icons';
import documentationService, {
  DocsHybridItem,
} from "../../services/documentationService";
import { DocPreviewModal } from "./DocPreviewModal";
import { CollectionSelector } from "./CollectionSelector";
import {
  normalizeDocsApiPath,
  resolveDocsPreviewUrl,
} from "../../utils/docusaurus";
import {
  useRagQuery,
  type RagQueryResult,
} from "../../hooks/llamaIndex/useRagQuery";
// Quick Win P1-2: Hooks integrados!
// import { useDocSearch, useDocFilters } from './docs-search/hooks';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { logger } from "../../utils/logger";

// Lazy load markdown rendering (~63KB saved from initial bundle)
const MarkdownPreview = lazy(() =>
  import("../ui/MarkdownPreview").then((mod) => ({
    default: mod.MarkdownPreview,
  })),
);

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STORAGE_KEY_RESULTS = "docsHybridSearch_results";
const STORAGE_KEY_QUERY = "docsHybridSearch_lastQuery";
const STORAGE_KEY_COLLECTION = "docsHybridSearch_collection";
const HYBRID_SEARCH_LIMIT = 50;
const DEFAULT_COLLECTION_SCOPE = "default";

type FacetOption = {
  value: string;
  label: string;
  count: number;
};

type SearchMode = "hybrid" | "rag-semantic";

const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  hybrid: "Híbrido (FlexSearch + Qdrant)",
  "rag-semantic": "RAG Semântico (Qdrant direto)",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: "Ativo",
  draft: "Rascunho",
  planned: "Planejado",
  completed: "Concluído",
  accepted: "Aceito",
  deprecated: "Depreciado",
};

const STATUS_ORDER = [
  "active",
  "planned",
  "accepted",
  "completed",
  "draft",
  "deprecated",
];

const UNCLASSIFIED_LABEL = "Não classificado";

const toTitleCase = (segment: string): string => {
  const lower = segment.toLowerCase();
  if (segment === "›") {
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
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return UNCLASSIFIED_LABEL;
  }
  const cleaned = trimmed
    .replace(/\.mdx?$/i, "")
    .replace(/\.md$/i, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\//g, " › ");
  if (!cleaned) {
    return UNCLASSIFIED_LABEL;
  }
  return cleaned.split(/\s+/).filter(Boolean).map(toTitleCase).join(" ");
};

const normalizeTag = (tag?: string): string => tag?.trim().toLowerCase() ?? "";

const formatTagLabel = (raw?: string): string => {
  if (!raw) {
    return UNCLASSIFIED_LABEL;
  }
  const cleaned = raw.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return UNCLASSIFIED_LABEL;
  }
  return cleaned.split(" ").filter(Boolean).map(toTitleCase).join(" ");
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
  formatter: (value: string) => string,
): FacetOption[] => {
  if (!items || items.length === 0) {
    return [];
  }

  return items
    .filter((item): item is { value: string; count: number } =>
      Boolean(item?.value),
    )
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

const sanitizeCollection = (value?: string): string => (value ?? "").trim();

const buildScopedKey = (baseKey: string, collection?: string): string => {
  const scope = sanitizeCollection(collection) || DEFAULT_COLLECTION_SCOPE;
  return `${baseKey}:${encodeURIComponent(scope)}`;
};

const safeGetItem = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error("[DocsSearch] Failed to persist key", { key, error });
  }
};

const safeRemoveItem = (key: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("[DocsSearch] Failed to remove key", { key, error });
  }
};

const readStoredCollection = (): string =>
  sanitizeCollection(safeGetItem(STORAGE_KEY_COLLECTION) ?? "");

const writeStoredCollection = (collection: string): void => {
  const sanitized = sanitizeCollection(collection);
  if (!sanitized) {
    safeRemoveItem(STORAGE_KEY_COLLECTION);
    return;
  }
  safeSetItem(STORAGE_KEY_COLLECTION, sanitized);
};

const readStoredQuery = (collection?: string): string => {
  const scopedValue = safeGetItem(
    buildScopedKey(STORAGE_KEY_QUERY, collection),
  );
  if (scopedValue !== null) {
    return scopedValue;
  }
  return safeGetItem(STORAGE_KEY_QUERY) ?? "";
};

const writeStoredQuery = (collection: string, value: string): void => {
  const key = buildScopedKey(STORAGE_KEY_QUERY, collection);
  if (!value) {
    safeRemoveItem(key);
    return;
  }
  safeSetItem(key, value);
};

const readStoredResults = (collection?: string): DocsHybridItem[] => {
  const scoped = safeGetItem(buildScopedKey(STORAGE_KEY_RESULTS, collection));
  const raw = scoped ?? safeGetItem(STORAGE_KEY_RESULTS);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    console.warn("[DocsSearch] Stored results malformed, resetting cache");
    return [];
  } catch (error) {
    console.error("[DocsSearch] Failed to parse cached results", error);
    return [];
  }
};

const writeStoredResults = (
  collection: string,
  results: DocsHybridItem[],
): void => {
  const key = buildScopedKey(STORAGE_KEY_RESULTS, collection);
  if (!results.length) {
    safeRemoveItem(key);
    return;
  }
  safeSetItem(key, JSON.stringify(results));
};

const clearStoredState = (collection: string): void => {
  const scopedQueryKey = buildScopedKey(STORAGE_KEY_QUERY, collection);
  const scopedResultsKey = buildScopedKey(STORAGE_KEY_RESULTS, collection);
  safeRemoveItem(scopedQueryKey);
  safeRemoveItem(scopedResultsKey);
};

/**
 * Convert RAG query result to DocsHybridItem format
 */
const convertRagResultToHybridItem = (
  ragResult: RagQueryResult,
): DocsHybridItem => {
  // Ensure URL uses proxy prefix for same-origin Docusaurus access
  let docUrl = ragResult.url;
  if (!docUrl.startsWith("/docs/")) {
    docUrl = `/docs/${docUrl.replace(/^\/+/, "")}`;
  }

  return {
    title: ragResult.title,
    url: docUrl,
    path: ragResult.path,
    snippet: ragResult.snippet,
    score: ragResult.score,
    source: "rag" as const,
    components: { semantic: true, lexical: false },
    tags: ragResult.metadata?.tags || [],
    domain: undefined,
    type: undefined,
    status: undefined,
  };
};

export default function DocsHybridSearchPage(): JSX.Element {
  const initialCollectionRef = useRef<string | null>(null);
  if (initialCollectionRef.current === null) {
    initialCollectionRef.current = readStoredCollection();
  }
  const initialCollection = initialCollectionRef.current || "";

  const [collection, setCollection] = useState<string>(initialCollection);
  const [query, setQuery] = useState<string>(() =>
    readStoredQuery(initialCollection),
  );
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>(() =>
    readStoredQuery(initialCollection),
  );
  const [alpha, setAlpha] = useState(0.65);
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DocsHybridItem[]>(() => {
    const restored = readStoredResults(initialCollection);
    if (restored.length > 0) {
      logger.debug(
        "[DocsSearch] Restored",
        restored.length,
        "results from localStorage",
        {
          collection: initialCollection || "default",
        },
      );
    }
    return restored;
  });
  const [facets, setFacets] = useState<{
    domains: { value: string; count: number }[];
    types: { value: string; count: number }[];
    statuses: { value: string; count: number }[];
    tags: { value: string; count: number }[];
  }>({ domains: [], types: [], statuses: [], tags: [] });

  // RAG semantic search hook
  const ragQuery = useRagQuery();

  // Modal state for preview
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    docPath: string;
  }>({
    isOpen: false,
    title: "",
    url: "",
    docPath: "",
  });
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [docPreviews, setDocPreviews] = useState<
    Record<
      string,
      {
        status: "idle" | "loading" | "ready" | "error";
        content?: string;
        error?: string;
      }
    >
  >({});

  // Filter states (must be declared before useEffects that use them)
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [dtype, setDtype] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  // 🔒 ALL REFS MUST BE DECLARED BEFORE ANY useEffect THAT USES THEM
  const mounted = useRef(true);
  const initialSearchDone = useRef(false);
  const searchInProgress = useRef(false);
  const collectionSwitchInitialized = useRef(false);

  const stripFrontmatter = useCallback(
    (raw: string) =>
      raw.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/u, "").trim(),
    [],
  );

  const deriveDocPath = useCallback((result: DocsHybridItem) => {
    if (result.path && result.path.trim().length > 0) {
      return `/${result.path.replace(/^\/+/, "")}`;
    }
    return normalizeDocsApiPath(result.url, "next");
  }, []);

  const fetchDocContent = useCallback(
    async (key: string, docPath: string) => {
      setDocPreviews((prev) => {
        const current = prev[key];
        if (current?.status === "loading") {
          return prev;
        }
        return { ...prev, [key]: { status: "loading" } };
      });

      try {
        const raw = await documentationService.getDocContent(docPath);
        const content = stripFrontmatter(raw);
        setDocPreviews((prev) => ({
          ...prev,
          [key]: { status: "ready", content },
        }));
      } catch (err) {
        setDocPreviews((prev) => ({
          ...prev,
          [key]: {
            status: "error",
            error:
              err instanceof Error
                ? err.message
                : "Falha ao carregar documento",
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
        if (!previewState || previewState.status === "error") {
          void fetchDocContent(docPath, docPath);
        }
      }
    },
    [deriveDocPath, expandedDocs, docPreviews, fetchDocContent],
  );

  // Modal preview handler - opens in-page modal overlay
  const openPreview = (result: DocsHybridItem) => {
    const normalizedPath = normalizeDocsApiPath(result.url, "next");
    const previewUrl = resolveDocsPreviewUrl(result.url, "next", {
      absolute: true,
    });

    logger.debug("[DocsSearch] Opening preview modal:", {
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

  useEffect(() => {
    // Only persist results after initial search is done
    // This prevents overwriting localStorage on mount before restoration completes
    if (!initialSearchDone.current) return;

    logger.debug("[DocsSearch] Persisting results", {
      collection: collection || "default",
      count: results.length,
    });
    writeStoredResults(collection, results);
  }, [collection, results]);

  useEffect(() => {
    writeStoredQuery(collection, lastSearchedQuery);
  }, [collection, lastSearchedQuery]);

  useEffect(() => {
    writeStoredCollection(collection);
  }, [collection]);

  // Collection change handler
  useEffect(() => {
    if (!collectionSwitchInitialized.current) {
      collectionSwitchInitialized.current = true;
      return;
    }

    logger.debug("[DocsSearch] Collection changed", {
      collection: collection || "default",
    });

    const storedQueryForCollection = readStoredQuery(collection);
    const storedResultsForCollection = readStoredResults(collection);

    setQuery(storedQueryForCollection);
    setLastSearchedQuery(storedQueryForCollection);
    setResults(storedResultsForCollection);
    setDomain(undefined);
    setDtype(undefined);
    setStatus(undefined);
    setTags([]);
    setError(null);

    // Reset initial search flag when collection changes
    initialSearchDone.current = false;
  }, [collection]);

  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    mounted.current = true;
    logger.debug("[DocsSearch] Component mounted/remounted");
    return () => {
      logger.debug("[DocsSearch] Component unmounting");
      mounted.current = false;
    };
  }, []);

  const domainOptions = useMemo(
    () => buildFacetOptions(facets.domains, formatFacetLabel),
    [facets.domains],
  );

  const typeOptions = useMemo(
    () => buildFacetOptions(facets.types, formatFacetLabel),
    [facets.types],
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
    [domainOptions],
  );
  const typeTotal = useMemo(
    () => typeOptions.reduce((acc, option) => acc + option.count, 0),
    [typeOptions],
  );
  const statusTotal = useMemo(
    () => statusOptions.reduce((acc, option) => acc + option.count, 0),
    [statusOptions],
  );
  const normalizedSelectedTags = useMemo(
    () => tags.map(normalizeTag).filter(Boolean),
    [tags],
  );

  // Load facets (no-query baseline) once
  useEffect(() => {
    async function loadFacets() {
      try {
        const f = await documentationService.getDocsFacets("");
        if (mounted.current)
          setFacets({
            domains: f.domains || [],
            types: f.types || [],
            statuses: f.statuses || [],
            tags: f.tags || [],
          });
      } catch (e) {
        // noop
      }
    }
    void loadFacets();
  }, []);

  // Main search useEffect (handles debounced query changes)
  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        // Don't clear results - keep previous search visible
        // User can manually clear by typing a new search
        setError(null);
        // Don't execute search if query is too short
        return;
      }

      // Skip initial search if we already have results from localStorage for this query
      if (
        !initialSearchDone.current &&
        debouncedQuery === lastSearchedQuery &&
        results.length > 0
      ) {
        logger.debug(
          "[DocsSearch] Skipping initial search - results already loaded from localStorage",
        );
        initialSearchDone.current = true;
        return;
      }

      // 🔒 Prevent concurrent searches
      if (searchInProgress.current) {
        logger.debug("[DocsSearch] Search already in progress, skipping");
        return;
      }

      searchInProgress.current = true;
      setLoading(true);
      setError(null);

      try {
        // Use RAG semantic search if mode is 'rag-semantic'
        if (searchMode === "rag-semantic") {
          logger.debug(
            "[DocsSearch] Using RAG semantic search for:",
            debouncedQuery,
          );

          await ragQuery.search(debouncedQuery, {
            collection: collection || "documentation__nomic",
            limit: HYBRID_SEARCH_LIMIT,
            scoreThreshold: 0.7,
          });

          // Check if request was cancelled
          if (controller.signal.aborted) {
            logger.debug("[DocsSearch] RAG search aborted");
            return;
          }

          // Convert RAG results to hybrid format
          if (ragQuery.results.length > 0) {
            const convertedResults = ragQuery.results.map(
              convertRagResultToHybridItem,
            );
            logger.debug(
              "[DocsSearch] RAG search succeeded:",
              convertedResults.length,
              "results",
              {
                performance: ragQuery.performance,
                cached: ragQuery.cached,
              },
            );

            if (mounted.current && !controller.signal.aborted) {
              setResults(convertedResults);
              setLastSearchedQuery(debouncedQuery);
              initialSearchDone.current = true; // ✅ Set after successful search
            }
          } else if (ragQuery.error) {
            throw new Error(ragQuery.error);
          }
        } else {
          // Try hybrid search (semantic + lexical via FlexSearch)
          logger.debug(
            "[DocsSearch] Trying hybrid search for:",
            debouncedQuery,
          );
          const data = await documentationService.docsHybridSearch(
            debouncedQuery,
            {
              alpha,
              limit: HYBRID_SEARCH_LIMIT,
              domain,
              type: dtype,
              status,
              tags,
              collection,
            },
          );

          // Check if request was cancelled
          if (controller.signal.aborted) {
            logger.debug(
              "[DocsSearch] Request aborted (component unmounted or new search)",
            );
            return;
          }

          logger.debug(
            "[DocsSearch] Hybrid search succeeded:",
            data.results.length,
            "results",
            {
              collection: data.collection || collection || "default",
            },
          );

          if (!collection && data.collection) {
            setCollection(data.collection);
          }

          if (mounted.current && !controller.signal.aborted) {
            setResults(data.results);
            setLastSearchedQuery(debouncedQuery);
            initialSearchDone.current = true; // ✅ Set after successful search
          }
        }
      } catch (e) {
        // Check if request was cancelled
        if (controller.signal.aborted) {
          logger.debug("[DocsSearch] Request aborted during error handling");
          return;
        }

        // Fallback to lexical-only search if hybrid fails (Qdrant/Ollama unavailable)
        const errorMsg = e instanceof Error ? e.message : String(e);
        logger.debug("[DocsSearch] Hybrid search failed:", errorMsg);
        logger.debug("[DocsSearch] Attempting lexical fallback...");

        if (
          errorMsg.includes("Qdrant") ||
          errorMsg.includes("Ollama") ||
          errorMsg.includes("timeout") ||
          errorMsg.includes("Hybrid search failed")
        ) {
          try {
            const lexicalData = await documentationService.docsLexicalSearch(
              debouncedQuery,
              {
                limit: HYBRID_SEARCH_LIMIT,
                domain,
                type: dtype,
                status,
                tags,
              },
            );

            // Check if request was cancelled
            if (controller.signal.aborted) {
              logger.debug("[DocsSearch] Lexical fallback aborted");
              return;
            }

            logger.debug(
              "[DocsSearch] Lexical search succeeded:",
              lexicalData.results.length,
              "results",
            );

            if (mounted.current && !controller.signal.aborted) {
              // Convert lexical results to hybrid format
              const convertedResults: DocsHybridItem[] =
                lexicalData.results.map((r) => {
                  // Ensure URL uses proxy prefix for same-origin Docusaurus access
                  let docUrl = r.path;
                  if (!docUrl.startsWith("/docs/")) {
                    docUrl = `/docs/${docUrl.replace(/^\/+/, "")}`;
                  }
                  return {
                    title: r.title,
                    url: docUrl,
                    path: r.path,
                    snippet: r.summary,
                    score: r.score || 0,
                    source: "lexical" as const,
                    components: { semantic: false, lexical: true },
                    tags: r.tags,
                    domain: r.domain,
                    type: r.type,
                    status: r.status,
                  };
                });
              logger.debug(
                "[DocsSearch] Setting",
                convertedResults.length,
                "converted results",
              );
              setResults(convertedResults);
              setLastSearchedQuery(debouncedQuery);
              initialSearchDone.current = true; // ✅ Set after successful search
            }
          } catch (lexErr) {
            if (controller.signal.aborted) {
              logger.debug("[DocsSearch] Lexical error handling aborted");
              return;
            }

            logger.error("[DocsSearch] Lexical search also failed:", lexErr);
            if (mounted.current && !controller.signal.aborted) {
              setError(
                lexErr instanceof Error ? lexErr.message : "Search failed",
              );
            }
          }
        } else {
          logger.error("[DocsSearch] Non-recoverable error:", errorMsg);
          if (mounted.current && !controller.signal.aborted) {
            setError(errorMsg || "Search failed");
          }
        }
      } finally {
        // 🔒 Always reset search flag, even if aborted
        searchInProgress.current = false;

        if (mounted.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    run();

    // Cleanup: abort the request when dependencies change or component unmounts
    return () => {
      controller.abort();
      // 🔒 Reset flag on cleanup to allow new search
      searchInProgress.current = false;
    };
  }, [
    debouncedQuery,
    alpha,
    domain,
    dtype,
    status,
    tags,
    collection,
    searchMode,
  ]);

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
      if (status && (result.status ?? "active") !== status) {
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
        id: "hybrid-config",
        content: (
          <CollapsibleCard cardId="hybrid-config" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>Consulta e ajustes</CollapsibleCardTitle>
              <CollapsibleCardDescription className="flex flex-wrap items-center gap-2">
                <span>
                  Alpha pondera o peso da semântica (Qdrant) vs. lexical
                  (FlexSearch).
                </span>
                <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Coleção ativa:
                  <Badge variant="outline">
                    {collection || "documentation"}
                  </Badge>
                </span>
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                {/* Query + Collection + Search Mode */}
                <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Buscar documentação
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="flex flex-1 gap-2">
                        <Input
                          placeholder="Ex.: docker, workspace api, docusaurus"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && query.trim()) {
                              setQuery((q) => q.trim());
                            }
                            if (e.key === "Escape") {
                              setQuery("");
                              setResults([]);
                            }
                          }}
                          className="flex-1 min-w-[220px]"
                        />
                        <Button
                          onClick={() => setQuery((q) => q.trim())}
                          disabled={!query.trim()}
                          className="w-24"
                        >
                          Buscar
                        </Button>
                      </div>
                      {(query || results.length > 0) && (
                        <Button
                          onClick={() => {
                            setQuery("");
                            setResults([]);
                            setError(null);
                            setLastSearchedQuery("");
                            clearStoredState(collection);
                            ragQuery.clear();
                          }}
                          variant="outline"
                          className="w-full sm:w-24"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <CollectionSelector
                      value={collection}
                      onChange={(next) => setCollection(next)}
                      className="w-full"
                      autoSelectFirst
                    />
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Modo de busca
                      </label>
                      <Select
                        value={searchMode}
                        onValueChange={(value) =>
                          setSearchMode(value as SearchMode)
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o modo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hybrid">
                            {SEARCH_MODE_LABELS.hybrid}
                          </SelectItem>
                          <SelectItem value="rag-semantic">
                            {SEARCH_MODE_LABELS["rag-semantic"]}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Filtros principais */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Domínio
                    </label>
                    <Select
                      value={domain ?? "__all__"}
                      onValueChange={(value) =>
                        setDomain(value === "__all__" ? undefined : value)
                      }
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
                      value={dtype ?? "__all__"}
                      onValueChange={(value) =>
                        setDtype(value === "__all__" ? undefined : value)
                      }
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
                      value={status ?? "__all__"}
                      onValueChange={(value) =>
                        setStatus(value === "__all__" ? undefined : value)
                      }
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
                              arr.filter(
                                (x) => normalizeTag(x) !== normalizedTag,
                              ),
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
                                arr.some(
                                  (existing) =>
                                    normalizeTag(existing) === normalized,
                                )
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
                      Alpha pondera semântica vs. lexical (0% = apenas lexical,
                      100% = apenas semântico)
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
        id: "hybrid-results",
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
                ) : (
                  "Nenhum resultado"
                )}
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <ul className="space-y-3">
                {filteredResults.map((r) => {
                  const normalizedPath = normalizeDocsApiPath(r.url, "next");
                  const fullDocUrl = resolveDocsPreviewUrl(r.url, "next", {
                    absolute: true,
                  });
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
                            title={
                              isExpanded
                                ? "Ocultar prévia inline"
                                : "Mostrar prévia inline"
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                          <Badge variant="outline">
                            score {r.score.toFixed(3)}
                          </Badge>
                          {r.components.semantic && (
                            <Badge variant="outline">semantic</Badge>
                          )}
                          {r.components.lexical && (
                            <Badge variant="outline">lexical</Badge>
                          )}
                          <Button
                            variant="outline"
                            onClick={() =>
                              void navigator.clipboard?.writeText(fullDocUrl)
                            }
                            className="h-8 px-2"
                            title={`Copiar link (${normalizedPath})`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => window.open(fullDocUrl, "_blank")}
                            className="h-8 px-2"
                            title={`Abrir em nova aba (${normalizedPath})`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {r.snippet && (
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                          {r.snippet}
                        </p>
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
                        {r.domain && (
                          <Badge variant="outline">
                            {formatFacetLabel(r.domain)}
                          </Badge>
                        )}
                        {r.type && (
                          <Badge variant="outline">
                            {formatFacetLabel(r.type)}
                          </Badge>
                        )}
                        {r.status && (
                          <Badge variant="outline">
                            {formatStatusLabel(r.status)}
                          </Badge>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40">
                          {inlinePreview?.status === "loading" && (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Carregando prévia…</span>
                            </div>
                          )}
                          {inlinePreview?.status === "error" && (
                            <div className="space-y-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span>
                                  {inlinePreview.error ??
                                    "Falha ao carregar a prévia."}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  fetchDocContent(docPath, docPath)
                                }
                                className="h-8 w-fit"
                              >
                                Tentar novamente
                              </Button>
                            </div>
                          )}
                          {inlinePreview?.status === "ready" && (
                            <div className="max-h-80 overflow-y-auto px-4 py-3">
                              <Suspense
                                fallback={
                                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      Carregando visualizador de markdown…
                                    </span>
                                  </div>
                                }
                              >
                                <MarkdownPreview
                                  content={inlinePreview.content ?? ""}
                                />
                              </Suspense>
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
    collection,
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
        onClose={() =>
          setPreviewModal({ isOpen: false, title: "", url: "", docPath: "" })
        }
        title={previewModal.title}
        url={previewModal.url}
        docPath={previewModal.docPath}
      />
    </>
  );
}
