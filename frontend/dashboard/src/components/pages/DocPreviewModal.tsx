import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

/**
 * Modal overlay for previewing Docusaurus documents in-page
 * Opens as overlay on current page instead of new window
 */
export function DocPreviewModal({ isOpen, onClose, title, url }: DocPreviewModalProps) {
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

        {/* Content - Iframe */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-800 overflow-hidden">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
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
