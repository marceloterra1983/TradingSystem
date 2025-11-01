/**
 * Unit Tests for Path Normalization Utilities
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeUrl,
  normalizeCollectionName,
  normalizeIndexedPath,
  inferModelFromName,
  formatNumber,
  formatFileSize,
} from '../pathNormalizer';

describe('pathNormalizer', () => {
  describe('sanitizeUrl', () => {
    it('should remove trailing slashes', () => {
      expect(sanitizeUrl('http://localhost:8202/', 'fallback')).toBe('http://localhost:8202');
      expect(sanitizeUrl('http://localhost:8202///', 'fallback')).toBe('http://localhost:8202');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  http://localhost:8202  ', 'fallback')).toBe('http://localhost:8202');
    });

    it('should return fallback for invalid inputs', () => {
      expect(sanitizeUrl('', 'fallback')).toBe('fallback');
      expect(sanitizeUrl('  ', 'fallback')).toBe('fallback');
      expect(sanitizeUrl(undefined, 'fallback')).toBe('fallback');
    });

    it('should handle URLs without trailing slashes', () => {
      expect(sanitizeUrl('http://localhost:8202', 'fallback')).toBe('http://localhost:8202');
    });
  });

  describe('normalizeCollectionName', () => {
    it('should convert to lowercase and trim', () => {
      expect(normalizeCollectionName('  DOCS_INDEX  ')).toBe('docs_index');
      expect(normalizeCollectionName('DocumentationV2')).toBe('documentationv2');
    });

    it('should return default for null/undefined', () => {
      expect(normalizeCollectionName(null)).toBe('documentation');
      expect(normalizeCollectionName(undefined)).toBe('documentation');
    });

    it('should return default for empty strings', () => {
      expect(normalizeCollectionName('')).toBe('documentation');
      expect(normalizeCollectionName('  ')).toBe('documentation');
    });

    it('should accept custom default value', () => {
      expect(normalizeCollectionName(null, 'custom_default')).toBe('custom_default');
    });
  });

  describe('normalizeIndexedPath', () => {
    it('should extract path after /docs/', () => {
      expect(normalizeIndexedPath('/data/docs/content/api/overview.md')).toBe('content/api/overview.md');
      expect(normalizeIndexedPath('/home/user/project/docs/guide.mdx')).toBe('guide.mdx');
    });

    it('should handle /data/docs/ prefix', () => {
      expect(normalizeIndexedPath('/data/docs/README.md')).toBe('README.md');
    });

    it('should handle Windows-style paths', () => {
      // Function normalizes backslashes to forward slashes
      expect(normalizeIndexedPath('C:\\project\\docs\\content\\guide.mdx')).toBe('content/guide.mdx');
    });

    it('should remove leading slashes for relative paths', () => {
      expect(normalizeIndexedPath('/content/guide.md')).toBe('content/guide.md');
    });

    it('should validate file extensions', () => {
      expect(normalizeIndexedPath('/docs/file.md')).toBe('file.md');
      expect(normalizeIndexedPath('/docs/file.mdx')).toBe('file.mdx');
      expect(normalizeIndexedPath('/docs/file.txt')).toBeNull();
      expect(normalizeIndexedPath('/docs/file.pdf')).toBeNull();
    });

    it('should return null for invalid inputs', () => {
      expect(normalizeIndexedPath(null)).toBeNull();
      expect(normalizeIndexedPath(undefined)).toBeNull();
      expect(normalizeIndexedPath('')).toBeNull();
    });

    it('should be case-insensitive for extensions', () => {
      expect(normalizeIndexedPath('/docs/file.MD')).toBe('file.MD');
      expect(normalizeIndexedPath('/docs/file.MDX')).toBe('file.MDX');
    });
  });

  describe('inferModelFromName', () => {
    it('should infer gemma model', () => {
      expect(inferModelFromName('docs_index_gemma')).toBe('embeddinggemma:latest');
      expect(inferModelFromName('repository_GEMMA')).toBe('embeddinggemma:latest');
    });

    it('should infer mxbai model', () => {
      expect(inferModelFromName('docs_index_mxbai')).toBe('mxbai-embed-large');
      expect(inferModelFromName('MXBAI_collection')).toBe('mxbai-embed-large');
    });

    it('should infer nomic model', () => {
      expect(inferModelFromName('workspace_nomic')).toBe('nomic-embed-text');
      expect(inferModelFromName('NOMIC-embed')).toBe('nomic-embed-text');
    });

    it('should infer e5 model', () => {
      expect(inferModelFromName('multilingual_e5')).toBe('intfloat/multilingual-e5-large');
    });

    it('should infer minilm model', () => {
      expect(inferModelFromName('all-minilm-l6')).toBe('all-minilm-l6-v2');
      expect(inferModelFromName('MiniLM_collection')).toBe('all-minilm-l6-v2');
    });

    it('should return null for unknown patterns', () => {
      expect(inferModelFromName('unknown_collection')).toBeNull();
      expect(inferModelFromName('random123')).toBeNull();
    });

    it('should return null for invalid inputs', () => {
      expect(inferModelFromName(null)).toBeNull();
      expect(inferModelFromName(undefined)).toBeNull();
      expect(inferModelFromName('')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(inferModelFromName('MXBAI')).toBe('mxbai-embed-large');
      expect(inferModelFromName('Gemma')).toBe('embeddinggemma:latest');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with locale', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should return fallback for null/undefined', () => {
      expect(formatNumber(null)).toBe('–');
      expect(formatNumber(undefined)).toBe('–');
    });

    it('should accept custom fallback', () => {
      expect(formatNumber(null, 'N/A')).toBe('N/A');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });

    it('should handle decimals', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(2097152)).toBe('2 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
    });

    it('should round to 1 decimal place', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1638)).toBe('1.6 KB');
    });
  });
});
