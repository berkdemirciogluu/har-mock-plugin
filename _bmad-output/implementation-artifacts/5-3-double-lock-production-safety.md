# Story 5.3: Double-Lock Production Safety

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Angular developer,
I want `enabled: true` VE `isDevMode() === true` çift kilit mekanizmasının kesin olarak uygulanmasını,
so that Angular Plugin'in prod build'de hiçbir koşulda aktif olmayacağından emin olabileyim; prod'a sızma riski yapısal olarak imkânsız olsun.

## Acceptance Criteria

1. **Given** `isDevMode()` false döndüren prod build ortamı **When** `provideHarMock({ enabled: true })` olsa bile **Then** interceptor hiçbir request'i yaklamamalı; tüm request'ler orijinal network'e geçmeli; HAR dosyası fetch edilmemeli; guard bypass aktive edilmemeli (NFR1, NFR2)

2. **Given** `isDevMode()` true fakat `enabled: false` olduğunda **When** herhangi bir `HttpClient` isteği yapıldığında **Then** interceptor pasif kalmalı; hiçbir mock response dönülmemeli; HAR dosyası fetch edilmemeli (NFR2)

3. **Given** `isDevMode()` true VE `enabled: true` olduğunda **When** `HttpClient` isteği yapıldığında **Then** interceptor aktif olmalı; match varsa HAR response dönülmeli; HAR fetch gerçekleşmeli (NFR1)

4. **Given** production build (`ng build --configuration production`) **When** Angular derleyici `isDevMode()` çözdüğünde **Then** tree-shaking ile tüm mock logic bundle-dışı bırakılmalı veya ölü kod olarak işaretlenmeli; prod bundle'a sızmama garantisi devam etmeli (NFR1)

## Tasks / Subtasks

- [x] Task 1: `provide-har-mock.ts` — `APP_INITIALIZER` factory'ye double-lock guard ekle (AC: #1, #2)
  - [x] Subtask 1.1: `isDevMode` import'unu `@angular/core`'dan ekle (`provide-har-mock.ts` başında)
  - [x] Subtask 1.2: `APP_INITIALIZER` `useFactory` içindeki return fonksiyonuna guard ekle: `if (!isDevMode() || !config.enabled) return;`
  - [x] Subtask 1.3: Factory'nin `HAR_MOCK_CONFIG` inject ettiğini doğrula (zaten var, sadece kullan)

- [x] Task 2: `provide-har-mock.spec.ts` — double-lock senaryoları için testler ekle (AC: #1, #2, #3)
  - [x] Subtask 2.1: `@angular/core` mock'unu ekle — `isDevMode: jest.fn(() => true)` pattern (interceptor spec'teki gibi)
  - [x] Subtask 2.2: Test: `isDevMode()=false` → `APP_INITIALIZER` HAR fetch yapmamalı (`HttpTestingController.expectNone` ile doğrula)
  - [x] Subtask 2.3: Test: `enabled=false` → `APP_INITIALIZER` HAR fetch yapmamalı
  - [x] Subtask 2.4: Test: `isDevMode()=true && enabled=true` → HAR fetch gerçekleşmeli (mevcut test davranışını koru)

