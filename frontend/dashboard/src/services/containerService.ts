/**
 * Container Service
 *
 * API client for database container management.
 * Provides functions to start and check status of Docker containers via Service Launcher API.
 */

import { apiConfig } from '../config/api';

export interface StartContainerRequest {
  containerName: 'pgadmin' | 'pgweb' | 'adminer' | 'questdb';
}

export interface StartContainerResponse {
  success: boolean;
  containerName: string;
  message: string;
  healthy: boolean;
  timeout?: boolean;
  healthCheckUrl?: string;
  error?: string;
  category?: string;
  fallbackCommand?: string;
  timestamp: string;
}

export interface AllowedContainersResponse {
  success: boolean;
  containers: Record<string, {
    port: number;
    healthCheck: string;
  }>;
  timestamp: string;
}

class ContainerService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.serviceLauncherApi;
  }

  /**
   * Start a database tool container
   */
  async startContainer(
    containerName: StartContainerRequest['containerName']
  ): Promise<StartContainerResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/containers/${containerName}/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to start container: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get list of allowed containers
   */
  async getAllowedContainers(): Promise<AllowedContainersResponse> {
    const response = await fetch(`${this.baseUrl}/api/containers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch containers: ${response.statusText}`);
    }

    return response.json();
  }
}

export const containerService = new ContainerService();
