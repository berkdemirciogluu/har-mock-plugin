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
});
