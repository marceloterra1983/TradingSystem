import { useCallback, useMemo, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle
} from '../ui/collapsible-card';
import { Button } from '../ui/button';
import { JobHistory, JobDetails, ResultsComparison, JobStatistics } from '../history';
import type { Job, JobFilters, StatisticsFilters } from '../../types/jobs';
import { useTemplates } from '../../hooks/useWebscraperTemplates';
import { useDeleteJob, useRerunJob } from '../../hooks/useJobs';
import { useToast } from '../../hooks/useToast';

export function CrawlHistoryPanel() {
  const { data: templates } = useTemplates();
  const deleteJob = useDeleteJob();
  const rerunJob = useRerunJob();
  const toast = useToast();

  const [filters, setFilters] = useState<JobFilters>({ page: 1, limit: 25 });
  const [statisticsFilters, setStatisticsFilters] = useState<StatisticsFilters>({});
  const [showStatistics, setShowStatistics] = useState<boolean>(false);
  const [detailsJob, setDetailsJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [compareJobs, setCompareJobs] = useState<Job[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const handleFiltersChange = useCallback((changes: Partial<JobFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...changes };
      const shouldResetPage = Object.keys(changes).some((key) => !['page', 'limit'].includes(key));
      if (shouldResetPage) {
        next.page = 1;
      }
      if (changes.limit && changes.limit !== prev.limit) {
        next.page = 1;
      }
      return next;
    });
  }, []);

  const handleViewDetails = useCallback((job: Job) => {
    setDetailsJob(job);
    setDetailsOpen(true);
  }, []);

  const handleCompare = useCallback((jobsToCompare: Job[]) => {
    if (jobsToCompare.length !== 2) {
      toast.error('Select exactly two jobs to compare.');
      return;
    }
    setCompareJobs(jobsToCompare);
    setCompareOpen(true);
  }, [toast]);

  const handleDelete = useCallback((job: Job) => {
    if (!window.confirm(`Delete job ${job.id}? This cannot be undone.`)) {
      return;
    }
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        if (detailsJob?.id === job.id) {
          setDetailsJob(null);
          setDetailsOpen(false);
        }
      }
    });
  }, [deleteJob, detailsJob]);

  const handleRerun = useCallback((job: Job) => {
    rerunJob.mutate(job.id);
  }, [rerunJob]);

  const comparisonJobs = useMemo(() => compareJobs, [compareJobs]);

  return (
    <CollapsibleCard cardId="webscraper-job-history" defaultCollapsed={false}>
      <CollapsibleCardHeader className="flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CollapsibleCardTitle>Job History</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Review completed scrapes and crawls, inspect results, and compare output across jobs.
          </CollapsibleCardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowStatistics((prev) => !prev)}>
          {showStatistics ? 'Hide statistics' : 'Show statistics'}
        </Button>
      </CollapsibleCardHeader>

      <CollapsibleCardContent className="space-y-6">
        {showStatistics && (
          <JobStatistics filters={statisticsFilters} onFiltersChange={setStatisticsFilters} />
        )}

        <JobHistory
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onViewDetails={handleViewDetails}
          onCompare={handleCompare}
          onDelete={handleDelete}
          onRerun={handleRerun}
          templates={templates}
        />

        <JobDetails
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          job={detailsJob}
          onDelete={handleDelete}
          onRerun={handleRerun}
        />

        <ResultsComparison
          open={compareOpen}
          onOpenChange={setCompareOpen}
          jobs={comparisonJobs}
        />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export default CrawlHistoryPanel;
