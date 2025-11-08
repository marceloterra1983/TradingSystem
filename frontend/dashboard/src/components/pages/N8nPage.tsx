import { useMemo } from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";

/**
 * Resolve n8n URL using Vite proxy to avoid browser blocking of embedded credentials.
 * The proxy handles Basic Auth via headers (configured in vite.config.ts).
 */
const resolveN8nUrl = () => {
  const env = import.meta.env as Record<string, string | undefined>;

  // Use Vite proxy path (relative, no credentials in URL)
  // The proxy adds Basic Auth headers automatically
  const useProxy = env.VITE_N8N_USE_PROXY !== "false"; // Default to true

  if (useProxy) {
    return "/n8n/";
  }

  // Fallback to direct URL (for development outside Docker)
  // Note: Browsers block credentials in URLs, so this may not work
  const baseUrl = env.VITE_N8N_URL || "http://localhost:3680";
  const sanitized = baseUrl.replace(/\/+$/, "");
  return `${sanitized}/`;
};

export function N8nPage(): JSX.Element {
  const iframeUrl = useMemo(resolveN8nUrl, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <IframeWithUrl
        src={iframeUrl}
        className="w-full h-full"
        style={{ border: "none" }}
        title="n8n Automations"
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
        wrapperClassName="h-full"
      />
    </div>
  );
}

export default N8nPage;
