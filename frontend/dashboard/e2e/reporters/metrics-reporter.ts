import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom Metrics Reporter for Playwright
 * Tracks test execution metrics, flakiness, duration trends, and generates analytics
 *
 * Outputs:
 * - playwright-report/metrics.json - Detailed metrics
 * - playwright-report/metrics-summary.txt - Human-readable summary
 * - playwright-report/flaky-tests.json - Tests that required retries
 * - playwright-report/slow-tests.json - Tests exceeding duration thresholds
 */

interface TestMetric {
  title: string;
  file: string;
  duration: number;
  status: string;
  retries: number;
  browser?: string;
  timestamp: number;
  error?: string;
  annotations: string[];
  steps: StepMetric[];
}

interface StepMetric {
  title: string;
  duration: number;
  error?: string;
}

interface MetricsSummary {
  totalTests: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  totalDuration: number;
  avgTestDuration: number;
  slowTests: TestMetric[];
  flakyTests: TestMetric[];
  failedTests: TestMetric[];
  browserBreakdown: Record<string, { passed: number; failed: number; duration: number }>;
  fileBreakdown: Record<string, { tests: number; duration: number; passed: number; failed: number }>;
}

export default class MetricsReporter implements Reporter {
  private startTime: number = 0;
  private testMetrics: TestMetric[] = [];
  private slowTestThreshold: number = 10000; // 10 seconds
  private outputDir: string = 'playwright-report';

  constructor(options: { slowTestThreshold?: number; outputDir?: string } = {}) {
    if (options.slowTestThreshold) {
      this.slowTestThreshold = options.slowTestThreshold;
    }
    if (options.outputDir) {
      this.outputDir = options.outputDir;
    }
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    const testCount = suite.allTests().length;

    console.log('');
    console.log('📊 Metrics Reporter Started');
    console.log(`   Tests to run: ${testCount}`);
    console.log(`   Workers: ${config.workers}`);
    console.log(`   Slow test threshold: ${this.slowTestThreshold}ms`);
    console.log('');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const metric: TestMetric = {
      title: test.title,
      file: test.location.file,
      duration: result.duration,
      status: result.status,
      retries: result.retry,
      browser: test.parent.project()?.name,
      timestamp: Date.now(),
      error: result.error?.message,
      annotations: result.annotations.map(a => a.type),
      steps: this.extractStepMetrics(result.steps),
    };

    this.testMetrics.push(metric);

    // Real-time feedback for slow or flaky tests
    if (result.retry > 0) {
      console.log(`⚠️  Flaky test (retry ${result.retry}): ${test.title}`);
    }

    if (result.duration > this.slowTestThreshold) {
      console.log(`🐌 Slow test (${result.duration}ms): ${test.title}`);
    }
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;

    const summary = this.generateSummary(duration);

    // Output results
    await this.writeMetricsFiles(summary);

    // Print summary to console
    this.printSummary(summary);

    // Exit with appropriate code
    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  }

  private extractStepMetrics(steps: TestStep[]): StepMetric[] {
    return steps.map(step => ({
      title: step.title,
      duration: step.duration,
      error: step.error?.message,
    }));
  }

