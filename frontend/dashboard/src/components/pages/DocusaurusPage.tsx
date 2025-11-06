import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import EscopoPageNew from './EscopoPageNew';
import APIViewerPage from './APIViewerPage';
import DocsHybridSearchPage from './DocsHybridSearchPage';
import { apiConfig } from '../../config/api';

export function DocusaurusPageNew() {
  const [activeView, setActiveView] = useState<
    'overview' | 'docs' | 'docsApi' | 'docsHybrid'
  >('docs');
  const isOverview = activeView === 'overview';
  const isDocsView = activeView === 'docs';
  const isDocsApiView = activeView === 'docsApi';
  const isDocsHybridView = activeView === 'docsHybrid';

  console.log('[DocusaurusPage] activeView:', activeView);
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
    } else if (isDocsView) {
      window.open('http://localhost:3404/next/', '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewChange = (
    view: 'overview' | 'docs' | 'docsApi' | 'docsHybrid',
  ) => {
    console.log('[DocusaurusPage] Changing view to:', view);
    setActiveView(view);
  };

  const canOpenInNewTab =
    isOverview || isDocsApiView || isDocsHybridView || isDocsView;

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
        <div className="h-[calc(100vh-200px)] w-full flex flex-col items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-blue-500 p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                📖 Documentação Completa
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                A documentação do TradingSystem está disponível no Docusaurus standalone para melhor experiência de navegação.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>URL:</strong>{' '}
                  <code className="bg-white dark:bg-slate-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400">
                    http://localhost:3404/next/
                  </code>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => window.open('http://localhost:3404/next/', '_blank', 'noopener,noreferrer')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Abrir Documentação
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    navigator.clipboard.writeText('http://localhost:3404/next/');
                    alert('URL copiada para área de transferência!');
                  }}
                >
                  Copiar URL
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  💡 <strong>Dica:</strong> Adicione aos favoritos para acesso rápido
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DocusaurusPageNew;
