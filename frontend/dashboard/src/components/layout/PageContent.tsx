import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';
import { Page } from '../../data/navigation';

export interface PageContentProps {
  page: Page;
  defaultExpandedParts?: string[];
}

/**
 * Page Content Component
 *
 * Features:
 * - Renders page header (title + subtitle)
 * - Accordion-based collapsible parts
 * - Multiple parts can be open simultaneously
 * - Smooth animations
 * - ✅ Suspense wrapper for lazy-loaded pages
 *
 * Follows template specification exactly
 */
export function PageContent({ page, defaultExpandedParts = [] }: PageContentProps) {
  // If page has customContent, render it with Suspense wrapper for lazy loading
  if (page.customContent) {
    // Basic error boundary to avoid blank screen if a lazy chunk fails
    class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }>{
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }
      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }
      componentDidCatch() {}
      render() {
        if (this.state.hasError) {
          return (
            <div className="flex items-center justify-center p-8">
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <div className="font-medium">Falha ao carregar a página.</div>
                <div className="text-xs opacity-80">{this.state.error?.message || 'Erro desconhecido'}</div>
              </div>
            </div>
          );
        }
        return this.props.children as React.ReactElement;
      }
    }
    return (
      <div data-testid="page-content">
        <ErrorBoundary>
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-500 dark:border-gray-700 dark:border-t-cyan-400"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Carregando página...</p>
                </div>
              </div>
            }
          >
            {page.customContent}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  // By default, expand first part if no defaults provided
  const defaultValues = defaultExpandedParts.length > 0
    ? defaultExpandedParts
    : page.parts.length > 0
    ? [page.parts[0].id]
    : [];

  return (
    <div data-testid="page-content" className="space-y-6">
      {/* Internal Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {page.header.title}
        </h1>
        {page.header.subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {page.header.subtitle}
          </p>
        )}
      </div>

      {/* Accordion Parts */}
      {page.parts.length > 0 ? (
        <Accordion type="multiple" defaultValue={defaultValues}>
          {page.parts.map((part) => (
            <AccordionItem key={part.id} value={part.id}>
              <AccordionTrigger>{part.title}</AccordionTrigger>
              <AccordionContent>
                <div className="py-4">{part.content}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">No content sections available for this page.</p>
        </div>
      )}
    </div>
  );
}

export default PageContent;