- [x] Task 3: Tüm testleri çalıştır — 0 regresyon doğrula (AC: #1, #2, #3)
  - [x] Subtask 3.1: `yarn workspace har-mock-plugin test` → tüm testler geçmeli
  - [x] Subtask 3.2: `yarn workspace @har-mock/core test` → regresyon yok
  - [x] Subtask 3.3: `yarn workspace @har-mock/extension test` → regresyon yok

## Dev Notes

### Kritik Bulgu: Mevcut `APP_INITIALIZER` Guard Eksikliği

**Problem:** `provide-har-mock.ts`'deki `APP_INITIALIZER` factory'si `isDevMode()` kontrolü **yapmıyor**. Yani production build'de bile:
- `provideHarMock({ enabled: true })` çağrıldığında
- `APP_INITIALIZER` çalışır → `loader.load()` çağrılır → HAR dosyası fetch edilir (gereksiz network isteği!)

Bu durum **AC1'i ihlal eder** ("HAR dosyası fetch edilmemeli").

**Interceptor zaten doğru:** `harMockInterceptor` içindeki `if (!isDevMode() || !config.enabled)` guard doğru çalışıyor. Eksik olan yalnızca `APP_INITIALIZER` factory'sinin guard'ı.

### Fix: `provide-har-mock.ts` Değişikliği

```typescript
// ÖNCE (hatalı — production'da bile HAR fetch eder):
import { makeEnvironmentProviders, EnvironmentProviders, APP_INITIALIZER, inject } from '@angular/core';

{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const loader = inject(HarLoaderService);
    return () => loader.load(); // ❌ prod'da da çalışır!
  },
  multi: true,
},

// SONRA (doğru — double-lock uygulanmış):
import { makeEnvironmentProviders, EnvironmentProviders, APP_INITIALIZER, inject, isDevMode } from '@angular/core';

{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const loader = inject(HarLoaderService);
    const config = inject(HAR_MOCK_CONFIG);
    return () => {
      // Double-lock: production'da veya devre dışıysa HAR fetch edilmez (NFR1, NFR2)
      if (!isDevMode() || !config.enabled) return;
      return loader.load();
    };
  },
  multi: true,
},
```

**Önemli:** `config` değişkeni `APP_INITIALIZER` factory'nin **dış scope**'unda (useFactory fonksiyonunda) inject edilmeli — return eden callback içinde değil. Angular DI injection context'i yalnızca factory çalışırken aktif.

### Mimari: Neden `APP_INITIALIZER`'da Guard Gerekli?

Double-lock iki katmanda uygulanır:
1. **Interceptor katmanı** (`harMockInterceptor`): Request'leri yakalamaz → zaten var ✅
2. **Initialization katmanı** (`APP_INITIALIZER`): HAR fetch etmez → Story 5.3'te ekleniyor ❌→✅

Bu iki katman birlikte NFR1'i karşılar:
- "interceptor hiçbir request'i yaklamaLI" → katman 1 ✅
- "HAR dosyası fetch edilmemeLI" → katman 2 (bu story) ✅
- "guard bypass aktive edilmemeLI" → Story 5.4'te ele alınacak (guard bypass mantığı henüz implement edilmedi)

### Tree-Shaking Garantisi (AC4)

Angular'ın production build süreci:
- `ng build --configuration production` → Angular Ivy compiler çalışır
- `isDevMode()` fonksiyonu: Development build'de `true`, production build'de `false` döner (Angular runtime flag)
- Terser/Rollup dead code elimination: `if (false || ...)` → tüm `if` branch'i kaldırılır
- **Sonuç:** `loader.load()` hiçbir zaman çağrılmaz → HAR fetch kodu bundle'dan elimine edilir

Bu garantiyi unit test ile doğrulamak mümkün değil (runtime'da `isDevMode()` mock'lanır). Ancak:
- Angular dokümantasyonu bu pattern'ı onaylar (tree-shaking + dead code elimination)
- Angular kendi debug tools'larını aynı pattern ile korur
- Mevcut runtime test'ler (AC1, AC2, AC3) behavioral guarantee'yi sağlar

### Dosya Yapısı — Değiştirilecek Dosyalar

```
packages/angular-plugin/src/
└── lib/
    └── provider/
        ├── provide-har-mock.ts        ← GÜNCELLENECEK (isDevMode import + APP_INITIALIZER guard)
        └── provide-har-mock.spec.ts   ← GÜNCELLENECEK (double-lock testleri eklenir)
```

**DOKUNULMAYACAK:**
- `interceptor/har-mock.interceptor.ts` — çift kilit zaten var
- `interceptor/har-mock.interceptor.spec.ts` — mevcut testler yeterli; ancak dikkat: `isDevMode()=false` testi burada hâlâ `loader.load()` çağırıyor (manuel). Bu test interceptor davranışını test eder (doğru). `APP_INITIALIZER` davranışı `provide-har-mock.spec.ts`'de test edilir.
- `packages/core/**` — değişiklik gerektirmez
- `packages/extension/**` — değişiklik gerektirmez

### Test Pattern: `isDevMode` Mock

`provide-har-mock.spec.ts`'e eklenecek mock pattern (interceptor spec'teki ile aynı):

```typescript
jest.mock('@angular/core', () => {
  const original = jest.requireActual('@angular/core');
  return {
    ...original,
    isDevMode: jest.fn(() => true), // default: dev mode aktif
  };
});

const { isDevMode } = jest.requireMock('@angular/core') as { isDevMode: jest.Mock };
```

**Dikkat:** Bu mock `provide-har-mock.spec.ts`'in **üst düzeyinde** tanımlanmalı (jest.mock hoisting nedeniyle). `afterEach` içinde `isDevMode.mockReturnValue(true)` ile reset edilmeli.

### Test: HAR Fetch Doğrulama Pattern

```typescript
it('isDevMode()=false olduğunda HAR fetch edilmemeli (AC1)', async () => {
  mockIsDevMode.mockReturnValue(false);
  TestBed.configureTestingModule({
    providers: [provideHarMock({ enabled: true }), provideHttpClientTesting()],
  });

  // APP_INITIALIZER'ları tetikle
  await TestBed.inject(ApplicationInitStatus).donePromise;

  const controller = TestBed.inject(HttpTestingController);
  controller.expectNone('/assets/har-mock.har'); // HAR fetch YAPILMAMALI
  controller.verify();
});
```

