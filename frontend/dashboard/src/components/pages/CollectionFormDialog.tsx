/**
 * Collection Form Dialog Component
 *
 * Dialog for creating, editing, and cloning collections
 * Includes validation, folder picker, and advanced settings
 *
 * @module components/pages/CollectionFormDialog
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { EmbeddingModelSelector } from './EmbeddingModelSelector';
import { DirectorySelector } from './DirectorySelector';
import type {
  Collection,
  EmbeddingModel,
  CollectionDialogMode,
  CollectionFormState,
  FormErrors,
} from '../../types/collections';

/**
 * Component props
 */
interface CollectionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CollectionFormState) => Promise<void>;
  mode: CollectionDialogMode;
  collection?: Collection;
  models: EmbeddingModel[];
  isLoading?: boolean;
}

/**
 * Default form values
 */
const DEFAULT_FORM_STATE: CollectionFormState = {
  name: '',
  description: '',
  directory: '/data/docs/content',
  embeddingModel: 'nomic-embed-text',
  chunkSize: 512,
  chunkOverlap: 50,
  fileTypes: ['md', 'mdx'],
  recursive: true,
  enabled: true,
  autoUpdate: true,
};

/**
 * Validate form state
 */
const validateForm = (
  state: CollectionFormState,
  _mode: CollectionDialogMode,
): FormErrors => {
  const errors: FormErrors = {};

  // Name validation
  if (!state.name.trim()) {
    errors.name = 'Nome é obrigatório';
  } else if (!/^[a-z0-9_]+$/.test(state.name)) {
    errors.name =
      'Nome deve conter apenas letras minúsculas, números e underscores';
  } else if (state.name.length > 100) {
    errors.name = 'Nome muito longo (máximo 100 caracteres)';
  }

  // Description validation
  if (!state.description.trim()) {
    errors.description = 'Descrição é obrigatória';
  } else if (state.description.length > 500) {
    errors.description = 'Descrição muito longa (máximo 500 caracteres)';
  }

  // Directory validation
  if (!state.directory.trim()) {
    errors.directory = 'Diretório é obrigatório';
  } else if (!state.directory.startsWith('/')) {
    errors.directory = 'Diretório deve ser um caminho absoluto (iniciar com /)';
  }

  // Chunk size validation
  if (state.chunkSize < 100 || state.chunkSize > 2048) {
    errors.chunkSize = 'Chunk size deve estar entre 100 e 2048';
  }

  // Chunk overlap validation
  if (state.chunkOverlap < 0 || state.chunkOverlap > 500) {
    errors.chunkOverlap = 'Chunk overlap deve estar entre 0 e 500';
  }

  // File types validation
  if (state.fileTypes.length === 0) {
    errors.fileTypes = 'Pelo menos um tipo de arquivo é obrigatório';
  }

  return errors;
};

/**
 * CollectionFormDialog Component
 */
