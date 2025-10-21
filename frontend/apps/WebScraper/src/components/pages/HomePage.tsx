import { ArrowRight, Calendar, Download, FilePlus2, History, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Table, TBody, TD, TH, THead, TR } from '../ui/table';
import { useStatistics } from '../../hooks/useWebScraper';
import type { Job } from '../../types';

function QuickAction({ title, description, onClick, icon: Icon }: { title: string; description: string; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex items-center gap-3 text-primary-500">
        <Icon className="h-5 w-5" />
        <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const variant = {
    completed: 'success',
    running: 'warning',
    pending: 'info',
    failed: 'danger'
  } as const;

  const label = {
    completed: 'Completed',
    running: 'Running',
    pending: 'Pending',
    failed: 'Failed'
  }[status];

  return <Badge variant={variant[status]}>{label}</Badge>;
}

export function HomePage() {
  const { data, isLoading } = useStatistics();
  const navigate = useNavigate();

  const quickNavigate = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Spinner />
          <p className="text-sm">Fetching scraping insights...</p>
        </div>
      </div>
    );
  }

  const stats = data?.totals;
  const jobsPerDay = data?.jobsPerDay ?? [];
  const recentJobs = data?.recentJobs ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total jobs</CardDescription>
            <CardTitle className="text-3xl">{stats?.jobs ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All recorded scraping and crawling executions in TimescaleDB.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-3xl">
              {(stats?.successRate ?? 0).toLocaleString(undefined, {
                style: 'percent',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ratio between completed and failed jobs for the last 30 days.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active templates</CardDescription>
            <CardTitle className="text-3xl">{stats?.templates ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Templates ready to be consumed by operators and automations.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Running jobs</CardDescription>
            <CardTitle className="text-3xl">{data?.byStatus.running ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Firecrawl jobs currently in progress. Polling every 10 seconds.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jobs Over Time</CardTitle>
            <CardDescription>Daily executions over the last week.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex gap-3">
              {jobsPerDay.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Run a few scrapes to populate the timeline.
                </p>
              ) : (
                jobsPerDay.map(entry => (
                  <div key={entry.date} className="flex w-full flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end justify-center rounded-md bg-slate-100 p-2 dark:bg-slate-800">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-primary-500/30 via-primary-500 to-primary-400"
                        style={{ height: `${Math.max(entry.count, 2) * 15}px` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short' })}
                    </p>
                    <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-600 dark:bg-primary-500/20 dark:text-primary-200">
                      {entry.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Kickstart common workflows with a single tap.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickAction
                title="New scraping job"
                description="Configure URL, formats and advanced options."
                icon={PlusCircle}
                onClick={() => quickNavigate('/scraping')}
              />
              <QuickAction
                title="Save a reusable template"
                description="Configure once, reuse anywhere with template management."
                icon={FilePlus2}
                onClick={() => quickNavigate('/templates')}
              />
              <QuickAction
                title="Inspect execution history"
                description="Dive into job details, logs and execution metrics."
                icon={History}
                onClick={() => quickNavigate('/history')}
              />
              <QuickAction
                title="Export job data"
                description="Download jobs, templates or schedules for analytics."
                icon={Download}
                onClick={() => quickNavigate('/exports')}
              />
              <QuickAction
                title="Automate with schedules"
                description="Set up recurring scraping jobs with cron or intervals."
                icon={Calendar}
                onClick={() => quickNavigate('/schedules')}
              />
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Templates leaderboard</CardTitle>
              <CardDescription>Most used presets across the team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.popularTemplates?.length ? (
                data.popularTemplates.map(template => (
                  <div
                    key={template.templateId}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{template.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Template ID: {template.templateId}</p>
                    </div>
                    <Badge variant="outline" className="bg-white dark:bg-slate-900">
                      {template.usageCount} uses
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create templates to see usage analytics here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Last five executions saved by the WebScraper API.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => quickNavigate('history')}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No jobs registered yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Job ID</TH>
                  <TH>URL</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Started</TH>
                </TR>
              </THead>
              <TBody>
                {recentJobs.map(job => (
                  <TR key={job.id}>
                    <TD className="font-mono text-xs">{job.id.slice(0, 8)}...</TD>
                    <TD className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">{job.url}</TD>
                    <TD className="capitalize">{job.type}</TD>
                    <TD>
                      <StatusBadge status={job.status} />
                    </TD>
                    <TD>
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleString()
                        : new Date(job.createdAt).toLocaleString()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
