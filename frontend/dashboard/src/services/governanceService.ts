export interface GovernanceSnapshot {
  metadata: {
    generatedAt: string;
    version: string;
    source: string;
  };
  totals: {
    artifacts: number;
    published: number;
    evidence: number;
  };
  freshness: {
    distribution: {
      healthy: number;
      warning: number;
      overdue: number;
    };
    overdue: Array<{
      id: string;
      title: string;
      owner: string;
      daysOverdue: number;
    }>;
    upcoming: Array<{
      id: string;
      title: string;
      owner: string;
      dueDate: string;
      daysUntilDue: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      count: number;
    }>;
  };
  reviewTracking: {
    statusCounts: Record<string, number>;
    governanceStatusCounts: Record<string, number>;
    records: Array<Record<string, string>>;
  };
  artifacts: GovernanceArtifact[];
}

export interface GovernanceArtifact {
  id: string;
  title: string;
  description?: string;
  owner: string;
  category: string;
  type: string;
  tags: string[];
  lastReviewed: string;
  reviewCycleDays: number;
  publishSlug?: string | null;
  previewPath?: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      `Failed to load governance snapshot (${response.status} ${response.statusText})`,
    );
  }
  return (await response.json()) as T;
}

export async function getGovernanceSnapshot(): Promise<GovernanceSnapshot> {
  const cacheBuster = Date.now();
  return fetchJson<GovernanceSnapshot>(
    `/data/governance/latest.json?ts=${cacheBuster}`,
  );
}

export async function getStaticGovernanceSnapshot(): Promise<GovernanceSnapshot> {
  return fetchJson<GovernanceSnapshot>('/data/governance/latest.json');
}
