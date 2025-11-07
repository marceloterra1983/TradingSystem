import * as React from 'react';
import { ExternalLink, Loader2, Play, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { ButtonWithDropdown } from '../ui/button-with-dropdown';
import { ENDPOINTS } from '../../config/endpoints';
import { IframeWithUrl } from '../common/IframeWithUrl';
import { useToast } from '../../hooks/useToast';
import { startLauncherTool } from '../../services/launcherService';

type ToolId = 'pgadmin' | 'pgweb' | 'adminer' | 'questdb';

type EndpointOption = {
  label: string;
  url: string;
};

const DATABASE_UI_DEFAULTS: Record<ToolId, { url: string; label: string }> = {
  pgadmin: { url: '/db-ui/pgadmin', label: 'Proxy (/db-ui/pgadmin)' },
  pgweb: { url: 'http://localhost:8081', label: 'Porta 8081' },
  adminer: { url: 'http://localhost:8082', label: 'Porta 8082' },
  questdb: { url: 'http://localhost:9002', label: 'Porta 9002' },
};

const DIRECT_ENDPOINT_OPTIONS: Record<ToolId, EndpointOption[]> = {
  pgadmin: [
    { label: 'Direto (.env)', url: ENDPOINTS.pgAdmin },
    { label: 'Porta 5050', url: 'http://localhost:5050' },
    { label: 'Legacy 7100', url: 'http://localhost:7100' },
  ],
  pgweb: [
    { label: 'Proxy (/db-ui/pgweb)', url: '/db-ui/pgweb' },
    { label: 'Direto (.env)', url: ENDPOINTS.pgWeb },
    { label: 'Legacy 7102', url: 'http://localhost:7102' },
  ],
  adminer: [
    { label: 'Proxy (/db-ui/adminer)', url: '/db-ui/adminer' },
    { label: 'Direto (.env)', url: ENDPOINTS.adminer },
    { label: 'Legacy 7101', url: 'http://localhost:7101' },
  ],
  questdb: [
    { label: 'Proxy (/db-ui/questdb)', url: '/db-ui/questdb' },
    { label: 'Direto (.env)', url: ENDPOINTS.questdb },
    { label: 'Legacy 7010', url: 'http://localhost:7010' },
  ],
};

const uniqueEndpointOptions = (options: EndpointOption[]): EndpointOption[] => {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.url || seen.has(option.url)) {
      return false;
    }
    seen.add(option.url);
    return true;
  });
};

type DatabaseTool = {
  id: ToolId;
  name: string;
  description: string;
  defaultUrl: string;
  defaultLabel?: string;
  fallbackUrls?: EndpointOption[];
  docsLink?: string;
  startHints: string[];
};

type EndpointStatus = 'idle' | 'checking' | 'online' | 'offline';

const TOOLS: DatabaseTool[] = [
  {
    id: 'pgadmin',
    name: 'pgAdmin',
    description:
      'Console completo para administrar Postgres/TimescaleDB, criar schemas e gerenciar usuários.',
    defaultUrl: DATABASE_UI_DEFAULTS.pgadmin.url,
    defaultLabel: DATABASE_UI_DEFAULTS.pgadmin.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.pgadmin,
    docsLink: '/docs/ops/database-ui#pgadmin',
    startHints: [
      'bash scripts/docker/start-stacks.sh --phase timescale',
      'ou execute manualmente: docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-pgadmin',
    ],
  },
  {
    id: 'pgweb',
    name: 'pgweb',
    description:
      'Cliente web leve para consultas rápidas em Postgres/Timescale, ideal para inspeções e testes.',
    defaultUrl: DATABASE_UI_DEFAULTS.pgweb.url,
    defaultLabel: DATABASE_UI_DEFAULTS.pgweb.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.pgweb,
    docsLink: '/docs/ops/database-ui#pgweb',
    startHints: [
      'bash scripts/docker/start-stacks.sh --phase database-ui',
      'ou execute manualmente: docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-pgweb',
    ],
  },
  {
    id: 'adminer',
    name: 'Adminer',
    description:
      'Interface minimalista para manipular bancos SQL (Postgres, MySQL, etc.) em tarefas pontuais.',
    defaultUrl: DATABASE_UI_DEFAULTS.adminer.url,
    defaultLabel: DATABASE_UI_DEFAULTS.adminer.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.adminer,
    docsLink: '/docs/ops/database-ui#adminer',
    startHints: [
      'bash scripts/docker/start-stacks.sh --phase database-ui',
      'ou execute manualmente: docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-adminer',
    ],
  },
  {
    id: 'questdb',
    name: 'QuestDB Console',
    description:
      'Console SQL para séries temporais e análises de mercado (dados do TP Capital / ingestão histórica).',
    defaultUrl: DATABASE_UI_DEFAULTS.questdb.url,
    defaultLabel: DATABASE_UI_DEFAULTS.questdb.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.questdb,
    docsLink: '/docs/tools/rag/architecture#questdb',
    startHints: [
      'bash scripts/docker/start-stacks.sh --phase database-ui',
      'ou execute manualmente: docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-questdb',
    ],
  },
];

