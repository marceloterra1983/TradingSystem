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

export function DraggableItemCard({ item }: DraggableItemCardProps) {
  const [showView, setShowView] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const CategoryIcon = CATEGORY_CONFIG[item.category].icon;

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className={cn('hover:shadow-md transition-shadow cursor-move', CATEGORY_CONFIG[item.category].bgColor)}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <CategoryIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', CATEGORY_CONFIG[item.category].color)} />
              <p className="text-sm font-medium line-clamp-2 flex-1 text-gray-900 dark:text-gray-100">{item.title}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', PRIORITY_CONFIG[item.priority].color)}>
                {PRIORITY_CONFIG[item.priority].label}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowView(true);
                }}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Visualizar"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showView && <ViewItemDialog item={item} open={showView} onOpenChange={setShowView} />}
    </>
  );
}
