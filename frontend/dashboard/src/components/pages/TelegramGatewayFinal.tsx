import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
// Quick Win P1-1: Hooks e componentes integrados!
import { useGatewayData, useChannelManager } from './telegram-gateway/hooks';
// import { GatewayFilters } from './telegram-gateway/components/GatewayFilters';
import { usePolling } from '../../hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Radio,
  Wifi,
  Database,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Activity,
  Eye,
  Search,
  X,
  Filter,
  Image,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { GatewayLogsCard } from '../telegram/GatewayLogsCard';
import { TwitterPreview } from '../telegram/TwitterPreview';
import { YouTubePreview } from '../telegram/YouTubePreview';
import { InstagramPreview } from '../telegram/InstagramPreview';

// interface GatewayData {
//   health?: {
//     status: string;
//     telegram: string;
//     uptime: number;
//   };
//   messages?: {
//     total: number;
//     recent: any[];
//   };
//   session?: {
//     exists: boolean;
//     path?: string;
//     hash?: string;
//     sizeBytes?: number;
//     updatedAt?: string;
//     ageMs?: number;
//   };
// }

interface Channel {
  id: string;
  channelId: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
}

const surfaceCardClass =
  'rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60';
const statusLabelClass =
  'text-sm font-medium text-slate-600 dark:text-slate-300';
const statusValueClass =
  'text-2xl font-bold text-slate-900 dark:text-slate-100';
const statusMutedTextClass =
  'text-xs text-slate-500 dark:text-slate-400';

