import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Copy, Download, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

interface LogViewerProps {
  runId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
}

export function LogViewer({ runId, status }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false); // ❌ Disabled auto-expand
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ❌ Removed auto-scroll - user controls scroll manually
  // ❌ Removed mock logs - showing static message instead
  useEffect(() => {
    if (status === 'queued') {
      setLogs([{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Run queued. Logs will appear when execution starts.'
      }]);
      return;
    }

    if (status === 'running' || status === 'success' || status === 'failed') {
      setLogs([
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '📋 View complete logs in Docker:'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `   docker logs -f course-crawler-worker | grep "${runId.substring(0, 8)}"`
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: ''
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '💡 Real-time log streaming via WebSocket will be implemented in Phase 3'
        }
      ]);
    }
  }, [status, runId]);

  const handleCopyLogs = () => {
    const logsText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(logsText);
    alert('Logs copied to clipboard!');
  };

  const handleDownloadLogs = () => {
    const logsText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-${runId.substring(0, 8)}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'debug':
        return 'text-gray-500 dark:text-gray-400';
      case 'info':
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const getLogBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'debug':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  if (logs.length === 0) {
    return null; // Don't show if no logs yet
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Logs ({logs.length} entries)
          </span>
          {status === 'running' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              RUNNING
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLogs();
                }}
                size="sm"
                variant="outline"
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadLogs();
                }}
                size="sm"
                variant="outline"
                className="h-7 px-2"
              >
                <Download className="h-3 w-3" />
              </Button>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Logs Content */}
      {isExpanded && (
        <>
          <div
            ref={containerRef}
            className="max-h-96 overflow-y-auto p-3 space-y-1 bg-gray-50 dark:bg-gray-950 font-mono text-xs"
          >
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 hover:bg-gray-100 dark:hover:bg-gray-900 px-2 py-1 rounded">
                <span className="text-gray-500 dark:text-gray-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`${getLogBadgeColor(log.level)} px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0`}>
                  {log.level}
                </span>
                <span className={`${getLogColor(log.level)} break-all`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Footer - Removed auto-scroll controls */}
          <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Use Docker logs command above to view complete execution logs
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {logs.filter((l) => l.level === 'error').length} errors •{' '}
              {logs.filter((l) => l.level === 'warning').length} warnings
            </span>
          </div>
        </>
      )}
    </div>
  );
}
