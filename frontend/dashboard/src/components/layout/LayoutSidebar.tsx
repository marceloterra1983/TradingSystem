import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, GripVertical } from "@/icons";
import { cn } from "../../lib/utils";
import { NAVIGATION_DATA, Section } from "../../data/navigation";
import { isBrowser } from "../../utils/browser";
import { Logo } from "../ui/logo";

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
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => {
      // Always expand all sections by default
      return new Set(NAVIGATION_DATA.map((section) => section.id));
    },
  );

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

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !onWidthChange) return;

      const newWidth = Math.max(200, Math.min(500, e.clientX));
      onWidthChange(newWidth);
    },
    [isResizing, onWidthChange],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (!isBrowser) {
      return;
    }
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
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
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className="relative flex flex-col border-r border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-muted)] backdrop-blur-lg transition-colors duration-200"
      style={{ width: isCollapsed ? "72px" : `${width}px` }}
    >
      {/* Logo Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--ts-surface-border)] p-4">
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
          className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--ts-surface-hover)]"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-[color:var(--ts-text-muted)]" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-[color:var(--ts-text-muted)]" />
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
      <div className="border-t border-[color:var(--ts-surface-border)] p-4">
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            height: isCollapsed ? 0 : "auto",
          }}
          className="overflow-hidden"
        >
          <div className="text-xs text-[color:var(--ts-text-muted)]">
            <div className="font-semibold">Dashboard v1.0.0</div>
            <div className="mt-1">React 18 + TypeScript</div>
          </div>
        </motion.div>
      </div>

      {/* Resize Handle - Only show when not collapsed and onWidthChange is provided */}
      {!isCollapsed && onWidthChange && (
        <div
          className="group absolute top-0 right-0 h-full w-1 cursor-ew-resize bg-transparent transition-colors hover:bg-[color:var(--ts-surface-hover)]/70"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-1/2 flex h-8 w-1 -translate-y-1/2 transform items-center justify-center">
            <GripVertical className="h-4 w-4 text-[color:var(--ts-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
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
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActivePage
            ? "bg-[color:var(--ts-accent-soft)] text-[color:var(--ts-accent-strong)]"
            : "text-[color:var(--ts-text-secondary)] hover:bg-[color:var(--ts-surface-hover)] hover:text-[color:var(--ts-text-primary)]",
          isCollapsed && "justify-center px-2",
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
              <ChevronRight className="h-4 w-4 text-[color:var(--ts-text-muted)]" />
            </motion.div>
          </>
        )}
      </button>

      {/* Section Pages */}
      {!isCollapsed && isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
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
                  "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-[color:var(--ts-accent-soft)] font-medium text-[color:var(--ts-accent-strong)]"
                    : "text-[color:var(--ts-text-muted)] hover:bg-[color:var(--ts-surface-hover)] hover:text-[color:var(--ts-text-primary)]",
                )}
              >
                {page.icon ? (
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center",
                      isActive
                        ? "text-[color:var(--ts-accent-strong)]"
                        : "text-[color:var(--ts-text-muted)]",
                    )}
                  >
                    {page.icon}
                  </span>
                ) : (
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isActive
                        ? "bg-[color:var(--ts-accent-strong)]"
                        : "bg-[color:var(--ts-text-muted)] opacity-60",
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
