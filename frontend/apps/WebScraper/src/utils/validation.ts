import type { CrawlOptions, ScheduleInput, ScrapeOptions, TemplateInput } from '../types';
import { describeCron, formatIntervalSeconds, getNextExecutions, validateCron } from './cron';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

interface ScrapeValidationOptions {
  requireUrl?: boolean;
}

export function isValidUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCssSelector(selector: string): boolean {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function isGenericSelector(selector: string): boolean {
  const genericSelectors = [
    'div',
    'span',
    'p',
    'a',
    'img',
    'table',
    'tr',
    'td',
    'li',
    'ul',
    'ol'
  ];
  return genericSelectors.includes(selector.toLowerCase().trim());
}

function testRegexPattern(pattern: string): ValidationResult['warnings'] {
  const warnings: Record<string, string> = {};

  try {
    const regex = new RegExp(pattern);

    // Test if pattern is too broad
    if (pattern === '.*' || pattern === '.+' || pattern === '.*?') {
      warnings.urlPattern = 'Pattern is too broad - matches all URLs. Consider making it more specific.';
    }

    // Test against sample URLs
    const testUrls = [
      'https://example.com',
      'https://blog.example.com/post/123',
      'https://docs.example.com/api/v1',
      'http://example.com/page?q=test'
    ];

    const matchCount = testUrls.filter(url => regex.test(url)).length;
    if (matchCount === testUrls.length) {
      warnings.urlPattern = 'Pattern matches all sample URLs. Consider making it more specific to your use case.';
    }

    // Check for common mistakes
    if (pattern.includes('https?') && !pattern.includes('\\')) {
      warnings.urlPattern = 'Did you mean "https\\?" for optional "s"?';
    }
    if (pattern.includes('[.]')) {
      warnings.urlPattern = 'Square brackets around dot "[.]" are unnecessary. Use "\\." instead.';
    }
    if (pattern.includes('.*.*')) {
      warnings.urlPattern = 'Multiple wildcards ".*.*" can be simplified to ".*"';
    }
  } catch {
    // Invalid regex will be caught by error validation
  }

  return warnings;
}

export function validateScrapeOptions(options: Partial<ScrapeOptions>, config: ScrapeValidationOptions = {}): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const requireUrl = config.requireUrl ?? true;

  if (requireUrl) {
    if (!options.url || !isValidUrl(options.url)) {
      errors.url = 'Please provide a valid URL starting with http:// or https://';
    }
  } else if (options.url) {
    if (!isValidUrl(options.url)) {
      errors.url = 'Default URL must start with http:// or https://';
    }
  } else {
    warnings.url = 'No default URL provided. Users will supply one when applying this template.';
  }

  if (!options.formats || options.formats.length === 0) {
    errors.formats = 'Select at least one output format';
  } else if (options.formats.length > 4) {
    warnings.formats = 'Using more than 4 formats may impact performance. Consider selecting only the formats you need.';
  }

  // Screenshot format combinations
  const hasScreenshot = options.formats?.includes('screenshot');
  const hasFullScreenshot = options.formats?.includes('screenshot@fullPage');
  if (hasScreenshot && hasFullScreenshot) {
    warnings.formats = 'Both normal and full-page screenshots selected. Consider using just one for better performance.';
  }

  if (options.waitFor !== undefined) {
    if (Number.isNaN(options.waitFor) || options.waitFor < 0 || options.waitFor > 30000) {
      errors.waitFor = 'Wait time must be between 0 and 30000 milliseconds';
    } else if (options.waitFor > 10000) {
      warnings.waitFor = 'Long wait times may slow down scraping. Consider reducing if possible.';
    }
  }

  if (options.timeout !== undefined) {
    if (Number.isNaN(options.timeout) || options.timeout < 1000 || options.timeout > 120000) {
      errors.timeout = 'Timeout must be between 1000 and 120000 milliseconds';
    } else {
      if (options.waitFor !== undefined && options.timeout < options.waitFor) {
        errors.timeout = 'Timeout must be greater than waitFor value';
      }
      if (options.timeout > 60000) {
        warnings.timeout = 'Long timeouts may cause resource issues. Consider reducing if possible.';
      }
    }
  }

  // Content filters validation
  if (options.includeTags?.length) {
    const invalidSelectors = options.includeTags.filter(tag => !isValidCssSelector(tag));
    if (invalidSelectors.length > 0) {
      errors.includeTags = `Invalid CSS selectors: ${invalidSelectors.join(', ')}`;
    }

    const genericSelectors = options.includeTags.filter(tag => isGenericSelector(tag));
    if (genericSelectors.length > 0) {
      warnings.includeTags = `Generic selectors may capture unwanted content: ${genericSelectors.join(', ')}`;
    }
  }

  if (options.excludeTags?.length) {
    const invalidSelectors = options.excludeTags.filter(tag => !isValidCssSelector(tag));
    if (invalidSelectors.length > 0) {
      errors.excludeTags = `Invalid CSS selectors: ${invalidSelectors.join(', ')}`;
    }

    const genericSelectors = options.excludeTags.filter(tag => isGenericSelector(tag));
    if (genericSelectors.length > 0) {
      warnings.excludeTags = `Generic selectors may exclude too much content: ${genericSelectors.join(', ')}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
}

export function validateSchedule(schedule: ScheduleInput): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!schedule.name || schedule.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters long';
  }

  if (!schedule.url || !isValidUrl(schedule.url)) {
    errors.url = 'Provide a valid target URL';
  }

  if (!schedule.scheduleType) {
    errors.scheduleType = 'Select a schedule type';
  }

  if (schedule.scheduleType === 'cron') {
    const result = validateCron(schedule.cronExpression ?? '');
    if (!result.isValid) {
      errors.cronExpression = result.error ?? 'Invalid cron expression';
    } else if (schedule.cronExpression) {
      const nextRuns = getNextExecutions(schedule.cronExpression);
      if (nextRuns.length === 0) {
        errors.cronExpression = 'Cron expression does not produce future executions';
      }
    }
  }

  if (schedule.scheduleType === 'interval') {
    const value = Number(schedule.intervalSeconds ?? 0);
    if (!value) {
      errors.intervalSeconds = 'Interval is required';
    } else if (Number.isNaN(value) || value < 60) {
      errors.intervalSeconds = 'Interval must be at least 60 seconds';
    } else if (value > 86_400) {
      errors.intervalSeconds = 'Interval cannot exceed 24 hours';
    } else if (value % 60 !== 0) {
      warnings.intervalSeconds = 'Consider using minute intervals for easier scheduling';
    }
  }

  if (schedule.scheduleType === 'one-time') {
    if (!schedule.scheduledAt) {
      errors.scheduledAt = 'Select a future date and time';
    } else {
      const target = new Date(schedule.scheduledAt);
      if (Number.isNaN(target.getTime())) {
        errors.scheduledAt = 'Invalid scheduled date';
      } else if (target.getTime() <= Date.now()) {
        errors.scheduledAt = 'Scheduled time must be in the future';
      }
    }
  }

  if (schedule.options?.formats && schedule.options.formats.length === 0) {
    errors.formats = 'Select at least one output format';
  }

  if (schedule.scheduleType === 'interval' && !errors.intervalSeconds && schedule.intervalSeconds) {
    warnings.interval = `Runs ${formatIntervalSeconds(schedule.intervalSeconds)}`;
  }

  if (schedule.scheduleType === 'cron' && !errors.cronExpression && schedule.cronExpression) {
    warnings.cronExpression = describeCron(schedule.cronExpression);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
}

export function validateCrawlOptions(options: Partial<CrawlOptions>): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!options.url || !isValidUrl(options.url)) {
    errors.url = 'Please provide a valid URL starting with http:// or https://';
  }

  if (options.limit !== undefined) {
    if (Number.isNaN(options.limit) || options.limit < 1 || options.limit > 1000) {
      errors.limit = 'Limit must be between 1 and 1000 pages';
    } else if (options.limit > 500) {
      warnings.limit = 'High page limits may take a long time to complete. Consider reducing if possible.';
    }
  }

  if (options.maxDepth !== undefined) {
    if (Number.isNaN(options.maxDepth) || options.maxDepth < 1 || options.maxDepth > 10) {
      errors.maxDepth = 'Depth must be between 1 and 10 levels';
    } else if (options.maxDepth > 5) {
      warnings.maxDepth = 'Deep crawls may capture irrelevant content. Consider reducing depth if possible.';
    }
  }

  if (options.allowExternalLinks) {
    warnings.allowExternalLinks = 'External links enabled - this may lead to crawling unintended domains.';
  }

  if (!options.excludePaths?.length && !options.includePaths?.length) {
    warnings.paths = 'No path filters configured. Consider adding include/exclude patterns to focus the crawl.';
  }

  if (options.scrapeOptions) {
    const nestedValidation = validateScrapeOptions(options.scrapeOptions);
    Object.assign(errors, nestedValidation.errors);
    if (nestedValidation.warnings) {
      Object.assign(warnings, nestedValidation.warnings);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
}

export function validateTemplate(template: TemplateInput): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Name validation
  if (!template.name || template.name.trim().length < 3) {
    errors.name = 'Template name must be at least 3 characters long';
  } else {
    if (template.name.trim().length > 100) {
      errors.name = 'Template name cannot exceed 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(template.name)) {
      errors.name = 'Template name can only contain letters, numbers, spaces, hyphens and underscores';
    }
  }

  // Description validation
  if (template.description && template.description.trim().length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  // URL pattern validation
  if (template.urlPattern) {
    try {
      new RegExp(template.urlPattern);
      const patternWarnings = testRegexPattern(template.urlPattern);
      if (patternWarnings) {
        Object.assign(warnings, patternWarnings);
      }
    } catch (error) {
      console.warn('Invalid template URL pattern:', error);
      errors.urlPattern = 'Invalid URL pattern. Please provide a valid regular expression.';
    }
  } else {
    warnings.urlPattern = 'No URL pattern provided. Template will match all URLs.';
  }

  const optionsValidation = validateScrapeOptions(template.options, { requireUrl: false });
  Object.assign(errors, optionsValidation.errors);
  if (optionsValidation.warnings) {
    Object.assign(warnings, optionsValidation.warnings);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
}
