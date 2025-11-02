import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrapeFormat, ScrapeOptions } from '../../services/firecrawlService';

interface ScrapingFormProps {
  onSubmit: (options: ScrapeOptions) => void;
  loading?: boolean;
  error?: Error | null;
}

export const AVAILABLE_FORMATS: ScrapeFormat[] = [
  'markdown',
  'html',
  'rawHtml',
  'links',
  'screenshot',
  'screenshot@fullPage',
  'json',
];

export const ScrapingForm: React.FC<ScrapingFormProps> = ({
  onSubmit,
  loading,
  error,
}) => {
  const [url, setUrl] = React.useState('');
  const [formats, setFormats] = React.useState<ScrapeFormat[]>(['markdown']);
  const [onlyMainContent, setOnlyMainContent] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const options: ScrapeOptions = {
      url,
      formats,
      onlyMainContent,
    };
    onSubmit(options);
  };

  const handleToggleFormat = (format: ScrapeFormat) => {
    setFormats((prev) => {
      if (prev.includes(format)) {
        return prev.filter((f) => f !== format);
      }
      return [...prev, format];
    });
    if (errors.formats) {
      setErrors((prev) => {
        const { formats: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          URL
        </label>
        <Input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (errors.url) {
              setErrors((prev) => {
                const { url: _removed, ...rest } = prev;
                return rest;
              });
            }
          }}
          className={
            errors.url ? 'border-red-500 focus:ring-red-500' : undefined
          }
        />
        {errors.url && <p className="text-xs text-red-600">{errors.url}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Output Formats
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_FORMATS.map((format) => (
            <label
              key={format}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-cyan-500"
                checked={formats.includes(format)}
                onChange={() => handleToggleFormat(format)}
              />
              <span>{format}</span>
            </label>
          ))}
        </div>
        {errors.formats && (
          <p className="text-xs text-red-600">{errors.formats}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-cyan-500"
            checked={onlyMainContent}
            onChange={(e) => setOnlyMainContent(e.target.checked)}
          />
          Extract only main content (ignore nav bars, footers, ads)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || !url}>
          {loading ? 'Scraping...' : 'Scrape Page'}
        </Button>
        {error && (
          <p className="text-sm text-red-600">
            {error.message || 'An error occurred while scraping'}
          </p>
        )}
      </div>
    </form>
  );
};
