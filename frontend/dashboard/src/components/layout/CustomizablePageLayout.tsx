import { ReactNode, useState, useMemo } from 'react';
import { useCustomLayout, ColumnCount } from '../../hooks/useCustomLayout';
import { LayoutControls } from './LayoutControls';
import { DraggableGridLayout } from './DraggableGridLayout';
import { safeLocalStorageSet, safeDispatchEvent } from '../../utils/browser';

/**
 * Customizable Page Layout
 * Provides a full page layout with customizable grid and drag-and-drop
 */

export interface PageSection {
  id: string;
  content: ReactNode;
}

interface CustomizablePageLayoutProps {
  /** Unique page identifier for layout persistence */
  pageId: string;
  /** Page title */
  title: string;
  /** Page subtitle (optional) */
  subtitle?: string;
  /** Sections to be laid out */
  sections: PageSection[];
  /** Default number of columns */
  defaultColumns?: ColumnCount;
  /** Optional left-aligned actions rendered beside layout controls */
  leftActions?: ReactNode;
}

export function CustomizablePageLayout({
  pageId,
  title: _title,
  subtitle: _subtitle,
  sections,
  defaultColumns = 2,
  leftActions,
}: CustomizablePageLayoutProps) {
  const {
    columns,
    setColumns,
    getComponentColumn,
    moveComponent,
    reorderWithinColumn,
    getComponentsInColumn,
    resetLayout,
  } = useCustomLayout({
    pageId,
    componentIds: sections.map((s) => s.id),
    defaultColumns,
  });

  // State for tracking collapsed cards
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Toggle collapse/expand all cards
  const handleToggleCollapseAll = () => {
    const newState = !allCollapsed;
    setAllCollapsed(newState);

    // Update localStorage for all card IDs
    sections.forEach((section) => {
      safeLocalStorageSet(
        `card-collapsed-${section.id}`,
        JSON.stringify(newState),
      );
    });

    // Trigger a custom event to notify CollapsibleCard components
    safeDispatchEvent('collapse-all-cards', { collapsed: newState });
  };

  // Prepare components for DraggableGridLayout - use ordered list
  const sectionMap = useMemo(() => {
    const map = new Map<string, PageSection>();
    sections.forEach((section) => map.set(section.id, section));
    return map;
  }, [sections]);

  const components = useMemo(() => {
    const ordered: {
      id: string;
      columnIndex: number;
      content: ReactNode;
    }[] = [];
    const seen = new Set<string>();

    for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
      const idsInColumn = getComponentsInColumn(columnIndex);
      idsInColumn.forEach((id) => {
        if (seen.has(id)) {
          return;
        }

        const section = sectionMap.get(id);
        if (section) {
          ordered.push({
            id: section.id,
            columnIndex,
            content: section.content,
          });
          seen.add(id);
        }
      });
    }

    sections.forEach((section) => {
      if (seen.has(section.id)) {
        return;
      }

      ordered.push({
        id: section.id,
        columnIndex: getComponentColumn(section.id),
        content: section.content,
      });
      seen.add(section.id);
    });

    return ordered;
  }, [
    columns,
    getComponentsInColumn,
    getComponentColumn,
    sectionMap,
    sections,
  ]);

  return (
    <div className="h-full flex flex-col">
      {/* Layout Controls */}
      <div
        className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center ${
          leftActions ? 'sm:justify-between' : 'sm:justify-end'
        }`}
      >
        {leftActions ? (
          <div className="flex flex-wrap items-center gap-2">{leftActions}</div>
        ) : null}
        <div className="flex justify-end sm:justify-end">
          <LayoutControls
            columns={columns}
            onColumnsChange={setColumns}
            onReset={resetLayout}
            onToggleCollapseAll={handleToggleCollapseAll}
            allCollapsed={allCollapsed}
          />
        </div>
      </div>

      {/* Draggable Grid - Direct rendering without wrapper card */}
      <div className="flex-1">
        <DraggableGridLayout
          columns={columns}
          components={components}
          onComponentMove={moveComponent}
          onReorderWithinColumn={reorderWithinColumn}
        />
      </div>
    </div>
  );
}
