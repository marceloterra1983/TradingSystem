import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Database,
  Wifi,
  ShieldCheck,
  Clock,
  Hash,
  Info,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface SimpleStatusCardProps {
  health?: {
    status?: string;
    telegram?: string;
    uptime?: number;
  };
  messages?: {
    total?: number;
  };
  session?: {
    exists?: boolean;
    path?: string;
    sizeBytes?: number;
    updatedAt?: string;
    hash?: string;
    ageMs?: number;
  };
  isLoading: boolean;
  onRefresh: () => void;
}

export function SimpleStatusCard({
  health,
  messages,
  session,
  isLoading,
  onRefresh,
}: SimpleStatusCardProps) {
  const gatewayStatus = health?.status || 'unknown';
  const telegramStatus = health?.telegram || 'unknown';
  const totalMessages = messages?.total || 0;
  const hasSession = session?.exists || false;

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatAge = (ms?: number) => {
    if (!ms) return '—';
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(ms / 60000)}min`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Status do Sistema</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Gateway Status */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              {gatewayStatus === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : gatewayStatus === 'unhealthy' ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-semibold">Gateway</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Status: <span className="font-medium">{gatewayStatus}</span>
              </p>
              <p className="text-muted-foreground">
                Uptime:{' '}
                <span className="font-medium">
                  {formatUptime(health?.uptime)}
                </span>
              </p>
            </div>
          </div>

          {/* Telegram Connection */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              {telegramStatus === 'connected' ? (
                <Wifi className="h-5 w-5 text-emerald-500" />
              ) : (
                <Wifi className="h-5 w-5 text-red-500" />
              )}
              <span className="font-semibold">Telegram</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <Badge
                  variant={
                    telegramStatus === 'connected' ? 'default' : 'destructive'
                  }
                >
                  {telegramStatus === 'connected'
                    ? 'Conectado'
                    : 'Desconectado'}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {telegramStatus === 'connected'
                  ? 'MTProto ativo'
                  : 'Verificar autenticação'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Mensagens</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{totalMessages}</p>
              <p className="text-xs text-muted-foreground">No TimescaleDB</p>
            </div>
          </div>

          {/* Session - Unified with detailed info */}
          <div className="rounded-lg border p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              {hasSession ? (
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-red-500" />
              )}
              <span className="font-semibold">Sessão MTProto</span>
            </div>
            
            <div className="space-y-3">
              {/* Status Badge */}
              <div>
                <Badge
                  variant={hasSession ? 'default' : 'outline'}
                  className={hasSession ? 'bg-emerald-500' : ''}
                >
                  {hasSession ? 'Sessão Ativa' : 'Sessão Ausente'}
                </Badge>
              </div>

              {hasSession ? (
                <div className="space-y-2 text-sm">
                  {/* Session Details */}
                  {session?.hash && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">Hash:</span>
                      <code className="text-xs font-mono">{session.hash}</code>
                    </div>
                  )}

                  {session?.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">Atualizado:</span>
                      <span className="text-xs">{formatDate(session.updatedAt)}</span>
                    </div>
                  )}

                  {session?.ageMs && (
                    <div className="flex items-center gap-2">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">Idade:</span>
                      <span className="text-xs">{formatAge(session.ageMs)}</span>
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  Autenticação necessária - execute authenticate-interactive.sh
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Alert if system not fully operational */}
        {(gatewayStatus !== 'healthy' ||
          telegramStatus !== 'connected' ||
          !hasSession) && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Sistema não está completamente operacional
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                  {gatewayStatus !== 'healthy' && (
                    <li>• Gateway MTProto não está respondendo (porta 4010)</li>
                  )}
                  {telegramStatus !== 'connected' && (
                    <li>• Telegram desconectado - verificar autenticação</li>
                  )}
                  {!hasSession && (
                    <li>
                      • Arquivo de sessão ausente - executar
                      authenticate-interactive.sh
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
