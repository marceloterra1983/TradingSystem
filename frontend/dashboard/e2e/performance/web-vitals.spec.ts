import { test, expect } from '@playwright/test';

/**
 * Web Vitals Performance Tests
 * Measures Core Web Vitals: LCP, FID, CLS, FCP, TTFB
 *
 * Thresholds (Google Recommendations):
 * - LCP (Largest Contentful Paint): < 2.5s (Good), < 4.0s (Needs Improvement)
 * - FID (First Input Delay): < 100ms (Good), < 300ms (Needs Improvement)
 * - CLS (Cumulative Layout Shift): < 0.1 (Good), < 0.25 (Needs Improvement)
 * - FCP (First Contentful Paint): < 1.8s (Good), < 3.0s (Needs Improvement)
 * - TTFB (Time to First Byte): < 800ms (Good), < 1800ms (Needs Improvement)
 */

interface WebVitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  tti?: number;
  tbt?: number;
}

test.describe('Performance - Web Vitals', () => {
  test('should meet Core Web Vitals thresholds - Telegram Gateway', async ({ page }) => {
    const metrics: WebVitalsMetrics = {};

    // Collect Web Vitals using PerformanceObserver API
    await page.goto('/#/telegram-gateway');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow metrics to stabilize

    // Inject Web Vitals collection script
    const webVitals = await page.evaluate(() => {
      return new Promise<WebVitalsMetrics>((resolve) => {
        const metrics: WebVitalsMetrics = {};

        // Collect LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Collect FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Collect CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Collect FCP (First Contentful Paint) and TTFB from Navigation Timing
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;

          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime;
          }
        }

        // Wait a bit for all metrics to be collected
        setTimeout(() => {
          resolve(metrics);
        }, 1000);
      });
    });

    // Assertions
    console.log('Web Vitals Metrics:', webVitals);

    // LCP: < 2.5s (Good), < 4.0s (Needs Improvement)
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(4000); // Warning threshold
      console.log(`✓ LCP: ${webVitals.lcp.toFixed(0)}ms ${webVitals.lcp < 2500 ? '(Good ✅)' : '(Needs Improvement ⚠️)'}`);
    }

    // FCP: < 1.8s (Good), < 3.0s (Needs Improvement)
    if (webVitals.fcp) {
      expect(webVitals.fcp).toBeLessThan(3000);
      console.log(`✓ FCP: ${webVitals.fcp.toFixed(0)}ms ${webVitals.fcp < 1800 ? '(Good ✅)' : '(Needs Improvement ⚠️)'}`);
    }

    // CLS: < 0.1 (Good), < 0.25 (Needs Improvement)
    if (webVitals.cls !== undefined) {
      expect(webVitals.cls).toBeLessThan(0.25);
      console.log(`✓ CLS: ${webVitals.cls.toFixed(3)} ${webVitals.cls < 0.1 ? '(Good ✅)' : '(Needs Improvement ⚠️)'}`);
    }

    // TTFB: < 800ms (Good), < 1800ms (Needs Improvement)
    if (webVitals.ttfb) {
      expect(webVitals.ttfb).toBeLessThan(1800);
      console.log(`✓ TTFB: ${webVitals.ttfb.toFixed(0)}ms ${webVitals.ttfb < 800 ? '(Good ✅)' : '(Needs Improvement ⚠️)'}`);
    }
  });

  test('should have fast resource loading times', async ({ page }) => {
    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');

    const resourceTimings = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: (resource as any).transferSize || 0,
        type: resource.initiatorType,
      })).sort((a, b) => b.duration - a.duration);
    });

    console.log('\nTop 10 Slowest Resources:');
    resourceTimings.slice(0, 10).forEach((resource, i) => {
      console.log(`${i + 1}. ${resource.name.split('/').pop()} - ${resource.duration.toFixed(0)}ms (${(resource.size / 1024).toFixed(1)}KB)`);
    });

    // Assert no single resource takes > 3 seconds
    const slowResources = resourceTimings.filter(r => r.duration > 3000);
    expect(slowResources.length).toBe(0);
  });

  test('should have manageable bundle size', async ({ page }) => {
    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');

    const bundleSize = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const cssResources = resources.filter(r => r.name.endsWith('.css'));

      const totalJsSize = jsResources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0);

      return {
        js: totalJsSize,
        css: totalCssSize,
        total: totalJsSize + totalCssSize,
        jsCount: jsResources.length,
        cssCount: cssResources.length,
      };
    });

    console.log('\nBundle Size:');
    console.log(`  JavaScript: ${(bundleSize.js / 1024).toFixed(1)}KB (${bundleSize.jsCount} files)`);
    console.log(`  CSS: ${(bundleSize.css / 1024).toFixed(1)}KB (${bundleSize.cssCount} files)`);
    console.log(`  Total: ${(bundleSize.total / 1024).toFixed(1)}KB`);

    // Bundle size targets (adjust as needed)
    expect(bundleSize.js).toBeLessThan(1024 * 1024); // < 1MB JS
    expect(bundleSize.css).toBeLessThan(200 * 1024); // < 200KB CSS
  });

  test('should have acceptable memory usage', async ({ page, context }) => {
    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');

    // Interact with the page to trigger memory allocation
    await page.click('button:has-text("Checar Mensagens")');
    await page.waitForTimeout(2000);

    // Get memory metrics (Chrome DevTools Protocol)
    const client = await context.newCDPSession(page);
    const metrics = await client.send('Performance.getMetrics');

    const jsHeapSize = metrics.metrics.find((m: any) => m.name === 'JSHeapUsedSize')?.value || 0;
    const jsHeapLimit = metrics.metrics.find((m: any) => m.name === 'JSHeapTotalSize')?.value || 0;

    console.log('\nMemory Usage:');
    console.log(`  JS Heap Used: ${(jsHeapSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  JS Heap Total: ${(jsHeapLimit / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Usage: ${((jsHeapSize / jsHeapLimit) * 100).toFixed(1)}%`);

    // Assert heap usage is reasonable (< 100MB for this page)
    expect(jsHeapSize).toBeLessThan(100 * 1024 * 1024);
  });

  test('should not have memory leaks after navigation', async ({ page, context }) => {
    const measurements: number[] = [];

    // Measure memory before navigation
    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const getMemory = async () => {
      const client = await context.newCDPSession(page);
      const metrics = await client.send('Performance.getMetrics');
      return metrics.metrics.find((m: any) => m.name === 'JSHeapUsedSize')?.value || 0;
    };

    const initialMemory = await getMemory();
    measurements.push(initialMemory);

    // Navigate and measure multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/#/');
      await page.waitForTimeout(500);
      await page.goto('/#/telegram-gateway');
      await page.waitForTimeout(500);

      const currentMemory = await getMemory();
      measurements.push(currentMemory);
    }

    console.log('\nMemory Measurements (MB):');
    measurements.forEach((m, i) => {
      console.log(`  ${i}: ${(m / 1024 / 1024).toFixed(2)}MB`);
    });

    const finalMemory = measurements[measurements.length - 1];
    const memoryIncrease = finalMemory - initialMemory;
    const increasePercentage = (memoryIncrease / initialMemory) * 100;

    console.log(`\nMemory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(1)}%)`);

    // Memory should not increase by more than 50% after 5 navigations
    expect(increasePercentage).toBeLessThan(50);
  });

  test('should render efficiently (FPS during interaction)', async ({ page }) => {
    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');

    // Start FPS monitoring
    const fpsSamples = await page.evaluate(async () => {
      return new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFPS = () => {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;

          if (delta >= 1000) {
            const fps = Math.round((frameCount * 1000) / delta);
            samples.push(fps);
            frameCount = 0;
            lastTime = currentTime;

            if (samples.length >= 5) {
              resolve(samples);
              return;
            }
          }

          frameCount++;
          requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
      });
    });

    const avgFPS = fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length;
    const minFPS = Math.min(...fpsSamples);

    console.log('\nFPS Metrics:');
    console.log(`  Average: ${avgFPS.toFixed(1)} FPS`);
    console.log(`  Minimum: ${minFPS} FPS`);
    console.log(`  Samples: [${fpsSamples.join(', ')}]`);

    // FPS should be at least 30 (ideally 60)
    expect(avgFPS).toBeGreaterThan(30);
    expect(minFPS).toBeGreaterThan(20);
  });
});

