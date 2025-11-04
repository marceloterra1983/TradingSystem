import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import documentationService, {
  DocumentationMetrics,
} from '../../services/documentationService';

type Trend = 'improving' | 'declining' | 'stable';

const HEALTH_COLORS: Record<'excellent' | 'good' | 'fair' | 'poor' | 'critical', string> = {
  excellent: 'text-emerald-600 dark:text-emerald-400',
  good: 'text-lime-600 dark:text-lime-400',
  fair: 'text-amber-600 dark:text-amber-400',
  poor: 'text-orange-600 dark:text-orange-400',
  critical: 'text-rose-600 dark:text-rose-400',
};

const SEVERITY_META: Array<{
  key: keyof DocumentationMetrics['issues']['bySeverity'];
  label: string;
  color: string;
}> = [
  { key: 'critical', label: 'Critical', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200' },
  { key: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' },
  { key: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' },
  { key: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' },
];

const PIE_COLORS = ['#F87171', '#FB923C', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));

function getTrendMeta(trend: Trend) {
  switch (trend) {
    case 'improving':
      return {
        Icon: TrendingUp,
        text: 'Improving',
        className: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'declining':
      return {
        Icon: TrendingDown,
        text: 'Declining',
        className: 'text-rose-600 dark:text-rose-400',
      };
    default:
      return {
        Icon: Minus,
        text: 'Stable',
        className: 'text-slate-500 dark:text-slate-400',
      };
  }
}

function getGradeVariant(grade?: string) {
  if (!grade) return 'secondary' as const;

  switch (grade.toUpperCase()) {
    case 'A':
      return 'success' as const;
    case 'B':
      return 'default' as const;
    case 'C':
      return 'warning' as const;
    case 'D':
      return 'warning' as const;
    default:
      return 'destructive' as const;
  }
}

const emptyMetricsMessage = (
  <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
    <AlertCircle className="h-8 w-8 text-amber-500" />
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        No metrics available
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Run the documentation maintenance audit to generate the latest metrics.
      </p>
    </div>
  </div>
);

export default function DocumentationMetricsPage() {
  const [metrics, setMetrics] = useState<DocumentationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMetrics = useCallback(
    async (showSpinner: boolean = true) => {
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await documentationService.getDocumentationMetrics();
        if (!response.success) {
          throw new Error('Received unsuccessful response from documentation metrics API');
        }

        setMetrics(response.data);
        setLastUpdated(response.data.metadata?.generatedAt ? new Date(response.data.metadata.generatedAt) : new Date());
      } catch (err) {
        console.error('[DocumentationMetrics] Failed to load metrics:', err);
        setError((err as Error).message);
        setMetrics(null);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadMetrics();

    const interval = window.setInterval(() => {
      void loadMetrics(false);
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadMetrics]);

  const freshnessRate = useMemo(() => {
    if (!metrics?.freshness?.distribution) return 0;
    return metrics.freshness.distribution
      .filter((item) => item.label !== '>90 days')
      .reduce((sum, item) => sum + (item.percentage ?? 0), 0);
  }, [metrics]);

  const historicalData = useMemo(() => {
    if (!metrics?.historical) return [];
    return metrics.historical.map((entry) => ({
      ...entry,
      formattedDate: formatDate(entry.date),
    }));
  }, [metrics]);

  const trendMeta = getTrendMeta(metrics?.healthScore?.trend as Trend);
  const healthStatusClass =
    HEALTH_COLORS[(metrics?.healthScore?.status as keyof typeof HEALTH_COLORS) || 'good'] || '';

  const handleRefresh = () => {
    void loadMetrics();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="space-y-4 py-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 px-4 py-4 dark:border-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Failed to load documentation metrics</p>
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <div className="p-6">{emptyMetricsMessage}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Documentation Metrics Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time health, freshness, and quality metrics sourced from the documentation audit pipeline.
          </p>
          {lastUpdated && (
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="primary"
            size="md"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Health Score
              </CardTitle>
              <CardDescription>
                Overall quality score based on audit findings
              </CardDescription>
            </div>
            <Badge variant={getGradeVariant(metrics.healthScore.grade)}>
              Grade {metrics.healthScore.grade ?? 'N/A'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round((metrics.healthScore.current ?? 0) * 10) / 10}
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <span className={`font-semibold capitalize ${healthStatusClass}`}>
                  {metrics.healthScore.status ?? 'No Data'}
                </span>
                <span className={`inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 ${trendMeta.className}`}>
                  <trendMeta.Icon className="h-3.5 w-3.5" />
                  {trendMeta.text}
                </span>
              </div>
            </div>
            <div>
              <Progress value={Math.min(100, Math.max(0, metrics.healthScore.current ?? 0))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Total Files
              </CardTitle>
              <CardDescription>Tracked documentation assets</CardDescription>
            </div>
            <div className="rounded-full bg-blue-50 p-2 dark:bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.coverage.totalFiles ?? 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ownership distribution captured from frontmatter metadata.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Freshness Rate
              </CardTitle>
              <CardDescription>Files reviewed within the last 90 days</CardDescription>
            </div>
            <div className="rounded-full bg-emerald-50 p-2 dark:bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(freshnessRate)}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metrics.freshness?.outdatedCount ?? 0} stale files
              </span>
            </div>
            <Progress value={Math.min(100, Math.max(0, freshnessRate))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Total Issues
              </CardTitle>
              <CardDescription>Aggregated across severity levels</CardDescription>
            </div>
            <div className="rounded-full bg-rose-50 p-2 dark:bg-rose-500/10">
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.issues.total ?? 0}
            </div>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_META.map(({ key, label, color }) => {
                const value = metrics.issues.bySeverity?.[key] ?? 0;
                if (value === 0) {
                  return null;
                }
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
                  >
                    <span className="text-gray-800 dark:text-gray-200">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Health Score Trend</CardTitle>
            <CardDescription>Rolling snapshots from the last 90 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {historicalData.length === 0 ? (
              emptyMetricsMessage
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="formattedDate" stroke="var(--ts-text-muted)" minTickGap={16} />
                  <YAxis stroke="var(--ts-text-muted)" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--ts-surface-0)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--ts-surface-border)',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} pts`, 'Health Score']}
                  />
                  <ReferenceLine y={90} stroke="#34D399" strokeDasharray="4 4" />
                  <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" />
                  <ReferenceLine y={50} stroke="#F97316" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="healthScore"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freshness Distribution</CardTitle>
            <CardDescription>Days since last documented review</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {metrics.freshness?.distribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.freshness.distribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="label" stroke="var(--ts-text-muted)" />
                  <YAxis stroke="var(--ts-text-muted)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--ts-surface-0)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--ts-surface-border)',
                    }}
                    formatter={(value: number, _key, payload) => [
                      `${value} files (${payload?.payload?.percentage ?? 0}%)`,
                      'Files',
                    ]}
                  />
                  <Bar dataKey="count" radius={8}>
                    {metrics.freshness.distribution.map((item) => {
                      const color =
                        item.label === '<30 days'
                          ? '#34D399'
                          : item.label === '30-60 days'
                            ? '#A3E635'
                            : item.label === '60-90 days'
                              ? '#F59E0B'
                              : '#F97316';
                      return <Cell key={item.label} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              emptyMetricsMessage
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Breakdown</CardTitle>
            <CardDescription>Grouping across frontmatter, links, and content</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {metrics.issues?.breakdown && Object.keys(metrics.issues.breakdown).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--ts-surface-0)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--ts-surface-border)',
                    }}
                    formatter={(value: number, name: string, payload) => {
                      const total = metrics.issues.total || 1;
                      const percentage = ((value / total) * 100).toFixed(1);
                      return [`${value} issues (${percentage}%)`, name ?? payload?.name ?? 'Type'];
                    }}
                  />
                  <Legend />
                  <Pie
                    data={Object.entries(metrics.issues.breakdown).map(([name, value]) => ({
                      name,
                      value,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {Object.entries(metrics.issues.breakdown).map(([name], idx) => (
                      <Cell key={name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              emptyMetricsMessage
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage by Owner</CardTitle>
            <CardDescription>Distribution of documentation ownership</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {metrics.coverage?.byOwner?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.coverage.byOwner.map((owner, idx) => ({
                    ...owner,
                    color: PIE_COLORS[idx % PIE_COLORS.length],
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis type="number" stroke="var(--ts-text-muted)" />
                  <YAxis type="category" dataKey="owner" stroke="var(--ts-text-muted)" width={140} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--ts-surface-0)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--ts-surface-border)',
                    }}
                    formatter={(value: number, _key, payload) => [
                      `${value} files (${payload?.payload?.percentage ?? 0}%)`,
                      payload?.payload?.owner ?? 'Owner',
                    ]}
                  />
                  <Bar dataKey="count" radius={6}>
                    {metrics.coverage.byOwner.map((owner, idx) => (
                      <Cell key={owner.owner} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              emptyMetricsMessage
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage by Category</CardTitle>
            <CardDescription>Domain coverage inferred from file paths</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {metrics.coverage?.byCategory?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.coverage.byCategory.map((category, idx) => ({
                    ...category,
                    color: PIE_COLORS[(idx + 2) % PIE_COLORS.length],
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis type="number" stroke="var(--ts-text-muted)" />
                  <YAxis type="category" dataKey="category" stroke="var(--ts-text-muted)" width={140} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--ts-surface-0)',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--ts-surface-border)',
                    }}
                    formatter={(value: number, _key, payload) => [
                      `${value} files (${payload?.payload?.percentage ?? 0}%)`,
                      payload?.payload?.category ?? 'Category',
                    ]}
                  />
                  <Bar dataKey="count" radius={6}>
                    {metrics.coverage.byCategory.map((category, idx) => (
                      <Cell key={category.category} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              emptyMetricsMessage
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Next steps
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Address critical frontmatter gaps and broken links first. Review stale content (&gt;90 days) and ensure ownership coverage remains balanced
          across guilds.
        </p>
      </section>
    </div>
  );
}
