# Story 5.1: Angular Plugin Paket Kurulumu & `provideHarMock()` API

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Angular developer,
I want `packages/angular-plugin`'i ng-packagr build pipeline ve `provideHarMock()` factory function ile,
so that Angular uygulamasına `app.config.ts`'e tek satır ekleyerek HAR mock entegrasyonu yapabileyim; TypeScript tam tip desteğiyle çalışsın.

## Acceptance Criteria

1. **Given** `packages/angular-plugin` dizini **When** `yarn build:plugin` çalıştırıldığında **Then** ng-packagr ESM paketi üretilmeli; `public-api.ts` barrel'dan tüm public API'ler export edilmeli; `@har-mock/core`'a bağımlılık var; Angular veya Chrome API'ye `@har-mock/core` içinde doğrudan bağımlılık yok (NFR10)

2. **Given** `provideHarMock()` factory function **When** parametresiz çağrıldığında **Then** zero-config defaults uygulanmalı: `harUrl: '/assets/har-mock.har'`, `mode: 'last-match'`, `enabled: true`, `bypassGuards: false`, `rules: []`; Angular `EnvironmentProviders` dönülmeli (FR29, FR31)

3. **Given** `provideHarMock({ harUrl: '/assets/custom.har', mode: 'sequential', enabled: true, bypassGuards: true, rules: [...] })` çağrısı **When** Angular app bootstrap edildiğinde **Then** tüm parametreler `HarMockConfig` tipine uygun şekilde algılanmalı; TypeScript autocomplete ve tip kontrolü tam çalışmalı (FR30, NFR12)

4. **Given** `HarMockConfig` interface'i **When** TypeScript ile incelendiğinde **Then** `harUrl`, `mode`, `enabled`, `bypassGuards`, `rules` alanları tam tip tanımlı olmalı; JSDoc yorumları her parametre için mevcut olmalı (NFR12)

## Tasks / Subtasks

