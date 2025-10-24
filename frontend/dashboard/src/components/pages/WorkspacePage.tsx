import { AddItemSection } from './workspace/components/AddItemSection';
import { CategoriesSection } from './workspace/components/CategoriesSection';
import { StatusBoardSection } from './workspace/components/StatusBoardSection';
import { WorkspaceListSection } from './workspace/components/WorkspaceListSection';
import { useInitializeWorkspaceEvents } from './workspace/store/useWorkspaceStore';

/**
 * Workspace Page - Central hub for managing ideas and workspace items.
 * This component initializes the store and lays out the different sections.
 */
export function WorkspacePage() {
  // This hook initializes the store and sets up event listeners for auto-refresh
  useInitializeWorkspaceEvents();

  return (
    <div className="p-6 space-y-6">
      <AddItemSection />
      <WorkspaceListSection />
      <StatusBoardSection />
      <CategoriesSection />
    </div>
  );
}

export default WorkspacePage;