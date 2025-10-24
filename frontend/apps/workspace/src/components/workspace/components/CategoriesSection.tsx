import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from '@/components/ui/collapsible-card';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { CATEGORY_CONFIG } from '../constants/workspace.constants';

export function CategoriesSection() {
  const items = useWorkspaceStore((state) => state.items);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    items.forEach((item) => {
      stats[item.category] = (stats[item.category] || 0) + 1;
    });
    return stats;
  }, [items]);

  return (
    <CollapsibleCard cardId="workspace-categories">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <CollapsibleCardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Itens por Categoria
          </CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Distribuição de itens nas diferentes categorias
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const count = categoryStats[key] || 0;

              return (
                <Card key={key} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg bg-gray-100 dark:bg-gray-800', config.color)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{config.label}</p>
                          <p className="text-sm text-gray-600">{config.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">itens</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
