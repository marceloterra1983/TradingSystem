import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../../../../lib/utils';
import { STATUS_CONFIG } from '../constants/workspace.constants';
import type { Item, ItemStatus } from '../types/workspace.types';
import { DraggableItemCard } from './DraggableItemCard';

interface DroppableColumnProps {
  status: ItemStatus;
  items: Item[];
}

export function DroppableColumn({ status, items }: DroppableColumnProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  });

  return (
    <div className="space-y-3">
      {/* Column Header */}
      <div className={cn('rounded-lg border-2 p-3', config.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{config.label}</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{items.length}</span>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto p-2 rounded-lg border-2 border-dashed transition-colors',
          isOver ? 'border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950' : 'border-gray-200 dark:border-gray-700'
        )}
      >
        <SortableContext
          id={status}
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <DraggableItemCard key={item.id} item={item} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
            Arraste itens aqui
          </div>
        )}
      </div>
    </div>
  );
}
