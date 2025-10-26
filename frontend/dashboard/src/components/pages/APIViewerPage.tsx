import { useState, useEffect } from 'react';
import { ExternalLink, Book, Code, FileJson } from 'lucide-react';
import { Button } from '../ui/button';

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
  specUrl: string;
}

type ViewerType = 'redoc' | 'swagger' | 'rapidoc' | 'raw';

const API_SPECS: ApiSpec[] = [
  {
    id: 'documentation-api',
    name: 'Documentation API',
    description: 'Documentation management, ideas, specs, search, and files',
    port: '3401',
    specUrl: '/specs/documentation-api.openapi.yaml',
  },
  {
    id: 'workspace-api',
    name: 'Workspace API (Idea Bank)',
    description: 'CRUD operations for workspace items with Kanban workflow',
    port: '3200',
    specUrl: '/specs/workspace.openapi.yaml',
  },
  {
    id: 'tp-capital-api',
    name: 'TP Capital API',
    description: 'Trading signals ingestion, Telegram bot/channel management',
    port: '3200',
    specUrl: '/specs/tp-capital.openapi.yaml',
  },
];

export function APIViewerPage() {
  const [selectedApi, setSelectedApi] = useState<ApiSpec>(API_SPECS[0]);
  const [viewerType, setViewerType] = useState<ViewerType>('redoc');
  const [viewerUrl, setViewerUrl] = useState<string>('');

  useEffect(() => {
    // Update viewer URL when API or viewer type changes
    updateViewerUrl();
  }, [selectedApi, viewerType]);

  const updateViewerUrl = () => {
    let url = '';

    switch (viewerType) {
      case 'redoc':
        // Use local Redoc HTML viewer (no CORS issues)
        url = `/viewers/redoc.html?url=${encodeURIComponent(selectedApi.specUrl)}`;
        break;

      case 'swagger':
        // Use local Swagger UI HTML (no CORS issues)
        url = `/viewers/swagger.html?url=${encodeURIComponent(selectedApi.specUrl)}`;
        break;

      case 'rapidoc':
        // Use local RapiDoc HTML (no CORS issues)
        url = `/viewers/rapidoc.html?url=${encodeURIComponent(selectedApi.specUrl)}`;
        break;

      case 'raw':
        // Raw spec URL
        url = selectedApi.specUrl;
        break;
    }

    setViewerUrl(url);
  };

  const handleOpenInNewTab = () => {
    if (viewerUrl) {
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadSpec = () => {
    const link = document.createElement('a');
    link.href = selectedApi.specUrl;
    link.download = `${selectedApi.id}.openapi.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getViewerIcon = (type: ViewerType) => {
    switch (type) {
      case 'redoc':
        return <Book className="h-4 w-4" />;
      case 'swagger':
        return <Code className="h-4 w-4" />;
      case 'rapidoc':
        return <FileJson className="h-4 w-4" />;
      case 'raw':
        return <FileJson className="h-4 w-4" />;
    }
  };

  const getViewerDescription = (type: ViewerType) => {
    switch (type) {
      case 'redoc':
        return 'Beautiful, responsive documentation with 3-panel layout';
      case 'swagger':
        return 'Interactive explorer with "Try it out" functionality';
      case 'rapidoc':
        return 'Modern, customizable viewer with theme support';
      case 'raw':
        return 'View or download raw OpenAPI specification';
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] w-full">
      {/* Header Controls */}
      <div className="mb-4 space-y-3">
        {/* API Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select API
          </label>
          <div className="flex flex-wrap gap-2">
            {API_SPECS.map((api) => (
              <Button
                key={api.id}
                variant={selectedApi.id === api.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedApi(api)}
                className="flex flex-col items-start gap-1 h-auto py-2 px-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{api.name}</span>
                  <span className="text-xs opacity-70">Port {api.port}</span>
                </div>
                <span className="text-xs opacity-80 text-left">
                  {api.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Viewer Type Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Viewer Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(['redoc', 'swagger', 'rapidoc', 'raw'] as ViewerType[]).map((type) => (
              <Button
                key={type}
                variant={viewerType === type ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewerType(type)}
                className="flex items-center gap-2"
              >
                {getViewerIcon(type)}
                <div className="flex flex-col items-start">
                  <span className="font-semibold capitalize">{type}</span>
                  <span className="text-xs opacity-80">
                    {getViewerDescription(type)}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            disabled={!viewerUrl}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSpec}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Download Spec
          </Button>
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">{selectedApi.name}</span> •{' '}
            <span className="capitalize">{viewerType}</span> viewer
          </div>
        </div>
      </div>

      {/* Viewer Container */}
      <div className="h-[calc(100%-180px)] w-full">
        {viewerType === 'raw' ? (
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
                  {selectedApi.specUrl}
                </code>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open(selectedApi.specUrl, '_blank')}
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
                      onClick={() => setViewerType('redoc')}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Redoc
                    </button>{' '}
                    - Beautiful, responsive 3-panel documentation
                  </li>
                  <li>
                    <button
                      onClick={() => setViewerType('swagger')}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Swagger UI
                    </button>{' '}
                    - Interactive API explorer with live testing
                  </li>
                  <li>
                    <button
                      onClick={() => setViewerType('rapidoc')}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      RapiDoc
                    </button>{' '}
                    - Modern, customizable API documentation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // Iframe viewer
          <iframe
            key={viewerUrl}
            src={viewerUrl}
            title={`${selectedApi.name} - ${viewerType}`}
            className="h-full w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
          />
        )}
      </div>
    </div>
  );
}

export default APIViewerPage;
