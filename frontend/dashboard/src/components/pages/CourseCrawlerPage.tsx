import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

import { Button } from "../ui/button";
import { IframeWithUrl } from "../common/IframeWithUrl";

const DEFAULT_DIRECT_URL = "http://localhost:4201";
const DEFAULT_GATEWAY_PATH = "/apps/course-crawler";
const HEALTH_TIMEOUT_MS = 7000;

const normalizePath = (path: string) => {
  if (!path) return DEFAULT_GATEWAY_PATH;
  return path.startsWith("/") ? path : `/${path}`;
};

const sanitizeUrl = (url: string) => url.replace(/\/+$/, "");

const resolveCourseCrawlerUrl = () => {
  const env = import.meta.env;
  const runtimeOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const preferDirect = env.DEV || env.VITE_USE_DIRECT_COURSE_CRAWLER === "true";
  const directUrl = preferDirect
    ? env.VITE_COURSE_CRAWLER_APP_URL?.trim()
    : undefined;

  if (directUrl) {
    try {
      const url = new URL(directUrl, runtimeOrigin ?? DEFAULT_DIRECT_URL);
      return url.toString();
    } catch {
      return directUrl;
    }
  }

  const path = normalizePath(env.VITE_COURSE_CRAWLER_GATEWAY_PATH ?? "");
  const gatewayBase = env.VITE_GATEWAY_HTTP_URL?.trim() || runtimeOrigin;

  if (gatewayBase) {
    return `${sanitizeUrl(gatewayBase)}${path}`;
  }

  return DEFAULT_DIRECT_URL;
};

const canCheckHealth = (iframeUrl: string) => {
  if (typeof window === "undefined") return false;
  try {
    const iframeOrigin = new URL(iframeUrl, window.location.origin).origin;
    return iframeOrigin === window.location.origin;
  } catch {
    return false;
  }
};

const buildHealthUrl = (url: URL) => {
  const normalizedPath = url.pathname.endsWith("/")
    ? `${url.pathname}health`
    : `${url.pathname}/health`;
  return `${url.origin}${normalizedPath}`;
};

export default function CourseCrawlerPage() {
  const iframeUrl = useMemo(() => resolveCourseCrawlerUrl(), []);
  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    "checking",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runHealthCheck = useCallback(async () => {
    if (!iframeUrl) {
      setStatus("error");
      setErrorMessage("URL do Course Crawler não configurada.");
      return;
    }

    if (!canCheckHealth(iframeUrl)) {
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    setStatus("checking");
    setErrorMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        HEALTH_TIMEOUT_MS,
      );

      const url = new URL(iframeUrl, window.location.origin);
      const healthUrl = buildHealthUrl(url);

      const response = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      if (mountedRef.current) {
        setStatus("ready");
        setErrorMessage(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.name === "AbortError"
          ? "Timeout ao verificar o Course Crawler. Confirme se a stack está ativa."
          : "Não foi possível acessar o Course Crawler via gateway. Confirme se a stack 4-5 está rodando.",
      );
    }
  }, [iframeUrl]);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck, retryKey]);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  const showStatus =
    status === "checking" || status === "error" || errorMessage !== null;

  return (
    <div className="h-[calc(100vh-8rem)] w-full space-y-4">
      {showStatus && (
        <div
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
          data-testid="course-crawler-status"
        >
          <div className="flex items-center gap-3">
            {status === "ready" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                {status === "checking"
                  ? "Verificando disponibilidade…"
                  : status === "ready"
                    ? "Course Crawler disponível via gateway."
                    : "Course Crawler indisponível."}
              </span>
              {errorMessage && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {errorMessage}
                </span>
              )}
            </div>
          </div>
          {status !== "ready" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      <IframeWithUrl
        key={retryKey}
        title="Course Crawler"
        src={iframeUrl}
        className="h-full w-full border-0 rounded-lg shadow-sm bg-white dark:bg-slate-900"
        wrapperClassName="h-full"
        showLink
        allow="fullscreen; clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
      />
    </div>
  );
}
