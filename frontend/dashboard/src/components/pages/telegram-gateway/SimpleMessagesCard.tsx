import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { MessageSquare, RefreshCw } from '@/icons';
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface Message {
  id: string;
  channelId: string;
  messageId: string | number;
  text?: string | null;
  caption?: string | null;
  status: string;
  receivedAt: string;
  source?: string | null;
  [key: string]: any; // Allow additional properties
}

interface SimpleMessagesCardProps {
  messages: Message[];
  total: number;
  isLoading: boolean;
  onRefresh: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function SimpleMessagesCard({
  messages,
  total,
  isLoading,
  onRefresh,
  onLoadMore,
  hasMore,
  selectedStatus: controlledStatus,
  onStatusChange,
}: SimpleMessagesCardProps) {
  // Use controlled state if provided, otherwise use internal state
  const [internalStatus, setInternalStatus] = useState<string>("all");
  const selectedStatus = controlledStatus ?? internalStatus;
  const setSelectedStatus = onStatusChange ?? setInternalStatus;

  const filteredMessages =
    selectedStatus === "all"
      ? messages
      : messages.filter((m) => m.status === selectedStatus);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "published":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "queued":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Mensagens ({total})</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="received">Recebidas</SelectItem>
                <SelectItem value="published">Publicadas</SelectItem>
                <SelectItem value="failed">Falhas</SelectItem>
                <SelectItem value="queued">Na fila</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {total === 0
              ? "Nenhuma mensagem recebida ainda. Aguardando mensagens dos canais monitorados..."
              : "Nenhuma mensagem com este filtro."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {message.channelId}
                      </Badge>
                      <Badge className={getStatusColor(message.status)}>
                        {message.status}
                      </Badge>
                      {message.source && (
                        <span className="text-xs text-muted-foreground">
                          via {message.source}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      {message.text || message.caption || (
                        <em className="text-muted-foreground">Sem texto</em>
                      )}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ID: {message.messageId}</span>
                      <span>
                        {formatDate(message.telegramDate || message.receivedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && onLoadMore && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={onLoadMore}
              >
                Carregar mais
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
