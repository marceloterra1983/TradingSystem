import { useState } from "react";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../../../ui/collapsible-card";
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
import {
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
} from "../constants/workspace.constants";
import { cn } from "../../../../lib/utils";

const INITIAL_ITEM_FORM: ItemFormState = {
  title: "",
  description: "",
  category: "documentacao",
  priority: "medium",
  tags: "",
};

export function AddItemSection() {
  const createItem = useWorkspaceStore((state) => state.createItem);
  const [formData, setFormData] = useState<ItemFormState>({
    ...INITIAL_ITEM_FORM,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      setFormData({ ...INITIAL_ITEM_FORM });

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to create item:", error);
      setMessage({ type: "error", text: "Erro ao criar item." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CollapsibleCard cardId="workspace-add">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <CollapsibleCardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novo Item
          </CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Cadastre rapidamente novos itens do workspace
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="add-title">Título *</Label>
            <Input
              id="add-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Implementar stop loss dinâmico"
              required
            />
          </div>

          <div>
            <Label htmlFor="add-description">Descrição *</Label>
            <textarea
              id="add-description"
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
              <Label htmlFor="add-category">Categoria *</Label>
              <select
                id="add-category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as ItemCategory,
                  })
                }
                className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="add-priority">Prioridade</Label>
              <select
                id="add-priority"
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
            <Label htmlFor="add-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="add-tags"
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

          <Button type="submit" className="w-full" disabled={submitting}>
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
        </form>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
