/**
 * useChannelManager - Hook for CRUD operations on channels
 * Extracted from TelegramGatewayFinal.tsx
 */

import { useCallback } from "react";
import { TELEGRAM_GATEWAY_TOKEN } from "@/hooks/useTelegramGateway";

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

export function useChannelManager(
  onSuccess?: () => Promise<void>,
): UseChannelManagerReturn {
  const gatewayToken = TELEGRAM_GATEWAY_TOKEN;
  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(gatewayToken ? { "X-Gateway-Token": gatewayToken } : {}),
    }),
    [gatewayToken],
  );
  const getAuthHeaders = useCallback(
    () => (gatewayToken ? { "X-Gateway-Token": gatewayToken } : {}),
    [gatewayToken],
  );

  const createChannel = useCallback(
    async (data: ChannelData): Promise<boolean> => {
      if (!data.channelId.trim()) {
        alert("Channel ID é obrigatório!");
        return false;
      }

      try {
        const response = await fetch("/api/channels", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            channelId: data.channelId.trim(),
            label: data.label?.trim() || undefined,
            description: data.description?.trim() || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(
            `Erro ao criar canal: ${result.message || response.statusText}`,
          );
          return false;
        }

        if (result.success) {
          alert(`✅ Canal ${data.channelId} adicionado com sucesso!`);
          if (onSuccess) await onSuccess();
          return true;
        }

        return false;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao criar canal: ${message}`);
        return false;
      }
    },
    [getHeaders, onSuccess],
  );

  const updateChannel = useCallback(
    async (id: string, data: Partial<ChannelData>): Promise<boolean> => {
      try {
        const response = await fetch(`/api/channels/${id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          alert(`Erro ao atualizar: ${result.message || response.statusText}`);
          return false;
        }

        alert("✅ Canal atualizado com sucesso!");
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao atualizar canal: ${message}`);
        return false;
      }
    },
    [getHeaders, onSuccess],
  );

  const toggleChannel = useCallback(
    async (id: string, isActive: boolean): Promise<boolean> => {
      try {
        const response = await fetch(`/api/channels/${id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ isActive: !isActive }),
        });

        if (!response.ok) {
          const raw = await response.text();
          let message = response.statusText;
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === "object") {
              message = parsed.message || JSON.stringify(parsed);
            } else if (raw) {
              message = raw;
            }
          } catch {
            if (raw) message = raw;
          }
          alert(`Erro ao alterar status: ${message}`);
          return false;
        }

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
        const response = await fetch(`/api/channels/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const result = await response.json();
          alert(`Erro ao deletar: ${result.message || response.statusText}`);
          return false;
        }

        alert("✅ Canal removido com sucesso!");
        if (onSuccess) await onSuccess();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Erro ao deletar canal: ${message}`);
        return false;
      }
    },
    [getAuthHeaders, onSuccess],
  );

  return {
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
  };
}
