import { useMemo } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { useItemDragDrop } from "../hooks/useItemDragDrop";
import { DroppableColumn } from "./DroppableColumn";
import { WorkspaceItemDragPreview } from "./DraggableItemCard";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../../../ui/collapsible-card";
import { BarChart3, RefreshCw } from '@/icons';
import { STATUS_CONFIG } from "../constants/workspace.constants";
import type { ItemStatus, Item } from "../types/workspace.types";

export function StatusBoardSection() {
  const items = useWorkspaceStore((state) => state.items);
  const loading = useWorkspaceStore((state) => state.loading);
  const syncing = useWorkspaceStore((state) => state.syncing);
  const { sensors, activeItem, handleDragStart, handleDragEnd } =
    useItemDragDrop();

  // Group items by status
  const statusGroups = useMemo(() => {
    const groups: Record<ItemStatus, Item[]> = {
      new: [],
      review: [],
      "in-progress": [],
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

  if (loading && items.length === 0) {
    return (
      <CollapsibleCard cardId="workspace-status-board">
        <CollapsibleCardHeader>
          <div className="flex-1">
            <CollapsibleCardTitle>Kanban dos Itens</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Carregando...
            </CollapsibleCardDescription>
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
          {syncing && (
            <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-300">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Sincronizando
            </div>
          )}
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
        {activeItem ? <WorkspaceItemDragPreview item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
