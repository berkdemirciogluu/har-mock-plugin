import { parseHar } from './har-parser';
import { HarParseError } from '../errors';
import { HarMockError } from '../errors';

/**
 * Minimal valid HAR 1.2 JSON string for testing
 */
const VALID_HAR_MINIMAL = {
  log: {
    version: '1.2',
    creator: { name: 'test', version: '1.0' },
    entries: [
      {
        startedDateTime: '2026-01-01T00:00:00.000Z',
        time: 100,
        request: {
          method: 'GET',
          url: 'https://api.example.com/users/123',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [{ name: 'Accept', value: 'application/json' }],
          queryString: [],
          headersSize: -1,
          bodySize: 0,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          content: {
            size: 27,
            mimeType: 'application/json',
            text: '{"id":123,"name":"Test User"}',
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: 27,
        },
        timings: {
          blocked: 0,
          dns: 1,
          connect: 5,
          send: 1,
          wait: 50,
          receive: 10,
          ssl: 3,
        },
      },
    ],
  },
};

describe('parseHar', () => {
  // Subtask 6.2: Geçerli HAR parse — tüm alanlar eksiksiz çıkarılır
  it('should parse a valid HAR and extract all fields', () => {
    const result = parseHar(JSON.stringify(VALID_HAR_MINIMAL));

    expect(result.version).toBe('1.2');
    expect(result.creator.name).toBe('test');
    expect(result.creator.version).toBe('1.0');
    expect(result.entries).toHaveLength(1);

    const entry = result.entries[0]!;
    expect(entry.url).toBe('https://api.example.com/users/123');
    expect(entry.method).toBe('GET');
    expect(entry.status).toBe(200);
    expect(entry.statusText).toBe('OK');
    expect(entry.responseBody).toBe('{"id":123,"name":"Test User"}');
    expect(entry.responseHeaders).toEqual([{ name: 'Content-Type', value: 'application/json' }]);
    expect(entry.requestHeaders).toEqual([{ name: 'Accept', value: 'application/json' }]);
    expect(entry.timings).toEqual({
      blocked: 0,
      dns: 1,
      connect: 5,
      send: 1,
      wait: 50,
      receive: 10,
      ssl: 3,
    });
  });

  // Subtask 6.3: Bozuk JSON string — HarParseError
  it('should throw HarParseError for invalid JSON string', () => {
    expect(() => parseHar('not valid json {')).toThrow(HarParseError);
    try {
      parseHar('this is not json');
    } catch (e) {
      const error = e as HarParseError;
      expect(error.type).toBe('HAR_PARSE_ERROR');
      expect(error.rootCause).toContain('Invalid JSON');
      expect(error.suggestedAction).toBeTruthy();
    }
  });

  it('should throw HarParseError for empty string input', () => {
    expect(() => parseHar('')).toThrow(HarParseError);
  });

  // Subtask 6.4: Boş entries array — HarFile döner, entries.length === 0
  it('should return HarFile with empty entries for HAR with no entries', () => {
    const har = {
      log: {
        version: '1.2',
        creator: { name: 'test', version: '1.0' },
        entries: [],
      },
    };
    const result = parseHar(JSON.stringify(har));
    expect(result.entries).toHaveLength(0);
    expect(result.version).toBe('1.2');
  });

  // Subtask 6.5: Binary response body (encoding: 'base64')
  it('should preserve Base64 encoded response body as-is', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    const firstEntry = har.log.entries[0]!;
    firstEntry.response.content = {
      size: 100,
      mimeType: 'image/png',
      text: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
      encoding: 'base64',
    } as typeof firstEntry.response.content;

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.responseBody).toBe(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
    );
  });

  // Subtask 6.6: Büyük HAR (100+ entry)
  it('should correctly parse a large HAR with 100+ entries', () => {
    const baseEntry = VALID_HAR_MINIMAL.log.entries[0]!;
    const entries = Array.from({ length: 150 }, (_, i) => ({
      ...baseEntry,
      request: {
        ...baseEntry.request,
        url: `https://api.example.com/resource/${i}`,
      },
    }));

    const har = {
      log: {
        ...VALID_HAR_MINIMAL.log,
        entries,
      },
    };

    const result = parseHar(JSON.stringify(har));
    expect(result.entries).toHaveLength(150);
    expect(result.entries[0]!.url).toBe('https://api.example.com/resource/0');
    expect(result.entries[149]!.url).toBe('https://api.example.com/resource/149');
  });

  // Subtask 6.7: Eksik timing alanları — varsayılan değerler
  it('should apply default timings when timings are missing', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    delete (har.log.entries[0] as Record<string, unknown>)['timings'];

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.timings).toEqual({
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 0,
      wait: 0,
      receive: 0,
      ssl: -1,
    });
  });

  it('should apply defaults for partially missing timing fields', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    (har.log.entries[0] as Record<string, unknown>)['timings'] = {
      send: 5,
      wait: 100,
      receive: 20,
    };

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.timings).toEqual({
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 5,
      wait: 100,
      receive: 20,
      ssl: -1,
    });
  });

  it('should apply default wait and receive when only blocked/dns/connect/send/ssl are provided', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    (har.log.entries[0] as Record<string, unknown>)['timings'] = {
      blocked: 1,
      dns: 2,
      connect: 3,
      send: 4,
      ssl: 5,
    };

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.timings).toEqual({
      blocked: 1,
      dns: 2,
      connect: 3,
      send: 4,
      wait: 0,
      receive: 0,
      ssl: 5,
    });
  });

  // Subtask 6.8: HarParseError özellikleri — instanceof checks
  it('should throw errors that are instances of HarMockError', () => {
    try {
      parseHar('invalid json');
    } catch (e) {
      expect(e).toBeInstanceOf(HarMockError);
      expect(e).toBeInstanceOf(HarParseError);
      const error = e as HarParseError;
      expect(typeof error.type).toBe('string');
      expect(typeof error.rootCause).toBe('string');
      expect(typeof error.suggestedAction).toBe('string');
      expect(error.type).toBe('HAR_PARSE_ERROR');
    }
  });

  it('should have correct error name property', () => {
    try {
      parseHar('invalid json');
    } catch (e) {
      const error = e as HarParseError;
      expect(error.name).toBe('HarParseError');
    }
  });

  // Subtask 6.9: Birden fazla header aynı name ile — tümü korunur
  it('should preserve duplicate headers with the same name', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    har.log.entries[0]!.response.headers = [
      { name: 'Set-Cookie', value: 'session=abc123' },
      { name: 'Set-Cookie', value: 'tracking=xyz789' },
      { name: 'Content-Type', value: 'application/json' },
    ];

    const result = parseHar(JSON.stringify(har));
    const setCookieHeaders = result.entries[0]!.responseHeaders.filter(
      (h) => h.name === 'Set-Cookie',
    );
    expect(setCookieHeaders).toHaveLength(2);
    expect(setCookieHeaders[0]!.value).toBe('session=abc123');
    expect(setCookieHeaders[1]!.value).toBe('tracking=xyz789');
  });

  // Subtask 6.10: response.content.text undefined/null — responseBody boş string
  it('should set responseBody to empty string when content.text is undefined', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    delete (har.log.entries[0]!.response.content as Record<string, unknown>)['text'];

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.responseBody).toBe('');
  });

  it('should set responseBody to empty string when content.text is null', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    (har.log.entries[0]!.response.content as Record<string, unknown>)['text'] = null;

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.responseBody).toBe('');
  });

  // Additional: multiple entries parsed correctly
  it('should parse multiple entries correctly', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    har.log.entries.push({
      startedDateTime: '2026-01-01T00:00:01.000Z',
      time: 50,
      request: {
        method: 'POST',
        url: 'https://api.example.com/users',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        queryString: [],
        headersSize: -1,
        bodySize: 20,
      },
      response: {
        status: 201,
        statusText: 'Created',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: [{ name: 'Location', value: '/users/124' }],
        content: {
          size: 15,
          mimeType: 'application/json',
          text: '{"id":124}',
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: 15,
      },
      timings: {
        blocked: -1,
        dns: 0,
        connect: 0,
        send: 2,
        wait: 30,
        receive: 5,
        ssl: -1,
      },
    });

    const result = parseHar(JSON.stringify(har));
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]!.method).toBe('GET');
    expect(result.entries[1]!.method).toBe('POST');
    expect(result.entries[1]!.status).toBe(201);
    expect(result.entries[1]!.responseBody).toBe('{"id":124}');
  });

  // Creator validation (M3)
  it('should throw HarParseError when creator is not provided', () => {
    const har = {
      log: {
        version: '1.2',
        entries: [],
      },
    };

    expect(() => parseHar(JSON.stringify(har))).toThrow(HarParseError);
  });

  // Branch coverage: response without headers array (M2)
  it('should handle response with missing headers array', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    delete (har.log.entries[0]!.response as Record<string, unknown>)['headers'];

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.responseHeaders).toEqual([]);
  });

  // Branch coverage: request without headers array (M2)
  it('should handle request with missing headers array', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    delete (har.log.entries[0]!.request as Record<string, unknown>)['headers'];

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.requestHeaders).toEqual([]);
  });

  // Branch coverage: response without statusText (M2)
  it('should handle response with missing statusText', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    delete (har.log.entries[0]!.response as Record<string, unknown>)['statusText'];

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.statusText).toBe('');
  });

  // Non-standard HTTP method support (H2)
  it('should accept non-standard HTTP methods from HAR files', () => {
    const har = structuredClone(VALID_HAR_MINIMAL);
    (har.log.entries[0]!.request as Record<string, unknown>)['method'] = 'PROPFIND';

    const result = parseHar(JSON.stringify(har));
    expect(result.entries[0]!.method).toBe('PROPFIND');
  });
});
