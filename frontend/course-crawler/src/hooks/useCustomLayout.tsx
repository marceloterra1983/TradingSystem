import { useState, useEffect, useCallback } from 'react';
import {
  isBrowser,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../utils/browser';

/**
 * Custom Layout Hook
 * Manages customizable grid layout with drag-and-drop component arrangement
 * Persists layout configuration in localStorage per page
 */

export type ColumnCount = 1 | 2 | 3 | 4;

export interface LayoutConfig {
  columns: ColumnCount;
  /** Maps component ID to column index (0-based) */
  componentLayout: Record<string, number>;
  /** Order of components within each column */
  columnOrder: Record<number, string[]>;
}

interface UseCustomLayoutProps {
  /** Unique page identifier for localStorage persistence */
  pageId: string;
  /** List of component IDs to be laid out */
  componentIds: string[];
  /** Default number of columns */
  defaultColumns?: ColumnCount;
}

interface UseCustomLayoutReturn {
  /** Current number of columns */
  columns: ColumnCount;
  /** Set number of columns and redistribute components */
  setColumns: (cols: ColumnCount) => void;
  /** Get column index for a component */
  getComponentColumn: (componentId: string) => number;
  /** Move component to a specific column */
  moveComponent: (
    componentId: string,
    targetColumn: number,
    targetIndex?: number,
  ) => void;
  /** Reorder components within a column */
  reorderWithinColumn: (
    columnIndex: number,
    oldIndex: number,
    newIndex: number,
  ) => void;
  /** Get all components in a specific column (ordered) */
  getComponentsInColumn: (columnIndex: number) => string[];
  /** Reset layout to default */
  resetLayout: () => void;
}

const STORAGE_KEY_PREFIX = 'tradingSystem_layout_';

export function useCustomLayout({
  pageId,
  componentIds,
  defaultColumns = 2,
}: UseCustomLayoutProps): UseCustomLayoutReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}${pageId}`;

  // Initialize layout from localStorage or defaults
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    if (isBrowser) {
      try {
        const stored = safeLocalStorageGet(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as LayoutConfig;
          // Validate stored data
          if (
            parsed.columns &&
            parsed.componentLayout &&
            typeof parsed.componentLayout === 'object'
          ) {
            if (!parsed.columnOrder || typeof parsed.columnOrder !== 'object') {
              const defaultLayout = createDefaultLayout(
                componentIds,
                parsed.columns,
              );
              parsed.columnOrder = defaultLayout.columnOrder;
            } else {
              for (let i = 0; i < parsed.columns; i++) {
                if (!Array.isArray(parsed.columnOrder[i])) {
                  parsed.columnOrder[i] = [];
                }
              }
            }
            return parsed;
          }
        }
      } catch (error) {
        console.error(
          '[useCustomLayout] Failed to load layout from localStorage:',
          error,
        );
      }
    }

    // Default: distribute components evenly across columns
    return createDefaultLayout(componentIds, defaultColumns);
  });

  // Persist layout to localStorage whenever it changes
  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    try {
      safeLocalStorageSet(storageKey, JSON.stringify(layout));
    } catch (error) {
      console.error(
        '[useCustomLayout] Failed to save layout to localStorage:',
        error,
      );
    }
  }, [layout, storageKey]);

  // Ensure new components introduced after persistence are added to the layout
  useEffect(() => {
    setLayout((prev) => {
      const missingComponents = componentIds.filter(
        (id) => !(id in prev.componentLayout),
      );
      if (missingComponents.length === 0) {
        return prev;
      }

      const updatedComponentLayout = { ...prev.componentLayout };
      const updatedColumnOrder = { ...prev.columnOrder };

      missingComponents.forEach((id) => {
        updatedComponentLayout[id] = 0;
        if (!updatedColumnOrder[0]) {
          updatedColumnOrder[0] = [];
        }
        if (!updatedColumnOrder[0].includes(id)) {
          updatedColumnOrder[0] = [...updatedColumnOrder[0], id];
        }
      });

      return {
        ...prev,
        componentLayout: updatedComponentLayout,
        columnOrder: updatedColumnOrder,
      };
    });
  }, [componentIds]);

  // Set number of columns and redistribute components
  const setColumns = useCallback(
    (cols: ColumnCount) => {
      setLayout((prev) => {
        const sortedComponents = [...componentIds].sort((a, b) => {
          const colA = prev.componentLayout[a] ?? 0;
          const colB = prev.componentLayout[b] ?? 0;
          if (colA !== colB) {
            return colA - colB;
          }

          const orderA = prev.columnOrder[colA] ?? [];
          const indexA = orderA.indexOf(a);
          const indexB = orderA.indexOf(b);

          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          if (indexA !== -1) {
            return -1;
          }

          if (indexB !== -1) {
            return 1;
          }

          return 0;
        });

        return createDefaultLayout(sortedComponents, cols);
      });
    },
    [componentIds],
  );

  // Get column index for a component
  const getComponentColumn = useCallback(
    (componentId: string): number => {
      return layout.componentLayout[componentId] ?? 0;
    },
    [layout],
  );

  // Move component to a specific column
  const moveComponent = useCallback(
    (componentId: string, targetColumn: number, targetIndex?: number) => {
      setLayout((prev) => {
        const clampedColumn = Math.max(
          0,
          Math.min(targetColumn, prev.columns - 1),
        );
        const oldColumn = prev.componentLayout[componentId] ?? 0;

        // Update column order
        const newColumnOrder = { ...prev.columnOrder };

        const removeFromColumn = (column: number) => {
          const items = newColumnOrder[column] ?? [];
          newColumnOrder[column] = items.filter((id) => id !== componentId);
        };

        const insertIntoColumn = (column: number, index?: number) => {
          const existingItems = newColumnOrder[column] ?? [];
          const filteredItems = existingItems.filter(
            (id) => id !== componentId,
          );
          const insertionIndex =
            index === undefined
              ? filteredItems.length
              : Math.max(0, Math.min(index, filteredItems.length));
          filteredItems.splice(insertionIndex, 0, componentId);
          newColumnOrder[column] = filteredItems;
        };

        removeFromColumn(oldColumn);
        insertIntoColumn(clampedColumn, targetIndex);

        return {
          ...prev,
          componentLayout: {
            ...prev.componentLayout,
            [componentId]: clampedColumn,
          },
          columnOrder: newColumnOrder,
        };
      });
    },
    [],
  );

  // Reorder components within a column
  const reorderWithinColumn = useCallback(
    (columnIndex: number, oldIndex: number, newIndex: number) => {
      setLayout((prev) => {
        const baseItems = componentIds.filter((id) => {
          const col = prev.componentLayout[id] ?? 0;
          return col === columnIndex;
        });

        const existingOrder = prev.columnOrder[columnIndex] ?? [];
        const orderedItems = [
          ...existingOrder.filter((id) => baseItems.includes(id)),
          ...baseItems.filter((id) => !existingOrder.includes(id)),
        ];

        if (orderedItems.length === 0) {
          return prev;
        }

        const fromIndex = Math.max(
          0,
          Math.min(oldIndex, orderedItems.length - 1),
        );
        const toIndex = Math.max(
          0,
          Math.min(newIndex, orderedItems.length - 1),
        );

        if (fromIndex === toIndex) {
          return prev;
        }

        const updatedOrder = [...orderedItems];
        const [movedItem] = updatedOrder.splice(fromIndex, 1);

        if (!movedItem) {
          return prev;
        }

        updatedOrder.splice(toIndex, 0, movedItem);

        return {
          ...prev,
          columnOrder: {
            ...prev.columnOrder,
            [columnIndex]: updatedOrder,
          },
        };
      });
    },
    [componentIds],
  );

  // Get all components in a specific column (ordered)
  const getComponentsInColumn = useCallback(
    (columnIndex: number): string[] => {
      const columnOrder = layout.columnOrder[columnIndex] || [];
      const componentsInColumn = componentIds.filter((id) => {
        const col = layout.componentLayout[id] ?? 0;
        return col === columnIndex;
      });

      // Return ordered list if available, otherwise fallback to unordered
      if (columnOrder.length > 0) {
        // Ensure all components in column are in the order array
        const missingItems = componentsInColumn.filter(
          (id) => !columnOrder.includes(id),
        );
        return [
          ...columnOrder.filter((id) => componentsInColumn.includes(id)),
          ...missingItems,
        ];
      }

      return componentsInColumn;
    },
    [componentIds, layout],
  );

  // Reset layout to default
  const resetLayout = useCallback(() => {
    setLayout(createDefaultLayout(componentIds, defaultColumns));
  }, [componentIds, defaultColumns]);

  return {
    columns: layout.columns,
    setColumns,
    getComponentColumn,
    moveComponent,
    reorderWithinColumn,
    getComponentsInColumn,
    resetLayout,
  };
}

/**
 * Create default layout by distributing components evenly across columns
 */
function createDefaultLayout(
  componentIds: string[],
  columns: ColumnCount,
): LayoutConfig {
  const componentLayout: Record<string, number> = {};
  const columnOrder: Record<number, string[]> = {};

  // Initialize column order arrays
  for (let i = 0; i < columns; i++) {
    columnOrder[i] = [];
  }

  componentIds.forEach((id, index) => {
    const col = index % columns;
    componentLayout[id] = col;
    columnOrder[col].push(id);
  });

  return {
    columns,
    componentLayout,
    columnOrder,
  };
}
