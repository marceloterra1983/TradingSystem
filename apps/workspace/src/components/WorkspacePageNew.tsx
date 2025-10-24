import { useMemo } from 'react';
import { CustomizablePageLayout } from './layout/CustomizablePageLayout';
import { WorkspaceListSection } from './workspace/components/WorkspaceListSection';
import { StatusBoardSection } from './workspace/components/StatusBoardSection';
import { useInitializeWorkspaceEvents } from './workspace/store/useWorkspaceStore';

/**
 * Workspace Page - CRUD Table + Kanban Board
 * Two-section layout similar to TP-Capital structure
 * 
 * Sections:
 * 1. WorkspaceListSection - CRUD table with "+" button in header
 * 2. StatusBoardSection - Kanban board with drag & drop
 */

export function WorkspacePageNew() {
  useInitializeWorkspaceEvents();

  const sections = useMemo(
    () => [
      {
        id: 'workspace-table',
        content: <WorkspaceListSection />,
      },
      {
        id: 'workspace-kanban',
        content: <StatusBoardSection />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id}>{section.content}</div>
      ))}
    </div>
  );
}

export default WorkspacePageNew;
