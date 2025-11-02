import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { downloadFile } from '../../utils/download';
import type {
  ScrapeData,
  CrawlResultData,
} from '../../services/firecrawlService';

type ResultsData = ScrapeData | CrawlResultData | Record<string, unknown>;

type ViewerResult = {
  success?: boolean;
  error?: string;
  data?: ResultsData;
};

interface ResultsViewerProps {
  result: ViewerResult;
  selectedFormats: string[];
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  result,
  selectedFormats,
}) => {
  if (!result?.data) return null;

  const data = result.data as ResultsData;
  const dataRecord = data as Record<string, unknown>;

  const availableTabs = Object.entries(dataRecord)
    .filter(([key]) => key !== 'rawHtml' && selectedFormats.includes(key)) // Handle raw HTML separately and respect selected formats
    .map(([key]) => key);

  const rawHtmlValue = dataRecord['rawHtml'];
  const rawHtmlContent = typeof rawHtmlValue === 'string' ? rawHtmlValue : null;

  const hasData =
    availableTabs.length > 0 ||
    (rawHtmlContent && selectedFormats.includes('rawHtml'));

  if (!hasData) {
    return (
      <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        <p className="font-medium">No Data Available</p>
        <p className="mt-1">
          No content is available in the selected formats. Try selecting
          different output formats or verify the scraping options.
        </p>
      </div>
    );
  }

  const handleRawHtmlDownload = () => {
    if (!rawHtmlContent) {
      return;
    }
    const timestamp = new Date().getTime();
    downloadFile(
      `scrape-result-${timestamp}-raw.html`,
      'text/html;charset=utf-8',
      rawHtmlContent,
    );
  };

  const handleDownload = (format: string, content: unknown) => {
    const timestamp = new Date().getTime();
    const extension = format === 'json' ? 'json' : 'txt';
    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const formattedContent =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    downloadFile(
      `scrape-result-${timestamp}.${extension}`,
      mimeType,
      formattedContent,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Results</h3>
        <div className="space-x-2">
          {rawHtmlContent && selectedFormats.includes('rawHtml') && (
            <Button variant="outline" onClick={handleRawHtmlDownload}>
              Download Raw HTML
            </Button>
          )}
          <Link
            to="#/history"
            className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            View History
          </Link>
        </div>
      </div>

      {availableTabs.length > 0 && (
        <Tabs defaultValue={availableTabs[0]} className="w-full">
          <TabsList className="w-full justify-start">
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {availableTabs.map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="relative rounded-md border dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => handleDownload(tab, dataRecord[tab])}
                >
                  Download
                </Button>
                <pre className="max-h-96 overflow-auto p-4 text-sm">
                  {typeof dataRecord[tab] === 'string'
                    ? (dataRecord[tab] as string)
                    : JSON.stringify(dataRecord[tab], null, 2)}
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
