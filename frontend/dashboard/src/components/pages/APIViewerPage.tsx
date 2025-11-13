import { useState, useEffect } from "react";
import {
  ExternalLink,
  Book,
  Code,
  FileJson,
  ChevronDown,
  Server,
} from '@/icons';
import { Button } from "../ui/button";
import { IframeWithUrl } from "../common/IframeWithUrl";

/**
 * API Viewer Page - Dedicated API documentation viewer
 *
 * Provides multiple visualization options for OpenAPI specs:
 * - Redoc: Beautiful, responsive API documentation
 * - Swagger UI: Interactive API explorer with "Try it out"
 * - RapiDoc: Modern, customizable API viewer
 * - Raw Spec: View/download raw OpenAPI YAML/JSON
 */

interface ApiSpec {
  id: string;
  name: string;
  description: string;
  port: string;
  // Absolute or relative path to spec when using non-Redoc viewers
  specFile: string; // e.g. documentation-api.openapi.yaml
  // Docusaurus Redocusaurus route for this API
  docusaurusRoute: string; // e.g. /api/documentation-api
}

type ViewerType = "redoc" | "swagger" | "rapidoc" | "raw";

const API_SPECS: ApiSpec[] = [
  {
    id: "documentation-api",
    name: "Documentation",
    description: "Documentation management, ideas, specs, search, and files",
    port: "9080 • /api/docs",
    specFile: "documentation-api.openapi.yaml",
    docusaurusRoute: "/api/documentation-api",
  },
  {
    id: "workspace-api",
    name: "Workspace",
    description: "CRUD operations for workspace items with Kanban workflow",
    port: "9080 • /api/workspace",
    specFile: "workspace.openapi.yaml",
    docusaurusRoute: "/api/workspace",
  },
  {
    id: "tp-capital-api",
    name: "TP Capital",
    description: "Trading signals ingestion, Telegram bot/channel management",
    port: "9080 • /api/tp-capital",
    specFile: "tp-capital.openapi.yaml",
    docusaurusRoute: "/api/tp-capital",
  },
  {
    id: "firecrawl-proxy",
    name: "Firecrawl Proxy",
    description: "Web scraping proxy with Firecrawl integration",
    port: "9080 • /api/firecrawl",
    specFile: "firecrawl-proxy.openapi.yaml",
    docusaurusRoute: "/api/firecrawl",
  },
  {
    id: "telegram-gateway-api",
    name: "Telegram Gateway",
    description: "REST API for Telegram messages and channels (TimescaleDB)",
    port: "9080 • /api/telegram-gateway",
    specFile: "telegram-gateway-api.openapi.yaml",
    docusaurusRoute: "/api/telegram-gateway",
  },
  {
    id: "alert-router",
    name: "Alert Router",
    description: "Alertmanager webhook → GitHub Issues automation",
    port: "8080",
    specFile: "alert-router.openapi.yaml",
    docusaurusRoute: "/api/alert-router",
  },
];

