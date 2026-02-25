# Story 3.1: Background → Popup Live Feed Push

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want background SW'nin intercept edilen her request'i anlık olarak açık popup'a push etmesini,
so that Monitor tab'ı gerçek zamanlı request akışını canlı göstersin; developer "Acaba çalıştı mı?" diye merak etmesin.

## Acceptance Criteria

1. **Given** popup açık ve Monitor tab seçiliyken **When** content script bir request intercept ettiğinde **Then** background SW aynı anda popup port'una `MATCH_EVENT` mesajı push etmeli; mesaj URL, HTTP method, eşleşme sonucu (`'rule'` | `'har'` | `'passthrough'`) ve response özeti içermeli (FR22)

2. **Given** background SW popup port'una push gönderdiğinde **When** popup Angular service mesajı aldığında **Then** `matchHistory` signal güncellenebilmeli; Angular `OnPush` change detection tetiklenmeli; Monitor tab'ındaki liste anında güncellenmeli

3. **Given** popup kapalıyken request'ler intercept edildiğinde **When** popup daha sonra açıldığında **Then** `chrome.storage.local`'daki `matchHistory`'den son N request yüklenebilmeli; popup açılışında feed boş başlamamalı

## Tasks / Subtasks

- [x] Task 1: `ExtensionMessagingService` — `MATCH_EVENT` push handling (AC: #1, #2, #3)
  - [x] Subtask 1.1: `connect()` metodundaki `onMessage` listener'ına `MATCH_EVENT` case ekle:
    - Gelen `MatchEventPayload`'u alarak `_state` signal'indeki `matchHistory` array'ini güncelle
    - Yeni event'i listenin **başına** ekle (en yeni en üstte): `[newEvent, ...(prev.matchHistory ?? [])]`
    - MAX_MATCH_HISTORY (500) sınırına göre trim yap: `.slice(0, MAX_MATCH_HISTORY)`
    - `_state.update()` kullanarak immutable güncelleme yap (tüm state korunmalı)
  - [x] Subtask 1.2: Import ekle: `MAX_MATCH_HISTORY` from `../../shared/constants`
  - [x] Subtask 1.3: Import ekle: `MatchEventPayload` from `../../shared/payload.types`

- [x] Task 2: `MonitorTabComponent` — Feed UI implementasyonu (AC: #2, #3)
  - [x] Subtask 2.1: `inject(ExtensionMessagingService)` ve `matchHistory` computed signal:
    ```typescript
    readonly matchHistory = computed(() => this.messaging.state()?.matchHistory ?? []);
    ```
  - [x] Subtask 2.2: Template — `@if (matchHistory().length === 0)` → boş durum mesajı göster
  - [x] Subtask 2.3: Template — `@for (event of matchHistory())` → her satır için:
    - URL (truncated, max ~45 karakter, `title` attr ile full URL tooltip)
    - HTTP method badge (küçük gri pill)
    - Eşleşme durumu badge: "Rule ✓" yeşil, "HAR ✓" mavi, "Passthrough →" gri (UX3)
    - `[class]` binding ile badge renklerini `source` değerine göre uygula
  - [x] Subtask 2.4: Import: `ExtensionMessagingService`, `computed`, `inject` ekle
  - [x] Subtask 2.5: Scroll davranışı: feed container'ı `overflow-y-auto` + popup height constraint uyumu

- [x] Task 3: Unit Testler (AC: #1, #2, #3)
  - [x] Subtask 3.1: `extension-messaging.service.spec.ts` — MATCH_EVENT push handling:
    - `MATCH_EVENT` mesajı alındığında `state().matchHistory[0]` yeni event olmalı
    - Yeni event listenin başına eklenmeli (prepend)
    - `STATE_SYNC` olmadan MATCH_EVENT gelirse state null ise güvenli handle
    - 500+ event olduğunda slice ile trim edilmeli
  - [x] Subtask 3.2: `monitor-tab.component.spec.ts` — Feed UI testleri:
    - `matchHistory = []` → boş durum mesajı görünmeli
    - `matchHistory = [ruleEvent]` → "Rule ✓" badge'i ve URL görünmeli
    - `matchHistory = [harEvent]` → "HAR ✓" badge'i görünmeli
    - `matchHistory = [passthroughEvent]` → "Passthrough →" badge'i görünmeli
    - Feed uzadığında scroll container mevcut olmalı

## Dev Notes

### Kritik: Background Push %100 Hazır — Sadece Popup Tarafı Gerekli

Story 3.1'in **tüm background mantığı** Epic 2 story'lerinde zaten implementasyon yapılmış durumda. Bu story yalnızca **Popup Angular** katmanına MATCH_EVENT handling ve Monitor tab UI ekler.

| Özellik | Durum | Konum |
|---------|-------|-------|
| `MATCH_EVENT` mesaj tipi | ✅ Hazır | `messaging.types.ts` → `MessageType.MATCH_EVENT` |
| `MatchEventPayload` tipi | ✅ Hazır | `payload.types.ts` → `{id, url, method, source, statusCode?, timestamp}` |
| `MatchEvent` state tipi | ✅ Hazır | `state.types.ts` → `{id, url, method, source, timestamp, statusCode?}` |
| Background MATCH_EVENT push | ✅ Hazır | `message-handler.ts` — her MATCH_QUERY case'de `portManager.sendToPopup(MATCH_EVENT)` |
| Passthrough push | ✅ Hazır | `message-handler.ts:~130` — extension kapalı + exclude list |
| `addMatchEvent` + storage | ✅ Hazır | `state-manager.ts:156` — `chrome.storage.local`'e persist |
| `MAX_MATCH_HISTORY = 500` | ✅ Hazır | `constants.ts` |
| `matchHistory` in STATE_SYNC | ✅ Hazır | `StateSyncPayload` → popup açılışında history yüklenir |
| `portManager.sendToPopup()` | ✅ Hazır | `port-manager.ts` — silent if no popup port |
| `PortManager.getPopupPort()` | ✅ Hazır | `port-manager.ts` — popup kapalıysa undefined döner |

**Bu story sadece şu 3 dosyayı değiştirir:**
1. `packages/extension/src/popup/services/extension-messaging.service.ts`
2. `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts`
3. Test dosyaları (spec.ts)

### `ExtensionMessagingService` — MATCH_EVENT Handler Ekleme

**Mevcut `connect()` onMessage listener:**
```typescript
this.port.onMessage.addListener((msg: Message) => {
  if (msg.type === MessageType.STATE_SYNC) {
    this._state.set(msg.payload as StateSyncPayload);
  }
});
```

**Hedef yapı (switch/case ile — if/else YASAK):**
```typescript
this.port.onMessage.addListener((msg: Message) => {
  switch (msg.type) {
    case MessageType.STATE_SYNC:
      this._state.set(msg.payload as StateSyncPayload);
      break;
    case MessageType.MATCH_EVENT: {
      const event = msg.payload as MatchEventPayload;
      this._state.update((prev) => {
        if (prev === null) return prev;
        return {
          ...prev,
          matchHistory: [event, ...prev.matchHistory].slice(0, MAX_MATCH_HISTORY),
        };
      });
      break;
    }
  }
});
```

> **NOT:** `_state.update()` ile immutable güncelleme yapılmalı. `_state.set()` KULLANILMAMALI — diğer state alanları sıfırlanır.

> **NOT:** `MatchEventPayload` ve `MatchEvent` uyumludur — her ikisi de `{id, url, method, source, timestamp, statusCode?}` shape'ine sahip.

### `MonitorTabComponent` — Feed UI Tasarımı

```
Monitor Tab
├── @if (matchHistory().length === 0) → Empty State
│     └── SVG icon + "Henüz intercept yok" + "Sayfayı yenileyip bir istek başlatın."
└── @else → Feed List (scroll container)
      └── @for (event of matchHistory(); track event.id)
            └── Feed Row
                  ├── Method badge (gri pill — "GET", "POST", vb.)
                  ├── URL (truncated, title tooltip)
                  └── Source badge:
                        • source='rule'        → "Rule ✓"  bg-green-100 text-green-700
                        • source='har'         → "HAR ✓"   bg-blue-100  text-blue-700
                        • source='passthrough' → "→"       bg-slate-100 text-slate-500
```

**Örnek template iskelet:**
```html
@if (matchHistory().length === 0) {
  <!-- Mevcut empty state SVG + text — değiştirilmeden korunabilir -->
  <div class="flex flex-col items-center justify-center p-8 text-center">
    ...
    <p class="text-sm text-slate-500">Henüz intercept edilmiş request yok.</p>
    <p class="text-xs text-slate-400 mt-1">Sayfayı yenileyip bir istek başlatın.</p>
  </div>
} @else {
  <div class="overflow-y-auto divide-y divide-slate-100">
    @for (event of matchHistory(); track event.id) {
      <div class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
        <!-- Method badge -->
        <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
          {{ event.method }}
        </span>
        <!-- URL -->
        <span
          class="flex-1 min-w-0 truncate text-xs text-slate-700"
          [title]="event.url"
        >{{ event.url }}</span>
        <!-- Source badge -->
        <span
          class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          [class.bg-green-100]="event.source === 'rule'"
          [class.text-green-700]="event.source === 'rule'"
          [class.bg-blue-100]="event.source === 'har'"
          [class.text-blue-700]="event.source === 'har'"
          [class.bg-slate-100]="event.source === 'passthrough'"
          [class.text-slate-500]="event.source === 'passthrough'"
        >
          @if (event.source === 'rule') { Rule ✓ }
          @else if (event.source === 'har') { HAR ✓ }
          @else { → }
        </span>
      </div>
    }
  </div>
}
```

### Test Pattern — ExtensionMessagingService

```typescript
// MATCH_EVENT test setup pattern (Story 2.5/2.6'dan öğrenildi)
it('should prepend MATCH_EVENT to matchHistory', () => {
  // STATE_SYNC ile başlangıç state
  const initialState = { ...mockStateSyncPayload, matchHistory: [] };
  // simüle STATE_SYNC
  capturedMessageListener({ type: MessageType.STATE_SYNC, payload: initialState });
  
  const event: MatchEventPayload = {
    id: 'evt-1',
    url: 'https://api.example.com/users',
    method: 'GET',
    source: 'har',
    statusCode: 200,
    timestamp: Date.now(),
  };
  
  // simüle MATCH_EVENT push
  capturedMessageListener({ type: MessageType.MATCH_EVENT, payload: event });
  
  expect(service.state()?.matchHistory[0]).toEqual(event);
});
```

### Test Pattern — MonitorTabComponent

```typescript
// Mock ExtensionMessagingService pattern (Story 2.5/2.6'dan öğrenildi)
const messagingService = {
  state: signal<StateSyncPayload | null>(null),
};

// Boş durum testi:
it('should show empty state when no history', () => {
  messagingService.state.set({ ...mockState, matchHistory: [] });
  fixture.detectChanges();
  expect(el.textContent).toContain('Henüz intercept edilmiş request yok');
});

// Feed satırı testi:
it('should display HAR match event', () => {
  messagingService.state.set({ ...mockState, matchHistory: [mockHarEvent] });
  fixture.detectChanges();
  expect(el.textContent).toContain('HAR ✓');
  expect(el.textContent).toContain(mockHarEvent.url);
});
```

### Önemli Kısıtlamalar

- **`_state.update()` kullan, `_state.set()` KULLANMA** — set tüm state'i override eder, diğer alanlar silinir
- **`if/else` YASAK** — switch/case zorunlu (mimari kuralı)
- **`@for` track** — `track event.id` kullan (Angular 18+ best practice)
- **`@if`/`@else if`/`@else`** — Angular 17+ control flow syntax (template'de `*ngIf` YASAK)
- **`ChangeDetectionStrategy.OnPush`** — signal-based reaktivite OnPush'u otomatik handle eder
- **`inject()` DI** — `constructor()` injection YASAK (UX5 kuralı)
- **Selector prefix `hm-`** — monitor-tab componenti `hm-monitor-tab` olarak kalır

### Bağımlılık: Epic 2 Baseline

Bu story'nin bağımlı olduğu Epic 2 implementasyonları:
- `port-manager.ts` → `sendToPopup()` — push mekanizması
- `message-handler.ts` → her MATCH_QUERY'de `portManager.sendToPopup(MATCH_EVENT)` çağrısı
- `state-manager.ts` → `addMatchEvent()` + `chrome.storage.local` persist
- `extension-messaging.service.ts` → `connect()` + `_state` signal altyapısı
- `StateSyncPayload.matchHistory` → popup open'da history restore

Tüm bunlar `done` durumunda olduğu için bu story sadece popup consume layer'ına odaklanır.

### Project Structure Notes

- Dosya konumları:
  - `packages/extension/src/popup/services/extension-messaging.service.ts` (mevcut — düzenleme)
  - `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` (mevcut — düzenleme)
  - Test dosyaları colocated, `*.spec.ts` convention

- Import path pattern: relative `../../shared/` (barrel'dan değil, direkt dosyadan)
- Angular component imports bloğuna gerek yok (MonitorTabComponent standalone ve services ile doğrudan çalışır)

### References

- [Source: packages/extension/src/shared/messaging.types.ts] — `MessageType.MATCH_EVENT`
- [Source: packages/extension/src/shared/payload.types.ts] — `MatchEventPayload`
- [Source: packages/extension/src/shared/state.types.ts] — `MatchEvent`
- [Source: packages/extension/src/shared/constants.ts] — `MAX_MATCH_HISTORY = 500`
- [Source: packages/extension/src/background/message-handler.ts#~130] — MATCH_EVENT push implementasyonu
- [Source: packages/extension/src/background/port-manager.ts] — `sendToPopup()` implementasyonu
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts] — `connect()` + `_state` signal
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — Story gereksinimleri
- [Source: _bmad-output/planning-artifacts/architecture.md#Messaging Architecture] — Port-based messaging kararı
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Editor] — CodeMirror 6 kararı (Story 3.3 için)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Tüm background implementasyonu Epic 2'de tamamlandı; bu story sadece popup consume layer
- `ExtensionMessagingService._state.update()` ile immutable MATCH_EVENT prepend
- MonitorTabComponent feed UI: source badge renk kodlaması UX3 spec ile uyumlu
- `if/else` → `switch/case` refactor tamamlandı (mimari kural)
- `MAX_MATCH_HISTORY = 500` trim doğrulandı (4. test)
- `state === null` durumunda MATCH_EVENT güvenli handle edildi
- 279 extension testi geçiyor, 0 regresyon
- Jest altyapı sorunu tespit edildi: testler `npm test --workspace=packages/extension` ile çalıştırılmalı, `npx jest` root'dan çalışmaz

### Change Log

- **2026-02-25**: Story 3.1 implementasyonu tamamlandı
  - `ExtensionMessagingService.connect()` — `if/else` → `switch/case` refactor + `MATCH_EVENT` case eklendi
  - `MonitorTabComponent` — `inject(ExtensionMessagingService)` + `matchHistory` computed signal + feed UI (source badge renk kodlama)
  - 4 yeni unit test (`extension-messaging.service.spec.ts`) + 8 yeni unit test (`monitor-tab.component.spec.ts`)
  - Tüm 279 extension testi geçiyor (0 regresyon)

### File List
- `packages/extension/src/popup/services/extension-messaging.service.ts` (değiştirildi)
- `packages/extension/src/popup/services/extension-messaging.service.spec.ts` (değiştirildi)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` (değiştirildi)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` (değiştirildi)