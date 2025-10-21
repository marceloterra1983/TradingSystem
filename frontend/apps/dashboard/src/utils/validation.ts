import type { ScrapeOptions, CrawlOptions } from '../services/firecrawlService';
import type { TemplateInput } from '../types/webscraper';

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidCrawlLimit(limit: number | undefined): boolean {
  if (limit === undefined || Number.isNaN(limit)) {
    return false;
  }
  return limit >= 1 && limit <= 1000;
}

export function isValidCrawlDepth(depth: number | undefined): boolean {
  if (depth === undefined || Number.isNaN(depth)) {
    return false;
  }
  return depth >= 1 && depth <= 10;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

interface ScrapeValidationOptions {
  requireUrl?: boolean;
}

function isValidCssSelector(selector: string): boolean {
  if (!selector) return false;
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function isGenericSelector(selector: string): boolean {
  const generic = ['div', 'span', 'p', 'a', 'img', 'table', 'tr', 'td', 'li', 'ul', 'ol'];
  return generic.includes(selector.trim().toLowerCase());
}

function analysePattern(pattern: string): Record<string, string> {
  const warnings: Record<string, string> = {};
  try {
    const regex = new RegExp(pattern);

    if (pattern === '.*' || pattern === '.+' || pattern === '.*?') {
      warnings.urlPattern = 'Pattern is very broad and may match unintended pages.';
    }

    const sample = [
      'https://example.com',
      'https://docs.example.com/api/v1',
      'https://blog.example.com/post/slug',
      'http://example.com/page?q=test',
    ];
    const matches = sample.filter((url) => regex.test(url)).length;
    if (matches === sample.length) {
      warnings.urlPattern = 'Pattern matches common URLs. Consider making it more specific.';
    }

    if (pattern.includes('https?') && !pattern.includes('\\?')) {
      warnings.urlPattern = 'Did you mean to escape the question mark (use `\\?`) when matching http/https?';
    }
    if (pattern.includes('[.]')) {
      warnings.urlPattern = 'Square brackets around dot "[.]" are unnecessary. Use "\\." instead.';
    }
    if (pattern.includes('.*.*')) {
      warnings.urlPattern = 'Repeated wildcards " .*.* " can be simplified to " .* ".';
    }
  } catch {
    // invalid regex handled elsewhere
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
    warnings.url = 'No default URL provided. Users must supply one when running the template.';
  }

  if (!options.formats || options.formats.length === 0) {
    errors.formats = 'Select at least one output format';
  } else if (options.formats.length > 4) {
    warnings.formats = 'Selecting many formats may slow down scraping.';
  }

  if (options.waitFor !== undefined) {
    if (Number.isNaN(options.waitFor) || options.waitFor < 0 || options.waitFor > 30_000) {
      errors.waitFor = 'Wait time must be between 0 and 30000 milliseconds';
    } else if (options.waitFor > 10000) {
      warnings.waitFor = 'Long wait times may slow down scraping.';
    }
  }

  if (options.timeout !== undefined) {
    if (Number.isNaN(options.timeout) || options.timeout < 1000 || options.timeout > 120_000) {
      errors.timeout = 'Timeout must be between 1000 and 120000 milliseconds';
    } else {
      if (options.waitFor !== undefined && options.timeout < options.waitFor) {
        errors.timeout = 'Timeout must be greater than wait time.';
      }
      if (options.timeout > 60_000) {
        warnings.timeout = 'Timeout greater than 60s may cause resource issues.';
      }
    }
  }

  if (options.includeTags?.length) {
    const invalid = options.includeTags.filter((tag) => !isValidCssSelector(tag));
    if (invalid.length) {
      errors.includeTags = `Invalid CSS selectors: ${invalid.join(', ')}`;
    }
    const generic = options.includeTags.filter(isGenericSelector);
    if (generic.length) {
      warnings.includeTags = `Generic selectors may capture unwanted areas: ${generic.join(', ')}`;
    }
  }

  if (options.excludeTags?.length) {
    const invalid = options.excludeTags.filter((tag) => !isValidCssSelector(tag));
    if (invalid.length) {
      errors.excludeTags = `Invalid CSS selectors: ${invalid.join(', ')}`;
    }
    const generic = options.excludeTags.filter(isGenericSelector);
    if (generic.length) {
      warnings.excludeTags = `Generic selectors may remove useful content: ${generic.join(', ')}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length ? warnings : undefined,
  };
}

export function validateCrawlOptions(options: Partial<CrawlOptions>): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!options.url || !isValidUrl(options.url)) {
    errors.url = 'Please provide a valid URL starting with http:// or https://';
  }

  if (!isValidCrawlLimit(options.limit)) {
    errors.limit = 'Limit must be between 1 and 1000 pages';
  } else if ((options.limit ?? 0) > 500) {
    warnings.limit = 'High page limits may take a long time to finish.';
  }

  if (!isValidCrawlDepth(options.maxDepth)) {
    errors.maxDepth = 'Depth must be between 1 and 10 levels';
  } else if ((options.maxDepth ?? 0) > 5) {
    warnings.maxDepth = 'Deep crawls may capture irrelevant pages.';
  }

  if (options.scrapeOptions) {
    const nested = validateScrapeOptions(options.scrapeOptions);
    Object.assign(errors, nested.errors);
    if (nested.warnings) {
      Object.assign(warnings, nested.warnings);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length ? warnings : undefined,
  };
}

export function validateTemplate(template: TemplateInput): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!template.name || template.name.trim().length < 3) {
    errors.name = 'Template name must be at least 3 characters long';
  } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(template.name)) {
    errors.name = 'Template name can only contain letters, numbers, spaces, hyphen and underscore.';
  }

  if (template.description && template.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  if (template.urlPattern) {
    try {
      new RegExp(template.urlPattern);
      Object.assign(warnings, analysePattern(template.urlPattern));
    } catch {
      errors.urlPattern = 'Invalid URL pattern. Please provide a valid regular expression.';
    }
  } else {
    warnings.urlPattern = 'No URL pattern provided. Template will match any URL.';
  }

  const optionsValidation = validateScrapeOptions(template.options, { requireUrl: false });
  Object.assign(errors, optionsValidation.errors);
  if (optionsValidation.warnings) {
    Object.assign(warnings, optionsValidation.warnings);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length ? warnings : undefined,
  };
}