export function APIViewerPage() {
  const [selectedApi, setSelectedApi] = useState<ApiSpec>(API_SPECS[0]);
  const [viewerType, setViewerType] = useState<ViewerType>("redoc");
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Update viewer URL when API or viewer type changes
    updateViewerUrl();
  }, [selectedApi, viewerType]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".api-dropdown")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const updateViewerUrl = () => {
    let url = "";

    const docsSpecUrl = `/specs/${selectedApi.specFile}`;

    switch (viewerType) {
      case "redoc":
        // Use local Redoc HTML to avoid SPA/route issues; spec served via /specs proxy
        url = `/viewers/redoc.html?url=${encodeURIComponent(docsSpecUrl)}`;
        break;
      case "swagger":
        // Local Swagger UI embedding Docusaurus spec file
        url = `/viewers/swagger.html?url=${encodeURIComponent(docsSpecUrl)}`;
        break;
      case "rapidoc":
        // Local RapiDoc embedding Docusaurus spec file
        url = `/viewers/rapidoc.html?url=${encodeURIComponent(docsSpecUrl)}`;
        break;
      case "raw":
        // Link directly to the spec served by Docusaurus static assets
        url = docsSpecUrl;
        break;
    }

    setViewerUrl(url);
  };

  const handleOpenInNewTab = () => {
    if (viewerUrl) {
      window.open(viewerUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadSpec = () => {
    const link = document.createElement("a");
    link.href = `/specs/${selectedApi.specFile}`;
    link.download = `${selectedApi.id}.openapi.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getViewerIcon = (type: ViewerType) => {
    switch (type) {
      case "redoc":
        return <Book className="h-4 w-4" />;
      case "swagger":
        return <Code className="h-4 w-4" />;
      case "rapidoc":
        return <FileJson className="h-4 w-4" />;
      case "raw":
        return <FileJson className="h-4 w-4" />;
    }
  };

  const getViewerDescription = (type: ViewerType) => {
    switch (type) {
      case "redoc":
        return "Beautiful, responsive documentation with 3-panel layout";
      case "swagger":
        return 'Interactive explorer with "Try it out" functionality';
      case "rapidoc":
        return "Modern, customizable viewer with theme support";
      case "raw":
        return "View or download raw OpenAPI specification";
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] w-full">
      {/* Compact Header Controls */}
      <div className="mb-3 rounded-lg border border-gray-200 bg-white/50 p-2.5 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* API Selection - Dropdown */}
          <div className="relative api-dropdown flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">
              API
            </span>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group flex min-w-[180px] items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/50"
            >
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span>{selectedApi.name}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-12 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-slate-800">
                <div className="max-h-[300px] overflow-y-auto">
                  {API_SPECS.map((api) => (
                    <button
                      key={api.id}
                      onClick={() => {
                        setSelectedApi(api);
                        setIsDropdownOpen(false);
                      }}
                      title={api.description}
                      className={`
                        flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left transition-all last:border-b-0
                        ${
                          selectedApi.id === api.id
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Server className="h-3.5 w-3.5 flex-shrink-0" />
                        <span
                          className={`truncate text-sm font-medium ${
                            selectedApi.id === api.id
                              ? "text-white"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {api.name}
                        </span>
                      </div>
                      <span
                        className={`flex-shrink-0 text-xs font-medium ${
                          selectedApi.id === api.id
                            ? "text-white/90"
                            : "text-blue-600 dark:text-cyan-400"
                        }`}
                      >
                        :{api.port}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden h-5 w-px bg-gray-300 dark:bg-gray-600 sm:block" />

          {/* Viewer Type Selection - Compact Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Viewer
            </span>
            <div className="flex gap-1.5">
              {(["redoc", "swagger", "rapidoc", "raw"] as ViewerType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setViewerType(type)}
                    title={getViewerDescription(type)}
                    className={`
                    group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200
                    ${
                      viewerType === type
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/40 scale-105"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-102 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700/80"
                    }
                  `}
                  >
                    {getViewerIcon(type)}
                    <span className="capitalize">{type}</span>
                    {viewerType === type && (
                      <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white" />
                    )}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleOpenInNewTab}
              disabled={!viewerUrl}
              title="Abrir em nova aba"
              className="group rounded-lg p-1.5 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-blue-600 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 dark:text-gray-400 dark:hover:bg-gray-700/80 dark:hover:text-cyan-400"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownloadSpec}
              title="Download da especificação"
              className="group rounded-lg p-1.5 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-blue-600 hover:scale-110 dark:text-gray-400 dark:hover:bg-gray-700/80 dark:hover:text-cyan-400"
            >
              <FileJson className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Viewer Container */}
      <div className="h-[calc(100%-72px)] w-full">
        {viewerType === "raw" ? (
          // Raw spec view
          <div className="h-full w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Raw OpenAPI Specification
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedApi.name} - OpenAPI 3.1
              </p>
            </div>
            <div className="space-y-2">
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Spec URL:
                </p>
                <code className="text-xs text-blue-600 dark:text-blue-400 break-all">
                  {`/specs/${selectedApi.specFile}`}
                </code>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    window.open(`/specs/${selectedApi.specFile}`, "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Raw Spec
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSpec}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Download YAML
                </Button>
              </div>
              <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Available Viewers:
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>
                    <button
                      onClick={() => setViewerType("redoc")}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Redoc
                    </button>{" "}
                    - Beautiful, responsive 3-panel documentation
                  </li>
                  <li>
                    <button
                      onClick={() => setViewerType("swagger")}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Swagger UI
                    </button>{" "}
                    - Interactive API explorer with live testing
                  </li>
                  <li>
                    <button
                      onClick={() => setViewerType("rapidoc")}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      RapiDoc
                    </button>{" "}
                    - Modern, customizable API documentation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // Iframe viewer
          <IframeWithUrl
            key={viewerUrl}
            src={viewerUrl}
            title={`${selectedApi.name} - ${viewerType}`}
            className="h-full w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
            wrapperClassName="h-full"
          />
        )}
      </div>
    </div>
  );
}

export default APIViewerPage;
