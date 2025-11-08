import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type SortField =
  | "path"
  | "extension"
  | "sizeBytes"
  | "chunkCount"
  | "status"
  | "lastModified";
type SortDirection = "asc" | "desc";

interface CollectionFile {
  path: string;
  sizeBytes: number;
  chunkCount: number;
  status: "indexed" | "pending" | "orphan" | "error";
  lastModified: string;
}

interface FileSummary {
  totalFiles: number;
  totalChunks: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  avgChunksPerFile: number;
  avgFileSizeKB: number;
}

interface CollectionFilesResponse {
  success: boolean;
  data: {
    files: CollectionFile[];
    summary: FileSummary;
  };
}

interface CollectionFilesTableProps {
  collectionName: string;
  collectionDirectory?: string;
  collectionModel?: string;
  directorySizeMB?: number;
  onClose: () => void;
  isExpanded?: boolean;
  onChangeCollection?: (collectionName: string) => void;
  availableCollections?: Array<{ name: string; label: string }>;
}

// Helper functions defined outside component to avoid re-creation
const getFileName = (path: string): string => {
  const parts = path.split("/");
  return parts[parts.length - 1];
};

const getFileExtension = (path: string): string => {
  const fileName = getFileName(path);
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) return "";
  return fileName.substring(lastDotIndex + 1).toLowerCase();
};

