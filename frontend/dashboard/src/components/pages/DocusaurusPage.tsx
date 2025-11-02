import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import EscopoPageNew from './EscopoPageNew';
import APIViewerPage from './APIViewerPage';
import DocsHybridSearchPage from './DocsHybridSearchPage';
import { apiConfig } from '../../config/api';
import { resolveDocsVersionRoot } from '../../utils/docusaurus';

export function DocusaurusPageNew() {
  const [activeView, setActiveView] = useState<
    'overview' | 'docs' | 'docsApi' | 'docsHybrid'
  >('docs');
  const isOverview = activeView === 'overview';
  const isDocsView = activeView === 'docs';
  const isDocsApiView = activeView === 'docsApi';
  const isDocsHybridView = activeView === 'docsHybrid';

  const docsVersionRoot = resolveDocsVersionRoot('next', {
    absolute: true,
    trailingSlash: true,
  });
  const iframeSrc = isDocsView ? docsVersionRoot : undefined;
  const iframeTitle =
    activeView === 'docs' ? 'TradingSystem Documentation Portal' : undefined;

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
    } else if (iframeSrc) {
      window.open(iframeSrc, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewChange = (
    view: 'overview' | 'docs' | 'docsApi' | 'docsHybrid',
  ) => {
    console.log('[DocusaurusPage] Changing view to:', view);
    setActiveView(view);
  };

  const canOpenInNewTab =
    isOverview || isDocsApiView || isDocsHybridView || Boolean(iframeSrc);

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
      ) : isDocsApiView ? (
        <APIViewerPage />
      ) : isDocsHybridView ? (
        <DocsHybridSearchPage />
      ) : (
        <div className="h-[calc(100vh-200px)] w-full flex flex-col">
          <div className="mb-2 p-2 bg-blue-50 dark:bg-slate-800 rounded text-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <strong>Status:</strong>{' '}
              {iframeSrc
                ? `Carregando de: ${iframeSrc}`
                : 'Sem URL configurada'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              Se o conteúdo não aparecer, verifique se o Docusaurus está rodando
              em {iframeSrc}
            </p>
          </div>
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title={iframeTitle}
              className="flex-1 w-full rounded-lg border-2 border-blue-500 shadow-sm"
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
