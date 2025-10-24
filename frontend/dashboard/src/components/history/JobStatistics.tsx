import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useStatistics } from '../../hooks/useJobs';
import type { StatisticsFilters } from '../../types/jobs';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { buildJobsPerDayData, buildStatusChartData, buildTypeChartData, formatSuccessRate } from '../../utils/charts';
import { formatTimestampShort } from '../../utils/dateUtils';

const STATUS_COLORS = ['#047857', '#0ea5e9', '#f59e0b', '#ef4444'];
const TYPE_COLORS = ['#6366f1', '#a855f7'];

interface JobStatisticsProps {
  filters: StatisticsFilters;
  onFiltersChange: (filters: StatisticsFilters) => void;
}

export function JobStatistics({ filters, onFiltersChange }: JobStatisticsProps) {
  const statsQuery = useStatistics(filters);
  const stats = statsQuery.data;
  const statusData = buildStatusChartData(stats);
  const typeData = buildTypeChartData(stats);
  const trendData = buildJobsPerDayData(stats);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Job statistics</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Updated {statsQuery.isFetching ? '…' : stats ? formatTimestampShort(new Date().toISOString()) : 'never'}
        </span>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, dateFrom: event.target.value || undefined })}
            className="w-40"
          />
          <span>to</span>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, dateTo: event.target.value || undefined })}
            className="w-40"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              void statsQuery.refetch();
            }}
            disabled={statsQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Loading statistics…
        </div>
      ) : statsQuery.error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-red-500">
          <p>Unable to load statistics.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void statsQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : !stats ? (
        <div className="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          No statistics available for the selected range.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total jobs</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totals.jobs}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats.recentJobs.length} recent jobs in the last window
              </p>
            </Card>
            <Card className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Success rate</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatSuccessRate(stats.totals.successRate)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Completed: {stats.byStatus.completed ?? 0} • Failed: {stats.byStatus.failed ?? 0}
              </p>
            </Card>
            <Card className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Templates</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totals.templates}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Most used: {stats.popularTemplates[0]?.name ?? '—'}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Jobs by status</h4>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                      {statusData.map((entry, index) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} jobs`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Jobs by type</h4>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value: number) => `${value} jobs`} />
                    <Bar dataKey="value">
                      {typeData.map((entry, index) => (
                        <Cell key={entry.name} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Jobs per day</h4>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => `${value} jobs`} />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
