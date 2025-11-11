import * as React from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { Button } from "../ui/button";
import { ENDPOINTS } from "../../config/endpoints";
import { IframeWithUrl } from "../common/IframeWithUrl";
import { useToast } from "../../hooks/useToast";
import { startLauncherTool } from "../../services/launcherService";

type ToolId = "pgadmin" | "pgweb" | "adminer" | "questdb";
type TabId = "overview" | ToolId;

type EndpointOption = {
  label: string;
  url: string;
};

const PGADMIN_URL = ENDPOINTS.pgAdmin;
const PGWEB_URL = ENDPOINTS.pgWeb;
const ADMINER_URL = ENDPOINTS.adminer;
const QUESTDB_URL = ENDPOINTS.questdb;

const DATABASE_UI_DEFAULTS: Record<ToolId, { url: string; label: string }> = {
  pgadmin: { url: PGADMIN_URL, label: "Traefik (.env)" },
  pgweb: { url: PGWEB_URL, label: "Traefik (.env)" },
  adminer: { url: ADMINER_URL, label: "Traefik (.env)" },
  questdb: { url: QUESTDB_URL, label: "Traefik (.env)" },
};

const DIRECT_ENDPOINT_OPTIONS: Record<ToolId, EndpointOption[]> = {
  pgadmin: [
    { label: "Traefik (.env)", url: PGADMIN_URL },
    { label: "Traefik (/db-ui/pgadmin)", url: "http://localhost:9080/db-ui/pgadmin" },
    { label: "Porta 5050", url: "http://localhost:5050" },
    { label: "Legacy 7100", url: "http://localhost:7100" },
  ],
  pgweb: [
    { label: "Traefik (.env)", url: PGWEB_URL },
    { label: "Traefik (/db-ui/pgweb)", url: "http://localhost:9080/db-ui/pgweb" },
    { label: "Porta 8081", url: "http://localhost:8081" },
    { label: "Legacy 7102", url: "http://localhost:7102" },
  ],
  adminer: [
    { label: "Traefik (.env)", url: ADMINER_URL },
    { label: "Traefik (/db-ui/adminer)", url: "http://localhost:9080/db-ui/adminer" },
    { label: "Porta 3910", url: "http://localhost:3910" },
    { label: "Legacy 7101", url: "http://localhost:7101" },
  ],
  questdb: [
    { label: "Traefik (.env)", url: QUESTDB_URL },
    { label: "Traefik (/db-ui/questdb)", url: "http://localhost:9080/db-ui/questdb" },
    { label: "HTTP 9002", url: "http://localhost:9002" },
    { label: "Legacy 7010", url: "http://localhost:7010" },
  ],
};

type DatabaseOverviewEntry = {
  id: string;
  name: string;
  engine: string;
  host: string;
  port: string;
  database: string;
  user?: string;
  password?: {
    env: string;
    defaultValue?: string;
  };
  connectionUri?: string;
  dockerService: string;
  composeFile: string;
  notes?: string;
};

