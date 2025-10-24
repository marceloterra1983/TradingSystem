import { useState, useMemo } from 'react';
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from '../../../ui/collapsible-card';
import { Button } from '../../../ui/button';
import { Lightbulb, Plus, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { useItemFilters } from '../hooks/useItemFilters';
import { AddItemDialog } from './AddItemDialog';
import { ItemActions } from './ItemActions';
import { cn } from '../../../../lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from '../constants/workspace.constants';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { formatTimestampShort } from '../../../../utils/dateUtils';

export function WorkspaceListSection() {
  const loading = useWorkspaceStore((state) => state.loading);
  const error = useWorkspaceStore((state) => state.error);
  const lastSyncedAt = useWorkspaceStore((state) => state.lastSyncedAt);
  const { filteredItems } = useItemFilters(); // searchTerm and setters are not used here, but in a filter component
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const usingFallbackData = !!error; 

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredItems]);

  return (
    <CollapsibleCard cardId="workspace-list">
      <CollapsibleCardHeader>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <CollapsibleCardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Workspace
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Gerencie e busque itens do workspace para melhorar o sistema
            </CollapsibleCardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border',
                loading
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
                  : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
              )}
            >
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              <span>
                {loading
                  ? 'Sincronizando...'
                  : lastSyncedAt
                    ? `Atualizado em ${formatTimestampShort(lastSyncedAt)}`
                    : 'Aguardando sincronização'}
              </span>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={usingFallbackData}
              className="h-10 w-10 p-0"
              title="Adicionar Item"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-6">
          {usingFallbackData && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">API Indisponível</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Não foi possível conectar ao servidor da API. Ações de edição estão desativadas.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Título</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Categoria</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Prioridade</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Tags</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Data</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                      Carregando...
                    </td>
                  </tr>
                ) : sortedItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                      <Lightbulb className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p>Nenhum item cadastrado ainda.</p>
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const StatusIcon = STATUS_CONFIG[item.status].icon;
                    const PriorityIcon = PRIORITY_CONFIG[item.priority].icon;
                    const CategoryIcon = CATEGORY_CONFIG[item.category].icon;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className={cn('h-4 w-4', CATEGORY_CONFIG[item.category].color)} />
                            <span className="text-gray-700 dark:text-gray-300 text-xs">
                              {CATEGORY_CONFIG[item.category].label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', STATUS_CONFIG[item.status].color)}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[item.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', PRIORITY_CONFIG[item.priority].color)}>
                            <PriorityIcon className="h-3 w-3" />
                            {PRIORITY_CONFIG[item.priority].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <ItemActions item={item} usingFallbackData={usingFallbackData} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleCardContent>
      {showAddDialog && <AddItemDialog open={showAddDialog} onOpenChange={setShowAddDialog} />}
    </CollapsibleCard>
  );
}
