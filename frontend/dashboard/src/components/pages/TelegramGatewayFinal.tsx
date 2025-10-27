import { useEffect, useState, useCallback, useMemo } from 'react';
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
  RotateCcw
} from 'lucide-react';

interface GatewayData {
  health?: {
    status: string;
    telegram: string;
    uptime: number;
  };
  messages?: {
    total: number;
    recent: any[];
  };
  session?: {
    exists: boolean;
    path?: string;
    hash?: string;
    sizeBytes?: number;
    updatedAt?: string;
    ageMs?: number;
  };
}

interface Channel {
  id: string;
  channelId: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
}

export function TelegramGatewayFinal() {
  const [data, setData] = useState<GatewayData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Channel form
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelLabel, setNewChannelLabel] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  
  // Message dialog
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Message filters
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterText, setFilterText] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterLimit, setFilterLimit] = useState<string>('50');
  
  // Message sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{show: boolean; success: boolean; message: string}>({
    show: false,
    success: false,
    message: ''
  });
  
  const handleViewMessage = (msg: any) => {
    setSelectedMessage(msg);
    setIsDialogOpen(true);
  };

  const handleCheckMessages = async () => {
    setIsSyncing(true);
    setSyncResult({ show: false, success: false, message: '' });
    
    try {
      const response = await fetch('/api/telegram-gateway/sync-messages', {
        method: 'POST',
        headers: {
          'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const totalSynced = result.data?.totalMessagesSynced || 0;
        setSyncResult({
          show: true,
          success: true,
          message: totalSynced > 0 
            ? `✅ ${totalSynced} mensagem(ns) recuperada(s) com sucesso!`
            : '✓ Todas as mensagens estão sincronizadas.'
        });
        
        // Recarregar mensagens após sincronização
        if (totalSynced > 0) {
          await fetchData();
        }
      } else {
        setSyncResult({
          show: true,
          success: false,
          message: `❌ Erro: ${result.message || 'Falha ao sincronizar mensagens'}`
        });
      }
    } catch (error) {
      setSyncResult({
        show: true,
        success: false,
        message: '❌ Erro ao conectar com o serviço de sincronização'
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

  const getChannelLabel = useCallback((channelId: string) => {
    const channel = channels.find(ch => ch.channelId === channelId);
    return channel?.label || channelId;
  }, [channels]);

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

  const filteredMessages = useMemo(() => {
    let filtered = messages.length > 0 ? messages : data?.messages?.recent || [];

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
        if (!msg.receivedAt) return false;
        const msgDate = new Date(msg.receivedAt);
        
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

    return filtered;
  }, [messages, data?.messages?.recent, filterChannel, filterText, filterDateFrom, filterDateTo, getChannelLabel]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA' };

      // Build messages URL with filters
      const limit = filterLimit || '50';
      let messagesUrl = `/api/messages?limit=${limit}&sort=desc`;
      if (filterChannel !== 'all') {
        messagesUrl = `/api/messages?channelId=${encodeURIComponent(filterChannel)}&limit=${limit}&sort=desc`;
      }

      const [overviewRes, channelsRes, messagesRes] = await Promise.all([
        fetch('/api/telegram-gateway/overview', { headers }),
        fetch('/api/channels', { headers }),
        fetch(messagesUrl, { headers }),
      ]);

      if (overviewRes.ok) {
        const json = await overviewRes.json();
        setData(json.data);
      }

      if (channelsRes.ok) {
        const json = await channelsRes.json();
        setChannels(json.data || []);
      }

      if (messagesRes.ok) {
        const json = await messagesRes.json();
        setMessages(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterLimit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData, filterChannel]);

  const handleCreateChannel = async () => {
    if (!newChannelId.trim()) {
      alert('Channel ID é obrigatório!');
      return;
    }
    
    try {
      console.log('[CreateChannel] Enviando:', {
        channelId: newChannelId.trim(),
        label: newChannelLabel.trim(),
        description: newChannelDesc.trim(),
      });

      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA',
        },
        body: JSON.stringify({
          channelId: newChannelId.trim(),
          label: newChannelLabel.trim() || undefined,
          description: newChannelDesc.trim() || undefined,
        }),
      });

      const result = await response.json();
      console.log('[CreateChannel] Response:', result);

      if (!response.ok) {
        alert(`Erro ao criar canal: ${result.message || response.statusText}`);
        return;
      }

      if (result.success) {
        alert(`✅ Canal ${newChannelId} adicionado com sucesso!`);
        setNewChannelId('');
        setNewChannelLabel('');
        setNewChannelDesc('');
        await fetchData();
      }
    } catch (err) {
      console.error('[CreateChannel] Error:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Erro ao criar canal: ${message}`);
    }
  };

  const handleToggleChannel = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(`Erro ao alterar status: ${result.message || response.statusText}`);
        return;
      }

      await fetchData();
      alert(`✅ Canal ${isActive ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (err) {
      console.error('Error toggling channel:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Erro: ${message}`);
    }
  };

  const handleDeleteChannel = async (id: string, channelId: string) => {
    if (!confirm(`Remover canal ${channelId}?`)) return;
    
    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: 'DELETE',
        headers: { 'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA' },
      });

      if (!response.ok) {
        const result = await response.json();
        alert(`Erro ao deletar: ${result.message || response.statusText}`);
        return;
      }

      await fetchData();
      alert(`✅ Canal ${channelId} removido com sucesso!`);
    } catch (err) {
      console.error('Error deleting channel:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Erro: ${message}`);
    }
  };

  const handleEditChannel = async (id: string, current: Channel) => {
    const newLabel = prompt('Novo rótulo:', current.label || '');
    if (newLabel === null) return;
    
    const newDesc = prompt('Nova descrição:', current.description || '');
    if (newDesc === null) return;

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Token': 'gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA',
        },
        body: JSON.stringify({
          label: newLabel || undefined,
          description: newDesc || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(`Erro ao editar: ${result.message || response.statusText}`);
        return;
      }

      await fetchData();
      alert('✅ Canal atualizado com sucesso!');
    } catch (err) {
      console.error('Error editing channel:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Erro: ${message}`);
    }
  };

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

  const sections = useMemo(() => [
    // Status Overview Card
    {
      id: 'status-overview',
      content: (
        <CollapsibleCard cardId="telegram-gateway-status" defaultCollapsed={false}>
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
                className="border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Gateway */}
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Gateway</span>
                  {data?.health?.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-100">{data?.health?.status || 'unknown'}</p>
                <p className="text-xs text-slate-500 mt-1">Uptime: {formatUptime(data?.health?.uptime)}</p>
              </div>

              {/* Telegram */}
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Telegram</span>
                  <Wifi className={`h-5 w-5 ${data?.health?.telegram === 'connected' ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <Badge className={data?.health?.telegram === 'connected' 
                  ? 'bg-emerald-600 hover:bg-emerald-600' 
                  : 'bg-red-600 hover:bg-red-600'}>
                  {data?.health?.telegram === 'connected' ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>

              {/* Messages */}
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Mensagens</span>
                  <Database className="h-5 w-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-slate-100">{data?.messages?.total || 0}</p>
                <p className="text-xs text-slate-500 mt-1">TimescaleDB</p>
              </div>

              {/* Session */}
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Sessão</span>
                  <ShieldCheck className={`h-5 w-5 ${data?.session?.exists ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <Badge className={data?.session?.exists 
                  ? 'bg-emerald-600 hover:bg-emerald-600' 
                  : 'bg-slate-700 hover:bg-slate-700'}>
                  {data?.session?.exists ? 'Ativa' : 'Ausente'}
                </Badge>
              </div>
            </div>

            {/* Alert */}
            {data && (data.health?.status !== 'healthy' || data.health?.telegram !== 'connected' || !data.session?.exists) && (
              <div className="mt-4 rounded-lg bg-amber-950/50 border border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Sistema não está completamente operacional</p>
                    <ul className="space-y-1 text-sm text-amber-200">
                      {data.health?.status !== 'healthy' && <li>• Gateway MTProto offline (porta 4006)</li>}
                      {data.health?.telegram !== 'connected' && <li>• Telegram desconectado</li>}
                      {!data.session?.exists && <li>• Sessão ausente - executar authenticate-interactive.sh</li>}
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
        <CollapsibleCard cardId="telegram-gateway-messages" defaultCollapsed={false}>
          <CollapsibleCardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              <CollapsibleCardTitle>
                Mensagens ({filteredMessages.length} de {messages.length > 0 ? messages.length : data?.messages?.total || 0})
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
                className="border-cyan-700 hover:bg-cyan-900/30 text-cyan-400"
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
                <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  syncResult.success 
                    ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300' 
                    : 'bg-red-950/50 border border-red-800 text-red-300'
                }`}>
                  {syncResult.message}
                </div>
              )}
            </div>

            {/* Filters Section */}
            <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-300">Filtros</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Canal Filter */}
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100" data-collapsible-ignore="true">
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
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100" data-collapsible-ignore="true">
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
                    className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    data-collapsible-ignore="true"
                  />
                </div>

                {/* Date From */}
                <Input
                  type="date"
                  placeholder="Data inicial"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  data-collapsible-ignore="true"
                />

                {/* Date To */}
                <Input
                  type="date"
                  placeholder="Data final"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  data-collapsible-ignore="true"
                />

                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="border-slate-700 hover:bg-slate-800 text-slate-300"
                  data-collapsible-ignore="true"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
              
              {/* Active Filters Info */}
              {(filterChannel !== 'all' || filterText || filterDateFrom || filterDateTo || filterLimit !== '50') && (
                <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-400">
                  <span>Filtros ativos:</span>
                  {filterChannel !== 'all' && (
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                      Canal: {getChannelLabel(filterChannel)}
                    </Badge>
                  )}
                  {filterLimit !== '50' && (
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                      Limite: {filterLimit} registros
                    </Badge>
                  )}
                  {filterText && (
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                      Texto: "{filterText}"
                    </Badge>
                  )}
                  {filterDateFrom && (
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                      De: {new Date(filterDateFrom).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                  {filterDateTo && (
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                      Até: {new Date(filterDateTo).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {loading && messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Carregando mensagens...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-sm mt-1">
                  {(filterChannel !== 'all' || filterText || filterDateFrom || filterDateTo)
                    ? 'Nenhuma mensagem corresponde aos filtros aplicados'
                    : data?.health?.telegram === 'connected'
                    ? 'Aguardando mensagens dos canais...'
                    : 'Conecte o Telegram primeiro'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-700">
                    <tr className="text-left">
                      <th className="pb-3 px-4 font-semibold text-slate-300">Recebida</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300">Canal</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300 text-center">Ações</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300">Texto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredMessages.map((msg: any) => (
                      <tr key={msg.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{formatTime(msg.receivedAt)}</span>
                            <span className="text-xs text-slate-500">{formatDateOnly(msg.receivedAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-200">
                          <span className="font-medium">{getChannelLabel(msg.channelId)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMessage(msg)}
                            className="border-slate-700 hover:bg-slate-800 text-slate-300"
                            data-collapsible-ignore="true"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          <div className="flex items-start gap-2">
                            {msg.mediaType === 'photo' && (
                              <>
                                <Image className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <span className="sr-only">Contém imagem</span>
                              </>
                            )}
                            <div className="line-clamp-2 max-w-md text-sm">
                              {renderTextWithLinks(msg.text || msg.caption) || <span className="text-slate-500 italic">sem texto</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleCardContent>
        </CollapsibleCard>
      ),
    },

    // Session Card
    {
      id: 'session-info',
      content: (
        <CollapsibleCard cardId="telegram-gateway-session" defaultCollapsed={false}>
          <CollapsibleCardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <CollapsibleCardTitle>Sessão MTProto</CollapsibleCardTitle>
            </div>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            {data?.session ? (
              <div className="space-y-4">
                <div>
                  <Badge className={data.session.exists 
                    ? 'bg-emerald-600 hover:bg-emerald-600' 
                    : 'bg-slate-700 hover:bg-slate-700'}>
                    {data.session.exists ? 'Sessão Ativa' : 'Sessão Ausente'}
                  </Badge>
                </div>

                {data.session.exists ? (
                  <div className="space-y-3 text-sm">
                    {data.session.hash && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-slate-500">Hash:</span>
                        <code className="text-xs font-mono text-cyan-400">{data.session.hash}</code>
                      </div>
                    )}
                    {data.session.updatedAt && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-slate-500">Atualizado:</span>
                        <span>{formatDate(data.session.updatedAt)}</span>
                      </div>
                    )}
                    {data.session.sizeBytes && (
                      <div className="text-xs text-slate-500">
                        Tamanho: {data.session.sizeBytes} bytes
                      </div>
                    )}

                    <div className="mt-4 rounded-lg bg-emerald-950/50 border border-emerald-800 p-3">
                      <p className="text-sm font-semibold text-emerald-100">✓ Autenticado</p>
                      <p className="text-xs text-emerald-200 mt-1">Conexão ativa com Telegram</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-950/50 border border-amber-800 p-4">
                    <p className="font-semibold text-amber-100 mb-2">Sessão não encontrada</p>
                    <p className="text-sm text-amber-200 mb-3">Execute:</p>
                    <code className="block bg-black/50 rounded px-3 py-2 text-xs text-amber-100">
                      cd apps/telegram-gateway && ./authenticate-interactive.sh
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">Sem dados</p>
            )}
          </CollapsibleCardContent>
        </CollapsibleCard>
      ),
    },

    // Channels CRUD Table
    {
      id: 'channels-crud',
      content: (
        <CollapsibleCard cardId="telegram-gateway-channels" defaultCollapsed={false}>
          <CollapsibleCardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-purple-400" />
              <CollapsibleCardTitle>Canais Monitorados</CollapsibleCardTitle>
              <Badge variant="outline" className="border-slate-700 text-slate-300 ml-2">
                {channels.filter(c => c.isActive).length} / {channels.length}
              </Badge>
            </div>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            {/* Add Form */}
            <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm font-semibold text-slate-200 mb-3">Adicionar Novo Canal</p>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="Channel ID (ex: -1001234567890)"
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  data-collapsible-ignore="true"
                />
                <Input
                  placeholder="Rótulo (opcional)"
                  value={newChannelLabel}
                  onChange={(e) => setNewChannelLabel(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  data-collapsible-ignore="true"
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
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
              <div className="text-center py-12 text-slate-400">
                <Radio className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum canal configurado</p>
                <p className="text-sm mt-1">Modo permissivo: todas mensagens processadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-700">
                    <tr className="text-left">
                      <th className="pb-3 px-4 font-semibold text-slate-300">Channel ID</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300">Rótulo</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300">Descrição</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300">Status</th>
                      <th className="pb-3 px-4 font-semibold text-slate-300 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {channels.map((channel) => (
                      <tr key={channel.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-cyan-400">
                          {channel.channelId}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {channel.label || <span className="text-slate-500 italic">—</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs">
                          <div className="truncate">
                            {channel.description || <span className="text-slate-500 italic">—</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={channel.isActive 
                            ? 'bg-emerald-600 hover:bg-emerald-600' 
                            : 'bg-slate-700 hover:bg-slate-700'}>
                            {channel.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleChannel(channel.id, channel.isActive)}
                              className="border-slate-700 hover:bg-slate-800 text-slate-300"
                              data-collapsible-ignore="true"
                            >
                              {channel.isActive ? (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-1" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-1" />
                                  Ativar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditChannel(channel.id, channel)}
                              className="border-slate-700 hover:bg-slate-800"
                              data-collapsible-ignore="true"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteChannel(channel.id, channel.channelId)}
                              className="border-red-800 hover:bg-red-950 text-red-400"
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
              <div className="mt-4 rounded-lg bg-cyan-950/30 border border-cyan-800/50 p-3 text-xs">
                <p className="font-semibold text-cyan-100 mb-1">ℹ️ Modo Permissivo</p>
                <p className="text-cyan-200">
                  Sem canais configurados, todas as mensagens serão processadas.
                </p>
              </div>
            )}
          </CollapsibleCardContent>
        </CollapsibleCard>
      ),
    },
  ], [data, channels, messages, loading, newChannelId, newChannelLabel, newChannelDesc, fetchData, handleCreateChannel, handleToggleChannel, handleEditChannel, handleDeleteChannel, handleViewMessage, getChannelLabel, filteredMessages, filterChannel, filterText, filterDateFrom, filterDateTo, handleClearFilters, renderTextWithLinks, isSyncing, syncResult, handleCheckMessages]);

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
              {/* Message Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Canal</p>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{getChannelLabel(selectedMessage.channelId)}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-500">{selectedMessage.channelId}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Message ID</p>
                  <p className="font-mono text-sm text-slate-900 dark:text-slate-100">#{selectedMessage.messageId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Status</p>
                  <Badge className={
                    selectedMessage.status === 'received' ? 'bg-cyan-600 hover:bg-cyan-600' :
                    selectedMessage.status === 'published' ? 'bg-emerald-600 hover:bg-emerald-600' :
                    selectedMessage.status === 'failed' ? 'bg-red-600 hover:bg-red-600' :
                    selectedMessage.status === 'queued' ? 'bg-amber-600 hover:bg-amber-600' :
                    'bg-slate-700 hover:bg-slate-700'
                  }>
                    {selectedMessage.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Fonte</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedMessage.source || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Recebida em</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{formatDate(selectedMessage.receivedAt)}</p>
                </div>
                {selectedMessage.processedAt && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Processada em</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{formatDate(selectedMessage.processedAt)}</p>
                  </div>
                )}
              </div>
              
              {/* Reply To Message */}
              {selectedMessage.metadata?.replyTo?.text && (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border-l-4 border-cyan-500">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Resposta à mensagem #{selectedMessage.metadata.replyTo.messageId}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    "{selectedMessage.metadata.replyTo.text.substring(0, 200)}{selectedMessage.metadata.replyTo.text.length > 200 ? '...' : ''}"
                  </p>
                </div>
              )}

              {/* Message Image */}
              {selectedMessage.mediaType === 'photo' && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Imagem</p>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img
                      src={`/api/telegram-photo/${selectedMessage.channelId}/${selectedMessage.messageId}`}
                      alt="Imagem da mensagem"
                      className="w-full h-auto max-h-96 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      Erro ao carregar imagem
                    </div>
                  </div>
                </div>
              )}

              {/* Message Text */}
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {selectedMessage.mediaType === 'photo' ? 'Legenda' : 'Texto da Mensagem'}
                </p>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                    {renderTextWithLinks(selectedMessage.text || selectedMessage.caption) || (
                      <span className="text-slate-500 dark:text-slate-400 italic">Sem texto disponível</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Additional Fields if available */}
              {selectedMessage.threadId && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Thread ID</p>
                  <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{selectedMessage.threadId}</p>
                </div>
              )}
              
              {selectedMessage.error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Erro</p>
                  <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">{selectedMessage.error}</p>
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
