import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import {
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { AlertCircle, FileText, FolderTree, RefreshCw } from '@/icons';
import { Button } from "../ui/button";

interface StructureNode {
  name: string;
  path: string;
  directories?: StructureNode[];
  files?: string[];
}

interface TreemapNode {
  name: string;
  path: string;
  size: number;
  depth: number;
  fileCount: number;
  directoryCount: number;
  original: StructureNode;
  children?: TreemapNode[];
}

type LoadState = "idle" | "loading" | "error";

const DATA_ENDPOINT = "/data/structure/documentation-structure.json";

function countTotals(node: StructureNode | null | undefined) {
  if (!node) {
    return { directories: 0, files: 0 };
  }
  let directories = 0;
  let files = node.files?.length ?? 0;
  const stack = [...(node.directories ?? [])];
  while (stack.length) {
    const current = stack.pop()!;
    directories += 1;
    files += current.files?.length ?? 0;
    if (current.directories?.length) {
      stack.push(...current.directories);
    }
  }
  return { directories, files };
}

function countFiles(node: StructureNode | null | undefined): number {
  if (!node) return 0;
  let total = node.files?.length ?? 0;
  node.directories?.forEach((child) => {
    total += countFiles(child);
  });
  return total;
}

function convertToTreemap(node: StructureNode, depth = 0): TreemapNode {
  const children =
    node.directories?.map((child) => convertToTreemap(child, depth + 1)) ?? [];
  const directFiles = node.files?.length ?? 0;
  const size =
    children.reduce((sum, child) => sum + child.size, 0) + Math.max(directFiles, 1);
  return {
    name: node.path === "." ? "docs" : node.name,
    path: node.path,
    depth,
    size,
    fileCount: directFiles,
    directoryCount: node.directories?.length ?? 0,
    original: node,
    children: children.length ? children : undefined,
  };
}

function findNodeByPath(root: StructureNode | null, targetPath: string) {
  if (!root) return null;
  if (root.path === targetPath) return root;
  const stack = [...(root.directories ?? [])];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.path === targetPath) {
      return current;
    }
    if (current.directories?.length) {
      stack.push(...current.directories);
    }
  }
  return null;
}

function flattenNodes(root: StructureNode | null): StructureNode[] {
  if (!root) return [];
  const nodes: StructureNode[] = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop()!;
    nodes.push(current);
    if (current.directories?.length) {
      stack.push(...current.directories);
    }
  }
  return nodes;
}

type TreemapRectangleProps = {
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: any;
  selectedPath: string;
  onSelect: (path: string) => void;
};

function TreemapRectangle({
  depth,
  x,
  y,
  width,
  height,
  payload,
  selectedPath,
  onSelect,
}: TreemapRectangleProps) {
  if (!payload) return null;
  const rectWidth = typeof width === "number" ? width : 0;
  const rectHeight = typeof height === "number" ? height : 0;
  if (rectWidth <= 0 || rectHeight <= 0) return null;

  const path = (payload.path as string) ?? "";
  const isSelected = selectedPath === path;
  const palette = ["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"];
  const color = palette[Math.min(depth ?? 0, palette.length - 1)];
  const fill = isSelected ? "#f97316" : color;
  const label =
    rectWidth > 80 && rectHeight > 24 ? String(payload.name).slice(0, 28) : "";
  const fileCount = (payload.fileCount as number) ?? 0;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={rectWidth}
        height={rectHeight}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={isSelected ? 3 : 1}
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(path)}
      />
      {label ? (
        <text
          x={(x ?? 0) + 6}
          y={(y ?? 0) + 18}
          fill="#fff"
          fontSize={12}
          fontWeight={isSelected ? 700 : 500}
          pointerEvents="none"
        >
          {label}
        </text>
      ) : null}
      {label && fileCount > 0 && rectHeight > 32 ? (
        <text
          x={(x ?? 0) + 6}
          y={(y ?? 0) + 34}
          fill="#e0e7ff"
          fontSize={11}
          pointerEvents="none"
        >
          {fileCount} arquivo{fileCount === 1 ? "" : "s"}
        </text>
      ) : null}
    </g>
  );
}

function TreemapContent(props: TreemapRectangleProps & { [key: string]: unknown }) {
  const { selectedPath, onSelect, ...rest } = props;
  return (
    <TreemapRectangle
      {...(rest as TreemapRectangleProps)}
      selectedPath={selectedPath}
      onSelect={onSelect}
    />
  );
}

