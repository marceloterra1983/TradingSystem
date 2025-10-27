import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NAVIGATION_DATA, Section } from '../../data/navigation';
import { isBrowser } from '../../utils/browser';
import { Logo } from '../ui/logo';

export interface LayoutSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

/**
 * Layout Sidebar Component
 *
 * Features:
 * - Collapsible (280px → 72px)
 * - Smooth spring animations via Framer Motion
 * - Section-based navigation with nested pages
 * - Active state highlighting
 * - Icon-only mode when collapsed
 *
 * Follows template specification exactly
 */
export function LayoutSidebar({
  isCollapsed,
  onToggleCollapse,
  currentPageId,
  onPageChange,
  width = 280,
  onWidthChange,
}: LayoutSidebarProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => {
    // Always expand all sections by default
    return new Set(NAVIGATION_DATA.map(section => section.id));
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const toggleSection = React.useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Handle horizontal resize functionality
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing || !onWidthChange) return;
    
    const newWidth = Math.max(200, Math.min(500, e.clientX));
    onWidthChange(newWidth);
  }, [isResizing, onWidthChange]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (!isBrowser) {
      return;
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <motion.aside
      ref={sidebarRef}
      initial={false}
      animate={{
        width: isCollapsed ? 72 : width,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="relative flex flex-col border-r border-gray-200 bg-card/40 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/40"
      style={{ width: isCollapsed ? '72px' : `${width}px` }}
    >
      {/* Logo Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Logo variant="compact" size="md" />
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <Logo variant="icon" size="sm" />
          </div>
        )}
        
        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-2">
          {NAVIGATION_DATA.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              isCollapsed={isCollapsed}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              currentPageId={currentPageId}
              onPageChange={onPageChange}
            />
          ))}
        </div>
      </nav>

      {/* Footer - System Info */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            height: isCollapsed ? 0 : 'auto',
          }}
          className="overflow-hidden"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="font-semibold">Dashboard v1.0.0</div>
            <div className="mt-1">React 18 + TypeScript</div>
          </div>
        </motion.div>
      </div>

      {/* Resize Handle - Only show when not collapsed and onWidthChange is provided */}
      {!isCollapsed && onWidthChange && (
        <div
          className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600 cursor-ew-resize transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 flex items-center justify-center">
            <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}
    </motion.aside>
  );
}

interface SidebarSectionProps {
  section: Section;
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  currentPageId: string;
  onPageChange: (pageId: string) => void;
}

function SidebarSection({
  section,
  isCollapsed,
  isExpanded,
  onToggle,
  currentPageId,
  onPageChange,
}: SidebarSectionProps) {
  // Check if any page in this section is active
  const hasActivePage = section.pages.some((page) => page.id === currentPageId);

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActivePage
            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? section.label : undefined}
      >
        <span className="flex-shrink-0">{section.icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{section.label}</span>
            <motion.div
              initial={false}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </>
        )}
      </button>

      {/* Section Pages */}
      {!isCollapsed && isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 space-y-1 overflow-hidden"
        >
          {section.pages.map((page) => {
            const isActive = page.id === currentPageId;

            return (
              <button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-cyan-100 font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                )}
              >
                {page.icon ? (
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center',
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {page.icon}
                  </span>
                ) : (
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isActive ? 'bg-cyan-600 dark:bg-cyan-400' : 'bg-gray-400 dark:bg-gray-600'
                    )}
                  />
                )}
                <span>{page.title}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default LayoutSidebar;
