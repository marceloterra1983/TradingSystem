import { promises as fs } from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import type { Logger } from 'pino';
import { loadEnvironment, type EnvironmentConfig } from '../config/environment.js';
import { loadPlatformConfigForUrl } from '../config/platform.js';
import { createNavigationController } from '../navigation/controller.js';
import {
  createAuthenticatedSession,
  safeCloseBrowser,
} from '../navigation/session.js';
import type { PersistenceLayer } from '../persistence/neon-persistence.js';
import { createPersistenceLayer } from '../persistence/neon-persistence.js';
import {
  type ClassResource,
  type CourseResource,
  type ExtractionRun,
  type AttachmentResource,
} from '../types.js';
import { createStableId } from '../utils/id.js';
import { computeMetrics } from '../observability/metrics.js';
import { retryBrowserOperation } from '../utils/retry.js';
import { downloadAttachment } from './download-manager.js';

interface PipelineResult {
  run: ExtractionRun;
  outputDir: string;
}

interface PipelineDependencies {
  env: EnvironmentConfig;
  logger: Logger;
  persistence?: PersistenceLayer;
}

export async function runExtractionPipeline(
  deps?: Partial<PipelineDependencies>,
): Promise<PipelineResult> {
  const env = deps?.env ?? loadEnvironment();
  const logger =
    deps?.logger ??
    (await import('pino')).pino({
      level: env.logLevel,
      transport:
        env.runtimeEnvironment === 'development'
          ? { target: 'pino-pretty' }
          : undefined,
    });
  const persistence =
    deps?.persistence ?? (await createPersistenceLayer(env, logger));

  const startedAt = new Date();
  const navigation = createNavigationController({ env, logger });
  const platformConfig = await loadPlatformConfigForUrl(env.browser.baseUrl);
  const turndown = new TurndownService({ headingStyle: 'atx' });
  const incidents: string[] = [];

  logger.info('[course-crawler] Starting discovery');
  const discoveredCourses = await navigation.discoverCourses();

  const courses: CourseResource[] = [];

  for (const course of discoveredCourses) {
    try {
      const enriched = await enrichCourse(
        course,
        env,
        platformConfig,
        turndown,
        logger,
      );
      courses.push(enriched);
    } catch (error) {
      incidents.push(
        `Failed to extract course ${course.title}: ${(error as Error).message}`,
      );
      logger.error(
        { err: error, courseId: course.id },
        '[course-crawler] Failed to enrich course',
      );
    }
  }

  const metrics = computeMetrics(courses);
  const finishedAt = new Date();
  const run: ExtractionRun = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    courses,
    metrics,
    incidents,
  };

  logger.info(
    metrics,
    '[course-crawler] Extraction finished, persisting run to Neon',
  );
  await persistence.store(run);

  const outputDir = await writeArtifacts(run, env.outputsDir, logger);
  for (const course of courses) {
    await persistence.registerExport(course, outputDir);
  }

  await persistence.close();

  return { run, outputDir };
}

