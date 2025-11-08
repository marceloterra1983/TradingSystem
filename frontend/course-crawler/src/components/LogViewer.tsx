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

  // Fetch run details to show meaningful progress
  useEffect(() => {
    if (status === 'queued') {
      setLogs([{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '⏳ Run queued. Waiting for worker to start processing...'
      }]);
      return;
    }

    // Fetch run details for better logging
    const fetchRunDetails = async () => {
      try {
        const API_URL = import.meta.env.VITE_COURSE_CRAWLER_API_URL || '';
        const response = await fetch(`${API_URL}/runs/${runId}`);
        if (!response.ok) throw new Error('Failed to fetch run details');

        const run = await response.json();
        const newLogs: LogEntry[] = [];

        // Platform detection
        if (run.baseUrl) {
          const platform = run.baseUrl.includes('memberkit') ? 'Memberkit' :
                          run.baseUrl.includes('jumba') ? 'Jumba' :
                          run.baseUrl.includes('hotmart') ? 'Hotmart' :
                          run.baseUrl.includes('varos') ? 'Varos' : 'Generic';
          newLogs.push({
            timestamp: run.createdAt || new Date().toISOString(),
            level: 'info',
            message: `🔍 Platform detected: ${platform}`
          });
        }

        // Status updates
        if (run.startedAt) {
          newLogs.push({
            timestamp: run.startedAt,
            level: 'info',
            message: `▶️  Execution started`
          });
        }

        // Progress metrics
        if (run.metrics) {
          if (run.metrics.coursesProcessed > 0) {
            newLogs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `📚 Courses discovered: ${run.metrics.coursesProcessed}`
            });
          }
          if (run.metrics.modulesProcessed > 0) {
            newLogs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `📂 Modules processed: ${run.metrics.modulesProcessed}`
            });
          }
          if (run.metrics.classesProcessed > 0) {
            newLogs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `🎓 Classes extracted: ${run.metrics.classesProcessed}`
            });
          }
          if (run.metrics.videosDetected > 0) {
            newLogs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `🎬 Videos detected: ${run.metrics.videosDetected}`
            });
          }
        }

        // Completion
        if (status === 'success' && run.finishedAt) {
          newLogs.push({
            timestamp: run.finishedAt,
            level: 'info',
            message: `✅ Run completed successfully!`
          });
        }

        if (status === 'failed') {
          if (run.error) {
            newLogs.push({
              timestamp: run.finishedAt || new Date().toISOString(),
              level: 'error',
              message: `❌ Error: ${run.error.substring(0, 200)}${run.error.length > 200 ? '...' : ''}`
            });
          }
          newLogs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '📋 View complete error logs in Docker:'
          });
          newLogs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `   docker logs course-crawler-worker 2>&1 | grep "${runId.substring(0, 8)}"`
          });
        }

        // Show docker command for running status
        if (status === 'running') {
          newLogs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: ''
          });
          newLogs.push({
            timestamp: new Date().toISOString(),
            level: 'debug',
            message: '📋 View live logs: docker logs -f course-crawler-worker | grep "' + runId.substring(0, 8) + '"'
          });
        }

        setLogs(newLogs.length > 0 ? newLogs : [{
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '⏳ Waiting for execution to start...'
        }]);

      } catch (error) {
        setLogs([{
          timestamp: new Date().toISOString(),
          level: 'warning',
          message: '⚠️  Unable to fetch run details. Use Docker logs to view progress.'
        }, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `   docker logs -f course-crawler-worker | grep "${runId.substring(0, 8)}"`
        }]);
      }
    };

    fetchRunDetails();

    // Refresh every 5 seconds if running
    const interval = status === 'running' ? setInterval(fetchRunDetails, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
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
