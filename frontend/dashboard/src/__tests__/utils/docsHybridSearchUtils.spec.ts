/**
 * DocsHybridSearchPage Utility Functions Tests
 *
 * Testing pure utility functions extracted from DocsHybridSearchPage:
 * - formatFacetLabel
 * - normalizeTag
 * - formatTagLabel
 * - formatStatusLabel
 * - buildFacetOptions
 * - sanitizeCollection
 * - buildScopedKey
 * - toTitleCase
 *
 * Based on:
 * - Code Review: Identified inefficient tag normalization (lines 541-549)
 * - Performance Audit: Recommended pre-normalization or caching
 */

import { describe, expect, it } from "vitest";

// Since these are internal functions, we'll test them by importing the component
// In a real refactor, these would be extracted to a separate utils file

/**
 * Utility Functions (copied from DocsHybridSearchPage for testing)
 * TODO: Extract to src/utils/docsHybridSearch.ts after tests pass
 */

const UNCLASSIFIED_LABEL = "Não classificado";

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

const DEFAULT_COLLECTION_SCOPE = "default";

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

const sanitizeCollection = (value?: string): string => (value ?? "").trim();

const buildScopedKey = (baseKey: string, collection?: string): string => {
  const scope = sanitizeCollection(collection) || DEFAULT_COLLECTION_SCOPE;
  return `${baseKey}:${encodeURIComponent(scope)}`;
};

