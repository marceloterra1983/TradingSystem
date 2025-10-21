import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useImportTemplates,
  useTemplates,
  useUpdateTemplate
} from '@/hooks/useWebScraper';
import { useScrapingStore } from '@/store/scrapingStore';
import { Template, TemplateInput } from '@/types';
import {
  TemplateList,
  TemplateEditor,
  TemplateImport
} from '@/components/templates';

export function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const importTemplates = useImportTemplates();
  const { applyTemplate } = useScrapingStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSave = (payload: TemplateInput) => {
    if (editingTemplate) {
      updateTemplate.mutate(
        { templateId: editingTemplate.id, payload },
        {
          onSuccess: () => {
            setEditorOpen(false);
            setEditingTemplate(null);
          }
        }
      );
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => {
          setEditorOpen(false);
        }
      });
    }
  };

  const handleDuplicate = (template: Template) => {
    const payload: TemplateInput = {
      name: `${template.name} copy`,
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
    createTemplate.mutate(payload);
  };

  const handleApply = (template: Template) => {
    applyTemplate(template);
    window.location.hash = '#scraping';
  };

  const handleDelete = (templateId: string) => {
    deleteTemplate.mutate(templateId);
  };

  const handleImport = (templates: TemplateInput[]) => {
    importTemplates.mutate(templates, {
      onSuccess: () => setImportOpen(false)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Template library
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure reusable scrapes to accelerate future jobs and automations.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('/api/webscraper/templates/export', '_blank')}
          >
            Export JSON
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          className="border-none bg-transparent p-0 focus-visible:ring-0"
          placeholder="Search templates by name, description or URL pattern..."
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {templates?.length ? `${templates.length} templates available.` : 'No templates created yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateList
            templates={templates ?? []}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onApply={handleApply}
            isDeleting={deleteTemplate.isPending}
          />
        </CardContent>
      </Card>

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      <TemplateImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        isLoading={importTemplates.isPending}
      />
    </div>
  );
}