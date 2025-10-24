import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { ButtonWithDropdown } from '../ui/button-with-dropdown';
import { Button } from '../ui/button';
import { apiConfig } from '../../config/api';

type DatabaseViewKey = 'questdbConsole' | 'pgAdmin' | 'pgWeb';

interface EndpointOption {
  label: string;
  url: string;
}

interface DatabaseViewDefinition {
  label: string;
  openLabel: string;
  iframeTitle: string;
  endpoints: EndpointOption[];
  sandbox?: string;
  allow?: string;
}

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
};

const databaseViewOrder: DatabaseViewKey[] = [
  'questdbConsole',
  'pgAdmin',
  'pgWeb',
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
  });

  const viewDefinition = databaseViews[activeView];
  const iframeUrl = endpointUrls[activeView];

  const handleOpenInNewTab = React.useCallback(() => {
    if (typeof window === 'undefined' || !iframeUrl) {
      return;
    }
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  }, [iframeUrl]);

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
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          title={viewDefinition.iframeTitle}
          className="h-[calc(100%-40px)] w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
          sandbox={sandbox}
          allow={allow}
        />
      ) : (
        <div className="flex h-[calc(100%-40px)] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum endpoint configurado para esta ferramenta.
        </div>
      )}
    </div>
  );
}

export default DatabasePageNew;

