/**
 * Embedding Model Selector Component
 *
 * Rich select component for choosing embedding models
 * Displays model information, dimensions, and availability
 *
 * @module components/pages/EmbeddingModelSelector
 */

import React from 'react';
import { Check, AlertCircle, CheckCircle, Zap, Target, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { EmbeddingModel } from '../../types/collections';

/**
 * Component props
 */
interface EmbeddingModelSelectorProps {
  models: EmbeddingModel[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Get icon for model performance
 */
const getPerformanceIcon = (performance?: string) => {
  switch (performance) {
    case 'fast':
      return <Zap className="h-4 w-4 text-blue-500" />;
    case 'quality':
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    case 'balanced':
      return <Target className="h-4 w-4 text-emerald-500" />;
    default:
      return null;
  }
};

/**
 * EmbeddingModelSelector Component
 */
export const EmbeddingModelSelector: React.FC<EmbeddingModelSelectorProps> = ({
  models,
  value,
  onChange,
  disabled = false,
  className
}) => {
  /**
   * Get display name for selected model
   */
  const getSelectedModelDisplay = (): string => {
    const selected = models.find(m => m.name === value);
    if (!selected) return 'Selecione um modelo';

    return `${selected.name} (${selected.dimensions}d)`;
  };

  /**
   * Sort models: available first, then default first
   */
  const sortedModels = React.useMemo(() => {
    return [...models].sort((a, b) => {
      // Available models first
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      // Default model first among available
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }, [models]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || models.length === 0}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="Selecione um modelo">
          {getSelectedModelDisplay()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedModels.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Nenhum modelo disponível
          </div>
        ) : (
          sortedModels.map((model) => (
            <SelectItem
              key={model.name}
              value={model.name}
              className="cursor-pointer"
              disabled={!model.available}
            >
              <div className="flex items-start gap-3 py-1">
                {/* Status Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {model.available ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                {/* Model Info */}
                <div className="flex-1 min-w-0">
                  {/* Model Name & Dimensions */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {model.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {model.dimensions}d
                    </Badge>
                    {model.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Padrão
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {model.description}
                  </p>

                  {/* Performance & Use Case */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Performance Badge */}
                    {model.performance && (
                      <div className="flex items-center gap-1">
                        {getPerformanceIcon(model.performance)}
                        <span className="text-xs capitalize text-slate-500">
                          {model.performance === 'fast' && 'Rápido'}
                          {model.performance === 'quality' && 'Alta Qualidade'}
                          {model.performance === 'balanced' && 'Equilibrado'}
                        </span>
                      </div>
                    )}

                    {/* Use Case */}
                    {model.useCase && (
                      <span className="text-xs text-slate-500 italic">
                        {model.useCase}
                      </span>
                    )}
                  </div>

                  {/* Capabilities */}
                  {model.capabilities && model.capabilities.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {model.capabilities.slice(0, 3).map((capability) => (
                        <Badge
                          key={capability}
                          variant="outline"
                          className="text-xs bg-slate-50 dark:bg-slate-800"
                        >
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Availability Warning */}
                  {!model.available && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                      ⚠️ Modelo não disponível no Ollama
                    </div>
                  )}
                </div>

                {/* Selected Indicator */}
                {value === model.name && (
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default EmbeddingModelSelector;
