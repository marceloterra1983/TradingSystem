import { useState, useCallback, useMemo } from "react";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { ItemStatus } from "../types/workspace.types";

const STATUS_VALUES: ItemStatus[] = [
  "new",
  "review",
  "in-progress",
  "completed",
  "rejected",
];

// Check if a value corresponds to a valid ItemStatus
function isItemStatus(value: unknown): value is ItemStatus {
  return (
    typeof value === "string" && STATUS_VALUES.includes(value as ItemStatus)
  );
}

function getStatusFromOver(over: DragEndEvent["over"]): ItemStatus | null {
  if (!over) {
    return null;
  }

  const sortableContainerId = over.data?.current?.sortable?.containerId;
  if (isItemStatus(sortableContainerId)) {
    return sortableContainerId;
  }

  const sortableDataStatus = over.data?.current?.sortable?.data?.current
    ?.status as unknown;
  if (isItemStatus(sortableDataStatus)) {
    return sortableDataStatus;
  }

  const droppableStatus = over.data?.current?.status as unknown;
  if (isItemStatus(droppableStatus)) {
    return droppableStatus;
  }

  const overId = over.id;
  if (isItemStatus(overId)) {
    return overId;
  }

  return null;
}

export function useItemDragDrop() {
  const items = useWorkspaceStore((state) => state.items);
  const updateItem = useWorkspaceStore((state) => state.updateItem);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag movement to start
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      const targetStatus = getStatusFromOver(over);
      if (!targetStatus) {
        return;
      }

      const activeItem = items.find((item) => item.id === active.id);
      if (!activeItem || activeItem.status === targetStatus) {
        return;
      }

      void updateItem(activeItem.id, { status: targetStatus });
    },
    [items, updateItem],
  );

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [items, activeId],
  );

  return {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragEnd,
  };
}
