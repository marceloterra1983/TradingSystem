import { ScrapeData, ScrapeFormat } from '../types';

/**
 * Generates a timestamp string for use in filenames
 * Format: YYYYMMDD-HHMMSS
 */
const generateTimestamp = (): string => {
  const date = new Date();
  const timestamp = date.toISOString()
    .replace(/[^\d]/g, '')
    .slice(0, 14);
  return timestamp;
};

/**
 * Generic file download helper using Blob API
 */
export const downloadFile = (filename: string, mimeType: string, content: string | Blob): void => {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download ${filename}: ${error}`);
  }
};

/**
 * Downloads markdown content as a .md file
 */
export const downloadMarkdown = (markdown: string, filename?: string): void => {
  const timestamp = generateTimestamp();
  const defaultFilename = `scrape-result-${timestamp}.md`;
  downloadFile(
    filename || defaultFilename,
    'text/markdown;charset=utf-8',
    markdown
  );
};

/**
 * Downloads HTML content as a .html file
 */
export const downloadHTML = (html: string, filename?: string): void => {
  const timestamp = generateTimestamp();
  const defaultFilename = `scrape-result-${timestamp}.html`;
  downloadFile(
    filename || defaultFilename,
    'text/html;charset=utf-8',
    html
  );
};

/**
 * Downloads raw HTML content ensuring the "-raw.html" suffix
 */
export const downloadRawHtml = (html: string, filename?: string): void => {
  const timestamp = generateTimestamp();
  const defaultFilename = `scrape-result-${timestamp}-raw.html`;
  const baseName = filename || defaultFilename;
  const normalized = baseName.endsWith('.html') ? baseName.slice(0, -5) : baseName;
  const finalName = normalized.endsWith('-raw') ? `${normalized}.html` : `${normalized}-raw.html`;
  downloadFile(finalName, 'text/html;charset=utf-8', html);
};

/**
 * Downloads data as a formatted JSON file
 */
export const downloadJSON = (data: unknown, filename?: string): void => {
  const timestamp = generateTimestamp();
  const defaultFilename = `scrape-result-${timestamp}.json`;
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(
    filename || defaultFilename,
    'application/json;charset=utf-8',
    jsonString
  );
};

/**
 * Downloads array of links as a text file
 */
export const downloadLinks = (links: string[], filename?: string): void => {
  const timestamp = generateTimestamp();
  const defaultFilename = `scrape-links-${timestamp}.txt`;
  const content = links.join('\n');
  downloadFile(
    filename || defaultFilename,
    'text/plain;charset=utf-8',
    content
  );
};

/**
 * Downloads a base64 encoded screenshot
 * Handles both data URI format and raw base64 strings
 */
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const DEFAULT_IMAGE_MIME = 'image/png';

const decodeBase64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const ensureExtension = (filename: string, extension: string): string => {
  if (filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return filename;
  }
  return `${filename}.${extension}`;
};

export const downloadScreenshot = (base64DataUri: string, filename?: string): void => {
  try {
    const timestamp = generateTimestamp();
    let mimeType = DEFAULT_IMAGE_MIME;
    let base64Data = base64DataUri;

    if (base64DataUri.startsWith('data:')) {
      const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URI format');
      }
      mimeType = IMAGE_MIME_EXTENSIONS[matches[1]] ? matches[1] : DEFAULT_IMAGE_MIME;
      base64Data = matches[2];
    } else if (base64DataUri.includes(',')) {
      base64Data = base64DataUri.split(',').pop() ?? '';
    }

    if (!base64Data) {
      throw new Error('No image data found');
    }

    const extension = IMAGE_MIME_EXTENSIONS[mimeType] ?? 'png';
    const blob = decodeBase64ToBlob(base64Data, mimeType);
    const defaultFilename = ensureExtension(`screenshot-${timestamp}`, extension);

    downloadFile(ensureExtension(filename || defaultFilename, extension), mimeType, blob);
  } catch (error) {
    console.error('Error downloading screenshot:', error);
    throw new Error(`Failed to download screenshot: ${error}`);
  }
};

/**
 * Downloads all available formats from a scrape result
 * Uses base filename as prefix for all files
 */
const formatSetMatches = (formats: Set<ScrapeFormat>, candidates: ScrapeFormat | ScrapeFormat[]): boolean => {
  if (formats.size === 0) {
    return true;
  }
  const list = Array.isArray(candidates) ? candidates : [candidates];
  return list.some(item => formats.has(item));
};

export const downloadAllFormats = (data: ScrapeData, baseFilename?: string, formats?: ScrapeFormat[]): void => {
  try {
    const timestamp = generateTimestamp();
    const prefix = baseFilename || `scrape-result-${timestamp}`;
    const formatFilter = new Set(formats ?? []);

    if (data.markdown && formatSetMatches(formatFilter, 'markdown')) {
      downloadMarkdown(data.markdown, `${prefix}.md`);
    }
    if (data.html && formatSetMatches(formatFilter, 'html')) {
      downloadHTML(data.html, `${prefix}.html`);
    }
    if (data.rawHtml && formatSetMatches(formatFilter, 'rawHtml')) {
      downloadRawHtml(data.rawHtml, `${prefix}-raw.html`);
    }
    if (data.links?.length && formatSetMatches(formatFilter, 'links')) {
      downloadLinks(data.links, `${prefix}-links.txt`);
    }
    if (data.screenshot && formatSetMatches(formatFilter, ['screenshot', 'screenshot@fullPage'])) {
      const prefersFullPage =
        formatFilter.size > 0 &&
        formatFilter.has('screenshot@fullPage') &&
        !formatFilter.has('screenshot');
      const screenshotBase = prefersFullPage ? `${prefix}-screenshot-full` : `${prefix}-screenshot`;
      downloadScreenshot(data.screenshot, screenshotBase);
    }
    if (data.metadata && formatSetMatches(formatFilter, 'json')) {
      downloadJSON(data.metadata, `${prefix}-metadata.json`);
    }
  } catch (error) {
    console.error('Error downloading all formats:', error);
    throw new Error(`Failed to download all formats: ${error}`);
  }
};
