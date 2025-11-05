import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../../ui/collapsible-card';
import {
  MessageSquare,
  Eye,
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { MessageDetailModal } from './MessageDetailModal';
import { normalizeTimestamp } from '../../../utils/timestampUtils';
import { formatInTimeZone } from 'date-fns-tz';

export interface ForwardedMessage {
  id: number;
  ts: string;
  source_channel_id: number;
  source_channel_name?: string;
  message_id: number;
  message_text?: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
  forwarded_at: string;
  destination_channel_id?: number;
  forward_method?: 'forward' | 'copy';
}

async function fetchForwardedMessages(
  limit: number,
): Promise<ForwardedMessage[]> {
  // ✅ Using authenticated helper
  const { tpCapitalApi } = await import('../../../utils/tpCapitalApi');
  const response = await tpCapitalApi.get(`/forwarded-messages?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data || [];
}

export function ForwardedMessagesTable() {
  const [limit, setLimit] = useState(50);
  const [selectedMessage, setSelectedMessage] =
    useState<ForwardedMessage | null>(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['forwarded-messages', limit],
    queryFn: () => fetchForwardedMessages(limit),
    refetchInterval: 60000, // Auto-refresh a cada 60s (antes: 15s - causa rate limit)
    staleTime: 30000,
  });

  // Obter lista de canais únicos
  const channelOptions = useMemo(() => {
    const channels = new Set(
      messages.map(
        (m) => m.source_channel_name || `Canal ${m.source_channel_id}`,
      ),
    );
    return Array.from(channels).sort();
  }, [messages]);

  // Filtrar mensagens
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      const matchesChannel =
        channelFilter === 'all' ||
        (msg.source_channel_name || `Canal ${msg.source_channel_id}`) ===
          channelFilter;

      const matchesMedia =
        mediaFilter === 'all' ||
        (mediaFilter === 'with-media' && msg.image_url) ||
        (mediaFilter === 'no-media' && !msg.image_url);

      const matchesSearch = searchTerm
        ? (msg.message_text || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (msg.source_channel_name || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;

      return matchesChannel && matchesMedia && matchesSearch;
    });
  }, [messages, channelFilter, mediaFilter, searchTerm]);

  const formatDate = (dateStr: string | number) => {
    const normalized = normalizeTimestamp(dateStr);
    if (!normalized) return '–';

    try {
      const date = new Date(normalized);
      return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yy, HH:mm');
    } catch {
      return '–';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <>
      <CollapsibleCard cardId="forwarded-messages-table">
        <CollapsibleCardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CollapsibleCardTitle>
                <MessageSquare className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
                Mensagens Encaminhadas
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Exibindo {filteredMessages.length} de {messages.length}{' '}
                mensagens
              </CollapsibleCardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refetch()}
                className="h-8"
                title="Recarregar mensagens"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Busca por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white dark:bg-gray-800"
              />
            </div>

            {/* Filtro por canal */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">Todos os canais</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>

            {/* Filtro por mídia */}
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">Todas (com/sem mídia)</option>
              <option value="with-media">Apenas com imagem</option>
              <option value="no-media">Apenas texto</option>
            </select>

            {/* Quantidade de mensagens */}
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value={25}>Mostrar 25</option>
              <option value={50}>Mostrar 50</option>
              <option value={100}>Mostrar 100</option>
              <option value={200}>Mostrar 200</option>
            </select>

            {/* Botão limpar filtros */}
            {(channelFilter !== 'all' ||
              mediaFilter !== 'all' ||
              searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setChannelFilter('all');
                  setMediaFilter('all');
                  setSearchTerm('');
                }}
                className="h-9"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Carregando mensagens...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
                <p className="text-sm">Erro ao carregar mensagens</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {error instanceof Error ? error.message : 'Erro desconhecido'}
                </p>
              </div>
            </div>
          ) : filteredMessages.length === 0 && messages.length > 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium">
                  Nenhuma mensagem encontrada com os filtros aplicados
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChannelFilter('all');
                    setMediaFilter('all');
                    setSearchTerm('');
                  }}
                  className="mt-2"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium">
                  Nenhuma mensagem encaminhada ainda
                </p>
                <p className="text-xs text-gray-400">
                  As mensagens aparecerão aqui quando forem recebidas
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Canal de Origem
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Mensagem Recebida
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                      Mídia
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                      Método
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                      Ver Origem
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                      Ver Enviada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMessages.map((message: ForwardedMessage) => (
                    <tr
                      key={message.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {formatDate(message.ts)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {message.source_channel_name ||
                              `Canal ${message.source_channel_id}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {message.source_channel_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-gray-700 dark:text-gray-300 truncate">
                          {truncateText(message.message_text || '', 80)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {message.image_url ? (
                          <div className="flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            message.forward_method === 'copy'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {message.forward_method === 'copy'
                            ? 'Cópia'
                            : 'Encaminhar'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMessage(message)}
                          className="h-7 px-2"
                          title="Ver mensagem original recebida"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const destLink = `https://t.me/c/${String(message.destination_channel_id).replace('-100', '')}`;
                            window.open(destLink, '_blank');
                          }}
                          className="h-7 px-2"
                          title="Abrir canal de destino no Telegram"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Telegram
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleCardContent>
      </CollapsibleCard>

      <MessageDetailModal
        message={selectedMessage}
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
      />
    </>
  );
}
