import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  fullUrl: string;
}

export function DocPreviewModal({
  isOpen,
  onClose,
  title,
  url,
  fullUrl,
}: DocPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setHasError(false);

    // Reset iframe scroll position when opening
    if (iframeRef.current) {
      iframeRef.current.src = fullUrl;
    }

    // Timeout to detect if iframe failed to load
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[DocPreview] Iframe taking too long to load, may be blocked');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isOpen, fullUrl, isLoading]);

  const handleIframeLoad = () => {
    console.log('[DocPreview] Iframe loaded successfully');
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    console.error('[DocPreview] Iframe failed to load');
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                {url}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fullUrl, '_blank')}
                className="whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Abrir em nova aba
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600 dark:text-sky-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Carregando documento...
                </p>
              </div>
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 z-10">
              <div className="flex flex-col items-center gap-3 max-w-md text-center p-6">
                <div className="text-red-600 dark:text-red-400 text-4xl">⚠️</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Erro ao carregar preview
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  O documento não pôde ser carregado no preview. Isso pode acontecer devido a
                  restrições de segurança do navegador.
                </p>
                <Button
                  onClick={() => window.open(fullUrl, '_blank')}
                  variant="default"
                  className="mt-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={fullUrl}
            className="w-full h-full border-0"
            title={`Preview: ${title}`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
