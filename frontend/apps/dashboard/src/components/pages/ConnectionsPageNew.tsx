import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  WebSocketStatusSection,
  ProfitDLLStatusSection,
  ServiceHealthSection,
} from './ConnectionsPage';

/**
 * Connections Page (New) - With Customizable Layout
 * System connections status with drag-and-drop grid layout
 */

export function ConnectionsPageNew() {
  const sections = [
    {
      id: 'websocket-status',
      content: <WebSocketStatusSection />,
    },
    {
      id: 'profitdll-status',
      content: <ProfitDLLStatusSection />,
    },
    {
      id: 'service-health',
      content: <ServiceHealthSection />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="conexoes"
      title="System Connections"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default ConnectionsPageNew;
