import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, Terminal } from "@/icons";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from "../ui/collapsible-card";

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  data?: Record<string, any>;
}

export const GatewayLogsCard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    lastUpdate: null as string | null,
  });

  // Simular dados para demonstração
  useEffect(() => {
    const mockLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: "Telegram Gateway MTProto connected",
        data: { status: "connected" },
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: "INFO",
        message: "Message saved locally",
        data: { messageId: 445465, channelId: "-1001744113331" },
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: "INFO",
        message: "API endpoints disabled - TP Capital separated",
        data: { reason: "Processing locally" },
      },
      {
        timestamp: new Date(Date.now() - 90000).toISOString(),
        level: "INFO",
        message: "Session loaded successfully",
        data: { sessionFile: "telegram-gateway.session" },
      },
    ];

    setLogs(mockLogs);
    setStats({
      total: mockLogs.length,
      info: mockLogs.filter((l) => l.level === "INFO").length,
      warn: mockLogs.filter((l) => l.level === "WARN").length,
      error: mockLogs.filter((l) => l.level === "ERROR").length,
      lastUpdate: new Date().toISOString(),
    });

    // Atualizar a cada 10 segundos
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        lastUpdate: new Date().toISOString(),
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "INFO":
        return (
          <CheckCircle className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
        );
      case "WARN":
        return (
          <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        );
      case "ERROR":
        return (
          <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
        );
      default:
        return <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO":
        return "bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700";
      case "WARN":
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700";
      case "ERROR":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700";
      default:
        return "bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700";
    }
  };

  const getLevelTextColor = (level: string) => {
    switch (level) {
      case "INFO":
        return "text-slate-700 dark:text-slate-300";
      case "WARN":
        return "text-amber-700 dark:text-amber-300";
      case "ERROR":
        return "text-red-700 dark:text-red-300";
      default:
        return "text-slate-700 dark:text-slate-300";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <CollapsibleCard cardId="telegram-gateway-logs" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <CollapsibleCardTitle level={2}>
              Gateway MTProto Logs
            </CollapsibleCardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock className="h-4 w-4" />
            <span>
              {stats.lastUpdate
                ? `Atualizado ${formatTimestamp(stats.lastUpdate)}`
                : "Aguardando..."}
            </span>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Total
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-700">
            <div className="text-sm text-cyan-600 dark:text-cyan-400 mb-1">
              Info
            </div>
            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
              {stats.info}
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
            <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">
              Avisos
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.warn}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
            <div className="text-sm text-red-600 dark:text-red-400 mb-1">
              Erros
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {stats.error}
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div
          className="space-y-2 max-h-96 overflow-y-auto"
          role="region"
          aria-label="Logs recentes do gateway MTProto"
          tabIndex={0}
        >
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Clock className="h-12 w-12 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
              <p className="font-medium">Nenhum log disponível</p>
              <p className="text-sm">Os logs aparecerão aqui em tempo real</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getLevelColor(log.level)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getLevelIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        log.level === "INFO"
                          ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
                          : log.level === "WARN"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <p
                    className={`text-sm font-medium mb-1 ${getLevelTextColor(log.level)}`}
                  >
                    {log.message}
                  </p>
                  {log.data && Object.keys(log.data).length > 0 && (
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 rounded px-2 py-1 mt-2">
                      {Object.entries(log.data).map(([key, value]) => (
                        <div key={key} className="truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {key}:
                          </span>{" "}
                          {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              <span>TP Capital: Separado (processamento local)</span>
            </div>
            <div className="flex-1"></div>
            <button
              onClick={() => {
                // Implementar refresh dos logs
                setStats((prev) => ({
                  ...prev,
                  lastUpdate: new Date().toISOString(),
                }));
              }}
              className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
};
