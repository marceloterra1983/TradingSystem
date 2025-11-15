import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../../ui/collapsible-card";
import { Button } from "../../ui/button";
import {
  Plus,
  Trash2,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
} from "@/icons";

interface TelegramChannel {
  id: string;
  label: string;
  channel_id: string;
  channel_type: "source" | "destination";
  description?: string;
  status: "active" | "inactive" | "deleted";
  signal_count?: number;
  last_signal?: string;
  created_at: string;
  updated_at: string;
}

interface ChannelFormData {
  label: string;
  channel_id: string;
  channel_type: "source" | "destination";
  description: string;
}

async function fetchChannels(): Promise<TelegramChannel[]> {
  // ✅ Using authenticated helper
  const { tpCapitalApi } = await import("../../../utils/tpCapitalApi");
  const response = await tpCapitalApi.get("/telegram-channels");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.data || [];
}

async function createChannel(channel: ChannelFormData) {
  // ✅ Using authenticated helper
  const { tpCapitalApi } = await import("../../../utils/tpCapitalApi");
  const response = await tpCapitalApi.post("/telegram-channels", channel);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function deleteChannel(id: string) {
  // ✅ Using authenticated helper
  const { tpCapitalApi } = await import("../../../utils/tpCapitalApi");
  const response = await tpCapitalApi.delete(`/telegram-channels/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function reloadChannels() {
  // ✅ Using authenticated helper
  const { tpCapitalApi } = await import("../../../utils/tpCapitalApi");
  const response = await tpCapitalApi.post("/reload-channels");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function TelegramChannelsManager() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<ChannelFormData>({
    label: "",
    channel_id: "",
    channel_type: "source",
    description: "",
  });

  const {
    data: channels = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["telegram-channels"],
    queryFn: fetchChannels,
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-channels"] });
      setIsFormOpen(false);
      setFormData({
        label: "",
        channel_id: "",
        channel_type: "source",
        description: "",
      });
      // Recarregar canais no forwarder
      reloadMutation.mutate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-channels"] });
      // Recarregar canais no forwarder
      reloadMutation.mutate();
    },
  });

  const reloadMutation = useMutation({
    mutationFn: reloadChannels,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string, label: string) => {
    if (window.confirm(`Tem certeza que deseja remover o canal "${label}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <CollapsibleCard cardId="telegram-channels-manager">
      <CollapsibleCardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CollapsibleCardTitle>
              <Settings className="h-5 w-5 inline-block mr-2 text-purple-600 dark:text-purple-400" />
              Gerenciamento de Canais Telegram
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Configure canais de origem para copiar mensagens automaticamente
            </CollapsibleCardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refetch();
                reloadMutation.mutate();
              }}
              className="h-8"
              title="Recarregar canais"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Canal
            </Button>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {/* Form */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Adicionar Novo Canal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Canal *
                </label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: TP Capital, Jonas Esteves"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID do Canal *
                </label>
                <input
                  type="text"
                  required
                  value={formData.channel_id}
                  onChange={(e) =>
                    setFormData({ ...formData, channel_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: -1001234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.channel_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      channel_type: e.target.value as "source" | "destination",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="source">Origem (Source)</option>
                  <option value="destination">Destino (Destination)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Descrição do canal"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar Canal"}
              </Button>
            </div>
          </form>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 dark:text-red-400">
            Erro ao carregar canais
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Settings className="h-12 w-12 opacity-20 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhum canal configurado</p>
            <p className="text-xs text-gray-400 mt-1">
              Adicione um canal para começar a copiar mensagens
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    ID do Canal
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {channels.map((channel) => (
                  <tr
                    key={channel.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {channel.label}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {channel.channel_id}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          channel.channel_type === "source"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        }`}
                      >
                        {channel.channel_type === "source"
                          ? "Origem"
                          : "Destino"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {channel.status === "active" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 inline-block" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 inline-block" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {channel.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(channel.id, channel.label)}
                        disabled={deleteMutation.isPending}
                        className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                        title="Remover canal"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}
