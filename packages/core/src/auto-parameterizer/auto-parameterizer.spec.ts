import { parameterize } from './auto-parameterizer';
import type { HarEntry, HarTimings } from '../types';

/**
 * Test helper: minimum gerekli alanlarla HarEntry oluşturur.
 * Auto-parameterizer sadece `url` ve `method` kullanır.
 */
function createEntry(url: string, method: string = 'GET'): HarEntry {
  return {
    url,
    method,
    status: 200,
    statusText: 'OK',
    responseBody: '',
    responseHeaders: [],
    requestHeaders: [],
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 0,
      wait: 0,
      receive: 0,
      ssl: -1,
    } satisfies HarTimings,
  };
}

describe('parameterize', () => {
  // ─── AC #1: UUID URL (Subtask 5.2) ────────────────────────────

  it('should parameterize UUID segment in URL', () => {
    const entries = [
      createEntry('https://api.example.com/api/users/550e8400-e29b-41d4-a716-446655440000/orders'),
    ];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/users/{param}/orders');
    expect(pattern.segments).toEqual([
      { kind: 'static', value: 'api' },
      { kind: 'static', value: 'users' },
      { kind: 'dynamic', paramType: 'uuid' },
      { kind: 'static', value: 'orders' },
    ]);
  });

  // ─── AC #2: Numeric ID URL (Subtask 5.3) ──────────────────────

  it('should parameterize numeric ID segment in URL', () => {
    const entries = [createEntry('https://api.example.com/api/products/42/reviews')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/products/{param}/reviews');
    expect(pattern.segments).toContainEqual({
      kind: 'dynamic',
      paramType: 'numeric',
    });
  });

  // ─── AC #3: Hex token URL (Subtask 5.4) ────────────────────────

  it('should parameterize hex token segment in URL', () => {
    const entries = [createEntry('https://api.example.com/api/auth/a1b2c3d4e5f67890abcd1234')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/auth/{param}');
    expect(pattern.segments).toContainEqual({
      kind: 'dynamic',
      paramType: 'hex',
    });
  });

  // ─── AC #3: JWT/Base64 URL (Subtask 5.5) ───────────────────────

  it('should parameterize JWT/Base64 segment in URL', () => {
    const entries = [createEntry('https://api.example.com/api/session/eyJhbGciOiJIUzI1NiJ9')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/session/{param}');
    expect(pattern.segments).toContainEqual({
      kind: 'dynamic',
      paramType: 'base64',
    });
  });

  // ─── AC #4: Nullable segment (Subtask 5.6) ─────────────────────

  describe('nullable segments', () => {
    it('should parameterize "null" as nullable segment', () => {
      const entries = [createEntry('https://api.example.com/api/items/null/details')];

      const result = parameterize(entries);

      expect(result).toHaveLength(1);
      const pattern = result[0]!;
      expect(pattern.template).toBe('/api/items/{param}/details');
      expect(pattern.segments).toContainEqual({
        kind: 'dynamic',
        paramType: 'nullable',
      });
    });

    it('should parameterize empty segment as nullable', () => {
      const entries = [createEntry('https://api.example.com/api/items//details')];

      const result = parameterize(entries);

      expect(result).toHaveLength(1);
      const pattern = result[0]!;
      expect(pattern.template).toBe('/api/items/{param}/details');
      expect(pattern.segments).toContainEqual({
        kind: 'dynamic',
        paramType: 'nullable',
      });
    });
  });

  // ─── AC #5: Aynı template üretimi (Subtask 5.8) ───────────────

  it('should produce same template for different IDs and preserve originals', () => {
    const entries = [
      createEntry('https://api.example.com/api/users/123'),
      createEntry('https://api.example.com/api/users/456'),
    ];

    const result = parameterize(entries);

    expect(result).toHaveLength(2);
    expect(result[0]!.template).toBe('/api/users/{param}');
    expect(result[1]!.template).toBe('/api/users/{param}');
    expect(result[0]!.original).toBe('https://api.example.com/api/users/123');
    expect(result[1]!.original).toBe('https://api.example.com/api/users/456');
  });

  // ─── Karma dynamic segments (Subtask 5.7) ──────────────────────

  it('should handle multiple dynamic segments in one URL', () => {
    const entries = [
      createEntry(
        'https://api.example.com/api/users/550e8400-e29b-41d4-a716-446655440000/orders/42',
      ),
    ];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/users/{param}/orders/{param}');
    expect(pattern.segments).toEqual([
      { kind: 'static', value: 'api' },
      { kind: 'static', value: 'users' },
      { kind: 'dynamic', paramType: 'uuid' },
      { kind: 'static', value: 'orders' },
      { kind: 'dynamic', paramType: 'numeric' },
    ]);
  });

  // ─── Boş entries array (Subtask 5.9) ───────────────────────────

  it('should return empty array for empty entries', () => {
    const result = parameterize([]);
    expect(result).toEqual([]);
  });

  // ─── Query params ve fragment (Subtask 5.10) ───────────────────

  it('should use only path in template, ignoring query params and fragment', () => {
    const entries = [createEntry('https://api.example.com/users/123?page=1#section')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/users/{param}');
  });

  // ─── original alanı tam URL korumalı (Subtask 5.11) ────────────

  it('should preserve full URL in original field', () => {
    const entries = [createEntry('https://api.example.com/users/123')];

    const result = parameterize(entries);

    expect(result[0]!.original).toBe('https://api.example.com/users/123');
  });

  // ─── Method korunması (Subtask 5.12) ───────────────────────────

  describe('method preservation', () => {
    it('should preserve GET method', () => {
      const entries = [createEntry('https://api.example.com/users', 'GET')];
      const result = parameterize(entries);
      expect(result[0]!.method).toBe('GET');
    });

    it('should preserve POST method', () => {
      const entries = [createEntry('https://api.example.com/users', 'POST')];
      const result = parameterize(entries);
      expect(result[0]!.method).toBe('POST');
    });
  });

  // ─── Root path URL (Subtask 5.13) ──────────────────────────────

  it('should handle root path URL', () => {
    const entries = [createEntry('https://api.example.com/')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/');
    expect(pattern.segments).toEqual([]);
  });

  // ─── Fallback URL parsing edge cases ───────────────────────────

  it('should handle relative path URL (invalid URL fallback)', () => {
    const entries = [createEntry('/api/users/123')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    const pattern = result[0]!;
    expect(pattern.template).toBe('/api/users/{param}');
  });

  it('should handle relative path with query params (fallback)', () => {
    const entries = [createEntry('/api/users/456?page=2')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    expect(result[0]!.template).toBe('/api/users/{param}');
  });

  it('should handle relative path with fragment (fallback)', () => {
    const entries = [createEntry('/api/users/789#section')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    expect(result[0]!.template).toBe('/api/users/{param}');
  });

  it('should handle relative path with fragment before query (fallback)', () => {
    const entries = [createEntry('/api/items/42#top?foo=bar')];

    const result = parameterize(entries);

    expect(result).toHaveLength(1);
    expect(result[0]!.template).toBe('/api/items/{param}');
  });
});
