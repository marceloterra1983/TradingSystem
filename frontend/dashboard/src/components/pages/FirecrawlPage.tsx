import { useMemo } from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";

const DEFAULT_FIRECRAWL_UI_URL = "http://localhost:3002";

const resolveFirecrawlUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const configuredUrl = env.VITE_FIRECRAWL_UI_URL || env.VITE_FIRECRAWL_PROXY_URL;

  if (!configuredUrl) {
    return DEFAULT_FIRECRAWL_UI_URL;
  }

  try {
    const parsed = new URL(configuredUrl);
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return DEFAULT_FIRECRAWL_UI_URL;
  }
};

export function FirecrawlPage(): JSX.Element {
  const firecrawlUrl = useMemo(resolveFirecrawlUrl, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <IframeWithUrl
        src={firecrawlUrl}
        className="w-full h-full"
        style={{ border: "none" }}
        title="Firecrawl UI"
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
        wrapperClassName="h-full"
      />
    </div>
  );
}

export default FirecrawlPage;
