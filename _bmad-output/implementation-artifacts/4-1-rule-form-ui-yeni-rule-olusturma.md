# Story 4.1: Rule Form UI — Yeni Rule Oluşturma

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Controls tab'ında Rules accordion içinde URL pattern + HTTP method + status code + response body + delay ile yeni mock rule tanımlayan bir form UI'ı,
so that HAR dosyası olmadan istediğim endpoint için herhangi bir HTTP response senaryosunu (429, 500, 200 özel body, vb.) tanımlayabileyim.

## Acceptance Criteria

1. **Given** Controls tab → Rules accordion açık **When** "Yeni Rule Ekle" butonuna tıklandığında **Then** rule form açılmalı; şu alanlar mevcut olmalı: URL pattern (text), HTTP method (dropdown: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS), status code (number input), response body (`hm-json-editor`), delay ms (number input, opsiyonel) (FR16, UX8)

2. **Given** developer form alanlarını doldurup "Kaydet" butonuna tıkladığında **When** form validation geçildiğinde **Then** `MockRule` nesnesi oluşturulmalı; background SW'ye `ADD_RULE` mesajı gönderilmeli; SW `activeRules`'ı güncellemeli ve `chrome.storage.local`'a persist etmeli (FR16)

3. **Given** URL pattern alanı boş bırakıldığında **When** "Kaydet" butonuna tıklandığında **Then** form validation hatası gösterilmeli; rule kaydedilmemeli; hata mesajı "URL pattern zorunludur" olmalı

4. **Given** response body alanına geçersiz JSON girildiğinde **When** "Kaydet" butonuna tıklandığında **Then** `hm-json-editor`'ün lint hatası visible olmalı; form submit engellenmeli

5. **Given** delay alanı boş bırakıldığında **When** rule kaydedildiğinde **Then** delay 0ms olarak varsaymalı; opsiyonel alan olduğu için validation hatası vermemeli

6. **Given** rule başarıyla kaydedildiğinde **When** form state sıfırlandığında **Then** tüm form alanları temizlenmeli; form kapanmalı veya varsayılan duruma dönmeli

7. **Given** Rules accordion'daki rule badge sayısı **When** yeni rule eklendiğinde **Then** badge sayısı güncellenmiş `activeRules.length` değerini göstermeli

## Tasks / Subtasks

