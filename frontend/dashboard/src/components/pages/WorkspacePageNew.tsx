import { useMemo } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
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
    <CustomizablePageLayout
      pageId="workspace"
      title="Workspace"
      subtitle="Gestão de ideias, funcionalidades e backlog do projeto"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default WorkspacePageNew;

