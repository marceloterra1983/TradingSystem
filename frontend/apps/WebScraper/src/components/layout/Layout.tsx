import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { firecrawlService } from '../../services/firecrawlService';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { safeLocalStorageGet, safeLocalStorageSet } from '../../utils/browser';
import { NAV_ITEMS } from '../../constants/navigation';

const SIDEBAR_STORAGE_KEY = 'webscraper-sidebar-collapsed';

export function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const stored = safeLocalStorageGet(SIDEBAR_STORAGE_KEY);
    return stored === '1';
  });

  const { data: firecrawlHealth } = useQuery({
    queryKey: ['firecrawl', 'health'],
    queryFn: () => firecrawlService.healthCheck(),
    refetchInterval: 15_000,
    staleTime: 15_000
  });

  const pageMeta = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const basePath = segments.length > 0 ? `/${segments[0]}` : '/';
    return NAV_ITEMS.find(item => item.path === basePath) ?? NAV_ITEMS[0];
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      safeLocalStorageSet(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar
        items={NAV_ITEMS}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <Header
          title={pageMeta.label}
          description={pageMeta.description}
          onToggleSidebar={toggleSidebar}
          isSidebarCollapsed={sidebarCollapsed}
          firecrawlStatus={firecrawlHealth?.status ?? 'error'}
          firecrawlError={firecrawlHealth?.error}
        />
        <main className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
