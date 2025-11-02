import { useState } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  useCreateTelegramGatewayChannel,
  useDeleteTelegramGatewayChannel,
  useTelegramGatewayChannels,
  useUpdateTelegramGatewayChannel,
} from '../../../hooks/useTelegramGateway';
import { Badge } from '../../ui/badge';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import {
  Loader2,
  PlusCircle,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

export function ChannelsManagerCard() {
  const { data: channels = [], isLoading } = useTelegramGatewayChannels();
  const createMutation = useCreateTelegramGatewayChannel();
  const updateMutation = useUpdateTelegramGatewayChannel();
  const deleteMutation = useDeleteTelegramGatewayChannel();

  const [channelId, setChannelId] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!channelId.trim()) return;
    await createMutation.mutateAsync({
      channelId: channelId.trim(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
    setChannelId('');
    setLabel('');
    setDescription('');
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateMutation.mutateAsync({
      id,
      isActive: !isActive,
    });
  };

  const handleEdit = async (
    id: string,
    current: {
      label?: string | null;
      description?: string | null;
      channelId: string;
    },
  ) => {
    const newLabel =
      typeof window !== 'undefined'
        ? window.prompt('Descrição curta (opcional):', current.label ?? '')
        : (current.label ?? '');
    if (newLabel === null) return;

    const newDescription =
      typeof window !== 'undefined'
        ? window.prompt('Observações (opcional):', current.description ?? '')
        : (current.description ?? '');
    if (newDescription === null) return;

    await updateMutation.mutateAsync({
      id,
      label: newLabel || undefined,
      description: newDescription || undefined,
    });
  };

  const handleDelete = async (id: string, channel: string) => {
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            `Remover canal ${channel}? As mensagens deixarão de ser processadas.`,
          );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <CollapsibleCard cardId="telegram-gateway-channels">
      <CollapsibleCardHeader className="border-b border-slate-200/80 dark:border-slate-800/80">
        <CollapsibleCardTitle className="flex items-center gap-2 text-lg font-semibold">
          <PlusCircle className="h-5 w-5 text-purple-500" />
          Canais monitorados
        </CollapsibleCardTitle>
        <CollapsibleCardDescription>
          Registre os canais Telegram autorizados para coleta. Quando houver
          canais ativos, somente eles serão processados.
        </CollapsibleCardDescription>
      </CollapsibleCardHeader>
      <CollapsibleCardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Channel ID
            </label>
            <Input
              placeholder="Ex: -1001234567890"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Rótulo
            </label>
            <Input
              placeholder="Nome curto (opcional)"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Descrição
            </label>
            <Input
              placeholder="Observações (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button
              onClick={() => void handleCreate()}
              disabled={!channelId.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Save className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar canal
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Rótulo</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    Carregando canais...
                  </td>
                </tr>
              ) : channels.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    Nenhum canal cadastrado. Enquanto a lista estiver vazia, o
                    gateway processará todos os canais recebidos.
                  </td>
                </tr>
              ) : (
                channels.map((channel) => (
                  <tr
                    key={channel.id}
                    className="bg-white dark:bg-slate-950/60"
                  >
                    <td className="px-3 py-3 align-top text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {channel.channelId}
                    </td>
                    <td className="px-3 py-3 align-top text-sm text-slate-600 dark:text-slate-300">
                      {channel.label || '—'}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                      {channel.description || '—'}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge
                        variant={channel.isActive ? 'default' : 'outline'}
                        className={
                          channel.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : ''
                        }
                      >
                        {channel.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleToggle(channel.id, channel.isActive)
                          }
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : channel.isActive ? (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleEdit(channel.id, {
                              channelId: channel.channelId,
                              description: channel.description,
                              label: channel.label,
                            })
                          }
                          disabled={updateMutation.isPending}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            void handleDelete(channel.id, channel.channelId)
                          }
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
