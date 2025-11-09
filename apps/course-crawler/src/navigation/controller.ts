import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';
import {
  loadPlatformConfig,
  loadPlatformConfigForUrl,
  type PlatformConfig,
} from '../config/platform.js';
import type { EnvironmentConfig } from '../config/environment.js';
import type { CourseResource, ModuleResource } from '../types.js';
import { createStableId } from '../utils/id.js';
import {
  createAuthenticatedSession,
  safeCloseBrowser,
} from './session.js';

interface NavigationDependencies {
  env: EnvironmentConfig;
  logger: Logger;
}

export function createNavigationController({ env, logger }: NavigationDependencies) {
  async function resolvePlatformConfig(): Promise<PlatformConfig> {
    const selectorsConfigPath = env.browser.selectorsConfigPath?.trim();

    if (selectorsConfigPath) {
      logger.debug(
        { selectorsConfigPath },
        '[course-crawler] Using manual selectors config override',
      );
      return loadPlatformConfig(selectorsConfigPath);
    }

    logger.debug(
      { baseUrl: env.browser.baseUrl },
      '[course-crawler] Auto-detecting selectors config based on baseUrl',
    );
    return loadPlatformConfigForUrl(env.browser.baseUrl);
  }

  return {
    async discoverCourses(): Promise<CourseResource[]> {
      const platformConfig = await resolvePlatformConfig();

      const { browser, context, page } = await createAuthenticatedSession(
        env,
        platformConfig,
        logger,
      );

      try {
        const courses = await discoverCourses(
          page,
          platformConfig,
          env,
          logger,
        );

        await context.close();
        return courses;
      } finally {
        await safeCloseBrowser(browser, logger);
      }
    },
  };
}

async function waitForCourseList(
  page: import('playwright').Page,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
) {
  try {
    await page.waitForSelector(config.courses.courseItemSelector, {
      timeout: 15_000,
    });
  } catch (error) {
    await captureCourseDiscoveryArtifacts(
      page,
      env,
      config.courses.courseItemSelector,
      logger,
    );
    throw error;
  }
}

async function discoverCourses(
  page: import('playwright').Page,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
): Promise<CourseResource[]> {
  await gotoWithRetry(page, config.courses.url, 'networkidle', logger);
  await waitForCourseList(page, config, env, logger);

  const courseEntries = await page.$$eval(
    config.courses.courseItemSelector,
    (nodes, selectors) =>
      nodes
        .map((node) => {
          const title =
            (node.querySelector(selectors.titleSelector)?.textContent ?? '')
              .trim() || null;
          const link = node
            .querySelector(selectors.linkSelector)
            ?.getAttribute('href');
          if (!title || !link) {
            return null;
          }
          return { title, url: new URL(link, window.location.origin).href };
        })
        .filter(Boolean) as Array<{ title: string; url: string }>,
    {
      titleSelector: config.courses.titleSelector,
      linkSelector: config.courses.linkSelector,
    },
  );

  const filteredEntries =
    env.targetCourseUrls.length > 0
      ? courseEntries.filter((entry) =>
          env.targetCourseUrls.some((target) =>
            entry.url.startsWith(target),
          ),
        )
      : courseEntries;

  const courses: CourseResource[] = [];

  for (const courseEntry of filteredEntries) {
    const courseId = createStableId('course', courseEntry.url);
    logger.info(
      { courseId, url: courseEntry.url },
      '[course-crawler] Discovering course',
    );

    const modules = await discoverModules(
      page,
      courseEntry.url,
      config,
      env,
      logger,
    );

    courses.push({
      id: courseId,
      title: courseEntry.title,
      url: courseEntry.url,
      modules,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  return courses;
}

async function captureCourseDiscoveryArtifacts(
  page: import('playwright').Page,
  env: EnvironmentConfig,
  selector: string,
  logger: Logger,
) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugDir = path.join(env.outputsDir, 'logs', 'navigation');
    await fs.mkdir(debugDir, { recursive: true });
    const htmlPath = path.join(debugDir, `course-discovery-${timestamp}.html`);
    const screenshotPath = path.join(
      debugDir,
      `course-discovery-${timestamp}.png`,
    );

    const content = await page.content();
    await fs.writeFile(htmlPath, content, 'utf-8');
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (screenshotError) {
      logger.warn(
        { err: screenshotError },
        '[course-crawler] Failed to capture screenshot for course discovery',
      );
    }

    logger.error(
      { selector, htmlPath, screenshotPath },
      '[course-crawler] Course discovery selector not found; captured debug artifacts',
    );
  } catch (artifactError) {
    logger.error(
      { err: artifactError, selector },
      '[course-crawler] Failed to capture debug artifacts for course discovery',
    );
  }
}

async function captureModuleDebugArtifacts(
  page: import('playwright').Page,
  env: EnvironmentConfig,
  courseUrl: string,
  config: PlatformConfig,
  logger: Logger,
) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugDir = path.join(env.outputsDir, 'logs', 'modules');
    await fs.mkdir(debugDir, { recursive: true });

    const courseSlug = slugify(new URL(courseUrl).pathname || courseUrl);
    const baseName = `${courseSlug || 'course'}-${timestamp}`;
    const htmlPath = path.join(debugDir, `${baseName}.html`);
    const screenshotPath = path.join(debugDir, `${baseName}.png`);
    const metadataPath = path.join(debugDir, `${baseName}.json`);

    const content = await page.content();
    await fs.writeFile(htmlPath, content, 'utf-8');
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (screenshotError) {
      logger.warn(
        { err: screenshotError },
        '[course-crawler] Failed to capture screenshot for module debug',
      );
    }

    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          courseUrl,
          moduleSelector: config.modules.moduleListSelector,
          classSelector: config.classes.classListSelector,
          capturedAt: timestamp,
        },
        null,
        2,
      ),
      'utf-8',
    );

    logger.warn(
      { htmlPath, screenshotPath },
      '[course-crawler] Modules contain no classes; captured debug artifacts',
    );
  } catch (error) {
    logger.error(
      { err: error, courseUrl },
      '[course-crawler] Failed to capture module debug artifacts',
    );
  }
}

