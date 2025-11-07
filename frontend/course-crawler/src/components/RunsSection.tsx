import { useState, useEffect } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from './ui/collapsible-card';
import { Button } from './ui/button';
import { Play, Eye, X } from 'lucide-react';
import { api, Run } from '../services/api';
import { LogViewer } from './LogViewer';

type FilterStatus = 'all' | Run['status'];

export function RunsSection() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRuns();
  }, [filter]);

  // ✅ Reduced polling frequency to 30s for better UX
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have active runs
      if (runs.some((r) => r.status === 'queued' || r.status === 'running')) {
        loadRuns();
      }
    }, 30000); // 30 seconds instead of 5
    return () => clearInterval(interval);
  }, [runs]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getRuns();
      // Client-side filtering
      const filteredData = filter === 'all' ? data : data.filter((r: Run) => r.status === filter);
      setRuns(filteredData);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewArtifacts = (runId: string) => {
    // Dispatch custom event to notify ArtifactsSection
    window.dispatchEvent(new CustomEvent('select-run', { detail: { runId } }));

    // Scroll to artifacts section
    const artifactsCard = document.getElementById('course-crawler-artifacts');
    if (artifactsCard) {
      artifactsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelRun = async (runId: string) => {
    if (!confirm('Are you sure you want to cancel this run?')) {
      return;
    }

    try {
      setCancellingIds(prev => new Set(prev).add(runId));
      await api.cancelRun(runId);
      await loadRuns(); // Reload to show updated status
    } catch (error) {
      console.error('Failed to cancel run:', error);
      alert('Failed to cancel run. See console for details.');
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: Run['status']) => {
    const colors = {
      queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  const filterButtons: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'queued', label: 'Queued' },
    { value: 'running', label: 'Running' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <CollapsibleCard defaultCollapsed={false} cardId="course-crawler-runs">
      <CollapsibleCardHeader>
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-cyan-500" />
          <div>
            <CollapsibleCardTitle>Runs</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Track scraping execution status and progress
            </CollapsibleCardDescription>
          </div>
        </div>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        {/* Filter Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {filterButtons.map(({ value, label }) => (
            <Button
              key={value}
              onClick={() => setFilter(value)}
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              className={
                filter === value
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : 'border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
              }
            >
              {label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading runs...
          </div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No runs found. Schedule a run from the Courses section.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {runs.map((run) => (
              <div
                key={run.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {run.courseName || `Course ${run.courseId.substring(0, 8)}`}
                      </h3>
                      {getStatusBadge(run.status)}
                    </div>
                    {run.courseBaseUrl && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {run.courseBaseUrl}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Run ID: {run.id.substring(0, 8)} • Created: {new Date(run.createdAt).toLocaleString()}
                    </p>
                    {run.startedAt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Started: {new Date(run.startedAt).toLocaleString()}
                      </p>
                    )}
                    {run.finishedAt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Finished: {new Date(run.finishedAt).toLocaleString()}
                      </p>
                    )}
                    {run.metrics && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Metrics: {JSON.stringify(run.metrics).substring(0, 100)}...
                      </p>
                    )}
                    {run.error && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Error: {run.error}
                      </p>
                    )}
                    {/* ❌ Removed live duration timer to prevent constant re-renders */}
                    {/* Duration can be calculated manually: finishedAt - startedAt */}

                    {/* Log Viewer */}
                    <LogViewer runId={run.id} status={run.status} />
                  </div>
                  <div className="flex gap-2">
                    {(run.status === 'queued' || run.status === 'running') && (
                      <Button
                        onClick={() => handleCancelRun(run.id)}
                        size="sm"
                        variant="outline"
                        disabled={cancellingIds.has(run.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {cancellingIds.has(run.id) ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                    {run.status === 'success' && run.outputsDir && (
                      <Button
                        onClick={() => handleViewArtifacts(run.id)}
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Artifacts
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
