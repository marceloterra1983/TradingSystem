import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Folder,
  AlertCircle,
  RefreshCw,
  Clock,
} from "@/icons";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";
import {
  categoriesService,
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../../../services/categoriesService";
import { useToast } from "../../../hooks/useToast";

type FormMode = "idle" | "create" | "edit";

type CategoryFormState = {
  displayName: string;
  name: string;
  description: string;
  color: string;
  displayOrder: string;
};

type FormErrors = Partial<Record<keyof CategoryFormState, string>>;

const DEFAULT_COLOR = "#6B7280";

const normalizeCategoryName = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 100);

const sanitizeColorInput = (value: string): string => {
  if (!value) return DEFAULT_COLOR;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
};

interface CategoryFormCardProps {
  mode: FormMode;
  formState: CategoryFormState;
  formErrors: FormErrors;
  syncing: boolean;
  onFieldChange: <K extends keyof CategoryFormState>(
    field: K,
    value: CategoryFormState[K],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
  autoSlug: string;
  slugManuallyEdited: boolean;
}

function CategoryFormCard({
  mode,
  formState,
  formErrors,
  syncing,
  onFieldChange,
  onSubmit,
  onCancel,
  autoSlug,
  slugManuallyEdited,
}: CategoryFormCardProps) {
  const title = mode === "create" ? "Nova categoria" : "Editar categoria";
  const primaryLabel =
    mode === "create" ? "Criar categoria" : "Salvar alterações";

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/40",
        mode === "edit" &&
          "border-cyan-200 bg-cyan-50/70 dark:border-cyan-900/60 dark:bg-cyan-950/40",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {title}
        </h4>
        <button
          onClick={onCancel}
          className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900"
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
              Nome exibido
            </label>
            <input
              type="text"
              value={formState.displayName}
              onChange={(e) => onFieldChange("displayName", e.target.value)}
              placeholder="Ex.: Documentação"
              className={cn(
                "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20",
                formErrors.displayName &&
                  "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-800/70 dark:focus:border-red-500",
              )}
              maxLength={120}
            />
            <p className="mt-1 text-xs text-blue-700/70 dark:text-blue-200/70">
              Nome amigável utilizado em relatórios e no dashboard.
            </p>
            {formErrors.displayName && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {formErrors.displayName}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
              Slug (ID)
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="documentacao-interna"
              className={cn(
                "mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm uppercase tracking-wide focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20",
                formErrors.name &&
                  "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-800/70 dark:focus:border-red-500",
              )}
            />
            <div className="mt-1 text-xs text-blue-700/70 dark:text-blue-200/70">
              Use letras minúsculas, números e hífens.
              {!slugManuallyEdited && (
                <>
                  {" "}
                  Será gerado como{" "}
                  <span className="font-mono text-blue-900 dark:text-blue-100">
                    {autoSlug || "—"}
                  </span>
                  .
                </>
              )}
            </div>
            {formErrors.name && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {formErrors.name}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
            Descrição
          </label>
          <textarea
            value={formState.description}
            onChange={(e) => onFieldChange("description", e.target.value)}
            placeholder="Contextualize quando utilizar esta categoria (opcional)"
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          />
          {formErrors.description && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              {formErrors.description}
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
              Cor
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="color"
                value={formState.color || DEFAULT_COLOR}
                onChange={(e) => onFieldChange("color", e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-blue-100 bg-white shadow-sm dark:border-blue-900/60 dark:bg-slate-900"
                title="Cor da categoria"
              />
              <input
                type="text"
                value={formState.color}
                onChange={(e) => onFieldChange("color", e.target.value)}
                placeholder="#6B7280"
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 font-mono text-sm uppercase tracking-wide focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20",
                  formErrors.color &&
                    "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-800/70 dark:focus:border-red-500",
                )}
                maxLength={7}
              />
            </div>
            {formErrors.color && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {formErrors.color}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
              Ordem de exibição
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formState.displayOrder}
              onChange={(e) => onFieldChange("displayOrder", e.target.value)}
              className={cn(
                "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20",
                formErrors.displayOrder &&
                  "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-800/70 dark:focus:border-red-500",
              )}
            />
            <p className="mt-1 text-xs text-blue-700/70 dark:text-blue-200/70">
              Define a posição da categoria nas listagens.
            </p>
            {formErrors.displayOrder && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {formErrors.displayOrder}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button
          onClick={onSubmit}
          disabled={syncing}
          className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-cyan-600 dark:hover:bg-cyan-500"
        >
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {primaryLabel}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:text-blue-200 dark:hover:bg-blue-900/30"
          disabled={syncing}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function CategoriesCRUDCard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [mode, setMode] = useState<FormMode>("idle");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>({
    displayName: "",
    name: "",
    description: "",
    color: DEFAULT_COLOR,
    displayOrder: "1",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const sortedCategories = useMemo(() => {
    return [...categories].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
  }, [categories]);

  const maxDisplayOrder = useMemo(() => {
    if (categories.length === 0) return 0;
    return categories.reduce(
      (acc, item) => Math.max(acc, item.display_order ?? 0),
      0,
    );
  }, [categories]);

  const autoSlug = normalizeCategoryName(
    formState.displayName || formState.name,
  );

  const isNetworkError = (message: string) =>
    /network|failed to fetch|timeout/i.test(message);

  const formatTimestampShort = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const resetForm = () => {
    setFormState({
      displayName: "",
      name: "",
      description: "",
      color: DEFAULT_COLOR,
      displayOrder: String(maxDisplayOrder + 1 || 1),
    });
    setFormErrors({});
    setSlugManuallyEdited(false);
  };

  const loadCategories = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      setApiUnavailable(false);
      const data = await categoriesService.getCategories({
        active_only: false,
        order_by: "display_order",
      });
      setCategories(
        data.map((category) => ({
          ...category,
          display_name: category.display_name || category.name,
        })),
      );
      setLastSyncedAt(new Date());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar categorias";
      if (isNetworkError(message)) {
        setApiUnavailable(true);
      }
      setError(message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginCreate = () => {
    resetForm();
    setMode("create");
    setActiveCategory(null);
  };

  const beginEdit = (category: Category) => {
    setMode("edit");
    setActiveCategory(category);
    setFormState({
      displayName: category.display_name || category.name,
      name: category.name,
      description: category.description ?? "",
      color: category.color ?? DEFAULT_COLOR,
      displayOrder: String(category.display_order ?? 0),
    });
    setFormErrors({});
    setSlugManuallyEdited(true);
  };

  const cancelForm = () => {
    setMode("idle");
    setActiveCategory(null);
    resetForm();
    setError(null);
  };

  const handleFieldChange = <K extends keyof CategoryFormState>(
    field: K,
    rawValue: CategoryFormState[K],
  ) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    setFormState((prev) => {
      let value = rawValue;

      if (field === "displayName" && typeof value === "string") {
        const nextState: CategoryFormState = {
          ...prev,
          displayName: value,
        };
        if (!slugManuallyEdited) {
          nextState.name = normalizeCategoryName(value);
        }
        return nextState;
      }

      if (field === "name" && typeof value === "string") {
        setSlugManuallyEdited(true);
        value = normalizeCategoryName(value);
      }

      if (field === "color" && typeof value === "string") {
        value = sanitizeColorInput(value) as CategoryFormState[K];
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const buildPayload = (state: CategoryFormState) => {
    const errors: FormErrors = {};
    const displayName = state.displayName.trim();
    const normalizedName = normalizeCategoryName(state.name || displayName);
    const color = sanitizeColorInput(state.color);
    const displayOrderNumber = Number(state.displayOrder);

    if (!displayName) {
      errors.displayName = "Informe um nome legível.";
    } else if (displayName.length > 120) {
      errors.displayName = "Nome exibido deve ter no máximo 120 caracteres.";
    }

    if (!normalizedName) {
      errors.name = "Slug é obrigatório.";
    } else if (normalizedName.length < 2) {
      errors.name = "Slug deve ter pelo menos 2 caracteres.";
    }

    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      errors.color = "Informe uma cor no formato #RRGGBB.";
    }

    if (Number.isNaN(displayOrderNumber)) {
      errors.displayOrder = "Informe um número válido.";
    } else if (displayOrderNumber < 0) {
      errors.displayOrder = "A ordem não pode ser negativa.";
    }

    const payload = {
      name: normalizedName,
      display_name: displayName,
      description: state.description.trim() || undefined,
      color,
      display_order: displayOrderNumber,
    };

    return { errors, payload };
  };

  const handleRequestError = (message: string) => {
    if (isNetworkError(message)) {
      setApiUnavailable(true);
      setError("Não foi possível conectar ao servidor da API.");
      showError("Falha de comunicação com a API do Workspace.");
      return;
    }

    if (/already exists|já existe/i.test(message)) {
      setFormErrors((prev) => ({
        ...prev,
        name: "Já existe uma categoria com esse slug.",
      }));
    } else if (/display[_ ]?order|ordem/i.test(message)) {
      setFormErrors((prev) => ({
        ...prev,
        displayOrder: message,
      }));
    }

    setError(message);
    showError(message);
  };

  const handleCreate = async () => {
    const { errors: validationErrors, payload } = buildPayload(formState);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFormState((prev) => ({
        ...prev,
        name: payload.name,
      }));
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setApiUnavailable(false);

      await categoriesService.createCategory(
        payload as CreateCategoryDTO & { display_name: string },
      );

      showSuccess("Categoria criada com sucesso.");
      await loadCategories(false);
      cancelForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar categoria.";
      handleRequestError(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdate = async () => {
    if (!activeCategory) return;
    const { errors: validationErrors, payload } = buildPayload(formState);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFormState((prev) => ({
        ...prev,
        name: payload.name,
      }));
      return;
    }

    const diffPayload: UpdateCategoryDTO = {};
    if (payload.name !== activeCategory.name) {
      diffPayload.name = payload.name;
    }
    if ((payload.display_name || "") !== (activeCategory.display_name || "")) {
      diffPayload.display_name = payload.display_name;
    }
    if ((payload.description || "") !== (activeCategory.description || "")) {
      diffPayload.description = payload.description;
    }
    if ((payload.color || DEFAULT_COLOR) !== activeCategory.color) {
      diffPayload.color = payload.color;
    }
    if (payload.display_order !== activeCategory.display_order) {
      diffPayload.display_order = payload.display_order;
    }

    if (Object.keys(diffPayload).length === 0) {
      showSuccess("Nenhuma alteração detectada.");
      cancelForm();
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setApiUnavailable(false);

      await categoriesService.updateCategory(activeCategory.id, diffPayload);

      showSuccess("Categoria atualizada.");
      await loadCategories(false);
      cancelForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar categoria.";
      handleRequestError(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !confirm(
        `Tem certeza que deseja remover a categoria “${category.display_name || category.name}”?`,
      )
    ) {
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setApiUnavailable(false);

      await categoriesService.deleteCategory(category.id);
      showSuccess("Categoria removida.");
      await loadCategories(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao remover categoria.";
      handleRequestError(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (category: Category) => {
    try {
      setSyncing(true);
      setError(null);
      setApiUnavailable(false);

      const updated = await categoriesService.toggleCategory(category.id);
      setCategories((prev) =>
        prev.map((item) =>
          item.id === category.id
            ? { ...item, is_active: updated.is_active }
            : item,
        ),
      );
      showSuccess(
        updated.is_active
          ? "Categoria reativada."
          : "Categoria marcada como inativa.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao alternar status.";
      handleRequestError(message);
    } finally {
      setSyncing(false);
    }
  };

  const isFormOpen = mode !== "idle";
  const showLoadingState = loading && sortedCategories.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
            loading || syncing
              ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/60 dark:text-cyan-200"
              : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-slate-950/60 dark:text-gray-300",
          )}
        >
          {loading || syncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          <span>
            {loading && sortedCategories.length === 0
              ? "Carregando..."
              : syncing
                ? "Sincronizando..."
                : lastSyncedAt
                  ? `Atualizado ${formatTimestampShort(lastSyncedAt)}`
                  : "Aguardando sincronização"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCategories()}
            disabled={loading || syncing}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            onClick={beginCreate}
            disabled={apiUnavailable || syncing || mode === "create"}
            className="h-10 w-10 p-0"
            title="Adicionar categoria"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {apiUnavailable && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/60 dark:bg-yellow-950/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-100">
                API indisponível
              </h4>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                Não foi possível conectar ao servidor da API. As ações de edição
                ficam bloqueadas até que a comunicação seja restabelecida.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && !apiUnavailable && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            <div>
              <h4 className="font-semibold text-orange-800 dark:text-orange-100">
                Erro
              </h4>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-200">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <CategoryFormCard
          mode={mode}
          formState={formState}
          formErrors={formErrors}
          syncing={syncing}
          onFieldChange={handleFieldChange}
          onSubmit={mode === "create" ? handleCreate : handleUpdate}
          onCancel={cancelForm}
          autoSlug={autoSlug}
          slugManuallyEdited={slugManuallyEdited}
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ordem
              </th>
              <th className="px-4 py-2 text-left font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Categoria
              </th>
              <th className="px-4 py-2 text-left font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Descrição
              </th>
              <th className="px-4 py-2 text-left font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {showLoadingState ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-gray-500"
                  colSpan={5}
                >
                  Carregando categorias...
                </td>
              </tr>
            ) : sortedCategories.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-16 text-center text-sm text-gray-500"
                  colSpan={5}
                >
                  <Folder className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                  <p>Nenhuma categoria cadastrada até o momento.</p>
                </td>
              </tr>
            ) : (
              sortedCategories.map((category) => {
                const isEditing =
                  mode === "edit" && activeCategory?.id === category.id;
                return (
                  <tr
                    key={category.id}
                    className={cn(
                      "transition-colors hover:bg-gray-50 dark:hover:bg-slate-900/40",
                      isEditing && "bg-blue-50/60 dark:bg-blue-950/40",
                    )}
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {category.display_order}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-4 w-4 rounded border border-gray-200 shadow-sm dark:border-gray-800"
                          style={{
                            backgroundColor: category.color || DEFAULT_COLOR,
                          }}
                          aria-hidden
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {category.display_name || category.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="w-fit text-[11px]"
                          >
                            slug: {category.name}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {category.description ? (
                        <span className="line-clamp-2 max-w-md leading-relaxed">
                          {category.description}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          — sem descrição —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(category)}
                        disabled={syncing || apiUnavailable}
                        className={cn(
                          "inline-flex min-w-[84px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition",
                          category.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-900"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-900/40 dark:text-gray-300 dark:hover:bg-slate-900/60",
                          (syncing || apiUnavailable) &&
                            "cursor-not-allowed opacity-60",
                        )}
                      >
                        {category.is_active ? "Ativa" : "Inativa"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => beginEdit(category)}
                          disabled={
                            syncing ||
                            apiUnavailable ||
                            (mode === "edit" && !isEditing)
                          }
                          className="rounded p-1.5 text-blue-600 transition hover:bg-blue-50 dark:text-cyan-300 dark:hover:bg-cyan-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Editar categoria"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={syncing || apiUnavailable}
                          className="rounded p-1.5 text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
