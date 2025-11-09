import type { Logger } from 'pino';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import CircuitBreaker from 'opossum';
import type { EnvironmentConfig } from '../config/environment.js';
import type { PlatformConfig } from '../config/platform.js';

// Circuit breaker configuration for browser operations
const browserBreakerConfig = {
  timeout: 60000, // allow slower logins (Hotmart, Jumba) before tripping
  errorThresholdPercentage: 50,
  resetTimeout: 60000, // Try again after 1 minute
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  name: 'BrowserCircuitBreaker',
};

let lastBrowserFailure: Error | undefined;

export interface AuthenticatedSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

// Internal implementation without circuit breaker
async function _createAuthenticatedSession(
  env: EnvironmentConfig,
  platformConfig: PlatformConfig,
  logger: Logger,
): Promise<AuthenticatedSession> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    browser = await chromium.launch({
      headless: env.browser.headless,
      args: ['--disable-dev-shm-usage'],
    });
    context = await browser.newContext();
    const page = await context.newPage();

    logger.info(
      {
        loginUrl: platformConfig.login.url,
        baseUrl: env.browser.baseUrl,
        headless: env.browser.headless,
        selectorsConfigPath: env.browser.selectorsConfigPath,
      },
      '[course-crawler] Opening authenticated browser session',
    );

    await loginWithBrowserUseOrPlaywright(page, platformConfig, env, logger);
    logger.info('[course-crawler] Authenticated browser session established');

    return { browser, context, page };
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    lastBrowserFailure = normalizedError;
    logger.error(
      {
        err: normalizedError,
        loginUrl: platformConfig.login.url,
        selectorsConfigPath: env.browser.selectorsConfigPath,
      },
      '[course-crawler] Failed to initialize authenticated browser session',
    );
    try {
      await context?.close();
    } catch {
      // ignore close errors
    }
    try {
      await browser?.close();
    } catch {
      // ignore close errors
    }
    throw normalizedError;
  }
}

// Circuit breaker for browser session creation
const browserBreaker = new CircuitBreaker(_createAuthenticatedSession, browserBreakerConfig);

// Log circuit state changes
browserBreaker.on('open', () => {
  console.warn('[BrowserCircuitBreaker] ⚠️  Circuit opened - too many browser failures');
});

browserBreaker.on('halfOpen', () => {
  console.info('[BrowserCircuitBreaker] 🔄 Circuit half-open - testing if browser is healthy');
});

browserBreaker.on('close', () => {
  console.info('[BrowserCircuitBreaker] ✅ Circuit closed - browser operations healthy');
});

browserBreaker.on('fallback', () => {
  console.warn('[BrowserCircuitBreaker] 🔀 Fallback triggered');
});

// Fallback: return error instead of crashing
browserBreaker.on('failure', (error: unknown) => {
  lastBrowserFailure =
    error instanceof Error ? error : new Error(String(error));
  console.error(
    '[BrowserCircuitBreaker] ❌ Failure while creating browser session:',
    lastBrowserFailure.message,
  );
});

browserBreaker.fallback(() => {
  const message =
    'Browser automation temporarily unavailable. Circuit breaker is open. Please try again later.';
  if (lastBrowserFailure) {
    throw new Error(`${message} Last failure: ${lastBrowserFailure.message}`, {
      cause: lastBrowserFailure,
    });
  }
  throw new Error(message);
});

// Public API with circuit breaker protection
export async function createAuthenticatedSession(
  env: EnvironmentConfig,
  platformConfig: PlatformConfig,
  logger: Logger,
): Promise<AuthenticatedSession> {
  return browserBreaker.fire(env, platformConfig, logger);
}

export async function loginWithBrowserUseOrPlaywright(
  page: Page,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
) {
  await navigateWithRetry(page, config.login.url, 'domcontentloaded', logger);

  const allowBrowserUse =
    env.browser.useBrowserUse &&
    !/hotmart\.com/i.test(config.login.url) &&
    !/academy\.jumba\.com\.br/i.test(config.login.url);

  if (allowBrowserUse) {
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
    waitForNavigationWithRetry(
      page,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
      logger,
    ),
    page.click(config.login.submitSelector),
  ]);
  let postLoginVerified = false;
  try {
    await waitForSelectorWithRetry(
      page,
      config.login.postLoginWaitSelector,
      logger,
    );
    postLoginVerified = true;
  } catch (error) {
    logger.warn(
      {
        err: error,
        selector: config.login.postLoginWaitSelector,
        loginUrl: config.login.url,
        baseUrl: env.browser.baseUrl,
      },
      '[course-crawler] Post-login marker not detected, forcing navigation to target base URL',
    );
  }

  if (!postLoginVerified || env.browser.baseUrl !== config.login.url) {
    await navigateWithRetry(
      page,
      env.browser.baseUrl,
      'domcontentloaded',
      logger,
    );
  }
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
