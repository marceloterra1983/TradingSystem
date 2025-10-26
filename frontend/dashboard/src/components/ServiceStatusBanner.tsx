import { AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import { useServiceStatusBanner } from '../hooks/useServiceStatusBanner';

export function ServiceStatusBanner() {
  const { shouldShowBanner, downCount, degradedCount, downServices } = useServiceStatusBanner();

  if (!shouldShowBanner) return null;

  const hasCriticalIssues = downCount > 0;
  const serviceNames = downServices.map((s: any) => s.name).join(', ');

  return (
    <div
      className={`border-b px-4 py-2 ${
        hasCriticalIssues
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasCriticalIssues ? (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <p
            className={`text-sm font-medium ${
              hasCriticalIssues
                ? 'text-red-800 dark:text-red-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}
          >
            {hasCriticalIssues ? (
              <>
                {downCount} {downCount === 1 ? 'serviço offline' : 'serviços offline'}
                {serviceNames && `: ${serviceNames}`}
              </>
            ) : (
              <>
                {degradedCount} {degradedCount === 1 ? 'serviço degradado' : 'serviços degradados'}
              </>
            )}
          </p>
        </div>
        <a
          href="#/status"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          Ver detalhes
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

