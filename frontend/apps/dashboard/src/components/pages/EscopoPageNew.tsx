import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  EscopoOverview,
  EscopoObjectives,
  EscopoArchitecture,
  EscopoTechStack,
  EscopoSystems,
  EscopoRequirements,
  EscopoConstraints,
} from './EscopoPage';

/**
 * Escopo Page (New) - With Customizable Layout
 * Project scope overview with drag-and-drop grid layout
 */

export function EscopoPageNew() {
  const sections = [
    {
      id: 'overview',
      content: <EscopoOverview />,
    },
    {
      id: 'objectives',
      content: <EscopoObjectives />,
    },
    {
      id: 'architecture',
      content: <EscopoArchitecture />,
    },
    {
      id: 'tech-stack',
      content: <EscopoTechStack />,
    },
    {
      id: 'systems',
      content: <EscopoSystems />,
    },
    {
      id: 'requirements',
      content: <EscopoRequirements />,
    },
    {
      id: 'constraints',
      content: <EscopoConstraints />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="escopo"
      title="Project Scope"
      subtitle="Complete scope and architecture reference for the TradingSystem"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default EscopoPageNew;
