import { useMemo } from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";

const DEFAULT_DIRECT_URL = "http://localhost:4203/manager";

const ensureManagerPath = (value: string): string => {
  if (!value) {
    return "/manager";
  }

  if (/\/manager(?:\/|$)/.test(value)) {
    return value;
  }

  return value.endsWith("/") ? `${value}manager` : `${value}/manager`;
};

const sanitizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const resolveEvolutionUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const configuredUrl = env.VITE_EVOLUTION_MANAGER_URL?.trim();
  const preferGateway = env.VITE_USE_UNIFIED_DOMAIN !== "false";
  const defaultGatewayPath = ensureManagerPath("/apps/evolution-manager");

  if (configuredUrl) {
    if (/^https?:\/\//i.test(configuredUrl)) {
      try {
        const parsed = new URL(configuredUrl);
        parsed.pathname = ensureManagerPath(parsed.pathname || "/");
        return parsed.toString();
      } catch {
        return ensureManagerPath(configuredUrl);
      }
    }

    const normalized = configuredUrl.startsWith("/")
      ? configuredUrl
      : `/${configuredUrl}`;
    return ensureManagerPath(normalized);
  }

  if (preferGateway) {
    const gatewayBase = env.VITE_GATEWAY_HTTP_URL?.trim();
    if (gatewayBase) {
      return `${sanitizeBaseUrl(gatewayBase)}${defaultGatewayPath}`;
    }
    return defaultGatewayPath;
  }

  return DEFAULT_DIRECT_URL;
};

export function EvolutionPage(): JSX.Element {
  const managerUrl = useMemo(resolveEvolutionUrl, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <IframeWithUrl
        src={managerUrl}
        className="w-full h-full"
        style={{ border: "none" }}
        title="Evolution Manager"
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
        wrapperClassName="h-full"
      />
    </div>
  );
}

export default EvolutionPage;
