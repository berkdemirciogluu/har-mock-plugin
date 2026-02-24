import { matchUrl } from './url-matcher';
import { createPattern } from './test-utils';

// ─── Tests ────────────────────────────────────────────────────

describe('matchUrl', () => {
  describe('exact match (AC #1)', () => {
    it('matches pattern with dynamic segment — returns MatchResult', () => {
      const pattern = createPattern('/api/users/{param}/orders', 'GET');
      const patterns = [pattern];

      const result = matchUrl('/api/users/999/orders', 'GET', patterns);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(pattern);
    });

    it('MatchResult.pattern is the matching UrlPattern', () => {
      const pattern = createPattern('/api/users/{param}/orders', 'GET');
      const result = matchUrl('/api/users/999/orders', 'GET', [pattern]);

      expect(result?.pattern.template).toBe('/api/users/{param}/orders');
      expect(result?.pattern.method).toBe('GET');
    });
  });

  describe('dynamic segment match', () => {
    it('matches numeric ID', () => {
      const patterns = [createPattern('/api/users/{param}/orders', 'GET')];
      expect(matchUrl('/api/users/123/orders', 'GET', patterns)).not.toBeNull();
    });

    it('matches large numeric ID', () => {
      const patterns = [createPattern('/api/users/{param}/orders', 'GET')];
      expect(matchUrl('/api/users/999/orders', 'GET', patterns)).not.toBeNull();
    });

    it('matches UUID', () => {
      const patterns = [createPattern('/api/users/{param}/orders', 'GET')];
      const result = matchUrl(
        '/api/users/550e8400-e29b-41d4-a716-446655440000/orders',
        'GET',
        patterns,
      );
      expect(result).not.toBeNull();
    });
  });

  describe('priority tiebreak — staticSegmentCount (AC #2, NFR5)', () => {
    it('static pattern wins over dynamic when both match', () => {
      const dynamicPattern = createPattern('/api/users/{param}', 'GET');
      const staticPattern = createPattern('/api/users/profile', 'GET');
      // Dynamic first in array to test sorting
      const patterns = [dynamicPattern, staticPattern];

      const result = matchUrl('/api/users/profile', 'GET', patterns);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(staticPattern);
    });

    it('pattern order in input array does not affect priority', () => {
      const dynamicPattern = createPattern('/api/users/{param}', 'GET');
      const staticPattern = createPattern('/api/users/profile', 'GET');
      // Static first — priority should still work
      const patterns = [staticPattern, dynamicPattern];

      const result = matchUrl('/api/users/profile', 'GET', patterns);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(staticPattern);
    });
  });

  describe('method mismatch', () => {
    it('returns null when method does not match', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/users/123', 'POST', patterns);

      expect(result).toBeNull();
    });

    it('method matching is case-insensitive — get matches GET pattern', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/users/123', 'get', patterns);

      expect(result).not.toBeNull();
    });

    it('method matching is case-insensitive — GET matches get pattern', () => {
      const patterns = [createPattern('/api/users/{param}', 'get')];
      const result = matchUrl('/api/users/123', 'GET', patterns);

      expect(result).not.toBeNull();
    });
  });

  describe('nullable segment (AC #3, FR9)', () => {
    it('matches "null" value in dynamic segment position', () => {
      const patterns = [createPattern('/api/items/{param}/details', 'GET', 'nullable')];
      const result = matchUrl('/api/items/null/details', 'GET', patterns);

      expect(result).not.toBeNull();
    });
  });

  describe('no match (AC #3)', () => {
    it('returns null for unmatched URL', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/other/123', 'GET', patterns);

      expect(result).toBeNull();
    });

    it('does not throw exception on no match', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      expect(() => matchUrl('/api/other/123', 'GET', patterns)).not.toThrow();
    });
  });

  describe('URL input formats', () => {
    it('handles full URL — extracts pathname (AC #5)', () => {
      const patterns = [createPattern('/api/users/{param}/orders', 'GET')];
      const result = matchUrl('https://api.example.com/api/users/123/orders', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('handles path-only input', () => {
      const patterns = [createPattern('/api/users/{param}/orders', 'GET')];
      const result = matchUrl('/api/users/123/orders', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('ignores query params in path-only input', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/users/123?page=1', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('strips hash fragment in path-only input (M2)', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/users/123#section', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('strips hash fragment combined with query string in path-only input (M2)', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];
      const result = matchUrl('/api/users/123?page=1#top', 'GET', patterns);

      expect(result).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null for empty patterns array', () => {
      const result = matchUrl('/api/users/123', 'GET', []);

      expect(result).toBeNull();
    });

    it('does not throw for empty patterns array', () => {
      expect(() => matchUrl('/api/users/123', 'GET', [])).not.toThrow();
    });

    it('selects highest staticSegmentCount from multiple matching patterns', () => {
      // /api/{param}/{param} → staticSegmentCount: 1
      // /api/users/{param}   → staticSegmentCount: 2
      const general = createPattern('/api/{param}/{param}', 'GET');
      const specific = createPattern('/api/users/{param}', 'GET');
      const patterns = [general, specific];

      const result = matchUrl('/api/users/123', 'GET', patterns);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(specific);
    });

    it('trailing slash tolerance — /api/users/123/ matches same as /api/users/123', () => {
      const patterns = [createPattern('/api/users/{param}', 'GET')];

      const withSlash = matchUrl('/api/users/123/', 'GET', patterns);
      const withoutSlash = matchUrl('/api/users/123', 'GET', patterns);

      expect(withSlash).not.toBeNull();
      expect(withoutSlash).not.toBeNull();
      expect(withSlash?.pattern).toBe(withoutSlash?.pattern);
    });

    it('root path "/" matches root pattern (M4)', () => {
      const patterns = [createPattern('/', 'GET')];
      const result = matchUrl('/', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('root path "/" does not match non-root patterns (M4)', () => {
      const patterns = [createPattern('/api/users', 'GET')];
      const result = matchUrl('/', 'GET', patterns);

      expect(result).toBeNull();
    });

    it('equal staticSegmentCount — returns first matching pattern from input order (L1)', () => {
      // Both have staticSegmentCount: 2 — sort is stable, input order preserved
      const patternA = createPattern('/api/{param}/details', 'GET');
      const patternB = createPattern('/api/{param}/summary', 'GET');
      const patterns = [patternA, patternB];

      const result = matchUrl('/api/123/details', 'GET', patterns);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(patternA);
    });

    it('equal staticSegmentCount — reversed input order returns first match (L1)', () => {
      const patternA = createPattern('/api/{param}/details', 'GET');
      const patternB = createPattern('/api/{param}/summary', 'GET');
      // Reversed order
      const patterns = [patternB, patternA];

      const result = matchUrl('/api/123/details', 'GET', patterns);

      // patternA still matches /api/123/details, patternB does NOT match it
      // So result is patternA regardless of order (different templates)
      expect(result).not.toBeNull();
      expect(result?.pattern).toBe(patternA);
    });
  });

  describe('paramType variety in fixture (L3)', () => {
    it('numeric paramType — matches numeric ID in URL', () => {
      const patterns = [createPattern('/api/items/{param}', 'GET', 'numeric')];
      const result = matchUrl('/api/items/42', 'GET', patterns);

      expect(result).not.toBeNull();
    });

    it('hex paramType — matches hex token in URL', () => {
      const patterns = [createPattern('/api/tokens/{param}', 'GET', 'hex')];
      const result = matchUrl('/api/tokens/a1b2c3d4', 'GET', patterns);

      expect(result).not.toBeNull();
    });
  });
});
