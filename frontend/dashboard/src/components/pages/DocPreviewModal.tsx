import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import documentationService from '../../services/documentationService';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  docPath: string;
}

/**
 * Modal overlay for previewing Docusaurus documents in-page
 * Opens as overlay on current page instead of new window
 */
export function DocPreviewModal({ isOpen, onClose, title, url, docPath }: DocPreviewModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !docPath) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setContent('');

      try {
        const raw = await documentationService.getDocContent(docPath);
        if (!cancelled) {
          const stripped = raw.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/u, '');
          setContent(stripped.trim());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar documento');
          setContent('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, docPath]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Container */}
      <div
        className="relative z-10 w-[95vw] h-[95vh] max-w-7xl bg-white dark:bg-slate-900 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 text-white">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{title}</h2>
            <p className="text-sm opacity-90 truncate mt-1">
              {url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Fechar (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Markdown preview */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/60">
          {loading ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando conteúdo…</span>
            </div>
          ) : error ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Não foi possível carregar a pré-visualização.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              </div>
            </div>
          ) : (
            <div className="max-h-full overflow-y-auto">
              <div className="prose prose-slate max-w-4xl p-8 dark:prose-invert prose-headings:scroll-mt-20">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
          <div className="text-slate-600 dark:text-slate-400">
            Pressione <kbd className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">ESC</kbd> ou clique fora para fechar
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors"
          >
            Abrir em Nova Aba
          </a>
        </div>
      </div>
    </div>
  );
}
