import type { Logger } from 'pino';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { EnvironmentConfig } from '../config/environment.js';
import type { PlatformConfig } from '../config/platform.js';

export interface AuthenticatedSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function createAuthenticatedSession(
  env: EnvironmentConfig,
  platformConfig: PlatformConfig,
  logger: Logger,
): Promise<AuthenticatedSession> {
  const browser = await chromium.launch({
    headless: env.browser.headless,
    args: ['--disable-dev-shm-usage'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await loginWithBrowserUseOrPlaywright(page, platformConfig, env, logger);

  return { browser, context, page };
}

export async function loginWithBrowserUseOrPlaywright(
  page: Page,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
) {
  await navigateWithRetry(page, config.login.url, 'domcontentloaded', logger);

  if (env.browser.useBrowserUse) {
    try {
      const moduleRef: any = await import('browser-use');
      const maybeRunner = moduleRef?.default ?? moduleRef?.BrowserUse;
      if (maybeRunner?.runFlow) {
        logger.info('[course-crawler] Attempting Browser-Use login flow');
        await maybeRunner.runFlow(page, [
          {
            action: 'type',
            selector: config.login.usernameSelector,
            value: env.browser.username,
          },
          {
            action: 'type',
            selector: config.login.passwordSelector,
            value: env.browser.password,
          },
          { action: 'click', selector: config.login.submitSelector },
          {
            action: 'waitForSelector',
            selector: config.login.postLoginWaitSelector,
            timeout: 10000,
          },
        ]);
        return;
      }
    } catch (error) {
      logger.warn(
        { err: error },
        '[course-crawler] Browser-Use login failed, falling back to manual Playwright flow',
      );
    }
  }

  await page.fill(config.login.usernameSelector, env.browser.username);
  await page.fill(config.login.passwordSelector, env.browser.password);
  await Promise.all([
    waitForNavigationWithRetry(page, { waitUntil: 'domcontentloaded' }, logger),
    page.click(config.login.submitSelector),
  ]);
  await waitForSelectorWithRetry(
    page,
    config.login.postLoginWaitSelector,
    logger,
  );
}

export async function safeCloseBrowser(browser: Browser, logger: Logger) {
  try {
    await browser.close();
  } catch (error) {
    logger.error({ err: error }, '[course-crawler] Failed to close browser');
  }
}

async function navigateWithRetry(
  page: Page,
  url: string,
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
  logger: Logger,
  retries = 5,
) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await page.goto(url, { waitUntil });
      await page.waitForTimeout(500);
      return;
    } catch (error) {
      if (
        attempt === retries ||
        !(error instanceof Error) ||
        !/ERR_NETWORK_CHANGED/i.test(error.message)
      ) {
        throw error;
      }
      logger.warn(
        { attempt, url, err: error },
        '[course-crawler] Network changed during navigation, retrying',
      );
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

async function waitForNavigationWithRetry(
  page: Page,
  options: Parameters<Page['waitForNavigation']>[0],
  logger: Logger,
  retries = 5,
) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await page.waitForNavigation(options);
      return;
    } catch (error) {
      if (
        attempt === retries ||
        !(error instanceof Error) ||
        !/ERR_NETWORK_CHANGED/i.test(error.message)
      ) {
        throw error;
      }
      logger.warn(
        { attempt, err: error },
        '[course-crawler] Network changed during waitForNavigation, retrying',
      );
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

async function waitForSelectorWithRetry(
  page: Page,
  selector: string,
  logger: Logger,
  retries = 5,
) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      return;
    } catch (error) {
      if (
        attempt === retries ||
        !(error instanceof Error) ||
        !/ERR_NETWORK_CHANGED/i.test(error.message)
      ) {
        throw error;
      }
      logger.warn(
        { attempt, selector, err: error },
        '[course-crawler] Network changed during waitForSelector, retrying',
      );
      await page.waitForTimeout(1000 * attempt);
    }
  }
}
