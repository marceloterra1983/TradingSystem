import { MoreVertical, Menu, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { ConnectionStatus } from '../ConnectionStatus';
import { Clock } from '../ui/clock';
import { cn } from '../../lib/utils';
import { Page, getSectionByPageId } from '../../data/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { Logo } from '../ui/logo';
import { useCallback, useEffect, useState } from 'react';
import { endpointInfo, checkHealth, setMode, getMode, type ServiceMode } from '../../services/llamaIndexService';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export interface LayoutHeaderProps {
  currentPage: Page;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

/**
 * Layout Header Component
 *
 * Features:
 * - Fixed top with backdrop blur
 * - Shows current section and page title
 * - Action buttons (New, Actions)
 * - Connection status display
 * - Responsive behavior for mobile
 *
 * Follows template specification exactly
 */
export function LayoutHeader({
  currentPage,
  onToggleSidebar,
  isMobile = false,
}: LayoutHeaderProps) {
  const currentSection = getSectionByPageId(currentPage.id);
  const { resolvedTheme, toggleTheme } = useTheme();
  const [ragHealth, setRagHealth] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [ragResolved, setRagResolved] = useState<'proxy' | 'direct'>(endpointInfo().resolved);
  const [ragHealthUrl, setRagHealthUrl] = useState<string>('');
  const [headerMode, setHeaderMode] = useState<ServiceMode>(getMode());

  const refreshRagHealth = useCallback(async () => {
    const h = await checkHealth();
    setRagResolved(h.resolved);
    setRagHealth(h.status);
    setRagHealthUrl(h.url);
  }, []);

  useEffect(() => {
    refreshRagHealth();
    const id = setInterval(refreshRagHealth, 60000);
    return () => clearInterval(id);
  }, [refreshRagHealth]);

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md',
        'shadow-sm',
        'dark:border-gray-700 dark:bg-gray-900/80'
      )}
    >
      {/* Left side - Title & Context */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {isMobile && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        {/* Logo (mobile only) */}
        {isMobile && (
          <Logo variant="icon" size="sm" className="lg:hidden" />
        )}

        {/* Page Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {currentPage.title}
            </h1>
            {currentSection && currentSection.label !== 'Docs' && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {currentSection.label}
              </span>
            )}
          </div>
          {currentPage.header.subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentPage.header.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="hidden lg:flex">
          <ConnectionStatus showDetails />
        </div>

        {/* RAG Endpoint Health + Controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Compact status dot */}
          <span
            className={
              'inline-block h-2.5 w-2.5 rounded-full ' +
              (ragHealth === 'ok'
                ? 'bg-emerald-500'
                : ragHealth === 'error'
                ? 'bg-red-500'
                : 'bg-gray-400')
            }
            title={`RAG ${ragResolved.toUpperCase()} - ${ragHealth}`}
          />
          <button
            className="text-xs text-gray-600 dark:text-gray-300 hover:underline"
            title="Abrir LlamaIndex"
            onClick={() => { window.location.hash = '#/llamaindex-services'; }}
          >
            RAG
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              {ragHealth === 'ok' ? (
                <span className="rounded px-2 py-0.5 text-xs border border-emerald-400 text-emerald-700 cursor-help">{ragResolved.toUpperCase()}</span>
              ) : ragHealth === 'unknown' ? (
                <span className="rounded px-2 py-0.5 text-xs border border-gray-400 text-gray-700 cursor-help">...</span>
              ) : (
                <button
                  className="rounded px-2 py-0.5 text-xs border border-red-400 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Falha ao acessar endpoint RAG. Clique para alternar para proxy."
                  onClick={() => { setMode('proxy'); setHeaderMode('proxy'); refreshRagHealth(); }}
                >
                  {ragResolved.toUpperCase()} !
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs break-all">{ragHealthUrl || endpointInfo().url}</div>
            </TooltipContent>
          </Tooltip>
          {/* Mode selector */}
          <select
            className="text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-0.5"
            value={headerMode}
            onChange={(e) => { const m = e.target.value as ServiceMode; setMode(m); setHeaderMode(m); refreshRagHealth(); }}
            title="Modo do endpoint RAG"
          >
            <option value="auto">auto</option>
            <option value="proxy">proxy</option>
            <option value="direct">direct</option>
          </select>
          {/* Open Swagger (direct) */}
          <button
            className="text-xs rounded px-2 py-0.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Abrir Swagger do Query (direct)"
            onClick={() => {
              const env = import.meta.env as Record<string, string | undefined>;
              const direct = (env.VITE_LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
              window.open(`${direct}/docs`, '_blank', 'noopener,noreferrer');
            }}
          >
            Swagger
          </button>
        </div>

        {/* Clock */}
        <div className="hidden md:flex">
          <Clock showIcon timezone="(SP)" />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
            <span className="ml-1.5 hidden md:inline">Actions</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default LayoutHeader;
