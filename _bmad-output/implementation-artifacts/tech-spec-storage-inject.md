---
title: 'Storage Inject — localStorage/sessionStorage Manuel Key-Value Injection'
slug: 'storage-inject'
created: '2026-03-03'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack:
  - TypeScript
  - Angular 17 (Signals, standalone components)
  - Chrome Extension MV3
  - chrome.storage.local
  - window.postMessage (MAIN ↔ ISOLATED world bridge)
files_to_modify:
  - packages/extension/src/shared/state.types.ts
  - packages/extension/src/shared/constants.ts
  - packages/extension/src/shared/messaging.types.ts
  - packages/extension/src/shared/payload.types.ts
  - packages/extension/src/shared/index.ts
  - packages/extension/src/background/state-manager.ts
  - packages/extension/src/background/message-handler.ts
  - packages/extension/src/content/window-messaging.types.ts
  - packages/extension/src/content/content.ts
  - packages/extension/src/content/interceptor.ts
  - packages/extension/src/popup/components/controls-tab/controls-tab.component.ts
  - packages/angular-plugin/src/lib/types/har-mock-config.types.ts
  - packages/angular-plugin/src/lib/provider/provide-har-mock.ts
  - packages/angular-plugin/src/public-api.ts
files_to_create:
  - packages/extension/src/popup/components/storage-inject/storage-inject.component.ts
  - packages/extension/src/popup/components/storage-inject/storage-inject.component.spec.ts
  - packages/angular-plugin/src/lib/initializer/har-mock-storage.initializer.ts
  - packages/angular-plugin/src/lib/initializer/har-mock-storage.initializer.spec.ts
code_patterns:
  - Angular Signals (signal, computed, input, output)
  - ChangeDetectionStrategy.OnPush
  - switch/case dispatch (if/else YASAK — mevcut message-handler kuralı)
  - chrome.storage.local persist + in-memory cache hibrit
  - window.postMessage MAIN ↔ ISOLATED world bridge
  - makeEnvironmentProviders + APP_INITIALIZER factory pattern (Angular plugin)
test_patterns:
  - Jest
  - Angular TestBed standalone component
  - chrome.runtime mock (mevcut test pattern)
---

# Tech-Spec: Storage Inject — localStorage/sessionStorage Manuel Key-Value Injection

**Created:** 2026-03-03

---

## Overview

### Problem Statement

Extension kullanıcıları ve Angular plugin geliştiricileri, test/geliştirme süreçlerinde sayfanın localStorage veya sessionStorage'ına belirli key-value çiftleri yazmak istemektedir. Şu anda bu işlem için browser DevTools'u manuel açmak gerekiyor. HAR mock ile aynı iş akışında storage inject de yapılabilmeli.

### Solution

**Extension:** Popup'a yeni bir "Storage" accordion'ı eklenir. Kullanıcı manuel key-value çiftleri girer, her biri için `localStorage` veya `sessionStorage` tipini seçer. Değerler background'a (`chrome.storage.local`) persist edilir. Her sayfa yüklendiğinde content script bu değerleri MAIN world interceptor'a iletir; interceptor önceki inject'leri temizleyip yeni değerleri yazar.

**Angular Plugin:** `provideHarMock()` config'ine yeni `storageEntries` alanı eklenir. `APP_INITIALIZER` factory bu değerleri, uygulama bootstrap öncesinde, `localStorage`/`sessionStorage`'a yazar.

### Scope

**In Scope:**
- `localStorage` ve `sessionStorage` için ayrı ayrı key-value çifti desteği (string key, any-string value)
- Popup'ta yeni "Storage" accordion bileşeni: key/value/type giriş formu + liste
- Değerlerin `chrome.storage.local`'de persist edilmesi (HAR/rules gibi)
- Sayfa yüklendiğinde (`document_start`) otomatik inject: önceki inject'ler temizlenir, yeni değerler yazılır
- Scope: extension aktifken tüm sayfalar (`<all_urls>`) — HAR mock ile aynı mantık
- Angular plugin `provideHarMock()` config'ine `storageEntries` alanı
- Angular plugin `APP_INITIALIZER` ile bootstrap öncesi synchronous inject
- `StorageEntry` tipinin `@har-mock/angular-plugin` public API'sinden export edilmesi

