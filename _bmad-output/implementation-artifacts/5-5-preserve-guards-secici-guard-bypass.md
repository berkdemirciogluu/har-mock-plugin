# Story 5.5: preserveGuards — Seçici Guard Bypass

Status: ready-for-dev

## Story

As an Angular developer,
I want `bypassGuards: true` aktifken hangi guard'ların korunacağını `preserveGuards` listesiyle belirtebilmek,
so that örneğin `BssPermissionGuard` gibi iş-kritik guard'ları bypass etmeden, yalnızca auth guard'ı devre dışı bırakabileyim.

## Acceptance Criteria

1. **Given** `provideHarMock({ bypassGuards: true, preserveGuards: [BssPermissionGuard] })` yapılandırılmış ve `isDevMode()` true **When** guard bypass çalıştığında **Then** `BssPermissionGuard` tüm route'larda (eager + lazy + children) korunmalı; `preserveGuards` listesinde olmayan diğer guard'lar temizlenmeli

2. **Given** `preserveGuards` birden fazla guard içerdiğinde (`preserveGuards: [GuardA, GuardB]`) **When** guard bypass çalıştığında **Then** listede olan tüm guard'lar korunmalı; listede olmayan guard'lar temizlenmeli

3. **Given** `preserveGuards` verilmemiş ya da boş (`[]`) olduğunda **When** guard bypass çalıştığında **Then** mevcut Story 5.4 davranışı korunmalı — tüm guard'lar temizlenmeli (geriye uyumluluk)

4. **Given** `preserveGuards` listesinde hem class-based (`BssPermissionGuard`) hem functional (`analyticsGuard`) guard'lar bulunduğunda **When** guard bypass çalıştığında **Then** her iki türdeki guard da korunmalı; tür farkı olmaksızın `includes()` referans eşleşmesi ile çalışmalı

5. **Given** lazy-loaded route'larda `preserveGuards` listesindeki guard tanımlı olduğunda **When** `RouteConfigLoadEnd` event'i tetiklendiğinde **Then** yeniden çalışan `clearGuardsRecursively` de `preserveGuards` listesini kullanmalı; korunan guard'lar lazy route'larda da silinmemeli

6. **Given** `bypassGuards: false` olduğunda **When** `preserveGuards` dolu olsa bile **Then** triple-lock koşulu sağlanmadığı için guard'lara dokunulmamalı (mevcut davranış)

## Tasks / Subtasks

