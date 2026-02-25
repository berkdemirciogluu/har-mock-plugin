/**
 * @jest-environment <rootDir>/jest-environment-fetch.js
 */
import { interceptFetch, cleanupFetch } from './fetch-interceptor';
import type { MockResolver, ResolvedMatch } from './mock-resolver';

/** Mock resolver factory */
function createMockResolver(
  result: ResolvedMatch | null,
): jest.Mocked<Pick<MockResolver, 'resolve' | 'destroy'>> {
  return {
    resolve: jest.fn().mockResolvedValue(result),
    destroy: jest.fn(),
  };
}

describe('fetch-interceptor', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = jest.fn().mockResolvedValue(new Response('original-body', { status: 200 }));
    window.fetch = originalFetch;
  });

  afterEach(() => {
    cleanupFetch();
    jest.clearAllMocks();
  });

  describe('matched HAR response', () => {
    it('should return mock Response when resolver returns matched result', async () => {
      const mockResolver = createMockResolver({
        matched: true,
        response: { statusCode: 201, body: '{"mock":true}', headers: [], delay: 0 },
      });

      interceptFetch(mockResolver as unknown as MockResolver);

      const response = await window.fetch('https://api.com/data');
      expect(response.status).toBe(201);
      expect(await response.text()).toBe('{"mock":true}');
      expect(originalFetch).not.toHaveBeenCalled();
    });

    it('should apply response headers from HAR entry', async () => {
      const mockResolver = createMockResolver({
        matched: true,
        response: {
          statusCode: 200,
          body: 'hello',
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-Custom', value: 'test' },
          ],
          delay: 0,
        },
      });
      interceptFetch(mockResolver as unknown as MockResolver);

      const response = await window.fetch('https://api.com/test');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Custom')).toBe('test');
    });

    it('should apply delay when response.delay > 0', async () => {
      const mockResolver = createMockResolver({
        matched: true,
        response: { statusCode: 200, body: 'delayed', headers: [], delay: 50 },
      });
      interceptFetch(mockResolver as unknown as MockResolver);

      const start = Date.now();
      await window.fetch('https://api.com/slow');
      const elapsed = Date.now() - start;

      // Delay en az 40ms uygulanmış olmalı (50ms target, timer variance toleransı)
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it('should not apply delay when response.delay is 0', async () => {
      const start = Date.now();
      const mockResolver = createMockResolver({
        matched: true,
        response: { statusCode: 200, body: 'fast', headers: [], delay: 0 },
      });
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch('https://api.com/fast');
      expect(Date.now() - start).toBeLessThan(50);
    });
  });

  describe('no match — passthrough', () => {
    it('should call original fetch when resolver returns null (no match)', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch('https://api.com/nomatch');
      expect(originalFetch).toHaveBeenCalledTimes(1);
    });

    it('should call original fetch when resolver returns matched: false', async () => {
      const mockResolver = createMockResolver({ matched: false });
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch('https://api.com/nomatch2');
      expect(originalFetch).toHaveBeenCalledTimes(1);
    });

    it('should forward original fetch arguments on passthrough', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch('https://api.com/passthrough', { method: 'POST', body: 'data' });
      expect(originalFetch).toHaveBeenCalledWith('https://api.com/passthrough', {
        method: 'POST',
        body: 'data',
      });
    });
  });

  describe('error handling — silent passthrough (ARCH8)', () => {
    it('should call original fetch when resolver throws (silent passthrough)', async () => {
      const mockResolver = {
        resolve: jest.fn().mockRejectedValue(new Error('resolver failed')),
        destroy: jest.fn(),
      };
      interceptFetch(mockResolver as unknown as MockResolver);

      const response = await window.fetch('https://api.com/error');
      expect(originalFetch).toHaveBeenCalledTimes(1);
      expect(response).toBeDefined();
    });
  });

  describe('URL resolution', () => {
    it('should resolve relative URL to absolute before querying resolver', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch('/api/users');

      const resolveCall = mockResolver.resolve.mock.calls[0];
      expect(resolveCall?.[0]).toMatch(/^https?:\/\//);
    });

    it('should handle URL object input', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch(new URL('https://api.com/url-object'));

      const resolveCall = mockResolver.resolve.mock.calls[0];
      expect(resolveCall?.[0]).toBe('https://api.com/url-object');
      expect(resolveCall?.[1]).toBe('GET');
    });

    it('should handle Request object input and extract url + method', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      await window.fetch(new Request('https://api.com/request-obj', { method: 'DELETE' }));

      const resolveCall = mockResolver.resolve.mock.calls[0];
      expect(resolveCall?.[0]).toBe('https://api.com/request-obj');
      expect(resolveCall?.[1]).toBe('DELETE');
    });

    it('should use init.method over Request.method when both present', async () => {
      const mockResolver = createMockResolver(null);
      interceptFetch(mockResolver as unknown as MockResolver);

      const req = new Request('https://api.com/method-override', { method: 'GET' });
      await window.fetch(req, { method: 'PUT' });

      const resolveCall = mockResolver.resolve.mock.calls[0];
      expect(resolveCall?.[1]).toBe('PUT');
    });
  });

  describe('forbidden headers — graceful skip', () => {
    it('should skip forbidden headers and apply valid ones', async () => {
      const mockResolver = createMockResolver({
        matched: true,
        response: {
          statusCode: 200,
          body: '',
          headers: [
            { name: 'Content-Type', value: 'text/plain' },
            // 'Host' ve 'Content-Length' bazı ortamlarda forbidden olabilir
            // Jest JSDOM'da forbidden değil ama bu testi graceful degradation için yazıyoruz
          ],
          delay: 0,
        },
      });
      interceptFetch(mockResolver as unknown as MockResolver);

      // Forbidden header simüle etmek için Headers.prototype.append mock'layabiliriz
      const originalAppend = Headers.prototype.append;
      Headers.prototype.append = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new TypeError('forbidden header');
        })
        .mockImplementation(originalAppend);

      const response = await window.fetch('https://api.com/forbidden');
      expect(response.status).toBe(200);
      Headers.prototype.append = originalAppend;
    });
  });

  describe('cleanupFetch()', () => {
    it('should restore original fetch after cleanupFetch()', async () => {
      const mockResolver = createMockResolver({
        matched: true,
        response: { statusCode: 201, body: 'mock', headers: [], delay: 0 },
      });
      interceptFetch(mockResolver as unknown as MockResolver);

      // Intercept aktif
      const mockResponse = await window.fetch('https://api.com/before-cleanup');
      expect(mockResponse.status).toBe(201);

      // Cleanup
      cleanupFetch();

      // Orijinal fetch geri geldi
      const originalResponse = await window.fetch('https://api.com/after-cleanup');
      expect(originalResponse.status).toBe(200);
      expect(await originalResponse.text()).toBe('original-body');
    });
  });
});