**Out of Scope:**
- HAR dosyasından otomatik storage entry okuma
- Storage değerlerinin sayfaya inject sonrası canlı güncellenmesi (hot reload değil, yalnızca sayfa yüklenmesinde)
- Cookie inject
- Storage değeri için JSON parse/format doğrulaması (ham string olarak yazılır)
- Per-domain storage inject (tüm sayfalara aynı değerler uygulanır)

---

## Context for Development

### Codebase Patterns

**Messaging Mimarisi:**
- Popup ↔ Background: `chrome.runtime.Port` (long-lived), `MessageType` enum, switch/case dispatch — `if/else YASAK`
- MAIN ↔ ISOLATED: `window.postMessage` + `HAR_MOCK_CHANNEL`, `WindowMatchQuery/Result` tip ayrımı
- Yeni mesaj tipleri her zaman hem `MessageType` enum hem payload types'a eklenir
- Background'dan popup'a reaktif push: her mutasyondan sonra `portManager.getPopupPort()?.postMessage(STATE_SYNC + getFullState())`

**State Mimarisi:**
- `ExtensionState` tek in-memory kayıt — her alan `chrome.storage.local`'da ayrı key altında persist edilir
- `StateManager.initialize()` startup'ta tüm keyleri yükler
- `StateSyncPayload` = `ExtensionState`'in popup'a giden serialized formu — her yeni state field buraya da eklenir

**Popup Bileşen Mimarisi:**
- Angular standalone + `ChangeDetectionStrategy.OnPush`
- `AccordionComponent` — `persistKey` input'u ile localStorage accordion state persist
- `controls-tab.component.ts` içinde tüm accordion'lar sıralanır, `ExtensionMessagingService.state()` signal'dan veri okunur
- Yeni bileşenler `components/<feature>/` altında oluşturulur

**Angular Plugin Mimarisi:**
- `provideHarMock(config)` → `makeEnvironmentProviders` içinde `APP_INITIALIZER` factory'ler `multi: true` ile kayıtlıdır
- Mevcut initializer'lar (`harMockGuardBypassFactory`, HAR loader) model alınır
- Triple-lock pattern: `!isDevMode() || !config.enabled` → erken return

**window.postMessage Bridge:**
- `window-messaging.types.ts` tüm `WindowMessage` union tiplerini tanımlar
- MAIN world (`interceptor.ts`) window message listener'larla güçlendirilir
- Kanal: `HAR_MOCK_CHANNEL = '__HAR_MOCK__'` — tüm MAIN ↔ ISOLATED mesajları bu kanalı kullanır

### Files to Reference

| Dosya | Amaç |
|-------|------|
| `packages/extension/src/shared/state.types.ts` | `ExtensionState` — yeni field ekleme referansı |
| `packages/extension/src/shared/constants.ts` | `STORAGE_KEYS`, `DEFAULT_SETTINGS` |
| `packages/extension/src/shared/messaging.types.ts` | `MessageType` enum |
| `packages/extension/src/shared/payload.types.ts` | Payload + `StateSyncPayload` |
| `packages/extension/src/background/state-manager.ts` | State persist/load pattern |
| `packages/extension/src/background/message-handler.ts` | switch/case dispatch pattern |
| `packages/extension/src/content/window-messaging.types.ts` | MAIN↔ISOLATED tip tanımları |
| `packages/extension/src/content/content.ts` | ISOLATED world STATE_SYNC → MAIN world forward |
| `packages/extension/src/content/interceptor.ts` | MAIN world entry — window.postMessage listener ekleme yeri |
| `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` | Accordion şablonu |
| `packages/extension/src/popup/components/accordion/accordion.component.ts` | Accordion API |
| `packages/extension/src/popup/services/extension-messaging.service.ts` | `sendMessage` + `state()` signal |
| `packages/angular-plugin/src/lib/provider/provide-har-mock.ts` | `APP_INITIALIZER` factory kayıt şablonu |
| `packages/angular-plugin/src/lib/types/har-mock-config.types.ts` | `HarMockConfig` genişletme |
| `packages/angular-plugin/src/lib/initializer/har-mock.initializer.ts` | Initializer factory şablonu |

### Technical Decisions

1. **`StorageEntry` tipi shared/state.types.ts'de tanımlanır:** Her iki taraf (extension + angular plugin) bu paketi kullanmıyor; extension'da `shared/state.types.ts`, angular plugin'de kendi types'ında ayrı ama özdeş interface tanımlanır.

