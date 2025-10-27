import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { LocalServicesSection } from './launcher/LocalServicesSection';
import { DockerContainersSection } from './launcher/DockerContainersSection';
import { EndpointsSection } from './launcher/EndpointsSection';
import { ContainerEndpointsSection } from './launcher/ContainerEndpointsSection';
import { StartMetricsSection } from './launcher/StartMetricsSection';

/**
 * Launcher Page - Service Management
 * Centralized service launcher and health monitoring
 * Divided into five main sections:
 * 1. Start Metrics (Metrics from last system start)
 * 2. Local Services (Node.js/Express APIs status & health)
 * 3. Docker Containers (Container status & management)
 * 4. API Endpoints (REST endpoints from local services)
 * 5. Container Endpoints (Web UIs & APIs from Docker containers)
 */

export function LauncherPage() {
  const sections = [
    {
      id: 'start-metrics',
      content: <StartMetricsSection />,
    },
    {
      id: 'local-services',
      content: <LocalServicesSection />,
    },
    {
      id: 'docker-containers',
      content: <DockerContainersSection />,
    },
    {
      id: 'endpoints',
      content: <EndpointsSection />,
    },
    {
      id: 'container-endpoints',
      content: <ContainerEndpointsSection />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="launcher"
      title="Service Launcher"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default LauncherPage;
