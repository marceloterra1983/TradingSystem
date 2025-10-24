import { useMemo } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { WorkspaceListSection } from './workspace/components/WorkspaceListSection';
import { StatusBoardSection } from './workspace/components/StatusBoardSection';
import { useInitializeWorkspaceEvents } from './workspace/store/useWorkspaceStore';

/**
 * Workspace Page - Embedded in Dashboard
 * Shows workspace sections directly (no iframe)
 */
export function WorkspaceEmbedPage() {
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
    []
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

export default WorkspaceEmbedPage;

