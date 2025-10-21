import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { TemplatePreview } from './TemplatePreview';
import { Loader2Icon, Eye, EyeOff } from 'lucide-react';
import type { Template, TemplateInput } from '../../../types/webscraper';
import type { ScrapeFormat } from '../../../services/firecrawlService';
import { validateTemplate } from '../../../utils/validation';

const AVAILABLE_FORMATS: ScrapeFormat[] = ['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'json'];

const DEFAULT_TEMPLATE: TemplateInput = {
  name: '',
  description: '',
  urlPattern: '',
  options: {
    url: '',
    formats: ['markdown'],
    onlyMainContent: true,
    waitFor: 0,
    timeout: 15000,
    includeTags: [],
    excludeTags: [],
  },
};

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSave: (payload: TemplateInput) => void;
  isLoading?: boolean;
}

export function TemplateEditor({ open, onOpenChange, template, onSave, isLoading = false }: TemplateEditorProps) {
  const [formState, setFormState] = useState<TemplateInput>(() => (template ? mapTemplateToInput(template) : DEFAULT_TEMPLATE));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (open) {
      setFormState(template ? mapTemplateToInput(template) : DEFAULT_TEMPLATE);
      setErrors({});
      setWarnings({});
    }
  }, [open, template]);

  const validation = useMemo(() => validateTemplate(formState), [formState]);

  useEffect(() => {
    setWarnings(validation.warnings ?? {});
  }, [validation.warnings]);

  const toggleFormat = useCallback((format: ScrapeFormat) => {
    setFormState((prev) => {
      const current = prev.options.formats ?? [];
      const exists = current.includes(format);
      const next = exists ? current.filter((item) => item !== format) : [...current, format];
      return {
        ...prev,
        options: {
          ...prev.options,
          formats: next,
        },
      };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!validation.isValid) {
      setErrors(validation.errors);
      setWarnings(validation.warnings ?? {});
      return;
    }
    onSave(formState);
  }, [formState, onSave, validation]);

  const handleIncludeChange = (value: string) => {
    const tags = value.split('\n').map((tag) => tag.trim()).filter(Boolean);
    setFormState((prev) => ({
      ...prev,
      options: { ...prev.options, includeTags: tags },
    }));
  };

  const handleExcludeChange = (value: string) => {
    const tags = value.split('\n').map((tag) => tag.trim()).filter(Boolean);
    setFormState((prev) => ({
      ...prev,
      options: { ...prev.options, excludeTags: tags },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogTitle>{template ? 'Edit template' : 'New template'}</DialogTitle>
        <DialogDescription>Configure reusable scrape presets for Firecrawl jobs.</DialogDescription>

        <div className="mt-4 flex flex-col gap-6 md:flex-row">
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={formState.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                rows={3}
                value={formState.description ?? ''}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="template-pattern">URL pattern (regex)</Label>
              <Input
                id="template-pattern"
                placeholder="^https://docs\\.example\\.com"
                value={formState.urlPattern ?? ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, urlPattern: event.target.value }))
                }
              />
              {errors.urlPattern && <p className="text-xs text-red-500">{errors.urlPattern}</p>}
              {warnings.urlPattern && <p className="text-xs text-amber-500">{warnings.urlPattern}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="template-default-url">Default URL (optional)</Label>
              <Input
                id="template-default-url"
                placeholder="https://example.com"
                value={formState.options.url ?? ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({
                    ...prev,
                    options: { ...prev.options, url: event.target.value.trim() || undefined },
                  }))
                }
              />
              {warnings.url && <p className="text-xs text-amber-500">{warnings.url}</p>}
              {errors.url && <p className="text-xs text-red-500">{errors.url}</p>}
            </div>

            <div className="space-y-2">
              <Label>Formats</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_FORMATS.map((format) => {
                  const active = formState.options.formats?.includes(format);
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => toggleFormat(format)}
                      className={[
                        'flex items-center justify-between rounded border px-3 py-2 text-sm transition',
                        active
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                      ].join(' ')}
                    >
                      <span>{format}</span>
                      <span>{active ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
              {errors.formats && <p className="text-xs text-red-500">{errors.formats}</p>}
              {warnings.formats && <p className="text-xs text-amber-500">{warnings.formats}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="template-waitfor">Wait for (ms)</Label>
                <Input
                  id="template-waitfor"
                  type="number"
                  min={0}
                  max={30000}
                  value={formState.options.waitFor ?? 0}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setFormState((prev) => ({
                      ...prev,
                      options: { ...prev.options, waitFor: Number(event.target.value) || 0 },
                    }))
                }
                />
                {warnings.waitFor && <p className="text-xs text-amber-500">{warnings.waitFor}</p>}
                {errors.waitFor && <p className="text-xs text-red-500">{errors.waitFor}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="template-timeout">Timeout (ms)</Label>
                <Input
                  id="template-timeout"
                  type="number"
                  min={1000}
                  max={120000}
                  value={formState.options.timeout ?? 15000}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setFormState((prev) => ({
                      ...prev,
                      options: { ...prev.options, timeout: Number(event.target.value) || 0 },
                    }))
                }
                />
                {warnings.timeout && <p className="text-xs text-amber-500">{warnings.timeout}</p>}
                {errors.timeout && <p className="text-xs text-red-500">{errors.timeout}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <span>Only main content</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formState.options.onlyMainContent ?? true}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({
                    ...prev,
                    options: { ...prev.options, onlyMainContent: event.target.checked },
                  }))
                }
              />
            </div>

            <div className="grid gap-4">
              <div className="space-y-1">
                <Label htmlFor="template-include">Include selectors (one per line)</Label>
                <Textarea
                  id="template-include"
                  rows={3}
                  placeholder="article\nmain"
                  value={formState.options.includeTags?.join('\n') ?? ''}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleIncludeChange(event.target.value)}
                />
                {warnings.includeTags && <p className="text-xs text-amber-500">{warnings.includeTags}</p>}
                {errors.includeTags && <p className="text-xs text-red-500">{errors.includeTags}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="template-exclude">Exclude selectors (one per line)</Label>
                <Textarea
                  id="template-exclude"
                  rows={3}
                  placeholder="nav\nfooter"
                  value={formState.options.excludeTags?.join('\n') ?? ''}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleExcludeChange(event.target.value)}
                />
                {warnings.excludeTags && <p className="text-xs text-amber-500">{warnings.excludeTags}</p>}
                {errors.excludeTags && <p className="text-xs text-red-500">{errors.excludeTags}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {template ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </div>

          <div className="hidden w-[380px] md:block">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Preview</span>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview((prev) => !prev)}>
                  {showPreview ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" /> Show
                    </>
                  )}
                </Button>
              </div>
              {showPreview && (
                <TemplatePreview
                  template={formState}
                  compact
                  validationErrors={errors}
                  validationWarnings={warnings}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function mapTemplateToInput(template: Template): TemplateInput {
  return {
    name: template.name,
    description: template.description ?? '',
    urlPattern: template.urlPattern ?? '',
    options: {
      url: template.options.url,
      formats: template.options.formats ?? ['markdown'],
      onlyMainContent: template.options.onlyMainContent ?? true,
      waitFor: template.options.waitFor,
      timeout: template.options.timeout,
      includeTags: template.options.includeTags ?? [],
      excludeTags: template.options.excludeTags ?? [],
    },
  };
}

export type { TemplateEditorProps };
