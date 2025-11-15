import {
  X,
  Calendar,
  Hash,
  MessageSquare,
  Image as ImageIcon,
  Send,
} from "@/icons";
import { ENDPOINTS } from "../../../config/endpoints";
import type { ForwardedMessage } from "./ForwardedMessagesTable";

interface MessageDetailModalProps {
  message: ForwardedMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageDetailModal({
  message,
  isOpen,
  onClose,
}: MessageDetailModalProps) {
  if (!isOpen || !message) return null;

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Detalhes da Mensagem
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Fechar"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data da Mensagem
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {formatFullDate(message.ts)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Encaminhado em
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {formatFullDate(message.forwarded_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Canal de Origem
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {message.source_channel_name ||
                    `Canal ${message.source_channel_id}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {message.source_channel_id}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Método de Encaminhamento
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {message.forward_method === "copy"
                    ? "Cópia (restrição)"
                    : "Encaminhamento direto"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Message ID: {message.message_id}
                </p>
              </div>
            </div>
          </div>

          {/* Message Text */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Conteúdo da Mensagem
              </h3>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              {message.message_text ? (
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {message.message_text}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Nenhum texto na mensagem
                </p>
              )}
            </div>
          </div>

          {/* Image Section */}
          {message.image_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Imagem Anexada
                </h3>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                {message.image_url.startsWith("/telegram-images/") ? (
                  // Imagem real baixada
                  <div className="flex flex-col items-center">
                    <img
                      src={`${ENDPOINTS.tpCapital.replace(/\/+$/, "")}${message.image_url}`}
                      alt="Imagem da mensagem"
                      className="max-w-full max-h-96 rounded-lg shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const errorMsg =
                          target.nextElementSibling as HTMLElement;
                        if (errorMsg) errorMsg.style.display = "block";
                      }}
                    />
                    <div
                      style={{ display: "none" }}
                      className="text-center text-red-600 dark:text-red-400"
                    >
                      <p className="text-sm">Erro ao carregar imagem</p>
                    </div>
                    {message.image_width && message.image_height && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {message.image_width} × {message.image_height} px
                      </p>
                    )}
                  </div>
                ) : (
                  // Placeholder para imagens antigas (telegram://)
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Imagem detectada
                      </p>
                      {message.image_width && message.image_height && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {message.image_width} × {message.image_height} px
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        URL: {message.image_url}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ Imagem antiga - necessário reprocessamento
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Destination Info */}
          {message.destination_channel_id && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Canal de Destino
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    ID: {message.destination_channel_id}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
