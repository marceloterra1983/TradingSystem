import { useMemo } from 'react';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { WorkspaceListSection } from './workspace/components/WorkspaceListSection';
import { StatusBoardSection } from './workspace/components/StatusBoardSection';
import { useInitializeWorkspaceEvents } from './workspace/store/useWorkspaceStore';

/**
 * Banco de Ideias Page (New) - With Customizable Layout
 * Idea bank with drag-and-drop grid layout
 */

export function WorkspacePageNew() {
  useInitializeWorkspaceEvents();

  const sections = useMemo(
    () => [
      {
        id: 'ideas-list',
        content: <WorkspaceListSection />,
      },
      {
        id: 'status-board',
        content: <StatusBoardSection />,
      },
    ],
    [],
  );

  return (
    <CustomizablePageLayout
      pageId="banco-ideias"
      title="Workspace"
      subtitle="Ideias, sugestões e brainstorming de funcionalidades"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default WorkspacePageNew;
