import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { ShieldCheck, Info, Clock, Hash } from "lucide-react";
import { Badge } from "../../ui/badge";

interface SimpleSessionCardProps {
  session?: {
    exists?: boolean;
    path?: string;
    sizeBytes?: number;
    updatedAt?: string;
    hash?: string;
    ageMs?: number;
  };
  isLoading: boolean;
}

export function SimpleSessionCard({
  session,
  isLoading,
}: SimpleSessionCardProps) {
  const hasSession = session?.exists || false;

  const formatAge = (ms?: number) => {
    if (!ms) return "—";
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(ms / 60000)}min`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Sessão MTProto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Sessão MTProto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div>
          <Badge
            variant={hasSession ? "default" : "outline"}
            className={hasSession ? "bg-emerald-500" : ""}
          >
            {hasSession ? "Sessão Ativa" : "Sessão Ausente"}
          </Badge>
        </div>

        {hasSession ? (
          <>
            {/* Session Details */}
            <div className="space-y-3 text-sm">
              {session?.hash && (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Hash:</span>
                  <code className="text-xs font-mono">{session.hash}</code>
                </div>
              )}

              {session?.updatedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Atualizado:</span>
                  <span>{formatDate(session.updatedAt)}</span>
                </div>
              )}

              {session?.ageMs && (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Idade:</span>
                  <span>{formatAge(session.ageMs)}</span>
                </div>
              )}

              {session?.sizeBytes && (
                <div className="text-xs text-muted-foreground">
                  Tamanho: {session.sizeBytes} bytes
                </div>
              )}

              {session?.path && (
                <div className="text-xs text-muted-foreground break-all">
                  Arquivo: {session.path}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              <p className="font-medium mb-1">✓ Sessão válida</p>
              <p>
                O gateway pode se conectar ao Telegram sem solicitar código SMS.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Sessão não encontrada
            </p>
            <p className="text-amber-800 dark:text-amber-200 mb-3">
              Execute o script de autenticação:
            </p>
            <code className="block bg-white dark:bg-black rounded px-3 py-2 text-xs font-mono">
              cd apps/telegram-gateway && ./authenticate-interactive.sh
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
