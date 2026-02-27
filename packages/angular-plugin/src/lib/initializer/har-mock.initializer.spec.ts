// Subtask 2.1: jest.mock hoisting — dosyanın EN ÜSTÜNDE (import'lardan önce)
jest.mock('@angular/core', () => {
  const original = jest.requireActual('@angular/core');
  return {
    ...original,
    isDevMode: jest.fn(() => true), // default: dev mode aktif
  };
});

import { TestBed } from '@angular/core/testing';
import { Router, RouteConfigLoadEnd, type Route } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { isDevMode } from '@angular/core';
import { harMockGuardBypassFactory } from './har-mock.initializer';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

const mockIsDevMode = isDevMode as jest.Mock;

const DEFAULT_CONFIG = {
  harUrl: '/assets/test.har',
  mode: 'last-match' as const,
  enabled: true,
  bypassGuards: true,
  preserveGuards: [] as Array<Function>,
  rules: [],
};

describe('harMockGuardBypassFactory', () => {
  // Subtask 2.1: afterEach isDevMode reset — state sızıntısını önle
  afterEach(() => {
    mockIsDevMode.mockReturnValue(true);
    TestBed.resetTestingModule();
  });

  // Subtask 2.2: Test AC1
  it('AC1: bypassGuards=true, enabled=true, isDevMode=true → canActivate/canDeactivate/canMatch temizlenmeli', () => {
    const mockAuthGuard = jest.fn(() => true);
    const mockUnsavedGuard = jest.fn(() => true);
    const routes: Route[] = [
      {
        path: 'admin',
        canActivate: [mockAuthGuard],
        canDeactivate: [mockUnsavedGuard],
        canMatch: [mockAuthGuard],
      },
    ];

    // Subtask 2.8: teardown: { destroyAfterEach: true }
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const route = routes[0]!;
    expect(route.canActivate).toEqual([]);
    expect(route.canDeactivate).toEqual([]);
    expect(route.canMatch).toEqual([]);
  });

  // Subtask 2.3: Test AC3 — recursive children traversal
  it('AC3 (eager): nested children içindeki guard\'lar → recursive traversal tüm seviyelerdeki guard\'ları temizlemeli', () => {
    const mockAuthGuard = jest.fn(() => true);
    const mockAdminGuard = jest.fn(() => true);
    const routes: Route[] = [
      {
        path: 'admin',
        canActivate: [mockAuthGuard],
        children: [
          {
            path: 'users',
            canActivate: [mockAdminGuard],
            canMatch: [mockAdminGuard],
          },
        ],
      },
    ];

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const adminRoute = routes[0]!;
    const usersRoute = adminRoute.children![0]!;
    expect(adminRoute.canActivate).toEqual([]);
    expect(usersRoute.canActivate).toEqual([]);
    expect(usersRoute.canMatch).toEqual([]);
  });

  // L2: 3-seviye derin nested route — recursive traversal edge case
  it('AC3 (3-level deep): üç seviye iç içe children\'daki guard\'lar → tüm seviyelerde temizlenmeli', () => {
    const mockGuard = jest.fn(() => true);
    const routes: Route[] = [
      {
        path: 'app',
        canActivate: [mockGuard],
        children: [
          {
            path: 'admin',
            canActivate: [mockGuard],
            children: [
              {
                path: 'settings',
                canActivate: [mockGuard],
                canMatch: [mockGuard],
              },
            ],
          },
        ],
      },
    ];

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const appRoute = routes[0]!;
    const adminRoute = appRoute.children![0]!;
    const settingsRoute = adminRoute.children![0]!;
    expect(appRoute.canActivate).toEqual([]);
    expect(adminRoute.canActivate).toEqual([]);
    expect(settingsRoute.canActivate).toEqual([]);
    expect(settingsRoute.canMatch).toEqual([]);
  });

  // Subtask 2.4: Test AC4a
  it('AC4a: bypassGuards=false → router.config değişmemeli', () => {
    const authGuard = jest.fn(() => true);
    const routes: Route[] = [{ path: 'admin', canActivate: [authGuard] }];

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG, bypassGuards: false } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    expect(routes[0]!.canActivate).toEqual([authGuard]);
  });

  // Subtask 2.5: Test AC4b
  it('AC4b: isDevMode()=false → router.config değişmemeli', () => {
    mockIsDevMode.mockReturnValue(false);
    const authGuard = jest.fn(() => true);
    const routes: Route[] = [{ path: 'admin', canActivate: [authGuard] }];

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    expect(routes[0]!.canActivate).toEqual([authGuard]);
  });

  // Subtask 2.6: Test AC4c
  it('AC4c: enabled=false → router.config değişmemeli', () => {
    const authGuard = jest.fn(() => true);
    const routes: Route[] = [{ path: 'admin', canActivate: [authGuard] }];

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG, enabled: false } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    expect(routes[0]!.canActivate).toEqual([authGuard]);
  });

  // Subtask 2.7: Test AC5
  it('AC5: Router erişimde exception → console.warn çağrılmalı, hata fırlatılmamalı', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const throwingRouter = {
      get config(): Route[] {
        throw new Error('Router error');
      },
      events: EMPTY,
    };

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: throwingRouter },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    expect(() => factory()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith('[HarMock] Guard bypass failed:', expect.any(Error));

    warnSpy.mockRestore();
  });

  // Subtask 2.3 (lazy): RouteConfigLoadEnd — lazy-loaded route guard temizleme
  it('AC3 (lazy): RouteConfigLoadEnd event → yeni lazy-loaded route\'ların guard\'larını temizlemeli', () => {
    const subject = new Subject<any>();
    const mockGuard = jest.fn(() => true);
    const lazyRoute: Route = { path: 'lazy', canActivate: [mockGuard], canDeactivate: [mockGuard], canMatch: [mockGuard] };
    let currentRoutes: Route[] = []; // başlangıçta boş (lazy yüklenmeden önce)

    const mockRouter = {
      get config() {
        return currentRoutes;
      },
      events: subject.asObservable(),
    };

    // Subtask 2.8
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG } },
        { provide: Router, useValue: mockRouter },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory(); // Boş config temizlenir; RouteConfigLoadEnd subscription kurulur

    // Lazy module yüklendi: route config güncellendi (yeni guard'lı route eklendi)
    currentRoutes = [lazyRoute];

    // RouteConfigLoadEnd event'ini emit et
    subject.next(new RouteConfigLoadEnd({} as Route));

    // Lazy route'un tüm guard array'leri temizlenmiş olmalı
    expect(lazyRoute.canActivate).toEqual([]);
    expect(lazyRoute.canDeactivate).toEqual([]);
    expect(lazyRoute.canMatch).toEqual([]);
  });

  // Story 5.5 — AC1: Tek guard korunmalı, diğerleri temizlenmeli
  it('5.5 AC1: preserveGuards=[mockBssGuard] → mockBssGuard korunmalı, mockAuthGuard temizlenmeli (recursive)', () => {
    const mockAuthGuard = jest.fn(() => true);
    const mockBssGuard = jest.fn(() => true);
    const routes: Route[] = [
      {
        path: 'admin',
        canActivate: [mockAuthGuard, mockBssGuard],
        canDeactivate: [mockAuthGuard],
        children: [
          {
            path: 'users',
            canActivate: [mockAuthGuard, mockBssGuard],
            canMatch: [mockAuthGuard],
          },
        ],
      },
    ];

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG, preserveGuards: [mockBssGuard] } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const adminRoute = routes[0]!;
    expect(adminRoute.canActivate).toEqual([mockBssGuard]);   // bss kaldı
    expect(adminRoute.canDeactivate).toEqual([]);             // auth temizlendi
    const usersRoute = adminRoute.children![0]!;
    expect(usersRoute.canActivate).toEqual([mockBssGuard]);   // recursive — bss kaldı
    expect(usersRoute.canMatch).toEqual([]);                  // auth temizlendi
  });

  // Story 5.5 — AC2: Birden fazla guard korunmalı
  it('5.5 AC2: preserveGuards=[GuardA, GuardB] → ikisi de korunmalı, listede olmayan temizlenmeli', () => {
    const mockAuthGuard = jest.fn(() => true);
    const mockAdminGuard = jest.fn(() => true);
    const mockUnsavedGuard = jest.fn(() => true);
    const routes: Route[] = [
      {
        path: 'admin',
        canActivate: [mockAuthGuard, mockAdminGuard, mockUnsavedGuard],
        canDeactivate: [mockUnsavedGuard],
        canMatch: [mockAuthGuard],
      },
    ];

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        {
          provide: HAR_MOCK_CONFIG,
          useValue: { ...DEFAULT_CONFIG, preserveGuards: [mockAuthGuard, mockAdminGuard] },
        },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const route = routes[0]!;
    expect(route.canActivate).toEqual([mockAuthGuard, mockAdminGuard]); // ikisi kaldı
    expect(route.canDeactivate).toEqual([]);                            // unsaved temizlendi
    expect(route.canMatch).toEqual([mockAuthGuard]);                    // auth kaldı
  });

  // Story 5.5 — AC4: Functional guard referansı ile çalışmalı
  it('5.5 AC4: functional guard — aynı referans preserveGuards\'ta → korunmalı; farklı referans → temizlenmeli', () => {
    const preservedGuardFn = jest.fn(() => true);      // preserve listesine girecek fn
    const differentRefGuardFn = jest.fn(() => true);   // preserve listesinde olmayan fn (farklı referans)
    const routes: Route[] = [
      {
        path: 'profile',
        canActivate: [preservedGuardFn, differentRefGuardFn],
        canMatch: [differentRefGuardFn],
      },
    ];

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG, preserveGuards: [preservedGuardFn] } },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    const route = routes[0]!;
    expect(route.canActivate).toEqual([preservedGuardFn]); // aynı referans → kaldı
    expect(route.canMatch).toEqual([]);                    // farklı referans → temizlendi
  });

  // Story 5.5 — H3/L1: preserveGuards undefined olduğunda ?? [] fallback çalışmalı (branch coverage)
  it('5.5 H3: preserveGuards config\'da tanımsızsa ?? [] fallback → tüm guard\'lar temizlenmeli', () => {
    const mockAuthGuard = jest.fn(() => true);
    const routes: Route[] = [
      { path: 'admin', canActivate: [mockAuthGuard], canDeactivate: [mockAuthGuard] },
    ];

    // preserveGuards kasıtlı olarak config'a dahil edilmiyor — ?? [] branch'ini tetikler
    const configWithoutPreserveGuards = {
      harUrl: '/assets/test.har',
      mode: 'last-match' as const,
      enabled: true,
      bypassGuards: true,
      rules: [],
    };

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: configWithoutPreserveGuards },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    expect(routes[0]!.canActivate).toEqual([]);   // ?? [] → tümü temizlendi
    expect(routes[0]!.canDeactivate).toEqual([]); // ?? [] → tümü temizlendi
  });

  // Story 5.5 — AC5: Lazy route'da preserveGuards uygulanmalı
  it('5.5 AC5: RouteConfigLoadEnd sonrası lazy route\'da preserveGuards uygulanmalı', () => {
    const subject = new Subject<any>();
    const mockBssGuard = jest.fn(() => true);
    const mockAuthGuard = jest.fn(() => true);
    const lazyRoute: Route = {
      path: 'lazy',
      canActivate: [mockAuthGuard, mockBssGuard],
      canDeactivate: [mockAuthGuard],
      canMatch: [mockBssGuard],
    };
    let currentRoutes: Route[] = [];

    const mockRouter = {
      get config() { return currentRoutes; },
      events: subject.asObservable(),
    };

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: HAR_MOCK_CONFIG, useValue: { ...DEFAULT_CONFIG, preserveGuards: [mockBssGuard] } },
        { provide: Router, useValue: mockRouter },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    currentRoutes = [lazyRoute];
    subject.next(new RouteConfigLoadEnd({} as Route));

    expect(lazyRoute.canActivate).toEqual([mockBssGuard]); // bss kaldı
    expect(lazyRoute.canDeactivate).toEqual([]);           // auth temizlendi
    expect(lazyRoute.canMatch).toEqual([mockBssGuard]);    // bss kaldı
  });

  // Story 5.5 — AC6: bypassGuards=false → preserveGuards görmezden gelinmeli
  it('5.5 AC6: bypassGuards=false → preserveGuards dolu olsa dahi guard\'lara dokunulmamalı', () => {
    const mockBssGuard = jest.fn(() => true);
    const mockAuthGuard = jest.fn(() => true);
    const routes: Route[] = [
      { path: 'admin', canActivate: [mockAuthGuard, mockBssGuard] },
    ];

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        {
          provide: HAR_MOCK_CONFIG,
          useValue: { ...DEFAULT_CONFIG, bypassGuards: false, preserveGuards: [mockBssGuard] },
        },
        { provide: Router, useValue: { config: routes, events: EMPTY } },
      ],
    });

    const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
    factory();

    expect(routes[0]!.canActivate).toEqual([mockAuthGuard, mockBssGuard]); // hiçbiri değişmedi
  });
});
