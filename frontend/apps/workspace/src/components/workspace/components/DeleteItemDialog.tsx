import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { Item } from '../types/workspace.types';

interface DeleteItemDialogProps {
  item: Item;
  usingFallbackData?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteItemDialog({ item, usingFallbackData, open, onOpenChange }: DeleteItemDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    if (usingFallbackData) {
      setError('Não é possível deletar dados de exemplo.');
      setDeleting(false);
      return;
    }

    try {
      await deleteItem(item.id);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Erro ao deletar o item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
          <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100">{item.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              void handleDelete();
            }}
            disabled={deleting}
          >
            {deleting ? 'Deletando...' : 'Deletar Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
