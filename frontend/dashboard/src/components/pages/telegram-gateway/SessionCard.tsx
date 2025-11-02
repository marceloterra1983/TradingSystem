import { TelegramGatewaySessionStatus } from '../../../hooks/useTelegramGateway';
import { Badge } from '../../ui/badge';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { AlertTriangle, ShieldCheck, User, Hash, Clock } from 'lucide-react';

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
      <CollapsibleCardHeader className="border-b border-slate-200/80 dark:border-slate-800/80">
        <CollapsibleCardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Sessão MTProto
        </CollapsibleCardTitle>
        <CollapsibleCardDescription>
          Status e metadados do arquivo de sessão utilizado para autenticação do
          gateway.
        </CollapsibleCardDescription>
      </CollapsibleCardHeader>
      <CollapsibleCardContent className="pt-5">
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
                className={
                  exists
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : ''
                }
              >
                {exists ? 'Sessão ativa' : 'Sessão ausente'}
              </Badge>
              {session?.hash && (
                <Badge variant="outline" className="font-mono text-xs">
                  <Hash className="mr-1 inline-block h-3 w-3" />
                  {session.hash}
                </Badge>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <dl className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Tipo de Conta
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      Usuário MTProto
                    </dd>
                    <dd className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {process.env.TELEGRAM_PHONE_NUMBER ||
                        'Autenticação por telefone'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Última Atualização
                    </dt>
                    <dd className="mt-1 text-sm">
                      {formatTimestamp(session?.updatedAt)}
                    </dd>
                    <dd className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Idade: {formatAge(session?.ageMs)}
                    </dd>
                  </div>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Arquivo de Sessão
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                    {session?.path ?? '—'}
                  </dd>
                  <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tamanho:{' '}
                    {session?.sizeBytes ? `${session.sizeBytes} bytes` : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {exists ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1 space-y-2 text-xs">
                    <p className="font-medium text-emerald-900 dark:text-emerald-100">
                      Sessão autenticada e válida
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300">
                      O gateway pode se conectar ao Telegram sem solicitar
                      código SMS ou senha 2FA. Esta sessão permanece válida até
                      que seja revogada manualmente ou expire.
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium text-emerald-800 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-emerald-100">
                        Como renovar a sessão
                      </summary>
                      <div className="mt-2 space-y-2 rounded border border-emerald-300 bg-white p-3 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <p>Para forçar uma nova autenticação:</p>
                        <ol className="ml-4 list-decimal space-y-1">
                          <li>Faça backup da sessão atual:</li>
                          <code className="block rounded bg-emerald-100 px-2 py-1 font-mono text-[10px] dark:bg-emerald-900/50">
                            mv .session/telegram-gateway.session
                            .session/backups/session-$(date
                            +%Y%m%d%H%M%S).session
                          </code>
                          <li className="mt-1">
                            Execute o script de autenticação:
                          </li>
                          <code className="block rounded bg-emerald-100 px-2 py-1 font-mono text-[10px] dark:bg-emerald-900/50">
                            cd apps/telegram-gateway &&
                            ./authenticate-interactive.sh
                          </code>
                        </ol>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 space-y-2 text-xs">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Sessão não encontrada
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      O gateway não pode se conectar ao Telegram sem uma sessão
                      válida. Execute o script de autenticação para criar uma
                      nova sessão:
                    </p>
                    <code className="block rounded border border-amber-300 bg-white px-3 py-2 font-mono text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                      cd apps/telegram-gateway && ./authenticate-interactive.sh
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
