import { diffJson, diffLines, diffWords } from "diff";

export type DiffMode = "lines" | "words" | "json";

export type DiffChunkType = "added" | "removed" | "unchanged";

export interface DiffChunk {
  value: string;
  count: number;
  type: DiffChunkType;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
  similarity: number;
}

export interface DiffResult {
  chunks: DiffChunk[];
  summary: DiffSummary;
}

function mapChunk(chunk: {
  value: string;
  added?: boolean;
  removed?: boolean;
  count?: number;
}): DiffChunk {
  let type: DiffChunkType = "unchanged";
  if (chunk.added) {
    type = "added";
  } else if (chunk.removed) {
    type = "removed";
  }

  return {
    value: chunk.value,
    count: chunk.count ?? chunk.value.length,
    type,
  };
}

function summarize(chunks: DiffChunk[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const chunk of chunks) {
    if (chunk.type === "added") {
      added += chunk.count;
    } else if (chunk.type === "removed") {
      removed += chunk.count;
    } else {
      unchanged += chunk.count;
    }
  }

  const total = added + removed + unchanged;
  const similarity = total === 0 ? 1 : unchanged / total;

  return {
    added,
    removed,
    unchanged,
    similarity,
  };
}

export function computeDiff(
  original: string | object | null | undefined,
  updated: string | object | null | undefined,
  mode: DiffMode = "lines",
): DiffResult {
  const left = original ?? "";
  const right = updated ?? "";

  const originalString =
    typeof left === "string" ? left : JSON.stringify(left, null, 2);
  const updatedString =
    typeof right === "string" ? right : JSON.stringify(right, null, 2);

  const diffChunks =
    mode === "json"
      ? diffJson(originalString, updatedString)
      : mode === "words"
        ? diffWords(originalString, updatedString)
        : diffLines(originalString, updatedString);

  const chunks = diffChunks.map(mapChunk);
  const summary = summarize(chunks);

  return { chunks, summary };
}

export function formatSimilarity(similarity: number): string {
  return `${Math.round(similarity * 100)}%`;
}