export function TelegramGatewayFinal() {
  // Message filters (needed before useGatewayData)
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterText, setFilterText] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterLimit, setFilterLimit] = useState<string>('50');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'channel' | 'text'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default: última mensagem no topo

  // Quick Win P1-1: Using extracted hooks
  const {
    data,
    channels,
    messages,
    loading,
    fetchData,
  } = useGatewayData(filterChannel, filterLimit);

  // Channel form
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelLabel, setNewChannelLabel] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Message dialog
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Message sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({
    show: false,
    success: false,
    message: '',
  });

  // Message highlighting
  const [highlightedMessages, setHighlightedMessages] = useState<Set<string>>(
    new Set(),
  );
  const previousMessageIdsRef = useRef<Set<string>>(new Set());

  // Detectar novas mensagens e destacá-las
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const currentMessageIds = new Set(messages.map((msg: any) => msg.id));

    // Se é o primeiro carregamento (previousMessageIdsRef está vazio),
    // apenas inicializar sem destacar nada
    if (previousMessageIdsRef.current.size === 0) {
      previousMessageIdsRef.current = currentMessageIds;
      return;
    }

    const newMessageIds = new Set<string>();

    // Identificar mensagens que não estavam na lista anterior
    currentMessageIds.forEach((id) => {
      if (!previousMessageIdsRef.current.has(id)) {
        newMessageIds.add(id);
      }
    });

    // Atualizar as mensagens destacadas apenas se houver novas mensagens
    if (newMessageIds.size > 0) {
      setHighlightedMessages(newMessageIds);

      // Remover destaque após 1 minuto
      const timer = setTimeout(() => {
        setHighlightedMessages(new Set());
      }, 60000);

      // Atualizar referência dos IDs anteriores
      previousMessageIdsRef.current = currentMessageIds;

      return () => clearTimeout(timer);
    } else {
      // Atualizar referência dos IDs anteriores mesmo sem novas mensagens
      previousMessageIdsRef.current = currentMessageIds;
    }
  }, [messages]);

  const handleViewMessage = (msg: any) => {
    setSelectedMessage(msg);
    setIsDialogOpen(true);
  };

  const handleCheckMessages = async () => {
    setIsSyncing(true);
    setSyncResult({ show: false, success: false, message: '' });

    try {
      const token =
        (
          import.meta.env.VITE_TELEGRAM_GATEWAY_API_TOKEN as string | undefined
        )?.trim() ||
        (import.meta.env.VITE_API_SECRET_TOKEN as string | undefined)?.trim() ||
        '';

      const response = await fetch('/api/telegram-gateway/sync-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-API-Key': token } : {}),
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const totalSynced = result.data?.totalMessagesSynced || 0;
        setSyncResult({
          show: true,
          success: true,
          message:
            totalSynced > 0
              ? `✅ ${totalSynced} mensagem(ns) recuperada(s) com sucesso!`
              : '✓ Todas as mensagens estão sincronizadas.',
        });

        // Recarregar mensagens após sincronização
        if (totalSynced > 0) {
          await fetchData();
        }
      } else {
        setSyncResult({
          show: true,
          success: false,
          message: `❌ Erro: ${result.message || 'Falha ao sincronizar mensagens'}`,
        });
      }
    } catch (error) {
      setSyncResult({
        show: true,
        success: false,
        message: '❌ Erro ao conectar com o serviço de sincronização',
      });
    } finally {
      setIsSyncing(false);

      // Auto-hide resultado após 5 segundos
      setTimeout(() => {
        setSyncResult({ show: false, success: false, message: '' });
      }, 5000);
    }
  };

  const handleClearFilters = () => {
    setFilterChannel('all');
    setFilterText('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterLimit('50');
  };

  const getChannelLabel = useCallback(
    (channelId: string) => {
      const channel = channels.find((ch) => ch.channelId === channelId);
      return channel?.label || channelId;
    },
    [channels],
  );

  const renderTextWithLinks = (text: string | null | undefined) => {
    if (!text) return null;

    // Regex para detectar URLs (http, https, www)
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Se é uma URL, criar link clicável
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }

      // Se não é URL, retornar texto normal
      return <span key={index}>{part}</span>;
    });
  };

  // Handler for sorting
  const handleSort = (column: 'date' | 'channel' | 'text') => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc for date, asc for others
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const filteredMessages = useMemo(() => {
    let filtered =
      messages.length > 0 ? messages : data?.messages?.recent || [];

    // Filter by channel
    if (filterChannel !== 'all') {
      filtered = filtered.filter((msg: any) => msg.channelId === filterChannel);
    }

    // Filter by text
    if (filterText.trim()) {
      const searchTerm = filterText.toLowerCase();
      filtered = filtered.filter((msg: any) => {
        const text = (msg.text || msg.caption || '').toLowerCase();
        const channelLabel = getChannelLabel(msg.channelId).toLowerCase();
        return text.includes(searchTerm) || channelLabel.includes(searchTerm);
      });
    }

    // Filter by date range
    if (filterDateFrom || filterDateTo) {
      filtered = filtered.filter((msg: any) => {
        // Usar telegram_date (horário de envio) em vez de receivedAt (horário de sincronização)
        const dateToFilter = msg.telegramDate || msg.receivedAt;
        if (!dateToFilter) return false;
        const msgDate = new Date(dateToFilter);

        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          if (msgDate < fromDate) return false;
        }

        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999); // Include the whole day
          if (msgDate > toDate) return false;
        }

        return true;
      });
    }

    // Sort messages
    const sorted = [...filtered].sort((a: any, b: any) => {
      let compareValue = 0;

      switch (sortColumn) {
        case 'date': {
          const dateA = new Date(a.telegramDate || a.receivedAt || 0).getTime();
          const dateB = new Date(b.telegramDate || b.receivedAt || 0).getTime();
          compareValue = dateA - dateB;
          break;
        }
        case 'channel': {
          const labelA = getChannelLabel(a.channelId).toLowerCase();
          const labelB = getChannelLabel(b.channelId).toLowerCase();
          compareValue = labelA.localeCompare(labelB);
          break;
        }
        case 'text': {
          const textA = (a.text || a.caption || '').toLowerCase();
          const textB = (b.text || b.caption || '').toLowerCase();
          compareValue = textA.localeCompare(textB);
          break;
        }
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [
    messages,
    data?.messages?.recent,
    filterChannel,
    filterText,
    filterDateFrom,
    filterDateTo,
    sortColumn,
    sortDirection,
    getChannelLabel,
  ]);

  // Quick Win P1-1 & P2-5: Using usePolling hook
  usePolling(fetchData, {
    interval: 15000,
    immediate: true,
  });

  // Quick Win P1-1: Using useChannelManager for CRUD operations
  const {
    createChannel,
    updateChannel,
    deleteChannel: deleteChannelApi,
    toggleChannel: toggleChannelApi,
  } = useChannelManager(fetchData);

  const handleCreateChannel = useCallback(async () => {
    const success = await createChannel({
      channelId: newChannelId,
      label: newChannelLabel,
      description: newChannelDesc,
    });

    if (success) {
      setNewChannelId('');
      setNewChannelLabel('');
      setNewChannelDesc('');
    }
  }, [createChannel, newChannelId, newChannelLabel, newChannelDesc]);

  const handleToggleChannel = useCallback(async (id: string, isActive: boolean) => {
    await toggleChannelApi(id, isActive);
  }, [toggleChannelApi]);

  const handleDeleteChannel = useCallback(async (id: string, channelId: string) => {
    await deleteChannelApi(id, channelId);
  }, [deleteChannelApi]);

  const handleEditChannel = useCallback(async (id: string, current: Channel) => {
    const newLabel = prompt('Novo rótulo:', current.label || '');
    if (newLabel === null) return;

    const newDesc = prompt('Nova descrição:', current.description || '');
    if (newDesc === null) return;

    await updateChannel(id, {
      label: newLabel || undefined,
      description: newDesc || undefined,
    });
  }, [updateChannel]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const sections = useMemo(
    () => [
      // Status Overview Card
      {
        id: 'status-overview',
        content: (
          <CollapsibleCard
            cardId="telegram-gateway-status"
            defaultCollapsed={false}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <CollapsibleCardTitle>Status do Sistema</CollapsibleCardTitle>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {/* Refresh Button */}
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  />
                  {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Gateway */}
                <div className={surfaceCardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={statusLabelClass}>Gateway</span>
                    {data?.health?.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={statusValueClass}>
                      {data?.health?.status || 'unknown'}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • {formatUptime(data?.health?.uptime)}
                    </span>
                  </div>
                </div>

                {/* Telegram */}
                <div className={surfaceCardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={statusLabelClass}>Telegram</span>
                    <Wifi
                      className={`h-5 w-5 ${data?.health?.telegram === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}
                    />
                  </div>
                  <Badge
                    variant={data?.health?.telegram === 'connected' ? 'success' : 'destructive'}
                  >
                    {data?.health?.telegram === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {data?.health?.telegram === 'connected' ? 'MTProto ativo' : 'Verificar autenticação'}
                  </p>
                </div>

                {/* Messages */}
                <div className={surfaceCardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={statusLabelClass}>Mensagens</span>
                    <Database className="h-5 w-5 text-cyan-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {data?.messages?.total || 0}
                  </p>
                  <p className={cn(statusMutedTextClass, 'mt-1')}>Persistidas no TimescaleDB</p>
                </div>

                {/* Session - Compact and balanced */}
                <div className={surfaceCardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={statusLabelClass}>Sessão</span>
                    <ShieldCheck
                      className={`h-5 w-5 ${data?.session?.exists ? 'text-emerald-400' : 'text-slate-600'}`}
                    />
                  </div>
                  
                  <Badge
                    variant={data?.session?.exists ? 'success' : 'secondary'}
                    className={cn(
                      'mb-2',
                      !data?.session?.exists && 'text-slate-700 dark:text-slate-100',
                    )}
                  >
                    {data?.session?.exists ? '✓ Autenticada' : 'Ausente'}
                  </Badge>

                  {data?.session?.exists ? (
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {data.session.hash && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 dark:text-slate-500">Hash:</span>
                          <code className="font-mono text-cyan-700 dark:text-cyan-400">
                            {data.session.hash.substring(0, 12)}...
                          </code>
                        </div>
                      )}
                      {data.session.updatedAt && (
                        <div>
                          {formatDateOnly(data.session.updatedAt)}, {formatTime(data.session.updatedAt)}
                        </div>
                      )}
                      {data.session.sizeBytes && (
                        <div className="text-slate-500 dark:text-slate-500">
                          {data.session.sizeBytes} bytes
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Execute authenticate-interactive.sh
                    </p>
                  )}
                </div>
              </div>

              {/* Alert */}
              {data &&
                (data.health?.status !== 'healthy' ||
                  data.health?.telegram !== 'connected' ||
                  !data.session?.exists) && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-100 mb-2">
                          Sistema não está completamente operacional
                        </p>
                        <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-200">
                          {data.health?.status !== 'healthy' && (
                            <li>• Gateway MTProto offline (porta 4010)</li>
                          )}
                          {data.health?.telegram !== 'connected' && (
                            <li>• Telegram desconectado</li>
                          )}
                          {!data.session?.exists && (
                            <li>
                              • Sessão ausente - executar
                              authenticate-interactive.sh
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },

      // Messages Table Card
      {
        id: 'messages-table',
        content: (
          <CollapsibleCard
            cardId="telegram-gateway-messages"
            defaultCollapsed={false}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                <CollapsibleCardTitle>
                  Mensagens ({filteredMessages.length} de{' '}
                  {messages.length > 0
                    ? messages.length
                    : data?.messages?.total || 0}
                  )
                </CollapsibleCardTitle>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {/* Sync Messages Button and Result */}
              <div className="mb-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckMessages}
                  disabled={isSyncing}
                  className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 focus:ring-cyan-500 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
                  data-collapsible-ignore="true"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Checar Mensagens
                    </>
                  )}
                </Button>

                {syncResult.show && (
                  <div
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm font-medium',
                      syncResult.success
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
                    )}
                  >
                    {syncResult.message}
                  </div>
                )}
              </div>

              {/* Filters Section */}
              <div className={cn(surfaceCardClass, 'mb-4')}>
                <div className="mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Filtros
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* Canal Filter */}
                  <Select
                    value={filterChannel}
                    onValueChange={setFilterChannel}
                  >
                    <SelectTrigger data-collapsible-ignore="true">
                      <SelectValue placeholder="Todos os canais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os canais</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.channelId}>
                          {channel.label || channel.channelId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Limit Filter */}
                  <Select value={filterLimit} onValueChange={setFilterLimit}>
                    <SelectTrigger data-collapsible-ignore="true">
                      <SelectValue placeholder="Quantidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 registros</SelectItem>
                      <SelectItem value="25">25 registros</SelectItem>
                      <SelectItem value="50">50 registros</SelectItem>
                      <SelectItem value="100">100 registros</SelectItem>
                      <SelectItem value="200">200 registros</SelectItem>
                      <SelectItem value="500">500 registros</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Text Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Buscar no texto..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="pl-10"
                      data-collapsible-ignore="true"
                    />
                  </div>

                  {/* Date From */}
                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    data-collapsible-ignore="true"
                  />

                  {/* Date To */}
                  <Input
                    type="date"
                    placeholder="Data final"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    data-collapsible-ignore="true"
                  />

                  {/* Clear Filters Button */}
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    data-collapsible-ignore="true"
                    className="text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                </div>

                {/* Active Filters Info */}
                {(filterChannel !== 'all' ||
                  filterText ||
                  filterDateFrom ||
                  filterDateTo ||
                  filterLimit !== '50') && (
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <span>Filtros ativos:</span>
                    {filterChannel !== 'all' && (
                      <Badge
                        variant="outline"
                        className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300"
                      >
                        Canal: {getChannelLabel(filterChannel)}
                      </Badge>
                    )}
                    {filterLimit !== '50' && (
                      <Badge
                        variant="outline"
                        className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300"
                      >
                        Limite: {filterLimit} registros
                      </Badge>
                    )}
                    {filterText && (
                      <Badge
                        variant="outline"
                        className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300"
                      >
                        Texto: "{filterText}"
                      </Badge>
                    )}
                    {filterDateFrom && (
                      <Badge
                        variant="outline"
                        className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300"
                      >
                        De:{' '}
                        {new Date(filterDateFrom).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {filterDateTo && (
                      <Badge
                        variant="outline"
                        className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300"
                      >
                        Até:{' '}
                        {new Date(filterDateTo).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {loading && messages.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                  Carregando mensagens...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhuma mensagem encontrada</p>
                  <p className="text-sm mt-1">
                    {filterChannel !== 'all' ||
                    filterText ||
                    filterDateFrom ||
                    filterDateTo
                      ? 'Nenhuma mensagem corresponde aos filtros aplicados'
                      : data?.health?.telegram === 'connected'
                        ? 'Aguardando mensagens dos canais...'
                        : 'Conecte o Telegram primeiro'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-left">
                        <th className="px-4 pb-3">
                          <button
                            onClick={() => handleSort('date')}
                            className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            Enviada
                            {sortColumn === 'date' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-40" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 pb-3">
                          <button
                            onClick={() => handleSort('channel')}
                            className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            Canal
                            {sortColumn === 'channel' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-40" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 pb-3 text-center font-semibold text-slate-600 dark:text-slate-200">
                          Ações
                        </th>
                        <th className="px-4 pb-3">
                          <button
                            onClick={() => handleSort('text')}
                            className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            Texto
                            {sortColumn === 'text' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-40" />
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMessages.map((msg: any) => {
                        const isHighlighted = highlightedMessages.has(msg.id);
                        return (
                          <tr
                            key={msg.id}
                            className={cn(
                              'transition-colors duration-300',
                              isHighlighted
                                ? 'bg-yellow-100/80 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            )}
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <div className="flex flex-col gap-0.5 text-left">
                                <span className="font-semibold">
                                  {formatTime(
                                    msg.telegramDate || msg.receivedAt,
                                  )}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDateOnly(
                                    msg.telegramDate || msg.receivedAt,
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <span className="font-medium text-slate-700 dark:text-slate-100">
                                {getChannelLabel(msg.channelId)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewMessage(msg)}
                                data-collapsible-ignore="true"
                              >
                                <Eye className="mr-1 h-4 w-4" />
                                Ver
                              </Button>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                              <div className="flex items-start gap-2">
                                {msg.mediaType === 'photo' && (
                                  <>
                                    <Image
                                      className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5"
                                      aria-hidden="true"
                                    />
                                    <span className="sr-only">
                                      Contém imagem
                                    </span>
                                  </>
                                )}
                                <div className="line-clamp-2 max-w-md text-sm">
                                  {renderTextWithLinks(
                                    msg.text || msg.caption,
                                  ) || (
                                    <span className="text-slate-500 italic">
                                      sem texto
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },

      // Channels CRUD Table
      {
        id: 'channels-crud',
        content: (
          <CollapsibleCard
            cardId="telegram-gateway-channels"
            defaultCollapsed={false}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-purple-400" />
                <CollapsibleCardTitle>Canais Monitorados</CollapsibleCardTitle>
                <Badge
                  variant="outline"
                  className="ml-2 border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  {channels.filter((c) => c.isActive).length} /{' '}
                  {channels.length}
                </Badge>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {/* Add Form */}
              <div className={cn(surfaceCardClass, 'mb-6')}>
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Adicionar Novo Canal
                </p>
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    placeholder="Channel ID (ex: -1001234567890)"
                    value={newChannelId}
                    onChange={(e) => setNewChannelId(e.target.value)}
                    data-collapsible-ignore="true"
                  />
                  <Input
                    placeholder="Rótulo (opcional)"
                    value={newChannelLabel}
                    onChange={(e) => setNewChannelLabel(e.target.value)}
                    data-collapsible-ignore="true"
                  />
                  <Input
                    placeholder="Descrição (opcional)"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    data-collapsible-ignore="true"
                  />
                  <Button
                    onClick={handleCreateChannel}
                    disabled={!newChannelId.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500"
                    data-collapsible-ignore="true"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Table */}
              {channels.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <Radio className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhum canal configurado</p>
                  <p className="text-sm mt-1">
                    Modo permissivo: todas mensagens processadas
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-left">
                        <th className="px-4 pb-3 font-semibold text-slate-600 dark:text-slate-200">
                          Channel ID
                        </th>
                        <th className="px-4 pb-3 font-semibold text-slate-600 dark:text-slate-200">
                          Rótulo
                        </th>
                        <th className="px-4 pb-3 font-semibold text-slate-600 dark:text-slate-200">
                          Descrição
                        </th>
                        <th className="px-4 pb-3 font-semibold text-slate-600 dark:text-slate-200">
                          Status
                        </th>
                        <th className="px-4 pb-3 text-right font-semibold text-slate-600 dark:text-slate-200">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {channels.map((channel) => (
                        <tr
                          key={channel.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                            {channel.channelId}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {channel.label || (
                              <span className="italic text-slate-500 dark:text-slate-400">—</span>
                            )}
                          </td>
                          <td className="max-w-xs px-4 py-3 text-slate-700 dark:text-slate-200">
                            <div className="truncate">
                              {channel.description || (
                                <span className="italic text-slate-500 dark:text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={channel.isActive ? 'success' : 'secondary'}
                              className={cn(
                                !channel.isActive &&
                                  'text-slate-700 dark:text-slate-100',
                              )}
                            >
                              {channel.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleToggleChannel(
                                    channel.id,
                                    channel.isActive,
                                  )
                                }
                                data-collapsible-ignore="true"
                              >
                                {channel.isActive ? (
                                  <>
                                    <ToggleRight className="mr-1 h-4 w-4" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="mr-1 h-4 w-4" />
                                    Ativar
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleEditChannel(channel.id, channel)
                                }
                                data-collapsible-ignore="true"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteChannel(
                                    channel.id,
                                    channel.channelId,
                                  )
                                }
                                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
                                data-collapsible-ignore="true"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {channels.length === 0 && (
                <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs dark:border-cyan-800/50 dark:bg-cyan-950/40">
                  <p className="mb-1 font-semibold text-cyan-700 dark:text-cyan-100">
                    ℹ️ Modo Permissivo
                  </p>
                  <p className="text-cyan-700 dark:text-cyan-200">
                    Sem canais configurados, todas as mensagens serão
                    processadas.
                  </p>
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },

      // Gateway Logs Card
      {
        id: 'gateway-logs',
        content: (
          <GatewayLogsCard />
        ),
      },
    ],
    [
      data,
      channels,
      messages,
      loading,
      newChannelId,
      newChannelLabel,
      newChannelDesc,
      fetchData,
      handleCreateChannel,
      handleToggleChannel,
      handleEditChannel,
      handleDeleteChannel,
      handleViewMessage,
      getChannelLabel,
      filteredMessages,
      filterChannel,
      filterText,
      filterDateFrom,
      filterDateTo,
      handleClearFilters,
      renderTextWithLinks,
      isSyncing,
      syncResult,
      handleCheckMessages,
      sortColumn,
      sortDirection,
      handleSort,
    ],
  );

  return (
    <>
      <CustomizablePageLayout
        pageId="telegram-gateway"
        title="Telegram Gateway"
        subtitle="Monitoramento MTProto e mensagens persistidas"
        sections={sections}
        defaultColumns={2}
      />

      {/* Message Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-500" />
              Detalhes da Mensagem
            </DialogTitle>
            <DialogDescription>
              Visualização completa da mensagem recebida do Telegram
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4 mt-4">
              {/* Reply To Message */}
              {selectedMessage.metadata?.replyTo?.text && (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border-l-4 border-cyan-500">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Resposta à mensagem #
                    {selectedMessage.metadata.replyTo.messageId}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    "{selectedMessage.metadata.replyTo.text.substring(0, 200)}
                    {selectedMessage.metadata.replyTo.text.length > 200
                      ? '...'
                      : ''}
                    "
                  </p>
                </div>
              )}

              {/* Message Image */}
              {selectedMessage.mediaType === 'photo' && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Imagem
                  </p>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-950">
                    {(() => {
                      // Build photo URL using Gateway API endpoint
                      const photoUrl = selectedMessage.photoUrl || 
                        (selectedMessage.channelId && selectedMessage.messageId 
                          ? `${import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL || 'http://localhost:4010'}/api/telegram-gateway/photos/${selectedMessage.channelId}/${selectedMessage.messageId}`
                          : null);
                      
                      if (photoUrl) {
                        return (
                          <img
                            src={photoUrl}
                            alt="Imagem da mensagem"
                            className="w-full h-auto max-h-96 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove(
                                'hidden',
                              );
                            }}
                          />
                        );
                      }
                      
                      // Fallback if no photo URL can be constructed
                      return (
                        <div className="p-8 text-center">
                          <Image className="h-16 w-16 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Foto do Telegram
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Informações insuficientes para carregar a foto
                          </p>
                        </div>
                      );
                    })()}
                    <div className="hidden p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      Erro ao carregar imagem
                    </div>
                  </div>
                </div>
              )}

              {/* Message Text */}
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {selectedMessage.mediaType === 'photo'
                    ? 'Legenda'
                    : 'Texto da Mensagem'}
                </p>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                    {renderTextWithLinks(
                      selectedMessage.text || selectedMessage.caption,
                    ) || (
                      <span className="text-slate-500 dark:text-slate-400 italic">
                        Sem texto disponível
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Twitter Link Preview */}
              {selectedMessage.metadata?.linkPreview?.type === 'twitter' && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Link do Twitter
                  </p>
                  <TwitterPreview preview={selectedMessage.metadata.linkPreview} />
                </div>
              )}

              {/* YouTube Link Preview */}
              {selectedMessage.metadata?.linkPreview?.type === 'youtube' && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Vídeo do YouTube
                  </p>
                  <YouTubePreview preview={selectedMessage.metadata.linkPreview} />
                </div>
              )}

              {/* Instagram Link Preview */}
              {selectedMessage.metadata?.linkPreview?.type === 'instagram' && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {selectedMessage.metadata.linkPreview.postType === 'reel' ? 'Reel do Instagram' : 'Post do Instagram'}
                  </p>
                  <InstagramPreview preview={selectedMessage.metadata.linkPreview} />
                </div>
              )}

              {/* Additional Fields if available */}
              {selectedMessage.threadId && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Thread ID
                  </p>
                  <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                    {selectedMessage.threadId}
                  </p>
                </div>
              )}

              {selectedMessage.error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                    Erro
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {selectedMessage.error}
                  </p>
                </div>
              )}

              {/* Raw JSON */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  Ver dados brutos (JSON)
                </summary>
                <div className="mt-2 p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <pre className="text-xs text-slate-900 dark:text-slate-100 font-mono">
                    {JSON.stringify(selectedMessage, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TelegramGatewayFinal;
