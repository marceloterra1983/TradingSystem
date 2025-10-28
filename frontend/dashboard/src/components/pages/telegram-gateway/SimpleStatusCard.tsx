import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { CheckCircle, AlertTriangle, XCircle, Activity, Database, Wifi } from 'lucide-react';
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
  };
  isLoading: boolean;
  onRefresh: () => void;
}

export function SimpleStatusCard({ health, messages, session, isLoading, onRefresh }: SimpleStatusCardProps) {
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
                Uptime: <span className="font-medium">{formatUptime(health?.uptime)}</span>
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
                <Badge variant={telegramStatus === 'connected' ? 'default' : 'destructive'}>
                  {telegramStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {telegramStatus === 'connected' ? 'MTProto ativo' : 'Verificar autenticação'}
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

          {/* Session */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              {hasSession ? (
                <Activity className="h-5 w-5 text-emerald-500" />
              ) : (
                <Activity className="h-5 w-5 text-red-500" />
              )}
              <span className="font-semibold">Sessão</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <Badge variant={hasSession ? 'default' : 'outline'}>
                  {hasSession ? 'Ativa' : 'Ausente'}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {hasSession ? 'Arquivo encontrado' : 'Autenticar necessário'}
              </p>
            </div>
          </div>
        </div>

        {/* Alert if system not fully operational */}
        {(gatewayStatus !== 'healthy' || telegramStatus !== 'connected' || !hasSession) && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Sistema não está completamente operacional
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                  {gatewayStatus !== 'healthy' && (
                    <li>• Gateway MTProto não está respondendo (porta 4006)</li>
                  )}
                  {telegramStatus !== 'connected' && (
                    <li>• Telegram desconectado - verificar autenticação</li>
                  )}
                  {!hasSession && (
                    <li>• Arquivo de sessão ausente - executar authenticate-interactive.sh</li>
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