export default function StructureMapPage() {
  const [tree, setTree] = useState<StructureNode | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>(".");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(DATA_ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as StructureNode;
      setTree(payload);
      setSelectedPath(".");
      setState("idle");
    } catch (error) {
      console.error("[StructureMap] load failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao carregar estrutura",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const treemapData = useMemo(() => {
    if (!tree) return [];
    return [convertToTreemap(tree)];
  }, [tree]);

  const totals = useMemo(() => countTotals(tree), [tree]);
  const totalFiles = useMemo(() => countFiles(tree), [tree]);

  const selectedNode = useMemo(
    () => findNodeByPath(tree, selectedPath) ?? tree,
    [tree, selectedPath],
  );

  const matchingNodes = useMemo(() => {
    if (!tree || !searchTerm.trim()) return [];
    const tokens = searchTerm
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.length) return [];
    const nodes = flattenNodes(tree);
    return nodes
      .filter((node) => {
        const haystack = [node.name, node.path]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 25);
  }, [tree, searchTerm]);

  const handleTreemapSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Structure Map</h1>
        <p className="text-sm text-muted-foreground">
          Visualização interativa da estrutura de documentação do TradingSystem.
          Use a árvore para localizar rapidamente diretórios e arquivos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diretórios</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Total (excluindo raiz)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{totals.directories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arquivos .mdx</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Mapeados neste snapshot
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{totals.files}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arquivos totais</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Inclui recursivamente subdiretórios
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{totalFiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diretório selecionado</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Atual
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm font-medium break-all">
              {selectedNode?.path ?? "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="col-span-full">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Mapa de diretórios</CardTitle>
                <CardDescription>
                  Clique em um bloco para navegar. Tamanhos representam a quantidade
                  de arquivos contidos.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Input
                    placeholder="Buscar diretório (ex.: tools monitoring)"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pr-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void loadData()}
                  disabled={state === "loading"}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`}
                  />
                  <span className="sr-only">Recarregar snapshot</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[420px]">
            {state === "loading" ? (
              <Skeleton className="h-full w-full" />
            ) : state === "error" ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <AlertCircle className="mr-2 h-4 w-4" />
                {errorMessage ?? "Falha ao carregar estrutura"}
              </div>
            ) : tree && treemapData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  stroke="#ffffff"
                  content={
                    <TreemapContent
                      selectedPath={selectedPath}
                      onSelect={handleTreemapSelect}
                    />
                  }
                />
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Estrutura vazia.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
            <CardDescription>
              Diretório <code>{selectedNode?.path ?? "-"}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <FolderTree className="h-3 w-3" />
                {selectedNode?.directories?.length ?? 0} subdir
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" />
                {selectedNode?.files?.length ?? 0} arquivos
              </Badge>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Subdiretórios
              </h3>
              {selectedNode?.directories && selectedNode.directories.length ? (
                <ScrollArea className="h-32 rounded-md border">
                  <div className="space-y-1 p-3 text-sm">
                    {selectedNode.directories.map((directory) => (
                      <button
                        key={directory.path}
                        type="button"
                        onClick={() => setSelectedPath(directory.path)}
                        className={`flex w-full justify-between rounded px-2 py-1 text-left transition hover:bg-muted ${
                          selectedPath === directory.path ? "bg-muted font-medium" : ""
                        }`}
                      >
                        <span>{directory.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {countFiles(directory)}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum subdiretório.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Arquivos ({selectedNode?.files?.length ?? 0})
              </h3>
              {selectedNode?.files && selectedNode.files.length ? (
                <ScrollArea className="h-32 rounded-md border">
                  <div className="space-y-1 p-3 text-sm">
                    {selectedNode.files.map((file) => (
                      <div key={file} className="truncate text-sm">
                        {file}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum arquivo neste diretório.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Resultados da busca</CardTitle>
            <CardDescription>
              {searchTerm.trim()
                ? `${matchingNodes.length} correspondência(s)`
                : "Comece digitando para filtrar diretórios"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchTerm.trim() ? (
              matchingNodes.length ? (
                <ScrollArea className="h-48 rounded-md border">
                  <div className="divide-y">
                    {matchingNodes.map((node) => (
                      <button
                        key={node.path}
                        type="button"
                        onClick={() => setSelectedPath(node.path)}
                        className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm transition hover:bg-muted ${
                          selectedPath === node.path ? "bg-muted" : ""
                        }`}
                      >
                        <span className="font-medium">{node.name}</span>
                        <span className="text-xs text-muted-foreground break-all">
                          {node.path}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum diretório encontrado para &ldquo;{searchTerm}&rdquo;.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Utilize a busca para localizar um diretório. Resultados são limitados às 25 primeiras ocorrências.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="text-xs text-muted-foreground">
        Fonte: `docs/reports/documentation-structure.json` • Última atualização refletida ao rodar{" "}
        <code>node scripts/docs/generate-structure-index.mjs</code>.
      </div>
    </div>
  );
}

