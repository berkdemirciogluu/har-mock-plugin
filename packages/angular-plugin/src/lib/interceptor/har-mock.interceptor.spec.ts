import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { isDevMode } from '@angular/core';
import { harMockInterceptor, HarLoaderService } from './har-mock.interceptor';
import { HAR_MOCK_CONFIG } from '../types';
import type { HarEntry, UrlPattern, MockRule } from '@har-mock/core';

// @har-mock/core mock'lama — unit isolation
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  resolve: jest.fn(),
  HarParseError: class HarParseError extends Error {
    constructor(rootCause: string, suggestedAction: string) {
      super(`[HAR_PARSE_ERROR] ${rootCause}`);
      this.name = 'HarParseError';
      void suggestedAction;
    }
  },
}));

const { parseHar, parameterize, resolve } = jest.requireMock('@har-mock/core') as {
  parseHar: jest.Mock;
  parameterize: jest.Mock;
  resolve: jest.Mock;
};

// @angular/core'dan isDevMode mock'u
jest.mock('@angular/core', () => {
  const original = jest.requireActual('@angular/core');
  return {
    ...original,
    isDevMode: jest.fn(() => true),
  };
});

const mockIsDevMode = isDevMode as jest.Mock;

const DEFAULT_CONFIG: {
  harUrl: string;
  mode: 'last-match' | 'sequential';
  enabled: boolean;
  bypassGuards: boolean;
  rules: MockRule[];
} = {
  harUrl: '/assets/test.har',
  mode: 'last-match',
  enabled: true,
  bypassGuards: false,
  rules: [],
};

const SAMPLE_ENTRY: HarEntry = {
  url: 'https://api.example.com/users',
  method: 'GET',
  status: 200,
  statusText: 'OK',
  responseBody: '{"id":1}',
  responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
  requestHeaders: [],
  timings: { blocked: -1, dns: -1, connect: -1, send: 0, wait: 100, receive: 10, ssl: -1 },
};

const SAMPLE_PATTERN: UrlPattern = {
  original: 'https://api.example.com/users',
  template: '/users',
  segments: [{ kind: 'static', value: 'users' }],
  method: 'GET',
};

function setupTestBed(configOverrides: Partial<typeof DEFAULT_CONFIG> = {}) {
  TestBed.configureTestingModule({
    teardown: { destroyAfterEach: true },
    providers: [
      provideHttpClient(withInterceptors([harMockInterceptor])),
      provideHttpClientTesting(),
      HarLoaderService,
      {
        provide: HAR_MOCK_CONFIG,
        useValue: { ...DEFAULT_CONFIG, ...configOverrides },
      },
    ],
  });
}

// ─── HarLoaderService testleri ─────────────────────────────────

