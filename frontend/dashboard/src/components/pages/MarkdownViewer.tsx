import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { buildDocsUrl } from '@/lib/docsUrl';

/**
 * Simple Markdown Viewer - Displays markdown content without Docusaurus shell
 * Used for popup windows to show clean document content
 */
export default function MarkdownViewer(): JSX.Element {
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path') || '';
  const title = searchParams.get('title') || 'Document';

  const [, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!path) {
        setError('No document path provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to fetch rendered markdown from Docusaurus through the dashboard proxy
        const docsUrl = buildDocsUrl(path);

        console.log('[MarkdownViewer] Fetching:', docsUrl);

        const response = await axios.get(docsUrl, {
          headers: { 'Accept': 'text/html,text/markdown,text/plain,*/*' },
          timeout: 10000,
        });

        setContent(response.data);
        setLoading(false);
      } catch (err) {
        console.error('[MarkdownViewer] Failed to fetch document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-lg text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Erro ao Carregar Documento
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <div className="text-sm text-slate-500 dark:text-slate-500 mb-6">
            <p>Caminho: <code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{path}</code></p>
          </div>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Simple header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">{title}</h1>
          <div className="flex gap-2">
            <a
              href={buildDocsUrl(path)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded hover:bg-sky-200 dark:hover:bg-sky-800"
            >
              Abrir no Docusaurus
            </a>
            <button
              onClick={() => window.close()}
              className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Content area - render as iframe for now (will show rendered Docusaurus page) */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <iframe
            src={buildDocsUrl(path)}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 120px)', minHeight: '600px' }}
            title={title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