export const CollectionFormDialog: React.FC<CollectionFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  mode,
  collection,
  models,
  isLoading = false,
}) => {
  // Debug: Only log when dialog opens (removed from render to prevent loop)

  const [formState, setFormState] =
    useState<CollectionFormState>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Initialize form when dialog opens or mode changes
   */
  useEffect(() => {
    if (open) {
      console.log('🔍 [CollectionFormDialog] Initializing form:', { mode });

      if (mode === 'edit' && collection) {
        setFormState({
          name: collection.name,
          description: collection.description,
          directory: collection.directory,
          embeddingModel: collection.embeddingModel,
          chunkSize: collection.chunkSize,
          chunkOverlap: collection.chunkOverlap,
          fileTypes: collection.fileTypes,
          recursive: collection.recursive,
          enabled: collection.enabled,
          autoUpdate: collection.autoUpdate,
        });
      } else if (mode === 'clone' && collection) {
        setFormState({
          ...collection,
          name: `${collection.name}_clone`,
          description: `${collection.description} (cloned)`,
        });
      } else {
        setFormState(DEFAULT_FORM_STATE);
      }
      setErrors({});
    }
  }, [open, mode, collection]);

  /**
   * Check if form is valid and update errors in real-time
   */
  const isValid = useMemo(() => {
    const validationErrors = validateForm(formState, mode);
    // Update errors in real-time for better UX
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formState, mode]);

  /**
   * Handle field change
   */
  const handleChange = (field: keyof CollectionFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle file types change
   * Now supports both comma and space as separators
   * NOTE: Currently unused - may be needed for future features
   */
  /* const handleFileTypesChange = (value: string) => {
    // Keep raw value in state temporarily to allow smooth typing
    const types = value
      .split(/[,\s]+/) // Split by comma or space
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t !== ',');

    // Update immediately for better UX
    handleChange('fileTypes', types);
  }; */

  /**
   * Handle file types input with better UX
   */
  const [fileTypesInput, setFileTypesInput] = React.useState('');

  // Sync fileTypesInput when form state changes externally
  React.useEffect(() => {
    if (open) {
      setFileTypesInput(formState.fileTypes.join(', '));
    }
  }, [open, formState.fileTypes.length]);

  const handleFileTypesInputChange = (value: string) => {
    setFileTypesInput(value);

    // Only process if user typed comma, space, or semicolon
    if (value.endsWith(',') || value.endsWith(' ') || value.endsWith(';')) {
      const types = value
        .split(/[,\s;]+/)
        .map((t) => t.trim().replace(/^\./, '')) // Remove leading dots
        .filter((t) => t.length > 0);

      if (types.length > 0) {
        handleChange('fileTypes', types);
        setFileTypesInput(types.join(', ') + ', '); // Keep comma for next entry
      }
    }
  };

  const handleFileTypesBlur = () => {
    // Process remaining text on blur
    const types = fileTypesInput
      .split(/[,\s;]+/)
      .map((t) => t.trim().replace(/^\./, ''))
      .filter((t) => t.length > 0);

    if (types.length > 0) {
      handleChange('fileTypes', types);
      setFileTypesInput(types.join(', '));
    }
  };

  /**
   * Handle submit
   */
  const handleSubmit = async () => {
    console.log('🚀 [CollectionFormDialog] handleSubmit started', {
      mode,
      formState,
    });

    // Validate form
    const validationErrors = validateForm(formState, mode);
    if (Object.keys(validationErrors).length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      setErrors(validationErrors);
      return;
    }

    console.log('✅ Validation passed, starting submission...');
    setIsSubmitting(true);

    try {
      console.log('📤 Calling onSubmit...');
      const startTime = Date.now();

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout (60s)')), 60000),
      );

      await Promise.race([onSubmit(formState), timeoutPromise]);

      const duration = Date.now() - startTime;
      console.log(`✅ onSubmit completed in ${duration}ms`);

      onClose();
    } catch (error) {
      console.error('❌ Form submission error:', error);
      alert(
        `Erro ao criar coleção: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Error handling is done by parent component
    } finally {
      console.log('🔄 Resetting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  /**
   * Get dialog title
   */
  const getTitle = (): string => {
    switch (mode) {
      case 'create':
        return 'Nova Coleção';
      case 'edit':
        return 'Editar Coleção';
      case 'clone':
        return 'Clonar Coleção';
      default:
        return 'Coleção';
    }
  };

  /**
   * Get dialog description
   */
  const getDescription = (): string => {
    switch (mode) {
      case 'create':
        return 'Crie uma nova coleção para indexar documentos.';
      case 'edit':
        return 'Edite as configurações da coleção. Alterar o modelo requer re-indexação.';
      case 'clone':
        return 'Clone esta coleção com um novo nome.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTitle()}
            {mode === 'edit' && collection && (
              <Badge variant="outline" className="font-normal">
                {collection.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Collection Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome da Coleção <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="ex: documentation"
              disabled={mode === 'edit' || isSubmitting}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
            {mode === 'edit' && (
              <p className="text-xs text-slate-500">
                <Info className="h-3 w-3 inline mr-1" />
                Nome não pode ser alterado após criação
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={formState.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="ex: Documentação geral do projeto"
              disabled={isSubmitting}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Embedding Model */}
          <div className="space-y-2">
            <Label htmlFor="model">
              Modelo de Embedding <span className="text-red-500">*</span>
            </Label>
            <EmbeddingModelSelector
              models={models}
              value={formState.embeddingModel}
              onChange={(value) => handleChange('embeddingModel', value as any)}
              disabled={mode === 'edit' || isSubmitting}
            />
            {mode === 'edit' && (
              <p className="text-xs text-slate-500">
                <Info className="h-3 w-3 inline mr-1" />
                Modelo não pode ser alterado após criação da coleção
              </p>
            )}
          </div>

          {/* Source Directory */}
          <div className="space-y-2">
            <Label htmlFor="directory">
              Diretório de Origem <span className="text-red-500">*</span>
            </Label>
            <DirectorySelector
              value={formState.directory}
              onChange={(path) => handleChange('directory', path)}
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && (
              <p className="text-xs text-slate-500">
                <Info className="h-3 w-3 inline mr-1" />
                Diretório de origem não pode ser alterado após criação da
                coleção
              </p>
            )}
            {errors.directory && (
              <p className="text-sm text-red-500">{errors.directory}</p>
            )}
          </div>

          {/* Advanced Settings */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Configurações Avançadas</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isAdvancedOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Chunk Size */}
              <div className="space-y-2">
                <Label htmlFor="chunkSize">Chunk Size</Label>
                <Input
                  id="chunkSize"
                  type="number"
                  value={formState.chunkSize}
                  onChange={(e) =>
                    handleChange('chunkSize', parseInt(e.target.value))
                  }
                  min={100}
                  max={2048}
                  disabled={isSubmitting}
                  className={errors.chunkSize ? 'border-red-500' : ''}
                />
                {errors.chunkSize && (
                  <p className="text-sm text-red-500">{errors.chunkSize}</p>
                )}
              </div>

              {/* Chunk Overlap */}
              <div className="space-y-2">
                <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                <Input
                  id="chunkOverlap"
                  type="number"
                  value={formState.chunkOverlap}
                  onChange={(e) =>
                    handleChange('chunkOverlap', parseInt(e.target.value))
                  }
                  min={0}
                  max={500}
                  disabled={isSubmitting}
                  className={errors.chunkOverlap ? 'border-red-500' : ''}
                />
                {errors.chunkOverlap && (
                  <p className="text-sm text-red-500">{errors.chunkOverlap}</p>
                )}
              </div>

              {/* File Types */}
              <div className="space-y-2">
                <Label htmlFor="fileTypes">
                  Tipos de Arquivo
                  <span className="text-xs text-slate-500 ml-2 font-normal">
                    (separados por vírgula, espaço ou ponto-e-vírgula)
                  </span>
                </Label>
                <Input
                  id="fileTypes"
                  value={fileTypesInput}
                  onChange={(e) => handleFileTypesInputChange(e.target.value)}
                  onBlur={handleFileTypesBlur}
                  placeholder="md, mdx, txt, json"
                  disabled={isSubmitting}
                  className={errors.fileTypes ? 'border-red-500' : ''}
                />
                {formState.fileTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formState.fileTypes.map((type, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        .{type}
                      </Badge>
                    ))}
                  </div>
                )}
                {errors.fileTypes && (
                  <p className="text-sm text-red-500">{errors.fileTypes}</p>
                )}
                <p className="text-xs text-slate-500">
                  Exemplo: md, mdx, txt ou md mdx txt
                </p>
              </div>

              {/* Recursive */}
              <div className="flex items-center justify-between">
                <Label htmlFor="recursive" className="cursor-pointer">
                  Busca Recursiva
                </Label>
                <Switch
                  id="recursive"
                  checked={formState.recursive}
                  onCheckedChange={(checked) =>
                    handleChange('recursive', checked)
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled" className="cursor-pointer">
                  Coleção Habilitada
                </Label>
                <Switch
                  id="enabled"
                  checked={formState.enabled}
                  onCheckedChange={(checked) =>
                    handleChange('enabled', checked)
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* Auto Update */}
              <div className="flex items-center justify-between">
                <Label htmlFor="autoUpdate" className="cursor-pointer">
                  Atualização Automática
                </Label>
                <Switch
                  id="autoUpdate"
                  checked={formState.autoUpdate}
                  onCheckedChange={(checked) =>
                    handleChange('autoUpdate', checked)
                  }
                  disabled={isSubmitting}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {mode === 'edit' ? 'Salvando...' : 'Criando...'}
              </>
            ) : (
              <>{mode === 'edit' ? 'Salvar' : 'Criar'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionFormDialog;
