import { FormEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon } from 'lucide-react';
import { useScrapingStore } from '@/store/scrapingStore';
import { useCreateTemplate } from '@/hooks/useWebScraper';
import { FormatSelector } from './FormatSelector';
import { AdvancedOptions } from './AdvancedOptions';
import type { ScrapeFormat } from '@/types';

export interface ScrapingFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
}

export function ScrapingForm({ onSubmit, isSubmitting }: ScrapingFormProps) {
  const store = useScrapingStore();
  const createTemplateMutation = useCreateTemplate();

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateUrlPattern, setTemplateUrlPattern] = useState('');
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  // Template validation
  const validateTemplate = () => {
    const errors: Record<string, string> = {};

    if (!templateName) {
      errors.name = 'Template name is required';
    } else if (templateName.length < 3) {
      errors.name = 'Template name must be at least 3 characters';
    }

    if (templateUrlPattern) {
      try {
        new RegExp(templateUrlPattern);
      } catch {
        errors.urlPattern = 'Invalid regex pattern';
      }
    }

    return errors;
  };

  const handleUrlChange = (value: string) => {
    store.setUrl(value);
    store.clearError('url');
  };

  const handleToggleFormat = (format: ScrapeFormat) => {
    store.toggleFormat(format);
  };

  // Template save handler
  const handleSaveTemplate = async () => {
    const errors = validateTemplate();
    setTemplateErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        await createTemplateMutation.mutateAsync({
          name: templateName,
          description: templateDescription,
          urlPattern: templateUrlPattern,
          options: store.options
        });
        setIsTemplateDialogOpen(false);
        setTemplateName('');
        setTemplateDescription('');
        setTemplateUrlPattern('');
      } catch (error) {
        console.error('Failed to save template:', error);
        setTemplateErrors({ submit: 'Failed to save template' });
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Target URL
        </label>
        <Input
          type="url"
          value={store.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com"
          className={store.errors.url ? 'border-red-500' : ''}
        />
        {store.errors.url && (
          <p className="text-sm text-red-600 dark:text-red-400">{store.errors.url}</p>
        )}
      </div>

      {/* Scrape Type Toggle */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={store.scrapeType === 'single' ? 'default' : 'outline'}
          onClick={() => store.setScrapeType('single')}
        >
          Single page
        </Button>
        <Button
          type="button"
          variant={store.scrapeType === 'crawl' ? 'default' : 'outline'}
          onClick={() => store.setScrapeType('crawl')}
        >
          Crawl site
        </Button>
      </div>

      {/* Template Section */}
      <div className="flex items-center space-x-2">
        <Badge variant="outline">
          Template: {store.selectedTemplate?.name || 'None'}
        </Badge>
        {store.templates.map(template => (
          <Button
            key={template.name}
            variant="outline"
            size="sm"
            onClick={() => store.applyTemplate(template)}
            className={store.selectedTemplate?.name === template.name ?
              'border-primary-500 bg-primary-50/40' : ''}
          >
            {template.name}
          </Button>
        ))}
      </div>

      {/* Format Selector */}
      <FormatSelector
        selectedFormats={store.formats}
        onToggleFormat={handleToggleFormat}
        error={store.errors.formats}
        onClearError={() => store.clearError('formats')}
      />

      {/* Advanced Options */}
      <AdvancedOptions
        scrapeType={store.scrapeType}
        waitFor={store.options.waitFor}
        timeout={store.options.timeout}
        limit={store.options.limit}
        maxDepth={store.options.maxDepth}
        includePaths={store.options.includePaths}
        excludePaths={store.options.excludePaths}
        includeTags={store.options.includeTags}
        excludeTags={store.options.excludeTags}
        onOptionsChange={store.setOptions}
        errors={store.errors}
        onClearError={store.clearError}
      />

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
            {store.scrapeType === 'single' ? 'Run scrape' : 'Launch crawl'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={store.reset}
          >
            Reset form
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsTemplateDialogOpen(true)}
        >
          Save as template
        </Button>
      </div>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Save as Template</Dialog.Title>
          </Dialog.Header>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className={templateErrors.name ? 'border-red-500' : ''}
              />
              {templateErrors.name && (
                <p className="text-sm text-red-600">{templateErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Description</label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">URL Pattern (regex)</label>
              <Input
                value={templateUrlPattern}
                onChange={(e) => setTemplateUrlPattern(e.target.value)}
                className={templateErrors.urlPattern ? 'border-red-500' : ''}
                placeholder="https://example\\.com/.*"
              />
              {templateErrors.urlPattern && (
                <p className="text-sm text-red-600">{templateErrors.urlPattern}</p>
              )}
            </div>

            {templateErrors.submit && (
              <p className="text-sm text-red-600">{templateErrors.submit}</p>
            )}
          </div>

          <Dialog.Footer>
            <Button
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending && (
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Template
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </form>
  );
}
