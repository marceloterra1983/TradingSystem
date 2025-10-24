import { MoreVertical, Menu, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { ConnectionStatus } from '../ConnectionStatus';
import { cn } from '../../lib/utils';
import { Page, getSectionByPageId } from '../../data/navigation';
import { useTheme } from '../../contexts/ThemeContext';

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
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
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
