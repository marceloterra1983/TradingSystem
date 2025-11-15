import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from './ui/collapsible-card';
import { Button } from './ui/button';
import { Terminal, RefreshCcw, Copy } from 'lucide-react';

const DEFAULT_CONTROL_URL = 'http://127.0.0.1:9880';
const DOCKER_CONTROL_URL =
  (import.meta.env.VITE_DOCKER_CONTROL_URL as string | undefined)?.replace(/\/$/, '') ??
  DEFAULT_CONTROL_URL;
const DOCKER_COMMAND = 'docker logs -f course-crawler-worker';

export function WorkerLogsSection() {
  const [logs, setLogs] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const abortController = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (showLoading = false) => {
    try {
      if (abortController.current) {
        abortController.current.abort();
      }
      const controller = new AbortController();
      abortController.current = controller;

      if (showLoading) {
        setIsLoading(true);
      }

      const response = await fetch(`${DOCKER_CONTROL_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logs',
          container: 'course-crawler-worker',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${response.status}`);
      }

      const data: { success: boolean; output?: string; error?: string } = await response.json();
      if (!data.success) {
        throw new Error(data.error ?? 'Docker control server returned an error');
      }

      setLogs((data.output ?? '').trim());
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to fetch logs from docker-control server.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);
    return () => abortController.current?.abort();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = window.setInterval(() => fetchLogs(false), 5000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(DOCKER_COMMAND).then(() => {
      alert('Command copied! Run it in your terminal to follow live logs.');
    });
  };

  const helperMessage = useMemo(() => {
    if (error) {
      return (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}. Certifique-se de que o Docker Control Server esteja rodando em{' '}
          <code>{DOCKER_CONTROL_URL}</code>.
        </p>
      );
    }
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Os logs são atualizados automaticamente a cada 5s via Docker Control Server (
        <code>{DOCKER_CONTROL_URL}</code>). Execute{' '}
        <code className="font-mono text-xs">{DOCKER_COMMAND}</code> no terminal para modo follow
        completo.
      </p>
    );
  }, [error]);

  return (
    <CollapsibleCard cardId="course-crawler-worker-logs" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cyan-500" />
          <div>
            <CollapsibleCardTitle>Worker Logs</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Visualize rapidamente o output de `docker logs -f course-crawler-worker`
            </CollapsibleCardDescription>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => fetchLogs(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            {isLoading ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyCommand}
            className="border-gray-300 dark:border-gray-700"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copiar comando
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            Atualizar automaticamente
          </label>
        </div>

        <div className="rounded-lg border border-gray-200 bg-black/90 p-4 text-sm font-mono text-green-300 dark:border-gray-800">
          {logs ? (
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap">{logs}</pre>
          ) : (
            <p className="text-gray-400">
              Nenhum log disponível. Verifique se o worker está rodando e se o Docker Control
              Server está ativo.
            </p>
          )}
        </div>

        <div className="mt-3">{helperMessage}</div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
