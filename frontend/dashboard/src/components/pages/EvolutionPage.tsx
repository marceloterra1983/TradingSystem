import { useMemo } from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";

const DEFAULT_EVOLUTION_MANAGER_URL = "http://localhost:4203";

const resolveEvolutionUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const configuredUrl = env.VITE_EVOLUTION_MANAGER_URL;

  if (!configuredUrl) {
    return DEFAULT_EVOLUTION_MANAGER_URL;
  }

  try {
    const parsed = new URL(configuredUrl);
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return DEFAULT_EVOLUTION_MANAGER_URL;
  }
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
