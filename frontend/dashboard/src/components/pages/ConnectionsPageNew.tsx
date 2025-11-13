import { Activity, Network, PlugZap, ShieldCheck } from '@/icons';
import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import ConnectionStatus from "../ConnectionStatus";

/**
 * Connections Page (New) - With Customizable Layout
 * System connections status with drag-and-drop grid layout
 */

export function ConnectionsPageNew() {
  const sections = [
    {
      id: "websocket-status",
      content: <WebSocketStatusSection />,
    },
    {
      id: "profitdll-status",
      content: <ProfitDLLStatusSection />,
    },
    {
      id: "service-health",
      content: <ServiceHealthSection />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="conexoes"
      title="System Connections"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default ConnectionsPageNew;

function WebSocketStatusSection() {
  return (
    <Card className="h-full rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-emerald-500" />
            WebSocket Gateway
          </CardTitle>
          <Badge variant="outline">Local only</Badge>
        </div>
        <CardDescription>
          Conexão em tempo real entre o dashboard e os serviços de execução.
          Todo o tráfego é mantido em localhost para evitar dependência externa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConnectionStatus showDetails className="text-sm" />
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Checklist rápido
          </p>
          <ul className="space-y-1">
            <li>• Workspace API (`backend/api/workspace`) em execução.</li>
            <li>
              • Traefik gateway ativo em{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-800">
                http://localhost:9080
              </code>
              .
            </li>
            <li>• Sem proxies externos ou túneis temporários.</li>
          </ul>
        </div>
        <Alert>
          <AlertTitle>Healthcheck local</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>
              <span className="font-medium">Status:</span>{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">
                curl http://localhost:9080/api/workspace/health
              </code>
            </p>
            <p>
              <span className="font-medium">Logs:</span>{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">
                docker compose logs backend-workspace -f
              </code>
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function ProfitDLLStatusSection() {
  return (
    <Card className="h-full rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PlugZap className="h-4 w-4 text-amber-500" />
            Profit.dll Bridge
          </CardTitle>
          <Badge variant="secondary">Windows Host</Badge>
        </div>
        <CardDescription>
          Biblioteca responsável por distribuir cotações em alta frequência e
          receber ordens do Profit Chart. Mantida fora de containers por
          limitações do ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Status esperado
          </p>
          <ul className="space-y-1 pt-1">
            <li>
              • Serviço Windows rodando como `TradingSystem.ProfitBridge`.
            </li>
            <li>• Named pipe `\\\\.\\pipe\\TradingSystem.Profit` ativo.</li>
          </ul>
        </div>
        <Alert>
          <AlertTitle>Ações manuais</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>
              • Reiniciar o serviço:&nbsp;
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">
                sc stop TradingSystem.ProfitBridge && sc start
                TradingSystem.ProfitBridge
              </code>
            </p>
            <p>
              • Certifique-se de que o Profit Chart esteja autenticado antes de
              iniciar o bridge.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function ServiceHealthSection() {
  const services = [
    {
      name: "Telegram Gateway",
      description: "Processa autenticação, mensagens e fila de retry",
      port: "9080 • /api/telegram-gateway",
      scope: "Gateway",
      check: "curl http://localhost:9080/api/telegram-gateway/overview",
    },
    {
      name: "Workspace API",
      description: "Comandos REST e eventos WebSocket do domínio Workspace",
      port: "9080 • /api/workspace",
      scope: "Gateway",
      check: "curl http://localhost:9080/api/workspace/health",
    },
    {
      name: "RAG Service",
      description:
        "Documentation API + LlamaIndex + RAG (docker-compose.4-4-rag-stack.yml)",
      port: "3402",
      scope: "Container",
      check: "curl http://localhost:3402/health",
    },
  ];

  return (
    <Card className="h-full rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            Service Health Matrix
          </CardTitle>
          <Badge variant="outline">Atualizado manualmente</Badge>
        </div>
        <CardDescription>
          Guia rápido para verificar os principais serviços locais e
          containerizados que suportam o dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {service.name}
                  </span>
                </div>
                <Badge>{`${service.scope} • :${service.port}`}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {service.description}
              </p>
              <p className="mt-3 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Healthcheck:
                </span>{" "}
                <code className="rounded bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-900">
                  {service.check}
                </code>
              </p>
            </div>
          ))}
        </div>
        <Alert>
          <AlertTitle>Checklist após alterações</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>1. Rode `docker compose up -d` para containers dependentes.</p>
            <p>
              2. Confirme que os logs não possuem erros críticos antes de
              liberar em produção.
            </p>
            <p>3. Atualize este painel com a data do último teste manual.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
