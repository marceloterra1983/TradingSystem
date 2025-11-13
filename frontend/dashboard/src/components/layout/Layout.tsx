import * as React from "react";
import { LayoutSidebar } from "./LayoutSidebar";
import { LayoutHeader } from "./LayoutHeader";
import { PageContent } from "./PageContent";
import { getPageById, getDefaultPage } from "../../data/navigation";
import { safeLocalStorageGet, safeLocalStorageSet } from "../../utils/browser";

export interface LayoutProps {
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  children?: React.ReactNode;
}

/**
 * Main Layout Component
 *
 * Features:
 * - Three-column layout (Sidebar + Header + Main Content)
 * - Collapsible sidebar with localStorage persistence
 * - Dynamic page routing controlled via React Router
 * - Responsive design (mobile-friendly)
 *
 * Usage:
 * ```tsx
 * <Layout currentPageId={pageId} onPageChange={setPageId} />
 * ```
 */
export function Layout({ currentPageId, onPageChange }: LayoutProps) {
  // Sidebar collapse state - always start expanded
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = safeLocalStorageGet("sidebar-collapsed");
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
    const saved = safeLocalStorageGet("sidebar-width");
    if (!saved) {
      return 280;
    }
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 280; // Default to 280px
  });

  // Persist sidebar state to localStorage
  React.useEffect(() => {
    safeLocalStorageSet("sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Persist sidebar width to localStorage
  React.useEffect(() => {
    safeLocalStorageSet("sidebar-width", sidebarWidth.toString());
  }, [sidebarWidth]);

  const handleToggleCollapse = React.useCallback(() => {
    setIsCollapsed((prev: boolean) => !prev);
  }, []);

  // Get current page data
  const currentPage = React.useMemo(() => {
    return getPageById(currentPageId) || getDefaultPage();
  }, [currentPageId]);

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--ts-base-bg)] text-[color:var(--ts-text-primary)] transition-colors duration-200">
      {/* Sidebar */}
      <LayoutSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        currentPageId={currentPageId}
        onPageChange={onPageChange}
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <PageContent page={currentPage} />
        </main>
      </div>
    </div>
  );
}

export default Layout;