- [x] Task 1: `HarMockConfig` type tanımları — `types/har-mock-config.types.ts` (AC: #3, #4)
  - [x] Subtask 1.1: `MockMode` type alias oluştur: `'last-match' | 'sequential'`
  - [x] Subtask 1.2: `HarMockConfig` interface tanımla — tüm alanlar optional, JSDoc her alan için
  - [x] Subtask 1.3: `HAR_MOCK_CONFIG` InjectionToken oluştur — `InjectionToken<Required<HarMockConfig>>`
  - [x] Subtask 1.4: `types/index.ts` güncelle — HarMockConfig, MockMode, HAR_MOCK_CONFIG export

- [x] Task 2: `provideHarMock()` factory function — `provider/provide-har-mock.ts` (AC: #2, #3)
  - [x] Subtask 2.1: `provideHarMock(config?: HarMockConfig): EnvironmentProviders` implement et
  - [x] Subtask 2.2: Zero-config defaults birleştirme — `config?.harUrl ?? '/assets/har-mock.har'` pattern
  - [x] Subtask 2.3: `makeEnvironmentProviders([{ provide: HAR_MOCK_CONFIG, useValue: resolved }])` döndür
  - [x] Subtask 2.4: `provider/index.ts` güncelle — provideHarMock export

- [x] Task 3: `public-api.ts` barrel güncelle (AC: #1)
  - [x] Subtask 3.1: `HarMockConfig`, `MockMode`, `HAR_MOCK_CONFIG`, `provideHarMock` export et
  - [x] Not: `interceptor/index.ts` ve `initializer/index.ts` Story 5.2 ve 5.4'e kadar placeholder kalır

- [x] Task 4: Unit testler — `provider/provide-har-mock.spec.ts` (AC: #2, #3)
  - [x] Subtask 4.1: `provideHarMock()` → EnvironmentProviders döndürdüğünü doğrula
  - [x] Subtask 4.2: Parametresiz çağrı → HAR_MOCK_CONFIG'e inject edilen değerde zero-config defaults doğrula
  - [x] Subtask 4.3: Tam config çağrısı → inject edilen değerde tüm alanların override edildiğini doğrula
  - [x] Subtask 4.4: Partial config → verilmeyen alanların default'a düştüğünü doğrula

- [x] Task 5: Build doğrulama (AC: #1)
  - [x] Subtask 5.1: `yarn workspace har-mock-plugin build` çalıştır → `dist/` oluşmalı
  - [x] Subtask 5.2: `dist/fesm2022/har-mock-plugin.mjs` varlığını kontrol et (ng-packagr ESM output)
  - [x] Subtask 5.3: `dist/index.d.ts` type declarations doğrula

- [x] Task 6: Tüm testler çalıştır — 0 regresyon doğrula
  - [x] Subtask 6.1: `yarn workspace har-mock-plugin test` → yeni testler geçmeli
  - [x] Subtask 6.2: `yarn workspace @har-mock/core test` + `yarn workspace @har-mock/extension test` → regresyon yok

## Dev Notes

### Kritik: Bu Story'nin Kapsamı

**Story 5.1 yalnızca şunları içerir:**
1. `HarMockConfig` interface + `MockMode` type + `HAR_MOCK_CONFIG` injection token
2. `provideHarMock()` factory function (interceptor ve initializer kaydı YOK — bu sonraki story'ler)
3. `public-api.ts` barrel güncellemesi
4. Unit testler

**Story 5.1'de DOKUNULMAYACAK dosyalar:**
- `interceptor/har-mock.interceptor.ts` → Story 5.2'de oluşturulacak
- `initializer/` → Story 5.4'te oluşturulacak (guard bypass)
- `interceptor/index.ts` ve `initializer/index.ts` → placeholder olarak kalacak (`export {}`)

### Dosya Yapısı — Oluşturulacak/Güncellenecek Dosyalar

```
packages/angular-plugin/src/
├── public-api.ts                           ← GÜNCELLENECEK (placeholder'dan çıkar)
└── lib/
    ├── types/
    │   ├── har-mock-config.types.ts        ← OLUŞTURULACAK (yeni dosya)
    │   └── index.ts                        ← GÜNCELLENECEK
    ├── provider/
    │   ├── provide-har-mock.ts             ← OLUŞTURULACAK (yeni dosya)
    │   ├── provide-har-mock.spec.ts        ← OLUŞTURULACAK (yeni dosya)
    │   └── index.ts                        ← GÜNCELLENECEK
    ├── interceptor/
    │   └── index.ts                        ← DOKUNMA (placeholder kalır)
    └── initializer/
        └── index.ts                        ← DOKUNMA (placeholder kalır)
```

### HarMockConfig Interface Tasarımı

```typescript
// packages/angular-plugin/src/lib/types/har-mock-config.types.ts
import type { MockRule } from '@har-mock/core';
import { InjectionToken } from '@angular/core';

/** HAR mock response seçim modu */
export type MockMode = 'last-match' | 'sequential';

/**
 * provideHarMock() factory function konfigürasyonu.
 * Tüm alanlar opsiyonel; belirtilmeyenler zero-config default değerlerini alır.
 */
export interface HarMockConfig {
  /**
   * HAR dosyasının URL'i.
   * Angular assets klasöründen yüklenir.
   * @default '/assets/har-mock.har'
   */
  harUrl?: string;

  /**
   * HAR response seçim modu.
   * - 'last-match': URL pattern'ına en son eklenen eşleşen entry kullanılır
   * - 'sequential': Her istek için sırayla bir sonraki entry kullanılır
   * @default 'last-match'
   */
  mode?: MockMode;

  /**
   * Plugin'i etkinleştirir/devre dışı bırakır.
   * Double-lock: isDevMode() false ise bu değerden bağımsız plugin pasif kalır.
   * @default true
   */
  enabled?: boolean;

  /**
   * Dev mode'da Angular route guard'larını devre dışı bırakır.
   * APP_INITIALIZER aracılığıyla Router.config mutation yapılır.
   * @default false
   */
  bypassGuards?: boolean;

  /**
   * Aktif mock rule listesi.
   * Priority chain: Rules → HAR → Passthrough
   * @default []
   */
  rules?: MockRule[];
}

/** Angular DI token — resolved (Required<HarMockConfig>) konfigürasyonu inject eder */
export const HAR_MOCK_CONFIG = new InjectionToken<Required<HarMockConfig>>('HAR_MOCK_CONFIG');
```

### provideHarMock() Implementasyon Tasarımı

```typescript
// packages/angular-plugin/src/lib/provider/provide-har-mock.ts
import { makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';
import type { HarMockConfig } from '../types/har-mock-config.types';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

/**
 * Angular HAR Mock plugin'i app.config.ts'e ekler.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([...])),
 *     provideHarMock({ harUrl: '/assets/api.har' }),
 *   ]
 * };
 */
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
    // Note: HttpInterceptorFn — Story 5.2'de eklenecek
    // Note: APP_INITIALIZER (guard bypass) — Story 5.4'te eklenecek
  ]);
}
```

### Unit Test Tasarımı

```typescript
// packages/angular-plugin/src/lib/provider/provide-har-mock.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHarMock } from './provide-har-mock';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';
import type { MockRule } from '@har-mock/core';

describe('provideHarMock', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should return EnvironmentProviders (not null/undefined)', () => {
    const result = provideHarMock();
    expect(result).toBeDefined();
  });

  it('should apply zero-config defaults when called with no arguments (AC2)', () => {
    TestBed.configureTestingModule({ providers: [provideHarMock()] });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/har-mock.har');
    expect(config.mode).toBe('last-match');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(false);
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
    TestBed.configureTestingModule({
      providers: [
        provideHarMock({
          harUrl: '/assets/custom.har',
          mode: 'sequential',
          enabled: true,
          bypassGuards: true,
          rules: [rule],
        }),
      ],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/custom.har');
    expect(config.mode).toBe('sequential');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(true);
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]).toEqual(rule);
  });

  it('should merge partial config with defaults (AC2+AC3)', () => {
    TestBed.configureTestingModule({
      providers: [provideHarMock({ harUrl: '/custom.har' })],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/custom.har');
    expect(config.mode).toBe('last-match');    // default
    expect(config.enabled).toBe(true);         // default
    expect(config.bypassGuards).toBe(false);   // default
    expect(config.rules).toEqual([]);          // default
  });
});
```

### Angular TestBed Kurulumu

`@angular/core/testing`'den `TestBed` kullanılır. Story 5.1'de `TestBed.configureTestingModule()` yeterli — `configureTestingModule` `EnvironmentProviders` kabul eder. Özel `TestBed` bootstrap gerekmez.

**Jest + Angular testing:** `jest.config.js` zaten `testEnvironment: 'jsdom'` ayarlı. Angular testing utilities `@angular/core/testing` modülünden import edilir — `@angular/core` devDependency olarak mevcut.

### ng-packagr Build Çıktısı

`yarn workspace har-mock-plugin build` (veya `yarn build:plugin`) çalıştırıldığında ng-packagr şunları üretir:
```
packages/angular-plugin/dist/
├── fesm2022/
│   └── har-mock-plugin.mjs           # ESM bundle
├── esm2022/
│   └── har-mock-plugin.mjs           # ESM (treeshakeable)
├── index.d.ts                         # Type declarations
└── package.json                       # publish metadata
```

**Not:** `public-api.ts` içinde `export {}` olan dosyalar şu an build'i bozmaz. Ancak tüm `index.ts` placeholder dosyaları `export {}` formunda kalmalı — `export` olmayan `export {}` legal TypeScript.

### Angular API Versiyonu

- **Angular 18** (devDependency olarak kurulu — `package.json` kontrol edildi)
- `makeEnvironmentProviders` → Angular 15+ ✅ (Angular 18'de stabil)
- `EnvironmentProviders` → Angular 15+ ✅
- `InjectionToken<T>` → Angular tüm versiyonlarında ✅
- `isDevMode()` → Angular tüm versiyonlarında ✅ (Story 5.3'te kullanılacak)

### @har-mock/core Dependency

`provideHarMock()` içinde `@har-mock/core`'dan yalnızca `MockRule` tipi import edilir (type-only import — bundle'a dahil olmaz). Core'un runtime fonksiyonları (`resolve`, `parseHar`, vb.) Story 5.2'de interceptor'a eklenecek.

```typescript
import type { MockRule } from '@har-mock/core'; // type-only — runtime dependency yok
```

Path alias: `tsconfig.json`'da `"@har-mock/core": ["../core/src"]` tanımlı ✅

### Önceki Story'lerden Kritik Öğrenmeler (Story 4.3 Dev Notes'tan)

| Kural | Kaynak |
|-------|--------|
| `jest.mock` factory hoisting — import sonrası `jest.Mock` cast gerekli | Story 3.3 |
| `afterEach(() => TestBed.resetTestingModule())` — her testten sonra temizle | Angular testing best practice |
| `mockClear()` ya da `resetTestingModule()` — önceki testten state sızmaması | Story 4.3 debug log |

### Bağımlılık Kontrolleri

- `@angular/core` peerDependency `>=15.0.0` ✅ (Angular 18 ile uyumlu)
- `@har-mock/core` dependency `"*"` (workspace internal) ✅
- `ng-packagr ^18.0.0` devDependency ✅
- `jest ^29.7.0` + `jest-environment-jsdom ^29.7.0` ✅

### Project Structure Notes

**Mimari uyum:**
- `packages/angular-plugin/src/lib/types/` → `har-mock-config.types.ts` + `index.ts` [Source: architecture.md#Tam Proje Dizin Yapisi]
- `packages/angular-plugin/src/lib/provider/` → `provide-har-mock.ts` + spec + `index.ts` [Source: architecture.md#Tam Proje Dizin Yapisi]
- `packages/angular-plugin/src/public-api.ts` → tek barrel [Source: architecture.md]
- Döngüsel bağımlılık yasağı: `@har-mock/core ← angular-plugin` (tek yön) ✅

**Nedenler:**
- Angular Plugin bağımlılık hiyerarşisi: `@har-mock/core ← packages/angular-plugin` — core, Angular'a bağımlı DEĞİL [Source: architecture.md#Dependencies]
- `provideHttpClient(withInterceptors([...]))` entegrasyonu Story 5.2'de gelecek — bu story'de interceptor kaydı yapılmaz

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1](../_bmad-output/planning-artifacts/epics.md) — AC detayları
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular-Plugin-Interceptor-Approach](../_bmad-output/planning-artifacts/architecture.md) — Functional interceptor kararı
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam-Proje-Dizin-Yapisi](../_bmad-output/planning-artifacts/architecture.md) — Dizin yapısı
- [Source: packages/angular-plugin/package.json](../../packages/angular-plugin/package.json) — Angular 18, ng-packagr 18
- [Source: packages/angular-plugin/tsconfig.json](../../packages/angular-plugin/tsconfig.json) — @har-mock/core path alias
- [Source: packages/angular-plugin/ng-package.json](../../packages/angular-plugin/ng-package.json) — ng-packagr config, entryFile, dest
- [Source: packages/angular-plugin/jest.config.js](../../packages/angular-plugin/jest.config.js) — jsdom, testMatch pattern
- [Source: packages/core/src/index.ts](../../packages/core/src/index.ts) — MockRule, HarMockError export'ları
- [Source: _bmad-output/implementation-artifacts/4-3-rule-first-priority-chain-harsiz-calisma-integration.md](./4-3-rule-first-priority-chain-harsiz-calisma-integration.md) — Önceki story learnings

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

1. **TS2741 - MockRule.id missing**: Story template'deki test örneği `id` alanını içermiyordu. `MockRule` interface'inin `id: string` alanı zorunlu. Test objesine `id: 'test-rule-1'` eklenerek düzeltildi.

2. **Angular ESM + Jest CJS uyumsuzluğu**: `@angular/core` Angular 18'de ESM-only. `jest.config.js`'e `transformIgnorePatterns: ['node_modules/(?!(@angular|zone\\.js)/)']` ve `.mjs` dosyaları için ts-jest transform eklenerek çözüldü.

3. **TestBed zone.js gerektiriyor**: `TestBed.configureTestingModule` zone.js setup olmadan `Cannot read properties of null` hatası veriyordu. `src/test-setup.ts` oluşturulup `zone.js` + `@angular/platform-browser-dynamic/testing` ile Angular test environment başlatıldı.

4. **tsconfig rootDir kısıtlaması**: `har-mock-config.types.ts` `@har-mock/core`'dan `import type` yapıyordu, `rootDir: "src"` buna izin vermiyordu. `tsconfig.spec.json` oluşturulup `rootDir: "../.."` olarak genişletildi.

### Completion Notes List

- ✅ `HarMockConfig` interface tüm alanlar JSDoc ile tanımlandı
- ✅ `MockMode` type alias oluşturuldu: `'last-match' | 'sequential'`
- ✅ `HAR_MOCK_CONFIG` InjectionToken `InjectionToken<Required<HarMockConfig>>` olarak oluşturuldu
- ✅ `provideHarMock()` factory function zero-config defaults ile implement edildi
- ✅ `public-api.ts` barrel `HarMockConfig`, `MockMode`, `HAR_MOCK_CONFIG`, `provideHarMock` export ediyor
- ✅ 4 unit test: `provide-har-mock.spec.ts` — TestBed ile Angular DI injection doğrulandı
- ✅ ng-packagr build başarılı: `dist/fesm2022/har-mock-plugin.mjs` ve `dist/index.d.ts` üretildi
- ✅ `@har-mock/core` 221 test — 0 regresyon
- ✅ `@har-mock/extension` 497 test — 0 regresyon
- ✅ Angular plugin 4 test — 100% code coverage
- ✅ Angular TestBed setup: `jest.config.js` + `tsconfig.spec.json` + `src/test-setup.ts` eklendi (sonraki story'lere de hazır)

### File List

- `packages/angular-plugin/src/lib/types/har-mock-config.types.ts` (oluşturuldu)
- `packages/angular-plugin/src/lib/types/index.ts` (güncellendi)
- `packages/angular-plugin/src/lib/provider/provide-har-mock.ts` (oluşturuldu)
- `packages/angular-plugin/src/lib/provider/provide-har-mock.spec.ts` (oluşturuldu)
- `packages/angular-plugin/src/lib/provider/index.ts` (güncellendi)
- `packages/angular-plugin/src/public-api.ts` (güncellendi)
- `packages/angular-plugin/src/test-setup.ts` (oluşturuldu)
- `packages/angular-plugin/jest.config.js` (güncellendi — Angular ESM + zone.js desteği)
- `packages/angular-plugin/tsconfig.spec.json` (oluşturuldu — rootDir relaxed for tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (güncellendi — in-progress → review)

### Change Log

- 2026-02-27: Story 5.1 implement edildi — HarMockConfig types, provideHarMock factory, public-api barrel, unit testler, ng-packagr build doğrulaması tamamlandı. Angular TestBed setup (zone.js + tsconfig.spec.json) eklendi.
