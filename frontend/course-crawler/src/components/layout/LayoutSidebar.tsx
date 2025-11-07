import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigationPages } from '../../data/navigation';

interface LayoutSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function LayoutSidebar({
  isCollapsed,
  onToggle,
  width,
}: LayoutSidebarProps) {
  const sidebarWidth = isCollapsed ? 64 : width;

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        {!isCollapsed && (
          <span className="font-semibold text-gray-900 dark:text-white">
            Navigation
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navigationPages.map((page) => (
            <NavLink
              key={page.id}
              to={`/${page.id}`}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`
              }
              title={isCollapsed ? page.label : undefined}
            >
              <span className="flex-shrink-0">{page.icon}</span>
              {!isCollapsed && <span className="truncate">{page.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Course Crawler v0.1.0
          </p>
        </div>
      )}
    </aside>
  );
}