2. **MAIN world inject zamanlaması:** `document_start` + async background yanıtı. ISOLATED world STATE_SYNC aldıktan hemen sonra `STORAGE_INJECT` postMessage atar. Bu, SPA framework'lerin büyük çoğunluğu için yeterli erken zamanlama sağlar. Bilinen kısıt: sayfa JS'inin `document_start` anında senkron localStorage okumalarının önüne geçilemez (edge case, dokümantasyonda not düşülür).

3. **"Silinip üzerine yazılsın" implement stratejisi:** MAIN world'de module-level `injectedKeys: Array<{key: string; type: 'localStorage'|'sessionStorage'}>` tutulur. Her `STORAGE_INJECT` geldiğinde önceki injected key'ler silinir, `injectedKeys` sıfırlanır, yeni değerler yazılır.

4. **Angular plugin inject zamanlaması:** `APP_INITIALIZER` synchronous çalışır — Angular bootstrap öncesi garantili. Angular'ın kendi localStorage okumaları (router state etc.) bu inject'ten sonra gelir. ✅

5. **Value formatı:** Ham string — kullanıcı isterse JSON string girer, JSON string yazılır. Parse/validate yapılmaz. Bu kasıtlı bir sadeleştirme kararıdır.

6. **`resetAll` davranışı:** Accordion states gibi storage entries de silinir (`resetAll` tam sıfırlama içerir).

---

## Implementation Plan

### Tasks

**Grup 1 — Shared Types & Constants (Extension)**

- [x] **Task 1:** `StorageEntry` interface + `STORAGE_KEYS.STORAGE_ENTRIES` sabiti ekle
  - Dosya: `packages/extension/src/shared/state.types.ts`
  - Aksiyon: Dosyanın üstüne `StorageEntry` interface'i ekle:
    ```typescript
    export interface StorageEntry {
      readonly key: string;
      readonly value: string;
      readonly type: 'localStorage' | 'sessionStorage';
    }
    ```
  - Aksiyon: `ExtensionState`'e `storageEntries: readonly StorageEntry[]` field'ı ekle.

- [x] **Task 2:** `STORAGE_KEYS.STORAGE_ENTRIES` sabiti ekle
  - Dosya: `packages/extension/src/shared/constants.ts`
  - Aksiyon: `STORAGE_KEYS` objesine `STORAGE_ENTRIES: 'storageEntries'` ekle.

- [x] **Task 3:** Yeni `MessageType` + payload tipleri ekle
  - Dosya: `packages/extension/src/shared/messaging.types.ts`
  - Aksiyon: `MessageType` enum'a ekle:
    ```typescript
    UPDATE_STORAGE_ENTRIES = 'UPDATE_STORAGE_ENTRIES',
    ```
  - Dosya: `packages/extension/src/shared/payload.types.ts`
  - Aksiyon: Yeni payload interface'i ekle:
    ```typescript
    export interface UpdateStorageEntriesPayload {
      readonly entries: readonly StorageEntry[];
    }
    ```
  - Aksiyon: `StateSyncPayload`'a `storageEntries: readonly StorageEntry[]` field'ı ekle.
  - Aksiyon: `StorageEntry`'yi `state.types.ts`'den import et.

- [x] **Task 4:** Barrel export'ları güncelle
  - Dosya: `packages/extension/src/shared/index.ts`
  - Aksiyon: `StorageEntry`, `UpdateStorageEntriesPayload` tiplerini export listesine ekle.

**Grup 2 — Background (Extension)**

- [x] **Task 5:** `StateManager`'a storage entries yönetimi ekle
  - Dosya: `packages/extension/src/background/state-manager.ts`
  - Aksiyon: `initialize()` metoduna — mevcut accordion states bloğunun hemen ardına — şu bloğu ekle:
    ```typescript
    const storageEntries = result[STORAGE_KEYS.STORAGE_ENTRIES] as StorageEntry[] | undefined;
    if (storageEntries !== undefined) {
      this.state.storageEntries = storageEntries;
    }
    ```
  - Aksiyon: `getDefaultState()` içinde `storageEntries: []` ekle.
  - Aksiyon: `getFullState()` dönüş objesine `storageEntries: this.state.storageEntries` ekle.
  - Aksiyon: `resetAll()` içinde `chrome.storage.local.remove` array'ine `STORAGE_KEYS.STORAGE_ENTRIES` ekle ve `this.state.storageEntries = []` sat.
  - Aksiyon: Yeni metod ekle:
    ```typescript
    getStorageEntries(): readonly StorageEntry[] {
      return this.state.storageEntries;
    }
    async setStorageEntries(entries: readonly StorageEntry[]): Promise<void> {
      this.state.storageEntries = entries;
      await this.persistToStorage(STORAGE_KEYS.STORAGE_ENTRIES, entries);
    }
    ```

