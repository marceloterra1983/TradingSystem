import { useState, useCallback, useMemo } from 'react';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { ItemStatus } from '../types/workspace.types';

// A helper function to check if a string is a valid ItemStatus
function isItemStatus(value: unknown): value is ItemStatus {
  return ['new', 'review', 'in-progress', 'completed', 'rejected'].includes(value as ItemStatus);
}

export function useItemDragDrop() {
  const items = useWorkspaceStore((state) => state.items);
  const updateItem = useWorkspaceStore((state) => state.updateItem);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px drag required to start
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) {
        return;
      }
      
      const activeItem = items.find((i) => i.id === active.id);
      const newStatus = over.id;

      if (activeItem && isItemStatus(newStatus) && activeItem.status !== newStatus) {
        void updateItem(activeItem.id, { status: newStatus });
      }
    },
    [items, updateItem]
  );

  const activeItem = useMemo(() => items.find(i => i.id === activeId), [items, activeId]);

  return {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragEnd,
  };
}
