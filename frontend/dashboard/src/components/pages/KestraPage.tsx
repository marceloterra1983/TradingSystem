import { useMemo } from 'react';

const DEFAULT_KESTRA_HTTP_URL = 'http://localhost:8180';

const sanitizeUrl = (value: string | undefined, fallback: string): string => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  try {
    const url = new URL(value.trim());
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return fallback;
  }
};

const resolveKestraUrls = () => {
  const env = import.meta.env as Record<string, string | undefined>;
  const baseUrl = sanitizeUrl(
    env.VITE_KESTRA_BASE_URL,
    DEFAULT_KESTRA_HTTP_URL,
  );
  return {
    uiUrl: `${baseUrl}/ui`,
  };
};

export function KestraPage(): JSX.Element {
  const { uiUrl } = useMemo(resolveKestraUrls, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <iframe
        src={uiUrl}
        className="w-full h-full"
        style={{
          border: 'none',
        }}
        title="Kestra Orchestrator UI"
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  );
}

export default KestraPage;
