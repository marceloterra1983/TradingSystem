import { useQuery } from "@tanstack/react-query";

export interface RuntimeConfig {
  apiBaseUrl: string;
  messagesBaseUrl: string;
  channelsBaseUrl: string;
  authToken: string;
  environment: string;
  features: {
    authEnabled: boolean;
    metricsEnabled: boolean;
    queueMonitoringEnabled: boolean;
  };
}

interface RuntimeConfigResponse {
  success: boolean;
  data: RuntimeConfig;
  timestamp: string;
}

/**
 * Hook para buscar configuração em runtime do backend
 * Elimina dependência de variáveis VITE_* em build time
 *
 * Benefícios:
 * - Zero cache issues - config sempre fresh do servidor
 * - Zero rebuild necessário quando mudar tokens
 * - Tokens nunca expostos em JavaScript bundle
 * - Hot-reload automático de configuração
 */
export function useRuntimeConfig() {
  return useQuery<RuntimeConfig>({
    queryKey: ["runtime-config"],
    queryFn: async () => {
      // Primeiro tenta pegar do Gateway API
      const gatewayUrl =
        window.location.origin + "/api/telegram-gateway/config";

      const response = await fetch(gatewayUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Não precisa de auth header - endpoint /config é público
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch runtime config: ${response.status} ${response.statusText}`,
        );
      }

      const json = (await response.json()) as RuntimeConfigResponse;

      if (!json.success || !json.data) {
        throw new Error("Invalid runtime config response");
      }

      return json.data;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Garbage collect após 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para obter apenas o auth token
 * Conveniente para uso em componentes que só precisam do token
 */
export function useAuthToken(): string | undefined {
  const { data: config } = useRuntimeConfig();
  return config?.authToken;
}

/**
 * Hook para obter apenas as URLs da API
 */
export function useApiUrls() {
  const { data: config } = useRuntimeConfig();

  return {
    apiBaseUrl:
      config?.apiBaseUrl || "http://localhost:9082/api/telegram-gateway",
    messagesBaseUrl:
      config?.messagesBaseUrl || "http://localhost:9082/api/messages",
    channelsBaseUrl:
      config?.channelsBaseUrl || "http://localhost:9082/api/channels",
  };
}
