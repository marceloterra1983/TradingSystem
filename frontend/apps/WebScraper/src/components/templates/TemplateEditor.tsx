import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrapeFormat, Template, TemplateInput } from '@/types';
import { validateTemplate } from '@/utils/validation';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { TemplatePreview } from './TemplatePreview';
import { Eye, EyeOff } from 'lucide-react';

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
    excludeTags: []
  }
};

const AVAILABLE_FORMATS: ScrapeFormat[] = [
  'markdown',
  'html',
  'rawHtml',
  'links',
  'screenshot',
  'json'
];

export interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSave: (template: TemplateInput) => void;
  isLoading?: boolean;
}

export function TemplateEditor({ open, onOpenChange, template, onSave, isLoading = false }: TemplateEditorProps) {
  const [formState, setFormState] = useState<TemplateInput>(() => {
    if (template) {
      return {
        name: template.name,
        description: template.description ?? '',
        urlPattern: template.urlPattern ?? '',
        options: {
          url: template.options.url ?? '',
          formats: template.options.formats ?? ['markdown'],
          onlyMainContent: template.options.onlyMainContent ?? true,
          waitFor: template.options.waitFor,
          timeout: template.options.timeout,
          includeTags: template.options.includeTags,
          excludeTags: template.options.excludeTags
        }
      };
    }
    return DEFAULT_TEMPLATE;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);

  const resetForm = useCallback(() => {
    setFormState(template ? {
      name: template.name,
      description: template.description ?? '',
      urlPattern: template.urlPattern ?? '',
      options: {
        url: template.options.url ?? '',
        formats: template.options.formats ?? ['markdown'],
        onlyMainContent: template.options.onlyMainContent ?? true,
        waitFor: template.options.waitFor,
        timeout: template.options.timeout,
        includeTags: template.options.includeTags,
        excludeTags: template.options.excludeTags
      }
    } : DEFAULT_TEMPLATE);
    setErrors({});
    setWarnings({});
  }, [template]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      resetForm();
      setErrors({});
      setWarnings({});
    }
  }, [open, resetForm]);

  const validation = useMemo(() => validateTemplate(formState), [formState]);

  useEffect(() => {
    setWarnings(validation.warnings ?? {});
  }, [validation.warnings]);

  const handleSave = () => {
    if (!validation.isValid) {
      setErrors(validation.errors);
      if ('warnings' in validation) {
        setWarnings(validation.warnings ?? {});
      }
      return;
    }
    onSave(formState);
  };

  const toggleFormat = (format: ScrapeFormat) => {
    setFormState(prev => {
      const currentFormats = (prev.options.formats ?? []) as ScrapeFormat[];
      const exists = currentFormats.includes(format);
      const nextFormats = exists
        ? currentFormats.filter(item => item !== format)
        : [...currentFormats, format];
      return {
        ...prev,
        options: {
          ...prev.options,
          formats: nextFormats
        }
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogTitle>{template ? 'Edit template' : 'Create template'}</DialogTitle>
        <DialogDescription>
          Templates capture your scraping preferences and store them centrally.
        </DialogDescription>
        <div className="mt-4 flex gap-6">
          {/* Form Fields */}
          <div className="flex-1 space-y-4">
            <label className="space-y-1">
              <span className="text-sm font-medium">Name</span>
              <Input
                value={formState.name}
                onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Description (optional)</span>
              <Textarea
                rows={3}
                value={formState.description ?? ''}
                onChange={event => setFormState(prev => ({ ...prev, description: event.target.value }))}
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">URL pattern (regex)</span>
              <Input
                value={formState.urlPattern ?? ''}
                onChange={event => setFormState(prev => ({ ...prev, urlPattern: event.target.value }))}
                placeholder="^https://docs\\.example\\.com"
              />
              {errors.urlPattern && <p className="text-xs text-rose-500">{errors.urlPattern}</p>}
            </label>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Default URL (optional)</Label>
              <Input
                placeholder="https://example.com"
                value={formState.options.url ?? ''}
                onChange={event =>
                  setFormState(prev => ({
                    ...prev,
                    options: { ...prev.options, url: event.target.value.trim() || undefined }
                  }))
                }
              />
              {warnings.url && <p className="text-xs text-amber-500">{warnings.url}</p>}
              {errors.url && <p className="text-xs text-rose-500">{errors.url}</p>}
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-sm font-medium">Only main content</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  When enabled, Firecrawl removes navigation, sidebars, and unrelated sections.
                </p>
              </div>
              <Checkbox
                checked={formState.options.onlyMainContent ?? true}
                onCheckedChange={value =>
                  setFormState(prev => ({
                    ...prev,
                    options: { ...prev.options, onlyMainContent: !!value }
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Formats</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABLE_FORMATS.map(format => (
                  <label key={format} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <span className="text-sm">{format}</span>
                    <Checkbox
                      checked={formState.options.formats?.includes(format)}
                      onCheckedChange={() => toggleFormat(format)}
                    />
                  </label>
                ))}
              </div>
              {errors.formats && <p className="text-xs text-rose-500">{errors.formats}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Wait for (ms)</span>
                <Input
                  type="number"
                  min={0}
                  max={30000}
                  value={formState.options.waitFor ?? 0}
                  onChange={event =>
                    setFormState(prev => ({
                      ...prev,
                      options: { ...prev.options, waitFor: Number(event.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Timeout (ms)</span>
                <Input
                  type="number"
                  min={1000}
                  max={120000}
                  value={formState.options.timeout ?? 15000}
                  onChange={event =>
                    setFormState(prev => ({
                      ...prev,
                      options: { ...prev.options, timeout: Number(event.target.value) || 0 }
                    }))
                  }
                />
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Content Filters (optional)</span>
              <div className="grid gap-4">
                <label className="space-y-1">
                  <span className="text-sm">Include Tags</span>
                  <Textarea
                    placeholder="article\nmain"
                    value={formState.options.includeTags?.join('\n') ?? ''}
                    onChange={event => {
                      const tags = event.target.value
                        .split('\n')
                        .map(tag => tag.trim())
                        .filter(Boolean);
                      setFormState(prev => ({
                        ...prev,
                        options: { ...prev.options, includeTags: tags }
                      }));
                    }}
                    rows={3}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm">Exclude Tags</span>
                  <Textarea
                    placeholder="nav\nfooter"
                    value={formState.options.excludeTags?.join('\n') ?? ''}
                    onChange={event => {
                      const tags = event.target.value
                        .split('\n')
                        .map(tag => tag.trim())
                        .filter(Boolean);
                      setFormState(prev => ({
                        ...prev,
                        options: { ...prev.options, excludeTags: tags }
                      }));
                    }}
                    rows={3}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isLoading || !validation.isValid}
                isLoading={isLoading}
              >
                {template ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="hidden w-[400px] md:block">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Preview</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide preview
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Show preview
                    </>
                  )}
                </Button>
              </div>
              {showPreview && (
                <div className="overflow-auto">
                  <TemplatePreview
                    template={formState}
                    validationErrors={errors}
                    validationWarnings={warnings}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
