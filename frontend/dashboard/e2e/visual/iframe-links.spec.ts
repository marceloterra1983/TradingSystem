import { test, expect } from '@playwright/test';

const MOCK_HTML = (label: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />` +
  `<title>${label}</title><style>
      body { font-family: system-ui, sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #e2e8f0; }
      h1 { font-size: 18px; font-weight: 600; }
    </style></head><body><h1>${label}</h1></body></html>`;

const IFRAME_MOCKS: Array<{ pattern: string; label: string }> = [
  { pattern: 'http://localhost:9080/kestra/**', label: 'Kestra Mock' },
  { pattern: 'http://localhost:3400/**', label: 'Docs Portal Mock' },
  { pattern: 'http://localhost:3402/**', label: 'Docs API Mock' },
  { pattern: 'http://localhost:5175/viewers/**', label: 'Docs Viewer Mock' },
  { pattern: 'http://localhost:9000/**', label: 'QuestDB Console Mock' },
  { pattern: 'http://localhost:7010/**', label: 'QuestDB Service Mock' },
  { pattern: 'http://localhost:7100/**', label: 'pgAdmin Mock' },
  { pattern: 'http://localhost:7101/**', label: 'Adminer Mock' },
  { pattern: 'http://localhost:7102/**', label: 'pgWeb Mock' },
  { pattern: 'https://miro.com/**', label: 'Miro Mock' },
];

type TestCase = {
  name: string;
  hash: string;
  expectedHref?: string | RegExp;
};

const TEST_CASES: TestCase[] = [
  {
    name: 'kestra',
    hash: '/#/kestra-orchestrator',
    expectedHref: 'http://localhost:9080/kestra/ui',
  },
  {
    name: 'miro',
    hash: '/#/miro',
    expectedHref: 'https://miro.com/app/live-embed/uXjVJ3tP9YI=/',
  },
  {
    name: 'docs-portal',
    hash: '/#/docs',
    expectedHref: 'http://localhost:3400/docs/next/',
  },
  {
    name: 'docs-api',
    hash: '/#/docs?view=docsApi',
    expectedHref:
      '/viewers/redoc.html?url=%2Fspecs%2Fdocumentation-api.openapi.yaml',
  },
  {
    name: 'database-questdb',
    hash: '/#/knowledge-database',
    expectedHref: 'http://localhost:7010',
  },
];

async function prepareRoutes(page: import('@playwright/test').Page) {
  await Promise.all(
    IFRAME_MOCKS.map(async ({ pattern, label }) => {
      await page.route(pattern, async (route) => {
        if (process.env.DEBUG_IFRAME_TESTS === 'true') {
          console.log(`[iframe-debug] fulfilling mock for ${pattern}`);
        }
        await route.fulfill({
          status: 200,
          body: MOCK_HTML(label),
          contentType: 'text/html',
        });
      });
    }),
  );
}

async function gotoAndWaitForLink(
  page: import('@playwright/test').Page,
  hash: string,
) {
  await page.goto(hash);
  const linkCandidates = page.locator('main [data-testid="iframe-source-url"]');
  const deadline = Date.now() + 15000;
  let count = 0;
  do {
    count = await linkCandidates.count();
    if (count > 0) {
      break;
    }
    await page.waitForTimeout(250);
  } while (Date.now() < deadline);

  const debugHtml = await page.evaluate(() =>
    document.querySelector('main')?.innerHTML ?? 'main not found',
  );
  if (process.env.DEBUG_IFRAME_TESTS === 'true') {
    console.log(`[iframe-debug] main content for ${hash}:`, debugHtml);
  }

  if (count === 0) {
    throw new Error('iframe source link should render at least once');
  }
  const linkLocator = linkCandidates.first();
  await expect(linkLocator).toBeVisible({ timeout: 5000 });
  return linkLocator;
}

test.describe('Iframe link overlays', () => {
  test.beforeEach(async ({ page }) => {
    await prepareRoutes(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('sidebar-collapsed', 'false');
      } catch (error) {
        console.warn('Failed to preset localStorage', error);
      }
    });
  });

  for (const { name, hash, expectedHref } of TEST_CASES) {
    test(`${name} displays source link`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Snapshots executed only in Chromium projects');

      const link = await gotoAndWaitForLink(page, hash);
      if (expectedHref) {
        await expect(link).toHaveAttribute('href', expectedHref);
      }

      const mainContent = page.locator('main');
      await expect(mainContent).toHaveScreenshot(`${name}.png`, {
        animations: 'disabled',
      });
    });
  }
});