- [x] Task 1: `hm-rule-form` Angular standalone component oluştur (AC: #1, #3, #4, #5, #6)
  - [x] Subtask 1.1: Dosyaları oluştur:
    - `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts`
    - `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html`
    - `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts`
  - [x] Subtask 1.2: Signal-based output tanımla: `ruleCreated = output<MockRule>()`
  - [x] Subtask 1.3: Form state signals tanımla:
    - `urlPattern = signal<string>('')`
    - `method = signal<string>('GET')`
    - `statusCode = signal<number>(200)`
    - `responseBody = signal<string>('{\n  \n}')`
    - `delay = signal<number>(0)`
    - `showForm = signal<boolean>(false)`
  - [x] Subtask 1.4: Validation signals tanımla:
    - `urlPatternError = signal<string>('')` — boş URL pattern kontrolü
    - `jsonValid = signal<boolean>(true)` — hm-json-editor'den gelen geçerlilik durumu
  - [x] Subtask 1.5: `onSave()` metodu:
    - URL pattern boş → `urlPatternError.set('URL pattern zorunludur')`, return
    - JSON geçersiz → form submit engelle, return
    - `MockRule` nesnesi oluştur: `{ id: crypto.randomUUID(), urlPattern, method, statusCode, responseBody, responseHeaders: [], delay, enabled: true }`
    - `ruleCreated.emit(rule)`
    - Form state'ini sıfırla (`resetForm()`)
  - [x] Subtask 1.6: `resetForm()` metodu — tüm signal'ları varsayılan değerlere döndür, `showForm.set(false)`
  - [x] Subtask 1.7: `onResponseBodyChange(value: string)` handler — `responseBody.set(value)`, `jsonValid.set(true)`
  - [x] Subtask 1.8: `hm-json-editor` import et ve `readonly: false` ile response body alanı olarak kullan

- [x] Task 2: Template — rule form UI (AC: #1, #3, #4, #5)
  - [x] Subtask 2.1: "Yeni Rule Ekle" butonu — `showForm()` false iken göster, tıklanınca `showForm.set(true)`
  - [x] Subtask 2.2: Form bölümü — `@if (showForm())` ile koşullu render:
    - URL pattern: text input + validation error mesajı
    - HTTP method: `<select>` dropdown (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)
    - Status code: number input (min: 100, max: 599)
    - Response body: `<hm-json-editor [value]="responseBody()" [isReadOnly]="false" (valueChange)="onResponseBodyChange($event)" />`
    - Delay: number input (min: 0, placeholder: "0", opsiyonel)
  - [x] Subtask 2.3: "Kaydet" ve "İptal" butonları — Kaydet → `onSave()`, İptal → `resetForm()`
  - [x] Subtask 2.4: Tailwind CSS styling — 400px popup constraint'ine uygun compact form layout
  - [x] Subtask 2.5: a11y: Tüm input'lara `aria-label` veya `<label>`, select'e `aria-label`, butonlara `aria-label`

- [x] Task 3: `ControlsTabComponent` entegrasyonu (AC: #2, #7)
  - [x] Subtask 3.1: `HmRuleFormComponent` import et; `ControlsTabComponent.imports` dizisine ekle
  - [x] Subtask 3.2: Rules accordion template'ini güncelle — placeholder text'i kaldır, `<hm-rule-form>` ekle
  - [x] Subtask 3.3: `activeRules = computed(() => this.messaging.state()?.activeRules ?? [])` computed signal ekle
  - [x] Subtask 3.4: Rules accordion badge'ini `activeRules().length.toString()` ile dinamik yap
  - [x] Subtask 3.5: `onRuleCreated(rule: MockRule)` handler — `ADD_RULE` mesajı gönder:
    ```typescript
    const payload: RulePayload = { rule };
    void this.messaging
      .sendMessage(MessageType.ADD_RULE, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Rule eklenemedi:', err);
      });
    ```

- [x] Task 4: Unit testler (AC: #1–7)
  - [x] Subtask 4.1: `hm-rule-form` — form ilk açılışta "Yeni Rule Ekle" butonu gösterilmeli, form gizli olmalı
  - [x] Subtask 4.2: `hm-rule-form` — "Yeni Rule Ekle" tıklanınca form görünür olmalı
  - [x] Subtask 4.3: `hm-rule-form` — URL pattern boş iken kaydet → validation error gösterilmeli, `ruleCreated` emit edilmemeli
  - [x] Subtask 4.4: `hm-rule-form` — tüm alanlar doldurulmuş iken kaydet → `ruleCreated` doğru MockRule ile emit edilmeli
  - [x] Subtask 4.5: `hm-rule-form` — delay boş bırakıldığında → rule.delay = 0 olmalı
  - [x] Subtask 4.6: `hm-rule-form` — kaydet sonrası form sıfırlanmalı ve gizlenmeli
  - [x] Subtask 4.7: `hm-rule-form` — "İptal" tıklanınca form sıfırlanmalı ve gizlenmeli
  - [x] Subtask 4.8: `hm-rule-form` — HTTP method dropdown varsayılan değeri "GET" olmalı
  - [x] Subtask 4.9: `hm-rule-form` — status code varsayılan değeri 200 olmalı
  - [x] Subtask 4.10: `ControlsTabComponent` — `activeRules` computed signal state'ten doğru okuma
  - [x] Subtask 4.11: `ControlsTabComponent` — `onRuleCreated()` çağrıldığında `ADD_RULE` mesajı doğru payload ile gönderilmeli
  - [x] Subtask 4.12: `ControlsTabComponent` — Rules accordion badge activeRules length göstermeli

## Dev Notes

### Backend Zaten Tam Hazır — Sadece UI Gerekiyor

**KRİTİK:** Bu story'de background SW tarafında **hiçbir değişiklik gerekmez**. Tüm gerekli altyapı önceki story'lerde (Story 2.2) implement edilmiştir:

1. **`message-handler.ts` satır 308–327** — `ADD_RULE` handler zaten aktif:
```typescript
case MessageType.ADD_RULE: {
  const { rule } = message.payload as RulePayload;
  await stateManager.addRule(rule);
  port.postMessage({
    type: MessageType.ADD_RULE,
    payload: { success: true },
    requestId: message.requestId,
  });
}
```

2. **`UPDATE_RULE` handler** (satır 328–347) — Rule güncelleme desteği mevcut
3. **`DELETE_RULE` handler** (satır 348–367) — Rule silme desteği mevcut
4. **`StateManager.addRule()`** — `activeRules` array'ine ekler ve `chrome.storage.local`'a persist eder
5. **`STATE_SYNC` payload** — `activeRules: readonly MockRule[]` olarak popup'a gönderilir
6. **`RulePayload` tipi** — `{ rule: MockRule }` formatında tanımlı
7. **`DeleteRulePayload` tipi** — `{ ruleId: string }` formatında tanımlı

### MockRule Tipi — `@har-mock/core` [Source: packages/core/src/types/rule.types.ts](packages/core/src/types/rule.types.ts)

```typescript
export interface MockRule {
  readonly id: string;           // UUID — crypto.randomUUID() ile oluşturulmalı
  readonly urlPattern: string;   // Exact veya wildcard — '/api/data/*'
  readonly method: string;       // HTTP method — 'GET', 'POST', vb.
  readonly statusCode: number;   // 100-599 arası
  readonly responseBody: string; // JSON string
  readonly responseHeaders: readonly HarHeader[];  // Başlangıçta boş array ([])
  readonly delay: number;        // ms — varsayılan 0
  readonly enabled: boolean;     // true olarak oluşturulmalı
}
```

**Önemli:** `responseHeaders` alanı bu story'de form'da gösterilmez — boş array (`[]`) olarak gönderilir. Story 4.2'de header düzenleme eklenebilir.

### Messaging Pattern — Mevcut Kullanım Örneği [Source: controls-tab.component.ts](packages/extension/src/popup/components/controls-tab/controls-tab.component.ts)

`ControlsTabComponent`'teki mevcut handler pattern'ı örnek alınmalı:
```typescript
import { MessageType } from '../../../shared/messaging.types';
import type { RulePayload } from '../../../shared/payload.types';

onRuleCreated(rule: MockRule): void {
  const payload: RulePayload = { rule };
  void this.messaging
    .sendMessage(MessageType.ADD_RULE, payload, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Rule eklenemedi:', err);
    });
}
```

### hm-json-editor Reuse — Response Body Editörü [Source: packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts](packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts)

`HmJsonEditorComponent` bu story'de response body alanı olarak **doğrudan reuse** edilir:
- `[value]="responseBody()"` — signal'dan okur
- `[isReadOnly]="false"` — düzenleme modu
- `(valueChange)="onResponseBodyChange($event)"` — sadece geçerli JSON'da emit eder
- **KRİTİK:** `valueChange` sadece geçerli JSON olduğunda emit eder. Geçersiz JSON'da emit gerçekleşmez → Bu davranışı form validation'da kullanmak için `jsonValid` signal'ını valueChange emit durumuna göre yönet.

**JSON Validation Stratejisi:**
- Başlangıçta `jsonValid = signal<boolean>(true)` (varsayılan body valid JSON)
- `hm-json-editor` `(valueChange)` emit ederse → `jsonValid.set(true)`, body güncelle
- Kullanıcı JSON bozup kaydetmeye kalkışırsa: son emit zamanındaki body geçerlidir ancak editörde şu an ne var bilinmez
- **Pratik çözüm:** `onSave()` sırasında `hm-json-editor`'ün mevcut içeriğini kontrol etmek yerine, son emit edilen (geçerli) body'yi kullan. Editörde kırmızı lint zaten geçersiz JSON'u gösteriyor. `valueChange` emit etmediği sürece `responseBody` signal'ı son geçerli değeri tutar → kaydetme güvenli.

### Proje Yapısı — Dosya Konumları

**Oluşturulacak dosyalar:**
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts`

**Güncellenecek dosyalar:**
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` — `HmRuleFormComponent` import + handler + template güncelleme
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` — yeni testler

### Mevcut Controls Tab Template — Rules Accordion Güncellenmesi Gereken Bölüm

**Şu anki placeholder:**
```html
<hm-accordion
  title="Rules"
  [expanded]="false"
  persistKey="rules"
  badge="0"
  badgeVariant="default"
>
  <p class="text-xs text-slate-400">Rule yönetimi (Story 4.1)</p>
</hm-accordion>
```

**Güncellenmiş hali:**
```html
<hm-accordion
  title="Rules"
  [expanded]="false"
  persistKey="rules"
  [badge]="activeRules().length.toString()"
  [badgeVariant]="activeRules().length > 0 ? 'info' : 'default'"
>
  <hm-rule-form (ruleCreated)="onRuleCreated($event)" />
</hm-accordion>
```

### Angular Architecture Kuralları (Proje Geneli)

| Kural | Doğru Kullanım |
|-------|---------------|
| Dependency Injection | `inject()` — constructor injection YASAK |
| Input/Output | `input()` / `output()` signals — `@Input()`/`@Output()` YASAK |
| Change Detection | `ChangeDetectionStrategy.OnPush` |
| Template | `templateUrl` ayrı HTML — inline template küçük component'larda kabul edilebilir |
| Selector prefix | `hm-` prefix zorunlu — `hm-rule-form` |
| `any` tipi | YASAK — `unknown` + type guard kullan |
| Standalone | `standalone: true` zorunlu |
| Template fonksiyon çağrısı | YASAK — `computed()` veya pipe kullan (signal getter'lar hariç) |

### Önceki Story'lerden Gelen Kritik Uyarılar

| Kural | Kaynak |
|-------|--------|
| `afterRenderEffect` Angular 18.2'de YOK — `afterNextRender` kullan | Story 3.3 debug log |
| `@ViewChild` YASAK — `viewChild()` signal | Story 3.2 code review |
| Template fonksiyon çağrısı YASAK — `computed()` veya pipe kullan | Story 3.2 dev notes |
| `jest.mock` factory TypeScript parse: hoisting sorununa dikkat | Story 3.3 debug log |
| `fakeAsync` + `tick()` async state testlerinde kullan | Story 3.3 test pattern |
| `requestAnimationFrame` kullanıldığında `DestroyRef` ile cancel | Story 3.2 code review |
| Component'te `inject(DestroyRef).onDestroy(cb)` cleanup pattern'ı | Story 3.2 code review |
| `$any` template'te YASAK — uygun tip kullan veya `$any` kaldır | Story 3.5 code review |

### Component Tasarım Kararları

**Input/Output stratejisi:**
- `hm-rule-form` "smart-ish presentation" component — kendi form state'ini yönetir
- Output: `ruleCreated` ile oluşturulan `MockRule`'u üst component'e iletir
- State güncellemesi (background SW mesajı) `ControlsTabComponent`'te yapılır
- Form visibility (`showForm` signal) component içinde yönetilir

**Neden hm-json-editor reuse?**
- CodeMirror 6 zaten projeye dahil ve çalışır durumda
- Response body için yeni editor yazmak "reinventing the wheel"
- Mevcut `valueChange` davranışı (sadece valid JSON emit) validation için uygun

**HTTP Method Dropdown:**
- `<select>` kullan — Angular ReactiveForms gereksiz (signal-based yeterli)
- Değerler: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Varsayılan: `GET`

**Status Code Input:**
- `type="number"` — `min="100"` `max="599"`
- Varsayılan: `200`
- HTML5 native validation yeterli

### Test Stratejisi

**`hm-rule-form` component test yaklaşımı:**
- `TestBed` + `ComponentFixture`
- `HmJsonEditorComponent`'i mock'la veya skip et (CodeMirror DOM gereksinimleri nedeniyle)
- `showForm` signal ile form visibility test et
- `ruleCreated` output emit kontrolü
- Validation senaryoları: boş URL, geçersiz JSON

**Mock yaklaşımı:**
- `hm-json-editor` heavy component olduğu için testlerde:
  - Seçenek A: `NO_ERRORS_SCHEMA` ile CodeMirror testlerini atla
  - Seçenek B: `hm-json-editor`'ı mock component ile değiştir
  - **Önerilen:** Mock component — daha güvenli, gerçek output/input davranışı simüle edilebilir

**Mock state pattern'ı (mevcut test dosyasından genişletilecek):**
```typescript
const mockState: StateSyncPayload = {
  harData: null,
  activeRules: [
    {
      id: 'test-rule-1',
      urlPattern: '/api/test/*',
      method: 'GET',
      statusCode: 200,
      responseBody: '{"ok":true}',
      responseHeaders: [],
      delay: 0,
      enabled: true,
    },
  ],
  settings: {
    enabled: true,
    replayMode: 'last-match',
    timingReplay: false,
    excludeList: [],
  },
  editedResponses: {},
  matchHistory: [],
  accordionStates: {},
};
```

### References

- [Source: packages/core/src/types/rule.types.ts](packages/core/src/types/rule.types.ts) — MockRule interface
- [Source: packages/extension/src/shared/messaging.types.ts](packages/extension/src/shared/messaging.types.ts) — MessageType.ADD_RULE
- [Source: packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts) — RulePayload, DeleteRulePayload
- [Source: packages/extension/src/background/message-handler.ts#L308-L327](packages/extension/src/background/message-handler.ts#L308-L327) — ADD_RULE handler
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts](packages/extension/src/popup/components/controls-tab/controls-tab.component.ts) — ControlsTabComponent (güncellenecek)
- [Source: packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts](packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts) — HmJsonEditorComponent (reuse)
- [Source: packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts](packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts) — Presentation component pattern reference
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts](packages/extension/src/popup/services/extension-messaging.service.ts) — sendMessage pattern
- [Source: packages/extension/src/shared/state.types.ts](packages/extension/src/shared/state.types.ts) — ExtensionState, ExtensionSettings
- [Source: _bmad-output/planning-artifacts/epics.md](epics.md) — Epic 4, Story 4.1 AC'leri
- [Source: _bmad-output/planning-artifacts/architecture.md](architecture.md) — Angular component standartları, naming pattern'ları

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Task 1: `hm-rule-form` standalone component oluşturuldu — signal-based state (urlPattern, method, statusCode, responseBody, delay, showForm), validation signals (urlPatternError, jsonValid), onSave/resetForm/onResponseBodyChange metodları
- Task 2: HTML template yazıldı — Tailwind CSS compact layout, tam a11y (aria-label), @if koşullu render, `hm-json-editor` reuse
- Task 3: `ControlsTabComponent` güncellendi — HmRuleFormComponent import, `activeRules` computed signal, `onRuleCreated` handler, badge dinamik güncelleme
- Task 4: 58 unit test eklendi/güncellendi — hm-rule-form (12 test) + controls-tab güncellemeleri (46 test, 8 yeni). Tüm testler yeşil.
- Tam regresyon: 413 test, 25 suite — sıfır hata.

### File List

### Oluşturulan Dosyalar
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts`

### Güncellenen Dosyalar
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts`
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts`
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts`
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-1-rule-form-ui-yeni-rule-olusturma.md`

## Change Log

| Tarih | Değişiklik |
|-------|-----------|
| 2026-02-27 | Story 4.1 implementasyonu tamamlandı — `hm-rule-form` standalone component, HTML template, ControlsTabComponent entegrasyonu; 58 test eklendi/güncellendi; 413 test geçiyor |
| 2026-02-27 | Code review fix: 8 issue düzeltildi — jsonValidityChange output (AC#4), status code aralık doğrulaması, `<form>` element, event handler coverage, computed badge signal, a11y |
