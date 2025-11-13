/**
 * Collection Delete Dialog Component
 *
 * Confirmation dialog for deleting collections
 * Shows impact of deletion (documents, chunks, etc.)
 *
 * @module components/pages/CollectionDeleteDialog
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  Trash2,
  Database,
  FileText,
  Package,
} from '@/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import type { Collection } from "../../types/collections";

/**
 * Component props
 */
interface CollectionDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  collection: Collection;
  isLoading?: boolean;
}

/**
 * CollectionDeleteDialog Component
 */
export const CollectionDeleteDialog: React.FC<CollectionDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  collection,
  isLoading = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle confirm delete
   */
  const handleConfirm = async () => {
    setIsDeleting(true);

    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
      // Error handling is done by parent component
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Get stats summary
   */
  const getStatsSummary = () => {
    if (!collection.stats) {
      return {
        vectors: 0,
        points: 0,
        hasData: false,
      };
    }

    return {
      vectors: collection.stats.vectorsCount || 0,
      points: collection.stats.pointsCount || 0,
      hasData:
        (collection.stats.vectorsCount || 0) > 0 ||
        (collection.stats.pointsCount || 0) > 0,
    };
  };

  const stats = getStatsSummary();

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Deletar Coleção
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Todos os dados indexados serão
            permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Collection Info */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Coleção
              </p>
              <p className="font-semibold text-lg">{collection.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Descrição
              </p>
              <p className="text-sm">{collection.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{collection.embeddingModel}</Badge>
              <Badge variant="outline">{collection.directory}</Badge>
            </div>
          </div>

          {/* Impact Summary */}
          {stats.hasData && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 space-y-3">
              <p className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dados que serão deletados:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Vetores
                    </p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">
                      {stats.vectors.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Pontos
                    </p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">
                      {stats.points.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!stats.hasData && (
            <Alert>
              <AlertDescription>
                Esta coleção está vazia. Nenhum dado será perdido.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Atenção!</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>A coleção será removida do Qdrant</li>
                <li>Todos os vetores e metadados serão deletados</li>
                <li>O file watcher não monitorará mais este diretório</li>
                <li>Esta ação é irreversível</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Para confirmar, digite o nome da coleção:{" "}
              <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-red-600">
                {collection.name}
              </code>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || isLoading}
          >
            {isDeleting || isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deletando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionDeleteDialog;
