import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { AlertCircle, Check, FileJson, UploadCloud, X } from 'lucide-react';
import type { TemplateInput } from '../../../types/webscraper';
import { validateTemplate } from '../../../utils/validation';
import { TemplatePreview } from './TemplatePreview';

interface TemplateImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (templates: TemplateInput[]) => void;
  isLoading?: boolean;
}

interface ParsedTemplate {
  template: TemplateInput;
  selected: boolean;
  expanded: boolean;
  validation: ReturnType<typeof validateTemplate>;
}

const MAX_SIZE = 5 * 1024 * 1024;

export function TemplateImport({ open, onOpenChange, onImport, isLoading = false }: TemplateImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedTemplate[]>([]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setItems([]);
      setError(null);
    }
  }, [open]);

  const validCount = useMemo(() => items.filter((item) => item.validation.isValid).length, [items]);
  const selectedCount = useMemo(() => items.filter((item) => item.selected && item.validation.isValid).length, [items]);

  const handleFile = useCallback(async (selectedFile: File) => {
    setError(null);
    if (selectedFile.size > MAX_SIZE) {
      setError('File too large. Maximum allowed size is 5MB.');
      return;
    }

    try {
      const text = await selectedFile.text();
      const payload = JSON.parse(text);
      const templates: TemplateInput[] = Array.isArray(payload) ? payload : [payload];
      const parsed = templates.map((template) => {
        const validation = validateTemplate(template);
        return {
          template,
          selected: validation.isValid,
          expanded: false,
          validation,
        } satisfies ParsedTemplate;
      });
      setFile(selectedFile);
      setItems(parsed);
    } catch (e) {
      console.error('Failed to parse template file', e);
      setError('Invalid JSON file. Please verify the template structure.');
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      void handleFile(dropped);
    }
  }, [handleFile]);

  const toggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({
      ...item,
      selected: checked ? item.validation.isValid : false,
    })));
  };

  const toggleRow = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const toggleExpand = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], expanded: !next[index].expanded };
      return next;
    });
  };

  const handleImport = () => {
    const templates = items.filter((item) => item.selected && item.validation.isValid).map((item) => item.template);
    onImport(templates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogTitle>Import templates</DialogTitle>
        <DialogDescription>Upload a JSON file containing one or more templates.</DialogDescription>

        {!file ? (
          <div
            className="flex flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
              <FileJson className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              Drag and drop your template JSON file here or click to browse.
            </p>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              id="template-upload"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void handleFile(selected);
                }
              }}
            />
            <Label htmlFor="template-upload">
              <Button type="button" variant="outline">
                <UploadCloud className="mr-2 h-4 w-4" /> Choose file
              </Button>
            </Label>
            {error && (
              <p className="mt-4 text-sm text-red-500">
                <AlertCircle className="mr-1 inline h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {items.length} templates detected • {validCount} valid
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setItems([]);
                  setError(null);
                }}
              >
                Choose another file
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={items.every((item) => !item.validation.isValid || item.selected)}
                onChange={(event) => toggleSelectAll(event.target.checked)}
              />
              <span>Select all valid templates</span>
              <Badge variant="outline">{selectedCount} selected</Badge>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.template.name}-${index}`} className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={item.selected}
                        disabled={!item.validation.isValid}
                        onChange={() => toggleRow(index)}
                      />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{item.template.name}</p>
                        {item.template.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.template.description}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(item.template.options.formats ?? []).map((format: string) => (
                            <Badge key={format} variant="outline">
                              {format}
                            </Badge>
                          ))}
                        </div>
                        {!item.validation.isValid ? (
                          <div className="mt-2 flex items-center gap-1 text-sm text-red-500">
                            <X className="h-4 w-4" /> Invalid template
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                            <Check className="h-4 w-4" /> Valid
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(index)}>
                      {item.expanded ? 'Hide details' : 'Show details'}
                    </Button>
                  </div>
                  {item.expanded && (
                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <TemplatePreview
                        template={item.template}
                        compact
                        validationErrors={item.validation.errors}
                        validationWarnings={item.validation.warnings}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0 || isLoading}>
                {isLoading && <UploadCloud className="mr-2 h-4 w-4 animate-spin" />}
                Import {selectedCount} template{selectedCount === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { TemplateImportProps };
