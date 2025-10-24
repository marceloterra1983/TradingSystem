import { useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { DroppableColumn } from './DroppableColumn';
import { DraggableItemCard } from './DraggableItemCard';
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from '@/components/ui/collapsible-card';
import { BarChart3 } from 'lucide-react';
import { STATUS_CONFIG } from '../constants/workspace.constants';
import type { ItemStatus, Item } from '../types/workspace.types';

export function StatusBoardSection() {
  const items = useWorkspaceStore((state) => state.items);
  const loading = useWorkspaceStore((state) => state.loading);
  const { sensors, activeItem, handleDragStart, handleDragEnd } = useItemDragDrop();

  // Group items by status
  const statusGroups = useMemo(() => {
    const groups: Record<ItemStatus, Item[]> = {
      new: [],
      review: [],
      'in-progress': [],
      completed: [],
      rejected: [],
    };

    items.forEach((item) => {
      if (groups[item.status]) {
        groups[item.status].push(item);
      }
    });

    return groups;
  }, [items]);

  if (loading) {
    return (
      <CollapsibleCard cardId="workspace-status-board">
        <CollapsibleCardHeader>
          <div className="flex-1">
            <CollapsibleCardTitle>Kanban dos Itens</CollapsibleCardTitle>
            <CollapsibleCardDescription>Carregando...</CollapsibleCardDescription>
          </div>
        </CollapsibleCardHeader>
      </CollapsibleCard>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CollapsibleCard cardId="workspace-status-board">
        <CollapsibleCardHeader>
          <div className="flex-1">
            <CollapsibleCardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Kanban dos Itens
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Arraste itens entre colunas para alterar o status
            </CollapsibleCardDescription>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {(Object.keys(STATUS_CONFIG) as ItemStatus[]).map((statusKey) => (
              <DroppableColumn
                key={statusKey}
                status={statusKey}
                items={statusGroups[statusKey] || []}
              />
            ))}
          </div>
        </CollapsibleCardContent>
      </CollapsibleCard>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? <DraggableItemCard item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
