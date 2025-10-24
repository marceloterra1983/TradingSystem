import { useMemo } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import type { Template } from '../../../types/webscraper';
import { ExternalLink, Pencil, Copy, Trash2, Loader2 } from 'lucide-react';
import { TemplatePreview } from './TemplatePreview';

interface TemplateListProps {
  templates: Template[];
  isLoading?: boolean;
  searchTerm: string;
  onApply: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (templateId: string) => void;
  isDeleting?: boolean;
  showPreview?: boolean;
}

export function TemplateList({
  templates,
  isLoading = false,
  searchTerm,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  isDeleting = false,
  showPreview = false,
}: TemplateListProps) {
  const filtered = useMemo(() => {
    if (!templates?.length) return [];
    if (!searchTerm) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter((template) =>
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.urlPattern?.toLowerCase().includes(term)
    );
  }, [templates, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading templates…</span>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {searchTerm
          ? 'No templates match your search. Try a different term or create a new template.'
          : 'No templates created yet. Create a template to reuse scraping settings.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((template) => (
        <div key={template.id} className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{template.name}</h3>
                <Badge variant="outline">{template.usageCount} uses</Badge>
                {template.urlPattern && <Badge variant="outline">Pattern</Badge>}
              </div>
              {template.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
              )}
              <p className="font-mono text-xs text-slate-400">ID: {template.id}</p>
              {template.urlPattern && (
                <p className="font-mono text-xs text-slate-400">Pattern: {template.urlPattern}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(template.options.formats ?? []).map((format: string) => (
                  <Badge key={format} variant="outline">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" onClick={() => onApply(template)}>
                <ExternalLink className="mr-2 h-4 w-4" /> Apply
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(template)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(template.id)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            </div>
          </div>
          {showPreview && (
            <div className="pl-4">
              <TemplatePreview template={template} compact />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export type { TemplateListProps };
