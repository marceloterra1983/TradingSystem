import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { apiConfig } from "../../config/api";
import { buildDocsUrl, normalizeDocsBase } from "../../lib/docsUrl";

/**
 * PRD Loading Strategy:
 * - Legacy: Serve static markdown from /public/docs_legacy/context/shared/product/prd/
 * - docs: Serve rendered markdown pages from the Documentation Hub (Traefik /docs)
 * - Transition: Feature flag toggles docs first, with automatic fallback to legacy.
 *   This keeps the dashboard resilient while PRDs migrate to docs.
 */
/**
 * PRD Data Structure
 */
interface PRD {
  id: string;
  name: string;
  fileName: string;
  status: "implemented" | "draft" | "planned";
  owner: string;
  lastSynced: string;
  docsSlug?: string;
}

const resolveDocsHubBase = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const override = env.VITE_PRD_BASE_URL;
  const candidate =
    typeof override === "string" && override.trim()
      ? override
      : apiConfig.docsUrl;
  return normalizeDocsBase(candidate);
};

const isDocsHubEnabled = (): boolean => {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_USE_DOCS_V2_PRD || "").toLowerCase() === "true";
};

const getLegacyBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin.replace(/\/+$/, "");
};

/**
 * PRD Database - Portuguese
 */
const PRDS_PT: PRD[] = [
  {
    id: "banco-ideias",
    name: "banco-ideias-prd.md",
    fileName: "banco-ideias-prd.md",
    status: "implemented",
    owner: "Marcelo Terra",
    lastSynced: "2025-10-09",
    docsSlug: "prd/products/trading-app/feature-idea-bank.pt",
  },
  {
    id: "monitoramento-prometheus",
    name: "monitoramento-prometheus-prd.md",
    fileName: "monitoramento-prometheus-prd.md",
    status: "draft",
    owner: "Marcelo Terra",
    lastSynced: "2025-10-10",
  },
  {
    id: "docusaurus-implementation",
    name: "docusaurus-implementation-prd.md",
    fileName: "docusaurus-implementation-prd.md",
    status: "draft",
    owner: "Docs / Ops",
    lastSynced: "2025-10-10",
  },
];

/**
 * PRD Database - English
 */
const PRDS_EN: PRD[] = [
  {
    id: "banco-ideias-en",
    name: "banco-ideias-prd.md",
    fileName: "banco-ideias-prd.md",
    status: "implemented",
    owner: "Marcelo Terra",
    lastSynced: "2025-10-09",
    docsSlug: "prd/products/trading-app/feature-idea-bank",
  },
  {
    id: "monitoramento-prometheus-en",
    name: "monitoramento-prometheus-prd.md",
    fileName: "monitoramento-prometheus-prd.md",
    status: "draft",
    owner: "Marcelo Terra",
    lastSynced: "2025-10-10",
  },
  {
    id: "docusaurus-implementation-en",
    name: "docusaurus-implementation-prd.md",
    fileName: "docusaurus-implementation-prd.md",
    status: "draft",
    owner: "Docs / Ops",
    lastSynced: "2025-10-10",
  },
];

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: PRD["status"] }) {
  const labels = {
    implemented: "✅ Implemented",
    draft: "📝 Draft",
    planned: "🔮 Planned",
  };

  const colors = {
    implemented: "bg-green-500/10 text-green-700 border-green-500/20",
    draft: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    planned: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  };

  return (
    <Badge variant="outline" className={colors[status]}>
      {labels[status]}
    </Badge>
  );
}

/**
 * PRD List and Viewer Section (Reusable)
 */
