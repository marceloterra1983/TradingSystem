/**
 * Directory Selector Component
 *
 * Visual directory browser for selecting collection source paths
 * Connects to backend directories API
 *
 * @module components/pages/DirectorySelector
 */

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Directory entry interface
 */
interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

/**
 * Browse response interface
 */
interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: DirectoryEntry[];
  files: DirectoryEntry[];
  totalDirectories: number;
  totalFiles: number;
}

/**
 * Component props
 */
interface DirectorySelectorProps {
  value: string;
  onChange: (path: string) => void;
  baseUrl?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * DirectorySelector Component
 */
export const DirectorySelector: React.FC<DirectorySelectorProps> = ({
  value,
  onChange,
  baseUrl = 'http://localhost:3403',
  className = '',
  disabled = false,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(
    value || '/data/tradingsystem',
  );
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);

  /**
   * Fetch directory contents
   */
  const fetchDirectory = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${baseUrl}/api/v1/rag/directories/browse?path=${encodeURIComponent(path)}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch directory');
      }

      const result = await response.json();
      const data: BrowseResponse = result.data;

      setDirectories(data.directories);
      setParent(data.parent);
      setCurrentPath(data.path);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar diretório');
      setDirectories([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle directory selection
   */
  const handleSelectDirectory = (directory: DirectoryEntry) => {
    setCurrentPath(directory.path);
    fetchDirectory(directory.path);
  };

  /**
   * Handle go up to parent
   */
  const handleGoUp = () => {
    if (parent) {
      setCurrentPath(parent);
      fetchDirectory(parent);
    }
  };

  /**
   * Handle use current directory
   */
  const handleUseDirectory = () => {
    onChange(currentPath);
    setExpanded(false);
  };

  /**
   * Handle manual path input
   */
  const handleManualPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPath(e.target.value);
  };

  /**
   * Handle manual path submit
   */
  const handleManualPathSubmit = () => {
    fetchDirectory(currentPath);
  };

  /**
   * Load initial directory on mount
   */
  useEffect(() => {
    if (expanded && directories.length === 0) {
      fetchDirectory(currentPath);
    }
  }, [expanded]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Current path display with expand button */}
      <div className="flex items-center gap-2">
        <Input
          value={value || currentPath}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/data/docs/content"
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0"
          disabled={disabled}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          {expanded ? 'Fechar' : 'Navegar'}
        </Button>
      </div>

      {/* Directory browser (collapsible) */}
      {expanded && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGoUp}
              disabled={!parent || loading || disabled}
              className="shrink-0"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>

            <Input
              value={currentPath}
              onChange={handleManualPathChange}
              onKeyDown={(e) => e.key === 'Enter' && handleManualPathSubmit()}
              placeholder="/data/docs/content"
              className="flex-1 text-sm"
              disabled={loading || disabled}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fetchDirectory(currentPath)}
              disabled={loading || disabled}
              className="shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Directory list */}
          <ScrollArea className="h-64 border border-slate-200 dark:border-slate-700 rounded-md">
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Carregando...
              </div>
            ) : directories.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Nenhum subdiretório encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {directories.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    onClick={() => handleSelectDirectory(dir)}
                    disabled={disabled}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Folder className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="flex-1 truncate">{dir.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500">
              {directories.length} pasta{directories.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpanded(false)}
                disabled={disabled}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUseDirectory}
                disabled={disabled}
              >
                Usar Este Diretório
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-slate-500">
        Caminho absoluto para a pasta contendo os documentos a serem indexados
      </p>
    </div>
  );
};
