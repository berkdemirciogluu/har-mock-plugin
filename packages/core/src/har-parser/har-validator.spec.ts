import { validateHarSchema } from './har-validator';
import { HarParseError } from '../errors';
import { HarMockError } from '../errors';

/**
 * Minimal valid HAR 1.2 root object for testing
 */
function createValidHarRoot(): Record<string, unknown> {
  return {
    log: {
      version: '1.2',
      creator: { name: 'test', version: '1.0' },
      entries: [
        {
          startedDateTime: '2026-01-01T00:00:00.000Z',
          time: 100,
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            queryString: [],
            headersSize: -1,
            bodySize: 0,
          },
          response: {
            status: 200,
            statusText: 'OK',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: {
              size: 0,
              mimeType: 'application/json',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: 0,
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
}

describe('validateHarSchema', () => {
  // Subtask 5.2: Geçerli HAR 1.2 minimal şema — validation geçer
  it('should not throw for a valid HAR 1.2 minimal schema', () => {
    const validHar = createValidHarRoot();
    expect(() => validateHarSchema(validHar)).not.toThrow();
  });

  it('should not throw for a valid HAR with empty entries array', () => {
    const har = createValidHarRoot();
    (har['log'] as Record<string, unknown>)['entries'] = [];
    expect(() => validateHarSchema(har)).not.toThrow();
  });

  it('should accept HAR version 1.1 as well (tolerant)', () => {
    const har = createValidHarRoot();
    (har['log'] as Record<string, unknown>)['version'] = '1.1';
    expect(() => validateHarSchema(har)).not.toThrow();
  });

  // Subtask 5.3: Root log eksik
  it('should throw HarParseError when root log property is missing', () => {
    expect(() => validateHarSchema({})).toThrow(HarParseError);
    try {
      validateHarSchema({});
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain("Missing 'log' property");
      expect(error.type).toBe('HAR_PARSE_ERROR');
      expect(error.suggestedAction).toBeTruthy();
    }
  });

  it('should throw HarParseError when log is null', () => {
    expect(() => validateHarSchema({ log: null })).toThrow(HarParseError);
  });

  // Subtask 5.4: log.entries eksik veya array değil
  it('should throw HarParseError when log.entries is missing', () => {
    expect(() => validateHarSchema({ log: { version: '1.2' } })).toThrow(HarParseError);
    try {
      validateHarSchema({ log: { version: '1.2' } });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('log.entries');
    }
  });

  it('should throw HarParseError when log.entries is not an array', () => {
    expect(() => validateHarSchema({ log: { version: '1.2', entries: 'not-array' } })).toThrow(
      HarParseError,
    );
  });

  // Subtask 5.5: Entry'de request eksik
  it('should throw HarParseError when entry is missing request, citing entry index', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    delete entries[0]!['request'];

    try {
      validateHarSchema(har);
    } catch (e) {
      const error = e as HarParseError;
      expect(error).toBeInstanceOf(HarParseError);
      expect(error.rootCause).toContain('request');
      expect(error.rootCause).toContain('index 0');
    }
  });

  // Subtask 5.6: Entry'de response eksik
  it('should throw HarParseError when entry is missing response', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    delete entries[0]!['response'];

    expect(() => validateHarSchema(har)).toThrow(HarParseError);
    try {
      validateHarSchema(har);
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('response');
      expect(error.rootCause).toContain('index 0');
    }
  });

  // Subtask 5.7: Entry'de request.url eksik
  it('should throw HarParseError when entry request.url is missing', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    const request = entries[0]!['request'] as Record<string, unknown>;
    delete request['url'];

    expect(() => validateHarSchema(har)).toThrow(HarParseError);
    try {
      validateHarSchema(har);
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('request.url');
      expect(error.rootCause).toContain('index 0');
    }
  });

  it('should throw HarParseError when entry request.method is missing', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    const request = entries[0]!['request'] as Record<string, unknown>;
    delete request['method'];

    expect(() => validateHarSchema(har)).toThrow(HarParseError);
  });

  it('should throw HarParseError when response.status is missing', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    const response = entries[0]!['response'] as Record<string, unknown>;
    delete response['status'];

    expect(() => validateHarSchema(har)).toThrow(HarParseError);
  });

  it('should throw HarParseError when response.content is missing', () => {
    const har = createValidHarRoot();
    const entries = (har['log'] as Record<string, unknown>)['entries'] as Record<string, unknown>[];
    const response = entries[0]!['response'] as Record<string, unknown>;
    delete response['content'];

    expect(() => validateHarSchema(har)).toThrow(HarParseError);
  });

  // Subtask 5.8: Non-object inputs
  it('should throw HarParseError for null input', () => {
    expect(() => validateHarSchema(null)).toThrow(HarParseError);
  });

  it('should throw HarParseError for undefined input', () => {
    expect(() => validateHarSchema(undefined)).toThrow(HarParseError);
  });

  it('should throw HarParseError for number input', () => {
    expect(() => validateHarSchema(42)).toThrow(HarParseError);
  });

  it('should throw HarParseError for string input', () => {
    expect(() => validateHarSchema('not-an-object')).toThrow(HarParseError);
  });

  it('should throw HarParseError for boolean input', () => {
    expect(() => validateHarSchema(true)).toThrow(HarParseError);
  });

  // Error should be instanceof HarMockError
  it('should throw errors that are instances of HarMockError', () => {
    try {
      validateHarSchema(null);
    } catch (e) {
      expect(e).toBeInstanceOf(HarMockError);
      expect(e).toBeInstanceOf(HarParseError);
    }
  });

  it('should throw HarParseError when log.version is missing', () => {
    expect(() => validateHarSchema({ log: { entries: [] } })).toThrow(HarParseError);
  });

  it('should throw HarParseError when log.version is not a string', () => {
    expect(() => validateHarSchema({ log: { version: 12, entries: [] } })).toThrow(HarParseError);
  });

  // Creator validation (M3)
  it('should throw HarParseError when log.creator is missing', () => {
    expect(() => validateHarSchema({ log: { version: '1.2', entries: [] } })).toThrow(
      HarParseError,
    );
    try {
      validateHarSchema({ log: { version: '1.2', entries: [] } });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('log.creator');
    }
  });

  it('should throw HarParseError when log.creator is null', () => {
    expect(() =>
      validateHarSchema({
        log: { version: '1.2', creator: null, entries: [] },
      }),
    ).toThrow(HarParseError);
  });

  it('should not throw when log.creator is a valid object', () => {
    expect(() =>
      validateHarSchema({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          entries: [],
        },
      }),
    ).not.toThrow();
  });

  // H1-R2: creator.name and creator.version string validation
  it('should throw HarParseError when log.creator.name is missing', () => {
    expect(() =>
      validateHarSchema({
        log: { version: '1.2', creator: { version: '1.0' }, entries: [] },
      }),
    ).toThrow(HarParseError);
    try {
      validateHarSchema({ log: { version: '1.2', creator: { version: '1.0' }, entries: [] } });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('log.creator.name');
    }
  });

  it('should throw HarParseError when log.creator.version is missing', () => {
    expect(() =>
      validateHarSchema({
        log: { version: '1.2', creator: { name: 'test' }, entries: [] },
      }),
    ).toThrow(HarParseError);
    try {
      validateHarSchema({ log: { version: '1.2', creator: { name: 'test' }, entries: [] } });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('log.creator.version');
    }
  });

  it('should throw HarParseError when log.creator.name is not a string', () => {
    expect(() =>
      validateHarSchema({
        log: { version: '1.2', creator: { name: 42, version: '1.0' }, entries: [] },
      }),
    ).toThrow(HarParseError);
  });

  it('should throw HarParseError when log.creator is empty object (no name/version)', () => {
    expect(() => validateHarSchema({ log: { version: '1.2', creator: {}, entries: [] } })).toThrow(
      HarParseError,
    );
  });

  // L3-R3: undefined entry test case
  it('should throw HarParseError when entries array contains an undefined entry', () => {
    expect(() =>
      validateHarSchema({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          entries: [undefined],
        },
      }),
    ).toThrow(HarParseError);
    try {
      validateHarSchema({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          entries: [undefined],
        },
      });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('index 0');
    }
  });

  // L1-R2: null entry test case
  it('should throw HarParseError when entries array contains a null entry', () => {
    expect(() =>
      validateHarSchema({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          entries: [null],
        },
      }),
    ).toThrow(HarParseError);
    try {
      validateHarSchema({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          entries: [null],
        },
      });
    } catch (e) {
      const error = e as HarParseError;
      expect(error.rootCause).toContain('index 0');
    }
  });
});
