import React from "react";
import {
  RefreshCcw,
  Play,
  Trash2,
  FileText,
  Plus,
  FolderOpen,
} from '@/icons';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface LlamaIndexServiceStatus {
  ok: boolean;
  status: number;
  message: string;
  collection?: string;
}

export interface LlamaIndexCollectionInfo {
  name: string;
  count: number | null;
  aliasOf?: string | null;
  embeddingModel?: string | null;
  sourceDirectory?: string | null;
  exists?: boolean;
}

export interface LlamaIndexStatusResponse {
  timestamp: string;
  requestedCollection?: string;
  services: {
    query: LlamaIndexServiceStatus;
    ingestion: LlamaIndexServiceStatus;
  };
  qdrant: {
    collection: string;
    activeCollection?: string | null;
    ok: boolean;
    status: number;
    count: number | null;
    sample: string[];
  };
  collections?: LlamaIndexCollectionInfo[];
  gpuPolicy?: { [key: string]: unknown };
  documentation?: {
    docsDirectory?: string;
    totalDocuments?: number;
    indexedDocuments?: number;
    missingDocuments?: number;
    missingSample?: string[];
    indexedSample?: string[];
    error?: string;
    indexedScanTruncated?: boolean;
    collection?: string;
    indexedUniqueDocuments?: number;
    indexedUniqueSample?: string[];
    allFilesList?: Array<{ path: string; size: number }>;
    orphanChunks?: number;
    orphanSample?: string[];
  };
}

export interface LlamaIndexIngestionResult {
  success?: boolean;
  message?: string;
  documents_processed?: number;
  documents_loaded?: number;
  chunks_generated?: number;
  files_considered?: number;
  files_ingested?: number;
  files_skipped?: number;
  skipped_by_extension?: number;
  skipped_by_size?: number;
  skipped_files_size?: string[];
  skipped_hidden?: number;
  collection?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  largest_files?: string[];
  errors?: unknown;
  gpu?: Record<string, unknown>;
}

export interface CollectionDocumentStats {
  total: number | null;
  indexed: number | null;
  missing: number | null;
  orphans: number | null;
  chunks: number | null; // Total chunks in Qdrant (different from unique documents indexed)
}

export interface CollectionLogState {
  lines: string[];
  status: "idle" | "running" | "success" | "error";
  visible: boolean;
  lastUpdated: number;
}

type ModelOption = {
  name: string;
  displayName?: string;
  dimensions?: number | null;
  provider?: string;
  description?: string;
};

interface LlamaIndexIngestionStatusCardProps {
  data: LlamaIndexStatusResponse | null;
  loading: boolean;
  error: string | null;
  ingesting: boolean;
  ingestionMessage: string | null;
  lastIngestion?: LlamaIndexIngestionResult | null;
  onRefresh: () => void;
  onRunIngest: (collection: string) => void | Promise<void>;
  onCleanOrphans: (collection: string) => void | Promise<void>;
  onCreateCollection: (
    collectionName: string,
    embeddingModel: string,
    sourceDirectory: string,
    dimensions?: number | null,
  ) => void | Promise<void>;
  cleaningOrphans: boolean;
  collectionOptions: LlamaIndexCollectionInfo[];
  selectedCollection?: string;
  onCollectionChange: (value: string) => void;
  collectionDocStats: Record<string, CollectionDocumentStats>;
  resetCollections: Record<string, boolean>;
  collectionLogs: Record<string, CollectionLogState>;
  onToggleLog: (collection: string) => void;
  deletingCollections: Record<string, boolean>;
  onDeleteCollection: (collection: string) => void;
  creatingCollection?: boolean;
}

