import { useMemo } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { WebScraperPanel } from './WebScraperPanel';
import { CrawlHistoryPanel } from './CrawlHistoryPanel';

export function FirecrawlPage() {
  const sections = useMemo(
    () => [
      {
        id: 'web-scraper',
        content: <WebScraperPanel />,
      },
      {
        id: 'crawl-history',
        content: <CrawlHistoryPanel />,
      },
    ],
    []
  );

  return (
    <CustomizablePageLayout
      pageId="firecrawl"
      title="Web Scraper"
      subtitle="AI-powered web scraping and content extraction with Firecrawl"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default FirecrawlPage;