const getRelativePath = (fullPath: string): string => {
  // Remove the base path and show relative path from collection directory
  const parts = fullPath.split("/");
  // Find the index of 'content' and take everything after it
  const contentIndex = parts.indexOf("content");
  if (contentIndex !== -1 && contentIndex < parts.length - 1) {
    return parts.slice(contentIndex + 1).join("/");
  }
  // Fallback: show last 3 parts
  return parts.slice(-3).join("/");
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const CollectionFilesTable: React.FC<CollectionFilesTableProps> = ({
  collectionName,
  collectionDirectory = "",
  collectionModel = "",
  directorySizeMB = 0,
  onClose,
  isExpanded = true,
  onChangeCollection,
  availableCollections = [],
}) => {
  const [files, setFiles] = useState<CollectionFile[]>([]);
  const [summary, setSummary] = useState<FileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("path");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/rag/collections/${collectionName}/files`,
      );
      const data: CollectionFilesResponse = await response.json();

      if (data.success) {
        setFiles(data.data.files);
        setSummary(data.data.summary);
      } else {
        setError("Failed to load files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [collectionName]);

  // Filtering and Sorting
  const filteredAndSortedFiles = useMemo(() => {
    // First filter
    let filtered = files;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = files.filter((file) => {
        const relativePath = getRelativePath(file.path).toLowerCase();
        const fileName = getFileName(file.path).toLowerCase();
        return relativePath.includes(term) || fileName.includes(term);
      });
    }

    // Then sort
    const sorted = [...filtered];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "path":
          comparison = getRelativePath(a.path).localeCompare(
            getRelativePath(b.path),
          );
          break;
        case "extension":
          const extA = getFileExtension(a.path);
          const extB = getFileExtension(b.path);
          comparison = extA.localeCompare(extB);
          break;
        case "sizeBytes":
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        case "chunkCount":
          comparison = a.chunkCount - b.chunkCount;
          break;
        case "status":
          // Order: indexed < pending < orphan < error
          const statusOrder = { indexed: 1, pending: 2, orphan: 3, error: 4 };
          comparison =
            (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case "lastModified":
          comparison =
            new Date(a.lastModified).getTime() -
            new Date(b.lastModified).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [files, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      indexed: {
        badge: (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-1.5 py-0"
          >
            ✓
          </Badge>
        ),
        tooltip: "Arquivo indexado com sucesso",
      },
      pending: {
        badge: (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs px-1.5 py-0"
          >
            ⏳
          </Badge>
        ),
        tooltip: "Aguardando indexação",
      },
      orphan: {
        badge: (
          <Badge
            variant="destructive"
            className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs px-1.5 py-0"
          >
            👻
          </Badge>
        ),
        tooltip: "Arquivo deletado mas ainda indexado",
      },
      error: {
        badge: (
          <Badge variant="destructive" className="text-xs px-1.5 py-0">
            ✗
          </Badge>
        ),
        tooltip: "Erro ao indexar",
      },
    };

    const config = badges[status as keyof typeof badges];
    if (!config) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{config.badge}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-sm border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">
            Carregando arquivos...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-6 bg-gradient-to-br from-red-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-sm border border-red-200 dark:border-red-700">
        <div className="text-sm text-red-600 dark:text-red-400 mb-3">
          Erro: {error}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchFiles}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
          <Button onClick={onClose} variant="ghost" size="sm" className="h-8">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header - Always Visible */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex items-center gap-3">
            {availableCollections.length > 0 && onChangeCollection ? (
              <Select value={collectionName} onValueChange={onChangeCollection}>
                <SelectTrigger className="h-8 w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCollections.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {collectionName}
              </h3>
            )}
            {collectionDirectory && (
              <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                {collectionDirectory}
                {directorySizeMB > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-500">
                    ({directorySizeMB.toFixed(1)} MB)
                  </span>
                )}
              </span>
            )}
            {collectionModel && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {collectionModel}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchFiles}
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Summary Stats - Compact Inline */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded px-3 py-2">
            {summary && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Arquivos:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {summary.totalFiles}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Indexados:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {files.filter((f) => f.status === "indexed").length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Pendentes:</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {files.filter((f) => f.status === "pending").length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Chunks:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {summary.totalChunks.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Órfãos:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {files.filter((f) => f.status === "orphan").length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Média:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {summary.avgChunksPerFile} chunks/arq
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Files Table with Scroll */}
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableHead className="w-10 text-center text-xs font-semibold py-2">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-2">
                      <button
                        onClick={() => handleSort("path")}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        Arquivo
                        {getSortIcon("path")}
                      </button>
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2 w-20">
                      <button
                        onClick={() => handleSort("extension")}
                        className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors mx-auto"
                      >
                        Ext
                        {getSortIcon("extension")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold py-2">
                      <button
                        onClick={() => handleSort("sizeBytes")}
                        className="flex items-center justify-end gap-1 hover:text-blue-600 transition-colors ml-auto"
                      >
                        Tamanho
                        {getSortIcon("sizeBytes")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold py-2">
                      <button
                        onClick={() => handleSort("chunkCount")}
                        className="flex items-center justify-end gap-1 hover:text-blue-600 transition-colors ml-auto"
                      >
                        Chunks
                        {getSortIcon("chunkCount")}
                      </button>
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors mx-auto"
                      >
                        Status
                        {getSortIcon("status")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold py-2">
                      <button
                        onClick={() => handleSort("lastModified")}
                        className="flex items-center justify-end gap-1 hover:text-blue-600 transition-colors ml-auto"
                      >
                        Modificado
                        {getSortIcon("lastModified")}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedFiles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm"
                      >
                        {searchTerm
                          ? `Nenhum arquivo encontrado para "${searchTerm}"`
                          : "Nenhum arquivo indexado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedFiles.map((file, index) => {
                      const extension = getFileExtension(file.path);
                      return (
                        <TableRow
                          key={index}
                          className="border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell className="text-center text-xs text-gray-400 font-mono py-1">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs py-1">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate" title={file.path}>
                                  {getRelativePath(file.path)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-1">
                            {extension ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                .{extension}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs py-1 text-gray-700 dark:text-gray-300">
                            {formatBytes(file.sizeBytes)}
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
                              {file.chunkCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-1">
                            {getStatusBadge(file.status)}
                          </TableCell>
                          <TableCell className="text-right text-xs py-1 text-gray-500 dark:text-gray-400">
                            {new Date(file.lastModified).toLocaleDateString(
                              "pt-BR",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer Info */}
          {searchTerm && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
              {filteredAndSortedFiles.length} arquivo
              {filteredAndSortedFiles.length !== 1 ? "s" : ""} encontrado
              {filteredAndSortedFiles.length !== 1 ? "s" : ""} •{" "}
              <button
                onClick={() => setSearchTerm("")}
                className="text-blue-600 hover:underline"
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
