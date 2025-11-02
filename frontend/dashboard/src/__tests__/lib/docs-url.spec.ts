import { describe, expect, it } from 'vitest';
import { buildDocsUrl, normalizeDocsBase } from '../../lib/docsUrl';

describe('docsUrl helpers', () => {
  it('normalizes base urls by trimming whitespace and trailing slashes', () => {
    expect(normalizeDocsBase(' http://localhost:3400/ ')).toBe(
      'http://localhost:3400',
    );
    expect(normalizeDocsBase('http://tradingsystem.local/docs///')).toBe(
      'http://tradingsystem.local/docs',
    );
  });

  it('builds urls for direct port mode without duplicating segments', () => {
    expect(
      buildDocsUrl('tools/ports-services/overview', 'http://localhost:3400'),
    ).toBe('http://localhost:3400/tools/ports-services/overview');
  });

  it('builds urls for unified domain mode where base already includes /docs', () => {
    expect(
      buildDocsUrl(
        'tools/ports-services/overview',
        'http://tradingsystem.local/docs',
      ),
    ).toBe('http://tradingsystem.local/docs/tools/ports-services/overview');
  });

  it('avoids duplicate /docs segments when callers pass a path starting with docs/', () => {
    expect(
      buildDocsUrl(
        'docs/tools/ports-services/overview',
        'http://tradingsystem.local/docs',
      ),
    ).toBe('http://tradingsystem.local/docs/tools/ports-services/overview');
  });

  it('strips markdown extensions before concatenation', () => {
    expect(
      buildDocsUrl('/context/backend/guide.md', 'http://localhost:3400'),
    ).toBe('http://localhost:3400/context/backend/guide');
  });
});
