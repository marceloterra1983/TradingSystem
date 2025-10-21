import { ExternalLink, Maximize2 } from 'lucide-react';

/**
 * MiroPage Component
 *
 * Exibe o Miro board diretamente em um iframe no dashboard
 * Board URL: https://miro.com/app/board/uXjVJ3tP9YI=/
 *
 * Features:
 * - Iframe em tela cheia ocupando todo o espaço disponível
 * - Permite edição direta dentro do dashboard
 * - Botão para abrir em nova aba se preferir
 */
export function MiroPage() {
  const miroUrl = 'https://miro.com/app/board/uXjVJ3tP9YI=/';
  const miroEmbedUrl = 'https://miro.com/app/live-embed/uXjVJ3tP9YI=/';

  const handleOpenExternal = () => {
    window.open(miroUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header Toolbar - Minimal */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.392 0H13.9L17 4.808 10.444 0h-3.49L12.4 5.223 6.413 0h-3.8l6.176 5.7L1.018 0H0v7.087L6.53 2.325l-6.53 6.653v3.738l9.598-9.674 9.359 9.58V8.698L13.955 4.11 24 11.75V0z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Miro Board
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Abrir em tela cheia"
          >
            <Maximize2 className="w-3 h-3" />
            Tela Cheia
          </button>
          <a
            href={miroUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Abrir no Miro"
          >
            <ExternalLink className="w-3 h-3" />
            Miro
          </a>
        </div>
      </div>

      {/* Miro Board iframe - Maximum Size */}
      <div className="flex-1 w-full overflow-hidden">
        <iframe
          src={miroEmbedUrl}
          className="w-full h-full"
          style={{
            border: 'none',
            height: 'calc(100vh - 60px)', // Subtrai a altura do header
            minHeight: 'calc(100vh - 60px)',
          }}
          allow="fullscreen; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          title="Miro Board - TradingSystem"
        />
      </div>
    </div>
  );
}

export default MiroPage;
