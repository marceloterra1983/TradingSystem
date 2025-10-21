import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TemplateInput } from '@/types';
import { validateTemplate } from '@/utils/validation';
import { Fragment, useCallback, useState, useMemo, useEffect } from 'react';
import { FileJson, UploadCloud, Check, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { TemplatePreview } from './TemplatePreview';
import { Badge } from '@/components/ui/badge';

export interface TemplateImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (templates: TemplateInput[]) => void;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ParsedTemplate {
  template: TemplateInput;
  validation: ReturnType<typeof validateTemplate>;
  selected: boolean;
  expanded?: boolean;
}

export function TemplateImport({
  open,
  onOpenChange,
  onImport,
  isLoading = false
}: TemplateImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedTemplates, setParsedTemplates] = useState<ParsedTemplate[]>([]);
  const [importStrategy, setImportStrategy] = useState<'skip' | 'update'>('update');

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setParsedTemplates([]);
    }
  }, [open]);

  const toggleSelect = useCallback((index: number) => {
    setParsedTemplates(prev => {
      const templates = [...prev];
      templates[index] = {
        ...templates[index],
        selected: !templates[index].selected
      };
      return templates;
    });
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setParsedTemplates(prev => {
      const templates = [...prev];
      templates[index] = {
        ...templates[index],
        expanded: !templates[index].expanded
      };
      return templates;
    });
  }, []);

  const toggleSelectAll = useCallback((value: boolean) => {
    setParsedTemplates(prev =>
      prev.map(template => ({
        ...template,
        selected: value && template.validation.isValid
      }))
    );
  }, []);

  const handleFileChange = useCallback(async (file: File) => {
    try {
      setError(null);

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }

      // Read and parse JSON
      const text = await file.text();
      let templates: TemplateInput[];
      try {
        templates = JSON.parse(text);
        if (!Array.isArray(templates)) {
          templates = [templates];
        }
      } catch (e) {
        setError('Invalid JSON format. Please check your file.');
        return;
      }

      // Validate each template
      const validated = templates.map(template => {
        const validation = validateTemplate(template);
        return {
          template,
          validation,
          selected: validation.isValid,
          expanded: false
        } satisfies ParsedTemplate;
      });

      setParsedTemplates(validated);
      setFile(file);
    } catch (e) {
      setError('Failed to read file. Please try again.');
      console.error('File read error:', e);
    }
  }, []);

  const handleImport = useCallback(() => {
    const templates = parsedTemplates
      .filter(t => t.selected && t.validation.isValid)
      .map(item => item.template);
    onImport(templates);
  }, [parsedTemplates, onImport]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const validCount = useMemo(() => parsedTemplates.filter(t => t.validation.isValid).length, [parsedTemplates]);
  const invalidCount = useMemo(() => parsedTemplates.length - validCount, [parsedTemplates, validCount]);
  const selectedCount = useMemo(() => parsedTemplates.filter(t => t.selected).length, [parsedTemplates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogTitle>Import Templates</DialogTitle>
        <DialogDescription>
          Import templates from a JSON file. Only valid templates can be imported.
        </DialogDescription>

        {!file ? (
          // File upload UI
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
              <FileJson className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              Drop your template JSON file here or click to browse
            </p>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileChange(file);
                }
              }}
              id="template-file"
            />
            <label htmlFor="template-file">
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Choose file
                </span>
              </Button>
            </label>
          </div>
        ) : (
          // Template preview table
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {parsedTemplates.length} templates found • {validCount} valid • {invalidCount} invalid
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setParsedTemplates([]);
                  setError(null);
                }}
              >
                Choose different file
              </Button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            )}

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox
                        checked={parsedTemplates.every(t => !t.validation.isValid || t.selected)}
                        onCheckedChange={value => toggleSelectAll(!!value)}
                      />
                    </TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Formats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTemplates.map((template, index) => (
                    <Fragment key={`${template.template.name}-${index}`}>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={template.selected}
                            onCheckedChange={() => toggleSelect(index)}
                            disabled={!template.validation.isValid}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                            <p className="font-medium">{template.template.name}</p>
                            {template.template.description && (
                              <p className="text-sm text-slate-500">{template.template.description}</p>
                            )}
                          </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {template.template.options.formats?.map(format => (
                              <Badge key={format} variant="outline">
                                {format}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.validation.isValid ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <Check className="h-4 w-4" />
                              Valid
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-sm text-red-600">
                              <X className="h-4 w-4" />
                              Invalid
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(index)}
                          >
                            {template.expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {template.expanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-slate-50 dark:bg-slate-900">
                            <div className="p-4">
                              <TemplatePreview
                                template={template.template}
                                validationErrors={template.validation.errors}
                                validationWarnings={template.validation.warnings}
                                compact
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label className="text-sm">Import strategy:</Label>
                <select
                  value={importStrategy}
                  onChange={e => setImportStrategy(e.target.value as 'skip' | 'update')}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="skip">Skip existing</option>
                  <option value="update">Update existing</option>
                </select>
              </div>
              <div className="space-x-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isLoading}
                  isLoading={isLoading}
                >
                  Import {selectedCount} template{selectedCount === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