  private generateSummary(totalDuration: number): MetricsSummary {
    const passed = this.testMetrics.filter(t => t.status === 'passed').length;
    const failed = this.testMetrics.filter(t => t.status === 'failed').length;
    const flaky = this.testMetrics.filter(t => t.retries > 0).length;
    const skipped = this.testMetrics.filter(t => t.status === 'skipped').length;

    const slowTests = this.testMetrics
      .filter(t => t.duration > this.slowTestThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const flakyTests = this.testMetrics
      .filter(t => t.retries > 0)
      .sort((a, b) => b.retries - a.retries);

    const failedTests = this.testMetrics
      .filter(t => t.status === 'failed')
      .sort((a, b) => b.duration - a.duration);

    const browserBreakdown: Record<string, { passed: number; failed: number; duration: number }> =
      {};

    this.testMetrics.forEach(metric => {
      const browser = metric.browser || 'unknown';

      if (!browserBreakdown[browser]) {
        browserBreakdown[browser] = { passed: 0, failed: 0, duration: 0 };
      }

      if (metric.status === 'passed') {
        browserBreakdown[browser].passed++;
      } else if (metric.status === 'failed') {
        browserBreakdown[browser].failed++;
      }

      browserBreakdown[browser].duration += metric.duration;
    });

    const fileBreakdown: Record<
      string,
      { tests: number; duration: number; passed: number; failed: number }
    > = {};

    this.testMetrics.forEach(metric => {
      const file = path.basename(metric.file);

      if (!fileBreakdown[file]) {
        fileBreakdown[file] = { tests: 0, duration: 0, passed: 0, failed: 0 };
      }

      fileBreakdown[file].tests++;
      fileBreakdown[file].duration += metric.duration;

      if (metric.status === 'passed') {
        fileBreakdown[file].passed++;
      } else if (metric.status === 'failed') {
        fileBreakdown[file].failed++;
      }
    });

    const avgTestDuration =
      this.testMetrics.length > 0
        ? this.testMetrics.reduce((sum, t) => sum + t.duration, 0) / this.testMetrics.length
        : 0;

    return {
      totalTests: this.testMetrics.length,
      passed,
      failed,
      flaky,
      skipped,
      totalDuration,
      avgTestDuration,
      slowTests,
      flakyTests,
      failedTests,
      browserBreakdown,
      fileBreakdown,
    };
  }

  private async writeMetricsFiles(summary: MetricsSummary) {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Write detailed metrics JSON
    const metricsFile = path.join(this.outputDir, 'metrics.json');
    await fs.promises.writeFile(
      metricsFile,
      JSON.stringify(
        {
          summary,
          details: this.testMetrics,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // Write human-readable summary
    const summaryFile = path.join(this.outputDir, 'metrics-summary.txt');
    await fs.promises.writeFile(summaryFile, this.formatSummaryText(summary));

    // Write flaky tests report
    if (summary.flakyTests.length > 0) {
      const flakyFile = path.join(this.outputDir, 'flaky-tests.json');
      await fs.promises.writeFile(flakyFile, JSON.stringify(summary.flakyTests, null, 2));
    }

    // Write slow tests report
    if (summary.slowTests.length > 0) {
      const slowFile = path.join(this.outputDir, 'slow-tests.json');
      await fs.promises.writeFile(slowFile, JSON.stringify(summary.slowTests, null, 2));
    }

    // Write failed tests report
    if (summary.failedTests.length > 0) {
      const failedFile = path.join(this.outputDir, 'failed-tests.json');
      await fs.promises.writeFile(failedFile, JSON.stringify(summary.failedTests, null, 2));
    }

    console.log(`\n📁 Reports saved to ${this.outputDir}/`);
  }

  private formatSummaryText(summary: MetricsSummary): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('📊 TEST EXECUTION METRICS SUMMARY');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('OVERVIEW');
    lines.push('-'.repeat(80));
    lines.push(`Total Tests:       ${summary.totalTests}`);
    lines.push(`Passed:            ${summary.passed} (${this.percentage(summary.passed, summary.totalTests)}%)`);
    lines.push(`Failed:            ${summary.failed} (${this.percentage(summary.failed, summary.totalTests)}%)`);
    lines.push(`Flaky:             ${summary.flaky} (${this.percentage(summary.flaky, summary.totalTests)}%)`);
    lines.push(`Skipped:           ${summary.skipped}`);
    lines.push('');

    lines.push('TIMING');
    lines.push('-'.repeat(80));
    lines.push(`Total Duration:    ${this.formatDuration(summary.totalDuration)}`);
    lines.push(`Avg Test Duration: ${this.formatDuration(summary.avgTestDuration)}`);
    lines.push('');

    lines.push('BROWSER BREAKDOWN');
    lines.push('-'.repeat(80));
    Object.entries(summary.browserBreakdown).forEach(([browser, stats]) => {
      lines.push(`${browser.padEnd(20)} Passed: ${stats.passed.toString().padStart(4)} | Failed: ${stats.failed.toString().padStart(4)} | Duration: ${this.formatDuration(stats.duration)}`);
    });
    lines.push('');

    if (summary.slowTests.length > 0) {
      lines.push('SLOW TESTS (Top 10)');
      lines.push('-'.repeat(80));
      summary.slowTests.slice(0, 10).forEach((test, i) => {
        lines.push(`${(i + 1).toString().padStart(2)}. ${this.formatDuration(test.duration).padStart(8)} - ${test.title}`);
        lines.push(`    File: ${path.basename(test.file)}`);
      });
      lines.push('');
    }

    if (summary.flakyTests.length > 0) {
      lines.push('FLAKY TESTS');
      lines.push('-'.repeat(80));
      summary.flakyTests.forEach((test, i) => {
        lines.push(`${(i + 1).toString().padStart(2)}. ${test.title} (${test.retries} retries)`);
        lines.push(`    File: ${path.basename(test.file)}`);
      });
      lines.push('');
    }

    if (summary.failedTests.length > 0) {
      lines.push('FAILED TESTS');
      lines.push('-'.repeat(80));
      summary.failedTests.forEach((test, i) => {
        lines.push(`${(i + 1).toString().padStart(2)}. ${test.title}`);
        lines.push(`    File: ${path.basename(test.file)}`);
        if (test.error) {
          lines.push(`    Error: ${test.error.substring(0, 100)}...`);
        }
      });
      lines.push('');
    }

    lines.push('FILE BREAKDOWN');
    lines.push('-'.repeat(80));
    Object.entries(summary.fileBreakdown)
      .sort((a, b) => b[1].duration - a[1].duration)
      .forEach(([file, stats]) => {
        lines.push(`${file.padEnd(40)} Tests: ${stats.tests.toString().padStart(3)} | Passed: ${stats.passed.toString().padStart(3)} | Duration: ${this.formatDuration(stats.duration)}`);
      });
    lines.push('');

    lines.push('='.repeat(80));
    lines.push(`Generated at: ${new Date().toISOString()}`);
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  private printSummary(summary: MetricsSummary) {
    console.log('');
    console.log('📊 Test Execution Metrics Summary');
    console.log('═'.repeat(60));
    console.log('');

    const passRate = this.percentage(summary.passed, summary.totalTests);
    const passIcon = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌';

    console.log(`${passIcon} Pass Rate:         ${passRate}% (${summary.passed}/${summary.totalTests})`);
    console.log(`   Failed:            ${summary.failed}`);
    console.log(`   Flaky:             ${summary.flaky} ${summary.flaky > 0 ? '⚠️' : ''}`);
    console.log(`   Total Duration:    ${this.formatDuration(summary.totalDuration)}`);
    console.log(`   Avg Test Duration: ${this.formatDuration(summary.avgTestDuration)}`);
    console.log('');

    if (summary.slowTests.length > 0) {
      console.log(`🐌 Slow Tests: ${summary.slowTests.length} tests exceeded ${this.slowTestThreshold}ms`);
    }

    if (summary.flakyTests.length > 0) {
      console.log(`⚠️  Flaky Tests: ${summary.flakyTests.length} tests required retries`);
    }

    console.log('');
    console.log(`📁 Detailed reports: ${this.outputDir}/metrics.json`);
    console.log('');
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  private percentage(value: number, total: number): number {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }
}
