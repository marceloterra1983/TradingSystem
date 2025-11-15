import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Plus, Clock } from "@/icons";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type {
  ItemFormState,
  ItemCategory,
  ItemPriority,
} from "../types/workspace.types";
import { PRIORITY_CONFIG } from "../constants/workspace.constants";
import { cn } from "../../../../lib/utils";
import {
  categoriesService,
  type Category,
} from "../../../../services/categoriesService";

const INITIAL_ITEM_FORM: ItemFormState = {
  title: "",
  description: "",
  category: "", // Will be set to first category from API
  priority: "medium",
  tags: "",
};

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const createItem = useWorkspaceStore((state) => state.createItem);
  const [formData, setFormData] = useState<ItemFormState>({
    ...INITIAL_ITEM_FORM,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load categories from API
  useEffect(() => {
    if (!open) return;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await categoriesService.getCategories({
          active_only: true,
          order_by: "display_order",
        });
        setCategories(data);

        // Set first category as default if available
        if (data.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: data[0].name }));
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        // Fallback to empty array on error
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const created = await createItem({ ...formData, tags: tagsArray });

      setMessage({
        type: "success",
        text: `Item "${created.title}" criado com sucesso!`,
      });

      setTimeout(() => {
        setMessage(null);
        onOpenChange(false);
        setFormData({ ...INITIAL_ITEM_FORM });
      }, 2000);
    } catch (error) {
      console.error("Failed to create item:", error);
      setMessage({
        type: "error",
        text: "Erro ao criar item. Verifique a consola.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novo Item
          </DialogTitle>
          <DialogDescription>
            Cadastre novos itens do workspace para evoluir o TradingSystem
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Implementar stop loss dinâmico"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descreva o item em detalhes..."
              rows={4}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as ItemCategory,
                  })
                }
                className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <option value="">Carregando categorias...</option>
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}{" "}
                      {category.description && `- ${category.description}`}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhuma categoria disponível</option>
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as ItemPriority,
                  })
                }
                className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="Ex: ml, backtesting, performance"
            />
          </div>

          {message && (
            <div
              className={cn(
                "rounded-lg p-4 text-sm",
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
                  : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400",
              )}
            >
              {message.text}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
