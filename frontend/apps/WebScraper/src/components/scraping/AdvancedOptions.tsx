import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrapeOptions, CrawlOptions } from '@/types';

export interface AdvancedOptionsProps {
  scrapeType: 'single' | 'crawl';
  waitFor?: number;
  timeout?: number;
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  onOptionsChange: (options: Partial<ScrapeOptions & CrawlOptions>) => void;
  errors?: Record<string, string>;
  onClearError?: (key: AdvancedOptionErrorKey) => void;
}

type AdvancedOptionErrorKey =
  | 'waitFor'
  | 'timeout'
  | 'limit'
  | 'maxDepth'
  | 'includePaths'
  | 'excludePaths'
  | 'includeTags'
  | 'excludeTags';

export function AdvancedOptions({
  scrapeType,
  waitFor,
  timeout,
  limit,
  maxDepth,
  includePaths = [],
  excludePaths = [],
  includeTags = [],
  excludeTags = [],
  onOptionsChange,
  errors = {},
  onClearError
}: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatListInput = (list: string[]): string => list.join('\n');

  const parseListInput = (input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const handleNumericChange = (key: 'waitFor' | 'timeout' | 'limit' | 'maxDepth') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    const parsedValue = value === '' ? undefined : Number(value);
    const numericValue = parsedValue === undefined || Number.isNaN(parsedValue) ? undefined : parsedValue;
    onOptionsChange({ [key]: numericValue } as Partial<ScrapeOptions & CrawlOptions>);
    onClearError?.(key);
  };

  const handleListChange = (
    key: 'includePaths' | 'excludePaths' | 'includeTags' | 'excludeTags'
  ) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const values = parseListInput(event.target.value);
    onOptionsChange({ [key]: values } as Partial<ScrapeOptions & CrawlOptions>);
    onClearError?.(key);
  };

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className="space-y-4"
    >
      <Collapsible.Trigger className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
        <span className="text-sm font-medium">Advanced Options</span>
        {isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </Collapsible.Trigger>

      <Collapsible.Content className="space-y-6">
        {/* Common Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Wait For (ms)</label>
            <Input
              type="number"
              min={0}
              max={30000}
              value={waitFor ?? ''}
              onChange={handleNumericChange('waitFor')}
              className={errors.waitFor ? 'border-red-500' : ''}
            />
            {errors.waitFor && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.waitFor}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Timeout (ms)</label>
            <Input
              type="number"
              min={1000}
              max={120000}
              value={timeout ?? ''}
              onChange={handleNumericChange('timeout')}
              className={errors.timeout ? 'border-red-500' : ''}
            />
            {errors.timeout && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.timeout}</p>
            )}
          </div>
        </div>

        {/* Crawl Options */}
        {scrapeType === 'crawl' && (
          <div className="space-y-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Crawl Settings</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Limit</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={limit ?? ''}
                  onChange={handleNumericChange('limit')}
                  className={errors.limit ? 'border-red-500' : ''}
                />
                {errors.limit && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.limit}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Depth</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxDepth ?? ''}
                  onChange={handleNumericChange('maxDepth')}
                  className={errors.maxDepth ? 'border-red-500' : ''}
                />
                {errors.maxDepth && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.maxDepth}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Include Paths</label>
              <Textarea
                value={formatListInput(includePaths)}
                onChange={handleListChange('includePaths')}
                placeholder="/docs\n/blog"
                className={errors.includePaths ? 'border-red-500' : ''}
              />
              {errors.includePaths && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.includePaths}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Exclude Paths</label>
              <Textarea
                value={formatListInput(excludePaths)}
                onChange={handleListChange('excludePaths')}
                placeholder="/privacy\n/contact"
                className={errors.excludePaths ? 'border-red-500' : ''}
              />
              {errors.excludePaths && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.excludePaths}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Filters */}
        <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Content Filters</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Include Selectors</label>
              <Textarea
                value={formatListInput(includeTags)}
                onChange={handleListChange('includeTags')}
                placeholder="article\nsection.content"
                className={errors.includeTags ? 'border-red-500' : ''}
              />
              {errors.includeTags && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.includeTags}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Exclude Selectors</label>
              <Textarea
                value={formatListInput(excludeTags)}
                onChange={handleListChange('excludeTags')}
                placeholder="nav\nfooter"
                className={errors.excludeTags ? 'border-red-500' : ''}
              />
              {errors.excludeTags && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.excludeTags}</p>
              )}
            </div>
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
