import { useMemo } from "react";
import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { WorkspaceListSection } from "./workspace/components/WorkspaceListSection";
import { StatusBoardSection } from "./workspace/components/StatusBoardSection";
import { CategoriesSection } from "./workspace/components/CategoriesSection";
import { useInitializeWorkspaceEvents } from "./workspace/store/useWorkspaceStore";

/**
 * Workspace Page - CRUD Table + Kanban Board + Categories Management
 * Three-section layout with customizable grid
 *
 * Sections:
 * 1. CategoriesSection - Categories CRUD management
 * 2. WorkspaceListSection - CRUD table with "+" button in header
 * 3. StatusBoardSection - Kanban board with drag & drop
 */

export function WorkspacePageNew() {
  useInitializeWorkspaceEvents();

  const sections = useMemo(
    () => [
      {
        id: "workspace-categories",
        content: <CategoriesSection />,
      },
      {
        id: "workspace-table",
        content: <WorkspaceListSection />,
      },
      {
        id: "workspace-kanban",
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