const DATABASES_OVERVIEW: DatabaseOverviewEntry[] = [
  {
    id: "workspace",
    name: "Workspace TimescaleDB",
    engine: "PostgreSQL / TimescaleDB 17",
    host: "localhost",
    port: "5450 → container 5432",
    database: "workspace",
    user: "postgres",
    password: {
      env: "WORKSPACE_DB_PASSWORD",
      defaultValue: "workspace_secure_pass",
    },
    connectionUri:
      "postgresql://postgres:${WORKSPACE_DB_PASSWORD}@localhost:5450/workspace?sslmode=disable",
    dockerService: "workspace-db",
    composeFile: "tools/compose/docker-compose.workspace-simple.yml",
    notes:
      "Clean Architecture workspace catalog + metadata. Mounted on tradingsystem_backend network.",
  },
  {
    id: "tp-capital",
    name: "TP Capital TimescaleDB",
    engine: "PostgreSQL / TimescaleDB 16",
    host: "localhost",
    port: "5440 → container 5432",
    database: "tp_capital_db",
    user: "tp_capital",
    password: {
      env: "TP_CAPITAL_DB_PASSWORD",
      defaultValue: "tp_capital_secure_pass_2024",
    },
    connectionUri:
      "postgresql://${TP_CAPITAL_DB_USER:-tp_capital}:${TP_CAPITAL_DB_PASSWORD}@localhost:5440/tp_capital_db?sslmode=disable",
    dockerService: "tp-capital-timescale",
    composeFile: "tools/compose/docker-compose.4-1-tp-capital-stack.yml",
    notes: "Use PgBouncer em localhost:6435 para workloads de produção.",
  },
  {
    id: "telegram",
    name: "Telegram Gateway TimescaleDB",
    engine: "PostgreSQL / TimescaleDB 16",
    host: "localhost",
    port: "5434 → container 5432",
    database: "telegram_gateway",
    user: "telegram",
    password: {
      env: "TELEGRAM_DB_PASSWORD",
      defaultValue: "NYMBgrENUZP8FqUHN1Yo8sdzSfs3kLhp",
    },
    connectionUri:
      "postgresql://${TELEGRAM_DB_USER:-telegram}:${TELEGRAM_DB_PASSWORD}@localhost:5434/telegram_gateway?sslmode=disable",
    dockerService: "telegram-timescale",
    composeFile: "tools/compose/docker-compose.4-2-telegram-stack.yml",
    notes:
      "Gateway MTProto + automações. PgBouncer disponível em localhost:6434.",
  },
  {
    id: "n8n",
    name: "n8n Workflows DB",
    engine: "PostgreSQL 16",
    host: "127.0.0.1",
    port: "5442 → container 5432",
    database: "n8n",
    user: "n8n",
    password: {
      env: "N8N_POSTGRES_PASSWORD",
      defaultValue: "ts_n8n_db_1vZeP9LqC4yS6aUwX8mH",
    },
    connectionUri:
      "postgresql://${N8N_POSTGRES_USER:-n8n}:${N8N_POSTGRES_PASSWORD}@localhost:5442/${N8N_POSTGRES_DB:-n8n}",
    dockerService: "n8n-postgres",
    composeFile: "tools/compose/docker-compose.n8n.yml",
    notes:
      "Persistência das execuções e credenciais do n8n. Respeita credenciais definidas em .env.",
  },
  {
    id: "firecrawl",
    name: "Firecrawl Collector DB",
    engine: "PostgreSQL 15",
    host: "localhost",
    port: "5436 → container 5432",
    database: "firecrawl",
    user: "firecrawl",
    password: {
      env: "FIRECRAWL_DB_PASSWORD",
      defaultValue: "GS3C6wRrIG0RGm1cWylIlZWUm4L1YcLN",
    },
    connectionUri:
      "postgresql://firecrawl:${FIRECRAWL_DB_PASSWORD}@localhost:5436/firecrawl",
    dockerService: "tools-firecrawl-postgres",
    composeFile: "tools/compose/docker-compose.firecrawl.yml",
    notes: "Armazena tarefas de crawling e cache de conteúdos.",
  },
  {
    id: "course-crawler",
    name: "Course Crawler DB",
    engine: "PostgreSQL 15",
    host: "localhost",
    port: "55433 → container 5432",
    database: "coursecrawler",
    user: "postgres",
    password: {
      env: "COURSE_CRAWLER_DB_PASSWORD",
      defaultValue: "coursecrawler",
    },
    connectionUri:
      "postgresql://${COURSE_CRAWLER_DB_USER:-postgres}:${COURSE_CRAWLER_DB_PASSWORD:-coursecrawler}@localhost:55433/${COURSE_CRAWLER_DB_NAME:-coursecrawler}",
    dockerService: "course-crawler-db",
    composeFile: "tools/compose/docker-compose.course-crawler.yml",
    notes:
      "Persistência dos scrapers e pipelines do Course Crawler (API + worker).",
  },
  {
    id: "waha",
    name: "WAHA WhatsApp DB",
    engine: "PostgreSQL 16",
    host: "127.0.0.1",
    port: "5438 → container 5432",
    database: "waha",
    user: "waha",
    password: {
      env: "WAHA_POSTGRES_PASSWORD",
      defaultValue: "ts_waha_db_v5kAXFBJcuGZvzZrGM21k8mubgQmnNfkwUCEEFlXVPs",
    },
    connectionUri:
      "postgresql://${WAHA_POSTGRES_USER:-waha}:${WAHA_POSTGRES_PASSWORD}@localhost:5438/${WAHA_POSTGRES_DB:-waha}",
    dockerService: "waha-postgres",
    composeFile: "tools/compose/docker-compose.5-3-waha-stack.yml",
    notes: "Armazena sessões, mensagens e webhooks do WAHA (Noweb).",
  },
  {
    id: "kestra",
    name: "Kestra Orchestrator DB",
    engine: "PostgreSQL 15 (internal)",
    host: "tools-kestra-postgres",
    port: "5432 (somente rede interna)",
    database: "kestra",
    user: "kestra",
    password: {
      env: "KESTRA_DB_PASSWORD",
      defaultValue: "kestra",
    },
    connectionUri:
      "postgresql://${KESTRA_DB_USER:-kestra}:${KESTRA_DB_PASSWORD:-kestra}@tools-kestra-postgres:5432/${KESTRA_DB_NAME:-kestra}",
    dockerService: "tools-kestra-postgres",
    composeFile: "tools/compose/docker-compose.tools.yml",
    notes:
      "Não possui bind para localhost. Conectar via docker exec ou serviços na mesma network.",
  },
  {
    id: "questdb",
    name: "QuestDB Console",
    engine: "QuestDB (HTTP + ILP)",
    host: "http://localhost:9080/db-ui/questdb",
    port: "HTTP 9002 / ILP 9009",
    database: "N/A (SQL over HTTP)",
    user: "N/A",
    dockerService: "dbui-questdb",
    composeFile: "tools/compose/docker-compose.4-0-database-ui-stack.yml",
    notes:
      "Console SQL para séries temporais. ILP (Influx Line Protocol) exposto em localhost:9009.",
  },
];

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

