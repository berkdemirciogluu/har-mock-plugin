import { compilePattern } from './pattern-compiler';
import type { UrlPattern } from '../types/url-pattern.types';

// ─── Test Fixture Helper ───────────────────────────────────────

function createPattern(template: string, method: string = 'GET'): UrlPattern {
  const segments = template
    .split('/')
    .filter((s) => s !== '')
    .map((s) =>
      s === '{param}'
        ? ({ kind: 'dynamic', paramType: 'uuid' } as const)
        : ({ kind: 'static', value: s } as const),
    );
  return {
    original: `https://example.com${template}`,
    template,
    segments,
    method,
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('compilePattern', () => {
  describe('dynamic segment compilation (AC #4)', () => {
    it('converts {param} to [^/]+ — matches dynamic value', () => {
      const pattern = createPattern('/api/users/{param}/orders');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/users/999/orders')).toBe(true);
      expect(compiled.regex.test('/api/users/anything/orders')).toBe(true);
    });

    it('does not match empty segment where {param} is expected', () => {
      const pattern = createPattern('/api/users/{param}/orders');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/users//orders')).toBe(false);
    });
  });

  describe('static-only template (AC #4)', () => {
    it('produces literal regex without [^/]+', () => {
      const pattern = createPattern('/api/health');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.source).not.toContain('[^/]+');
      expect(compiled.regex.test('/api/health')).toBe(true);
      expect(compiled.regex.test('/api/other')).toBe(false);
    });
  });

  describe('mixed template', () => {
    it('two dynamic segments both match any non-slash value', () => {
      const pattern = createPattern('/api/users/{param}/orders/{param}');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/users/123/orders/456')).toBe(true);
      expect(compiled.regex.test('/api/users/abc/orders/xyz')).toBe(true);
    });

    it('two dynamic segments produce two [^/]+ groups in source', () => {
      const pattern = createPattern('/api/users/{param}/orders/{param}');
      const compiled = compilePattern(pattern);

      const occurrences = compiled.regex.source.split('[^/]+').length - 1;
      expect(occurrences).toBe(2);
    });
  });

  describe('method storage (AC #4)', () => {
    it('stores UrlPattern method in CompiledPattern', () => {
      const pattern = createPattern('/api/users', 'POST');
      const compiled = compilePattern(pattern);

      expect(compiled.method).toBe('POST');
    });

    it('stores pattern reference', () => {
      const pattern = createPattern('/api/users', 'GET');
      const compiled = compilePattern(pattern);

      expect(compiled.pattern).toBe(pattern);
    });
  });

  describe('staticSegmentCount (AC #4)', () => {
    it('/api/users/{param}/orders → staticSegmentCount: 3', () => {
      // segments: api(s), users(s), {param}(d), orders(s) → 3 static
      const pattern = createPattern('/api/users/{param}/orders');
      const compiled = compilePattern(pattern);

      expect(compiled.staticSegmentCount).toBe(3);
    });

    it('/{param} → staticSegmentCount: 0', () => {
      const pattern = createPattern('/{param}');
      const compiled = compilePattern(pattern);

      expect(compiled.staticSegmentCount).toBe(0);
    });

    it('/api/users → staticSegmentCount: 2', () => {
      const pattern = createPattern('/api/users');
      const compiled = compilePattern(pattern);

      expect(compiled.staticSegmentCount).toBe(2);
    });

    it('/api/{param}/orders → staticSegmentCount: 2', () => {
      const pattern = createPattern('/api/{param}/orders');
      const compiled = compilePattern(pattern);

      expect(compiled.staticSegmentCount).toBe(2);
    });
  });

  describe('special character escaping', () => {
    it('escapes dot — /api/v2.0/users does not match /api/v2X0/users', () => {
      const pattern = createPattern('/api/v2.0/users');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/v2.0/users')).toBe(true);
      expect(compiled.regex.test('/api/v2X0/users')).toBe(false);
    });
  });

  describe('regex anchoring', () => {
    it('has ^ prefix and $ suffix', () => {
      const pattern = createPattern('/api/health');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.source.startsWith('^')).toBe(true);
      expect(compiled.regex.source.endsWith('$')).toBe(true);
    });

    it('rejects partial match — /api/users does not match /api/users/profile', () => {
      const pattern = createPattern('/api/users');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/users')).toBe(true);
      expect(compiled.regex.test('/api/users/profile')).toBe(false);
    });

    it('trailing slash accepted via /?$ — /api/health/ matches', () => {
      const pattern = createPattern('/api/health');
      const compiled = compilePattern(pattern);

      expect(compiled.regex.test('/api/health/')).toBe(true);
    });
  });
});
