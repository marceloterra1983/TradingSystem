/**
 * useStartContainer Hook
 *
 * React hook for starting database tool containers via Service Launcher API.
 * Provides loading states, error handling, and toast notifications.
 */

import { useMutation } from '@tanstack/react-query';
import {
  containerService,
  StartContainerRequest,
  StartContainerResponse,
} from '../services/containerService';
import { useToast } from './useToast';
import { resolveErrorMessage } from '../utils/errors';

export function useStartContainer() {
  const toast = useToast();

  return useMutation<
    StartContainerResponse,
    unknown,
    StartContainerRequest['containerName']
  >({
    mutationFn: (containerName) =>
      containerService.startContainer(containerName),

    onSuccess: (result) => {
      if (result.success) {
        if (result.healthy) {
          toast.success(
            `Container ${result.containerName} started successfully and is healthy!`,
          );
        } else {
          toast.warning(
            `Container ${result.containerName} started but health check timed out. Refresh the page to retry.`,
          );
        }
      } else {
        toast.error(
          result.error || `Failed to start container ${result.containerName}`,
        );
      }
    },

    onError: (error) => {
      toast.error(resolveErrorMessage(error, 'Failed to start container'));
    },
  });
}
