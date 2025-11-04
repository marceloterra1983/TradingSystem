const AGE_KEYS = [
  'days_old',
  'lastReviewedDays',
  'last_reviewed_days',
  'daysSinceLastReview',
  'days_since_last_review',
  'age',
];

const DATE_KEYS = [
  'lastReviewed',
  'last_reviewed',
  'lastReviewedAt',
  'last_reviewed_at',
  'lastReviewedDate',
  'last_reviewed_date',
  'lastReviewedOn',
  'last_reviewed_on',
  'lastUpdated',
  'last_updated',
  'reviewed_at',
  'reviewedAt',
];

function resolveNumeric(value) {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.length;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function resolveFileAge(record = {}) {
  for (const key of AGE_KEYS) {
    if (record[key] != null) {
      const numeric = Number(record[key]);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
  }

  const freshness = record.freshness ?? record.metadata?.freshness ?? {};
  const days = resolveNumeric(freshness.days ?? freshness);
  if (days != null) {
    return days;
  }

  const resolveDateCandidate = (value) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const diffMs = Date.now() - parsed.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return 0;
    }
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const dateSources = [
    record,
    record.metadata ?? {},
    record.frontmatter ?? record.frontMatter ?? {},
  ];

  for (const source of dateSources) {
    if (!source || typeof source !== 'object') {
      continue;
    }
    for (const key of DATE_KEYS) {
      if (source[key] != null) {
        const candidate = resolveDateCandidate(source[key]);
        if (candidate != null) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function trackAge(age, buckets, collector) {
  if (age == null) {
    return;
  }

  const numeric = Number(age);
  if (Number.isNaN(numeric)) {
    return;
  }

  collector.push(numeric);

  if (numeric < 30) {
    buckets[0].count += 1;
  } else if (numeric < 60) {
    buckets[1].count += 1;
  } else if (numeric < 90) {
    buckets[2].count += 1;
  } else {
    buckets[3].count += 1;
  }
}

function firstDefined(...values) {
  for (const value of values) {
    if (value != null) {
      return value;
    }
  }
  return null;
}

export function computeFreshnessMetrics({
  records = [],
  ages = [],
  freshnessAnalysis = {},
  outdatedCount,
  staleCount,
} = {}) {
  const buckets = [
    { label: '<30 days', count: 0 },
    { label: '30-60 days', count: 0 },
    { label: '60-90 days', count: 0 },
    { label: '>90 days', count: 0 },
  ];

  const collectedAges = [];

  records.forEach((record) => {
    const age = resolveFileAge(record);
    trackAge(age, buckets, collectedAges);
  });

  ages.forEach((age) => {
    trackAge(age, buckets, collectedAges);
  });

  const total = collectedAges.length || 1;
  const distribution = buckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    percentage: Math.round((bucket.count / total) * 100),
  }));

  const resolvedOutdated =
    firstDefined(
      resolveNumeric(outdatedCount),
      resolveNumeric(staleCount),
      resolveNumeric(freshnessAnalysis.outdated_count),
      resolveNumeric(freshnessAnalysis.stale_count),
    ) ?? buckets[3].count;

  const averageAge =
    collectedAges.length > 0
      ? Math.round(
          collectedAges.reduce((sum, value) => sum + value, 0) / collectedAges.length,
        )
      : 0;

  return {
    distribution,
    outdatedCount: resolvedOutdated,
    averageAge,
  };
}

function normaliseCount(value) {
  const numeric = resolveNumeric(value);
  return numeric ?? 0;
}

export function computeIssueBreakdown({
  missingFrontmatter = 0,
  incompleteFrontmatter = 0,
  invalidFrontmatter = 0,
  brokenLinks = 0,
  staleFiles = 0,
  shortFiles = 0,
} = {}) {
  const missing = normaliseCount(missingFrontmatter);
  const incomplete = normaliseCount(incompleteFrontmatter);
  const invalid = normaliseCount(invalidFrontmatter);
  const broken = normaliseCount(brokenLinks);
  const stale = normaliseCount(staleFiles);
  const short = normaliseCount(shortFiles);

  const frontmatterIssues = missing + incomplete + invalid;

  const breakdown = {
    frontmatter: frontmatterIssues,
    links: broken,
    content: stale + short,
  };

  const bySeverity = {
    critical: missing + broken,
    high: invalid + incomplete,
    medium: stale,
    low: short,
  };

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return {
    breakdown,
    bySeverity,
    total,
  };
}

const COVERAGE_PAIRS = [
  { match: (path) => path.includes('/api/'), label: 'API' },
  { match: (path) => path.includes('/apps/'), label: 'Apps' },
  { match: (path) => path.includes('/frontend/'), label: 'Frontend' },
  { match: (path) => path.includes('/tools/'), label: 'Tools' },
  { match: (path) => path.includes('/reference/'), label: 'Reference' },
  { match: (path) => path.includes('/governance/'), label: 'Governance' },
];

function defaultPathGetter(record = {}) {
  return (
    record.path ??
    record.file ??
    record.filepath ??
    record.file_path ??
    record.source_path ??
    record.source ??
    record.filePath
  );
}

export function resolveCategory(normalisedPath = '') {
  for (const { match, label } of COVERAGE_PAIRS) {
    if (match(normalisedPath)) {
      return label;
    }
  }

  const segments = normalisedPath.split('/').filter(Boolean);
  if (segments[0] === 'docs' && segments[1]) {
    return segments[1].replace(/-/g, ' ');
  }

  return 'Other';
}

export function computeCoverageMetrics({
  totalFiles,
  ownerDistribution = {},
  records = [],
  pathGetter = defaultPathGetter,
  categoryResolver = resolveCategory,
} = {}) {
  const derivedTotal =
    resolveNumeric(totalFiles) ?? (Array.isArray(records) ? records.length : 0);

  const byOwner = Object.entries(ownerDistribution).map(([owner, value]) => {
    const count = normaliseCount(value);
    return {
      owner,
      count,
      percentage: derivedTotal > 0 ? Math.round((count / derivedTotal) * 100) : 0,
    };
  });

  const categories = new Map();

  (records || []).forEach((record) => {
    const rawPath = pathGetter(record);
    if (!rawPath) {
      return;
    }

    const normalised = String(rawPath).replace(/\\/g, '/');
    const category = categoryResolver(normalised, record);
    categories.set(category, (categories.get(category) ?? 0) + 1);
  });

  const byCategory = Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
    percentage: derivedTotal > 0 ? Math.round((count / derivedTotal) * 100) : 0,
  }));

  return {
    byOwner: byOwner.sort((a, b) => b.count - a.count),
    byCategory: byCategory.sort((a, b) => b.count - a.count),
    totalFiles: derivedTotal,
  };
}

export default {
  resolveFileAge,
  computeFreshnessMetrics,
  computeIssueBreakdown,
  computeCoverageMetrics,
  resolveCategory,
};