const TOOLS: DatabaseTool[] = [
  {
    id: "pgadmin",
    name: "pgAdmin",
    description:
      "Console completo para administrar Postgres/TimescaleDB, criar schemas e gerenciar usuários.",
    defaultUrl: DATABASE_UI_DEFAULTS.pgadmin.url,
    defaultLabel: DATABASE_UI_DEFAULTS.pgadmin.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.pgadmin,
    docsLink: "/docs/ops/database-ui#pgadmin",
    startHints: [
      "bash scripts/docker/start-stacks.sh --phase timescale",
      "ou execute manualmente: docker compose -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d dbui-pgadmin",
    ],
  },
  {
    id: "pgweb",
    name: "pgweb",
    description:
      "Cliente web leve para consultas rápidas em Postgres/Timescale, ideal para inspeções e testes.",
    defaultUrl: DATABASE_UI_DEFAULTS.pgweb.url,
    defaultLabel: DATABASE_UI_DEFAULTS.pgweb.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.pgweb,
    docsLink: "/docs/ops/database-ui#pgweb",
    startHints: [
      "bash scripts/docker/start-stacks.sh --phase database-ui",
      "ou execute manualmente: docker compose -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d dbui-pgweb",
    ],
  },
  {
    id: "adminer",
    name: "Adminer",
    description:
      "Interface minimalista para manipular bancos SQL (Postgres, MySQL, etc.) em tarefas pontuais.",
    defaultUrl: DATABASE_UI_DEFAULTS.adminer.url,
    defaultLabel: DATABASE_UI_DEFAULTS.adminer.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.adminer,
    docsLink: "/docs/ops/database-ui#adminer",
    startHints: [
      "bash scripts/docker/start-stacks.sh --phase database-ui",
      "ou execute manualmente: docker compose -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d dbui-adminer",
    ],
  },
  {
    id: "questdb",
    name: "QuestDB Console",
    description:
      "Console SQL para séries temporais e análises de mercado (dados do TP Capital / ingestão histórica).",
    defaultUrl: DATABASE_UI_DEFAULTS.questdb.url,
    defaultLabel: DATABASE_UI_DEFAULTS.questdb.label,
    fallbackUrls: DIRECT_ENDPOINT_OPTIONS.questdb,
    docsLink: "/docs/tools/rag/architecture#questdb",
    startHints: [
      "bash scripts/docker/start-stacks.sh --phase database-ui",
      "ou execute manualmente: docker compose -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d dbui-questdb",
    ],
  },
];

