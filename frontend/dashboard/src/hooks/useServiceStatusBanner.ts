import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../config/api';

const SERVICE_LAUNCHER_URL = getApiUrl('serviceLauncher');

export function useServiceStatusBanner() {
  const { data } = useQuery({
    queryKey: ['service-launcher-status'],
    queryFn: async () => {
      try {
        const response = await fetch(`${SERVICE_LAUNCHER_URL}/api/status`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn('[ServiceStatusBanner] Failed to fetch service status:', error);
        return null;
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
    retry: false
  });

  const downCount = data?.downCount ?? 0;
  const degradedCount = data?.degradedCount ?? 0;
  const overallStatus = data?.overallStatus ?? 'unknown';

  return {
    shouldShowBanner: downCount > 0 || degradedCount > 0,
    downCount,
    degradedCount,
    overallStatus,
    downServices: data?.services?.filter((s: any) => s.status === 'down') ?? []
  };
}