export function LlamaIndexIngestionStatusCard({
  data,
  loading,
  error,
  ingesting,
  ingestionMessage,
  lastIngestion,
  onRefresh,
  onRunIngest,
  onCleanOrphans,
  onCreateCollection,
  cleaningOrphans,
  collectionOptions,
  selectedCollection,
  onCollectionChange,
  collectionDocStats,
  resetCollections,
  collectionLogs,
  onToggleLog,
  deletingCollections,
  onDeleteCollection,
  creatingCollection = false,
}: LlamaIndexIngestionStatusCardProps): JSX.Element {
  const HIDDEN_COLLECTIONS = React.useMemo(() => new Set(["repository"]), []);

  // State for create collection dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState("");
  const [availableModels, setAvailableModels] = React.useState<ModelOption[]>(
    [],
  );
  const [selectedModelName, setSelectedModelName] = React.useState("");
  const [selectedModelDimensions, setSelectedModelDimensions] = React.useState<
    number | null
  >(null);
  const [selectedDirectory, setSelectedDirectory] =
    React.useState("docs/content");
  const [loadingModels, setLoadingModels] = React.useState(false);
  const directoryInputRef = React.useRef<HTMLInputElement>(null);

  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the relative path from the first file
      const file = files[0];
      const webkitPath = (file as any).webkitRelativePath;
      if (webkitPath) {
        // Extract directory path (remove filename)
        const parts = webkitPath.split("/");
        parts.pop(); // Remove filename
        const dirPath = parts.join("/") || ".";
        setSelectedDirectory(dirPath);
      }
    }
  };

  // Fetch available models when dialog opens
  React.useEffect(() => {
    if (createDialogOpen && availableModels.length === 0) {
      setLoadingModels(true);
      fetch("/api/v1/rag/collections/models")
        .then((res) => res.json())
        .then((data) => {
          const configuredModels = Array.isArray(data.configured)
            ? data.configured
            : [];
          const configuredLookup = new Map<string, any>();
          configuredModels.forEach((cfg: any) => {
            if (!cfg) return;
            const cfgName = typeof cfg.name === "string" ? cfg.name : null;
            const cfgFullName =
              typeof cfg.fullName === "string" ? cfg.fullName : null;
            if (cfgName) configuredLookup.set(cfgName, cfg);
            if (cfgFullName) configuredLookup.set(cfgFullName, cfg);
          });

          const modelsData = data.models || [];
          const modelOptions: ModelOption[] = modelsData.map((model: any) => {
            if (typeof model === "string") {
              return { name: model };
            }
            const name = model.name || model.displayName || String(model);
            const rawDim = model.dimensions;
            let parsedDimensions: number | undefined;
            if (typeof rawDim === "number") {
              parsedDimensions = rawDim;
            } else if (typeof rawDim === "string") {
              const numeric = Number(rawDim);
              if (Number.isFinite(numeric)) {
                parsedDimensions = numeric;
              }
            }
            if (parsedDimensions === undefined) {
              const baseName = name.split(":")[0];
              const candidates = [
                model.fullName,
                model.displayName,
                name,
                `${baseName}:latest`,
                baseName,
              ].filter(Boolean) as string[];
              for (const candidate of candidates) {
                const cfg = configuredLookup.get(candidate);
                if (!cfg) continue;
                const cfgDim = cfg.dimensions;
                const numeric =
                  typeof cfgDim === "number" ? cfgDim : Number(cfgDim);
                if (Number.isFinite(numeric)) {
                  parsedDimensions = Number(numeric);
                  break;
                }
              }
            }
            return {
              name,
              displayName: model.displayName || model.fullName || undefined,
              dimensions: parsedDimensions,
              provider: model.provider,
              description: model.description,
            };
          });
          setAvailableModels(modelOptions);
          if (modelOptions.length > 0) {
            setSelectedModelName(modelOptions[0].name);
            setSelectedModelDimensions(
              typeof modelOptions[0].dimensions === "number"
                ? modelOptions[0].dimensions
                : null,
            );
          }
        })
        .catch((err) => {
          console.error("Failed to fetch models:", err);
          // Fallback models
          const fallbackModels: ModelOption[] = [
            { name: "nomic-embed-text", dimensions: 768 },
            { name: "mxbai-embed-large", dimensions: 384 },
            { name: "embeddinggemma", dimensions: 768 },
          ];
          setAvailableModels(fallbackModels);
          setSelectedModelName(fallbackModels[0].name);
          setSelectedModelDimensions(fallbackModels[0].dimensions ?? null);
        })
        .finally(() => {
          setLoadingModels(false);
        });
    }
  }, [createDialogOpen, availableModels.length]);

  const handleCreateCollection = async () => {
    if (
      !newCollectionName.trim() ||
      !selectedModelName ||
      !selectedDirectory.trim()
    ) {
      return;
    }

    await onCreateCollection(
      newCollectionName.trim(),
      selectedModelName,
      selectedDirectory.trim(),
      selectedModelDimensions ?? undefined,
    );

    // Reset form and close dialog
    setNewCollectionName("");
    if (availableModels.length > 0) {
      setSelectedModelName(availableModels[0].name);
      setSelectedModelDimensions(
        typeof availableModels[0].dimensions === "number"
          ? availableModels[0].dimensions
          : null,
      );
    } else {
      setSelectedModelName("");
      setSelectedModelDimensions(null);
    }
    setSelectedDirectory("docs/content");
    setCreateDialogOpen(false);
  };
  const visibleCollections = React.useMemo(
    () =>
      collectionOptions.filter(
        (item) => !HIDDEN_COLLECTIONS.has(item.name.toLowerCase()),
      ),
    [collectionOptions, HIDDEN_COLLECTIONS],
  );

  const effectiveCollectionValue = (() => {
    if (
      selectedCollection &&
      collectionOptions.some((item) => item.name === selectedCollection)
    ) {
      return selectedCollection;
    }
    return visibleCollections[0]?.name ?? collectionOptions[0]?.name ?? "";
  })();

  const docStats =
    data?.documentation &&
    data.documentation.collection &&
    effectiveCollectionValue &&
    data.documentation.collection.toLowerCase() ===
      effectiveCollectionValue.toLowerCase()
      ? data.documentation
      : data?.documentation?.collection && !effectiveCollectionValue
        ? data.documentation
        : null;

  const statsKey = effectiveCollectionValue
    ? effectiveCollectionValue.toLowerCase()
    : "";
  const docDirectory = docStats?.docsDirectory ?? null;
  const docError = docStats?.error ?? null;
  const docScanTruncated = Boolean(docStats?.indexedScanTruncated);

  const docIndexedSampleRaw = docStats?.indexedSample ?? [];
  // Note: docStats.missingSample and docStats.orphanSample are available but not displayed in current UI
  const docAllFiles = docStats?.allFilesList ?? [];
  const resetAppliedSelected = Boolean(resetCollections[statsKey]);
  const docIndexedSample = resetAppliedSelected ? [] : docIndexedSampleRaw;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Create unified file list with status
  const indexedSet = new Set(docIndexedSample);
  const [sortBy, setSortBy] = React.useState<"path" | "size" | "status">(
    "path",
  );
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );

  const handleSort = (column: "path" | "size" | "status") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const unifiedFileList = React.useMemo(() => {
    const list = docAllFiles.map((file) => ({
      path: file.path,
      size: file.size,
      indexed: indexedSet.has(file.path),
    }));

    return list.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "path") {
        comparison = a.path.localeCompare(b.path);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else if (sortBy === "status") {
        // true (indexed) = 1, false (pendente) = 0
        // ASC: pendente (0) antes de indexed (1)
        // DESC: indexed (1) antes de pendente (0)
        comparison = (a.indexed ? 1 : 0) - (b.indexed ? 1 : 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [docAllFiles, indexedSet, sortBy, sortDirection]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Ingestion Overview
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Última atualização:{" "}
                {data?.timestamp
                  ? new Date(data.timestamp).toLocaleString()
                  : "–"}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Auto-refresh 15s
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading || ingesting}
            className="gap-2"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {ingestionMessage && !error && (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
            {ingestionMessage}
          </div>
        )}

        {!error && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Configuração de ingestão
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cada coleção possui um modelo predefinido. Dispare a
                  vetorização diretamente pela tabela abaixo.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                      Coleções
                    </p>
                    <div className="flex items-center gap-2">
                      {visibleCollections.length > 0 && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {visibleCollections.length}{" "}
                          {visibleCollections.length === 1
                            ? "coleção"
                            : "coleções"}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setCreateDialogOpen(true)}
                        disabled={creatingCollection || ingesting}
                      >
                        <Plus className="h-3 w-3" />
                        Nova Coleção
                      </Button>
                    </div>
                  </div>
                  {visibleCollections.length > 0 ? (
                    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">
                              Coleção
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              Modelo
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              Diretório
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Chunks
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Órfãos
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Doc. total
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Indexados
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Pendentes
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleCollections.map((option) => {
                            const isActive =
                              effectiveCollectionValue &&
                              option.name.toLowerCase() ===
                                effectiveCollectionValue.toLowerCase();
                            const statsKey = option.name.toLowerCase();
                            const docOverview = collectionDocStats[statsKey];
                            const resetApplied = Boolean(
                              resetCollections[statsKey],
                            );
                            const docTotal =
                              docOverview &&
                              typeof docOverview.total === "number"
                                ? docOverview.total
                                : 0;
                            const docIndexedRaw =
                              docOverview &&
                              typeof docOverview.indexed === "number"
                                ? docOverview.indexed
                                : 0;
                            const docMissingRaw =
                              docOverview &&
                              typeof docOverview.missing === "number"
                                ? docOverview.missing
                                : Math.max(docTotal - docIndexedRaw, 0);
                            const docOrphansRaw =
                              docOverview &&
                              typeof docOverview.orphans === "number"
                                ? docOverview.orphans
                                : 0;
                            const docIndexed = resetApplied ? 0 : docIndexedRaw;
                            const docOrphans = resetApplied ? 0 : docOrphansRaw;
                            const docMissing = resetApplied
                              ? docTotal
                              : docMissingRaw;
                            // Use actual Qdrant chunks from collectionDocStats, fallback to option.count or docIndexed
                            const displayChunks =
                              docOverview?.chunks ?? option.count ?? docIndexed;
                            const formatDocValue = (value: number | null) =>
                              typeof value === "number"
                                ? value.toLocaleString()
                                : "—";
                            const logEntry = collectionLogs[statsKey];
                            const logLines = logEntry?.lines ?? [];
                            const logVisible = Boolean(logEntry?.visible);
                            const logHasContent = logLines.length > 0;
                            const deleting = Boolean(
                              deletingCollections[statsKey],
                            );

                            const collectionExists =
                              option.exists ?? docIndexed > 0;

                            return (
                              <tr
                                key={option.name}
                                role="button"
                                tabIndex={0}
                                onClick={() => onCollectionChange(option.name)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    onCollectionChange(option.name);
                                  }
                                }}
                                className={`cursor-pointer border-t border-slate-200 dark:border-slate-700 transition-colors ${
                                  isActive
                                    ? "bg-sky-50 dark:bg-sky-900/30"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                <td className="px-3 py-2 align-middle text-slate-700 dark:text-slate-200">
                                  <div className="flex items-center gap-2 font-medium">
                                    <span>{option.name}</span>
                                    {option.aliasOf && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] uppercase tracking-wide"
                                      >
                                        alias de {option.aliasOf}
                                      </Badge>
                                    )}
                                    {!collectionExists && (
                                      <Badge
                                        variant="destructive"
                                        className="text-[10px] uppercase tracking-wide"
                                      >
                                        ausente
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-500 dark:text-slate-400">
                                  {option.embeddingModel ? (
                                    <Badge variant="outline">
                                      {option.embeddingModel}
                                    </Badge>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-500 dark:text-slate-400">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded cursor-help truncate max-w-[200px] inline-block">
                                        {(option as any).sourceDirectory ||
                                          "docs/content"}
                                      </code>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-mono text-xs">
                                        {(option as any).sourceDirectory ||
                                          "docs/content"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-600 dark:text-slate-300">
                                  {formatDocValue(displayChunks)}
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-600 dark:text-slate-300">
                                  <Badge
                                    variant={
                                      docOrphans > 0 ? "destructive" : "outline"
                                    }
                                  >
                                    {formatDocValue(docOrphans)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-600 dark:text-slate-300">
                                  {formatDocValue(docTotal)}
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-600 dark:text-slate-300">
                                  <Badge variant="outline">
                                    {formatDocValue(docIndexed)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-600 dark:text-slate-300">
                                  <div className="flex items-center justify-end gap-1">
                                    <Badge
                                      variant={
                                        docMissing === 0 ? "default" : "outline"
                                      }
                                    >
                                      {formatDocValue(docMissing)}
                                    </Badge>
                                    {docMissing > 0 && (
                                      <span
                                        className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                                        title="Arquivos pendentes detectados"
                                      ></span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <div className="flex flex-wrap justify-end gap-1">
                                    {docOrphans > 0 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0"
                                            disabled={
                                              cleaningOrphans || ingesting
                                            }
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void onCleanOrphans(option.name);
                                            }}
                                          >
                                            <RefreshCcw
                                              className={`h-4 w-4 text-red-600 dark:text-red-400 ${cleaningOrphans && isActive ? "animate-spin" : ""}`}
                                            />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {cleaningOrphans && isActive
                                            ? "Limpando órfãos..."
                                            : `Limpar ${docOrphans} órfão${docOrphans > 1 ? "s" : ""}`}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          disabled={
                                            ingesting ||
                                            visibleCollections.length === 0
                                          }
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void onRunIngest(option.name);
                                          }}
                                        >
                                          <Play
                                            className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"} ${ingesting && isActive ? "animate-pulse" : ""}`}
                                          />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {ingesting && isActive
                                          ? "Vetorizando..."
                                          : "Iniciar ingestão"}
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          disabled={
                                            deleting ||
                                            ingesting ||
                                            cleaningOrphans
                                          }
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onDeleteCollection(option.name);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {deleting
                                          ? "Apagando..."
                                          : "Apagar coleção"}
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onToggleLog(option.name);
                                          }}
                                        >
                                          <FileText
                                            className={`h-4 w-4 ${logVisible ? "text-blue-600 dark:text-blue-400" : logHasContent ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"}`}
                                          />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {logHasContent
                                          ? logVisible
                                            ? "Ocultar log"
                                            : "Mostrar log"
                                          : "Nenhum log disponível"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nenhuma coleção foi retornada pelo serviço de ingestão.
                    </p>
                  )}

                  {visibleCollections.map((option) => {
                    const statsKey = option.name.toLowerCase();
                    const logEntry = collectionLogs[statsKey];
                    if (
                      !logEntry ||
                      !logEntry.visible ||
                      logEntry.lines.length === 0
                    ) {
                      return null;
                    }
                    const statusLabel =
                      logEntry.status === "running"
                        ? "Em execução"
                        : logEntry.status === "success"
                          ? "Concluído"
                          : logEntry.status === "error"
                            ? "Erro"
                            : "Aguardando";
                    const statusColor =
                      logEntry.status === "running"
                        ? "text-amber-400"
                        : logEntry.status === "success"
                          ? "text-emerald-400"
                          : logEntry.status === "error"
                            ? "text-red-400"
                            : "text-slate-400";

                    return (
                      <div
                        key={`${option.name}-log-panel`}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-950 text-lime-300"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-lime-200">
                              {option.name}
                            </span>
                            <span
                              className={`text-[11px] uppercase ${statusColor}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>
                              Atualizado em{" "}
                              {new Date(
                                logEntry.lastUpdated,
                              ).toLocaleTimeString()}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-lime-300"
                              onClick={() => onToggleLog(option.name)}
                            >
                              Fechar
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto px-3 py-2">
                          <pre className="whitespace-pre-wrap break-words text-[11px] font-mono leading-relaxed">
                            {logEntry.lines.join("\n")}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(docDirectory || docScanTruncated) && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  {docDirectory && (
                    <p>
                      Diretório monitorado:{" "}
                      <code className="bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px] break-all">
                        {docDirectory}
                      </code>
                    </p>
                  )}
                  {docScanTruncated && !docError && (
                    <p className="text-amber-600 dark:text-amber-400">
                      * Amostra truncada para coleções extensas.
                    </p>
                  )}
                </div>
              )}

              {docError && (
                <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                  {docError}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-3 space-y-3">
              {unifiedFileList.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      📁 Todos os Arquivos ({unifiedFileList.length})
                    </p>
                    <div className="flex gap-2 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {unifiedFileList.filter((f) => f.indexed).length}{" "}
                          indexados
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {unifiedFileList.filter((f) => !f.indexed).length}{" "}
                          pendentes
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left p-2 font-semibold text-slate-600 dark:text-slate-300">
                            #
                          </th>
                          <th
                            className="text-left p-2 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 select-none"
                            onClick={() => handleSort("path")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Arquivo</span>
                              {sortBy === "path" && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {sortDirection === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="text-right p-2 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 select-none"
                            onClick={() => handleSort("size")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Tamanho</span>
                              {sortBy === "size" && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {sortDirection === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="text-center p-2 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 select-none"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Status</span>
                              {sortBy === "status" && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {sortDirection === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {unifiedFileList.map((file, idx) => (
                          <tr
                            key={`unified-${idx}`}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="p-2 text-slate-500 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="p-2 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                              {file.path}
                            </td>
                            <td className="p-2 text-right">
                              <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                {formatFileSize(file.size)}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              {file.indexed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Indexado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p className="text-sm">Nenhum arquivo encontrado.</p>
                  <p className="text-xs mt-1">
                    Selecione uma coleção para visualizar os arquivos.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {lastIngestion && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Última ingestão
              </p>
              {lastIngestion.embedding_model && (
                <Badge variant="outline">{lastIngestion.embedding_model}</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lastIngestion.message ||
                (lastIngestion.success
                  ? "Ingestão concluída."
                  : "Ingestão executada.")}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              {typeof lastIngestion.documents_loaded === "number" ? (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastIngestion.documents_loaded}
                  </span>{" "}
                  documentos carregados
                </div>
              ) : null}
              {typeof lastIngestion.chunks_generated === "number" ? (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastIngestion.chunks_generated}
                  </span>{" "}
                  fragmentos indexados
                </div>
              ) : typeof lastIngestion.documents_processed === "number" ? (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastIngestion.documents_processed}
                  </span>{" "}
                  documentos processados
                </div>
              ) : null}
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {lastIngestion.files_ingested ?? 0}
                </span>{" "}
                arquivos ingeridos
              </div>
              {typeof lastIngestion.files_considered === "number" && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastIngestion.files_considered}
                  </span>{" "}
                  arquivos considerados
                </div>
              )}
              {typeof lastIngestion.files_skipped === "number" && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lastIngestion.files_skipped}
                  </span>{" "}
                  arquivos ignorados
                </div>
              )}
            </div>
            {(typeof lastIngestion.chunk_size === "number" ||
              typeof lastIngestion.chunk_overlap === "number") && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chunking: tamanho {lastIngestion.chunk_size ?? "–"} • overlap{" "}
                {lastIngestion.chunk_overlap ?? "–"}
              </p>
            )}
            {lastIngestion.skipped_files_size?.length ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600 dark:text-slate-200">
                  Arquivos ignorados por tamanho
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {lastIngestion.skipped_files_size
                    .slice(0, 5)
                    .map((item, idx) => (
                      <li key={`skipped-size-${idx}`} className="truncate">
                        {item}
                      </li>
                    ))}
                  {lastIngestion.skipped_files_size.length > 5 && <li>…</li>}
                </ul>
              </div>
            ) : null}
            {lastIngestion.largest_files?.length ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600 dark:text-slate-200">
                  Maiores arquivos analisados
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {lastIngestion.largest_files.slice(0, 5).map((item, idx) => (
                    <li key={`largest-${idx}`} className="truncate">
                      {item}
                    </li>
                  ))}
                  {lastIngestion.largest_files.length > 5 && <li>…</li>}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Coleção</DialogTitle>
            <DialogDescription>
              Crie uma nova coleção vetorial com um modelo de embedding
              específico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="collection-name">Nome da Coleção</Label>
              <Input
                id="collection-name"
                placeholder="ex: documentation__mistral"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                disabled={creatingCollection}
                className="col-span-3"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use formato:{" "}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  nome__modelo
                </code>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="embedding-model">Modelo de Embedding</Label>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Carregando modelos...
                </div>
              ) : (
                <Select
                  value={selectedModelName}
                  onValueChange={(value) => {
                    setSelectedModelName(value);
                    const modelInfo = availableModels.find(
                      (m) => m.name === value,
                    );
                    setSelectedModelDimensions(
                      typeof modelInfo?.dimensions === "number" &&
                        Number.isFinite(modelInfo.dimensions)
                        ? modelInfo.dimensions
                        : null,
                    );
                  }}
                  disabled={creatingCollection || availableModels.length === 0}
                >
                  <SelectTrigger id="embedding-model">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.displayName || model.name}
                        {typeof model.dimensions === "number"
                          ? ` (${model.dimensions} dims)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {availableModels.length === 0 && !loadingModels && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Nenhum modelo disponível. Verifique se o Ollama está rodando.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source-directory">
                Diretório de Monitoramento
              </Label>
              <div className="flex gap-2">
                <Input
                  id="source-directory"
                  placeholder="ex: docs/content/api"
                  value={selectedDirectory}
                  onChange={(e) => setSelectedDirectory(e.target.value)}
                  disabled={creatingCollection}
                  className="flex-1"
                />
                <input
                  ref={directoryInputRef}
                  type="file"
                  // @ts-ignore - webkitdirectory is not in TS types but is widely supported
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  onChange={handleDirectorySelect}
                  style={{ display: "none" }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => directoryInputRef.current?.click()}
                  disabled={creatingCollection}
                  className="gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Selecionar
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Digite o caminho ou clique em "Selecionar" para escolher uma
                pasta do seu computador.
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sugestões:
                </span>
                {[
                  "docs/content",
                  "docs/content/api",
                  "frontend",
                  "backend",
                  ".",
                ].map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setSelectedDirectory(dir)}
                    disabled={creatingCollection}
                  >
                    {dir === "." ? "📁 Raiz" : `📁 ${dir}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingCollection}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={
                !newCollectionName.trim() ||
                !selectedModelName ||
                !selectedDirectory.trim() ||
                creatingCollection
              }
            >
              {creatingCollection ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Coleção"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default LlamaIndexIngestionStatusCard;