type FacetOption = {
  value: string;
  label: string;
  count: number;
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

describe("docsHybridSearchUtils", () => {
  describe("toTitleCase", () => {
    it("should convert lowercase to title case", () => {
      expect(toTitleCase("docker")).toBe("Docker");
      expect(toTitleCase("workspace")).toBe("Workspace");
    });

    it("should uppercase short words (<=3 chars)", () => {
      expect(toTitleCase("api")).toBe("API");
      expect(toTitleCase("ui")).toBe("UI");
      expect(toTitleCase("db")).toBe("DB");
    });

    it("should preserve separator character", () => {
      expect(toTitleCase("›")).toBe("›");
    });

    it("should handle mixed case input", () => {
      expect(toTitleCase("DocKER")).toBe("Docker");
      expect(toTitleCase("API")).toBe("API");
    });
  });

  describe("formatFacetLabel", () => {
    it("should return UNCLASSIFIED_LABEL for null/undefined", () => {
      expect(formatFacetLabel()).toBe(UNCLASSIFIED_LABEL);
      expect(formatFacetLabel(null as unknown as string)).toBe(
        UNCLASSIFIED_LABEL,
      );
      expect(formatFacetLabel(undefined)).toBe(UNCLASSIFIED_LABEL);
    });

    it("should return UNCLASSIFIED_LABEL for empty/whitespace strings", () => {
      expect(formatFacetLabel("")).toBe(UNCLASSIFIED_LABEL);
      expect(formatFacetLabel("   ")).toBe(UNCLASSIFIED_LABEL);
      expect(formatFacetLabel("undefined")).toBe(UNCLASSIFIED_LABEL);
      expect(formatFacetLabel("null")).toBe(UNCLASSIFIED_LABEL);
    });

    it("should remove file extensions", () => {
      expect(formatFacetLabel("overview.md")).toBe("Overview");
      expect(formatFacetLabel("guide.mdx")).toBe("Guide");
      // Note: "readme" becomes "Readme" because it's >3 chars (not uppercased)
      expect(formatFacetLabel("README.MD")).toBe("Readme");
    });

    it("should replace underscores and hyphens with spaces", () => {
      expect(formatFacetLabel("docker_compose")).toBe("Docker Compose");
      expect(formatFacetLabel("api-gateway")).toBe("API Gateway");
      // Note: "end" is <=3 chars, so it becomes "END" (uppercased)
      expect(formatFacetLabel("front-end_guide")).toBe("Front END Guide");
    });

    it("should replace slashes with › separator", () => {
      expect(formatFacetLabel("tools/docker")).toBe("Tools › Docker");
      expect(formatFacetLabel("frontend/components/ui")).toBe(
        "Frontend › Components › UI",
      );
    });

    it("should apply title case to each segment", () => {
      expect(formatFacetLabel("docker compose setup")).toBe(
        "Docker Compose Setup",
      );
      expect(formatFacetLabel("api gateway configuration")).toBe(
        "API Gateway Configuration",
      );
    });

    it("should handle complex paths", () => {
      expect(formatFacetLabel("tools/docker/compose-setup.md")).toBe(
        "Tools › Docker › Compose Setup",
      );
      expect(
        formatFacetLabel("frontend/components/ui-button_component.mdx"),
      ).toBe("Frontend › Components › UI Button Component");
    });

    it("should collapse multiple spaces", () => {
      expect(formatFacetLabel("docker    compose    setup")).toBe(
        "Docker Compose Setup",
      );
    });
  });

  describe("normalizeTag", () => {
    it("should return empty string for null/undefined", () => {
      expect(normalizeTag()).toBe("");
      expect(normalizeTag(null as unknown as string)).toBe("");
      expect(normalizeTag(undefined)).toBe("");
    });

    it("should convert to lowercase and trim", () => {
      expect(normalizeTag("Docker")).toBe("docker");
      expect(normalizeTag("  API  ")).toBe("api");
      expect(normalizeTag("FrontEnd")).toBe("frontend");
    });

    it("should preserve hyphens and underscores", () => {
      expect(normalizeTag("front-end")).toBe("front-end");
      expect(normalizeTag("api_gateway")).toBe("api_gateway");
    });

    it("should be idempotent", () => {
      const tag = "Docker-Compose";
      const normalized = normalizeTag(tag);
      expect(normalizeTag(normalized)).toBe(normalized);
    });
  });

  describe("formatTagLabel", () => {
    it("should return UNCLASSIFIED_LABEL for null/undefined/empty", () => {
      expect(formatTagLabel()).toBe(UNCLASSIFIED_LABEL);
      expect(formatTagLabel("")).toBe(UNCLASSIFIED_LABEL);
      expect(formatTagLabel("   ")).toBe(UNCLASSIFIED_LABEL);
    });

    it("should replace hyphens and underscores with spaces", () => {
      // Note: "end" is <=3 chars, so it becomes "END" (uppercased)
      expect(formatTagLabel("front-end")).toBe("Front END");
      expect(formatTagLabel("api_gateway")).toBe("API Gateway");
      expect(formatTagLabel("docker-compose_setup")).toBe(
        "Docker Compose Setup",
      );
    });

    it("should apply title case", () => {
      expect(formatTagLabel("docker")).toBe("Docker");
      expect(formatTagLabel("api")).toBe("API");
      expect(formatTagLabel("frontend components")).toBe("Frontend Components");
    });

    it("should handle multiple spaces", () => {
      expect(formatTagLabel("docker   compose   setup")).toBe(
        "Docker Compose Setup",
      );
    });
  });

  describe("formatStatusLabel", () => {
    it("should return mapped label for known statuses", () => {
      expect(formatStatusLabel("active")).toBe("Ativo");
      expect(formatStatusLabel("draft")).toBe("Rascunho");
      expect(formatStatusLabel("planned")).toBe("Planejado");
      expect(formatStatusLabel("completed")).toBe("Concluído");
      expect(formatStatusLabel("accepted")).toBe("Aceito");
      expect(formatStatusLabel("deprecated")).toBe("Depreciado");
    });

    it("should be case-insensitive", () => {
      expect(formatStatusLabel("ACTIVE")).toBe("Ativo");
      expect(formatStatusLabel("Active")).toBe("Ativo");
      expect(formatStatusLabel("DRAFT")).toBe("Rascunho");
    });

    it("should fallback to formatFacetLabel for unknown status", () => {
      expect(formatStatusLabel("custom-status")).toBe("Custom Status");
      // Note: "in" is <=3 chars, so it becomes "IN" (uppercased)
      expect(formatStatusLabel("in_review")).toBe("IN Review");
    });

    it('should return "Ativo" for null/undefined', () => {
      expect(formatStatusLabel()).toBe("Ativo");
      expect(formatStatusLabel(null as unknown as string)).toBe("Ativo");
    });
  });

  describe("sanitizeCollection", () => {
    it("should return trimmed string", () => {
      expect(sanitizeCollection("  docs_index_mxbai  ")).toBe(
        "docs_index_mxbai",
      );
      expect(sanitizeCollection("custom_collection")).toBe("custom_collection");
    });

    it("should return empty string for null/undefined", () => {
      expect(sanitizeCollection()).toBe("");
      expect(sanitizeCollection(null as unknown as string)).toBe("");
      expect(sanitizeCollection(undefined)).toBe("");
    });

    it("should preserve special characters", () => {
      expect(sanitizeCollection("docs_index-v2.0")).toBe("docs_index-v2.0");
    });
  });

  describe("buildScopedKey", () => {
    it("should build key with collection scope", () => {
      expect(
        buildScopedKey("docsHybridSearch_results", "docs_index_mxbai"),
      ).toBe("docsHybridSearch_results:docs_index_mxbai");
      expect(
        buildScopedKey("docsHybridSearch_lastQuery", "custom_collection"),
      ).toBe("docsHybridSearch_lastQuery:custom_collection");
    });

    it("should use default scope for empty collection", () => {
      expect(buildScopedKey("docsHybridSearch_results", "")).toBe(
        "docsHybridSearch_results:default",
      );
      expect(buildScopedKey("docsHybridSearch_results", "   ")).toBe(
        "docsHybridSearch_results:default",
      );
    });

    it("should use default scope for null/undefined collection", () => {
      expect(
        buildScopedKey("docsHybridSearch_results", null as unknown as string),
      ).toBe("docsHybridSearch_results:default");
      expect(buildScopedKey("docsHybridSearch_results", undefined)).toBe(
        "docsHybridSearch_results:default",
      );
    });

    it("should encode URI components in collection", () => {
      expect(buildScopedKey("docsHybridSearch_results", "docs/index")).toBe(
        "docsHybridSearch_results:docs%2Findex",
      );
      expect(buildScopedKey("docsHybridSearch_results", "collection:v2")).toBe(
        "docsHybridSearch_results:collection%3Av2",
      );
    });
  });

  describe("buildFacetOptions", () => {
    it("should return empty array for null/undefined/empty input", () => {
      expect(buildFacetOptions(undefined, formatFacetLabel)).toEqual([]);
      expect(
        buildFacetOptions(null as unknown as [], formatFacetLabel),
      ).toEqual([]);
      expect(buildFacetOptions([], formatFacetLabel)).toEqual([]);
    });

    it("should transform items with formatter", () => {
      const items = [
        { value: "docker_compose", count: 10 },
        { value: "api_gateway", count: 5 },
      ];

      const result = buildFacetOptions(items, formatFacetLabel);

      expect(result).toEqual([
        { value: "docker_compose", label: "Docker Compose", count: 10 },
        { value: "api_gateway", label: "API Gateway", count: 5 },
      ]);
    });

    it("should sort by count (descending), then by label (ascending)", () => {
      const items = [
        { value: "api", count: 5 },
        { value: "docker", count: 10 },
        { value: "frontend", count: 10 },
        { value: "backend", count: 3 },
      ];

      const result = buildFacetOptions(items, formatFacetLabel);

      expect(result[0]).toMatchObject({ value: "docker", count: 10 });
      expect(result[1]).toMatchObject({ value: "frontend", count: 10 });
      expect(result[2]).toMatchObject({ value: "api", count: 5 });
      expect(result[3]).toMatchObject({ value: "backend", count: 3 });
    });

    it("should filter out items with falsy values", () => {
      const items = [
        { value: "docker", count: 10 },
        { value: "", count: 5 },
        { value: null as unknown as string, count: 3 },
        { value: "api", count: 8 },
      ];

      const result = buildFacetOptions(items, formatFacetLabel);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ value: "docker" });
      expect(result[1]).toMatchObject({ value: "api" });
    });

    it("should default count to 0 if missing", () => {
      const items = [
        { value: "docker", count: undefined as unknown as number },
      ];

      const result = buildFacetOptions(items, formatFacetLabel);

      expect(result[0].count).toBe(0);
    });

    it("should handle large datasets efficiently", () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        value: `item_${i}`,
        count: Math.floor(Math.random() * 100),
      }));

      const start = performance.now();
      const result = buildFacetOptions(items, formatFacetLabel);
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe("Performance Characteristics", () => {
    it("normalizeTag should be fast for repeated calls", () => {
      const tags = Array.from({ length: 1000 }, () => "Docker-Compose");

      const start = performance.now();
      const normalized = tags.map(normalizeTag);
      const duration = performance.now() - start;

      expect(normalized.every((t) => t === "docker-compose")).toBe(true);
      expect(duration).toBeLessThan(10); // Should complete in <10ms
    });

    it("formatFacetLabel should handle complex paths efficiently", () => {
      const paths = Array.from(
        { length: 500 },
        (_, i) => `tools/docker/compose_setup-v${i}.md`,
      );

      const start = performance.now();
      const formatted = paths.map(formatFacetLabel);
      const duration = performance.now() - start;

      expect(
        formatted.every((f) => f.includes("Tools › Docker › Compose Setup")),
      ).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in formatFacetLabel", () => {
      expect(formatFacetLabel("docker@compose")).toBe("Docker@compose");
      expect(formatFacetLabel("api(v2)")).toBe("Api(v2)");
      expect(formatFacetLabel("front#end")).toBe("Front#end");
    });

    it("should handle unicode characters", () => {
      expect(formatFacetLabel("configuração")).toBe("Configuração");
      expect(normalizeTag("Configuração")).toBe("configuração");
      expect(formatTagLabel("configuração-básica")).toBe("Configuração Básica");
    });

    it("should handle very long strings", () => {
      const longPath = "a".repeat(200) + "/" + "b".repeat(200) + ".md";
      const result = formatFacetLabel(longPath);
      expect(result).toContain("›");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle numeric strings", () => {
      expect(formatFacetLabel("123")).toBe("123");
      expect(formatFacetLabel("v2.0")).toBe("V2.0");
      expect(normalizeTag("V2.0")).toBe("v2.0");
    });
  });
});
