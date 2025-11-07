import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import EscopoPageNew from './EscopoPageNew';
import APIViewerPage from './APIViewerPage';
import DocsHybridSearchPage from './DocsHybridSearchPage';
import { apiConfig } from '../../config/api';
import DocumentationMetricsPage from './DocumentationMetricsPage';
import { IframeWithUrl } from '../common/IframeWithUrl';

type DocsView = 'overview' | 'docs' | 'metrics' | 'docsApi' | 'docsHybrid';

const VIEW_KEYS: DocsView[] = ['overview', 'docs', 'metrics', 'docsApi', 'docsHybrid'];

const resolveInitialView = (): DocsView => {
  if (typeof window === 'undefined') {
    return 'docs';
  }
  const hash = window.location.hash ?? '';
  const queryIndex = hash.indexOf('?');
  const queryString = queryIndex >= 0 ? hash.substring(queryIndex + 1) : '';
  const params = new URLSearchParams(queryString);
  const viewParam = params.get('view');
  if (viewParam && VIEW_KEYS.includes(viewParam as DocsView)) {
    return viewParam as DocsView;
  }
  return 'docs';
};

export function DocusaurusPageNew() {
  const [activeView, setActiveView] = useState<DocsView>(resolveInitialView);
  const isOverview = activeView === 'overview';
  const isDocsView = activeView === 'docs';
  const isMetricsView = activeView === 'metrics';
  const isDocsApiView = activeView === 'docsApi';
  const isDocsHybridView = activeView === 'docsHybrid';

  // Iframe source for Docusaurus (version next for development/unreleased docs)
  const iframeSrc = isDocsView ? 'http://localhost:3404/next/' : undefined;
  const iframeTitle = activeView === 'docs' ? 'TradingSystem Documentation Portal' : undefined;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    url.hash = '#/docs';
    const params = new URLSearchParams();
    if (activeView !== 'docs') {
      params.set('view', activeView);
    }
    const queryString = params.toString();
    if (queryString) {
      url.hash = `${url.hash}?${queryString}`;
    }
    window.history.replaceState(null, '', url.toString());
  }, [activeView]);

  console.log('[DocusaurusPage] activeView:', activeView);
  console.log('[DocusaurusPage] iframeSrc:', iframeSrc);
  console.log('[DocusaurusPage] DEV mode:', import.meta.env.DEV);

  const handleOpenInNewTab = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') {
      return;
    }
    if (isOverview) {
      window.open(
        `${window.location.origin}/#/escopo`,
        '_blank',
        'noopener,noreferrer',
      );
    } else if (isDocsHybridView) {
      window.open(
        `${window.location.origin}/#/docs-hybrid-search`,
        '_blank',
        'noopener,noreferrer',
      );
    } else if (isDocsApiView) {
      window.open(apiConfig.docsApiUrl, '_blank', 'noopener,noreferrer');
    } else if (isMetricsView) {
      window.open(`${window.location.origin}/#/docs?view=metrics`, '_blank', 'noopener,noreferrer');
    } else if (iframeSrc) {
      window.open(iframeSrc, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewChange = (
    view: DocsView,
  ) => {
    console.log('[DocusaurusPage] Changing view to:', view);
    setActiveView(view);
  };

  const canOpenInNewTab =
    isOverview || isDocsApiView || isDocsHybridView || isMetricsView || Boolean(iframeSrc);

  return (
    <div className="min-h-[calc(100vh-160px)] w-full">
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isOverview ? 'primary' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('overview');
            }}
            disabled={isOverview}
          >
            Overview
          </Button>
          <Button
            variant={isDocsView ? 'primary' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('docs');
            }}
            disabled={isDocsView}
          >
            Docusaurus
          </Button>
          <Button
            variant={isMetricsView ? 'primary' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('metrics');
            }}
            disabled={isMetricsView}
          >
            Metrics
          </Button>
          <Button
            variant={activeView === 'docsApi' ? 'primary' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('docsApi');
            }}
            disabled={activeView === 'docsApi'}
          >
            DocsAPI
          </Button>
          <Button
            variant={isDocsHybridView ? 'primary' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('docsHybrid');
            }}
            disabled={isDocsHybridView}
          >
            Docs Search
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInNewTab}
          disabled={!canOpenInNewTab}
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
      ) : isMetricsView ? (
        <div className="h-[calc(100vh-120px)] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900">
          <DocumentationMetricsPage />
        </div>
      ) : isDocsApiView ? (
        <APIViewerPage />
      ) : isDocsHybridView ? (
        <DocsHybridSearchPage />
      ) : (
        <div className="h-[calc(100vh-120px)] w-full flex flex-col">
          {iframeSrc ? (
            <IframeWithUrl
              key={iframeSrc}
              src={iframeSrc}
              title={iframeTitle}
              className="flex-1 w-full h-full min-h-[calc(100vh-140px)] rounded-lg border-2 border-blue-500 shadow-sm"
              wrapperClassName="flex-1"
              onLoad={() =>
                console.log('[DocusaurusPage] Iframe carregado com sucesso')
              }
              onError={() =>
                console.error('[DocusaurusPage] Erro ao carregar iframe')
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              No URL configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default DocusaurusPageNew;
