import * as React from 'react';
import { ExternalLink, Play, Loader2 } from 'lucide-react';
import { ButtonWithDropdown } from '../ui/button-with-dropdown';
import { Button } from '../ui/button';
import { apiConfig } from '../../config/api';
import { useStartContainer } from '../../hooks/useStartContainer';
import { useContainerStatus } from '../../hooks/useContainerStatus';

type DatabaseViewKey = 'questdbConsole' | 'pgAdmin' | 'pgWeb' | 'adminer';
type ContainerName = 'questdb' | 'pgadmin' | 'pgweb' | 'adminer';

interface EndpointOption {
  label: string;
  url: string;
}

interface DatabaseViewDefinition {
  label: string;
  openLabel: string;
  iframeTitle: string;
  endpoints: EndpointOption[];
  containerName?: ContainerName;
  sandbox?: string;
  allow?: string;
}

// Map database view keys to container names
const viewToContainer: Record<DatabaseViewKey, ContainerName | null> = {
  questdbConsole: 'questdb',
  pgAdmin: 'pgadmin',
  pgWeb: 'pgweb',
  adminer: 'adminer',
};

const uniqueByUrl = (options: EndpointOption[]): EndpointOption[] => {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.url || seen.has(option.url)) {
      return false;
    }
    seen.add(option.url);
    return true;
  });
};

const buildEndpointOptions = (
  primaryUrl: string,
  alternates: EndpointOption[] = []
): EndpointOption[] => {
  const baseOption: EndpointOption = { label: 'Auto', url: primaryUrl };
  return uniqueByUrl([baseOption, ...alternates]);
};

const databaseViews: Record<DatabaseViewKey, DatabaseViewDefinition> = {
  questdbConsole: {
    label: 'QuestDB',
    openLabel: 'Abrir QuestDB',
    iframeTitle: 'QuestDB',
    endpoints: buildEndpointOptions(apiConfig.questdbConsoleUrl, [
      { label: 'Port 9000', url: 'http://localhost:9000' },
      { label: 'Port 9002', url: 'http://localhost:9002' },
    ]),
  },
  pgAdmin: {
    label: 'pgAdmin',
    openLabel: 'Abrir pgAdmin',
    iframeTitle: 'pgAdmin',
    endpoints: buildEndpointOptions(apiConfig.pgAdminUrl),
    sandbox:
      'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads',
  },
  pgWeb: {
    label: 'pgweb',
    openLabel: 'Abrir pgweb',
    iframeTitle: 'pgweb',
    endpoints: buildEndpointOptions(apiConfig.pgWebUrl),
    sandbox:
      'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads',
  },
  adminer: {
    label: 'Adminer',
    openLabel: 'Abrir Adminer',
    iframeTitle: 'Adminer',
    endpoints: buildEndpointOptions(apiConfig.adminerUrl),
    sandbox:
      'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads',
  },
};

const databaseViewOrder: DatabaseViewKey[] = [
  'questdbConsole',
  'pgAdmin',
  'pgWeb',
  'adminer',
];
const defaultSandbox =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads';
const defaultAllow = 'clipboard-read; clipboard-write';