**Not:** `ApplicationInitStatus.donePromise` Angular'ın tüm `APP_INITIALIZER`'ları tamamlamasını bekler. Bu sayede `APP_INITIALIZER` factory'nin gerçekten çalışıp çalışmadığını test edebiliriz.

### Story 5.2'den Kritik Öğrenmeler

| Kural | Açıklama |
|-------|----------|
| `isDevMode` mock hoisting | `jest.mock('@angular/core', ...)` en üstte tanımlanmalı — import'lardan önce hoisting yapılır |
| `afterEach` mock reset | `mockIsDevMode.mockReturnValue(true)` her testten sonra reset et — state sızıntısı önler |
| `controller.verify()` | Her testin sonunda çağrılmalı — bekleyen/beklenmeyen HTTP isteklerini yakalar |
| `TestBed.resetTestingModule()` | `afterEach`'te çağrılmalı |
| `provideHttpClientTesting()` | `provideHarMock()` ile birlikte verilmeli — `HttpClient` test backend'i sağlar |

### `@har-mock/core` API — Bu Story'de Kullanılacaklar

Bu story'de `@har-mock/core` API'lerine dokunulmaz. Yalnızca Angular DI ve `isDevMode()` mekanizması test edilir.

Mevcut mock (`provide-har-mock.spec.ts`'de zaten var):
```typescript
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(() => ({ entries: [] })),
  parameterize: jest.fn(() => []),
  resolve: jest.fn(),
  HarParseError: class extends Error {},
}));
```

### Son Git Commit Analizi

Son 5 commit:
- `371dcdf fix(angular-plugin): story 5-2 code review — 6 issue duzeltmesi`
- `a4579ee fix(angular-plugin): story 5-1 code review — 6 issue duzeltmesi`
- `4fe7301 feat(angular-plugin): story 5-1 — HarMockConfig types ve provideHarMock() factory function`

**Story 5.3 için çıkarımlar:**
- Angular ESM + Jest transform altyapısı 5.1'de kuruldu, hazır
- `isDevMode` mock pattern'ı 5.2 spec'inde zaten kullanılıyor (aynı pattern uygula)
- `teardown: { destroyAfterEach: true }` tüm `TestBed.configureTestingModule` çağrılarına ekle

### Kapsam Sınırları — Bu Story'de DOKUNULMAYACAK

| Dosya | Neden |
|-------|-------|
| `initializer/har-mock.initializer.ts` | Story 5.4 — guard bypass (henüz implement edilmedi) |
| `interceptor/har-mock.interceptor.ts` | Double-lock zaten var; değişiklik gerekmez |
| `packages/core/**` | Core değişiklik gerektirmez |
| `packages/extension/**` | Extension değişiklik gerektirmez |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3](../_bmad-output/planning-artifacts/epics.md) — AC ve gereksinimler
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular-Plugin-Guard-Bypass-Mechanism](../_bmad-output/planning-artifacts/architecture.md) — isDevMode() + enabled + bypassGuards üçlü şartı
- [Source: packages/angular-plugin/src/lib/provider/provide-har-mock.ts](../../packages/angular-plugin/src/lib/provider/provide-har-mock.ts) — mevcut provider (güncellenmeli)
- [Source: packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.ts](../../packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.ts) — mevcut interceptor double-lock (referans)
- [Source: packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts](../../packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts) — isDevMode mock pattern referansı
- [Source: _bmad-output/implementation-artifacts/5-2-asset-based-har-yukleme-httpclient-interceptor.md](./5-2-asset-based-har-yukleme-httpclient-interceptor.md) — önceki story öğrenmeleri

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `provide-har-mock.ts`: `isDevMode` import eklendi; `APP_INITIALIZER` factory'ye `const config = inject(HAR_MOCK_CONFIG)` + double-lock guard (`if (!isDevMode() || !config.enabled) return;`) eklendi. Guard, `HAR_MOCK_CONFIG` ile birlikte factory dış scope'unda inject edildi — Angular DI injection context kuralına uygun.
- `provide-har-mock.spec.ts`: `jest.mock('@angular/core', ...)` üst düzey mock eklendi (interceptor spec ile aynı pattern). 3 yeni double-lock testi eklendi (AC1: isDevMode=false, AC2: enabled=false, AC3: her ikisi true). `afterEach` mock reset ile güncellendi. `ApplicationInitStatus.donePromise` ile APP_INITIALIZER tamamlanması beklendi.
- Tüm testler geçti: angular-plugin 23 test, @har-mock/core 221 test, @har-mock/extension 497 test — toplam 741, 0 regresyon.
- `provide-har-mock.ts` %100 branch coverage.

### File List

- packages/angular-plugin/src/lib/provider/provide-har-mock.ts
- packages/angular-plugin/src/lib/provider/provide-har-mock.spec.ts

### Change Log

- feat(angular-plugin): story 5-3 — APP_INITIALIZER double-lock guard (isDevMode + enabled) (2026-02-27)
