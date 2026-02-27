# Story 5.4: Guard Bypass Mekanizması

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Angular developer,
I want `bypassGuards: true` ile dev mode'da tüm Angular route guard'larının (`CanActivate`, `CanDeactivate`, `CanMatch`) otomatik olarak devre dışı bırakılmasını,
so that guard'lı admin sayfalarına direkt URL ile gidip HAR replay ile prod state'ini görebileyim; auth guard'a takılmadan debug edebileyim.

## Acceptance Criteria

1. **Given** `provideHarMock({ bypassGuards: true, enabled: true })` yapılandırılmış ve `isDevMode()` true **When** Angular uygulaması başlarken `APP_INITIALIZER` çalıştığında **Then** `Router.config` recursive geçilmeli; `canActivate`, `canDeactivate`, `canMatch` array'leri boşaltılmalı; ilk navigation'dan önce tamamlanmalı (FR34, ARCH10)

2. **Given** guard bypass aktif olduğunda **When** guard'lı bir route'a doğrudan navigate edildiğinde **Then** guard fonksiyonları hiç çalışmamalı; route doğrudan yüklenebilmeli

3. **Given** lazy-loaded child route'larda guard'lar tanımlı olduğunda **When** guard bypass çalıştığında **Then** recursive Router.config traversal lazy-loaded children'daki guard'ları da temizlemeli; `RouteConfigLoadEnd` event'i sonrasında yeni yüklenen route config'ler de temizlenmiş olmalı (FR34)

4. **Given** `bypassGuards: false` veya `isDevMode() === false` olduğunda **When** guard'lı bir route'a navigate edildiğinde **Then** guard'lar normal şekilde çalışmalı; hiçbir route config mutation yapılmamalı (ARCH10)

5. **Given** `APP_INITIALIZER` içinde Router mutation sırasında hata oluştuğunda **When** exception yakalandığında **Then** hata `console.warn` ile loglanmalı ama uygulama başlatılmalı; guard'lar bypass edilmemiş haliyle çalışmaya devam etmeli

## Tasks / Subtasks

