import * as React from 'react';
import { LayoutSidebar } from './LayoutSidebar';
import { LayoutHeader } from './LayoutHeader';
import { PageContent } from './PageContent';
import { ServiceStatusBanner } from '../ServiceStatusBanner';
import { getPageById, getDefaultPage } from '../../data/navigation';
import {
  isBrowser,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../../utils/browser';

export interface LayoutProps {
  children?: React.ReactNode;
  defaultPageId?: string;
}

/**
 * Main Layout Component
 *
 * Features:
 * - Three-column layout (Sidebar + Header + Main Content)
 * - Collapsible sidebar with localStorage persistence
 * - Dynamic page routing based on navigation structure
 * - Responsive design (mobile-friendly)
 *
 * Usage:
 * ```tsx
 * <Layout defaultPageId="dashboard">
 *   {children}
 * </Layout>
 * ```
 */
export function Layout({ defaultPageId }: LayoutProps) {
  // Sidebar collapse state - always start expanded
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = safeLocalStorageGet('sidebar-collapsed');
    if (!saved) {
      return false;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return false;
    }
  });

  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    const saved = safeLocalStorageGet('sidebar-width');
    if (!saved) {
      return 280;
    }
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 280; // Default to 280px
  });

  // Get initial page from hash or default
  const getInitialPage = React.useCallback(() => {
    const hash = isBrowser ? window.location.hash : ''; // e.g., '#/agents'
    const id = hash.startsWith('#/')
      ? hash.slice(2)
      : defaultPageId || getDefaultPage().id;
    return getPageById(id)?.id || getDefaultPage().id;
  }, [defaultPageId]);

  // Current page state - initialize from hash
  const [currentPageId, setCurrentPageId] = React.useState(getInitialPage);

  // Listen for hash changes to support browser navigation
  React.useEffect(() => {
    if (!isBrowser) {
      return;
    }
    const onHashChange = () => {
      const h = window.location.hash;
      const id = h.startsWith('#/') ? h.slice(2) : getDefaultPage().id;
      setCurrentPageId(getPageById(id)?.id || getDefaultPage().id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist sidebar state to localStorage
  React.useEffect(() => {
    safeLocalStorageSet('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Persist sidebar width to localStorage
  React.useEffect(() => {
    safeLocalStorageSet('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle page change with useCallback - update hash
  const handlePageChange = React.useCallback((pageId: string) => {
    if (isBrowser) {
      window.location.hash = `#/${pageId}`;
    }
    setCurrentPageId(pageId);
  }, []);

  const handleToggleCollapse = React.useCallback(() => {
    setIsCollapsed((prev: boolean) => !prev);
  }, []);

  // Get current page data
  const currentPage = React.useMemo(() => {
    return getPageById(currentPageId) || getDefaultPage();
  }, [currentPageId]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <LayoutSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        currentPageId={currentPageId}
        onPageChange={handlePageChange}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <LayoutHeader
          currentPage={currentPage}
          onToggleSidebar={handleToggleCollapse}
        />

        {/* Service Status Banner */}
        <ServiceStatusBanner />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <PageContent page={currentPage} />
        </main>
      </div>
    </div>
  );
}

export default Layout;
