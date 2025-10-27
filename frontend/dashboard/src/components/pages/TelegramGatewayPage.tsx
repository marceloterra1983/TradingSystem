import { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import {
  useTelegramGatewayDeleteMessage,
  useTelegramGatewayMessages,
  useTelegramGatewayOverview,
  useTelegramGatewayReload,
  useTelegramGatewayReprocess,
  TelegramGatewayMessage,
  TelegramGatewayMessagesFilters,
} from '../../hooks/useTelegramGateway';
import { StatusSummary } from './telegram-gateway/StatusSummary';
import { MetricsOverview } from './telegram-gateway/MetricsOverview';
import { MessagesTable } from './telegram-gateway/MessagesTable';
import { FailureQueueCard } from './telegram-gateway/FailureQueueCard';
import { SessionCard } from './telegram-gateway/SessionCard';
import { ChannelsManagerCard } from './telegram-gateway/ChannelsManagerCard';
import { AuthenticationCard } from './telegram-gateway/AuthenticationCard';
import { ConnectionDiagnosticCard } from './telegram-gateway/ConnectionDiagnosticCard';
import { RefreshCw } from 'lucide-react';

export function TelegramGatewayPage() {
  const [messageFilters, setMessageFilters] = useState<TelegramGatewayMessagesFilters>({
    limit: 25,
    sort: 'desc',
  });

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useTelegramGatewayOverview();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useTelegramGatewayMessages(messageFilters);

  const reloadCache = useTelegramGatewayReload();
  const reprocessMutation = useTelegramGatewayReprocess();
  const deleteMutation = useTelegramGatewayDeleteMessage();

  const handleReloadCache = useCallback(async () => {
    await reloadCache.mutateAsync();
  }, [reloadCache]);

  const handleReprocess = useCallback(
    async (message: TelegramGatewayMessage) => {
      await reprocessMutation.mutateAsync({
        id: message.id,
        requestedBy: 'dashboard',
      });
    },
    [reprocessMutation],
  );

  const handleDelete = useCallback(
    async (message: TelegramGatewayMessage) => {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Tem certeza que deseja marcar esta mensagem como removida?')
          : true;
      if (!confirmed) return;

      await deleteMutation.mutateAsync({
        id: message.id,
      });
    },
    [deleteMutation],
  );

  const queueStatus = overview?.queue;
  const sessionStatus = overview?.session;
  const metricsSummary = overview?.metrics?.summary;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Telegram Gateway</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Monitoramento em tempo real do serviço MTProto, consumo da API local e telemetria persistida no TimescaleDB.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchOverview();
              void refetchMessages();
            }}
            disabled={overviewLoading || messagesLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar tudo
          </Button>
        </div>
      </header>

      <StatusSummary
        overview={overview}
        isLoading={overviewLoading}
        error={overviewError}
        onRefresh={() => void refetchOverview()}
        onReloadCache={handleReloadCache}
        isReloading={reloadCache.isPending}
        lastUpdated={overview?.timestamp}
      />

      <ConnectionDiagnosticCard 
        overview={overview}
        isLoading={overviewLoading}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MessagesTable
            data={messagesData}
            isLoading={messagesLoading}
            error={messagesError}
            filters={messageFilters}
            onFiltersChange={setMessageFilters}
            onRefresh={() => void refetchMessages()}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            isReprocessing={reprocessMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
          <MetricsOverview metrics={metricsSummary} isLoading={overviewLoading && !metricsSummary} />
        </div>
        <div className="space-y-4">
          <FailureQueueCard
            queue={queueStatus}
            isLoading={overviewLoading && !queueStatus}
            onRefresh={() => void refetchOverview()}
          />
          <SessionCard session={sessionStatus} isLoading={overviewLoading && !sessionStatus} />
          <ChannelsManagerCard />
          <AuthenticationCard />
        </div>
      </div>
    </div>
  );
}

export default TelegramGatewayPage;
