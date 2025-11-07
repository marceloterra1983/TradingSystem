import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useToast } from '../../../hooks/useToast';
import { resolveErrorMessage } from '../../../utils/errors';
import {
  KeyRound,
  Loader2,
  MonitorUp,
  PlugZap,
  ScrollText,
  StopCircle,
  Terminal,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';

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
    description:
      'Sessão salva com sucesso. O gateway pode ser iniciado normalmente.',
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

const LOG_STYLES: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  system: {
    label: '[system]',
    className: 'text-cyan-600 dark:text-cyan-300',
  },
  stdout: {
    label: '[stdout]',
    className: 'text-emerald-600 dark:text-emerald-300',
  },
  stderr: {
    label: '[stderr]',
    className: 'text-amber-600 dark:text-amber-300',
  },
  input: {
    label: '[input]',
    className: 'text-slate-600 dark:text-slate-400',
  },
  error: {
    label: '[error]',
    className: 'text-red-600 dark:text-red-300',
  },
};

export function AuthenticationCard() {
  const [inputValue, setInputValue] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const { data: authStatus } = useTelegramGatewayAuthStatus();
  const startMutation = useTelegramGatewayAuthStart();
  const submitMutation = useTelegramGatewayAuthSubmit();
  const cancelMutation = useTelegramGatewayAuthCancel();
  const toast = useToast();

  const status = authStatus?.status ?? 'idle';
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const logs = authStatus?.logs ?? [];
  const running = authStatus?.running ?? false;
  const isStarting = startMutation.isPending;
  const logsViewportRef = useRef<HTMLDivElement | null>(null);

  const canStart = !running && status !== 'starting';
  const canCancel = running && status !== 'cancelling';
  const canSubmitInput =
    running &&
    (status === 'waiting_code' ||
      status === 'waiting_password' ||
      status === 'processing_code');

  const resolveAuthErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object') {
      const err = error as { details?: unknown };
      if (typeof err.details === 'string' && err.details.trim() !== '') {
        return err.details.trim();
      }
      if (err.details && typeof err.details === 'object') {
        const details = err.details as { message?: unknown; error?: unknown };
        if (
          typeof details.message === 'string' &&
          details.message.trim() !== ''
        ) {
          return details.message.trim();
        }
        if (typeof details.error === 'string' && details.error.trim() !== '') {
          return details.error.trim();
        }
      }
    }
    return resolveErrorMessage(error, fallback);
  };

  const handleAuthError = (error: unknown, fallback: string) => {
    const message = resolveAuthErrorMessage(error, fallback);
    const statusCode =
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status?: number }).status
        : undefined;
    if (statusCode === 409) {
      toast.warning(message);
    } else {
      toast.error(message);
    }
  };

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync();
      toast.success(
        'Fluxo de autenticação iniciado. Acompanhe os logs para próximos passos.',
      );
      setIsTerminalOpen(true);
    } catch (error) {
      handleAuthError(error, 'Não foi possível iniciar a autenticação.');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.info('Solicitado cancelamento do fluxo de autenticação.');
    } catch (error) {
      handleAuthError(error, 'Não foi possível cancelar a autenticação.');
    }
  };

  const handleSubmit = async () => {
    const value = inputValue.trim();
    if (!value) return;
    try {
      await submitMutation.mutateAsync(value);
      toast.success('Entrada enviada ao processo de autenticação.');
      setInputValue('');
    } catch (error) {
      handleAuthError(error, 'Não foi possível enviar a entrada.');
    }
  };

  useEffect(() => {
    if (running && !isTerminalOpen) {
      setIsTerminalOpen(true);
    }
  }, [running, isTerminalOpen]);

  useEffect(() => {
    if (!isTerminalOpen) {
      return;
    }
    const viewport = logsViewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [logs, isTerminalOpen, status]);

  const latestLog = useMemo(() => logs[logs.length - 1], [logs]);
  const emptyLogsMessage = useMemo(() => {
    if (isStarting || status === 'starting') {
      return 'Inicializando script de autenticação... aguardando a primeira saída do processo.';
    }
    if (
      running ||
      status === 'waiting_code' ||
      status === 'processing_code' ||
      status === 'waiting_password' ||
      status === 'processing_password'
    ) {
      return 'Script em execução. Assim que o Telegram solicitar, informe o código ou senha no campo abaixo.';
    }
    if (status === 'completed') {
      return 'Processo concluído. Nenhum log adicional disponível.';
    }
    if (status === 'cancelling' || status === 'cancelled') {
      return 'Processo cancelado. Reinicie a autenticação para gerar novos logs.';
    }
    if (status === 'error') {
      return 'Processo falhou antes de emitir logs. Verifique os scripts de inicialização e tente novamente.';
    }
    return 'Processo não iniciado. Clique em Iniciar para executar o script.';
  }, [isStarting, running, status]);

  return (
    <>
      <CollapsibleCard cardId="telegram-gateway-authentication">
        <CollapsibleCardHeader className="border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex w-full items-start justify-between gap-4">
            <div>
              <CollapsibleCardTitle className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="h-5 w-5 text-blue-500" />
                Autenticação Telegram
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Execute o fluxo de login para renovar a sessão MTProto do
                gateway diretamente pelo dashboard.
              </CollapsibleCardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTerminalOpen(true);
                  void handleStart();
                }}
                disabled={!canStart || startMutation.isPending}
                data-collapsible-ignore="true"
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
                onClick={() => void handleCancel()}
                disabled={!canCancel || cancelMutation.isPending}
                data-collapsible-ignore="true"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTerminalOpen(true)}
                data-collapsible-ignore="true"
              >
                <MonitorUp className="mr-2 h-4 w-4" />
                Abrir terminal
              </Button>
            </div>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent className="space-y-4 pt-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className={`text-sm font-semibold ${meta.accent}`}>
              {meta.label}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {meta.description}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 md:grid-cols-3">
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Início:
                </span>{' '}
                {authStatus?.startedAt
                  ? new Date(authStatus.startedAt).toLocaleString('pt-BR')
                  : '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Fim:
                </span>{' '}
                {authStatus?.finishedAt
                  ? new Date(authStatus.finishedAt).toLocaleString('pt-BR')
                  : '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Saída:
                </span>{' '}
                {typeof authStatus?.exitCode === 'number'
                  ? authStatus.exitCode
                  : '—'}
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
              disabled={
                !canSubmitInput ||
                !inputValue.trim() ||
                submitMutation.isPending
              }
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
                <ScrollText className="h-4 w-4" /> Logs do processo
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
              <ul className="space-y-1 px-4 py-3 text-xs font-mono text-slate-300">
                {logs.length === 0 ? (
                  <li className="text-slate-500">{emptyLogsMessage}</li>
                ) : (
                  logs.map((log, index) => {
                    const levelMeta = LOG_STYLES[log.level] ?? {
                      className: 'text-slate-600 dark:text-slate-400',
                      label: `[${log.level}]`,
                    };
                    return (
                      <li
                        key={`${log.timestamp}-${index}`}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-slate-500 dark:text-slate-500">
                          [
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                          ]
                        </span>{' '}
                        <span
                          className={`${levelMeta.className} font-semibold`}
                        >
                          {levelMeta.label}
                        </span>{' '}
                        <span>{log.message}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollArea>
          </div>
        </CollapsibleCardContent>
      </CollapsibleCard>

      <Dialog open={isTerminalOpen} onOpenChange={setIsTerminalOpen}>
        <DialogContent className="max-w-3xl bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Terminal className="h-5 w-5 text-cyan-400" />
              Terminal de autenticação MTProto
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Fluxo interativo do script{' '}
              <code>authenticate-interactive.sh</code>. Responda aos prompts
              abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded border border-slate-800 bg-slate-900">
              <div
                ref={logsViewportRef}
                className="max-h-[420px] overflow-y-auto bg-slate-950 px-4 py-3 font-mono text-sm leading-relaxed"
              >
                {logs.length === 0 ? (
                  <p className="text-slate-500">{emptyLogsMessage}</p>
                ) : (
                  logs.map((log, index) => {
                    const levelMeta = LOG_STYLES[log.level] ?? {
                      className: 'text-slate-400',
                      label: `[${log.level}]`,
                    };
                    return (
                      <div
                        key={`${log.timestamp}-${index}`}
                        className="whitespace-pre-wrap text-slate-200"
                      >
                        <span className="text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>{' '}
                        <span
                          className={`${levelMeta.className} font-semibold`}
                        >
                          {levelMeta.label}
                        </span>{' '}
                        <span>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Código / Senha 2FA
                </label>
                <Input
                  placeholder="Ex: 12345"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  disabled={!canSubmitInput}
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-500"
                />
                <p className="text-xs text-slate-500">
                  Informe o código recebido via SMS ou a senha de dois fatores
                  quando solicitado nos logs.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => void handleSubmit()}
                disabled={
                  !canSubmitInput ||
                  !inputValue.trim() ||
                  submitMutation.isPending
                }
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${running ? 'bg-emerald-400' : 'bg-slate-500'}`}
                />
                Status: {meta.label}
              </span>
              <span>
                Início:{' '}
                {authStatus?.startedAt
                  ? new Date(authStatus.startedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '—'}
              </span>
              <span>
                Fim:{' '}
                {authStatus?.finishedAt
                  ? new Date(authStatus.finishedAt).toLocaleTimeString(
                      'pt-BR',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      },
                    )
                  : '—'}
              </span>
              <span>
                Exit code:{' '}
                {typeof authStatus?.exitCode === 'number'
                  ? authStatus.exitCode
                  : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCancel()}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTerminalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
