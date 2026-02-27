# Story 5.2: Asset-Based HAR Yükleme & HttpClient Interceptor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Angular developer,
I want Angular Plugin'in `assets/har-mock.har` dosyasını HTTP fetch ile lazy load edip `HttpClient` interceptor'da HAR response'larını döndermesini,
So that `app.config.ts`'e `provideHarMock()` ekledikten sonra `assets/har-mock.har` dosyasını değiştirip uygulamayı başlattığımda tüm API'lar otomatik mock'lansın.

## Acceptance Criteria

1. **Given** `assets/har-mock.har` dosyası mevcut ve `provideHarMock()` yapılandırılmış **When** Angular uygulaması ilk açıldığında **Then** plugin `HttpBackend` (interceptor bypass) ile `harUrl` adresinden HAR dosyasını fetch etmeli; `parseHar()` ile parse edilmeli; `parameterize()` ile URL pattern'ları oluşturulmalı; hepsi in-memory'e yüklenmeli (FR35)

2. **Given** HAR başarıyla yüklenmiş **When** Angular uygulaması herhangi bir `HttpClient` isteği yaptığında **Then** `har-mock.interceptor.ts` (`HttpInterceptorFn`) isteği yakalamalı; `resolve()` ile rule/HAR/passthrough kararı verilmeli; eşleşme varsa `HttpResponse` olarak döndürülmeli; eşleşme yoksa orijinal request geçmeli (FR32)

3. **Given** farklı environment'larda farklı HAR dosyası kullanılmak istenildiğinde **When** `provideHarMock({ harUrl: environment.harUrl })` yapılandırıldığında **Then** belirtilen URL'den HAR fetch edilmeli; farklı environment'lar farklı HAR dosyalarıyla çalışabilmeli (FR36)

4. **Given** `assets/har-mock.har` bulunamadığında (404) **When** fetch hatası oluştuğunda **Then** `HarParseError` ile console.warn üzerinden hata loglanmalı; uygulama crash etmemeli; tüm request'ler passthrough'a düşmeli (NFR13)

## Tasks / Subtasks