const NAV_TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  ...TOOLS.map((tool) => ({ id: tool.id, label: tool.name })),
];

const MAINTENANCE_ACTIONS: {
  id: "dashboard-rebuild" | "docker-prune";
  label: string;
  description: string;
  variant?: "default" | "outline" | "destructive";
}[] = [
  {
    id: "dashboard-rebuild",
    label: "Rebuild Dashboard",
    description:
      "Recompila a imagem do dashboard com o .env atual e reinicia o container.",
    variant: "outline",
  },
  {
    id: "docker-prune",
    label: "Limpar imagens antigas",
    description:
      "Executa docker image/builder/volume prune para liberar espaço local.",
    variant: "destructive",
  },
];

interface ToolContentFrameProps {
  tool: DatabaseTool;
  activeUrl: string;
  iframeError: boolean;
  onError: () => void;
}

function ToolContentFrame({
  tool,
  activeUrl,
  iframeError,
  onError,
}: ToolContentFrameProps) {
  const baseClasses =
    "h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-900";

  if (!activeUrl) {
    return (
      <div className={`${baseClasses} flex items-center justify-center`}>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum endpoint configurado para visualização.
        </div>
      </div>
    );
  }

  if (iframeError) {
    return (
      <div
        className={`${baseClasses} flex flex-col items-center justify-center gap-3 text-center text-sm text-red-600 dark:text-red-400`}
      >
        <div>
          <p>
            Não foi possível carregar o painel <strong>{tool.name}</strong>.
          </p>
          <p className="mt-1 text-xs text-red-500/80 dark:text-red-200/80">
            Tente selecionar outro endpoint ou abrir em uma nova aba.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onError}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <IframeWithUrl
        key={`${tool.id}-${activeUrl}`}
        src={activeUrl}
        title={`${tool.name} Dashboard`}
        wrapperClassName="h-full"
        showLink={false}
        className="w-full h-full"
        style={{ border: "none" }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        allow="clipboard-read; clipboard-write"
        onError={onError}
      />
    </div>
  );
}

function DatabaseOverviewPanel() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Visão consolidada dos bancos operados localmente. Utilize os valores
        padrão como referência e mantenha o `.env` como fonte oficial para
        senhas ou overrides.
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 shadow-inner dark:border-gray-800 dark:bg-gray-900/40">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3">Banco</th>
              <th className="px-4 py-3">Host / Porta</th>
              <th className="px-4 py-3">Credenciais</th>
              <th className="px-4 py-3">Docker / Compose</th>
              <th className="px-4 py-3">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {DATABASES_OVERVIEW.map((db) => (
              <tr key={db.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 dark:text-gray-50">
                    {db.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {db.engine}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">Host:</span> {db.host}
                  </div>
                  <div>
                    <span className="font-medium">Porta:</span> {db.port}
                  </div>
                  {db.connectionUri && (
                    <code className="mt-2 block rounded bg-gray-900/5 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {db.connectionUri}
                    </code>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">Database:</span> {db.database}
                  </div>
                  <div>
                    <span className="font-medium">Usuário:</span>{" "}
                    {db.user ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Senha:</span>{" "}
                    {db.password ? (
                      <>
                        <code>{db.password.env}</code>
                        {db.password.defaultValue && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {" "}
                            (default: {db.password.defaultValue})
                          </span>
                        )}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">Serviço:</span>{" "}
                    <code>{db.dockerService}</code>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {db.composeFile}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {db.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DatabasePageNew() {
  const toast = useToast();
  const [selectedUrls, setSelectedUrls] = React.useState<
    Record<ToolId, string>
  >(() =>
    TOOLS.reduce(
      (acc, tool) => ({
        ...acc,
        [tool.id]: tool.defaultUrl,
      }),
      {} as Record<ToolId, string>,
    ),
  );
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");
  const [iframeError, setIframeError] = React.useState(false);
  const [launchingTool, setLaunchingTool] = React.useState<string | null>(null);
  const [maintenanceAction, setMaintenanceAction] = React.useState<
    string | null
  >(null);
  const apiAvailable =
    typeof import.meta.env.VITE_LAUNCHER_API_URL === "string" &&
    import.meta.env.VITE_LAUNCHER_API_URL.trim().length > 0;

  const activeToolData =
    activeTab === "overview"
      ? null
      : TOOLS.find((tool) => tool.id === activeTab);
  const activeUrl = activeToolData ? selectedUrls[activeToolData.id] : "";

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

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setIframeError(false);
  };

  const handleOpenInNewTab = () => {
    if (activeTab !== "overview" && activeUrl) {
      window.open(activeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isToolTab = activeTab !== "overview";

  return (
    <div
      className={
        isToolTab
          ? "h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900"
          : "min-h-[calc(100vh-160px)] w-full"
      }
    >
      <div className={isToolTab ? "flex h-full flex-col" : undefined}>
        {/* Navigation Buttons - Similar to Docs page */}
        <div
          className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between relative z-10 ${isToolTab ? "p-4" : "mb-2"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {NAV_TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "primary" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTabChange(tab.id);
                }}
                disabled={activeTab === tab.id}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            disabled={activeTab === "overview" || !activeUrl}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </Button>
        </div>

        {/* Content & sections */}
        {isToolTab ? (
          activeToolData && (
            <div className="flex-1">
              <ToolContentFrame
                tool={activeToolData}
                activeUrl={activeUrl}
                iframeError={iframeError}
                onError={() => handleEndpointError(activeToolData)}
              />
            </div>
          )
        ) : (
          <>
            <div className="h-[calc(100vh-200px)] w-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900">
              <DatabaseOverviewPanel />
            </div>

            {apiAvailable ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                    Manutenção do Dashboard
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Execute ações administrativas (rebuild/limpeza) diretamente do
                    dashboard.
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
                          variant={action.variant ?? "outline"}
                          disabled={maintenanceAction === action.id}
                          onClick={async () => {
                            setMaintenanceAction(action.id);
                            try {
                              await startLauncherTool(action.id);
                              toast.success(
                                action.id === "dashboard-rebuild"
                                  ? "Rebuild solicitado; acompanhe os logs do dashboard."
                                  : "Limpeza do Docker iniciada.",
                              );
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Falha ao executar comando",
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
                Configure <code>VITE_LAUNCHER_API_URL</code> e{" "}
                <code>VITE_LAUNCHER_API_TOKEN</code> para liberar comandos de
                manutenção diretamente do dashboard.
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
                              : "Falha ao iniciar container",
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
                  Scripts oficiais: <code>bash scripts/docker/start-stacks.sh</code>{" "}
                  permite subir apenas o bloco necessário usando{" "}
                  <code>--phase timescale</code>, <code>--phase tools</code> ou{" "}
                  <code>--phase data</code>.
                </li>
                <li>
                  Consulte <code>docs/context/ops/service-port-map.md</code> para a
                  matriz completa de portas e URLs.
                </li>
                <li>
                  Caso um serviço esteja offline, verifique se a porta não está em uso
                  e se o container correspondente está listado em{" "}
                  <code>docker ps</code>.
                </li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