describe('HarLoaderService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('HAR dosyasını başarıyla fetch edip parse etmeli (AC1)', async () => {
    setupTestBed();
    const harContent = JSON.stringify({ log: { entries: [] } });
    parseHar.mockReturnValue({ entries: [SAMPLE_ENTRY] });
    parameterize.mockReturnValue([SAMPLE_PATTERN]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush(harContent);
    await loadPromise;

    expect(parseHar).toHaveBeenCalledWith(harContent);
    expect(parameterize).toHaveBeenCalled();
    expect(loader.getEntries()).toEqual([SAMPLE_ENTRY]);
    expect(loader.getUrlPatterns()).toEqual([SAMPLE_PATTERN]);

    controller.verify();
  });

  it('HAR boş entries ile yüklenmeli', async () => {
    setupTestBed();
    const harContent = JSON.stringify({ log: { entries: [] } });
    parseHar.mockReturnValue({ entries: [] });
    parameterize.mockReturnValue([]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush(harContent);
    await loadPromise;

    expect(loader.getEntries()).toEqual([]);
    expect(loader.getUrlPatterns()).toEqual([]);

    controller.verify();
  });

  it('404 hatasında uygulama crash etmemeli, entries [] olmalı (AC4)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupTestBed();

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    await loadPromise;

    expect(loader.getEntries()).toEqual([]);
    expect(loader.getUrlPatterns()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    controller.verify();
  });

  it('parse hatasında graceful degradation — entries [] olmalı (AC4)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupTestBed();
    parseHar.mockImplementation(() => {
      throw new Error('Invalid HAR format');
    });

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush('invalid json content');
    await loadPromise;

    expect(loader.getEntries()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    controller.verify();
  });

  it('idempotent load — tekrar çağrıda aynı Promise döndürmeli (AC1)', async () => {
    setupTestBed();
    parseHar.mockReturnValue({ entries: [] });
    parameterize.mockReturnValue([]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const promise1 = loader.load();
    const promise2 = loader.load();
    expect(promise1).toBe(promise2); // aynı referans

    const req = controller.expectOne('/assets/test.har');
    req.flush('{}');
    await promise1;

    controller.verify();
  });

  it('yüklenmeden önce getEntries() null döndürmeli', () => {
    setupTestBed();
    const loader = TestBed.inject(HarLoaderService);
    expect(loader.getEntries()).toBeNull();
    expect(loader.getUrlPatterns()).toBeNull();
  });

  it('farklı harUrl ile fetch yapılmalı (AC3)', async () => {
    setupTestBed({ harUrl: '/assets/custom.har' });
    parseHar.mockReturnValue({ entries: [] });
    parameterize.mockReturnValue([]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/custom.har');
    req.flush('{}');
    await loadPromise;

    controller.verify();
  });
});

// ─── harMockInterceptor testleri ───────────────────────────────

describe('harMockInterceptor', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockIsDevMode.mockReturnValue(true);
    TestBed.resetTestingModule();
  });

  async function loadHar(
    entries: HarEntry[] = [SAMPLE_ENTRY],
    patterns: UrlPattern[] = [SAMPLE_PATTERN],
  ) {
    parseHar.mockReturnValue({ entries });
    parameterize.mockReturnValue(patterns);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush(JSON.stringify({ log: { entries: [] } }));
    await loadPromise;

    return { loader, controller };
  }

  it('HAR eşleşmesi varsa mock HttpResponse döndürmeli (AC2)', async () => {
    setupTestBed();

    resolve.mockReturnValue({
      source: 'har',
      response: {
        statusCode: 200,
        body: '{"id":1}',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        delay: 0,
      },
    });

    const { controller } = await loadHar();

    const http = TestBed.inject(HttpClient);
    let response: unknown;
    http.get('https://api.example.com/users').subscribe((r) => (response = r));

    controller.expectNone('https://api.example.com/users');
    expect(response).toEqual({ id: 1 });

    controller.verify();
  });

  it('eşleşme yoksa (null) orijinal request geçmeli — passthrough (AC2)', async () => {
    setupTestBed();
    resolve.mockReturnValue(null);

    const { controller } = await loadHar();

    const http = TestBed.inject(HttpClient);
    http.get('https://api.example.com/unknown').subscribe();

    const req = controller.expectOne('https://api.example.com/unknown');
    req.flush({});

    controller.verify();
  });

  it('enabled=false ise tüm requestler passthrough geçmeli (AC2)', async () => {
    setupTestBed({ enabled: false });
    parseHar.mockReturnValue({ entries: [] });
    parameterize.mockReturnValue([]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush('{}');
    await loadPromise;

    const http = TestBed.inject(HttpClient);
    http.get('https://api.example.com/users').subscribe();

    const apiReq = controller.expectOne('https://api.example.com/users');
    apiReq.flush({});

    expect(resolve).not.toHaveBeenCalled();
    controller.verify();
  });

  it('isDevMode()=false ise tüm requestler passthrough geçmeli (AC2)', async () => {
    mockIsDevMode.mockReturnValue(false);
    setupTestBed();
    parseHar.mockReturnValue({ entries: [] });
    parameterize.mockReturnValue([]);

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush('{}');
    await loadPromise;

    const http = TestBed.inject(HttpClient);
    http.get('https://api.example.com/users').subscribe();

    const apiReq = controller.expectOne('https://api.example.com/users');
    apiReq.flush({});

    expect(resolve).not.toHaveBeenCalled();
    controller.verify();
  });

  it('HAR henüz yüklenmemişse (null entries) passthrough geçmeli (AC2)', () => {
    setupTestBed();

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    // load() çağrılmadan interceptor'ı test et — entries null olduğundan passthrough
    http.get('https://api.example.com/users').subscribe();

    // resolve çağrılmamalı (entries null guard devreye girmeli)
    expect(resolve).not.toHaveBeenCalled();

    // API isteği passthrough olarak geçmeli
    const apiReq = controller.expectOne('https://api.example.com/users');
    apiReq.flush({});

    controller.verify();
  });

  it('Rule eşleşmesi varsa mock response döndürmeli (AC2)', async () => {
    setupTestBed({
      rules: [
        {
          id: 'rule-1',
          urlPattern: '/api/users',
          method: 'GET',
          statusCode: 201,
          responseBody: '{"created":true}',
          responseHeaders: [],
          delay: 0,
          enabled: true,
        },
      ],
    });

    resolve.mockReturnValue({
      source: 'rule',
      response: {
        statusCode: 201,
        body: '{"created":true}',
        headers: [],
        delay: 0,
      },
    });

    const { controller } = await loadHar();

    const http = TestBed.inject(HttpClient);
    let response: unknown;
    http.get('https://api.example.com/api/users').subscribe((r) => (response = r));

    controller.expectNone('https://api.example.com/api/users');
    expect(response).toEqual({ created: true });

    controller.verify();
  });

  it('response body boş string ise null body ile HttpResponse döndürmeli', async () => {
    setupTestBed();

    resolve.mockReturnValue({
      source: 'har',
      response: {
        statusCode: 204,
        body: '',
        headers: [],
        delay: 0,
      },
    });

    const { controller } = await loadHar();

    const http = TestBed.inject(HttpClient);
    let response: unknown = 'not-set';
    http.get('https://api.example.com/users').subscribe((r) => (response = r));

    controller.expectNone('https://api.example.com/users');
    expect(response).toBeNull();

    controller.verify();
  });
});
