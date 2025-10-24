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
      const response = await fetch(`${SERVICE_LAUNCHER_URL}/api/status`);
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 10000
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
    if (!statusData?.services) return;

    const downServices = statusData.services.filter(
      (service: ServiceStatus) => 
        service.status === 'down' && 
        CRITICAL_SERVICES.includes(service.id) &&
        !attemptedStarts.current.has(service.id)
    );

    downServices.forEach((service: ServiceStatus) => {
      console.warn(`[Auto-Recovery] Detected down service: ${service.name} (${service.id})`);
      attemptedStarts.current.add(service.id);
      autoStartMutation.mutate(service.id);
    });

    // Clear attempted starts for services that are back online
    statusData.services
      .filter((s: ServiceStatus) => s.status === 'ok')
      .forEach((s: ServiceStatus) => attemptedStarts.current.delete(s.id));

  }, [statusData, autoStartMutation]);

  return {
    isRecovering: autoStartMutation.isPending,
    lastRecoveryAttempt: autoStartMutation.variables
  };
}

