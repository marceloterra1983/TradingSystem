import { Menu, Moon, Sun, RefreshCcw, WifiOff, Wifi } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useTheme } from '../../contexts/ThemeContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface HeaderProps {
  title: string;
  description?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  firecrawlStatus: 'ok' | 'error';
  firecrawlError?: string;
}

export function Header({
  title,
  description,
  onToggleSidebar,
  isSidebarCollapsed,
  firecrawlStatus,
  firecrawlError
}: HeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={firecrawlStatus === 'ok' ? 'success' : 'danger'}
                className="cursor-default px-3 py-1"
              >
                {firecrawlStatus === 'ok' ? (
                  <span className="inline-flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5" /> Firecrawl Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <WifiOff className="h-3.5 w-3.5" /> Firecrawl Offline
                  </span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {firecrawlStatus === 'ok'
                ? 'Connected to firecrawl-proxy (port 3600)'
                : firecrawlError || 'Unable to reach firecrawl-proxy'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh view"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reload the application</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Switch theme</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