test.describe('Performance - Page Load Speed', () => {
  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/#/telegram-gateway');
    await page.waitForSelector('h1:has-text("Telegram Gateway")', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    console.log(`\nPage Load Time: ${loadTime}ms`);

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should display critical content quickly', async ({ page }) => {
    await page.goto('/#/telegram-gateway');

    // Measure time to key elements
    const timings = await page.evaluate(() => {
      const measures: Record<string, number> = {};
      const startTime = performance.now();

      const checkElement = (selector: string, name: string) => {
        const element = document.querySelector(selector);
        if (element) {
          measures[name] = performance.now() - startTime;
        }
      };

      checkElement('h1', 'Page Title');
      checkElement('table', 'Messages Table');
      checkElement('button:has-text("Checar")', 'Sync Button');

      return measures;
    });

    console.log('\nTime to Critical Elements:');
    Object.entries(timings).forEach(([name, time]) => {
      console.log(`  ${name}: ${time.toFixed(0)}ms`);
    });

    // All critical elements should appear within 2 seconds
    Object.values(timings).forEach(time => {
      expect(time).toBeLessThan(2000);
    });
  });
});

test.describe('Performance - API Response Times', () => {
  test('should have fast API response times', async ({ page }) => {
    const apiCalls: Array<{ url: string; duration: number }> = [];

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          duration: response.timing().responseEnd,
        });
      }
    });

    await page.goto('/#/telegram-gateway');
    await page.waitForLoadState('networkidle');

    console.log('\nAPI Response Times:');
    apiCalls.forEach(call => {
      const endpoint = call.url.split('/api/')[1];
      console.log(`  ${endpoint}: ${call.duration.toFixed(0)}ms`);
    });

    // All API calls should complete within 1 second
    apiCalls.forEach(call => {
      expect(call.duration).toBeLessThan(1000);
    });
  });
});