async function enrichCourse(
  course: CourseResource,
  env: EnvironmentConfig,
  platformConfig: Awaited<ReturnType<typeof loadPlatformConfig>>,
  turndown: TurndownService,
  logger: Logger,
): Promise<CourseResource> {
  const { browser, context, page } = await createAuthenticatedSession(
    env,
    platformConfig,
    logger,
  );

  try {
    for (const moduleResource of course.modules) {
      for (const classResource of moduleResource.classes) {
        try {
          // Navigate with retry
          await retryBrowserOperation(
            async () => {
              await page.goto(classResource.url, { waitUntil: 'networkidle' });
              await page.waitForTimeout(500);
            },
            logger,
            `navigate to ${classResource.title}`
          );

          // Extract content with retry
          const contentHtml = await retryBrowserOperation(
            async () => {
              return await page
                .locator(platformConfig.classes.contentSelector)
                .first()
                .evaluate((node) => node.innerHTML);
            },
            logger,
            `extract content for ${classResource.title}`
          );
          const rawHtml = contentHtml ?? '';
          const markdown = turndown.turndown(rawHtml);

          const attachments = platformConfig.classes.attachmentSelector
            ? await page.$$eval(
                platformConfig.classes.attachmentSelector,
                (nodes) =>
                  nodes.map((node, index) => ({
                    name: node.textContent?.trim() || `Attachment ${index + 1}`,
                    url:
                      (node as HTMLAnchorElement).href ||
                      (node.getAttribute('href') ?? ''),
                  })),
              )
            : [];

          const videos = platformConfig.classes.videoSelector
            ? await page.$$eval(
                platformConfig.classes.videoSelector,
                (nodes) =>
                  nodes.map((node, index) => ({
                    title: node.getAttribute('title') ?? `Video ${index + 1}`,
                    url:
                      (node as HTMLVideoElement).src ||
                      node.getAttribute('data-panda-player-url-value') ||
                      '',
                  })),
              )
            : [];

          const attachmentResources: AttachmentResource[] = attachments.map((attachment) => ({
            id: createStableId('attachment', `${classResource.id}|${attachment.url}`),
            name: attachment.name,
            url: attachment.url,
            downloadStatus: 'pending',
          }));

          Object.assign<ClassResource, Partial<ClassResource>>(classResource, {
            rawHtml,
            markdown,
            confidenceScore: Math.min(100, Math.max(10, markdown.length / 15)),
            attachments: attachmentResources,
            videos: videos.map((video, index) => ({
              id: createStableId('video', `${classResource.id}|${video.url}`),
              title: video.title,
              url: video.url,
              order: index + 1,
              playable: Boolean(video.url),
            })),
            lastUpdatedAt: new Date().toISOString(),
          });

          // Download attachments if enabled
          if (env.download.enabled && attachmentResources.length > 0) {
            const attachmentsDir = path.join(
              env.outputsDir,
              'attachments',
              course.id,
              classResource.id
            );

            logger.info(
              { classId: classResource.id, count: attachmentResources.length },
              '[course-crawler] Downloading attachments'
            );

            for (const attachment of attachmentResources) {
              attachment.downloadStatus = 'downloading';

              const result = await downloadAttachment(
                attachment.url,
                attachmentsDir,
                attachment.name,
                logger,
                {
                  maxRetries: env.download.maxRetries,
                  timeoutMs: env.download.timeoutMs,
                  maxFileSizeMB: env.download.maxFileSizeMB,
                }
              );

              if (result.success) {
                attachment.localPath = result.localPath;
                attachment.fileSizeBytes = result.fileSizeBytes;
                attachment.downloadStatus = 'completed';
              } else {
                attachment.downloadStatus = 'failed';
                attachment.downloadError = result.error;
                logger.warn(
                  { url: attachment.url, error: result.error },
                  '[course-crawler] Failed to download attachment'
                );
              }
            }
          }
        } catch (error) {
          const screenshotPath = await captureFailureScreenshot(
            page,
            env.outputsDir,
            classResource.id,
          );
          classResource.confidenceScore = 0;
          logger.error(
            { err: error, screenshotPath, classId: classResource.id },
            '[course-crawler] Failed to extract class',
          );
        }
      }
    }

    return course;
  } finally {
    await context.close();
    await safeCloseBrowser(browser, logger);
  }
}

async function captureFailureScreenshot(
  page: import('playwright').Page,
  outputsDir: string,
  classId: string,
) {
  const dir = path.join(outputsDir, 'screenshots');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${classId}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch {
    return undefined;
  }
}

async function writeArtifacts(
  run: ExtractionRun,
  outputsDir: string,
  logger: Logger,
) {
  const dir = path.join(
    outputsDir,
    new Date(run.finishedAt).toISOString().replace(/[:.]/g, '-'),
  );
  await fs.mkdir(dir, { recursive: true });

  for (const course of run.courses) {
    const courseDir = path.join(dir, course.id);
    await fs.mkdir(courseDir, { recursive: true });
    for (const moduleResource of course.modules) {
      const moduleFile = path.join(
        courseDir,
        `${moduleResource.order.toString().padStart(2, '0')}-${slugify(
          moduleResource.title,
        )}.md`,
      );
      const markdown = moduleResource.classes
        .map((cls) => renderClassMarkdown(cls))
        .join('\n\n---\n\n');
      await fs.writeFile(moduleFile, markdown, 'utf-8');
    }
  }

  const reportPath = path.join(dir, 'run-report.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify(run, null, 2),
    'utf-8',
  );

  logger.info({ reportPath }, '[course-crawler] Run report written');
  return dir;
}

function renderClassMarkdown(cls: ClassResource) {
  const frontmatter = [
    '---',
    `title: "${cls.title.replace(/"/g, '\"')}"`,
    `order: ${cls.order}`,
    `confidence: ${cls.confidenceScore}`,
    '---',
  ].join('\n');

  const attachments = cls.attachments
    .map((attachment) => {
      if (attachment.downloadStatus === 'completed' && attachment.localPath) {
        const sizeStr = attachment.fileSizeBytes
          ? ` (${formatFileSize(attachment.fileSizeBytes)})`
          : '';
        return `- 📁 [${attachment.name}](${attachment.localPath})${sizeStr} ✅`;
      } else if (attachment.downloadStatus === 'failed') {
        return `- 🔗 [${attachment.name}](${attachment.url}) ⚠️ Download failed: ${attachment.downloadError || 'Unknown error'}`;
      } else {
        return `- 🔗 [${attachment.name}](${attachment.url})`;
      }
    })
    .join('\n');
  const videos = cls.videos
    .map((video) => `- [${video.title}](${video.url})`)
    .join('\n');

  return [
    frontmatter,
    '',
    cls.markdown ?? '_Conteúdo não disponível_',
    '',
    attachments ? `## Anexos\n${attachments}` : '',
    videos ? `## Vídeos\n${videos}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
