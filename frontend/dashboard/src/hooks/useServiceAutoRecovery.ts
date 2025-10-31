import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiUrl } from '../config/api';

const SERVICE_LAUNCHER_URL = getApiUrl('serviceLauncher');

interface ServiceStatus {
  id: string;
  name: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
}

interface AutoStartResult {
  success: boolean;
  message?: string;
  error?: string;
}

const CRITICAL_SERVICES = [
  'workspace-api',
  'documentation-api'
];

async function autoStartService(serviceId: string): Promise<AutoStartResult> {
  const response = await fetch(`${SERVICE_LAUNCHER_URL}/api/auto-start/${serviceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

export function useServiceAutoRecovery() {
  const attemptedStarts = useRef<Set<string>>(new Set());

  const { data: statusData } = useQuery({
    queryKey: ['service-launcher-status'],
    queryFn: async () => {
      try {
        const response = await fetch(`${SERVICE_LAUNCHER_URL}/api/status`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn('[Auto-Recovery] Failed to fetch service status:', error);
        return null;
      }
    },
    refetchInterval: false,
    staleTime: 10000,
    retry: false
  });

  const autoStartMutation = useMutation({
    mutationFn: autoStartService,
    onSuccess: (data, serviceId) => {
      if (data.success) {
        console.info(`[Auto-Recovery] Started ${serviceId}:`, data.message);
      }
    },
    onError: (error, serviceId) => {
      console.error(`[Auto-Recovery] Failed to start ${serviceId}:`, error);
    }
  });

  useEffect(() => {
    if (!statusData?.services) {
      console.log('[Auto-Recovery] No service data available');
      return;
    }

    console.log('[Auto-Recovery] Checking services...', {
      totalServices: statusData.services.length,
      attemptedStarts: Array.from(attemptedStarts.current)
    });

    const downServices = statusData.services.filter(
      (service: ServiceStatus) => 
        service.status === 'down' && 
        CRITICAL_SERVICES.includes(service.id) &&
        !attemptedStarts.current.has(service.id)
    );

    console.log('[Auto-Recovery] Critical services down:', downServices.map((s: ServiceStatus) => s.id));

    downServices.forEach((service: ServiceStatus) => {
      console.warn(`[Auto-Recovery] Attempting to start: ${service.name} (${service.id})`);
      attemptedStarts.current.add(service.id);
      autoStartMutation.mutate(service.id);
    });

    // Clear attempted starts for services that are back online
    statusData.services
      .filter((s: ServiceStatus) => s.status === 'ok')
      .forEach((s: ServiceStatus) => {
        if (attemptedStarts.current.has(s.id)) {
          console.log(`[Auto-Recovery] Service ${s.id} is back online, clearing attempt`);
          attemptedStarts.current.delete(s.id);
        }
      });

  }, [statusData, autoStartMutation]);

  return {
    isRecovering: autoStartMutation.isPending,
    lastRecoveryAttempt: autoStartMutation.variables
  };
}
