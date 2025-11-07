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
  const [isExpanded, setIsExpanded] = useState(status === 'running' || status === 'queued');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate log streaming (replace with WebSocket later)
  useEffect(() => {
    if (status !== 'running' && status !== 'queued') {
      return;
    }

    // Mock logs for demonstration
    const mockLogs: LogEntry[] = [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Initializing crawler...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Loading course credentials...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Authenticating with MemberKit...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Authentication successful' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Fetching course structure...' },
    ];

    setLogs(mockLogs);

    // Simulate streaming logs
    let logIndex = mockLogs.length;
    const interval = setInterval(() => {
      if (status === 'running') {
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          level: logIndex % 10 === 0 ? 'warning' : 'info',
          message: `Processing module ${Math.floor(logIndex / 5)} - class ${logIndex % 5}...`,
        };
        setLogs((prev) => [...prev, newLog]);
        logIndex++;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, runId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

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
            Live Logs ({logs.length} entries)
          </span>
          {status === 'running' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
              STREAMING
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

          {/* Footer Controls */}
          <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              Auto-scroll to bottom
            </label>
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
