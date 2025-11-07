import type { Logger } from 'pino';
import type { PlatformConfig } from '../config/platform.js';
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
  return {
    async discoverCourses(): Promise<CourseResource[]> {
      const platformConfig = await (await import('../config/platform.js')).loadPlatformConfig(
        env.browser.selectorsConfigPath,
      );

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

async function discoverCourses(
  page: import('playwright').Page,
  config: PlatformConfig,
  env: EnvironmentConfig,
  logger: Logger,
): Promise<CourseResource[]> {
  await gotoWithRetry(page, config.courses.url, 'networkidle', logger);
  await page.waitForSelector(config.courses.courseItemSelector, {
    timeout: 15_000,
  });

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
          const linkElement = classNode.querySelector(
            selectors.classLinkSelector,
          ) as HTMLAnchorElement | null;
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
