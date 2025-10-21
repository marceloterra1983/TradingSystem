import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Template } from '@/types';
import { Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { TemplatePreview } from './TemplatePreview';

interface TemplateListProps {
  templates: Template[];
  isLoading: boolean;
  searchTerm: string;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onApply: (template: Template) => void;
  isDeleting?: boolean;
  showPreview?: boolean;
}

export function TemplateList({
  templates,
  isLoading,
  searchTerm,
  onEdit,
  onDuplicate,
  onDelete,
  onApply,
  isDeleting = false,
  showPreview = false
}: TemplateListProps) {
  const filteredTemplates = useMemo(() => {
    if (!templates?.length) return [];
    if (!searchTerm) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.urlPattern?.toLowerCase().includes(term)
    );
  }, [templates, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (filteredTemplates.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {searchTerm
          ? 'No templates match your search. Try a different term or create a new template.'
          : 'No templates created yet. Create a new one to bootstrap scraping jobs.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filteredTemplates.map(template => (
        <div key={template.id} className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {template.name}
                </h3>
                <Badge variant="outline">{template.usageCount} uses</Badge>
                {template.urlPattern && (
                  <Badge variant="default" className="bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-200">
                    Pattern
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
              )}
              <p className="font-mono text-xs text-slate-400">ID: {template.id}</p>
              {template.urlPattern && (
                <p className="font-mono text-xs text-slate-400">Pattern: {template.urlPattern}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(template.options.formats ?? []).map(format => (
                  <Badge key={format} variant="outline">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => onApply(template)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Apply
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(template)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(template.id)}
                isLoading={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
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