- [x] Task 1: `HarLoaderService` oluştur — `interceptor/har-mock.interceptor.ts` (AC: #1, #3, #4)
  - [x] Subtask 1.1: `@Injectable()` servisi `HttpBackend` inject ederek oluştur — `new HttpClient(inject(HttpBackend))` pattern
  - [x] Subtask 1.2: `load(): Promise<void>` metodu — idempotent (tekrar çağrılabilir), bir kez fetch, sonuçta `entries` doldurulur
  - [x] Subtask 1.3: Private `fetchAndParse()` — `firstValueFrom(this.http.get(..., { responseType: 'text' }))` → `parseHar(raw)` (raw string doğrudan, parseHar içinde JSON.parse yapıyor) → `entries` ve `urlPatterns` doldurulur
  - [x] Subtask 1.4: 404 / parse hatalarını yakala — `console.warn(new HarParseError(...))`, `entries = []` (uygulama crash'i önle)
  - [x] Subtask 1.5: `getEntries()` metodu — `HarEntry[] | null` döndür (null: henüz yüklenmedi)
  - [x] Subtask 1.6: `getUrlPatterns()` metodu — `UrlPattern[] | null` döndür; `resolve()` gerçek API'sinin urlPatterns parametresi gerektirdiğinden eklendi

- [x] Task 2: `harMockInterceptor` functional interceptor — `interceptor/har-mock.interceptor.ts` (AC: #2)
  - [x] Subtask 2.1: `HttpInterceptorFn` olarak export et
  - [x] Subtask 2.2: `inject(HAR_MOCK_CONFIG)` + `inject(HarLoaderService)` ile bağımlılıkları al
  - [x] Subtask 2.3: Double-lock guard: `!isDevMode() || !config.enabled` → `return next(req)`
  - [x] Subtask 2.4: Entries null ise (yükleniyor) → `return next(req)` (passthrough)
  - [x] Subtask 2.5: `resolve({ url, method }, config.rules, entries, urlPatterns)` çağır — gerçek imzaya göre uyarlandı
  - [x] Subtask 2.6: `result === null` → `return next(req)` (passthrough)
  - [x] Subtask 2.7: Eşleşme varsa → `of(new HttpResponse({ status, body, headers }))` döndür

- [x] Task 3: `provideHarMock()` güncelle — `provider/provide-har-mock.ts` (AC: #1)
  - [x] Subtask 3.1: `HarLoaderService` provider'ı ekle
  - [x] Subtask 3.2: `APP_INITIALIZER` ile eager HAR loading — `useFactory: () => { const l = inject(HarLoaderService); return () => l.load(); }, multi: true`
  - [x] Subtask 3.3: `provideHttpClient(withInterceptors([harMockInterceptor]))` ile interceptor kayıt et
  - [x] Subtask 3.4: Import'lar: `APP_INITIALIZER`, `inject` from `@angular/core`; `provideHttpClient`, `withInterceptors` from `@angular/common/http`

- [x] Task 4: `interceptor/index.ts` güncelle — placeholder'dan gerçek export'a geç (AC: #2)
  - [x] Subtask 4.1: `export { harMockInterceptor, HarLoaderService } from './har-mock.interceptor'`

- [x] Task 5: `public-api.ts` güncelle — gerekli export'ları ekle
  - [x] Subtask 5.1: `harMockInterceptor` ve `HarLoaderService` export et (geliştiricinin özel senaryolarda kullanması için)

- [x] Task 6: Unit testler — `interceptor/har-mock.interceptor.spec.ts` (AC: #1, #2, #3, #4)
  - [x] Subtask 6.1: `HarLoaderService` testleri — başarılı HAR fetch + parse, 404 graceful handling, idempotent load
  - [x] Subtask 6.2: `harMockInterceptor` testleri — eşleşme → mock response; eşleşme yok → passthrough; `isDevMode=false` → passthrough; `enabled=false` → passthrough
  - [x] Subtask 6.3: Angular `TestBed` kurulumu: `provideHttpClient(withInterceptors([harMockInterceptor]))` + `provideHttpClientTesting()` + `HarLoaderService` + `HAR_MOCK_CONFIG`
  - [x] Subtask 6.4: `HttpTestingController` ile HTTP mock'lama (gerçek HTTP istek gitmemesi için)
  - [x] Subtask 6.5: `@har-mock/core` modüllerini jest.mock ile mock'la (unit isolation)

- [x] Task 7: Build doğrulama (AC: #1)
  - [x] Subtask 7.1: `yarn workspace har-mock-plugin build` → 0 TS hatası
  - [x] Subtask 7.2: `dist/fesm2022/har-mock-plugin.mjs` varlığını kontrol et

- [x] Task 8: Tüm testler çalıştır — 0 regresyon doğrula
  - [x] Subtask 8.1: `yarn workspace har-mock-plugin test` → 20 test geçti (coverage %100)
  - [x] Subtask 8.2: `yarn workspace @har-mock/core test` → 221 test geçti, regresyon yok
  - [x] Subtask 8.3: `yarn workspace @har-mock/extension test` → 497 test geçti, regresyon yok

## Dev Notes

### ⚠️ Kritik: Circular Interception Önleme — `HttpBackend` Kullanımı

`HarLoaderService` HAR dosyasını fetch ederken `HttpClient` kullanırsa, kendi interceptor'u bu isteği yakalayabilir (HAR henüz yüklenmediği için passthrough olur, ama bu öngörülebilir bir anti-pattern'dır). **Doğru çözüm: `HttpBackend` ile "naked" HttpClient.**

```typescript
import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

@Injectable()
export class HarLoaderService {
  // HttpBackend doğrudan inject et — tüm interceptor'ları bypass eder
  private readonly http = new HttpClient(inject(HttpBackend));
  // ...
}
```

`HttpBackend`, Angular'ın interceptor pipeline'ını tamamen atlayarak direkt HTTP isteği yapar.

### Dosya Yapısı — Oluşturulacak/Güncellenecek Dosyalar

```
packages/angular-plugin/src/
├── public-api.ts                                  ← GÜNCELLENECEK (interceptor/service export ekle)
└── lib/
    ├── interceptor/
    │   ├── har-mock.interceptor.ts                ← OLUŞTURULACAK (HarLoaderService + harMockInterceptor)
    │   ├── har-mock.interceptor.spec.ts           ← OLUŞTURULACAK
    │   └── index.ts                              ← GÜNCELLENECEK (placeholder → gerçek export)
    └── provider/
        ├── provide-har-mock.ts                   ← GÜNCELLENECEK (interceptor + APP_INITIALIZER kaydı)
        └── index.ts                              ← DOKUNMA
```

### `HarLoaderService` Tasarımı

```typescript
// packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient, HttpInterceptorFn, HttpResponse, HttpHeaders } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { parseHar, parameterize, resolve } from '@har-mock/core';
import { HarParseError } from '@har-mock/core';
import type { HarEntry } from '@har-mock/core';
import { HAR_MOCK_CONFIG } from '../types';

@Injectable()
export class HarLoaderService {
  private readonly config = inject(HAR_MOCK_CONFIG);
  private readonly http = new HttpClient(inject(HttpBackend));

  private entries: HarEntry[] | null = null;
  private loadPromise: Promise<void> | null = null;

  /** Idempotent: İlk çağrıda fetch başlar; sonraki çağrılar aynı Promise'i döndürür */
  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.fetchAndParse();
    return this.loadPromise;
  }

  getEntries(): HarEntry[] | null {
    return this.entries;
  }

  private async fetchAndParse(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http.get(this.config.harUrl, { responseType: 'text' })
      );
      const harFile = parseHar(JSON.parse(raw));
      this.entries = harFile.log.entries.map((e) => parameterize(e));
    } catch (err) {
      console.warn(new HarParseError(`HAR yüklenemedi: ${this.config.harUrl}`, err));
      this.entries = []; // Hata durumunda boş liste — uygulama crash etmez
    }
  }
}
```

**Not:** `responseType: 'text'` kullanılır çünkü `responseType: 'json'` ile Angular HAR dosyasının content-type'ına göre parse etmeye çalışır; `text` ile ham string alınıp `JSON.parse()` ile güvenle parse edilir.

### `harMockInterceptor` Tasarımı

```typescript
export const harMockInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(HAR_MOCK_CONFIG);
  const loader = inject(HarLoaderService);

  // Double-lock: production'da veya devre dışıysa her zaman passthrough
  if (!isDevMode() || !config.enabled) {
    return next(req);
  }

  const entries = loader.getEntries();

  // HAR henüz yüklenmedi — passthrough (APP_INITIALIZER sayesinde nadir durum)
  if (entries === null) {
    return next(req);
  }

  const result = resolve(req.url, req.method, config.rules, entries, config.mode);

  if (result.source === 'passthrough') {
    return next(req);
  }

  return of(
    new HttpResponse({
      status: result.response.status,
      body: result.response.body ? JSON.parse(result.response.body) : null,
      headers: new HttpHeaders(
        Object.fromEntries(result.response.headers.map((h) => [h.name, h.value]))
      ),
    })
  );
};
```

### `provideHarMock()` Güncellenmiş Tasarım

```typescript
import { makeEnvironmentProviders, EnvironmentProviders, APP_INITIALIZER, inject } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HarLoaderService } from '../interceptor/har-mock.interceptor';
import { harMockInterceptor } from '../interceptor/har-mock.interceptor';
import type { HarMockConfig } from '../types/har-mock-config.types';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

export function provideHarMock(config?: HarMockConfig): EnvironmentProviders {
  const resolved: Required<HarMockConfig> = {
    harUrl: config?.harUrl ?? '/assets/har-mock.har',
    mode: config?.mode ?? 'last-match',
    enabled: config?.enabled ?? true,
    bypassGuards: config?.bypassGuards ?? false,
    rules: config?.rules ?? [],
  };

  return makeEnvironmentProviders([
    { provide: HAR_MOCK_CONFIG, useValue: resolved },
    HarLoaderService,
    provideHttpClient(withInterceptors([harMockInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const loader = inject(HarLoaderService);
        return () => loader.load();
      },
      multi: true,
    },
    // Note: APP_INITIALIZER (guard bypass) — Story 5.4'te eklenecek
  ]);
}
```

**Not:** `provideHttpClient(withInterceptors([harMockInterceptor]))` `makeEnvironmentProviders([])` içine Angular 15+ sürümünde doğrudan eklenebilir. Angular, birden fazla `provideHttpClient()` çağrısını merge eder; kullanıcının kendi `provideHttpClient()` çağrısı varsa çakışmaz.

### @har-mock/core Fonksiyon İmzaları

```typescript
// @har-mock/core'dan kullanılacak fonksiyonlar:
import { parseHar, parameterize, resolve } from '@har-mock/core';
import { HarParseError } from '@har-mock/core';
import type { HarEntry, UrlPattern, ResolveResult } from '@har-mock/core';

// parseHar(rawJson: string): HarFile — Ham JSON STRING alır, içinde JSON.parse yapar → HarFile
//   ⚠️ parseHar(JSON.parse(raw)) YANLIŞ — double parse → SyntaxError!
//   ✅ parseHar(raw) DOĞRU — raw string direkt geçir
// parameterize(entries: readonly HarEntry[]): UrlPattern[] — Tüm entry listesi → URL pattern listesi
// resolve(request: MockRequest, rules, harEntries, urlPatterns): ResolveResult | null
//   → MockRequest: { url: string, method: string }
//   → null → passthrough (source: 'passthrough' DEĞİL, null döner)
//   → ResolveResult.source: 'rule' | 'har'
//   → ResolveResult.response: MockResponse (statusCode, body: string, headers: HarHeader[], delay)
// HarParseError(rootCause: string, suggestedAction: string) — iki string parametre alır
```

Gerçek imzaları `packages/core/src/priority-chain/index.ts` ve `packages/core/src/types/` dosyalarından doğrula. Tip uyuşmazlığı olursa kaynak kodu incele.

### Test Tasarımı

```typescript
// packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { harMockInterceptor, HarLoaderService } from './har-mock.interceptor';
import { HAR_MOCK_CONFIG } from '../types';

// @har-mock/core mock'lama
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn((e) => e),
  resolve: jest.fn(),
  HarParseError: class HarParseError extends Error {
    constructor(msg: string, cause?: unknown) { super(msg); }
  },
}));

const { parseHar, parameterize, resolve } = jest.requireMock('@har-mock/core') as {
  parseHar: jest.Mock;
  parameterize: jest.Mock;
  resolve: jest.Mock;
};

describe('harMockInterceptor + HarLoaderService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  function setupTestBed(configOverrides = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([harMockInterceptor])),
        provideHttpClientTesting(),
        HarLoaderService,
        {
          provide: HAR_MOCK_CONFIG,
          useValue: {
            harUrl: '/assets/test.har',
            mode: 'last-match',
            enabled: true,
            bypassGuards: false,
            rules: [],
            ...configOverrides,
          },
        },
      ],
    });
  }

  it('HAR dosyasını fetch edip parse etmeli (AC1)', async () => {
    setupTestBed();
    const harContent = JSON.stringify({ log: { entries: [] } });
    parseHar.mockReturnValue({ log: { entries: [] } });

    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush(harContent);
    await loadPromise;

    expect(parseHar).toHaveBeenCalledWith(JSON.parse(harContent));
    expect(loader.getEntries()).toEqual([]);
  });

  it('404 hatasında uygulama crash etmemeli, entries [] olmalı (AC4)', async () => {
    setupTestBed();
    const loader = TestBed.inject(HarLoaderService);
    const controller = TestBed.inject(HttpTestingController);

    const loadPromise = loader.load();
    const req = controller.expectOne('/assets/test.har');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    await loadPromise;

    expect(loader.getEntries()).toEqual([]);
  });

  it('eşleşen HAR entry varsa mock HttpResponse döndürmeli (AC2)', async () => {
    setupTestBed();
    // resolve mock setup ve HttpClient isteği testi
    // ...
  });

  it('enabled=false ise tüm requestler passthrough geçmeli (AC2)', () => {
    setupTestBed({ enabled: false });
    // ...
  });
});
```

**Önemli:** `provideHttpClientTesting()`, `HttpTestingController` sunar. Mock HTTP backend ile `HarLoaderService`'in fetch işlemi kontrol edilebilir. `jest.mock('@har-mock/core', ...)` ile core bağımlılıkları izole edilir.

### Angular API Notları (Angular 18)

| API | Import | Notlar |
|-----|--------|--------|
| `HttpInterceptorFn` | `@angular/common/http` | Angular 15+ functional interceptor tipi |
| `HttpBackend` | `@angular/common/http` | Interceptor bypass için |
| `HttpClient` | `@angular/common/http` | `new HttpClient(backend)` constructor ile naked client |
| `HttpResponse` | `@angular/common/http` | Mock response oluşturmak için |
| `HttpHeaders` | `@angular/common/http` | Header map'i HttpHeaders'a çevirmek için |
| `withInterceptors` | `@angular/common/http` | Functional interceptor kayıt |
| `provideHttpClient` | `@angular/common/http` | EnvironmentProviders döner |
| `APP_INITIALIZER` | `@angular/core` | Eager HAR loading |
| `inject` | `@angular/core` | Functional context'te DI |
| `isDevMode` | `@angular/core` | Production safety lock |
| `firstValueFrom` | `rxjs` | Observable → Promise dönüşümü |
| `of` | `rxjs` | Sync Observable oluşturmak için |

### Story 5.1'den Kritik Öğrenmeler

| Kural | Açıklama |
|-------|----------|
| Angular ESM + Jest transform | `jest.config.js`'de `transformIgnorePatterns: ['node_modules/(?!(@angular\|zone\\.js)/)']` gerekli — 5.1'de yapıldı, dokunma |
| `destroyAfterEach: true` | `TestBed` setup'ta her testten sonra temizle |
| `afterEach(() => TestBed.resetTestingModule())` | State sızıntısını önler |
| `jest.Mock` cast | `jest.mock` factory hoisting — import sonrası `(myFn as jest.Mock).mockReturnValue(...)` pattern |
| `tsconfig.spec.json` | `rootDir: "../.."` ile cross-package import'a izin ver — 5.1'de oluşturuldu |
| `test-setup.ts` | `zone.js` + Angular test env setup — 5.1'de oluşturuldu, `jest.config.js`'de setup'tadır |

### Git Commit Geçmişi — Öğrenmeler

Son 5 commit analizi:
- `a4579ee fix(angular-plugin): story 5-1 code review — 6 issue duzeltmesi` — phantom devDependencies, destroyAfterEach, tsconfig.spec include
- `4fe7301 feat(angular-plugin): story 5-1 — HarMockConfig types ve provideHarMock() factory function`
- `18a1db4 fix(extension): story 4-3 code review — 5 issue duzeltmesi` — Extension pattern'lar (farklı modül)

**Story 5.2 için kritik:** Angular plugin'in jest.config.js ve tsconfig.spec.json altyapısı 5.1'de kurulmuş, doğrudan kullanılabilir.

### Kapsam Sınırları — Bu Story'de DOKUNULMAYACAK

| Dosya | Neden |
|-------|-------|
| `initializer/index.ts` | Story 5.4 — guard bypass (APP_INITIALIZER Router mutation) |
| `initializer/har-mock.initializer.ts` | Story 5.4 |
| `packages/core/**` | Core değişiklik gerektirmez — `resolve()`, `parseHar()`, `parameterize()` hazır |

### Project Structure Notes

**Mimari uyum:**
- `HttpInterceptorFn` → Angular 15+ functional interceptor pattern (architecture.md#Angular-Plugin-Interceptor-Approach) ✅
- `provideHttpClient(withInterceptors([...]))` → architecture.md'de tanımlı entegrasyon yöntemi ✅
- `HttpBackend` ile circular interception önleme → NFR13 graceful degradation ✅
- `APP_INITIALIZER` eager loading → AC1 "ilk açıldığında fetch" gereksinimi ✅
- Çift yönlü bağımlılık yasağı: `angular-plugin → @har-mock/core` (tek yön) ✅

**References:**
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2](../_bmad-output/planning-artifacts/epics.md) — AC ve gereksinimler
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular-Plugin-Interceptor-Approach](../_bmad-output/planning-artifacts/architecture.md) — HttpInterceptorFn kararı
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam-Proje-Dizin-Yapisi](../_bmad-output/planning-artifacts/architecture.md) — Dizin yapısı
- [Source: packages/angular-plugin/src/lib/provider/provide-har-mock.ts](../../packages/angular-plugin/src/lib/provider/provide-har-mock.ts) — Mevcut provider
- [Source: packages/core/src/index.ts](../../packages/core/src/index.ts) — parseHar, parameterize, resolve, HarParseError
- [Source: _bmad-output/implementation-artifacts/5-1-angular-plugin-paket-kurulumu-provideharMock-api.md](./5-1-angular-plugin-paket-kurulumu-provideharMock-api.md) — Önceki story öğrenmeleri

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **API Uyuşmazlığı (Düzeltildi):** Dev Notes'taki `resolve(url, method, rules, entries, mode)` imzası gerçek core API'sıyla (`resolve(request, rules, harEntries, urlPatterns)`) uyuşmuyordu. Gerçek imza kullanıldı.
- **API Uyuşmazlığı (Düzeltildi):** `parameterize(entry)` tek entry almıyor, `parameterize(entries[])` array alıyor. Buna göre `urlPatterns` ayrı saklanıyor.
- **API Uyuşmazlığı (Düzeltildi):** `resolve()` passthrough için `null` döndürüyor (story'de `source === 'passthrough'` beklenmişti).
- **API Uyuşmazlığı (Düzeltildi):** `HarParseError` iki string alıyor (`rootCause`, `suggestedAction`); story'de `(msg, err)` beklenmişti.
- **API Uyuşmazlığı (Düzeltildi):** `parseHar()` → `HarFile.entries` döndürür (story'de `harFile.log.entries` yazıyordu).
- **Coverage:** `provideHttpClientTesting()` ile `HttpTestingController` kullanıldı (jest.fn() yerine Angular'ın test utility'si).

### Completion Notes List

- `HarLoaderService` oluşturuldu: `HttpBackend` inject ederek circular interception önlenir; `load()` idempotent; `getEntries()` + `getUrlPatterns()` getter'ları ile interceptor'a veri sağlar.
- `harMockInterceptor` oluşturuldu: double-lock guard (`isDevMode + enabled`), null entries passthrough, `resolve()` ile öncelik zinciri, `HttpResponse` mock dönüşü.
- `provideHarMock()` güncellendi: `HarLoaderService` + `APP_INITIALIZER` (eager load) + `provideHttpClient(withInterceptors([harMockInterceptor]))` eklendi.
- `interceptor/index.ts` ve `public-api.ts` export'ları güncellendi.
- 14 unit test yazıldı (7 `HarLoaderService` + 7 `harMockInterceptor`); coverage %100.
- Build başarılı: 0 TS hatası, `dist/fesm2022/har-mock-plugin.mjs` üretildi.
- Regresyon: core 221/221, extension 497/497 geçti.

### File List

- `packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.ts` (yeni)
- `packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts` (yeni)
- `packages/angular-plugin/src/lib/interceptor/index.ts` (güncellendi)
- `packages/angular-plugin/src/lib/provider/provide-har-mock.ts` (güncellendi)
- `packages/angular-plugin/src/public-api.ts` (güncellendi)

### Change Log

- **2026-02-27:** Story 5.2 implementasyonu — `HarLoaderService` + `harMockInterceptor` functional interceptor oluşturuldu; `provideHarMock()` `APP_INITIALIZER` ve `withInterceptors` ile güncellendi; public API'ye export'lar eklendi; 14 unit test yazıldı (coverage %100).
- **2026-02-27:** Code review düzeltmeleri (6 issue) — C-1: `parseHar(raw)` double-parse bug fix; H-1: TestBed `teardown: { destroyAfterEach: true }` eklendi; M-2: response body JSON.parse try-catch ile korundu; L-2: provide-har-mock.ts açıklayıcı yorum; test assertion `toHaveBeenCalledWith(harContent)` güncellendi; story docs güncellendi.
