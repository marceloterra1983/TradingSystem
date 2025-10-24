import promClient from 'prom-client';

// Use the default registry for all metrics
const _register = promClient.register;

const searchCounter = new promClient.Counter({
  name: 'docs_search_requests_total',
  help: 'Total number of documentation search requests',
  labelNames: ['type', 'source', 'version'],
});

const searchDuration = new promClient.Histogram({
  name: 'docs_search_duration_seconds',
  help: 'Duration of documentation search requests',
  labelNames: ['type', 'source', 'version'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

const searchResults = new promClient.Histogram({
  name: 'docs_search_results_count',
  help: 'Number of results returned by documentation search',
  labelNames: ['type', 'source', 'version'],
  buckets: [0, 1, 5, 10, 20, 50],
});

const searchErrors = new promClient.Counter({
  name: 'docs_search_errors_total',
  help: 'Total number of documentation search errors',
  labelNames: ['type', 'error'],
});

// New metrics for faceted search
const facetedSearchCounter = new promClient.Counter({
  name: 'docs_faceted_search_requests_total',
  help: 'Total number of faceted search requests',
  labelNames: ['domain', 'type', 'status', 'tags_count'],
});

const facetRequestCounter = new promClient.Counter({
  name: 'docs_facet_requests_total',
  help: 'Total number of facet endpoint requests',
});

const filterUsageCounter = new promClient.Counter({
  name: 'docs_search_filters_used_total',
  help: 'Total number of search filters used',
  labelNames: ['filter_type'],
});

const zeroResultsCounter = new promClient.Counter({
  name: 'docs_search_zero_results_total',
  help: 'Total number of searches with zero results',
});

const popularTagsGauge = new promClient.Gauge({
  name: 'docs_popular_tags',
  help: 'Popular tags by search frequency',
  labelNames: ['tag'],
});

class SearchMetrics {
  constructor() {
    this.counter = searchCounter;
    this.duration = searchDuration;
    this.results = searchResults;
    this.errors = searchErrors;
    this.facetedSearch = facetedSearchCounter;
    this.facetRequest = facetRequestCounter;
    this.filterUsage = filterUsageCounter;
    this.zeroResults = zeroResultsCounter;
    this.popularTags = popularTagsGauge;
  }

  recordSearch(options = {}) {
    const { type, source, version } = options;
    const labels = { type, source, version };
    this.counter.inc(labels);
    return this.duration.startTimer(labels);
  }

  recordResults(count, options = {}) {
    const { type, source, version } = options;
    const labels = { type, source, version };
    this.results.observe(labels, count);
  }

  recordError(error, options = {}) {
    const { type } = options;
    this.errors.inc({
      type,
      error: error.name || 'UnknownError',
    });
  }

  recordFacetedSearch(query, filters, resultCount) {
    // Record faceted search request
    const labels = {
      domain: filters.domain || 'all',
      type: filters.type || 'all',
      status: filters.status || 'all',
      tags_count: filters.tags ? filters.tags.length.toString() : '0',
    };
    this.facetedSearch.inc(labels);

    // Record filter usage
    if (filters.domain) {
      this.filterUsage.inc({ filter_type: 'domain' });
    }
    if (filters.type) {
      this.filterUsage.inc({ filter_type: 'type' });
    }
    if (filters.tags && filters.tags.length > 0) {
      this.filterUsage.inc({ filter_type: 'tags' });
    }
    if (filters.status) {
      this.filterUsage.inc({ filter_type: 'status' });
    }

    // Record zero results
    if (resultCount === 0) {
      this.zeroResults.inc();
    }

    // Update popular tags
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => {
        this.popularTags.inc({ tag });
      });
    }
  }

  recordFacetRequest() {
    this.facetRequest.inc();
  }

  async getSearchAnalytics() {
    try {
      const totalSearches = await this.getTotalSearches();
      const facetedSearches = await this.getTotalFacetedSearches();
      const filterUsage = await this.getFilterUsage();
      const popularTags = await this.getTopTags(20);
      const zeroResultQueries = await this.getZeroResultCount();
      const avgDuration = await this.getAverageDuration();

      return {
        totalSearches,
        facetedSearches,
        filterUsage,
        popularTags,
        zeroResultQueries,
        avgDuration,
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  async getTotalFacetedSearches() {
    const result = await promClient.register.getSingleMetric(
      'docs_faceted_search_requests_total'
    );
    return result
      ? result.get().values.reduce((sum, value) => sum + value.value, 0)
      : 0;
  }

  async getFilterUsage() {
    const result = await promClient.register.getSingleMetric(
      'docs_search_filters_used_total'
    );
    if (!result) return {};

    const values = result.get().values;
    const usage = {};
    values.forEach((value) => {
      const filterType = value.labels.filter_type;
      usage[filterType] = value.value;
    });
    return usage;
  }

  async getTopTags(limit = 20) {
    const result = await promClient.register.getSingleMetric(
      'docs_popular_tags'
    );
    if (!result) return [];

    const values = result.get().values;
    return values
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((value) => ({
        tag: value.labels.tag,
        count: value.value,
      }));
  }

  async getZeroResultCount() {
    const result = await promClient.register.getSingleMetric(
      'docs_search_zero_results_total'
    );
    return result
      ? result.get().values.reduce((sum, value) => sum + value.value, 0)
      : 0;
  }

  async getSearchStats() {
    try {
      // Note: PromQL queries require Prometheus server, not available in-process
      // Return in-process metrics only
      return {
        totalSearches: await this.getTotalSearches(),
        averageDuration: await this.getAverageDuration(),
        popularQueries: await this.getPopularQueries(),
      };
    } catch (error) {
      console.error('Failed to get search stats:', error);
      throw error;
    }
  }

  async getTotalSearches() {
    const result = await promClient.register.getSingleMetric(
      'docs_search_requests_total'
    );
    return result
      ? result.get().values.reduce((sum, value) => sum + value.value, 0)
      : 0;
  }

  async getAverageDuration() {
    const result = await promClient.register.getSingleMetric(
      'docs_search_duration_seconds'
    );
    if (!result) return 0;

    // Get histogram values and compute average from sum/count labels
    const values = result.get().values;
    let sum = 0;
    let count = 0;

    // Find entries with 'sum' and 'count' labels
    values.forEach((entry) => {
      if (entry.metricName && entry.metricName.includes('sum')) {
        sum = entry.value || 0;
      }
      if (entry.metricName && entry.metricName.includes('count')) {
        count = entry.value || 0;
      }
    });

    return count > 0 ? sum / count : 0;
  }

  async getPopularQueries() {
    // This would require query logging - return placeholder
    return [
      { query: 'user', count: 150 },
      { query: 'api', count: 120 },
      { query: 'endpoint', count: 100 },
      { query: 'schema', count: 80 },
      { query: 'websocket', count: 60 },
    ];
  }
}

export default new SearchMetrics();