async function discoverModules(
  page: import('playwright').Page,
  courseUrl: string,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
): Promise<ModuleResource[]> {
  await gotoWithRetry(page, courseUrl, 'domcontentloaded', logger);
  await expandAllSections(page, logger);

  const moduleEntries = await page.$$eval(
    config.modules.moduleListSelector,
    (
      nodes,
      selectors: {
        moduleTitleSelector: string;
        classListSelector: string;
        classTitleSelector: string;
        classLinkSelector: string;
        classDurationSelector?: string;
      },
    ) =>
      nodes.map((node, index) => {
        const title =
          (node.querySelector(selectors.moduleTitleSelector)?.textContent ?? '')
            .trim() || `Módulo ${index + 1}`;
        const classNodes = Array.from(
          node.querySelectorAll(selectors.classListSelector),
        );
        const classes = classNodes.map((classNode, classIndex) => {
          const linkElement =
            (selectors.classLinkSelector
              ? (classNode.querySelector(
                  selectors.classLinkSelector,
                ) as HTMLAnchorElement | null)
              : null) ??
            ((classNode.closest && classNode.closest('a')) as
              | HTMLAnchorElement
              | null);
          const titleElement = classNode.querySelector(
            selectors.classTitleSelector,
          );
          const durationElement = selectors.classDurationSelector
            ? classNode.querySelector(selectors.classDurationSelector)
            : null;
          const durationText = durationElement
            ? durationElement.textContent?.replace(' - ', '').trim() ?? ''
            : '';
          const href = linkElement?.getAttribute('href') ?? '';
          return {
            title:
              titleElement?.textContent?.trim() ??
              `Aula ${classIndex + 1}`,
            url: href
              ? new URL(href, window.location.origin).href
              : window.location.href,
            order: classIndex + 1,
            duration: durationText,
          };
        });

        return {
          title,
          order: index + 1,
          classes,
        };
      }),
    {
      moduleTitleSelector: config.modules.titleSelector,
      classListSelector: config.classes.classListSelector,
      classTitleSelector: config.classes.titleSelector,
      classLinkSelector: config.classes.linkSelector,
      classDurationSelector: config.classes.durationSelector,
    },
  );

  if (
    moduleEntries.length > 0 &&
    moduleEntries.every((entry) => entry.classes.length === 0)
  ) {
    await captureModuleDebugArtifacts(page, env, courseUrl, config, logger);
  }

  return moduleEntries.map((moduleEntry) => {
    const limitedClasses = env.browser.maxClassesPerModule
      ? moduleEntry.classes.slice(0, env.browser.maxClassesPerModule)
      : moduleEntry.classes;
    const moduleId = createStableId(
      'module',
      `${courseUrl}|${moduleEntry.title}|${moduleEntry.order}`,
    );

    return {
      id: moduleId,
      title: moduleEntry.title,
      order: moduleEntry.order,
      url: courseUrl,
      classes: limitedClasses.map((classEntry) => ({
        id: createStableId('class', `${moduleId}|${classEntry.url}`),
        title: classEntry.title,
        url: classEntry.url,
        order: classEntry.order,
        videos: [],
        attachments: [],
        confidenceScore: 0,
        durationSeconds: parseDuration(classEntry.duration),
      })),
      lastUpdatedAt: new Date().toISOString(),
    };
  });
}

async function gotoWithRetry(
  page: import('playwright').Page,
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
        { url, attempt, err: error },
        '[course-crawler] Network changed during navigation, retrying',
      );
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

async function expandAllSections(
  page: import('playwright').Page,
  logger: Logger,
) {
  const headers = await page.$$(
    '[data-controller="expander"][data-sections-target="expandable"]',
  );
  for (const header of headers) {
    const expanded = await header.getAttribute('aria-expanded');
    if (expanded === 'false') {
      try {
        await header.click();
        await page.waitForTimeout(300);
      } catch (error) {
        logger.warn(
          { err: error },
          '[course-crawler] Failed to expand module section',
        );
      }
    }
  }
}

function parseDuration(input: string): number | undefined {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  const hourMinuteMatch = trimmed.match(/^(\d{1,2})h(?:\s*(\d{1,2})m)?$/i);
  if (hourMinuteMatch) {
    const hours = Number(hourMinuteMatch[1]);
    const minutes = hourMinuteMatch[2] ? Number(hourMinuteMatch[2]) : 0;
    return hours * 3600 + minutes * 60;
  }

  const minuteSecondMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (minuteSecondMatch) {
    const minutes = Number(minuteSecondMatch[1]);
    const seconds = Number(minuteSecondMatch[2]);
    return minutes * 60 + seconds;
  }

  const minuteMatch = trimmed.match(/^(\d{1,3})m$/i);
  if (minuteMatch) {
    return Number(minuteMatch[1]) * 60;
  }

  return undefined;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50);
}