function PRDSection({
  prds,
  language,
  title,
  description,
}: {
  prds: PRD[];
  language: "pt" | "en";
  title: string;
  description: string;
}) {
  const docsHubBase = resolveDocsHubBase();
  const docsHubFlagEnabled = isDocsHubEnabled();
  const [selectedPRD, setSelectedPRD] = useState<PRD | null>(null);
  const [prdContent, setPrdContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePrdUrl, setActivePrdUrl] = useState<string>("");

  useEffect(() => {
    if (!selectedPRD) {
      setPrdContent("");
      setLoadError(null);
      setActivePrdUrl("");
      return;
    }

    setLoadingContent(true);
    setLoadError(null);

    // Temporary migration strategy:
    // 1. Try docs hub when flagged on (serves rich documentation)
    // 2. Fall back to legacy static export so the dashboard stays functional
    const docsEnabled = docsHubFlagEnabled && Boolean(selectedPRD.docsSlug);
    const docsUrl =
      docsEnabled && selectedPRD.docsSlug
        ? buildDocsUrl(selectedPRD.docsSlug, docsHubBase)
        : null;
    const legacyUrl = `${getLegacyBaseUrl()}/docs_legacy/context/shared/product/prd/${language}/${selectedPRD.fileName}`;
    const fetchCandidates = [
      ...(docsUrl ? [{ source: "docs", url: docsUrl }] : []),
      { source: "legacy", url: legacyUrl },
    ] as const;

    const loadPrdContent = async () => {
      let lastError: string | null = null;
      try {
        for (const candidate of fetchCandidates) {
          try {
            const response = await fetch(candidate.url);
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }
            const content = await response.text();
            const contentWithoutFrontmatter = content.replace(
              /^---\n[\s\S]*?\n---\n/,
              "",
            );
            setPrdContent(contentWithoutFrontmatter);
            setActivePrdUrl(candidate.url);
            setLoadError(null);
            return;
          } catch (candidateError) {
            const message =
              candidateError instanceof Error
                ? candidateError.message
                : "Unexpected error";
            console.warn("[PRD Viewer] attempt failed", candidate.url, message);
            lastError = message;
          }
        }

        throw new Error(
          `Failed to load PRD from docs and legacy sources. Last error: ${lastError ?? "unknown error"}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected error";
        console.error(
          "[PRD Viewer] error loading file",
          selectedPRD?.fileName,
          message,
        );
        setPrdContent("");
        setActivePrdUrl("");
        setLoadError(
          [
            "PRD not available.",
            docsEnabled
              ? "Verify docs build or disable VITE_USE_DOCS_V2_PRD until migration completes."
              : "Legacy static fallback also failed. Confirm public/docs export is present.",
            `Detail: ${message}`,
          ].join(" "),
        );
      } finally {
        setLoadingContent(false);
      }
    };

    void loadPrdContent();
  }, [selectedPRD, language]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* PRD Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Owner
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Last Sync
                  </th>
                </tr>
              </thead>
              <tbody>
                {prds.map((prd) => (
                  <tr
                    key={prd.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedPRD(prd)}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {prd.name}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={prd.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {prd.owner}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {prd.lastSynced}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PRD Viewer (embedded below table) */}
      {selectedPRD && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>📄 {selectedPRD.name}</CardTitle>
                <CardDescription className="mt-1">
                  {selectedPRD.owner} • Last updated: {selectedPRD.lastSynced}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedPRD.status} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPRD(null)}
                >
                  ✕ Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fallbackUrl = `${getLegacyBaseUrl()}/docs_legacy/context/shared/product/prd/${language}/${selectedPRD.fileName}`;
                    const preferredUrl =
                      activePrdUrl ||
                      (docsHubFlagEnabled && selectedPRD.docsSlug
                        ? buildDocsUrl(selectedPRD.docsSlug, docsHubBase)
                        : fallbackUrl);
                    if (preferredUrl) {
                      window.open(
                        preferredUrl,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open PRD
                </Button>
              </div>

              <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 max-h-[800px] overflow-y-auto">
                {loadingContent && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-12">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading PRD…</span>
                  </div>
                )}

                {loadError && (
                  <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 p-6">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{loadError}</span>
                  </div>
                )}

                {!loadingContent && !loadError && prdContent && (
                  <article
                    className="prose prose-slate dark:prose-invert max-w-none p-8
                    prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                    prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h1:pb-3 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700
                    prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                    prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
                    prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg
                    prose-ul:list-disc prose-ul:ml-6 prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                    prose-ol:list-decimal prose-ol:ml-6 prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                    prose-li:my-1
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
                    prose-table:border-collapse prose-table:w-full
                    prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                    prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-2
                    prose-hr:border-gray-300 dark:prose-hr:border-gray-700
                  "
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {prdContent}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Content source:{" "}
                {activePrdUrl
                  ? activePrdUrl
                  : `/docs_legacy/context/shared/product/prd/${language}/${selectedPRD.fileName}`}{" "}
                (docs migration mode{" "}
                {docsHubFlagEnabled ? "enabled" : "disabled"})
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Portuguese PRD Component
 */
export function PRDListSectionPT() {
  return (
    <PRDSection
      prds={PRDS_PT}
      language="pt"
      title="📋 Product Requirements Documents (Portuguese)"
      description="TradingSystem product requirement documents in Portuguese"
    />
  );
}

/**
 * English PRD Component
 */
export function PRDListSectionEN() {
  return (
    <PRDSection
      prds={PRDS_EN}
      language="en"
      title="📋 Product Requirements Documents (English)"
      description="Product requirements documents for TradingSystem in English"
    />
  );
}

/**
 * Main PRD Page - Both Languages (Legacy export for backward compatibility)
 */
export function PRDListSection() {
  return (
    <div className="space-y-16">
      {/* Portuguese PRDs */}
      <section>
        <PRDListSectionPT />
      </section>

      {/* Visual Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 dark:bg-gray-900 px-6 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-300 dark:border-gray-600">
            🌐 Language Sections
          </span>
        </div>
      </div>

      {/* English PRDs */}
      <section>
        <PRDListSectionEN />
      </section>
    </div>
  );
}
