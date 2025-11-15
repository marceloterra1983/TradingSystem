import { ExternalLink, Maximize2, RefreshCw } from "@/icons";
import { useState } from "react";

import { IframeWithUrl } from "../common/IframeWithUrl";
import { ComponentLoadingSpinner } from "../ui/PageLoadingSpinner";
import { Button } from "../ui/button";

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
  const miroUrl = "https://miro.com/app/board/uXjVJ3tP9YI=/";
  const miroEmbedUrl = "https://miro.com/app/live-embed/uXjVJ3tP9YI=/";
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const handleOpenExternal = () => {
    window.open(miroUrl, "_blank", "noopener,noreferrer");
  };

  const handleRetry = () => {
    setStatus("loading");
    setIframeKey((prev) => prev + 1);
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
      <div className="relative flex-1 w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        {status === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur transition-opacity">
            <ComponentLoadingSpinner />
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 px-6 text-center">
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Não foi possível carregar o board do Miro.
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Verifique sua conexão ou tente abrir o board em uma nova aba.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no Miro
              </Button>
            </div>
          </div>
        )}

        <IframeWithUrl
          key={iframeKey}
          src={miroEmbedUrl}
          className="w-full h-full"
          style={{
            border: "none",
            height: "calc(100vh - 60px)", // Subtrai a altura do header
            minHeight: "calc(100vh - 60px)",
          }}
          allowFeatures={["fullscreen", "clipboard-read", "clipboard-write"]}
          sandboxPermissions={[
            "allow-same-origin",
            "allow-scripts",
            "allow-popups",
            "allow-forms",
            "allow-modals",
          ]}
          title="Miro Board - TradingSystem"
          wrapperClassName="h-full"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          hidden={status === "error"}
        />
      </div>
    </div>
  );
}

export default MiroPage;
