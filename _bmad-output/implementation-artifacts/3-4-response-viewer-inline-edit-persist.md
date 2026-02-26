# Story 3.4: Response Viewer & Inline Edit & Persist

Status: done

## Story

As a developer,
I want Monitor feed'deki herhangi bir satıra tıklayarak o request'in response body'sini görüntülememi ve `hm-json-editor` ile inline düzenleyip HAR session'ına persist etmemi,
so that guard'lı sayfalarda `isAdmin: false` gibi değerleri `true` yapıp sayfayı yenilediğimde guard'ı geçebileyim; değişiklik session boyunca kalıcı olsun.

## Acceptance Criteria

1. **Given** Monitor tab'ında bir feed satırına tıklandığında **When** row seçildiğinde **Then** ilgili request'in response body'si `hm-json-editor` edit modunda açılmalı; HTTP method, URL ve status code de gösterilmeli (FR26, UX3)

2. **Given** developer JSON editörde response body'yi değiştirip "Kaydet" butonuna tıkladığında **When** kaydetme işlemi yapıldığında **Then** değiştirilmiş response background SW'ye `UPDATE_RESPONSE` mesajı ile gönderilmeli; background SW `editedResponses` map'ini güncellemeli ve `chrome.storage.local`'a persist etmeli (FR27)

3. **Given** response başarıyla persist edildikten sonra **When** sayfa aynı URL için tekrar istek yaptığında **Then** content script intercept ettiğinde edited response dönmeli; orijinal HAR response değil, kaydedilen düzenleme kullanılmalı (FR27)

4. **Given** "Passthrough →" etiketli bir satıra tıklandığında **When** response viewer açıldığında **Then** "Bu request HAR'da eşleşmedi, düzenlenecek response yok" mesajı gösterilmeli

5. **Given** response düzenlenip kaydedildiğinde **When** popup yeniden açıldığında **Then** `editedResponses`'dan yüklenen düzenleme hala aktif olmalı; session persistence çalışıyor olmalı

## Tasks / Subtasks

- [x] Task 1: `hm-response-viewer` component'ini oluştur (AC: #1, #4)
  - [x] Subtask 1.1: Dosyaları oluştur:
    - `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.ts`
    - `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.html`
    - `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.spec.ts`
  - [x] Subtask 1.2: Signal-based input tanımla: `event = input<MatchEvent | null>(null)`
  - [x] Subtask 1.3: `ExtensionMessagingService` inject et; `state()?.editedResponses` ve `state()?.harData` üzerinden body lookup yap
  - [x] Subtask 1.4: `computed()` ile `resolvedBody` türet — sıra: `editedResponses[key]` → `harData.entries` eşleşmesi → `'{}'`
  - [x] Subtask 1.5: `isDirty = signal<boolean>(false)` ile edit state takip et
  - [x] Subtask 1.6: `isSaving = signal<boolean>(false)` ile kaydetme yükleme durumu göster

