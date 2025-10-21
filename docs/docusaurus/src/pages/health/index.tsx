import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HealthMetricsCard from '@site/src/components/HealthMetricsCard';
import styles from './styles.module.css';

interface HealthSummary {
  healthScore: number;
  grade: string;
  status: string;
  lastAuditDate: string;
  totalFiles: number;
  issuesSummary: {
    frontmatter: number;
    links: number;
    duplicates: number;
    outdated: number;
  };
}

interface HealthMetrics {
  health_score: number;
  total_files: number;
  frontmatter_complete: number;
  frontmatter_missing: number;
  links_broken: number;
  links_success_rate: number;
  outdated_count: number;
  duplicate_groups: number;
  grade: string;
  status: string;
}

interface Issue {
  file?: string;
  line?: number;
  link_text?: string;
  url?: string;
  error?: string;
  priority?: string;
  issue?: string;
  severity?: string;
  details?: string[];
  last_review?: string;
  days_old?: number;
  domain?: string;
  type?: string;
}

interface IssuesData {
  type: string;
  total: number;
  showing: number;
  issues: Issue[];
}

export default function HealthDashboard() {
  const { siteConfig } = useDocusaurusContext();
  const API_BASE_URL = (siteConfig.customFields?.healthApiUrl as string) || 'http://localhost:3400/api/v1/docs/health';
  const REFRESH_INTERVAL = (siteConfig.customFields?.healthRefreshInterval as number) || 300000; // 5 minutes
  const GRAFANA_URL = (siteConfig.customFields?.grafanaUrl as string) || 'http://localhost:3000/d/docs-health';
  
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [metricsData, setMetricsData] = useState<HealthMetrics | null>(null);
  const [issuesData, setIssuesData] = useState<Record<string, IssuesData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>('links');

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary, metrics, and issues in parallel
      const [summaryRes, metricsRes, linksRes, frontmatterRes, outdatedRes, duplicatesRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/summary`),
          fetch(`${API_BASE_URL}/metrics`),
          fetch(`${API_BASE_URL}/issues?type=links&limit=100`),
          fetch(`${API_BASE_URL}/issues?type=frontmatter&limit=100`),
          fetch(`${API_BASE_URL}/issues?type=outdated&limit=100`),
          fetch(`${API_BASE_URL}/issues?type=duplicates&limit=100`),
        ]);

      if (!summaryRes.ok || !metricsRes.ok) {
        const status = !summaryRes.ok ? summaryRes.status : metricsRes.status;
        throw new Error(`Health API returned HTTP ${status}. Endpoint: ${API_BASE_URL}`);
      }

      const summary = await summaryRes.json();
      const metrics = await metricsRes.json();
      const links = await linksRes.json();
      const frontmatter = await frontmatterRes.json();
      const outdated = await outdatedRes.json();
      const duplicates = await duplicatesRes.json();

      setHealthData(summary.data);
      setMetricsData(metrics.data);
      setIssuesData({
        links: links.data,
        frontmatter: frontmatter.data,
        outdated: outdated.data,
        duplicates: duplicates.data,
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchHealthData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <Layout title="Documentation Health" description="Monitor documentation quality metrics">
        <div className={styles.container}>
          <div className={styles.loading}>Loading health data...</div>
        </div>
      </Layout>
    );
  }

  if (error && !healthData) {
    return (
      <Layout title="Documentation Health" description="Monitor documentation quality metrics">
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>❌ Error Loading Health Data</h2>
            <div className={styles.errorDetails}>
              <p><strong>Error:</strong> {error}</p>
              <p><strong>Endpoint:</strong> <code>{API_BASE_URL}</code></p>
              <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
            </div>
            <div className={styles.errorActions}>
              <button onClick={handleRefresh} className={styles.retryButton}>
                🔄 Retry Now
              </button>
            </div>
            <div className={styles.troubleshooting}>
              <h3>Troubleshooting Steps:</h3>
              <ol>
                <li>
                  <strong>Check Documentation API is running:</strong>
                  <pre>curl {API_BASE_URL.replace('/health', '')}/health</pre>
                </li>
                <li>
                  <strong>Verify CORS configuration:</strong> Ensure <code>http://localhost:3004</code> is in CORS_ORIGIN
                </li>
                <li>
                  <strong>Check network:</strong> Open browser DevTools (F12) → Network tab for detailed errors
                </li>
                <li>
                  <strong>Restart Documentation API:</strong>
                  <pre>docker compose -f infrastructure/compose/docker-compose.docs.yml restart documentation-api</pre>
                </li>
              </ol>
              <p>
                <strong>Need help?</strong> See{' '}
                <a href="/docs/docusaurus/README#troubleshooting">Troubleshooting Guide</a>
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusType = (score: number): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  return (
    <Layout title="Documentation Health" description="Monitor documentation quality metrics">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1>Documentation Health Dashboard</h1>
            <p className={styles.lastUpdate}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleRefresh} className={styles.actionButton} disabled={loading}>
              🔄 Refresh
            </button>
            <a
              href={GRAFANA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionButton}
            >
              📊 View in Grafana
            </a>
          </div>
        </div>

        {/* Overview Cards */}
        {healthData && metricsData && (
          <div className={styles.overviewGrid}>
            <HealthMetricsCard
              title="Overall Health Score"
              value={`${healthData.healthScore}/100`}
              subtitle={`Grade: ${healthData.grade} • ${healthData.status}`}
              status={getStatusType(healthData.healthScore)}
            />
            <HealthMetricsCard
              title="Link Health"
              value={`${metricsData.links_success_rate.toFixed(1)}%`}
              subtitle={`${metricsData.links_broken} broken links`}
              status={metricsData.links_broken === 0 ? 'excellent' : metricsData.links_broken < 10 ? 'good' : 'warning'}
            />
            <HealthMetricsCard
              title="Frontmatter Compliance"
              value={`${((metricsData.frontmatter_complete / metricsData.total_files) * 100).toFixed(1)}%`}
              subtitle={`${metricsData.frontmatter_complete}/${metricsData.total_files} complete`}
              status={metricsData.frontmatter_missing === 0 ? 'excellent' : 'warning'}
            />
            <HealthMetricsCard
              title="Content Freshness"
              value={metricsData.outdated_count}
              subtitle={`Outdated documents (>90 days)`}
              status={metricsData.outdated_count === 0 ? 'excellent' : metricsData.outdated_count < 5 ? 'good' : 'warning'}
            />
          </div>
        )}

        {/* Metrics Grid */}
        {metricsData && (
          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Total Documents</div>
              <div className={styles.metricValue}>{metricsData.total_files}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Duplicate Groups</div>
              <div className={styles.metricValue}>{metricsData.duplicate_groups}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Last Audit</div>
              <div className={styles.metricValue}>{healthData?.lastAuditDate || 'N/A'}</div>
            </div>
          </div>
        )}

        {/* Issues Breakdown */}
        <div className={styles.issuesSection}>
          <h2>Issues Breakdown</h2>

          <div className={styles.tabContainer}>
            <button
              className={activeTab === 'links' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('links')}
            >
              Broken Links ({issuesData.links?.total || 0})
            </button>
            <button
              className={activeTab === 'outdated' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('outdated')}
            >
              Outdated Docs ({issuesData.outdated?.total || 0})
            </button>
            <button
              className={activeTab === 'frontmatter' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('frontmatter')}
            >
              Missing Frontmatter ({issuesData.frontmatter?.total || 0})
            </button>
            <button
              className={activeTab === 'duplicates' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('duplicates')}
            >
              Duplicates ({issuesData.duplicates?.total || 0})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'links' && issuesData.links && (
              <div className={styles.tableContainer}>
                {issuesData.links.total === 0 ? (
                  <div className={styles.emptyState}>✅ No broken links found!</div>
                ) : (
                  <table className={styles.issuesTable}>
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Line</th>
                        <th>Link Text</th>
                        <th>Error</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuesData.links.issues.map((issue, idx) => (
                        <tr key={idx}>
                          <td className={styles.fileCell}>{issue.file}</td>
                          <td>{issue.line}</td>
                          <td>{issue.link_text}</td>
                          <td>{issue.error}</td>
                          <td>
                            <span className={`${styles.priorityBadge} ${styles[`priority-${issue.priority}`]}`}>
                              {issue.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'outdated' && issuesData.outdated && (
              <div className={styles.tableContainer}>
                {issuesData.outdated.total === 0 ? (
                  <div className={styles.emptyState}>✅ All documents are up to date!</div>
                ) : (
                  <table className={styles.issuesTable}>
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Last Review</th>
                        <th>Days Old</th>
                        <th>Domain</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuesData.outdated.issues.map((issue, idx) => (
                        <tr key={idx}>
                          <td className={styles.fileCell}>{issue.file}</td>
                          <td>{issue.last_review}</td>
                          <td>{issue.days_old}</td>
                          <td>{issue.domain}</td>
                          <td>{issue.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'frontmatter' && issuesData.frontmatter && (
              <div className={styles.tableContainer}>
                {issuesData.frontmatter.total === 0 ? (
                  <div className={styles.emptyState}>✅ All files have complete frontmatter!</div>
                ) : (
                  <table className={styles.issuesTable}>
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Issue</th>
                        <th>Severity</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuesData.frontmatter.issues.map((issue, idx) => (
                        <tr key={idx}>
                          <td className={styles.fileCell}>{issue.file}</td>
                          <td>{issue.issue}</td>
                          <td>
                            <span className={`${styles.priorityBadge} ${styles[`priority-${issue.severity}`]}`}>
                              {issue.severity}
                            </span>
                          </td>
                          <td>{issue.details?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'duplicates' && issuesData.duplicates && (
              <div className={styles.tableContainer}>
                {issuesData.duplicates.total === 0 ? (
                  <div className={styles.emptyState}>✅ No duplicate groups found!</div>
                ) : (
                  <div className={styles.duplicatesInfo}>
                    <p>Found {issuesData.duplicates.total} duplicate groups. Most are intentional (similar naming across domains).</p>
                    <p>See <a href="/docs/reports/duplicate-detection-framework">Duplicate Detection Framework</a> for analysis.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h2>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <a href="/docs/context/ops/automated-code-quality" className={styles.actionCard}>
              📖 View Documentation Guide
            </a>
            <a
              href="https://github.com/user/repo/actions"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionCard}
            >
              🔧 View CI/CD Workflows
            </a>
            <a href="/docs/context/shared/tools/health-dashboard-guide" className={styles.actionCard}>
              📊 Dashboard User Guide
            </a>
            <button onClick={() => window.print()} className={styles.actionCard}>
              💾 Export Report
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
