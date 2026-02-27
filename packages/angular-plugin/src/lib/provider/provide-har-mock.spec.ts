import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { isDevMode, ApplicationInitStatus } from '@angular/core';
import { provideHarMock } from './provide-har-mock';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';
import type { MockRule } from '@har-mock/core';

// provideHarMock() APP_INITIALIZER aracılığıyla HarLoaderService.load() tetikleyebilir.
// @har-mock/core ve HTTP backend mock'lanarak async HAR loading sızıntısı önlenir.
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(() => ({ entries: [] })),
  parameterize: jest.fn(() => []),
  resolve: jest.fn(),
  HarParseError: class extends Error {},
}));

// @angular/core'dan isDevMode mock'u — double-lock testleri için
jest.mock('@angular/core', () => {
  const original = jest.requireActual('@angular/core');
  return {
    ...original,
    isDevMode: jest.fn(() => true),
  };
});

const mockIsDevMode = isDevMode as jest.Mock;

describe('provideHarMock', () => {
  afterEach(() => {
    mockIsDevMode.mockReturnValue(true);
    // Bekleyen HAR yükleme isteklerini flush et, ardından beklenmeyen request yoksa doğrula
    try {
      const ctrl = TestBed.inject(HttpTestingController);
      ctrl.match(() => true).forEach((req) => req.flush('{}'));
      ctrl.verify();
    } catch {
      // HttpTestingController mevcut değilse (ör. provideHarMock() döndürdüğü değeri kontrol eden test) geç
    }
    TestBed.resetTestingModule();
  });

  it('should return EnvironmentProviders (not null/undefined)', () => {
    const result = provideHarMock();
    expect(result).toBeDefined();
  });

  it('should apply zero-config defaults when called with no arguments (AC2)', () => {
    TestBed.configureTestingModule({ teardown: { destroyAfterEach: true }, providers: [provideHarMock(), provideHttpClientTesting()] });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/har-mock.har');
    expect(config.mode).toBe('last-match');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(false);
    expect(config.preserveGuards).toEqual([]);
    expect(config.rules).toEqual([]);
  });

  it('should use all provided config values (AC3)', () => {
    const rule: MockRule = {
      id: 'test-rule-1',
      urlPattern: '/api/*',
      method: 'GET',
      statusCode: 200,
      responseBody: '{}',
      responseHeaders: [],
      delay: 0,
      enabled: true,
    };
    const mockGuard = jest.fn(() => true);
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        provideHarMock({
          harUrl: '/assets/custom.har',
          mode: 'sequential',
          enabled: true,
          bypassGuards: true,
          preserveGuards: [mockGuard],
          rules: [rule],
        }),
        provideHttpClientTesting(),
      ],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/custom.har');
    expect(config.mode).toBe('sequential');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(true);
    expect(config.preserveGuards).toEqual([mockGuard]);
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]).toEqual(rule);
  });

  it('preserveGuards verilmediğinde default [] olmalı', () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ bypassGuards: true }), provideHttpClientTesting()],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.preserveGuards).toEqual([]);
  });

  it('preserveGuards custom değeri doğru geçirilmeli', () => {
    const guardA = jest.fn(() => true);
    const guardB = jest.fn(() => true);
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        provideHarMock({ bypassGuards: true, preserveGuards: [guardA, guardB] }),
        provideHttpClientTesting(),
      ],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.preserveGuards).toEqual([guardA, guardB]);
  });

  it('should merge partial config with defaults (AC2+AC3)', () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ harUrl: '/custom.har' }), provideHttpClientTesting()],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/custom.har');
    expect(config.mode).toBe('last-match'); // default
    expect(config.enabled).toBe(true); // default
    expect(config.bypassGuards).toBe(false); // default
    expect(config.rules).toEqual([]); // default
  });

  it('should preserve enabled=false without falling back to default (boolean edge case)', () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ enabled: false }), provideHttpClientTesting()],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.enabled).toBe(false);
    // other fields should still be defaults
    expect(config.harUrl).toBe('/assets/har-mock.har');
    expect(config.mode).toBe('last-match');
    expect(config.bypassGuards).toBe(false);
    expect(config.rules).toEqual([]);
  });

  it('should preserve bypassGuards=true without affecting other defaults', () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ bypassGuards: true }), provideHttpClientTesting()],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.bypassGuards).toBe(true);
    // other fields should still be defaults
    expect(config.harUrl).toBe('/assets/har-mock.har');
    expect(config.mode).toBe('last-match');
    expect(config.enabled).toBe(true);
    expect(config.rules).toEqual([]);
  });

  // ─── Double-Lock Guard testleri ────────────────────────────────

  it('isDevMode()=false olduğunda APP_INITIALIZER HAR fetch yapmamalı (AC1)', async () => {
    mockIsDevMode.mockReturnValue(false);
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ enabled: true }), provideHttpClientTesting()],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    const controller = TestBed.inject(HttpTestingController);
    controller.expectNone('/assets/har-mock.har');
    controller.verify();
  });

  it('enabled=false olduğunda APP_INITIALIZER HAR fetch yapmamalı (AC2)', async () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ enabled: false }), provideHttpClientTesting()],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    const controller = TestBed.inject(HttpTestingController);
    controller.expectNone('/assets/har-mock.har');
    controller.verify();
  });

  it('isDevMode()=false && enabled=false olduğunda APP_INITIALIZER HAR fetch yapmamalı (guard kombinasyonu)', async () => {
    mockIsDevMode.mockReturnValue(false);
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ enabled: false }), provideHttpClientTesting()],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    const controller = TestBed.inject(HttpTestingController);
    controller.expectNone('/assets/har-mock.har');
    controller.verify();
  });

  it('isDevMode()=true && enabled=true olduğunda APP_INITIALIZER HAR fetch yapmalı (AC3)', async () => {
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [provideHarMock({ enabled: true }), provideHttpClientTesting()],
    });

    const controller = TestBed.inject(HttpTestingController);
    const donePromise = TestBed.inject(ApplicationInitStatus).donePromise;

    // APP_INITIALIZER HTTP request'i TestBed başlatıldığında synchronous olarak sıraya girer;
    // bu nedenle await donePromise'den önce expectOne güvenle çağrılabilir
    const req = controller.expectOne('/assets/har-mock.har');
    req.flush('{}');

    await donePromise;
    controller.verify();
  });
});
