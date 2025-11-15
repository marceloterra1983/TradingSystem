import { useEffect, useMemo, useRef, useState } from "react";
import { Columns, FileDiff, LayoutList, MoveLeft, MoveRight } from "@/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { computeDiff, DiffMode, formatSimilarity } from "../../utils/diff";
import type { Job } from "../../types/jobs";
import { useJob } from "../../hooks/useJobs";

type ViewMode = "split" | "unified";

interface ResultsComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
}

interface DiffableValue {
  key: string;
  label: string;
  left: unknown;
  right: unknown;
}

const PREFERRED_ORDER = [
  "markdown",
  "html",
  "rawHtml",
  "json",
  "metadata",
  "links",
  "screenshot",
];

function toComparable(value: unknown): string | object {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join("\n");
  }
  if (value && typeof value === "object") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function formatForDisplay(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join("\n");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function collectDiffableValues(
  left: Job | null,
  right: Job | null,
): DiffableValue[] {
  const values = new Map<string, DiffableValue>();

  const merge = (source: unknown, side: "left" | "right") => {
    if (!source || typeof source !== "object") {
      return;
    }
    Object.entries(source as Record<string, unknown>).forEach(
      ([key, value]) => {
        const diffKey = key;
        const entry = values.get(diffKey) ?? {
          key: diffKey,
          label: key,
          left: "",
          right: "",
        };
        if (side === "left") {
          entry.left = value;
        } else {
          entry.right = value;
        }
        values.set(diffKey, entry);
      },
    );
  };

  merge(left?.results ?? null, "left");
  merge(right?.results ?? null, "right");

  // Include metadata such as options formats if relevant
  values.set("options", {
    key: "options",
    label: "Options (JSON)",
    left: left?.options ?? "",
    right: right?.options ?? "",
  });

  const sorted = Array.from(values.values()).sort((a, b) => {
    const aIdx = PREFERRED_ORDER.indexOf(a.key);
    const bIdx = PREFERRED_ORDER.indexOf(b.key);
    const aOrder = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
    const bOrder = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
    if (aOrder === bOrder) {
      return a.label.localeCompare(b.label);
    }
    return aOrder - bOrder;
  });

  return sorted;
}

function defaultModeForKey(key: string): DiffMode {
  if (key === "json" || key === "metadata" || key === "options") {
    return "json";
  }
  if (key === "html" || key === "rawHtml") {
    return "lines";
  }
  return "lines";
}

export function ResultsComparison({
  open,
  onOpenChange,
  jobs,
}: ResultsComparisonProps) {
  const [leftJob, rightJob] = jobs;
  const pairSelected = jobs.length === 2;
  const leftQuery = useJob(open ? leftJob?.id : null);
  const rightQuery = useJob(open ? rightJob?.id : null);

  const left = leftQuery.data ?? leftJob ?? null;
  const right = rightQuery.data ?? rightJob ?? null;

  const comparableValues = useMemo(
    () => collectDiffableValues(left, right),
    [left, right],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(
    comparableValues[0]?.key ?? null,
  );
  const [mode, setMode] = useState<DiffMode>(
    defaultModeForKey(comparableValues[0]?.key ?? "markdown"),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const changeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const changeIndexRef = useRef(0);

  useEffect(() => {
    if (comparableValues.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (
      !selectedKey ||
      !comparableValues.some((item) => item.key === selectedKey)
    ) {
      const nextKey = comparableValues[0]?.key ?? null;
      setSelectedKey(nextKey);
      setMode(defaultModeForKey(nextKey ?? "markdown"));
    }
  }, [comparableValues, selectedKey]);

  const selectedValue =
    comparableValues.find((item) => item.key === selectedKey) ?? null;

  const diffResult = useMemo(() => {
    if (!selectedValue) {
      return null;
    }
    const leftValue = toComparable(selectedValue.left);
    const rightValue = toComparable(selectedValue.right);
    const diffMode = mode === "json" ? "json" : mode;
    return computeDiff(leftValue, rightValue, diffMode);
  }, [mode, selectedValue]);

  useEffect(() => {
    changeRefs.current = {};
    changeIndexRef.current = 0;
  }, [diffResult]);

  const changeIndices = useMemo(() => {
    if (!diffResult) {
      return [];
    }
    return diffResult.chunks.reduce<number[]>((acc, chunk, index) => {
      if (chunk.type !== "unchanged") {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [diffResult]);

  const handleNavigate = (direction: 1 | -1) => {
    if (changeIndices.length === 0) {
      return;
    }
    changeIndexRef.current = Math.min(
      Math.max(changeIndexRef.current + direction, 0),
      changeIndices.length - 1,
    );
    const targetIndex = changeIndices[changeIndexRef.current];
    const node = changeRefs.current[targetIndex];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Compare Job Results</DialogTitle>
          <DialogDescription>
            {left ? left.url : "Job A"} vs {right ? right.url : "Job B"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <Select
            value={selectedKey ?? undefined}
            onValueChange={(value) => {
              setSelectedKey(value);
              setMode(defaultModeForKey(value));
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select data segment" />
            </SelectTrigger>
            <SelectContent>
              {comparableValues.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={mode}
            onValueChange={(value) => setMode(value as DiffMode)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Diff mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lines">Lines</SelectItem>
              <SelectItem value="words">Words</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>

          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="split">
                <Columns className="mr-2 h-4 w-4" />
                Side by side
              </TabsTrigger>
              <TabsTrigger value="unified">
                <LayoutList className="mr-2 h-4 w-4" />
                Unified
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span>
              Similarity:{" "}
              {diffResult
                ? formatSimilarity(diffResult.summary.similarity)
                : "—"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleNavigate(-1)}
              disabled={changeIndices.length === 0}
            >
              <MoveLeft className="mr-2 h-4 w-4" />
              Previous change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleNavigate(1)}
              disabled={changeIndices.length === 0}
            >
              Next change
              <MoveRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          {!pairSelected ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Select two jobs to generate a comparison.
            </div>
          ) : viewMode === "split" ? (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileDiff className="h-4 w-4 text-gray-500" />
                  Left job
                </h4>
                <ScrollArea className="h-[60vh] rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <pre className="text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                    {formatForDisplay(selectedValue?.left)}
                  </pre>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileDiff className="h-4 w-4 text-gray-500" />
                  Right job
                </h4>
                <ScrollArea className="h-[60vh] rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <pre className="text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                    {formatForDisplay(selectedValue?.right)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[65vh] rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-2 text-xs leading-relaxed">
                {diffResult?.chunks.map((chunk, index) => {
                  const color =
                    chunk.type === "added"
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : chunk.type === "removed"
                        ? "bg-rose-100 dark:bg-rose-900/40"
                        : "bg-transparent";
                  return (
                    <div
                      key={`${chunk.type}-${index}`}
                      ref={(node) => {
                        changeRefs.current[index] = node;
                      }}
                      className={`whitespace-pre-wrap rounded-sm px-2 py-1 font-mono text-xs ${color}`}
                    >
                      {chunk.value}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
