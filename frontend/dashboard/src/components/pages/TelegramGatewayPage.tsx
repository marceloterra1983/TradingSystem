import { useCallback, useMemo, useState } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import type { PageSection } from '../layout/CustomizablePageLayout';
import {
  useTelegramGatewayDeleteMessage,
  useTelegramGatewayMessages,
  useTelegramGatewayOverview,
  useTelegramGatewayReload,
  useTelegramGatewayReprocess,
  TelegramGatewayMessagesFilters,
  TelegramGatewayMessage,
} from '../../hooks/useTelegramGateway';
import { StatusSummary } from './telegram-gateway/StatusSummary';
import { MetricsOverview } from './telegram-gateway/MetricsOverview';
import { MessagesTable } from './telegram-gateway/MessagesTable';
import { FailureQueueCard } from './telegram-gateway/FailureQueueCard';
import { SessionCard } from './telegram-gateway/SessionCard';
import { ChannelsManagerCard } from './telegram-gateway/ChannelsManagerCard';
import { AuthenticationCard } from './telegram-gateway/AuthenticationCard';

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

  const overviewTimestamp = overview?.timestamp;
  const metricsSummary = overview?.metrics?.summary;
  const queueStatus = overview?.queue;
  const sessionStatus = overview?.session;

  const sections = useMemo<PageSection[]>(
    () => [
      {
        id: 'telegram-gateway-status',
        content: (
          <StatusSummary
            overview={overview}
            isLoading={overviewLoading}
            error={overviewError}
            onRefresh={() => {
              void refetchOverview();
            }}
            onReloadCache={handleReloadCache}
            isReloading={reloadCache.isPending}
            lastUpdated={overviewTimestamp}
          />
        ),
      },
      {
        id: 'telegram-gateway-metrics',
        content: (
          <MetricsOverview
            metrics={metricsSummary}
            isLoading={overviewLoading && !metricsSummary}
          />
        ),
      },
      {
        id: 'telegram-gateway-channels',
        content: <ChannelsManagerCard />,
      },
      {
        id: 'telegram-gateway-messages',
        content: (
          <MessagesTable
            data={messagesData}
            isLoading={messagesLoading}
            error={messagesError}
            filters={messageFilters}
            onFiltersChange={setMessageFilters}
            onRefresh={() => {
              void refetchMessages();
            }}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            isReprocessing={reprocessMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        ),
      },
      {
        id: 'telegram-gateway-queue',
        content: (
          <FailureQueueCard
            queue={queueStatus}
            isLoading={overviewLoading && !queueStatus}
            onRefresh={() => {
              void refetchOverview();
            }}
          />
        ),
      },
      {
        id: 'telegram-gateway-session',
        content: (
          <SessionCard session={sessionStatus} isLoading={overviewLoading && !sessionStatus} />
        ),
      },
      {
        id: 'telegram-gateway-auth',
        content: <AuthenticationCard />,
      },
    ],
    [
      metricsSummary,
      queueStatus,
      sessionStatus,
      overviewTimestamp,
      deleteMutation.isPending,
      handleDelete,
      handleReloadCache,
      handleReprocess,
      messageFilters,
      messagesData,
      messagesError,
      messagesLoading,
      overview,
      overviewError,
      overviewLoading,
      refetchMessages,
      refetchOverview,
      reloadCache.isPending,
      reprocessMutation.isPending,
    ],
  );

  return (
    <CustomizablePageLayout
      pageId='telegram-gateway'
      title='Telegram Gateway'
      subtitle='Monitoramento operacional, telemetria, fila de falhas e persistência das mensagens MTProto.'
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default TelegramGatewayPage;
