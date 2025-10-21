import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DownloadIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  CodeIcon,
  FileJsonIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ScrapeFormat, ScrapeResult, CrawlResult } from '@/types';
import { ScreenshotViewer } from './ScreenshotViewer';
import {
  downloadAllFormats,
  downloadMarkdown,
  downloadHTML,
  downloadJSON,
  downloadLinks,
  downloadRawHtml
} from '@/utils/download';

export interface ResultsViewerProps {
  result: ScrapeResult | CrawlResult | null;
  selectedFormats: ScrapeFormat[];
}

// Type guard for CrawlResult
const isCrawlResult = (result: ScrapeResult | CrawlResult): result is CrawlResult => {
  const data = (result as CrawlResult).data;
  return typeof data?.id === 'string';
};

export function ResultsViewer({ result, selectedFormats }: ResultsViewerProps) {
  // If no result, show empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <FileTextIcon className="h-12 w-12 mb-4" />
        <p>Execute a scrape or crawl to preview results</p>
      </div>
    );
  }

  // If there's an error, show error state
  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex">
          <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Scraping failed</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If it's a crawl job that just started, show success state with job ID
  if (isCrawlResult(result)) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Crawl job started successfully
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Job ID: {result.data?.id ?? 'Unknown'}
            </p>
            <p className="mt-2 text-sm">
              <Link
                to="/history"
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                View job status in History →
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine available tabs based on result data
  const selectedFormatSet = useMemo(() => new Set(selectedFormats), [selectedFormats]);
  const allowFormat = useCallback(
    (format: ScrapeFormat | ScrapeFormat[]) => {
      if (selectedFormatSet.size === 0) {
        return true;
      }
      const formats = Array.isArray(format) ? format : [format];
      return formats.some(item => selectedFormatSet.has(item));
    },
    [selectedFormatSet]
  );

  const screenshotLabel = useMemo(() => {
    if (selectedFormatSet.has('screenshot@fullPage') && !selectedFormatSet.has('screenshot')) {
      return 'Full Page Screenshot';
    }
    return 'Screenshot';
  }, [selectedFormatSet]);

  const data = result.data;

  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        No content returned for this scrape. Try adjusting the selected formats or scrape options.
      </div>
    );
  }

  const availableTabs = useMemo(() => {
    const tabs: Array<{ value: string; label: string; icon: JSX.Element }> = [];

    if (data.markdown && allowFormat('markdown')) {
      tabs.push({
        value: 'markdown',
        label: 'Markdown',
        icon: <FileTextIcon className="h-4 w-4" />
      });
    }

    if (data.html && allowFormat('html')) {
      tabs.push({
        value: 'html',
        label: 'HTML',
        icon: <CodeIcon className="h-4 w-4" />
      });
    }

    if (data.rawHtml && allowFormat('rawHtml')) {
      tabs.push({
        value: 'rawHtml',
        label: 'Raw HTML',
        icon: <CodeIcon className="h-4 w-4" />
      });
    }

    if (data.links?.length && allowFormat('links')) {
      tabs.push({
        value: 'links',
        label: 'Links',
        icon: <LinkIcon className="h-4 w-4" />
      });
    }

    if (data.screenshot && allowFormat(['screenshot', 'screenshot@fullPage'])) {
      tabs.push({
        value: 'screenshot',
        label: screenshotLabel,
        icon: <ImageIcon className="h-4 w-4" />
      });
    }

    if (data.metadata && allowFormat('json')) {
      tabs.push({
        value: 'json',
        label: 'JSON',
        icon: <FileJsonIcon className="h-4 w-4" />
      });
    }

    return tabs;
  }, [allowFormat, data, screenshotLabel]);

  const handleDownloadAll = () => {
    downloadAllFormats(data, undefined, selectedFormats);
  };

  return (
    <div className="space-y-4">
      {/* Download Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadAll}
          className="flex items-center"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      {availableTabs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          No previewable content for the selected formats. Adjust your selection or download the raw files above.
        </div>
      ) : (
        <Tabs defaultValue={availableTabs[0]?.value} className="space-y-4">
          <TabsList>
            {availableTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center space-x-2"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

        {/* Markdown Tab */}
        {data.markdown && allowFormat('markdown') && (
          <TabsContent value="markdown" className="prose dark:prose-invert max-w-none">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadMarkdown(data.markdown!)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Markdown
              </Button>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {data.markdown}
            </ReactMarkdown>
          </TabsContent>
        )}

        {/* HTML Tab */}
        {data.html && allowFormat('html') && (
          <TabsContent value="html">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadHTML(data.html!)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            </div>
            <div className="border rounded-lg p-4">
              <iframe
                srcDoc={data.html}
                className="w-full min-h-[400px] border-0"
                sandbox="allow-same-origin"
                title="HTML Preview"
              />
            </div>
          </TabsContent>
        )}

        {/* Raw HTML Tab */}
        {data.rawHtml && allowFormat('rawHtml') && (
          <TabsContent value="rawHtml">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadRawHtml(data.rawHtml!)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Raw HTML
              </Button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
              <code>{data.rawHtml}</code>
            </pre>
          </TabsContent>
        )}
        {data.links?.length && allowFormat('links') && (
          <TabsContent value="links">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.links.length} links extracted
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadLinks(data.links!)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Links
              </Button>
            </div>
            <ul className="space-y-2">
              {data.links.map((link, index) => (
                <li
                  key={`${link}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    {link}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(link)}
                  >
                    Copy
                  </Button>
                </li>
              ))}
            </ul>
          </TabsContent>
        )}

        {/* Screenshot Tab */}
        {data.screenshot && allowFormat(['screenshot', 'screenshot@fullPage']) && (
          <TabsContent value="screenshot">
            <ScreenshotViewer screenshot={data.screenshot} />
          </TabsContent>
        )}

        {/* JSON Tab */}
        {data.metadata && allowFormat('json') && (
          <TabsContent value="json">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadJSON(data.metadata!)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
              <code>{JSON.stringify(data.metadata, null, 2)}</code>
            </pre>
          </TabsContent>
        )}
        </Tabs>
      )}
    </div>
  );
}