- [x] Task 1: `har-mock.initializer.ts` oluştur (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 1.1: `clearGuardsRecursively(routes: Route[]): void` — her route'ta `canActivate`, `canDeactivate`, `canMatch`'i `[]` yap; `route.children?.length` varsa recursive çağır
  - [x] Subtask 1.2: `harMockGuardBypassFactory()` — `inject(HAR_MOCK_CONFIG)` + `inject(Router)`; triple-lock kontrolü: `!isDevMode() || !config.enabled || !config.bypassGuards` → erken çık
  - [x] Subtask 1.3: `router.events` subscription — `RouteConfigLoadEnd` event'inde `clearGuardsRecursively(router.config)` tekrar çağır (lazy route desteği — AC3)
  - [x] Subtask 1.4: try/catch wrapper + `console.warn('[HarMock] Guard bypass failed:', e)` (AC5)
- [x] Task 2: `har-mock.initializer.spec.ts` oluştur (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 2.1: `jest.mock('@angular/core', ...)` isDevMode mock — 5.2/5.3 spec ile aynı pattern; `afterEach`'te `isDevMode.mockReturnValue(true)` reset
  - [x] Subtask 2.2: Test AC1: `bypassGuards=true`, `enabled=true`, `isDevMode=true` → `router.config`'deki tüm `canActivate` / `canDeactivate` / `canMatch` array'leri boş olmalı
  - [x] Subtask 2.3: Test AC3: nested `children` içindeki guard'lar → recursive traversal tüm seviyelerdeki guard'ları temizlemeli
  - [x] Subtask 2.4: Test AC4a: `bypassGuards=false` → `router.config` değişmemeli
  - [x] Subtask 2.5: Test AC4b: `isDevMode()=false` → `router.config` değişmemeli
  - [x] Subtask 2.6: Test AC4c: `enabled=false` → `router.config` değişmemeli
  - [x] Subtask 2.7: Test AC5: Router erişimde exception → `console.warn` çağrılmalı; hata fırlatılmamalı
  - [x] Subtask 2.8: `teardown: { destroyAfterEach: true }` tüm `TestBed.configureTestingModule` çağrılarına ekle
- [x] Task 3: `initializer/index.ts` güncelle (AC: #1)
  - [x] Subtask 3.1: `export { harMockGuardBypassFactory } from './har-mock.initializer'` ekle (`clearGuardsRecursively` internal — export gerekmez)
- [x] Task 4: `provide-har-mock.ts` güncelle — guard bypass provider ekle (AC: #1, #4)
  - [x] Subtask 4.1: `harMockGuardBypassFactory` import'u `'../initializer'`'dan ekle
  - [x] Subtask 4.2: `makeEnvironmentProviders([...])` içine ikinci `APP_INITIALIZER` provider ekle: `{ provide: APP_INITIALIZER, useFactory: harMockGuardBypassFactory, multi: true }`
  - [x] Subtask 4.3: `// Note: Router guard bypass ... Story 5.4'te eklenecek` yorumunu kaldır
- [x] Task 5: Tüm testleri çalıştır — 0 regresyon doğrula (AC: #1–#5)
  - [x] Subtask 5.1: `yarn workspace har-mock-plugin test` → tüm testler geçmeli (31/31 ✅)
  - [x] Subtask 5.2: `yarn workspace @har-mock/core test` → regresyon yok (221/221 ✅)
  - [x] Subtask 5.3: `yarn workspace @har-mock/extension test` → regresyon yok (497/497 ✅)

## Dev Notes

### Mimari: Guard Bypass Mekanizması (ARCH10)

**Karar:** `APP_INITIALIZER` + `Router.config` mutation (Angular Router public API kullanılır — private API bağımlılığı yok)

**Activation Condition — Triple-Lock:**
```typescript
if (!isDevMode() || !config.enabled || !config.bypassGuards) return;
```
→ Üçü de `true` olmalı: devMode + enabled + bypassGuards (NFR1, NFR2, ARCH10)

**Temel Implementasyon Şablonu:**
```typescript
// packages/angular-plugin/src/lib/initializer/har-mock.initializer.ts
import { inject, isDevMode } from '@angular/core';
import { Router, RouteConfigLoadEnd, type Route } from '@angular/router';
import { filter } from 'rxjs';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

export function clearGuardsRecursively(routes: Route[]): void {
  for (const route of routes) {
    route.canActivate = [];
    route.canDeactivate = [];
    route.canMatch = [];
    if (route.children?.length) {
      clearGuardsRecursively(route.children);
    }
  }
}

export function harMockGuardBypassFactory(): () => void {
  const config = inject(HAR_MOCK_CONFIG);
  const router = inject(Router);

  return () => {
    // Triple-lock: production'da, devre dışıysa veya bypassGuards=false ise hiçbir şey yapma (ARCH10)
    if (!isDevMode() || !config.enabled || !config.bypassGuards) return;

    try {
      // Mevcut route config'leri temizle (eager routes + önceden yüklenmiş lazy routes)
      clearGuardsRecursively(router.config);

      // Lazy-loaded route'lar için: RouteConfigLoadEnd event'inde yeniden temizle (AC3)
      router.events
        .pipe(filter(e => e instanceof RouteConfigLoadEnd))
        .subscribe(() => clearGuardsRecursively(router.config));
    } catch (e) {
      // Hata loglanır ama uygulama başlatılır; guard'lar bypass edilmemiş haliyle devam eder (AC5)
      console.warn('[HarMock] Guard bypass failed:', e);
    }
  };
}
```

**Neden `children` yeterli — `loadChildren` neden dokunulmaz:**
- `route.children`: eager (statik) child route'lar — anında erişilebilir
- `route.loadChildren`: lazy loading function — çağrılmamalı (yan etki riski)
- Lazy modüller yüklendiğinde `router.config` güncellenir → `RouteConfigLoadEnd` subscription bunu yakalar

### Mevcut Kod Durumu — Değişiklik Gerektiren Dosyalar

**`provide-har-mock.ts` (satır 52):**
```typescript
// Mevcut (silinecek):
// Note: Router guard bypass (APP_INITIALIZER ile route block) — Story 5.4'te eklenecek

// Eklenecek provider:
{
  provide: APP_INITIALIZER,
  useFactory: harMockGuardBypassFactory,
  multi: true,
},
```

**`initializer/index.ts` (şu an boş):**
```typescript
// Mevcut (silinecek):
// Story 5.x'te doldurulacak
export {};

// Yeni içerik:
export { harMockGuardBypassFactory } from './har-mock.initializer';
```

**`public-api.ts` — değişiklik gerekmez:** Guard bypass logic `provideHarMock()` aracılığıyla dahili kullanılır; ayrı export gerekmiyor.

### Test Pattern: isDevMode Mock (5.2/5.3 ile Aynı Pattern)

```typescript
// har-mock.initializer.spec.ts — DOSYANIN EN ÜSTÜNDE (jest hoisting)
jest.mock('@angular/core', () => {
  const original = jest.requireActual('@angular/core');
  return {
    ...original,
    isDevMode: jest.fn(() => true), // default: dev mode aktif
  };
});

const { isDevMode } = jest.requireMock('@angular/core') as { isDevMode: jest.Mock };

afterEach(() => {
  isDevMode.mockReturnValue(true); // state sızıntısını önle
});
```

### Test: Router Mock Örneği

```typescript
import type { Route } from '@angular/router';

const mockAuthGuard = jest.fn(() => true);
const mockUnsavedGuard = jest.fn(() => true);
const mockAdminGuard = jest.fn(() => true);

const mockRoutes: Route[] = [
  {
    path: 'admin',
    canActivate: [mockAuthGuard],
    canDeactivate: [mockUnsavedGuard],
    children: [
      {
        path: 'users',
        canActivate: [mockAdminGuard],
        canMatch: [mockAdminGuard],
      },
    ],
  },
];

// TestBed'de Router'ı mock'lamak için:
TestBed.configureTestingModule({
  teardown: { destroyAfterEach: true },
  providers: [
    { provide: HAR_MOCK_CONFIG, useValue: { bypassGuards: true, enabled: true, ... } },
    { provide: Router, useValue: { config: mockRoutes, events: EMPTY } },
  ],
});

// Factory'yi çağırıp dönen fonksiyonu tetikle:
const factory = TestBed.runInInjectionContext(harMockGuardBypassFactory);
factory();

// Doğrulama:
expect(mockRoutes[0].canActivate).toEqual([]);
expect(mockRoutes[0].canDeactivate).toEqual([]);
expect(mockRoutes[0].children![0].canActivate).toEqual([]);  // recursive
expect(mockRoutes[0].children![0].canMatch).toEqual([]);      // recursive
```

**Not:** `Router.events` için `EMPTY` veya `Subject<Event>` kullanılabilir — lazy route testlerinde `RouteConfigLoadEnd` emit edilebilir.

### Story 5.3'ten Kritik Öğrenmeler

| Kural | Açıklama |
|-------|----------|
| `isDevMode` mock hoisting | `jest.mock('@angular/core', ...)` dosyanın EN ÜSTÜNDE — import'lardan önce |
| `afterEach` mock reset | `isDevMode.mockReturnValue(true)` her testten sonra — state sızıntısı önler |
| `teardown: { destroyAfterEach: true }` | Tüm `TestBed.configureTestingModule` çağrılarına — code review bulgusu |
| Triple-lock guard | `!isDevMode() || !config.enabled || !config.bypassGuards` — üçü de sağlanmalı |
| `inject()` pattern | Constructor injection değil, `inject()` fonksiyonu kullanılmalı |
| `APP_INITIALIZER` factory pattern | `useFactory: fn` + `multi: true` — `provide-har-mock.ts`'deki pattern aynı |

### Angular Router Public API — Kullanılacaklar

```typescript
import { Router, RouteConfigLoadEnd, type Route } from '@angular/router';
import { filter } from 'rxjs';
```

- `router.config: Route[]` — mutable route konfigürasyon array'i (public API)
- `router.events: Observable<RouterEvent>` — router event stream
- `RouteConfigLoadEnd` — lazy module yüklemesi tamamlandı event'i (public API)
- `Route.canActivate`, `Route.canDeactivate`, `Route.canMatch`, `Route.children` — tüm public API

**Önemli:** `route.loadChildren` property'sine dokunulmaz — lazy loading function korunur. Sadece guard property'leri boşaltılır.

### Kapsam Sınırları — Bu Story'de DOKUNULMAYACAK

| Dosya | Neden |
|-------|-------|
| `interceptor/har-mock.interceptor.ts` | Double-lock zaten var, değişiklik gerekmez |
| `interceptor/har-mock.interceptor.spec.ts` | Mevcut testler yeterli |
| `provider/provide-har-mock.spec.ts` | Guard bypass testi `initializer.spec.ts`'te — provider spec dokunulmaz |
| `types/har-mock-config.types.ts` | `bypassGuards?: boolean` zaten tanımlı |
| `packages/core/**` | Core değişiklik gerektirmez |
| `packages/extension/**` | Extension değişiklik gerektirmez |

### Son Git Commit Analizi

```
d36c904 fix(angular-plugin): story 5-3 code review — 7 issue duzeltmesi
db2d329 feat(angular-plugin): story 5-3 — APP_INITIALIZER double-lock guard (isDevMode + enabled)
371dcdf fix(angular-plugin): story 5-2 code review — 6 issue duzeltmesi
```

**Bu Story için Çıkarımlar:**
- Angular ESM + Jest transform altyapısı hazır (5.1'den beri)
- `isDevMode` mock pattern'ı 5.2/5.3 spec'te sınanmış — aynı pattern uygulanmalı
- `APP_INITIALIZER` factory pattern `provide-har-mock.ts`'de mevcut — aynı yapı kullanılacak
- `teardown: { destroyAfterEach: true }` code review bulgusu: tüm TestBed config'lerine eklenmeli
- `provide-har-mock.ts` total test sayısı: 24 (5.3 sonrası) — 0 regresyon beklentisi

### Project Structure Notes

**Değiştirilecek / Oluşturulacak Dosyalar:**
```
packages/angular-plugin/src/
└── lib/
    ├── initializer/
    │   ├── har-mock.initializer.ts        ← OLUŞTURULACAK (yeni)
    │   ├── har-mock.initializer.spec.ts   ← OLUŞTURULACAK (yeni)
    │   └── index.ts                       ← GÜNCELLENECEk (export eklenecek)
    └── provider/
        └── provide-har-mock.ts            ← GÜNCELLENECEk (guard bypass APP_INITIALIZER)
```

**Mimari uyum notu:** `@har-mock/core` bağımlılığı bu story'de yok — yalnızca Angular ve RxJS kullanılıyor. Paket bağımlılık sınırları korunuyor.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4](../_bmad-output/planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular-Plugin-Guard-Bypass-Mechanism](../_bmad-output/planning-artifacts/architecture.md)
- [Source: packages/angular-plugin/src/lib/provider/provide-har-mock.ts](../../packages/angular-plugin/src/lib/provider/provide-har-mock.ts) — mevcut provider (güncellenecek)
- [Source: packages/angular-plugin/src/lib/initializer/index.ts](../../packages/angular-plugin/src/lib/initializer/index.ts) — şu an boş (güncellenecek)
- [Source: _bmad-output/implementation-artifacts/5-3-double-lock-production-safety.md](./5-3-double-lock-production-safety.md) — önceki story öğrenmeleri
- [Source: packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts](../../packages/angular-plugin/src/lib/interceptor/har-mock.interceptor.spec.ts) — isDevMode mock pattern referansı

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `@angular/router` paketi `package.json`'da eksikti; `peerDependencies` ve `devDependencies`'e `^18.0.0` olarak eklendi ve `yarn install` ile yüklendi.
- `noUncheckedIndexedAccess: true` tsconfig ayarı nedeniyle spec'te `routes[0]` erişimi `Route | undefined` döndürüyordu; `routes[0]!` non-null assertion ile düzeltildi.

### Completion Notes List

- `clearGuardsRecursively(routes: Route[]): void` — `canActivate`, `canDeactivate`, `canMatch` array'lerini `[]` ile sıfırlar; `children` varsa recursive çağırır (AC1, AC2, AC3)
- `harMockGuardBypassFactory()` — triple-lock (`!isDevMode() || !config.enabled || !config.bypassGuards`); `RouteConfigLoadEnd` subscription ile lazy route desteği; try/catch + `console.warn` ile graceful degradation (AC4, AC5)
- `initializer/index.ts` — `harMockGuardBypassFactory` export edildi (`clearGuardsRecursively` internal kaldı)
- `provide-har-mock.ts` — ikinci `APP_INITIALIZER` provider eklendi; placeholder yorum kaldırıldı
- `package.json` — `@angular/router: ^18.0.0` peerDependencies ve devDependencies'e eklendi
- 7 yeni test: AC1 (guard temizleme), AC3 eager + lazy (recursive + RouteConfigLoadEnd), AC4a/b/c (triple-lock), AC5 (error handling) — hepsi geçiyor
- Tüm workspace testleri: 749 toplam (31 angular-plugin + 221 core + 497 extension) — 0 regresyon

### File List

- `packages/angular-plugin/src/lib/initializer/har-mock.initializer.ts` (yeni)
- `packages/angular-plugin/src/lib/initializer/har-mock.initializer.spec.ts` (yeni)
- `packages/angular-plugin/src/lib/initializer/index.ts` (güncellendi)
- `packages/angular-plugin/src/lib/provider/provide-har-mock.ts` (güncellendi)
- `packages/angular-plugin/package.json` (güncellendi — @angular/router eklendi)

## Change Log

- 2026-02-28: Story 5.4 implementasyonu tamamlandı — `harMockGuardBypassFactory` ile `APP_INITIALIZER` tabanlı guard bypass mekanizması eklendi; `@angular/router` bağımlılığı pakete dahil edildi; 7 yeni test yazıldı, 0 regresyon
