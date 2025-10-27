import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '../../../ui/card';
import { Eye } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from '../constants/workspace.constants';
import type { Item } from '../types/workspace.types';
import { ViewItemDialog } from './ViewItemDialog';

interface DraggableItemCardProps {
  item: Item;
}

interface WorkspaceItemCardContentProps {
  item: Item;
  onView?: () => void;
  showViewButton?: boolean;
  className?: string;
}

function WorkspaceItemCardContent({
  item,
  onView,
  showViewButton = true,
  className,
}: WorkspaceItemCardContentProps) {
  const CategoryIcon = CATEGORY_CONFIG[item.category].icon;
  const PriorityIcon = PRIORITY_CONFIG[item.priority].icon;

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        CATEGORY_CONFIG[item.category].bgColor,
        className,
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <CategoryIcon
            className={cn(
              'h-4 w-4 mt-0.5 flex-shrink-0',
              CATEGORY_CONFIG[item.category].color,
            )}
          />
          <p className="text-sm font-medium line-clamp-2 flex-1 text-gray-900 dark:text-gray-100">
            {item.title}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              PRIORITY_CONFIG[item.priority].color,
            )}
          >
            <PriorityIcon className="h-3 w-3" />
            {PRIORITY_CONFIG[item.priority].label}
          </span>
          {showViewButton ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Visualizar"
              type="button"
            >
              <Eye className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableItemCard({ item }: DraggableItemCardProps) {
  const [showView, setShowView] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      status: item.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <WorkspaceItemCardContent
          item={item}
          onView={() => setShowView(true)}
          className="cursor-move"
        />
      </div>

      {showView && <ViewItemDialog item={item} open={showView} onOpenChange={setShowView} />}
    </>
  );
}

export function WorkspaceItemDragPreview({ item }: { item: Item }) {
  return <WorkspaceItemCardContent item={item} showViewButton={false} className="shadow-lg" />;
}
