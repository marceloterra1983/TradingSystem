import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
} from '@/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  TelegramGatewayOverview,
  useTelegramGatewayChannels,
} from "../../../hooks/useTelegramGateway";

interface ConnectionDiagnosticCardProps {
  overview?: TelegramGatewayOverview;
  isLoading: boolean;
}

interface DiagnosticItem {
  id: string;
  label: string;
  status: "ok" | "warning" | "error" | "info";
  message: string;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ConnectionDiagnosticCard({
  overview,
  isLoading,
}: ConnectionDiagnosticCardProps) {
  const { data: channels = [] } = useTelegramGatewayChannels();
  const diagnostics: DiagnosticItem[] = [];

  // 1. Verificar se o gateway MTProto está rodando
  const gatewayHealthy = overview?.health?.status === "healthy";
  const telegramConnected = overview?.health?.telegram === "connected";
  const hasMessages = (overview?.messages?.total ?? 0) > 0;
  const queueSize = overview?.queue?.totalMessages ?? 0;
  const activeChannelsCount = channels.filter((c) => c.isActive).length;
  const recentMessages = overview?.messages?.recent ?? [];

  // Gateway Status
  if (gatewayHealthy) {
    diagnostics.push({
      id: "gateway",
      label: "Gateway MTProto (Traefik /api/telegram-gateway)",
      status: "ok",
      message: "Gateway está online e respondendo",
    });
  } else {
    diagnostics.push({
      id: "gateway",
      label: "Gateway MTProto (Traefik /api/telegram-gateway)",
      status: "error",
      message: "Gateway não está respondendo",
      suggestion: "Execute: cd backend/api/telegram-gateway && npm run dev",
    });
  }

  // Telegram Connection
  if (telegramConnected) {
    diagnostics.push({
      id: "telegram",
      label: "Conexão Telegram",
      status: "ok",
      message: "Conectado aos servidores do Telegram",
    });
  } else {
    diagnostics.push({
      id: "telegram",
      label: "Conexão Telegram",
      status: "warning",
      message: "Telegram desconectado ou sessão inválida",
      suggestion:
        "Execute o script de autenticação: ./authenticate-interactive.sh",
    });
  }

  // Session Status
  const hasSession = overview?.session?.exists;
  if (hasSession) {
    diagnostics.push({
      id: "session",
      label: "Arquivo de Sessão",
      status: "ok",
      message: `Sessão encontrada (${overview?.session?.sizeBytes} bytes)`,
    });
  } else {
    diagnostics.push({
      id: "session",
      label: "Arquivo de Sessão",
      status: "error",
      message: "Arquivo de sessão não encontrado",
      suggestion: "Faça a autenticação inicial para criar a sessão",
    });
  }

  // Channels Configuration
  if (channels.length === 0) {
    diagnostics.push({
      id: "channels",
      label: "Canais Configurados",
      status: "info",
      message: "Modo permissivo: todos os canais serão processados",
      suggestion:
        'Para maior segurança, registre apenas os canais autorizados na aba "Canais"',
    });
  } else if (activeChannelsCount === 0) {
    diagnostics.push({
      id: "channels",
      label: "Canais Configurados",
      status: "warning",
      message: `${channels.length} canal(is) registrado(s), mas nenhum ativo`,
      suggestion:
        'Ative pelo menos um canal na aba "Canais" para receber mensagens',
    });
  } else {
    diagnostics.push({
      id: "channels",
      label: "Canais Configurados",
      status: "ok",
      message: `${activeChannelsCount} canal(is) ativo(s) de ${channels.length} registrado(s)`,
    });
  }

  // Messages in Database
  if (hasMessages) {
    const lastMessageTime = recentMessages[0]?.receivedAt
      ? new Date(recentMessages[0].receivedAt).toLocaleString("pt-BR")
      : null;
    diagnostics.push({
      id: "messages",
      label: "Mensagens no Banco",
      status: "ok",
      message: `${overview?.messages?.total} mensagens armazenadas`,
      suggestion: lastMessageTime
        ? `Última mensagem: ${lastMessageTime}`
        : undefined,
    });
  } else {
    diagnostics.push({
      id: "messages",
      label: "Mensagens no Banco",
      status: "warning",
      message: "Nenhuma mensagem foi salva ainda",
      suggestion:
        gatewayHealthy && telegramConnected
          ? activeChannelsCount === 0 && channels.length > 0
            ? "Ative pelo menos um canal para começar a receber mensagens"
            : "Verifique se o bot/usuário tem acesso aos canais ou envie uma mensagem de teste"
          : "Aguardando conexão com o Telegram",
    });
  }

  // Queue Status
  if (queueSize > 0) {
    diagnostics.push({
      id: "queue",
      label: "Fila de Falhas",
      status: queueSize > 100 ? "error" : "warning",
      message: `${queueSize} mensagens na fila de falhas`,
      suggestion: "Verifique a conectividade com as APIs de destino",
    });
  } else {
    diagnostics.push({
      id: "queue",
      label: "Fila de Falhas",
      status: "ok",
      message: "Sem mensagens pendentes",
    });
  }

  // Overall System Status
  const allOk = diagnostics.every((d) => d.status === "ok");
  const hasErrors = diagnostics.some((d) => d.status === "error");

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              {allOk ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : hasErrors ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Diagnóstico do Sistema
            </CardTitle>
            <CardDescription>
              Status dos componentes necessários para captura e armazenamento de
              mensagens
            </CardDescription>
          </div>
          {allOk && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              Tudo operacional
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
        ) : (
          <div className="space-y-3">
            {diagnostics.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="mt-0.5">
                  {item.status === "ok" && (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                  {item.status === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {item.status === "info" && (
                    <Info className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.message}
                  </p>
                  {item.suggestion && (
                    <div className="mt-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                      <strong className="text-slate-700 dark:text-slate-300">
                        Sugestão:
                      </strong>{" "}
                      {item.suggestion}
                    </div>
                  )}
                  {item.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={item.action.onClick}
                      className="mt-2 h-7 text-xs"
                    >
                      {item.action.label}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!hasMessages && gatewayHealthy && telegramConnected && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/40">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Sistema pronto, aguardando mensagens
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      O gateway está conectado e operacional. Para começar a
                      receber mensagens:
                    </p>
                    <ol className="ml-4 list-decimal space-y-1 text-blue-700 dark:text-blue-300">
                      <li>
                        Verifique se os canais estão configurados na aba
                        "Canais"
                      </li>
                      <li>
                        Certifique-se de que o bot/usuário tem acesso aos canais
                      </li>
                      <li>
                        Envie uma mensagem de teste em um dos canais monitorados
                      </li>
                      <li>Aguarde alguns segundos e atualize esta página</li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        window.open("http://localhost:4008/metrics", "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Ver métricas do gateway
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