- [x] Task 2: Template — response viewer UI (AC: #1, #4)
  - [x] Subtask 2.1: `event.source === 'passthrough'` durumunda: "Bu request HAR'da eşleşmedi, düzenlenecek response yok" mesajı + gri info ikonu
  - [x] Subtask 2.2: `har` veya `rule` source için: method badge + URL (truncated, title tooltip) + status code header bölümü
  - [x] Subtask 2.3: `<hm-json-editor [value]="resolvedBody()" [isReadOnly]="false" (valueChange)="onBodyEdit($event)" />` entegre et
  - [x] Subtask 2.4: "Kaydet" butonu — `isDirty()` false iken disabled; `isSaving()` true iken "Kaydediliyor…" göster
  - [x] Subtask 2.5: Başarılı kaydetme sonrası yeşil onay göstergesi (kısa süreli, `setTimeout` + signal ile temizle)

- [x] Task 3: `saveResponse()` metodu — UPDATE_RESPONSE mesajı gönder (AC: #2, #3, #5)
  - [x] Subtask 3.1: Key oluştur: `` `${event.method.toUpperCase()}:${event.url}` ``
  - [x] Subtask 3.2: `EditedResponse` nesnesi hazırla: `{ url, method, body: editedBody, headers: originalHeaders, statusCode: event.statusCode ?? 200 }`
  - [x] Subtask 3.3: `messaging.sendMessage(MessageType.UPDATE_RESPONSE, { key, response }, crypto.randomUUID())` ile gönder
  - [x] Subtask 3.4: Başarılı yanıtta: `isSaving.set(false)`, `isDirty.set(false)`, yeşil onay göster
  - [x] Subtask 3.5: Hata durumunda: `isSaving.set(false)`, `console.error` ile logla, kullanıcıya hata mesajı göster

- [x] Task 4: `MonitorTabComponent` entegrasyonu (AC: #1)
  - [x] Subtask 4.1: `hm-response-viewer`'ı import et; `MonitorTabComponent.imports` dizisine ekle
  - [x] Subtask 4.2: Template'te feed listesinin altına `<hm-response-viewer [event]="selectedEvent()" />` ekle
  - [x] Subtask 4.3: `selectedEvent = computed(() => matchHistory().find(e => e.id === selectedEventId()) ?? null)` computed signal ekle
  - [x] Subtask 4.4: `eventSelected` output'unu koru (mevcut kod değişmemeli — backward compat)

- [x] Task 5: Unit testler (AC: #1–5)
  - [x] Subtask 5.1: `hm-response-viewer` — event `null` iken bileşen render olabilmeli
  - [x] Subtask 5.2: Passthrough event verildiğinde "eşleşmedi" mesajı görünmeli, editör gizlenmeli
  - [x] Subtask 5.3: HAR event verildiğinde editör görünmeli; `resolvedBody` `editedResponses[key]`'den gelmeli (mock state)
  - [x] Subtask 5.4: `valueChange` emit edildiğinde `isDirty` true olmalı; Kaydet butonu enabled olmalı
  - [x] Subtask 5.5: `saveResponse()` çağrıldığında `UPDATE_RESPONSE` mesajı doğru key ve payload ile gönderilmeli (mock MessagingService)
  - [x] Subtask 5.6: Başarılı kaydet sonrası `isDirty = false`, `isSaving = false` olmalı
  - [x] Subtask 5.7: `MonitorTabComponent` — `selectedEvent` computed signal, `selectedEventId` güncellenince doğru MatchEvent dönmeli

## Dev Notes

### Proje Yapısı — Dosya Konumları

**Oluşturulacak dosyalar:**
- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.ts`
- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.html`
- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.spec.ts`

**Güncellenecek dosyalar:**
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` — `selectedEvent` computed + `HmResponseViewerComponent` import + template güncellemesi

### Mevcut Kod Bağlamı — Kritik Bilgiler

**`MonitorTabComponent` mevcut yapısı** ([packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts](packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts)):
- `selectedEventId = signal<string | null>(null)` — zaten mevcut
- `eventSelected = output<MatchEvent>()` — zaten mevcut; korumak gerekiyor
- `selectEvent(event: MatchEvent)` — her ikisini de set ediyor
- `matchHistory = computed(...)` — `messaging.state()?.matchHistory ?? []`
- Bu dosyaya şunlar **eklenmeli**:
  ```typescript
  readonly selectedEvent = computed(
    () => this.matchHistory().find(e => e.id === this.selectedEventId()) ?? null
  );
  ```

**`HmJsonEditorComponent` public API** ([packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts](packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts)):
```typescript
readonly value = input<string>('');
readonly isReadOnly = input<boolean>(false);   // ⚠️ readonly değil isReadOnly — naming dikkat!
readonly valueChange = output<string>();
```
> **KRİTİK:** Input adı `isReadOnly` (boolean değil `readonly`) — `[isReadOnly]="false"` ile kullan.

**`UPDATE_RESPONSE` handler** zaten backend'de tam implement edilmiş:
- `message-handler.ts` line 368–388: `UPDATE_RESPONSE` case → `stateManager.setEditedResponse(key, response)`
- `state-manager.ts`: `setEditedResponse()` → storage'a persist eder
- Key formatı: `` `${method.toUpperCase()}:${url}` `` — [message-handler.ts line 165](packages/extension/src/background/message-handler.ts#L165) bu formatı kullanıyor, uyumlu olmalı

**`StateSyncPayload`** ([packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts)):
```typescript
editedResponses: Record<string, EditedResponse>;
harData: HarSessionData | null;
```

**`EditedResponse`** ([packages/extension/src/shared/state.types.ts](packages/extension/src/shared/state.types.ts)):
```typescript
interface EditedResponse {
  readonly url: string;
  readonly method: string;
  readonly body: string;
  readonly headers: readonly HarHeader[];
  readonly statusCode: number;
}
```

**`UpdateResponsePayload`** ([packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts)):
```typescript
interface UpdateResponsePayload {
  readonly key: string;
  readonly response: EditedResponse;
}
```

### Response Body Lookup Stratejisi

`resolvedBody = computed(...)` içindeki sıra (öncelik düzeni):

```typescript
readonly resolvedBody = computed<string>(() => {
  const ev = this.event();
  if (!ev || ev.source === 'passthrough') return '';

  const state = this.messaging.state();
  const key = `${ev.method.toUpperCase()}:${ev.url}`;

  // 1. Önce editedResponses'a bak (en güncel düzenleme)
  const edited = state?.editedResponses[key];
  if (edited !== undefined) return edited.body;

  // 2. HAR entries'ten ara
  const harData = state?.harData;
  if (harData) {
    const entry = harData.entries.find(
      e => e.url === ev.url && e.method.toUpperCase() === ev.method.toUpperCase()
    );
    if (entry) return entry.responseBody;
  }

  // 3. Fallback — boş JSON
  return '{}';
});
```

> **NOT:** `MatchEvent` içinde `responseBody` bulunmuyor. Popup, `harData.entries` üzerinden URL+method eşleşmesi yaparak body'yi bulur. Multi-entry senaryolarda en son entry (last-match) kullanılır.

### Headers Lookup — `resolvedHeaders`

`saveResponse()` sırasında original `headers` bilgisi de gerekmektedir:

```typescript
readonly resolvedHeaders = computed<readonly HarHeader[]>(() => {
  const ev = this.event();
  if (!ev || ev.source === 'passthrough') return [];

  const state = this.messaging.state();
  const key = `${ev.method.toUpperCase()}:${ev.url}`;

  // Önce editedResponses
  const edited = state?.editedResponses[key];
  if (edited !== undefined) return edited.headers;

  // HAR entries
  const entry = state?.harData?.entries.find(
    e => e.url === ev.url && e.method.toUpperCase() === ev.method.toUpperCase()
  );
  return entry?.responseHeaders ?? [];
});
```

### Angular Architecture Kuralları (Proje Geneli)

| Kural | Doğru Kullanım |
|-------|---------------|
| Dependency Injection | `inject()` — constructor injection YASAK |
| Input/Output | `input()` / `output()` signals — `@Input()`/`@Output()` YASAK |
| ViewChild | `viewChild()` signal — `@ViewChild` YASAK |
| Change Detection | `ChangeDetectionStrategy.OnPush` |
| Template | `templateUrl` ayrı HTML — inline template büyük componentlarda YASAK |
| Selector prefix | `hm-` prefix zorunlu — `hm-response-viewer` |
| `any` tipi | YASAK — `unknown` + type guard kullan |
| Cleanup | `inject(DestroyRef).onDestroy(cb)` |

### Test Stratejisi

**Mock yaklaşımı — `ExtensionMessagingService`:**

```typescript
const mockState: StateSyncPayload = {
  harData: {
    entries: [
      {
        url: 'https://api.example.com/user',
        method: 'GET',
        status: 200,
        responseBody: '{"id":1,"isAdmin":false}',
        responseHeaders: [],
        timings: { wait: 0, receive: 0 },
      }
    ],
    patterns: [],
    fileName: 'test.har',
    loadedAt: Date.now(),
  },
  editedResponses: {},
  activeRules: [],
  settings: { enabled: true, replayMode: 'last-match', timingReplay: false, excludeList: [] },
  matchHistory: [],
  accordionStates: {},
};

const mockMessaging = {
  state: signal(mockState),
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
};
```

**`HmJsonEditorComponent` mock:**

Story 3.3'te keşfedildiği gibi, CodeMirror JSDOM'da doğal çalışmaz. `hm-json-editor` bileşenini jest.mock ile stub'la:

```typescript
jest.mock('../json-editor/hm-json-editor.component', () => ({
  HmJsonEditorComponent: Component({
    selector: 'hm-json-editor',
    standalone: true,
    template: '<div data-testid="json-editor-stub"></div>',
    inputs: ['value', 'isReadOnly'],
  })(class {}),
}));
```

**`isSaving` / `isDirty` test pattern:**

```typescript
it('should set isSaving=true during save, then false on success', fakeAsync(() => {
  // ... setup
  component.onBodyEdit('{"isAdmin":true}');
  expect(component.isDirty()).toBe(true);
  component.saveResponse();
  expect(component.isSaving()).toBe(true);
  tick(); // resolve promise
  expect(component.isSaving()).toBe(false);
  expect(component.isDirty()).toBe(false);
}));
```

### Önceki Story'lerden Gelen Kritik Uyarılar

| Kural | Kaynak |
|-------|--------|
| `afterRenderEffect` Angular 18.2'de YOK — `afterNextRender` kullan | Story 3.3 debug log |
| `@ViewChild` YASAK — `viewChild()` signal | Story 3.2 code review |
| Template fonksiyon çağrısı YASAK — `computed()` veya pipe kullan | Story 3.2 dev notes |
| `requestAnimationFrame` kullanıldığında `DestroyRef` ile cancel | Story 3.2 code review [H2] |
| `jest.mock` factory TypeScript parse: hoisting sorununa dikkat | Story 3.3 debug log |
| `mock.results[0].value` doğru mock instance erişimi (`mock.instances[0]` değil) | Story 3.3 debug log |
| CodeMirror ESM paketleri `transformIgnorePatterns` gerektiriyor | Story 3.3 debug log |
| `isSaving`/`isDirty` gibi async state için `fakeAsync` + `tick()` | Story 3.3 test pattern |

### Mimari Kontrol Noktaları

- [ ] `standalone: true` ✓
- [ ] `ChangeDetectionStrategy.OnPush` ✓
- [ ] `inject()` DI — constructor injection YOK ✓
- [ ] `input()` / `output()` signal API — `@Input()` / `@Output()` YOK ✓
- [ ] `any` tipi YASAK ✓
- [ ] Selector: `hm-response-viewer` (hm- prefix) ✓
- [ ] Template: `templateUrl` ayrı HTML dosyası ✓
- [ ] `UPDATE_RESPONSE` key formatı: `${method.toUpperCase()}:${url}` — message-handler ile uyumlu ✓
- [ ] `HmJsonEditorComponent` input adı: `isReadOnly` (backing property name ile dikkat) ✓

### Project Structure Notes

```
packages/extension/src/popup/
  components/
    response-viewer/                    ← YENİ klasör
      hm-response-viewer.component.ts  ← YENİ
      hm-response-viewer.component.html ← YENİ
      hm-response-viewer.component.spec.ts ← YENİ
    monitor-tab/
      monitor-tab.component.ts          ← GÜNCELLENECEk (selectedEvent computed + import)
```

**Referans alınacak mevcut dosyalar:**
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts` — kullanılacak bileşen (Story 3.3 ürünü)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` — `selectEvent`, `selectedEventId`, `matchHistory` pattern'ları
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` — `inject(ExtensionMessagingService)` + `sendMessage()` pattern
- `packages/extension/src/shared/messaging.types.ts` — `MessageType.UPDATE_RESPONSE`
- `packages/extension/src/shared/payload.types.ts` — `UpdateResponsePayload`, `StateSyncPayload`
- `packages/extension/src/shared/state.types.ts` — `EditedResponse`, `MatchEvent`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — Story gereksinimleri ve acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md] — editedResponses persist stratejisi
- [Source: packages/extension/src/shared/messaging.types.ts#L33] — `UPDATE_RESPONSE` MessageType
- [Source: packages/extension/src/shared/payload.types.ts#L58-L69] — `UpdateResponsePayload`, `StateSyncPayload.editedResponses`
- [Source: packages/extension/src/shared/state.types.ts#L27-L33] — `EditedResponse` interface
- [Source: packages/extension/src/background/message-handler.ts#L165] — editedKey formatı `${method.toUpperCase()}:${url}`
- [Source: packages/extension/src/background/message-handler.ts#L368-L388] — `UPDATE_RESPONSE` backend handler (zaten implement edilmiş)
- [Source: packages/extension/src/background/state-manager.ts#L139-L141] — `setEditedResponse()` + storage persist
- [Source: packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts] — `selectedEventId`, `eventSelected`, `selectEvent()`, mevcut yapı
- [Source: packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts] — `value`, `isReadOnly`, `valueChange` API
- [Source: _bmad-output/implementation-artifacts/3-3-codemirror-6-json-editor-component.md] — CodeMirror JSDOM mock stratejisi, test pattern'ları

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `jest.mock` factory içinde `@Component` decorator kullanımı hoisting sorununa yol açtı → `require('@angular/core')` ve `Component({...})(class {})` functional API yaklaşımına geçildi
- `@Output valueChange not initialized` hatası → mock sınıfına `EventEmitter` property eklenerek çözüldü: `valueChange = new EventEmitter<string>()`
- `fakeAsync` testlerde `showSuccess` için `setTimeout(2000)` timer queue'da kalıyordu → ilgili testlere `tick(2000)` eklenerek drain edildi
- `HmResponseViewerComponent` import edildiğinde `MonitorTabComponent` testleri CodeMirror ESM yüklemeye çalışıyordu → monitor-tab spec'ine `HmResponseViewerComponent` stub'ı eklendi

### Completion Notes List

- **Task 1–3 (hm-response-viewer component):** `HmResponseViewerComponent` Angular 18 signal API ile oluşturuldu. `resolvedBody` computed signal: `editedResponses[key]` → `harData.entries` → `'{}'` öncelik sırasıyla çalışıyor. `saveResponse()` `UPDATE_RESPONSE` mesajı gönderiyor; backend handler Story 2.x'te implement edilmişti.
- **Task 4 (MonitorTabComponent entegrasyonu):** `selectedEvent` computed signal eklendi (`matchHistory().find(e => e.id === selectedEventId()) ?? null`). `eventSelected` output'u korundu (backward compat). Template'e `<hm-response-viewer [event]="selectedEvent()" />` eklendi.
- **Task 5 (Unit testler):** 18 test `hm-response-viewer.component.spec.ts`'de, 3 test monitor-tab spec'ine eklendi. Toplam 356 extension testi tamamı geçti, regresyon yok.

### File List

- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.ts` (YENİ)
- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.html` (YENİ)
- `packages/extension/src/popup/components/response-viewer/hm-response-viewer.component.spec.ts` (YENİ)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` (GÜNCELLENDİ)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` (GÜNCELLENDİ)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (GÜNCELLENDİ)

### Change Log

- (2026-02-27) Story 3-4 implementasyonu tamamlandı: `hm-response-viewer` component oluşturuldu; `MonitorTabComponent`'e `selectedEvent` computed signal ve response viewer entegrasyonu eklendi; 18 yeni unit test + 3 monitor-tab testi eklendi; tüm 356 extension testi geçti
- (2026-02-27) **Code Review düzeltmeleri:** [H1] Event switch'te transient state sıfırlama effect'i eklendi (isDirty/editedBody/showSuccess/errorMessage reset); [M1] `onBodyEdit()` programmatic update'lerde isDirty false positive engellendi (`resolvedBody` karşılaştırması); [M2] Test'teki `as never` cast kaldırılıp `makeHarEntry()` helper ile typed hale getirildi; [L1] `editedBody` field'ına `readonly` eklendi; [L2] Save butonuna `aria-label` eklendi; [L3] `resolvedBody`/`resolvedHeaders` DRY ihlali giderildi (`eventLookup` shared computed); [L4] `errorMessage` temizlenme testi eklendi; [L5] `setTimeout` `DestroyRef` ile cleanup'a bağlandı; 6 yeni test eklendi; 362/362 extension testi geçti
