import { MockResolver } from './mock-resolver';
import { HAR_MOCK_CHANNEL } from './window-messaging.types';
import type { WindowMatchResult } from './window-messaging.types';

/** Helper — window.postMessage ile cevap simüle eder */
function dispatchMatchResult(result: WindowMatchResult): void {
  const event = new MessageEvent('message', {
    data: result,
    origin: window.location.origin,
    source: window,
  });
  window.dispatchEvent(event);
}

describe('MockResolver', () => {
  let resolver: MockResolver;

  beforeEach(() => {
    resolver = new MockResolver(5000);
  });

  afterEach(() => {
    resolver.destroy();
    jest.clearAllMocks();
  });

  describe('resolve()', () => {
    it('should send window.postMessage with MATCH_QUERY when resolve() is called', async () => {
      const postSpy = jest.spyOn(window, 'postMessage');

      // Resolve'u başlat ama beklemiyoruz — sadece postMessage kontrol
      const promise = resolver.resolve('https://api.com/users', 'GET');

      expect(postSpy).toHaveBeenCalledTimes(1);
      const postedMsg = postSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(postedMsg).toMatchObject({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_QUERY',
        url: 'https://api.com/users',
        method: 'GET',
      });
      expect(typeof postedMsg['requestId']).toBe('string');
      expect((postedMsg['requestId'] as string).length).toBeGreaterThan(0);

      // Temizle — timeout beklememek için
      const requestId = postedMsg['requestId'] as string;
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId,
        matched: false,
      });
      await promise;
    });

    it('should resolve with matched result when MATCH_RESULT received with correct requestId', async () => {
      let capturedRequestId = '';
      const postSpy = jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const promise = resolver.resolve('https://api.com/data', 'POST');
      expect(postSpy).toHaveBeenCalledTimes(1);

      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: capturedRequestId,
        matched: true,
        response: {
          statusCode: 200,
          body: '{"ok":true}',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          delay: 0,
        },
        source: 'har',
      });

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result?.matched).toBe(true);
      expect(result?.response?.statusCode).toBe(200);
      expect(result?.response?.body).toBe('{"ok":true}');
      expect(result?.response?.headers).toEqual([
        { name: 'Content-Type', value: 'application/json' },
      ]);
      expect(result?.source).toBe('har');
    });

    it('should ignore MATCH_RESULT with wrong requestId', async () => {
      let capturedRequestId = '';
      jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const promise = resolver.resolve('https://api.com/test', 'GET');

      // Yanlış requestId ile gönder — ignore edilmeli
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: 'wrong-request-id-xyz',
        matched: true,
      });

      // Doğru requestId ile gönder — resolve etmeli
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: capturedRequestId,
        matched: false,
      });

      const result = await promise;
      expect(result?.matched).toBe(false);
    });

    it('should return null after timeout (passthrough)', async () => {
      jest.useFakeTimers();

      const shortResolver = new MockResolver(100);
      jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);

      const promise = shortResolver.resolve('https://api.com/timeout', 'GET');

      // Timeout'u tetikle
      jest.advanceTimersByTime(200);

      const result = await promise;
      expect(result).toBeNull();

      shortResolver.destroy();
      jest.useRealTimers();
    });

    it('should generate unique requestIds for concurrent requests', () => {
      const postSpy = jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);

      resolver.resolve('https://api.com/a', 'GET');
      resolver.resolve('https://api.com/b', 'GET');

      expect(postSpy).toHaveBeenCalledTimes(2);
      const id1 = (postSpy.mock.calls[0]?.[0] as Record<string, unknown>)['requestId'];
      const id2 = (postSpy.mock.calls[1]?.[0] as Record<string, unknown>)['requestId'];
      expect(id1).not.toBe(id2);
    });
  });

  describe('destroy()', () => {
    it('should resolve pending requests with null and remove listener after destroy()', async () => {
      jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);

      const shortResolver = new MockResolver(10000);
      const promise = shortResolver.resolve('https://api.com/destroy', 'GET');

      // Destroy çağır — pending promise null ile resolve edilmeli
      shortResolver.destroy();

      // Promise hemen null ile resolve olmalı
      const result = await promise;
      expect(result).toBeNull();
    });

    it('should not react to MATCH_RESULT after destroy (pendingRequests cleared)', async () => {
      let capturedRequestId = '';
      jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const destroyResolver = new MockResolver(5000);
      const promise = destroyResolver.resolve('https://api.com/ex', 'GET');

      // Destroy — pending promise null ile resolve edilmeli
      destroyResolver.destroy();

      // Promise hemen null ile resolve olmalı
      const result = await promise;
      expect(result).toBeNull();

      // Destroy sonrası MATCH_RESULT gelirse — hata fırlatmamalı, ignore edilmeli
      expect(() => {
        dispatchMatchResult({
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_RESULT',
          requestId: capturedRequestId,
          matched: true,
        });
      }).not.toThrow();
    });
  });

  describe('message filtering', () => {
    it('should ignore messages with wrong channel', async () => {
      let capturedRequestId = '';
      jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const promise = resolver.resolve('https://api.com/ch', 'GET');

      // Yanlış channel
      const wrongEvent = new MessageEvent('message', {
        data: {
          channel: 'WRONG_CHANNEL',
          type: 'MATCH_RESULT',
          requestId: capturedRequestId,
          matched: true,
        },
        source: window,
      });
      window.dispatchEvent(wrongEvent);

      // Doğru channel ile resolve et
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: capturedRequestId,
        matched: false,
      });

      const result = await promise;
      expect(result?.matched).toBe(false);
    });

    it('should ignore messages from different source (not window)', async () => {
      let capturedRequestId = '';
      jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const promise = resolver.resolve('https://api.com/src', 'GET');

      // event.source !== window — null source simüle eder
      const foreignEvent = new MessageEvent('message', {
        data: {
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_RESULT',
          requestId: capturedRequestId,
          matched: true,
        },
        source: null, // farklı kaynak
      });
      window.dispatchEvent(foreignEvent);

      // Doğru şekilde resolve et
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: capturedRequestId,
        matched: false,
      });

      const result = await promise;
      expect(result?.matched).toBe(false);
    });

    it('should ignore MATCH_QUERY type messages (only respond to MATCH_RESULT)', async () => {
      let capturedRequestId = '';
      jest.spyOn(window, 'postMessage').mockImplementationOnce((msg) => {
        capturedRequestId = (msg as Record<string, unknown>)['requestId'] as string;
      });

      const promise = resolver.resolve('https://api.com/type', 'GET');

      // MATCH_QUERY tipinde mesaj — ignore edilmeli
      const queryEvent = new MessageEvent('message', {
        data: {
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_QUERY',
          requestId: capturedRequestId,
          url: 'x',
          method: 'GET',
        },
        source: window,
      });
      window.dispatchEvent(queryEvent);

      // Doğru MATCH_RESULT ile resolve et
      dispatchMatchResult({
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: capturedRequestId,
        matched: false,
      });

      const result = await promise;
      expect(result?.matched).toBe(false);
    });
  });
});
