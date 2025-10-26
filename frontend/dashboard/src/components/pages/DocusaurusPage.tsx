import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { apiConfig } from '../../config/api';
import EscopoPageNew from './EscopoPageNew';
import APIViewerPage from './APIViewerPage';

export function DocusaurusPageNew() {
  const [activeView, setActiveView] = useState<'overview' | 'docs' | 'docsApi'>('docs');
  const isOverview = activeView === 'overview';
  const isDocsView = activeView === 'docs';
  const isDocsApiView = activeView === 'docsApi';

  // Use absolute URL for iframe (iframes don't use Vite proxy)
  // Development: http://localhost:3400
  // Production: Use the configured docsUrl
  const iframeSrc = activeView === 'docs'
    ? (import.meta.env.DEV ? 'http://localhost:3400' : apiConfig.docsUrl)
    : undefined;
  const iframeTitle = activeView === 'docs' ? 'TradingSystem Documentation Portal' : undefined;

  const handleOpenInNewTab = () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isOverview) {
      window.open(`${window.location.origin}/#/escopo`, '_blank', 'noopener,noreferrer');
    } else if (isDocsApiView) {
      window.open(apiConfig.docsApiUrl, '_blank', 'noopener,noreferrer');
    } else if (iframeSrc) {
      window.open(iframeSrc, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] w-full">
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isOverview ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('overview')}
            disabled={isOverview}
          >
            Overview
          </Button>
          <Button
            variant={isDocsView ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('docs')}
            disabled={isDocsView}
          >
            Docusaurus
          </Button>
          <Button
            variant={activeView === 'docsApi' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('docsApi')}
            disabled={activeView === 'docsApi'}
          >
            DocsAPI
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInNewTab}
          disabled={isOverview ? false : (!iframeSrc && !isDocsApiView)}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>
      {isOverview ? (
        <div className="h-[calc(100%-40px)] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900">
          <div className="min-h-full px-4 py-4 sm:px-6 sm:py-6">
            <EscopoPageNew />
          </div>
        </div>
      ) : isDocsApiView ? (
        <APIViewerPage />
      ) : (
        <iframe
          src={iframeSrc}
          title={iframeTitle}
          className="h-[calc(100%-40px)] w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
          allow="clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation"
        />
      )}
    </div>
  );
}
export default DocusaurusPageNew;
