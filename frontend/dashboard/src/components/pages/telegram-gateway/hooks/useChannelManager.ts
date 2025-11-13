/**
 * useChannelManager - Hook for CRUD operations on channels
 * Extracted from TelegramGatewayFinal.tsx
 */

import { useCallback, useMemo } from "react";
import { TELEGRAM_GATEWAY_TOKEN } from "@/hooks/useTelegramGateway";
import { getApiUrl } from "@/config/api";

export interface ChannelData {
  channelId: string;
  label?: string;
  description?: string;
}

export interface UseChannelManagerReturn {
  createChannel: (data: ChannelData) => Promise<boolean>;
  updateChannel: (id: string, data: Partial<ChannelData>) => Promise<boolean>;
  deleteChannel: (id: string, channelId: string) => Promise<boolean>;
  toggleChannel: (id: string, isActive: boolean) => Promise<boolean>;
}

const extractMessage = (payload: unknown, fallback: string): string => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const readGatewayResponse = async (
  response: Response,
): Promise<{ success?: boolean } & Record<string, unknown>> => {
  const rawBody = await response.text();

  if (!response.ok) {
    let message = response.statusText || `HTTP ${response.status}`;
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as unknown;
        message = extractMessage(parsed, message);
      } catch {
        message = rawBody;
      }
    }
    throw new Error(message);
  }

  if (!rawBody) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object") {
      return parsed as { success?: boolean } & Record<string, unknown>;
    }
    throw new Error("Resposta inesperada do Telegram Gateway (formato inválido)");
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "JSON malformado recebido do gateway";
    throw new Error(`Falha ao interpretar resposta do Telegram Gateway: ${reason}`);
  }
};

export function useChannelManager(
  onSuccess?: () => Promise<void>,
): UseChannelManagerReturn {
  const gatewayToken = TELEGRAM_GATEWAY_TOKEN;
  const channelsEndpoint = useMemo(() => {
    const base = getApiUrl("telegramGateway").replace(/\/$/, "");
    return `${base}/api/channels`;
  }, []);

  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(gatewayToken ? { "X-Gateway-Token": gatewayToken } : {}),
    }),
    [gatewayToken],
  );
  const getAuthHeaders = useCallback(
    (): Record<string, string> => (gatewayToken ? { "X-Gateway-Token": gatewayToken } : {}),
    [gatewayToken],
  );

  const createChannel = useCallback(
    async (data: ChannelData): Promise<boolean> => {
      if (!data.channelId.trim()) {
        alert("Channel ID é obrigatório!");
        return false;
      }

      try {
        const response = await fetch(channelsEndpoint, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            channelId: data.channelId.trim(),
            label: data.label?.trim() || undefined,
            description: data.description?.trim() || undefined,
          }),
        });

        const result = await readGatewayResponse(response);

        if (result.success) {
          alert(`✅ Canal ${data.channelId} adicionado com sucesso!`);
          if (onSuccess) await onSuccess();
          return true;
        }

        alert(
          `Erro ao criar canal: ${extractMessage(
            result,
            "Resposta inesperada do Telegram Gateway",
          )}`,
        );
        return false;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao criar canal: ${message}`);
        return false;
      }
    },
    [channelsEndpoint, getHeaders, onSuccess],
  );

  const updateChannel = useCallback(
    async (id: string, data: Partial<ChannelData>): Promise<boolean> => {
      try {
        const response = await fetch(
          `${channelsEndpoint}/${encodeURIComponent(id)}`,
          {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(data),
          },
        );

        const result = await readGatewayResponse(response);

        alert("✅ Canal atualizado com sucesso!");
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao atualizar canal: ${message}`);
        return false;
      }
    },
    [channelsEndpoint, getHeaders, onSuccess],
  );

  const toggleChannel = useCallback(
    async (id: string, isActive: boolean): Promise<boolean> => {
      try {
        const response = await fetch(
          `${channelsEndpoint}/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ isActive: !isActive }),
          },
        );

        await readGatewayResponse(response);

        alert(`✅ Canal ${isActive ? "desativado" : "ativado"} com sucesso!`);
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro: ${message}`);
        return false;
      }
    },
    [getHeaders, onSuccess],
  );

  const deleteChannel = useCallback(
    async (id: string, channelId: string): Promise<boolean> => {
      if (!confirm(`Remover canal ${channelId}?`)) return false;

      try {
        const response = await fetch(
          `${channelsEndpoint}/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );

        await readGatewayResponse(response);

        alert("✅ Canal removido com sucesso!");
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao deletar canal: ${message}`);
        return false;
      }
    },
    [channelsEndpoint, getAuthHeaders, onSuccess],
  );

  return {
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
  };
}
