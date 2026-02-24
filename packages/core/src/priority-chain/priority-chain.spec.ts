import { resolve } from './priority-chain';
import { createMockRule, createMockRequest } from '../rule-engine/test-utils';
import type { HarEntry, HarHeader, HarTimings } from '../types/har.types';
import type { UrlPattern, PatternSegment } from '../types/url-pattern.types';

// ─── Test Helpers ─────────────────────────────────────────────

const defaultTimings: HarTimings = {
  blocked: -1,
  dns: -1,
  connect: -1,
  send: 0,
  wait: 100,
  receive: 50,
  ssl: -1,
};

const defaultHeaders: readonly HarHeader[] = [{ name: 'Content-Type', value: 'application/json' }];

function createHarEntry(overrides: Partial<HarEntry> = {}): HarEntry {
  return {
    url: 'https://api.example.com/api/users',
    method: 'GET',
    status: 200,
    statusText: 'OK',
    responseBody: '{"users":[]}',
    responseHeaders: defaultHeaders,
    requestHeaders: defaultHeaders,
    timings: defaultTimings,
    ...overrides,
  };
}

function createUrlPattern(
  template: string = '/api/users',
  method: string = 'GET',
  original?: string,
): UrlPattern {
  const segments: readonly PatternSegment[] = template
    .split('/')
    .filter((s) => s !== '')
    .map((s) =>
      s === '{param}'
        ? ({ kind: 'dynamic', paramType: 'uuid' as const } as const)
        : ({ kind: 'static', value: s } as const),
    );
  return {
    original: original ?? `https://api.example.com${template}`,
    template,
    segments,
    method,
  };
}

// ─── PriorityChain Tests ──────────────────────────────────────

describe('resolve', () => {
  describe('AC #1: Rule + HAR → rule response', () => {
    it('returns rule response when both rule and HAR match', () => {
      const rule = createMockRule({
        urlPattern: '/api/users',
        method: 'GET',
        statusCode: 201,
        responseBody: '{"mock":true}',
      });
      const harEntry = createHarEntry();
      const pattern = createUrlPattern();
      const request = createMockRequest({ url: '/api/users', method: 'GET' });

      const result = resolve(request, [rule], [harEntry], [pattern]);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('rule');
      expect(result?.response.statusCode).toBe(201);
      expect(result?.response.body).toBe('{"mock":true}');
    });
  });

  describe('AC #2: No rule, HAR match → HAR response', () => {
    it('returns HAR response when no rule matches', () => {
      const harEntry = createHarEntry({
        url: 'https://api.example.com/api/users',
        method: 'GET',
        status: 200,
        responseBody: '{"users":[]}',
      });
      const pattern = createUrlPattern('/api/users', 'GET');
      const request = createMockRequest({
        url: 'https://api.example.com/api/users',
        method: 'GET',
      });

      const result = resolve(request, [], [harEntry], [pattern]);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('har');
      expect(result?.response.statusCode).toBe(200);
      expect(result?.response.body).toBe('{"users":[]}');
    });
  });

  describe('AC #3: No rule, no HAR → null (Passthrough)', () => {
    it('returns null when nothing matches', () => {
      const request = createMockRequest({ url: '/api/unknown', method: 'GET' });

      const result = resolve(request, [], [], []);

      expect(result).toBeNull();
    });
  });

  describe('deterministic behavior (NFR7)', () => {
    it('returns same result for same input — 10 consecutive calls', () => {
      const rule = createMockRule({
        urlPattern: '/api/users',
        method: 'GET',
        statusCode: 200,
      });
      const request = createMockRequest({ url: '/api/users', method: 'GET' });

      const results = Array.from({ length: 10 }, () => resolve(request, [rule], [], []));

      const first = results[0];
      for (const result of results) {
        expect(result).toEqual(first);
      }
    });
  });

  describe('multiple rules — first match used', () => {
    it('uses first matching rule when multiple rules match', () => {
      const rule1 = createMockRule({ id: '1', statusCode: 200 });
      const rule2 = createMockRule({ id: '2', statusCode: 404 });
      const request = createMockRequest();

      const result = resolve(request, [rule1, rule2], [], []);

      expect(result?.source).toBe('rule');
      expect(result?.response.statusCode).toBe(200);
    });
  });

  describe('rule disabled → HAR fallback', () => {
    it('falls back to HAR when rule is disabled', () => {
      const disabledRule = createMockRule({
        urlPattern: '/api/users',
        method: 'GET',
        enabled: false,
      });
      const harEntry = createHarEntry({
        url: 'https://api.example.com/api/users',
        method: 'GET',
        status: 200,
      });
      const pattern = createUrlPattern('/api/users', 'GET');
      const request = createMockRequest({
        url: 'https://api.example.com/api/users',
        method: 'GET',
      });

      const result = resolve(request, [disabledRule], [harEntry], [pattern]);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('har');
    });
  });

  describe('HAR entry → MockResponse conversion', () => {
    it('correctly maps HarEntry fields to MockResponse', () => {
      const harEntry = createHarEntry({
        url: 'https://api.example.com/api/data',
        method: 'POST',
        status: 201,
        responseBody: '{"id":1}',
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Request-Id', value: 'abc123' },
        ],
      });
      const pattern = createUrlPattern('/api/data', 'POST');
      const request = createMockRequest({
        url: 'https://api.example.com/api/data',
        method: 'POST',
      });

      const result = resolve(request, [], [harEntry], [pattern]);

      expect(result).not.toBeNull();
      expect(result?.response).toEqual({
        statusCode: 201,
        body: '{"id":1}',
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Request-Id', value: 'abc123' },
        ],
        delay: 0,
      });
    });
  });

  describe('empty rules + empty HAR entries → null', () => {
    it('returns null when both rules and HAR are empty', () => {
      const request = createMockRequest();

      expect(resolve(request, [], [], [])).toBeNull();
    });
  });

  describe('exception durumunda null — sessiz passthrough', () => {
    it('returns null when URL pattern matching has no HAR entry match', () => {
      const pattern = createUrlPattern('/api/users', 'GET');
      const request = createMockRequest({
        url: 'https://api.example.com/api/users',
        method: 'GET',
      });

      // No HAR entry for this pattern
      const result = resolve(request, [], [], [pattern]);

      expect(result).toBeNull();
    });
  });

  describe('HAR match with no corresponding entry', () => {
    it('returns null when URL pattern matches but no HAR entry found', () => {
      const harEntry = createHarEntry({
        url: 'https://api.example.com/api/other',
        method: 'GET',
      });
      const pattern = createUrlPattern('/api/users', 'GET');
      const request = createMockRequest({
        url: 'https://api.example.com/api/users',
        method: 'GET',
      });

      const result = resolve(request, [], [harEntry], [pattern]);

      expect(result).toBeNull();
    });
  });
});