- [ ] Task 1: `har-mock-config.types.ts` güncelle — `preserveGuards` field ekle (AC: #1–#6)
  - [ ] Subtask 1.1: `HarMockConfig` interface'e `preserveGuards?: Array<Function | Type<unknown>>` ekle; JSDoc yorum ile hem class-based hem functional guard desteği belgele

- [ ] Task 2: `har-mock.initializer.ts` güncelle — filtreli bypass mantığı (AC: #1–#5)
  - [ ] Subtask 2.1: `filterGuards(guards: any[] | undefined, preserve: Array<Function | Type<unknown>>): any[]` yardımcı fonksiyon ekle — `guards` boşsa `[]` döndür; `preserve` boşsa `[]` döndür; değilse `guards.filter(g => preserve.includes(g))` döndür
  - [ ] Subtask 2.2: `clearGuardsRecursively` imzasını `(routes: Route[], preserve: Array<Function | Type<unknown>>): void` olarak güncelle; içeriği `route.canActivate = []` yerine `route.canActivate = filterGuards(route.canActivate, preserve)` olarak değiştir; `canDeactivate` ve `canMatch` için de aynısını yap; recursive çağrıya `preserve` geçir
  - [ ] Subtask 2.3: `harMockGuardBypassFactory` içinde `config.preserveGuards` okuyarak `clearGuardsRecursively` ve `RouteConfigLoadEnd` subscription'a geçir

- [ ] Task 3: `provide-har-mock.ts` güncelle — `preserveGuards` default değer (AC: #3)
  - [ ] Subtask 3.1: `resolved` objesine `preserveGuards: config?.preserveGuards ?? []` ekle

- [ ] Task 4: `har-mock.initializer.spec.ts` güncelle — yeni AC'ler için testler (AC: #1–#6)
  - [ ] Subtask 4.1: Test AC1: `preserveGuards: [mockAuthGuard]` → `mockAuthGuard` tüm route'larda kalır; `mockAdminGuard` temizlenir
  - [ ] Subtask 4.2: Test AC2: `preserveGuards: [mockAuthGuard, mockAdminGuard]` → ikisi de kalır; `mockUnsavedGuard` temizlenir
  - [ ] Subtask 4.3: Test AC3: `preserveGuards` verilmemişken (eski testler geçmeli — regresyon yok)
  - [ ] Subtask 4.4: Test AC4: Functional guard referansı `preserveGuards`'a geçirildiğinde korunur; farklı fn referansı geçirildiğinde temizlenir
  - [ ] Subtask 4.5: Test AC5: `RouteConfigLoadEnd` sonrası lazy route'larda da `preserveGuards` uygulanır
  - [ ] Subtask 4.6: Test AC6: `bypassGuards: false` iken `preserveGuards` dolu olsa dahi route config değişmez

- [ ] Task 5: Tüm testleri çalıştır — 0 regresyon doğrula (AC: #1–#6)
  - [ ] Subtask 5.1: `yarn workspace har-mock-plugin test` → tüm testler geçmeli
  - [ ] Subtask 5.2: `yarn workspace @har-mock/core test` → regresyon yok
  - [ ] Subtask 5.3: `yarn workspace @har-mock/extension test` → regresyon yok

## Dev Notes

### Mimari: Filtreli Guard Bypass

**Temel Değişiklik:** `clearGuardsRecursively` artık tüm guard'ları silmek yerine yalnızca `preserveGuards` listesinde olmayanları siler.

**filterGuards mantığı:**
```typescript
function filterGuards(
  guards: any[] | undefined,
  preserve: Array<Function | Type<unknown>>
): any[] {
  if (!guards?.length) return [];
  if (!preserve.length) return [];        // preserve boşsa → tümünü temizle (eski davranış)
  return guards.filter(g => preserve.includes(g)); // preserve doluysa → sadece listedekiler kalır
}
```

**Güncellenen clearGuardsRecursively:**
```typescript
function clearGuardsRecursively(
  routes: Route[],
  preserve: Array<Function | Type<unknown>>
): void {
  for (const route of routes) {
    route.canActivate   = filterGuards(route.canActivate,   preserve);
    route.canDeactivate = filterGuards(route.canDeactivate, preserve);
    route.canMatch      = filterGuards(route.canMatch,      preserve);
    if (route.children?.length) {
      clearGuardsRecursively(route.children, preserve);
    }
  }
}
```

**Güncellenen harMockGuardBypassFactory:**
```typescript
export function harMockGuardBypassFactory(): () => void {
  const config = inject(HAR_MOCK_CONFIG);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  return () => {
    if (!isDevMode() || !config.enabled || !config.bypassGuards) return;

    const preserve = config.preserveGuards; // Array<Function | Type<unknown>>

    try {
      clearGuardsRecursively(router.config, preserve);

      router.events
        .pipe(filter(e => e instanceof RouteConfigLoadEnd), takeUntilDestroyed(destroyRef))
        .subscribe(() => clearGuardsRecursively(router.config, preserve));
    } catch (e) {
      console.warn('[HarMock] Guard bypass failed:', e);
    }
  };
}
```

### Tip Tercihi: `Array<Function | Type<unknown>>`

- **Class-based guard:** `route.canActivate` içinde class token bulunur → `preserve.includes(GuardClass)` ✅
- **Functional guard:** `route.canActivate` içinde fn referansı bulunur → `preserve.includes(guardFn)` ✅
- `any[]` yerine `Array<Function | Type<unknown>>` tercih edilir — daha güvenli, Angular'ın guard type'larına uyumlu

**Uyarı (Dev Notes):** Functional guard'lar için kullanıcı aynı referansı `preserveGuards`'a geçirmelidir.
```typescript
// DOĞRU — aynı referans
const bssGuard = () => true;
provideHarMock({ bypassGuards: true, preserveGuards: [bssGuard] })

// YANLIŞ — farklı referans, includes() false döner
provideHarMock({ bypassGuards: true, preserveGuards: [() => true] })
```

### Geriye Uyumluluk

`preserveGuards` verilmemişse default `[]` olur. `filterGuards` içindeki `if (!preserve.length) return []` dalı tüm guard'ları temizler — Story 5.4 davranışı birebir korunur.

### Test Şablonu — Yeni Test Senaryoları

```typescript
const mockAuthGuard   = jest.fn(() => true);
const mockAdminGuard  = jest.fn(() => true);
const mockBssGuard    = jest.fn(() => true);

const mockRoutes: Route[] = [
  {
    path: 'admin',
    canActivate:  [mockAuthGuard, mockBssGuard],
    canDeactivate: [mockAuthGuard],
    children: [
      {
        path: 'users',
        canActivate: [mockAdminGuard, mockBssGuard],
        canMatch:    [mockAdminGuard],
      },
    ],
  },
];

// AC1 doğrulama: preserveGuards: [mockBssGuard]
expect(mockRoutes[0]!.canActivate).toEqual([mockBssGuard]);  // auth temizlendi, bss kaldı
expect(mockRoutes[0]!.canDeactivate).toEqual([]);            // auth temizlendi
expect(mockRoutes[0]!.children![0]!.canActivate).toEqual([mockBssGuard]); // recursive
expect(mockRoutes[0]!.children![0]!.canMatch).toEqual([]);   // adminGuard temizlendi
```

### Değiştirilecek Dosyalar

```
packages/angular-plugin/src/
└── lib/
    ├── initializer/
    │   ├── har-mock.initializer.ts       ← GÜNCELLENECEk (filterGuards + preserve parametre)
    │   └── har-mock.initializer.spec.ts  ← GÜNCELLENECEk (yeni AC testleri)
    ├── provider/
    │   └── provide-har-mock.ts           ← GÜNCELLENECEk (preserveGuards default)
    └── types/
        └── har-mock-config.types.ts      ← GÜNCELLENECEk (preserveGuards field)
```

### Kapsam Sınırları — Bu Story'de DOKUNULMAYACAK

| Dosya | Neden |
|-------|-------|
| `initializer/index.ts` | Export değişmiyor — `harMockGuardBypassFactory` zaten export'lu |
| `interceptor/**` | Guard mantığıyla ilgisi yok |
| `packages/core/**` | Core değişiklik gerektirmez |
| `packages/extension/**` | Extension değişiklik gerektirmez |

### Story 5.4'ten Kritik Öğrenmeler

| Kural | Açıklama |
|-------|----------|
| `isDevMode` mock hoisting | `jest.mock('@angular/core', ...)` dosyanın EN ÜSTÜNDE |
| `afterEach` mock reset | `isDevMode.mockReturnValue(true)` her testten sonra |
| `teardown: { destroyAfterEach: true }` | Tüm `TestBed.configureTestingModule` çağrılarına |
| `noUncheckedIndexedAccess` | `routes[0]!` non-null assertion kullan |
| Triple-lock korunur | `!isDevMode() || !config.enabled || !config.bypassGuards` değişmez |

### References

- [Story 5.4](./5-4-guard-bypass-mekanizmasi.md) — temel guard bypass implementasyonu
- [har-mock.initializer.ts](../../packages/angular-plugin/src/lib/initializer/har-mock.initializer.ts) — güncellenecek dosya
- [har-mock-config.types.ts](../../packages/angular-plugin/src/lib/types/har-mock-config.types.ts) — güncellenecek tip tanımı
- [provide-har-mock.ts](../../packages/angular-plugin/src/lib/provider/provide-har-mock.ts) — güncellenecek provider

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

_to be filled_

### Completion Notes List

_to be filled_

### File List

- `packages/angular-plugin/src/lib/types/har-mock-config.types.ts`
- `packages/angular-plugin/src/lib/initializer/har-mock.initializer.ts`
- `packages/angular-plugin/src/lib/initializer/har-mock.initializer.spec.ts`
- `packages/angular-plugin/src/lib/provider/provide-har-mock.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-02-28: Story 5.5 oluşturuldu — preserveGuards seçici guard bypass özelliği (SCRUM-33)
