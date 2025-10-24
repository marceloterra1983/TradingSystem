import React from 'react';
import { apiConfig } from '@/config/api';

export const DocsApiPage: React.FC = () => {
  return (
    <div className="h-[calc(100vh-160px)] w-full">
      <div className="flex justify-end mb-2">
        <a
          href={apiConfig.docsApiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-900/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in new tab
        </a>
      </div>
      <iframe
        src={apiConfig.docsApiUrl}
        title="TradingSystem API Documentation Portal"
        className="h-[calc(100%-40px)] w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  );
};

export default DocsApiPage;
