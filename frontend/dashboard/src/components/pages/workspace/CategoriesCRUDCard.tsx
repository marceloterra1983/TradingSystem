/**
 * Categories CRUD Card - Workspace Integration
 *
 * Gerenciamento de categorias com layout consistente ao Workspace
 */

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  categoriesService,
  Category,
  CreateCategoryDTO,
} from '../../../services/categoriesService';

export default function CategoriesCRUDCard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Form state for inline editing
  const [formData, setFormData] = useState<Partial<CreateCategoryDTO>>({
    name: '',
    description: '',
    color: '#6B7280',
    display_order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // Normalize category name to meet API requirements
  const normalizeCategoryName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, ''); // Remove invalid characters
  };

  // Validate category name format
  const validateCategoryName = (name: string): string | null => {
    if (!name) {
      return 'Nome é obrigatório';
    }
    if (name.length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres';
    }
    if (name.length > 100) {
      return 'Nome deve ter no máximo 100 caracteres';
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return 'Nome deve conter apenas letras minúsculas, números e hífens';
    }
    return null;
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      setApiUnavailable(false);
      const data = await categoriesService.getCategories({
        active_only: false,
        order_by: 'display_order',
      });
      setCategories(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Erro ao carregar categorias';
      // Check if it's a connection error
      if (
        errorMsg.includes('fetch') ||
        errorMsg.includes('network') ||
        errorMsg.includes('Failed to fetch')
      ) {
        setApiUnavailable(true);
        setError('Não foi possível conectar ao servidor da API');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Clear previous errors
    setError(null);
    setValidationError(null);

    // Normalize the name
    const normalizedName = normalizeCategoryName(formData.name || '');

    // Validate the normalized name
    const validationErr = validateCategoryName(normalizedName);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    try {
      setSyncing(true);

      // Create category with normalized name
      await categoriesService.createCategory({
        ...formData,
        name: normalizedName,
      } as CreateCategoryDTO);

      await loadCategories();
      setIsCreating(false);
      resetForm();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Erro ao criar categoria';

      // Check if it's a validation error from backend
      if (
        errorMsg.includes('must contain only') ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('must be between')
      ) {
        setValidationError(errorMsg);
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        setApiUnavailable(true);
        setError('Não foi possível conectar ao servidor da API');
      } else {
        setError(errorMsg);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdate = async (id: string) => {
    // Clear previous errors
    setError(null);
    setValidationError(null);

    // Normalize the name if it's being updated
    const updateData = { ...formData };
    if (updateData.name) {
      const normalizedName = normalizeCategoryName(updateData.name);
      const validationErr = validateCategoryName(normalizedName);
      if (validationErr) {
        setValidationError(validationErr);
        return;
      }
      updateData.name = normalizedName;
    }

    try {
      setSyncing(true);
      await categoriesService.updateCategory(id, updateData);
      await loadCategories();
      setEditingId(null);
      resetForm();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Erro ao atualizar categoria';

      if (
        errorMsg.includes('must contain only') ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('must be between')
      ) {
        setValidationError(errorMsg);
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        setApiUnavailable(true);
        setError('Não foi possível conectar ao servidor da API');
      } else {
        setError(errorMsg);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deletar categoria "${name}"?`)) return;

    try {
      setError(null);
      setSyncing(true);
      await categoriesService.deleteCategory(id);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao deletar categoria',
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setError(null);
      setSyncing(true);
      await categoriesService.toggleCategory(id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alternar status');
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6B7280',
      display_order: category.display_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
    setError(null);
    setValidationError(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6B7280',
      display_order: 0,
    });
  };

  const formatTimestampShort = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const showLoadingState = loading && categories.length === 0;
  const normalizedPreview = formData.name
    ? normalizeCategoryName(formData.name)
    : '';
  const showNormalizedPreview =
    formData.name && normalizedPreview !== formData.name;

  return (
    <div className="space-y-6">
      {/* Header Stats/Status Badge */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border',
            loading || syncing
              ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
              : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
          )}
        >
          {loading || syncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          <span>
            {loading && categories.length === 0
              ? 'Carregando...'
              : syncing
                ? 'Sincronizando...'
                : lastSyncedAt
                  ? `Atualizado em ${formatTimestampShort(lastSyncedAt)}`
                  : 'Aguardando sincronização'}
          </span>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          disabled={apiUnavailable || isCreating}
          className="h-10 w-10 p-0"
          title="Adicionar Categoria"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* API Unavailable Banner */}
      {apiUnavailable && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                API Indisponível
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Não foi possível conectar ao servidor da API. Ações de edição
                estão desativadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && !apiUnavailable && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Erro de Validação
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {error && !apiUnavailable && !validationError && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                Erro
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Form (Inline) */}
      {isCreating && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Nova Categoria
            </h4>
            <button
              onClick={cancelEdit}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome da Categoria"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {showNormalizedPreview && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Será salvo como:{' '}
                    <span className="font-mono font-semibold">
                      {normalizedPreview}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-12 h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  title="Cor da categoria"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#6B7280"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>

          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Descrição (opcional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 mb-3"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Criar
            </Button>
            <Button onClick={cancelEdit} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                #
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Categoria
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Descrição
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {showLoadingState ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-sm text-gray-500"
                  colSpan={5}
                >
                  Carregando...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-sm text-gray-500"
                  colSpan={5}
                >
                  <Folder className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p>Nenhuma categoria cadastrada ainda.</p>
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                >
                  {editingId === category.id ? (
                    // Edit Mode
                    <>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {category.display_order}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          pattern="[a-z0-9-]+"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          className="w-12 h-7 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdate(category.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded"
                            title="Salvar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {category.display_order}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-xs truncate">
                        {category.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(category.id)}
                          disabled={apiUnavailable}
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                            category.is_active
                              ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                          )}
                        >
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(category)}
                            disabled={apiUnavailable}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(category.id, category.name)
                            }
                            disabled={apiUnavailable}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
