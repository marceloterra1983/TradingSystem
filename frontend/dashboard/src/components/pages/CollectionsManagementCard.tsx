import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Copy,
  RefreshCw,
  Trash,
  AlertCircle,
} from "@/icons";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CollectionFormDialog } from "./CollectionFormDialog";
import { CollectionDeleteDialog } from "./CollectionDeleteDialog";
import { IngestionLogsViewer } from "./collections/IngestionLogsViewer";
import { CollectionFilesTable } from "./collections/CollectionFilesTable";
import { BatchIngestionProgressModal } from "./collections/BatchIngestionProgressModal";
import type {
  Collection,
  CollectionDialogMode,
  CollectionFormState,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  EmbeddingModel,
} from "../../types/collections";

interface CollectionsManagementCardProps {
  className?: string;
  collections: Collection[];
  models: EmbeddingModel[];
  isLoading: boolean;
  error?: string | null;
  onCreateCollection: (request: CreateCollectionRequest) => Promise<void>;
  onUpdateCollection: (
    name: string,
    updates: UpdateCollectionRequest,
  ) => Promise<void>;
  onCloneCollection: (name: string, newName: string) => Promise<void>;
  onDeleteCollection: (name: string) => Promise<void>;
  onIngestCollection: (name: string) => Promise<void>;
  onRefreshCollections?: () => void;
  onClearError?: () => void;
}

export const CollectionsManagementCard: React.FC<
  CollectionsManagementCardProps
