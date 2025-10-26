import { useMemo, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import {
  useTelegramGatewayAuthCancel,
  useTelegramGatewayAuthStart,
  useTelegramGatewayAuthStatus,
  useTelegramGatewayAuthSubmit,
  TelegramGatewayAuthStatusValue,
} from '../../../hooks/useTelegramGateway';
import { KeyRound, Loader2, Logs, PlugZap, StopCircle } from 'lucide-react';

const STATUS_META: Record<
  TelegramGatewayAuthStatusValue,
  { label: string; description: string; accent: string }
> = {
  idle: {
    label: 'Aguardando',
    description: 'Inicie o fluxo de autenticação para renovar a sessão.',
    accent: 'text-slate-500 dark:text-slate-400',
  },
  starting: {
    label: 'Inicializando',
    description: 'Preparando script de autenticação...',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  waiting_code: {
    label: 'Aguardando código',
    description: 'Digite o código recebido via SMS (Telegram).',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  processing_code: {
    label: 'Processando código',
    description: 'Validando código informado...',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  waiting_password: {
    label: 'Aguardando senha',
    description: 'Digite a senha de 2FA (se configurada).',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  processing_password: {
    label: 'Processando senha',
    description: 'Validando senha de 2FA informada...',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  completed: {
    label: 'Sessão autenticada',
    description: 'Sessão salva com sucesso. O gateway pode ser iniciado normalmente.',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Processo cancelado',
    description: 'O fluxo foi interrompido manualmente antes da conclusão.',
    accent: 'text-slate-500 dark:text-slate-400',
  },
  cancelling: {
    label: 'Cancelando',
    description: 'Encerrando processo de autenticação...',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    label: 'Erro na autenticação',
    description: 'Verifique os logs para entender a falha e tente novamente.',
    accent: 'text-red-600 dark:text-red-400',
  },
};

export function AuthenticationCard() {
  const [inputValue, setInputValue] = useState('');
  const { data: authStatus } = useTelegramGatewayAuthStatus();
  const startMutation = useTelegramGatewayAuthStart();
  const submitMutation = useTelegramGatewayAuthSubmit();
  const cancelMutation = useTelegramGatewayAuthCancel();

  const status = authStatus?.status ?? 'idle';
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const logs = authStatus?.logs ?? [];
  const running = authStatus?.running ?? false;

  const canStart = !running && status !== 'starting';
  const canCancel = running && status !== 'cancelling';
  const canSubmitInput =
    running &&
    (status === 'waiting_code' || status === 'waiting_password' || status === 'processing_code');

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    await submitMutation.mutateAsync(inputValue.trim());
    setInputValue('');
  };

  const latestLog = useMemo(() => logs[logs.length - 1], [logs]);

  return (
    <CollapsibleCard cardId="telegram-gateway-authentication">
      <CollapsibleCardHeader>
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <CollapsibleCardTitle>
              <KeyRound className="mr-2 inline-block h-5 w-5 text-blue-500" />
              Autenticação Telegram
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Execute o fluxo de login para renovar a sessão MTProto do gateway diretamente pelo
              dashboard.
            </CollapsibleCardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void startMutation.mutateAsync()}
              disabled={!canStart || startMutation.isPending}
            >
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlugZap className="mr-2 h-4 w-4" />
                  Iniciar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void cancelMutation.mutateAsync()}
              disabled={!canCancel || cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </>
              )}
            </Button>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className={`text-sm font-semibold ${meta.accent}`}>{meta.label}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meta.description}</div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 md:grid-cols-3">
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Início:</span>{' '}
                {authStatus?.startedAt
                  ? new Date(authStatus.startedAt).toLocaleString('pt-BR')
                  : '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Fim:</span>{' '}
                {authStatus?.finishedAt
                  ? new Date(authStatus.finishedAt).toLocaleString('pt-BR')
                  : '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Saída:</span>{' '}
                {typeof authStatus?.exitCode === 'number' ? authStatus.exitCode : '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Código / Senha 2FA
              </label>
              <Input
                placeholder="Ex: 12345"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                disabled={!canSubmitInput}
              />
            </div>
            <Button
              variant="default"
              onClick={() => void handleSubmit()}
              disabled={!canSubmitInput || !inputValue.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Enviar código
                </>
              )}
            </Button>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <Logs className="h-4 w-4" /> Logs do processo
              </span>
              {latestLog && (
                <span>
                  Último registro:{' '}
                  {new Date(latestLog.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </div>
            <ScrollArea className="max-h-64">
              <ul className="space-y-1 px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                {logs.length === 0 ? (
                  <li className="text-slate-400 dark:text-slate-500">
                    Nenhum log disponível. Inicie o processo para visualizar as mensagens.
                  </li>
                ) : (
                  logs.map((log, index) => (
                    <li key={`${log.timestamp}-${index}`}>
                      <span className="text-slate-400 dark:text-slate-500">
                        [{new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        ]
                      </span>{' '}
                      <span className="uppercase text-slate-400 dark:text-slate-500">{log.level}</span>{' '}
                      <span>{log.message}</span>
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
