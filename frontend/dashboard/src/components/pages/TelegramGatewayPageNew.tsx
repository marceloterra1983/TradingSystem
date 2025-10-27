import { useState, useCallback } from 'react';
import { 
  useTelegramGatewayOverview,
  useTelegramGatewayMessages,
  useTelegramGatewayChannels,
  useCreateTelegramGatewayChannel,
  useUpdateTelegramGatewayChannel,
  useDeleteTelegramGatewayChannel,
} from '../../hooks/useTelegramGateway';
import { SimpleStatusCard } from './telegram-gateway/SimpleStatusCard';
import { SimpleSessionCard } from './telegram-gateway/SimpleSessionCard';
import { SimpleMessagesCard } from './telegram-gateway/SimpleMessagesCard';
import { SimpleChannelsCard } from './telegram-gateway/SimpleChannelsCard';
import { Button } from '../ui/button';

export function TelegramGatewayPageNew() {
  const [messageLimit] = useState(10);
  const [messageOffset, setMessageOffset] = useState(0);

  // Fetch data
  const { 
    data: overview, 
    isLoading: overviewLoading, 
    refetch: refetchOverview 
  } = useTelegramGatewayOverview();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useTelegramGatewayMessages({
    limit: messageLimit,
    offset: messageOffset,
    sort: 'desc',
  });

  const {
    data: channels = [],
    isLoading: channelsLoading,
  } = useTelegramGatewayChannels();

  // Mutations
  const createChannel = useCreateTelegramGatewayChannel();
  const updateChannel = useUpdateTelegramGatewayChannel();
  const deleteChannel = useDeleteTelegramGatewayChannel();

  // Handlers
  const handleRefreshAll = useCallback(() => {
    refetchOverview();
    refetchMessages();
  }, [refetchOverview, refetchMessages]);

  const handleCreateChannel = useCallback(async (data: { 
    channelId: string; 
    label?: string; 
    description?: string 
  }) => {
    await createChannel.mutateAsync(data);
  }, [createChannel]);

  const handleToggleChannel = useCallback(async (id: string, isActive: boolean) => {
    await updateChannel.mutateAsync({ id, isActive: !isActive });
  }, [updateChannel]);

  const handleDeleteChannel = useCallback(async (id: string) => {
    await deleteChannel.mutateAsync(id);
  }, [deleteChannel]);

  const handleLoadMore = useCallback(() => {
    setMessageOffset(prev => prev + messageLimit);
  }, [messageLimit]);

  // Extract data
  const messages = messagesData?.data || [];
  const totalMessages = messagesData?.pagination?.total || 0;
  const hasMore = messagesData?.pagination?.hasMore || false;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telegram Gateway</h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento do serviço MTProto e mensagens persistidas
          </p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll}>
          Atualizar Tudo
        </Button>
      </div>

      {/* Status Overview */}
      <SimpleStatusCard
        health={overview?.health}
        messages={overview?.messages}
        session={overview?.session}
        isLoading={overviewLoading}
        onRefresh={refetchOverview}
      />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages */}
        <div className="lg:col-span-2">
          <SimpleMessagesCard
            messages={messages as any}
            total={totalMessages}
            isLoading={messagesLoading}
            onRefresh={refetchMessages}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            hasMore={hasMore}
          />
        </div>

        {/* Session */}
        <SimpleSessionCard
          session={overview?.session}
          isLoading={overviewLoading}
        />

        {/* Channels */}
        <SimpleChannelsCard
          channels={channels}
          isLoading={channelsLoading}
          onCreate={handleCreateChannel}
          onToggle={handleToggleChannel}
          onDelete={handleDeleteChannel}
        />
      </div>

      {/* Debug Info (dev only) */}
      {import.meta.env.DEV && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            🔧 Debug Info (somente em desenvolvimento)
          </summary>
          <pre className="mt-2 text-xs bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify({
              overview: {
                health: overview?.health,
                messagesTotal: overview?.messages?.total,
                sessionExists: overview?.session?.exists,
              },
              messagesData: {
                count: messages.length,
                total: totalMessages,
                hasMore,
              },
              channels: {
                total: channels.length,
                active: channels.filter(c => c.isActive).length,
              },
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default TelegramGatewayPageNew;