> = ({
  className,
  collections,
  models,
  isLoading,
  error,
  onCreateCollection,
  onUpdateCollection,
  onCloneCollection,
  onDeleteCollection,
  onIngestCollection: _onIngestCollection,
  onRefreshCollections,
  onClearError,
}) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CollectionDialogMode>("create");
  const [selectedCollection, setSelectedCollection] = useState<
    Collection | undefined
  >();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<
    Collection | undefined
  >();
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [viewFilesCollection, setViewFilesCollection] = useState<string | null>(
    null,
  );
  const [filesTableExpanded, setFilesTableExpanded] = useState(true);
  const [filesTableKey, setFilesTableKey] = useState(0); // Force refresh of files table

  // Batch ingestion state
  const [batchIngestionJobId, setBatchIngestionJobId] = useState<string | null>(
    null,
  );
  const [batchIngestionModalOpen, setBatchIngestionModalOpen] = useState(false);
  const [batchIngestionCollection, setBatchIngestionCollection] =
    useState<string>("");

  // Auto-select first collection
  React.useEffect(() => {
    if (collections.length > 0 && !viewFilesCollection) {
      setViewFilesCollection(collections[0].name);
    }
  }, [collections, viewFilesCollection]);

  // Auto-refresh collections every 10 seconds to detect file changes
  // Paused when dialog is open to prevent interference
  React.useEffect(() => {
    if (!onRefreshCollections || dialogOpen) return; // Stop refresh when dialog is open

    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing collections stats...");
      onRefreshCollections();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [onRefreshCollections, dialogOpen]);

  const filteredCollections = useMemo(() => {
    if (!searchTerm) return collections;
    const term = searchTerm.toLowerCase();
    return collections.filter((collection) =>
      [
        collection.name,
        collection.description,
        collection.directory,
        collection.embeddingModel,
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term)),
    );
  }, [collections, searchTerm]);

  const handleCreate = () => {
    setSelectedCollection(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (collection: Collection) => {
    setSelectedCollection(collection);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleClone = (collection: Collection) => {
    setSelectedCollection(collection);
    setDialogMode("clone");
    setDialogOpen(true);
  };

  const handleDelete = (collection: Collection) => {
    setCollectionToDelete(collection);
    setDeleteDialogOpen(true);
  };

  /**
   * Helper to show toast AND persist to backend logs
   */
  const toastAndLog = async (
    level: "info" | "success" | "error" | "warn",
    message: string,
    collectionName: string,
    details?: Record<string, any>,
  ) => {
    // Show toast in UI
    switch (level) {
      case "success":
        toast.success(message, 5000);
        break;
      case "error":
        toast.error(message);
        break;
      case "warn":
        toast.warning(message);
        break;
      default:
        toast.info(message);
    }

    // Persist to backend logs
    try {
      await fetch("/api/v1/rag/ingestion/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          message,
          collection: collectionName,
          details,
        }),
      });
    } catch (error) {
      console.warn("Failed to persist toast log:", error);
    }
  };

  const handleIngest = async (collection: Collection) => {
    try {
      setOperationLoading(`ingest-${collection.name}`);

      const stats = collection.stats;
      const hasOrphans = (stats?.orphanChunks ?? 0) > 0;
      const hasPending = (stats?.pendingFiles ?? 0) > 0;
      const pendingCount = stats?.pendingFiles ?? 0;
      const orphansCount = stats?.orphanChunks ?? 0;

      console.log("🔄 Ingest triggered:", {
        collection: collection.name,
        hasOrphans,
        hasPending,
        pendingCount,
        orphansCount,
      });

      // If nothing to do, exit early
      if (!hasOrphans && !hasPending) {
        await toastAndLog(
          "info",
          "Nenhuma alteração detectada. Todos os arquivos já estão indexados.",
          collection.name,
          { pendingFiles: 0, orphanChunks: 0 },
        );
        console.log("✓ No orphans or pending files to process");
        return;
      }

      // Use batch ingestion for large collections (> 20 files)
      const BATCH_THRESHOLD = 20;
      if (pendingCount > BATCH_THRESHOLD) {
        console.log(
          `📦 Large collection detected (${pendingCount} files), using batch ingestion`,
        );

        await toastAndLog(
          "info",
          `Iniciando ingestão em lote: ${pendingCount} arquivo(s). Processando em blocos para evitar travamentos...`,
          collection.name,
          { pendingFiles: pendingCount, batchMode: true },
        );

        try {
          const response = await fetch(
            `${import.meta.env.VITE_RAG_SERVICE_URL || "/api/v1/rag"}/ingestion/batch/${collection.name}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batchSize: 10 }),
            },
          );

          if (!response.ok) {
            throw new Error(`Batch ingestion failed: ${response.statusText}`);
          }

          const data = await response.json();
          if (data.success) {
            setBatchIngestionJobId(data.data.jobId);
            setBatchIngestionCollection(collection.name);
            setBatchIngestionModalOpen(true);

            await toastAndLog(
              "success",
              `Ingestão em lote iniciada! ${data.data.totalFiles} arquivo(s) em ${data.data.estimatedBatches} lote(s).`,
              collection.name,
              { jobId: data.data.jobId, totalFiles: data.data.totalFiles },
            );
          }
        } catch (error) {
          console.error("❌ Batch ingestion failed:", error);
          await toastAndLog(
            "error",
            `Falha ao iniciar ingestão em lote: ${error instanceof Error ? error.message : "Unknown error"}`,
            collection.name,
            { error: error instanceof Error ? error.message : "Unknown error" },
          );
        } finally {
          setOperationLoading(null);
        }
        return;
      }

      // Show informative toast with estimated time
      const estimatedSeconds = (orphansCount > 0 ? 2 : 0) + pendingCount * 2;
      await toastAndLog(
        "info",
        `Iniciando ingestão: ${pendingCount} arquivo(s) pendente(s)${hasOrphans ? ` + ${orphansCount} chunk(s) órfão(s)` : ""}. ` +
          `Tempo estimado: ~${estimatedSeconds}s.`,
        collection.name,
        {
          pendingFiles: pendingCount,
          orphanChunks: orphansCount,
          estimatedSeconds,
        },
      );

      // Step 1: Clean orphans first
      if (hasOrphans) {
        console.log(`🧹 Limpando ${orphansCount} chunk(s) órfão(s)...`);
        await toastAndLog(
          "info",
          `🧹 Limpando ${orphansCount} chunk(s) órfão(s)...`,
          collection.name,
          { orphanChunks: orphansCount },
        );

        try {
          const cleanStart = Date.now();
          const cleanResponse = await fetch(
            `/api/v1/rag/collections/${collection.name}/clean-orphans`,
            {
              method: "POST",
            },
          );
          const cleanData = await cleanResponse.json();
          const cleanDuration = Date.now() - cleanStart;

          if (cleanData.success) {
            const cleaned = cleanData.data?.deletedChunks || orphansCount;
            console.log(
              `✓ Órfãos limpos em ${cleanDuration}ms:`,
              cleanData.data,
            );
            await toastAndLog(
              "success",
              `✅ ${cleaned} chunk(s) órfão(s) removido(s) (${(cleanDuration / 1000).toFixed(1)}s)`,
              collection.name,
              { deletedChunks: cleaned, durationSeconds: cleanDuration / 1000 },
            );

            // Refresh stats to update UI
            if (onRefreshCollections) {
              onRefreshCollections();
            }
          }
        } catch (error) {
          console.error("Failed to clean orphans:", error);
          await toastAndLog(
            "error",
            "Erro ao limpar chunks órfãos",
            collection.name,
            { error: error instanceof Error ? error.message : "Unknown error" },
          );
        }
      }

      // Step 2: Index pending files
      if (hasPending) {
        console.log(`📥 Indexando ${pendingCount} arquivo(s) pendente(s)...`);
        console.log(`⏱️  Estimativa: ~${pendingCount * 2}s (com GPU RTX 5090)`);
        await toastAndLog(
          "info",
          `📚 Indexando ${pendingCount} arquivo(s) pendente(s)... Tempo estimado: ~${pendingCount * 2}s`,
          collection.name,
          { pendingFiles: pendingCount, estimatedSeconds: pendingCount * 2 },
        );

        const ingestStart = Date.now();

        try {
          const response = await fetch(
            `/api/v1/rag/collections/${collection.name}/ingest`,
            {
              method: "POST",
            },
          );
          const result = await response.json();

          const ingestDuration = Date.now() - ingestStart;

          // Extract details from response
          const filesProcessed =
            result.data?.job?.files_ingested ||
            (result.data?.job?.message?.match(/indexed (\d+) files/) ||
              [])[1] ||
            pendingCount;
          const chunksCreated =
            result.data?.job?.chunks_generated ||
            (result.data?.job?.message?.match(/with (\d+) chunks/) || [])[1] ||
            0;

          // filesProcessed is total files scanned, NOT new files
          // We need to show ONLY new files indexed
          const newFiles = pendingCount; // We know how many were pending
          const newChunks = chunksCreated; // Chunks created are new

          console.log(
            `✅ Ingestão concluída em ${ingestDuration}ms (${(ingestDuration / 1000).toFixed(2)}s)`,
          );
          console.log(`   📄 Arquivos NOVOS indexados: ${newFiles}`);
          console.log(`   🗄️  Chunks NOVOS criados: ${newChunks}`);
          console.log(
            `   ⚡ Throughput: ${(filesProcessed / (ingestDuration / 1000)).toFixed(1)} arquivos/segundo`,
          );
          console.log(
            `   🎯 Performance: ${(chunksCreated / (ingestDuration / 1000)).toFixed(1)} chunks/segundo`,
          );

          // Show ONLY new files in toast
          const successMessage =
            newFiles > 0
              ? `${newFiles} arquivo(s) NOVO(S) indexado(s) • ${newChunks} chunks NOVOS`
              : `Nenhum arquivo novo (${filesProcessed} total verificados)`;

          await toastAndLog(
            "success",
            `✅ Ingestão concluída! ${successMessage}`,
            collection.name,
            {
              newFiles,
              newChunks,
              filesProcessed,
              durationSeconds: ingestDuration / 1000,
              throughputFilesPerSecond: (
                filesProcessed /
                (ingestDuration / 1000)
              ).toFixed(1),
              throughputChunksPerSecond: (
                chunksCreated /
                (ingestDuration / 1000)
              ).toFixed(1),
            },
          );

          // Trigger parent's onIngestCollection for any additional cleanup
          // (but we already called the API directly above)
        } catch (error) {
          const ingestDuration = Date.now() - ingestStart;
          console.error("❌ Ingestion failed:", error);
          console.log(
            `   ⏱️  Failed after: ${(ingestDuration / 1000).toFixed(2)}s`,
          );

          await toastAndLog(
            "error",
            `❌ Falha na ingestão após ${(ingestDuration / 1000).toFixed(1)}s`,
            collection.name,
            {
              error: error instanceof Error ? error.message : "Unknown error",
              durationSeconds: ingestDuration / 1000,
            },
          );

          throw error;
        }
      }

      // Final refresh
      if (onRefreshCollections) {
        setTimeout(() => {
          onRefreshCollections();
        }, 2000);
      }

      console.log("✓ Ingest process completed");
    } catch (error) {
      console.error("Ingest process error:", error);
      // Error toast já foi mostrado acima
    } finally {
      setOperationLoading(null);
    }
  };

  const handleFormSubmit = async (data: CollectionFormState) => {
    if (dialogMode === "create") {
      const request: CreateCollectionRequest = {
        name: data.name,
        description: data.description,
        directory: data.directory,
        embeddingModel: data.embeddingModel,
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
        fileTypes: data.fileTypes,
        recursive: data.recursive,
        enabled: data.enabled,
        autoUpdate: data.autoUpdate,
      };
      await onCreateCollection(request);
    } else if (dialogMode === "edit" && selectedCollection) {
      const updates: UpdateCollectionRequest = {
        description: data.description,
        // directory is immutable - cannot be changed after creation
        // embeddingModel is immutable - cannot be changed after creation
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
        fileTypes: data.fileTypes,
        recursive: data.recursive,
        enabled: data.enabled,
        autoUpdate: data.autoUpdate,
      };
      await onUpdateCollection(selectedCollection.name, updates);
      // Force refresh of files table after updating collection
      setFilesTableKey((prev) => prev + 1);
    } else if (dialogMode === "clone" && selectedCollection) {
      await onCloneCollection(selectedCollection.name, data.name);
    }

    setDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;
    await onDeleteCollection(collectionToDelete.name);
    setDeleteDialogOpen(false);
    setCollectionToDelete(undefined);
  };

  const truncate = (text: string, maxLength: number) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}…` : text;

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Coleções</h3>
          <Badge variant="outline">{collections.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {onRefreshCollections && (
            <Button
              onClick={async () => {
                console.log("🔄 Manual refresh button clicked");
                console.log(
                  "📊 Current collections count:",
                  collections.length,
                );
                await onRefreshCollections();
                console.log("✓ Refresh completed");
              }}
              size="sm"
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          )}
          <Button onClick={handleCreate} size="sm" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Coleção
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          {onClearError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearError}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          )}
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar coleções..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading && collections.length === 0 && (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-600" />
          <p className="mt-2 text-sm text-slate-500">Carregando coleções...</p>
        </div>
      )}

      {!isLoading && collections.length === 0 && (
        <div className="py-8 text-center">
          <p className="mb-4 text-slate-500">Nenhuma coleção encontrada</p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira coleção
          </Button>
        </div>
      )}

      {collections.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coleção</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Diretório</TableHead>
                <TableHead className="text-right">Arquivos</TableHead>
                <TableHead className="text-right">Indexados</TableHead>
                <TableHead className="text-right">Pendentes</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">Órfãos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-slate-500"
                  >
                    Nenhuma coleção corresponde à busca &quot;{searchTerm}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                filteredCollections.map((collection) => {
                  const stats = collection.stats ?? null;
                  const chunkCount =
                    stats?.chunkCount ??
                    stats?.pointsCount ??
                    stats?.vectorsCount ??
                    0;
                  const totalFiles = stats?.totalFiles ?? 0;
                  const indexedFiles = stats?.indexedFiles ?? 0;
                  const orphanChunks = stats?.orphanChunks ?? 0;
                  const pendingFiles = stats?.pendingFiles ?? 0;
                  const directorySizeMB = stats?.directorySizeMB ?? 0;
                  const isRunning =
                    operationLoading === `ingest-${collection.name}`;

                  return (
                    <TableRow
                      key={collection.name}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => {
                        console.log(
                          "🖱️ Collection row clicked:",
                          collection.name,
                        );
                        setViewFilesCollection(collection.name);
                      }}
                    >
                      <TableCell className="align-middle">
                        <div className="space-y-1">
                          <p className="font-medium">{collection.name}</p>
                          <p className="text-xs text-slate-500">
                            {truncate(collection.description, 80)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant="outline">
                          {collection.embeddingModel}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle text-xs text-slate-500">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {truncate(collection.directory, 30)}
                                {directorySizeMB > 0 && (
                                  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                                    ({directorySizeMB.toFixed(1)} MB)
                                  </span>
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{collection.directory}</p>
                              {directorySizeMB > 0 && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Tamanho: {directorySizeMB.toFixed(2)} MB
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="align-middle text-right font-mono text-sm">
                        {totalFiles.toLocaleString()}
                      </TableCell>
                      <TableCell className="align-middle text-right font-mono text-sm text-green-600 dark:text-green-400">
                        {indexedFiles.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`align-middle text-right font-mono text-sm ${pendingFiles > 0 ? "text-amber-600 font-semibold" : ""}`}
                      >
                        {pendingFiles.toLocaleString()}
                      </TableCell>
                      <TableCell className="align-middle text-right font-mono text-sm text-blue-600 dark:text-blue-400">
                        {chunkCount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`align-middle text-right font-mono text-sm ${orphanChunks > 0 ? "text-orange-600 font-semibold" : ""}`}
                      >
                        {orphanChunks.toLocaleString()}
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30"
                                  onClick={() => handleEdit(collection)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar coleção</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30"
                                  onClick={() => handleClone(collection)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Clonar coleção</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
                                  onClick={() => handleIngest(collection)}
                                  disabled={isRunning}
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isRunning
                                  ? "Ingestão em andamento..."
                                  : "Executar ingestão"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                                  onClick={() => handleDelete(collection)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deletar coleção</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Collection Files Table - Always Visible */}
      {viewFilesCollection && (
        <div className="mt-6">
          <CollectionFilesTable
            key={`${viewFilesCollection}-${filesTableKey}`}
            collectionName={viewFilesCollection}
            collectionDirectory={
              collections.find((c) => c.name === viewFilesCollection)
                ?.directory || ""
            }
            collectionModel={
              collections.find((c) => c.name === viewFilesCollection)
                ?.embeddingModel || ""
            }
            directorySizeMB={
              collections.find((c) => c.name === viewFilesCollection)?.stats
                ?.directorySizeMB || 0
            }
            onClose={() => setFilesTableExpanded(!filesTableExpanded)}
            isExpanded={filesTableExpanded}
            onChangeCollection={setViewFilesCollection}
            availableCollections={collections.map((c) => ({
              name: c.name,
              label: c.name,
            }))}
          />
        </div>
      )}

      {/* Ingestion Logs Viewer - Collapsible */}
      {collections.length > 0 && (
        <div className="mt-6">
          <IngestionLogsViewer
            collectionFilter={searchTerm || "all"}
            refreshInterval={5000}
            maxLogs={100}
          />
        </div>
      )}

      <CollectionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleFormSubmit}
        mode={dialogMode}
        collection={selectedCollection}
        models={models}
        isLoading={isLoading}
      />

      {collectionToDelete && (
        <CollectionDeleteDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          collection={collectionToDelete}
        />
      )}

      {/* Batch Ingestion Progress Modal */}
      <BatchIngestionProgressModal
        isOpen={batchIngestionModalOpen}
        onClose={() => {
          setBatchIngestionModalOpen(false);
          setBatchIngestionJobId(null);
          // Refresh collections after closing modal
          if (onRefreshCollections) {
            onRefreshCollections();
          }
        }}
        jobId={batchIngestionJobId}
        collectionName={batchIngestionCollection}
      />
    </div>
  );
};

export default CollectionsManagementCard;
