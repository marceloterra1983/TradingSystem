import * as React from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";
import { useToast } from "../../hooks/useToast";

const WAHA_URL =
  import.meta.env.VITE_WAHA_DASHBOARD_URL || "http://localhost:3310/dashboard/";

export default function WahaPage() {
  const toast = useToast();
  const [iframeKey, setIframeKey] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  const handleReload = () => {
    setHasError(false);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      {hasError ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-red-300 text-sm text-red-600 dark:border-red-900 dark:text-red-200">
          <p>Não foi possível carregar o dashboard do WAHA.</p>
          <button
            onClick={handleReload}
            className="mt-3 rounded bg-red-600 px-3 py-1 text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <IframeWithUrl
          key={iframeKey}
          src={WAHA_URL}
          title="WAHA Dashboard"
          wrapperClassName="h-full flex-1 min-h-[700px]"
          showLink={false}
          className="w-full h-full flex-1 rounded-xl border border-gray-200 shadow-sm dark:border-gray-800"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
          allow="clipboard-read; clipboard-write"
          onError={() => {
            setHasError(true);
            toast.error(
              "WAHA dashboard indisponível. Verifique se o stack está rodando.",
            );
          }}
        />
      )}
    </div>
  );
}
