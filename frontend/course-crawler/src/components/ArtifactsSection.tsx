import { useState, useEffect } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from './ui/collapsible-card';
import { Button } from './ui/button';
import { FileText, Download, Eye, FileJson } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, Artifact } from '../services/api';

interface ArtifactsSectionProps {
  runId?: string;
}

export function ArtifactsSection({ runId: initialRunId }: ArtifactsSectionProps) {
  const [runId, setRunId] = useState<string | undefined>(initialRunId);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Listen for run selection events from RunsSection
  useEffect(() => {
    const handleSelectRun = (event: Event) => {
      const customEvent = event as CustomEvent<{ runId: string }>;
      setRunId(customEvent.detail.runId);
    };

    window.addEventListener('select-run', handleSelectRun);
    return () => window.removeEventListener('select-run', handleSelectRun);
  }, []);

  useEffect(() => {
    if (runId) {
      loadArtifacts(runId);
    }
  }, [runId]);

  const loadArtifacts = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getArtifacts(id);
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (artifact: Artifact) => {
    if (!runId || artifact.type !== 'file') return;

    try {
      setLoading(true);
      setSelectedArtifact(artifact);
      const content = await api.getArtifactContent(runId, artifact.path);
      setPreview(content);
    } catch (error) {
      console.error('Failed to load preview:', error);
      setPreview('Error loading preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (artifact: Artifact) => {
    if (!runId || artifact.type !== 'file') return;

    try {
      const content = await api.getArtifactContent(runId, artifact.path);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.path.split('/').pop() || 'artifact.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download artifact:', error);
    }
  };

  const getFileType = (path: string): 'markdown' | 'json' | 'unknown' => {
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.json')) return 'json';
    return 'unknown';
  };

  return (
    <CollapsibleCard defaultCollapsed={false} cardId="course-crawler-artifacts">
      <CollapsibleCardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" />
          <div>
            <CollapsibleCardTitle>Artifacts</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              View and download generated Markdown and JSON files
            </CollapsibleCardDescription>
          </div>
        </div>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        {!runId ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Select a completed run to view its artifacts.
            </p>
          </div>
        ) : loading && artifacts.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading artifacts...
          </div>
        ) : artifacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No artifacts available for this run.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Artifacts List */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Available Files
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {artifacts
                  .filter((artifact) => artifact.type === 'file')
                  .map((artifact) => {
                    const fileType = getFileType(artifact.path);
                    const fileName = artifact.path.split('/').pop() || artifact.path;
                    return (
                      <div
                        key={artifact.path}
                        className={`p-4 transition ${
                          selectedArtifact?.path === artifact.path
                            ? 'bg-cyan-50 dark:bg-cyan-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {fileType === 'markdown' ? (
                                <FileText className="h-5 w-5 text-blue-500" />
                              ) : fileType === 'json' ? (
                                <FileJson className="h-5 w-5 text-green-500" />
                              ) : (
                                <FileText className="h-5 w-5 text-gray-500" />
                              )}
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {fileName}
                              </h4>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {artifact.path}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handlePreview(artifact)}
                              size="sm"
                              variant="outline"
                              className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDownload(artifact)}
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {selectedArtifact
                    ? selectedArtifact.path.split('/').pop()
                    : 'Preview'}
                </h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {!selectedArtifact ? (
                  <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
                    Click preview to view file contents
                  </div>
                ) : loading ? (
                  <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
                    Loading preview...
                  </div>
                ) : getFileType(selectedArtifact.path) === 'markdown' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {preview}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-800">
                    <code className="text-gray-900 dark:text-gray-100">
                      {preview}
                    </code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
