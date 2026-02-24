import { evaluate } from './rule-engine';
import { createMockRule, createMockRequest } from './test-utils';

// ─── RuleEngine Tests ─────────────────────────────────────────

describe('evaluate', () => {
  describe('exact URL match', () => {
    it('returns MockResponse when URL and method match', () => {
      const rule = createMockRule({ urlPattern: '/api/users', method: 'GET' });
      const request = createMockRequest({ url: '/api/users', method: 'GET' });

      const result = evaluate(request, [rule]);

      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(200);
    });

    it('returns null when URL does not match', () => {
      const rule = createMockRule({ urlPattern: '/api/users', method: 'GET' });
      const request = createMockRequest({ url: '/api/posts', method: 'GET' });

      expect(evaluate(request, [rule])).toBeNull();
    });
  });

  describe('wildcard URL match', () => {
    it('matches wildcard pattern /api/data/*', () => {
      const rule = createMockRule({ urlPattern: '/api/data/*', method: 'GET' });
      const request = createMockRequest({ url: '/api/data/users', method: 'GET' });

      const result = evaluate(request, [rule]);

      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(200);
    });

    it('matches wildcard pattern at nested path', () => {
      const rule = createMockRule({ urlPattern: '/api/data/*', method: 'GET' });
      const request = createMockRequest({ url: '/api/data/users/123', method: 'GET' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('matches wildcard prefix without trailing path', () => {
      const rule = createMockRule({ urlPattern: '/api/data/*', method: 'GET' });
      const request = createMockRequest({ url: '/api/data', method: 'GET' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('does not match different prefix', () => {
      const rule = createMockRule({ urlPattern: '/api/data/*', method: 'GET' });
      const request = createMockRequest({ url: '/api/other/users', method: 'GET' });

      expect(evaluate(request, [rule])).toBeNull();
    });
  });

  describe('method matching', () => {
    it('matches same method', () => {
      const rule = createMockRule({ method: 'GET' });
      const request = createMockRequest({ method: 'GET' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('does not match different method', () => {
      const rule = createMockRule({ method: 'GET' });
      const request = createMockRequest({ method: 'POST' });

      expect(evaluate(request, [rule])).toBeNull();
    });

    it('matches case-insensitive — rule lowercase, request uppercase', () => {
      const rule = createMockRule({ method: 'get' });
      const request = createMockRequest({ method: 'GET' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('matches case-insensitive — rule uppercase, request lowercase', () => {
      const rule = createMockRule({ method: 'GET' });
      const request = createMockRequest({ method: 'get' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });
  });

  describe('disabled rules', () => {
    it('skips disabled rule and returns null', () => {
      const rule = createMockRule({ enabled: false });
      const request = createMockRequest();

      expect(evaluate(request, [rule])).toBeNull();
    });

    it('skips disabled rule and uses next enabled rule', () => {
      const disabledRule = createMockRule({ id: 'disabled', enabled: false, statusCode: 404 });
      const enabledRule = createMockRule({ id: 'enabled', enabled: true, statusCode: 200 });
      const request = createMockRequest();

      const result = evaluate(request, [disabledRule, enabledRule]);

      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(200);
    });
  });

  describe('multiple rules — first match wins', () => {
    it('uses first matching rule', () => {
      const rule1 = createMockRule({ id: 'first', statusCode: 200 });
      const rule2 = createMockRule({ id: 'second', statusCode: 404 });
      const request = createMockRequest();

      const result = evaluate(request, [rule1, rule2]);

      expect(result?.statusCode).toBe(200);
    });
  });

  describe('no match scenarios', () => {
    it('returns null for non-matching URL', () => {
      const rule = createMockRule({ urlPattern: '/api/users' });
      const request = createMockRequest({ url: '/api/posts' });

      expect(evaluate(request, [rule])).toBeNull();
    });

    it('returns null for empty rules array', () => {
      const request = createMockRequest();

      expect(evaluate(request, [])).toBeNull();
    });
  });

  describe('MockResponse field mapping', () => {
    it('maps all fields correctly from rule', () => {
      const rule = createMockRule({
        statusCode: 201,
        responseBody: '{"created":true}',
        responseHeaders: [{ name: 'X-Custom', value: 'test' }],
        delay: 500,
      });
      const request = createMockRequest();

      const result = evaluate(request, [rule]);

      expect(result).toEqual({
        statusCode: 201,
        body: '{"created":true}',
        headers: [{ name: 'X-Custom', value: 'test' }],
        delay: 500,
      });
    });

    it('maps delay 0 correctly', () => {
      const rule = createMockRule({ delay: 0 });
      const request = createMockRequest();

      const result = evaluate(request, [rule]);

      expect(result?.delay).toBe(0);
    });
  });

  describe('full URL input', () => {
    it('extracts pathname from full URL and matches', () => {
      const rule = createMockRule({ urlPattern: '/api/users' });
      const request = createMockRequest({ url: 'https://api.example.com/api/users' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('extracts pathname from full URL with query string', () => {
      const rule = createMockRule({ urlPattern: '/api/users' });
      const request = createMockRequest({ url: 'https://api.example.com/api/users?page=1' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });
  });

  describe('trailing slash tolerance', () => {
    it('matches /api/users/ with pattern /api/users', () => {
      const rule = createMockRule({ urlPattern: '/api/users' });
      const request = createMockRequest({ url: '/api/users/' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });

    it('matches /api/users with pattern /api/users/', () => {
      const rule = createMockRule({ urlPattern: '/api/users/' });
      const request = createMockRequest({ url: '/api/users' });

      expect(evaluate(request, [rule])).not.toBeNull();
    });
  });
});
