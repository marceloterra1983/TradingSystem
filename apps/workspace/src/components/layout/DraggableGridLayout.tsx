import { ReactNode, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import type { ColumnCount } from '@/hooks/useCustomLayout';

/**
 * Draggable Grid Layout Component
 * Provides drag-and-drop functionality for organizing components across columns
 */

interface DraggableGridLayoutProps {
  /** Number of columns */
  columns: ColumnCount;
  /** Components mapped to their column indices */
  components: {
    id: string;
    columnIndex: number;
    content: ReactNode;
  }[];
  /** Callback when component is moved to a different column */
  onComponentMove: (componentId: string, targetColumn: number, targetIndex?: number) => void;
  /** Callback when components are reordered within the same column */
  onReorderWithinColumn: (columnIndex: number, oldIndex: number, newIndex: number) => void;
}

export function DraggableGridLayout({
  columns,
  components,
  onComponentMove,
  onReorderWithinColumn,
}: DraggableGridLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Drag sensors with better activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Group components by column for faster lookup and ordering
  const columnGroups = useMemo(() => {
    const groups: Record<number, typeof components> = {};
    for (let i = 0; i < columns; i++) {
      groups[i] = [];
    }
    components.forEach((component) => {
      const columnIndex = Math.max(0, Math.min(component.columnIndex, columns - 1));
      if (!groups[columnIndex]) {
        groups[columnIndex] = [];
      }
      groups[columnIndex].push(component);
    });
    return groups;
  }, [columns, components]);

  const parseColumnIndex = (id?: string | null): number | null => {
    if (!id) {
      return null;
    }
    const match = id.match(/column-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const activeId = active.id as string;
    const activeContainerId = active.data.current?.sortable?.containerId as string | undefined;
    const overContainerId =
      (over.data.current?.sortable?.containerId as string | undefined) || (over.id as string);

    const fallbackSourceColumn = components.find((c) => c.id === activeId)?.columnIndex ?? 0;
    const sourceColumnIndex = Math.max(
      0,
      Math.min(parseColumnIndex(activeContainerId) ?? fallbackSourceColumn, columns - 1)
    );
    const targetColumnIndexRaw = parseColumnIndex(overContainerId);

    if (targetColumnIndexRaw === null) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const targetColumnIndex = Math.max(0, Math.min(targetColumnIndexRaw, columns - 1));

    const sourceItems = columnGroups[sourceColumnIndex] ?? [];
    const sourceIndex =
      typeof active.data.current?.sortable?.index === 'number'
        ? active.data.current?.sortable?.index
        : sourceItems.findIndex((item) => item.id === activeId);

    if (sourceIndex === -1) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const isSameColumn = sourceColumnIndex === targetColumnIndex;

    if (isSameColumn) {
      const overIndex =
        typeof over.data.current?.sortable?.index === 'number'
          ? over.data.current?.sortable?.index
          : sourceItems.length - 1;

      if (overIndex !== sourceIndex) {
        onReorderWithinColumn(sourceColumnIndex, sourceIndex, overIndex);
      }
    } else {
      const targetItems = columnGroups[targetColumnIndex] ?? [];
      const overIndex =
        typeof over.data.current?.sortable?.index === 'number'
          ? over.data.current?.sortable?.index
          : targetItems.length;

      onComponentMove(activeId, targetColumnIndex, overIndex);
    }

    setActiveId(null);
    setOverId(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Find active component for drag overlay
  const activeComponent = components.find((c) => c.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className={cn(
          'grid gap-1',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-1 lg:grid-cols-2',
          columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {Array.from({ length: columns }, (_, columnIndex) => (
          <DroppableColumn
            key={columnIndex}
            columnIndex={columnIndex}
            components={columnGroups[columnIndex] || []}
            isDragging={activeId !== null}
            isOver={overId === `column-${columnIndex}`}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeComponent ? (
          <div className="opacity-90 shadow-2xl scale-105 rotate-1">
            {activeComponent.content}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Droppable Column
 */
interface DroppableColumnProps {
  columnIndex: number;
  components: {
    id: string;
    columnIndex: number;
    content: ReactNode;
  }[];
  isDragging: boolean;
  isOver: boolean;
}

function DroppableColumn({ columnIndex, components, isDragging, isOver }: DroppableColumnProps) {
  // Use SortableContext for the column
  const items = components.map((c) => c.id);

  // Make the column itself droppable
  const { setNodeRef } = useDroppable({
    id: `column-${columnIndex}`,
  });

  return (
    <SortableContext
      id={`column-${columnIndex}`}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        data-column={columnIndex}
        className={cn(
          'min-h-[400px] rounded-lg transition-all p-3 relative',
          isDragging && 'border-2 border-dashed',
          isOver
            ? 'border-cyan-500 bg-cyan-50/50 dark:border-cyan-400 dark:bg-cyan-950/20 scale-[1.02]'
            : isDragging
            ? 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30'
            : 'border-transparent'
        )}
      >
        {/* Column Number Indicator */}
        {isDragging && (
          <div className="absolute -top-2 -left-2 w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-30">
            {columnIndex + 1}
          </div>
        )}

        <div className="space-y-4">
          {components.map((component, index) => (
            <SortableItem
              key={component.id}
              id={component.id}
              index={index}
              showPositions={isDragging}
            >
              {component.content}
            </SortableItem>
          ))}

          {components.length === 0 && isDragging && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <div className="text-3xl mb-2">⬇️</div>
                <div className="font-medium">Solte aqui</div>
                <div className="text-xs mt-1">Posição 1</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SortableContext>
  );
}

/**
 * Sortable Item Wrapper
 */
interface SortableItemProps {
  id: string;
  index: number;
  showPositions: boolean;
  children: ReactNode;
}

function SortableItem({ id, index, showPositions, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isOver && !isDragging && 'scale-[1.02]'
      )}
    >
      {/* Drag Handle - Left side vertical bar */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg',
          'bg-gray-300 dark:bg-gray-600',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          'cursor-grab active:cursor-grabbing',
          'hover:bg-cyan-500 hover:w-2',
          'z-40'
        )}
        title="Arrastar para mover"
      />

      {/* Position Number Indicator */}
      {showPositions && !isDragging && (
        <div className="absolute -left-2 -top-2 w-7 h-7 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg z-30 border-2 border-white dark:border-gray-900">
          {index + 1}
        </div>
      )}

      {/* Component Content */}
      <div
        className={cn(
          'transition-all duration-200',
          isDragging && 'ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-gray-900 shadow-2xl',
          isOver && !isDragging && 'ring-2 ring-cyan-300 ring-offset-1 dark:ring-cyan-600'
        )}
      >
        {children}
      </div>

      {/* Drop Indicator - Line and Position Number */}
      {isOver && !isDragging && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute -top-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 rounded-full shadow-lg" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Soltar na posição {index + 1}
          </div>
        </div>
      )}
    </div>
  );
}