export function DatabasePageNew() {
  const [activeView, setActiveView] =
    React.useState<DatabaseViewKey>('questdbConsole');
  const [endpointUrls, setEndpointUrls] = React.useState<
    Record<DatabaseViewKey, string>
  >({
    questdbConsole: databaseViews.questdbConsole.endpoints[0]?.url ?? '',
    pgAdmin: databaseViews.pgAdmin.endpoints[0]?.url ?? '',
    pgWeb: databaseViews.pgWeb.endpoints[0]?.url ?? '',
    adminer: databaseViews.adminer.endpoints[0]?.url ?? '',
  });

  // Track iframe load errors (indicates container might not be running)
  const [iframeErrors, setIframeErrors] = React.useState<
    Record<DatabaseViewKey, boolean>
  >({
    questdbConsole: false,
    pgAdmin: false,
    pgWeb: false,
    adminer: false,
  });

  const viewDefinition = databaseViews[activeView];
  const iframeUrl = endpointUrls[activeView];
  const containerName = viewToContainer[activeView];
  const hasIframeError = iframeErrors[activeView];

  // Hook for checking container status
  const {
    isRunning: isContainerRunning,
    hasChecked: hasStatusCheckCompleted,
    checkStatus,
  } = useContainerStatus(containerName, iframeUrl);

  // Hook for starting containers
  const { mutate: startContainer, isPending: isStarting } = useStartContainer();

  const isInitialStatusCheck =
    Boolean(containerName) && !hasStatusCheckCompleted;
  const shouldShowOfflineMessage =
    Boolean(containerName) && hasStatusCheckCompleted && !isContainerRunning;
  const shouldShowStartButton = shouldShowOfflineMessage;

  const handleOpenInNewTab = React.useCallback(() => {
    if (typeof window === 'undefined' || !iframeUrl) {
      return;
    }
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  }, [iframeUrl]);

  // Handle iframe load success - clear error state
  const handleIframeLoad = React.useCallback(() => {
    setIframeErrors((prev) => ({ ...prev, [activeView]: false }));
  }, [activeView]);

  // Handle iframe load error - set error state
  const handleIframeError = React.useCallback(() => {
    setIframeErrors((prev) => ({ ...prev, [activeView]: true }));
  }, [activeView]);

  // Handle Start Container button click
  const handleStartContainer = React.useCallback(() => {
    if (!containerName) return;

    startContainer(containerName, {
      onSuccess: () => {
        // Clear error state and reload iframe after successful start
        setIframeErrors((prev) => ({ ...prev, [activeView]: false }));
        // Recheck status after a delay
        setTimeout(() => {
          checkStatus();
          // Force iframe reload by changing key
          setEndpointUrls((prev) => ({ ...prev }));
        }, 3000);
      },
    });
  }, [containerName, startContainer, activeView, checkStatus]);

  const sandbox = viewDefinition.sandbox ?? defaultSandbox;
  const allow = viewDefinition.allow ?? defaultAllow;

  return (
    <div className="h-[calc(100vh-160px)] w-full">
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {databaseViewOrder.map((viewKey) => {
              const definition = databaseViews[viewKey];
              const isActive = activeView === viewKey;
              const endpoints = definition.endpoints;

              return (
                <ButtonWithDropdown
                  key={viewKey}
                  label={definition.label}
                  options={endpoints.map((ep) => ({
                    label: ep.label,
                    value: ep.url,
                  }))}
                  selectedValue={endpointUrls[viewKey]}
                  onSelect={(url) => {
                    setEndpointUrls((prev) => ({ ...prev, [viewKey]: url }));
                    setActiveView(viewKey);
                  }}
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                />
              );
            })}
          </div>
          <div className="flex gap-2">
            {shouldShowStartButton && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartContainer}
                disabled={isStarting}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Container
                  </>
                )}
              </Button>
            )}
            {hasIframeError && containerName && isContainerRunning && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIframeErrors((prev) => ({ ...prev, [activeView]: false }));
                  // Force iframe reload
                  setEndpointUrls((prev) => ({ ...prev }));
                }}
              >
                Recarregar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              disabled={!iframeUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {viewDefinition.openLabel}
            </Button>
          </div>
        </div>
      </div>
      {!iframeUrl ? (
        <div className="flex h-[calc(100%-40px)] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum endpoint configurado para esta ferramenta.
        </div>
      ) : isInitialStatusCheck ? (
        <div className="flex h-[calc(100%-40px)] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-cyan-600 dark:text-cyan-400" />
          Verificando status do container...
        </div>
      ) : shouldShowOfflineMessage ? (
        <div className="flex h-[calc(100%-40px)] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            O container {viewDefinition.label} não está rodando.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleStartContainer}
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Container
              </>
            )}
          </Button>
        </div>
      ) : (
        <iframe
          key={`${activeView}-${endpointUrls[activeView]}`}
          src={iframeUrl}
          title={viewDefinition.iframeTitle}
          className="h-[calc(100%-40px)] w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
          sandbox={sandbox}
          allow={allow}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
}

export default DatabasePageNew;