- [x] **Task 6:** `message-handler.ts`'e `UPDATE_STORAGE_ENTRIES` case'i ekle
  - Dosya: `packages/extension/src/background/message-handler.ts`
  - Aksiyon: `switch` bloğuna yeni case ekle (RESET_ALL case'inden önce):
    ```typescript
    case MessageType.UPDATE_STORAGE_ENTRIES: {
      try {
        const { entries } = message.payload as UpdateStorageEntriesPayload;
        await stateManager.setStorageEntries(entries);
        port.postMessage({
          type: MessageType.UPDATE_STORAGE_ENTRIES,
          payload: { success: true },
          requestId: message.requestId,
        });
        portManager.getPopupPort()?.postMessage({
          type: MessageType.STATE_SYNC,
          payload: stateManager.getFullState(),
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.UPDATE_STORAGE_ENTRIES,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }
    ```
  - Aksiyon: `UpdateStorageEntriesPayload` import'unu dosyanın üstüne ekle.

**Grup 3 — Content Scripts (Extension)**

- [x] **Task 7:** `window-messaging.types.ts`'e `WindowStorageInject` tipi ekle
  - Dosya: `packages/extension/src/content/window-messaging.types.ts`
  - Aksiyon: Yeni interface ekle:
    ```typescript
    export interface WindowStorageInject {
      readonly channel: typeof HAR_MOCK_CHANNEL;
      readonly type: 'STORAGE_INJECT';
      readonly entries: ReadonlyArray<{
        readonly key: string;
        readonly value: string;
        readonly type: 'localStorage' | 'sessionStorage';
      }>;
    }
    ```
  - Aksiyon: `WindowMessage` union'a `| WindowStorageInject` ekle.

- [x] **Task 8:** `content.ts`'de STATE_SYNC alındığında storage entries'i MAIN world'e forward et
  - Dosya: `packages/extension/src/content/content.ts`
  - Aksiyon: `onPortMessage` fonksiyonundaki `MessageType.MATCH_RESULT` case'inin hemen ardına yeni case ekle:
    ```typescript
    case MessageType.STATE_SYNC: {
      const payload = message.payload as { storageEntries?: ReadonlyArray<{ key: string; value: string; type: 'localStorage' | 'sessionStorage' }> };
      const storageEntries = payload?.storageEntries ?? [];
      const inject: WindowStorageInject = {
        channel: HAR_MOCK_CHANNEL,
        type: 'STORAGE_INJECT',
        entries: storageEntries,
      };
      window.postMessage(inject, '*');
      break;
    }
    ```
  - Aksiyon: `WindowStorageInject` import'unu `window-messaging.types.ts`'den ekle.
  - Aksiyon: `StateSyncPayload` import'unu `shared/payload.types.ts`'den ekle.
  - Not: `content.ts`'deki ilk STATE_SYNC isteği popup açılışında değil, content script connect anında yapılmaz. Ancak background'dan `STATE_SYNC` push'u sadece popup portuna gidiyor. Content script'e inject için ayrı bir mekanizma gerekir — aşağıya bakınız.

  > **Önemli Mimari Nüans:** Mevcut mimari incelendiğinde, content script'in background'dan STATE_SYNC alması için `MessageType.STATE_SYNC` isteği content portuna da gönderilmeli. Background `message-handler.ts`'de **content port'tan gelen STATE_SYNC isteğine** de yanıt verilmesi gerekir.
  >
  > Ancak daha temiz ve minimal değişiklik gerektiren yaklaşım: Background, `page load` olayında (content port bağlandığında, yani `chrome.runtime.onConnect` tetiklendiğinde) storage entries'i content port'a otomatik push eder.

- [x] **Task 8 (Revize):** Content port bağlandığında background, storage entries'i otomatik push eder
  - Dosya: `packages/extension/src/background/background.ts`
  - Aksiyon: `chrome.runtime.onConnect.addListener` callback'i içinde, port name `PORT_NAME_CONTENT_PREFIX` ile başlıyorsa storage entries push et:
    ```typescript
    chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
      portManager.registerPort(port);

      // Content script bağlandığında storage entries push et
      if (port.name.startsWith(PORT_NAME_CONTENT_PREFIX)) {
        const entries = stateManager.getStorageEntries();
        port.postMessage({
          type: MessageType.STORAGE_PUSH,
          payload: { entries },
        } as Message<{ entries: readonly StorageEntry[] }>);
      }

      port.onDisconnect.addListener(() => { ... });
      port.onMessage.addListener((message: Message) => { ... });
    });
    ```
  - Aksiyon: Yeni `MessageType.STORAGE_PUSH` ekle (background → content tek yönlü push için, UPDATE ile karışmaması adına).
  - Dosya: `packages/extension/src/shared/messaging.types.ts`
  - Aksiyon: `MessageType.STORAGE_PUSH = 'STORAGE_PUSH'` ekle.
  - Dosya: `packages/extension/src/content/content.ts`
  - Aksiyon: `onPortMessage` switch'ine case ekle:
    ```typescript
    case MessageType.STORAGE_PUSH: {
      const { entries } = message.payload as { entries: ReadonlyArray<{ key: string; value: string; type: 'localStorage' | 'sessionStorage' }> };
      const inject: WindowStorageInject = {
        channel: HAR_MOCK_CHANNEL,
        type: 'STORAGE_INJECT',
        entries,
      };
      window.postMessage(inject, '*');
      break;
    }
    ```
  - **Ayrıca:** Popup storage entries güncellediğinde, background tüm content port'larına yeni entries'i push etmeli. `message-handler.ts`'deki `UPDATE_STORAGE_ENTRIES` case'ine:
    ```typescript
    // Tüm content port'larına yeni entries'i push et (canlı tab'lar için)
    portManager.broadcastToContentPorts({
      type: MessageType.STORAGE_PUSH,
      payload: { entries },
    });
    ```
  - Dosya: `packages/extension/src/background/port-manager.ts`
  - Aksiyon: `broadcastToContentPorts(message: Message): void` metodu ekle — `PORT_NAME_CONTENT_PREFIX` ile başlayan tüm port'lara mesaj gönderir.

- [x] **Task 9:** `interceptor.ts`'de `STORAGE_INJECT` mesajını dinle ve inject uygula
  - Dosya: `packages/extension/src/content/interceptor.ts`
  - Aksiyon: Module düzeyinde `injectedKeys` array'i tanımla ve `window.addEventListener` ekle:
    ```typescript
    // Module-level inject tracker
    const injectedKeys: Array<{ key: string; type: 'localStorage' | 'sessionStorage' }> = [];

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as Record<string, unknown> | undefined;
      if (data?.['channel'] !== '__HAR_MOCK__') return;
      if (data?.['type'] !== 'STORAGE_INJECT') return;

      // Önceki inject'leri temizle
      for (const { key, type } of injectedKeys) {
        if (type === 'localStorage') {
          window.localStorage.removeItem(key);
        } else {
          window.sessionStorage.removeItem(key);
        }
      }
      injectedKeys.length = 0;

      // Yeni değerleri yaz
      const entries = (data['entries'] as Array<{ key: string; value: string; type: 'localStorage' | 'sessionStorage' }>) ?? [];
      for (const entry of entries) {
        if (entry.type === 'localStorage') {
          window.localStorage.setItem(entry.key, entry.value);
        } else {
          window.sessionStorage.setItem(entry.key, entry.value);
        }
        injectedKeys.push({ key: entry.key, type: entry.type });
      }
    });
    ```
  - Not: `'__HAR_MOCK__'` string literal kullanılır çünkü bu MAIN world script `HAR_MOCK_CHANNEL` import'a erişimi yok — ya sabit string kullanılır ya da `window-messaging.types.ts`'den import edilir. `interceptor.ts`'in mevcut import'larına bakılarak uygun yol belirlenir.

**Grup 4 — Port Manager Güncelleme**

- [x] **Task 10:** `PortManager`'a `broadcastToContentPorts` ekle
  - Dosya: `packages/extension/src/background/port-manager.ts` (önce okunacak)
  - Aksiyon: Tüm content portlarına broadcast eden yeni metod ekle.

**Grup 5 — Popup UI (Extension)**

- [x] **Task 11:** `StorageInjectComponent` oluştur
  - Dosya: `packages/extension/src/popup/components/storage-inject/storage-inject.component.ts` (YENİ)
  - Aksiyon: Standalone Angular bileşeni, `ChangeDetectionStrategy.OnPush`:
    - `entries = signal<Array<{ key: string; value: string; type: 'localStorage' | 'sessionStorage' }>>([])` — mevcut entries listesi
    - `newKey = signal('')`, `newValue = signal('')`, `newType = signal<'localStorage'|'sessionStorage'>('localStorage')` — form alanları
    - `onAdd()` metodu: `newKey()` boş değilse entries'e ekle, form'u sıfırla
    - `onRemove(index: number)` metodu: entries'den index'teki kaydı çıkar
    - `onSave()` metodu: `ExtensionMessagingService.sendMessage(MessageType.UPDATE_STORAGE_ENTRIES, { entries: this.entries() }, crypto.randomUUID())` çağrısı
    - `input()` ile dışarıdan initial entries alır (STATE_SYNC'ten gelen değerler)
    - Template: Mevcut `HmExcludeListComponent` görsel stilini referans al — basit list + form
    - Type seçici: iki `<button>` toggle — "localStorage" / "sessionStorage" — `bg-indigo-600` aktif stil

- [x] **Task 12:** `controls-tab.component.ts`'ye "Storage" accordion'ı ekle
  - Dosya: `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts`
  - Aksiyon: Import listesine `StorageInjectComponent` ekle.
  - Aksiyon: `storageEntries = computed(() => this.messaging.state()?.storageEntries ?? [])` ekle.
  - Aksiyon: Template'e yeni accordion ekle (Rules'tan sonra, Settings'ten önce):
    ```html
    <hm-accordion
      title="Storage"
      [expanded]="false"
      persistKey="storage"
      [badge]="storageEntries().length > 0 ? storageEntries().length.toString() : ''"
      [badgeVariant]="storageEntries().length > 0 ? 'info' : 'default'"
    >
      <hm-storage-inject
        [entries]="storageEntries()"
      />
    </hm-accordion>
    ```

**Grup 6 — Angular Plugin**

- [x] **Task 13:** `StorageEntry` tipini Angular plugin types'a ekle
  - Dosya: `packages/angular-plugin/src/lib/types/har-mock-config.types.ts`
  - Aksiyon: Dosyanın başına ekle:
    ```typescript
    export interface StorageEntry {
      readonly key: string;
      readonly value: string;
      readonly type: 'localStorage' | 'sessionStorage';
    }
    ```
  - Aksiyon: `HarMockConfig` interface'ine yeni opsiyonel field ekle:
    ```typescript
    /**
     * Sayfa yüklenmesinde localStorage/sessionStorage'a inject edilecek key-value çiftleri.
     * Her kayıt için type 'localStorage' veya 'sessionStorage' olarak belirtilir.
     * Önceki inject edilen değerler temizlenir; yeni değerler yazılır.
     * @default []
     */
    storageEntries?: StorageEntry[];
    ```

- [x] **Task 14:** `har-mock-storage.initializer.ts` oluştur
  - Dosya: `packages/angular-plugin/src/lib/initializer/har-mock-storage.initializer.ts` (YENİ)
  - Aksiyon: `APP_INITIALIZER` factory oluştur:
    ```typescript
    import { inject, isDevMode } from '@angular/core';
    import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

    export function harMockStorageInitializerFactory(): () => void {
      const config = inject(HAR_MOCK_CONFIG);
      return () => {
        // Double-lock: production'da veya devre dışıysa inject yapma
        if (!isDevMode() || !config.enabled) return;

        const entries = config.storageEntries ?? [];
        if (entries.length === 0) return;

        for (const entry of entries) {
          try {
            if (entry.type === 'localStorage') {
              localStorage.setItem(entry.key, entry.value);
            } else {
              sessionStorage.setItem(entry.key, entry.value);
            }
          } catch (e) {
            console.warn(`[HarMock] Storage inject failed for key "${entry.key}":`, e);
          }
        }
      };
    }
    ```
  - Not: Angular plugin'de "silinip üzerine yazılsın" davranışı: `APP_INITIALIZER` her uygulama bootstrap'ında çalışır — SPA'larda sayfa reload ile bir kez çalışır. "Önceki inject temizle" gereksinimi burada geçerli değil (extension gibi canlı re-inject senaryosu yok). Ancak tutarlılık adına, aynı key için `setItem` zaten üzerine yazar.

- [x] **Task 15:** `provideHarMock`'a storage initializer'ı kaydet
  - Dosya: `packages/angular-plugin/src/lib/provider/provide-har-mock.ts`
  - Aksiyon: `resolved` objesine `storageEntries: config?.storageEntries ?? []` ekle.
  - Aksiyon: `makeEnvironmentProviders` array'ine yeni `APP_INITIALIZER` factory ekle:
    ```typescript
    {
      provide: APP_INITIALIZER,
      useFactory: harMockStorageInitializerFactory,
      multi: true,
    },
    ```
  - Aksiyon: `harMockStorageInitializerFactory` import'unu ekle.

- [x] **Task 16:** Public API export'larını güncelle
  - Dosya: `packages/angular-plugin/src/public-api.ts`
  - Aksiyon: `StorageEntry` ve `harMockStorageInitializerFactory` export'larını ekle:
    ```typescript
    export type { StorageEntry } from './lib/types/har-mock-config.types';
    ```

---

### Acceptance Criteria

**Extension — Veri Modeli**

- [ ] **AC 1:** Given extension fresh yüklendiğinde, when `chrome.storage.local` boşsa, then `stateManager.getStorageEntries()` boş array döner.

- [ ] **AC 2:** Given popup'ta Storage accordion'ında bir key-value çifti eklenip Save'e basıldığında, when arka planda `chrome.storage.local` kontrol edildiğinde, then `storageEntries` key'i altında girilen değer persist edilmiş olur.

- [ ] **AC 3:** Given persist edilmiş storage entries varken extension service worker yeniden başlatıldığında (SW idle timeout), when background yeni bir istek alıp `initialize()` çalıştırdığında, then storage entries kayıp olmadan geri yüklenir.

**Extension — Inject Davranışı**

- [ ] **AC 4:** Given popup'ta 2 localStorage ve 1 sessionStorage key girilip kaydedildiğinde, when yeni bir sayfa yüklendiğinde (`document_start`), then `window.localStorage.getItem(key)` ve `window.sessionStorage.getItem(key)` ilgili değerleri döner.

- [ ] **AC 5:** Given önceden inject edilmiş `foo=bar` localStorage key'i varken, when popup'ta bu key silinip Save'e basıldıktan sonra sayfa yenilendiğinde, then `window.localStorage.getItem('foo')` `null` döner (temizlendi).

- [ ] **AC 6:** Given aynı key için yeni bir value girilip Save'e basıldığında, when sayfa yenilendiğinde, then eski değer değil yeni değer geçerlidir.

- [ ] **AC 7:** Given Storage entry listesi boşken, when sayfa yüklendiğinde, then inject kodu çalışır ama hiçbir storage key'i değiştirilmez.

**Extension — Popup UI**

- [ ] **AC 8:** Given Controls tab açıldığında, when HAR ve Rules accordion'larından sonra bakıldığında, then "Storage" başlıklı yeni bir accordion görünür.

- [ ] **AC 9:** Given Storage accordion açıldığında, when key input, value input ve type toggle (localStorage/sessionStorage) doldurulup Add butonuna tıklandığında, then yeni satır listeye eklenir ve form alanları sıfırlanır.

- [ ] **AC 10:** Given listede en az bir entry varken, when o satırdaki sil ikonuna tıklandığında, then satır listeden kalkar.

- [ ] **AC 11:** Given entry count 3 iken, when accordion başlığına bakıldığında, then badge "3" gösterir.

- [ ] **AC 12:** Given key alanı boşken, when Add butonuna tıklandığında, then listeye hiçbir şey eklenmez (boş key kabul edilmez).

**Angular Plugin**

- [ ] **AC 13:** Given `provideHarMock({ storageEntries: [{ key: 'token', value: 'abc', type: 'localStorage' }] })` konfigürasyonunda, when Angular uygulaması bootstrap edildiğinde (`isDevMode()=true, enabled=true`), then `localStorage.getItem('token')` === `'abc'`.

- [ ] **AC 14:** Given `provideHarMock({ storageEntries: [...], enabled: false })` konfigürasyonunda, when Angular uygulaması bootstrap edildiğinde, then storage inject çalışmaz, localStorage değiştirilmez.

- [ ] **AC 15:** Given `provideHarMock({ storageEntries: [...] })` production build'inde (`isDevMode()=false`), when uygulama bootstrap edildiğinde, then storage inject çalışmaz (double-lock).

- [ ] **AC 16:** Given `storageEntries` config'de tanımlanmadığında, when `provideHarMock()` çağrıldığında, then hiçbir storage işlemi yapılmaz (default `[]`).

---

## Additional Context

### Dependencies

- Var olan Chrome Extension MV3 altyapısı (content_scripts, background SW, port messaging)
- Var olan Angular plugin `APP_INITIALIZER` altyapısı
- `packages/extension/src/background/port-manager.ts` (Task 10 için okunacak, `broadcastToContentPorts` eklenecek)
- `window.localStorage` ve `window.sessionStorage` Web API'leri — ek bağımlılık yok

### Testing Strategy

**Unit Tests:**

- `StorageInjectComponent` spec (`storage-inject.component.spec.ts`):
  - Add butonu boş key ile çalışmaz
  - Geçerli key/value eklendiğinde liste güncellenir
  - Remove ile doğru index silinir
  - Save çağrısında `ExtensionMessagingService.sendMessage` doğru payload ile çağrılır

- `StateManager` spec (mevcut `state-manager.spec.ts` varsa):
  - `setStorageEntries` persistence'ı test et
  - `resetAll` sonrası `getStorageEntries()` boş array döner

- `harMockStorageInitializerFactory` spec (`har-mock-storage.initializer.spec.ts`):
  - `isDevMode=true, enabled=true` → `localStorage.setItem` çağrılır
  - `isDevMode=false` → `localStorage.setItem` çağrılmaz
  - `enabled=false` → `localStorage.setItem` çağrılmaz
  - `storageEntries=[]` → setItem çağrılmaz

**Manuel Test:**
1. Extension'ı yükle, popup'u aç
2. Storage accordion'ı aç
3. `token` / `test_value` / `localStorage` ekle; `session_key` / `session_val` / `sessionStorage` ekle
4. Save'e bas
5. Herhangi bir sayfayı aç → DevTools Console'da `localStorage.getItem('token')` → `'test_value'`
6. `sessionStorage.getItem('session_key')` → `'session_val'`
7. Popup'ta `token` satırını sil, Save'e bas, sayfayı yenile → `localStorage.getItem('token')` → `null`

### Notes

- **Bilinen Kısıt (Edge Case):** Bir sayfa, `document_start` anında senkron olarak `localStorage`'dan okuma yapıyorsa (çok nadir, özellikle bazı eski SPA framework'leri), inject bu okumadan önce gerçekleşemez. Bu senaryoda kullanıcıya ek bir yenileme gerekecektir. Dokümantasyona not düşülmeli.
- **`resetAll` Davranışı:** "Tümünü Sıfırla" butonu storage entries'i de siler. Bu, HAR + rules + settings ile tutarlıdır.
- **Content port push:** Background yeni entries alındığında sadece popup'u değil, aktif tüm content port'larını da günceller. Bu sayede popup'ta yapılan değişiklik sayfanın yenilenmesine gerek kalmadan (açık tab'da) hemen inject edilir. Ancak inject MAIN world'e `STORAGE_INJECT` postMessage ile ulaşır — tab sayısı fazlaysa tüm açık tab'lara aynı anda inject yapılır.
- **Angular Plugin "Temizle" Semantiği:** Extension'da "silinip üzerine yazılsın" sayfa reload (content script yeniden çalışır) üzerinden sağlanır. Angular plugin'de APP_INITIALIZER her bootstrap'ta bir kez çalışır. Aynı config'le tekrar bootstrap olmaz — dolayısıyla "temizle" semantiği burada anlamsız; `setItem` zaten üzerine yazar. Config'den kaldırılan bir key'i önceki çalışmadan temizlemek için kullanıcı kendi kodunda yapmalıdır (out of scope).
