import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { TelegramGatewaySessionStatus } from '../../../hooks/useTelegramGateway';
import { Badge } from '../../ui/badge';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface SessionCardProps {
  session?: TelegramGatewaySessionStatus;
  isLoading: boolean;
}

function formatAge(ageMs?: number) {
  if (typeof ageMs !== 'number' || Number.isNaN(ageMs)) return '—';
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

export function SessionCard({ session, isLoading }: SessionCardProps) {
  const exists = session?.exists;

  return (
    <CollapsibleCard cardId="telegram-gateway-session">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>
          <ShieldCheck className="mr-2 inline-block h-5 w-5 text-emerald-500" />
          Sessão MTProto
        </CollapsibleCardTitle>
        <CollapsibleCardDescription>
          Status e metadados do arquivo de sessão utilizado para autenticação do gateway.
        </CollapsibleCardDescription>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
        ) : session?.error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span>Não foi possível ler a sessão: {session.error}</span>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={exists ? 'default' : 'outline'}
                className={exists ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : ''}
              >
                {exists ? 'Sessão encontrada' : 'Sessão ausente'}
              </Badge>
              {session?.hash && (
                <Badge variant="outline" className="font-mono text-xs">
                  hash: {session.hash}
                </Badge>
              )}
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Caminho
                </dt>
                <dd className="mt-1 break-all text-sm">{session?.path ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tamanho
                </dt>
                <dd className="mt-1 text-sm">{session?.sizeBytes ? `${session.sizeBytes} bytes` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Atualizado em
                </dt>
                <dd className="mt-1 text-sm">{formatTimestamp(session?.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Idade aproximada
                </dt>
                <dd className="mt-1 text-sm">{formatAge(session?.ageMs)}</dd>
              </div>
            </dl>
            {!exists && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
                O gateway está rodando sem sessão ativa. Execute o script de autenticação para renovar o acesso antes
                de operar em produção.
              </p>
            )}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
