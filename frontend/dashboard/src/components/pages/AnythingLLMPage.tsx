/**
 * AnythingLLM Page
 *
 * Embedded interface for AnythingLLM RAG system
 */

import { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const ANYTHINGLLM_URL =
  import.meta.env.VITE_ANYTHINGLLM_URL || 'http://localhost:3001';

export default function AnythingLLMPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if AnythingLLM is accessible
    const checkHealth = async () => {
      try {
        const response = await fetch(`${ANYTHINGLLM_URL}/api/ping`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          setError(null);
        } else {
          setError('AnythingLLM is not responding correctly');
        }
      } catch (err) {
        setError('Unable to connect to AnythingLLM. Is the container running?');
        console.error('[AnythingLLM] Health check failed:', err);
      }
    };

    checkHealth();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    // Force iframe reload
    const iframe = document.getElementById(
      'anythingllm-iframe',
    ) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const handleOpenNewTab = () => {
    window.open(ANYTHINGLLM_URL, '_blank', 'noopener,noreferrer');
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            AnythingLLM Not Available
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Start the container with:
            </p>
            <code className="block rounded bg-slate-100 p-2 text-xs dark:bg-slate-700">
              docker compose -f tools/compose/docker-compose.anythingllm.yml up
              -d
            </code>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={handleOpenNewTab} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Header with actions */}
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur dark:bg-slate-800/90"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
        <Button
          onClick={handleOpenNewTab}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur dark:bg-slate-800/90"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in New Tab
        </Button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading AnythingLLM...
            </p>
          </div>
        </div>
      )}

      {/* AnythingLLM iframe */}
      <iframe
        id="anythingllm-iframe"
        src={ANYTHINGLLM_URL}
        title="AnythingLLM"
        className="h-full w-full border-0"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError('Failed to load AnythingLLM interface');
        }}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
