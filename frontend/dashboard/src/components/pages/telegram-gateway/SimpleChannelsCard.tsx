import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Radio, Plus, Trash2, ToggleLeft, ToggleRight } from "@/icons";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { useState } from "react";

interface Channel {
  id: string;
  channelId: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
}

interface SimpleChannelsCardProps {
  channels: Channel[];
  isLoading: boolean;
  onCreate: (data: {
    channelId: string;
    label?: string;
    description?: string;
  }) => Promise<void>;
  onToggle: (id: string, currentIsActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SimpleChannelsCard({
  channels,
  isLoading,
  onCreate,
  onToggle,
  onDelete,
}: SimpleChannelsCardProps) {
  const [channelId, setChannelId] = useState("");
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!channelId.trim()) return;

    setIsSaving(true);
    try {
      await onCreate({
        channelId: channelId.trim(),
        label: label.trim() || undefined,
      });
      setChannelId("");
      setLabel("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string, currentIsActive: boolean) => {
    setTogglingId(id);
    try {
      await onToggle(id, currentIsActive);
    } catch (error) {
      console.error("Failed to toggle channel:", error);
      alert(`Erro ao ${currentIsActive ? "desativar" : "ativar"} canal`);
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = channels.filter((c) => c.isActive).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            <CardTitle>Canais Monitorados</CardTitle>
          </div>
          <Badge variant="outline">
            {activeCount} ativo{activeCount !== 1 ? "s" : ""} /{" "}
            {channels.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Channel Form */}
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Adicionar novo canal</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Channel ID (ex: -1001234567890)"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <Input
              placeholder="Rótulo (opcional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!channelId.trim() || isSaving}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSaving ? "Adicionando..." : "Adicionar Canal"}
          </Button>
        </div>

        {/* Channels List */}
        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        ) : channels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum canal configurado</p>
            <p className="text-xs mt-1">
              Modo permissivo: todas as mensagens serão processadas
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono">
                      {channel.channelId}
                    </code>
                    {channel.isActive ? (
                      <Badge variant="default" className="bg-emerald-500">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </div>
                  {channel.label && (
                    <p className="text-sm text-muted-foreground">
                      {channel.label}
                    </p>
                  )}
                  {channel.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {channel.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(channel.id, channel.isActive)}
                    disabled={togglingId === channel.id}
                  >
                    {togglingId === channel.id ? (
                      <>
                        <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {channel.isActive ? "Desativando..." : "Ativando..."}
                      </>
                    ) : channel.isActive ? (
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
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remover canal ${channel.channelId}?`)) {
                        onDelete(channel.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Note */}
        {channels.length === 0 && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">ℹ️ Modo Permissivo Ativo</p>
            <p>
              Sem canais configurados, o gateway processará mensagens de TODOS
              os canais. Para maior segurança, adicione apenas os canais
              autorizados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
