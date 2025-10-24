import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { cn } from '../../../../lib/utils';
import { CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from '../constants/workspace.constants';
import type { Item } from '../types/workspace.types';
import { Tag } from 'lucide-react';

interface ViewItemDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewItemDialog({ item, open, onOpenChange }: ViewItemDialogProps) {
  const CategoryIcon = CATEGORY_CONFIG[item.category].icon;
  const StatusIcon = STATUS_CONFIG[item.status].icon;
  const PriorityIcon = PRIORITY_CONFIG[item.priority].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <CategoryIcon className={cn('h-5 w-5 flex-shrink-0', CATEGORY_CONFIG[item.category].color)} />
            <span className="break-words">{item.title}</span>
          </DialogTitle>
          <DialogDescription>
            Criada em {new Date(item.createdAt).toLocaleDateString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Descrição</h4>
            <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{item.description}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Categoria</h4>
              <div className="flex items-center gap-2">
                <CategoryIcon className={cn('h-4 w-4', CATEGORY_CONFIG[item.category].color)} />
                <span className="text-sm text-gray-900 dark:text-gray-100">{CATEGORY_CONFIG[item.category].label}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{CATEGORY_CONFIG[item.category].description}</p>
            </div>

            {/* Priority */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Prioridade</h4>
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium', PRIORITY_CONFIG[item.priority].color)}>
                <PriorityIcon className="h-4 w-4" />
                {PRIORITY_CONFIG[item.priority].label}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Status</h4>
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium', STATUS_CONFIG[item.status].color)}>
                <StatusIcon className="h-4 w-4" />
                {STATUS_CONFIG[item.status].label}
              </div>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold">ID:</span> #{item.id}
              </div>
              <div>
                <span className="font-semibold">Data de criação:</span>{' '}
                {new Date(item.createdAt).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo'
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