const MAINTENANCE_ACTIONS: {
  id: 'dashboard-rebuild' | 'docker-prune';
  label: string;
  description: string;
  variant?: 'default' | 'outline' | 'destructive';
}[] = [
  {
    id: 'dashboard-rebuild',
    label: 'Rebuild Dashboard',
    description:
      'Recompila a imagem do dashboard com o .env atual e reinicia o container.',
    variant: 'outline',
  },
  {
    id: 'docker-prune',
    label: 'Limpar imagens antigas',
    description:
      'Executa docker image/builder/volume prune para liberar espaço local.',
    variant: 'destructive',
  },
];

function useEndpointStatus(url: string | null): EndpointStatus {
  const [status, setStatus] = React.useState<EndpointStatus>('idle');

  const checkStatus = React.useCallback(async () => {
    if (!url) {
      setStatus('offline');
      return;
    }

    setStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      try {
        await fetch(url, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal,
        });
        setStatus('online');
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      setStatus('offline');
    }
  }, [url]);

  React.useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return status;
}

function StatusBadge({ status }: { status: EndpointStatus }) {
  const map: Record<EndpointStatus, { label: string; color: string }> = {
    idle: { label: 'Sem verificação', color: 'bg-gray-300 dark:bg-gray-600' },
    checking: { label: 'Verificando', color: 'bg-amber-400' },
    online: { label: 'Online', color: 'bg-emerald-500' },
    offline: { label: 'Offline', color: 'bg-red-500' },
  };
  const info = map[status];
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${info.color}`} />
      {info.label}
    </div>
  );
}

interface ToolContentFrameProps {
  tool: DatabaseTool;
  activeUrl: string;
  iframeError: boolean;
  onError: () => void;
}

function ToolContentFrame({ tool, activeUrl, iframeError, onError }: ToolContentFrameProps) {
  return (
    <div className="flex-1 overflow-hidden">
      {!activeUrl ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Nenhum endpoint configurado para visualização.
        </div>
      ) : (
        <IframeWithUrl
          key={`${tool.id}-${activeUrl}`}
          src={activeUrl}
          title={`${tool.name} Dashboard`}
          wrapperClassName="h-full flex-1"
          showLink={false}
          className="w-full h-full rounded-lg border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
          allow="clipboard-read; clipboard-write"
          onError={onError}
        />
      )}
    </div>
  );
}

interface ToolCardProps {
  tool: DatabaseTool;
  selectedUrl: string;
  onSelectUrl: (url: string) => void;
  onPreview: () => void;
  isActive: boolean;
}

function ToolCard({
  tool,
  selectedUrl,
  onSelectUrl,
  onPreview,
  isActive,
}: ToolCardProps) {
  const status = useEndpointStatus(selectedUrl);

  const endpointOptions = uniqueEndpointOptions([
    { label: tool.defaultLabel ?? 'Stack Proxy', url: tool.defaultUrl },
    ...(tool.fallbackUrls ?? []),
  ]);

  const handleOpen = () => {
    if (!selectedUrl) return;
    window.open(selectedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {tool.name}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {tool.description}
        </p>
      </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ButtonWithDropdown
          label="Endpoint"
          options={endpointOptions.map((option) => ({
            label: option.label,
            value: option.url,
          }))}
          selectedValue={selectedUrl}
          onSelect={onSelectUrl}
          variant="outline"
          size="sm"
        />
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          onClick={onPreview}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Pré-visualizar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleOpen} disabled={!selectedUrl}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Abrir em nova aba
        </Button>
      </div>

      {tool.docsLink && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Documentação interna:{' '}
          <a
            href={tool.docsLink}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-600 underline dark:text-cyan-400"
          >
            {tool.docsLink}
          </a>
        </p>
      )}

      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <p className="mb-2 font-medium">Como iniciar rapidamente:</p>
        <ul className="space-y-1">
          {tool.startHints.map((hint, index) => (
            <li key={index}>
              <code className="rounded bg-gray-200 px-1 py-0.5 text-xs text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                {hint}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function DatabasePageNew() {
  const toast = useToast();
  const [selectedUrls, setSelectedUrls] = React.useState<Record<ToolId, string>>(
    () =>
      TOOLS.reduce(
        (acc, tool) => ({
          ...acc,
          [tool.id]: tool.defaultUrl,
        }),
        {} as Record<ToolId, string>,
      ),
  );
  const [activeTool, setActiveTool] = React.useState<ToolId>('pgadmin');
  const [iframeError, setIframeError] = React.useState(false);
  const [launchingTool, setLaunchingTool] = React.useState<string | null>(null);
  const [maintenanceAction, setMaintenanceAction] = React.useState<string | null>(null);
  const apiAvailable =
    typeof import.meta.env.VITE_LAUNCHER_API_URL === 'string' &&
    import.meta.env.VITE_LAUNCHER_API_URL.trim().length > 0;

  const activeToolData = TOOLS.find((tool) => tool.id === activeTool);
  const activeUrl = activeToolData ? selectedUrls[activeToolData.id] : '';

  const handleEndpointError = React.useCallback(
    (tool: DatabaseTool) => {
      const currentUrl = selectedUrls[tool.id];
      const fallbackOption = tool.fallbackUrls?.find(
        (option) => option.url !== currentUrl,
      );

      if (fallbackOption) {
        setSelectedUrls((prev) => ({
          ...prev,
          [tool.id]: fallbackOption.url,
        }));
        setIframeError(false);
        toast.info(
          `${tool.name}: alternando automaticamente para ${fallbackOption.label}`,
        );
        return;
      }

      setIframeError(true);
      toast.error(`Não foi possível carregar ${tool.name}.`);
    },
    [selectedUrls, toast],
  );

  if (!activeToolData) {
    return null;
  }

  const handleToolChange = (toolId: ToolId) => {
    setActiveTool(toolId);
    setIframeError(false);
  };

  const handleOpenInNewTab = () => {
    if (activeUrl) {
      window.open(activeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] w-full">
      {/* Navigation Buttons - Similar to Docs page */}
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          {TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'primary' : 'outline'}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToolChange(tool.id);
              }}
              disabled={activeTool === tool.id}
            >
              {tool.name}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInNewTab}
          disabled={!activeUrl}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>

      {/* Content Frame - Separated from buttons */}
      <div className="h-[calc(100vh-200px)] w-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900">
        <ToolContentFrame
          tool={activeToolData}
          activeUrl={activeUrl}
          iframeError={iframeError}
          onError={() => handleEndpointError(activeToolData)}
        />
      </div>

      {apiAvailable ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Manutenção do Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Execute ações administrativas (rebuild/limpeza) diretamente do dashboard.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {MAINTENANCE_ACTIONS.map((action) => (
              <div
                key={action.id}
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-50">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={action.variant ?? 'outline'}
                    disabled={maintenanceAction === action.id}
                    onClick={async () => {
                      setMaintenanceAction(action.id);
                      try {
                        await startLauncherTool(action.id);
                        toast.success(
                          action.id === 'dashboard-rebuild'
                            ? 'Rebuild solicitado; acompanhe os logs do dashboard.'
                            : 'Limpeza do Docker iniciada.'
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Falha ao executar comando',
                        );
                      } finally {
                        setMaintenanceAction(null);
                      }
                    }}
                  >
                    {maintenanceAction === action.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Executar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/10 dark:text-amber-200">
          Configure <code>VITE_LAUNCHER_API_URL</code> e{' '}
          <code>VITE_LAUNCHER_API_TOKEN</code> para liberar comandos de manutenção
          diretamente do dashboard.
        </section>
      )}

      {apiAvailable && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Controle rápido
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Executa comandos docker compose pré-aprovados para iniciar cada
                ferramenta.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((tool) => (
              <Button
                key={`launch-${tool.id}`}
                size="sm"
                variant="outline"
                disabled={launchingTool === tool.id}
                onClick={async () => {
                  setLaunchingTool(tool.id);
                  try {
                    await startLauncherTool(tool.id);
                    toast.success(`Start solicitado para ${tool.name}`);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Falha ao iniciar container',
                    );
                  } finally {
                    setLaunchingTool(null);
                  }
                }}
              >
                {launchingTool === tool.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Iniciar {tool.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Referências rápidas
        </h3>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Scripts oficiais: <code>bash scripts/docker/start-stacks.sh</code>{' '}
            permite subir apenas o bloco necessário usando{' '}
            <code>--phase timescale</code>, <code>--phase tools</code> ou{' '}
            <code>--phase data</code>.
          </li>
          <li>
            Consulte <code>docs/context/ops/service-port-map.md</code> para a
            matriz completa de portas e URLs.
          </li>
          <li>
            Caso um serviço esteja offline, verifique se a porta não está em uso
            e se o container correspondente está listado em{' '}
            <code>docker ps</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
