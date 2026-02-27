# Story 4.2: Rule List UI — Listeleme, Düzenleme & Silme

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Rules accordion'ında tanımlı rule'ların listesini görüntülememi, mevcut rule'ları düzenlememi ve silmemi,
so that aktif mock rule setimi yönetilebilir halde tutayım; gereksiz rule'ları kaldırabileyim; hatalı rule'ı düzeltebiliyeyim.

## Acceptance Criteria

1. **Given** en az bir rule tanımlanmış **When** Rules accordion açık olduğunda **Then** her rule için URL pattern, HTTP method, status code ve delay (varsa) bir satırda özet olarak görüntülenmeli (FR17, UX8)

2. **Given** rule listesinde bir rule'ın "Düzenle" butonuna tıklandığında **When** edit formu açıldığında **Then** rule'ın mevcut değerleri form alanlarına önceden doldurulmuş olmalı; değişiklikler kaydedildiğinde `UPDATE_RULE` mesajı background SW'ye gitmeli; storage güncellenmeli (FR17)

3. **Given** rule listesinde bir rule'ın "Sil" butonuna tıklandığında **When** silme işlemi yapıldığında **Then** rule `activeRules`'dan kaldırılmalı; `DELETE_RULE` mesajı background SW'ye gitmeli; storage güncellenmeli; liste anlık güncellenmeli (FR17)

4. **Given** hiç rule tanımlanmamışken **When** Rules accordion görüntülendiğinde **Then** "Henüz rule tanımlanmadı. 'Yeni Rule Ekle' butonuyla başlayın." boş durum mesajı gösterilmeli

5. **Given** popup yeniden açıldığında **When** Rules accordion görüntülendiğinde **Then** `chrome.storage.local`'dan yüklenen rule'lar listede gösterilmeli; session persistence çalışıyor olmalı

## Tasks / Subtasks

- [x] Task 1: `hm-rule-list` Angular standalone component oluştur (AC: #1, #4)
  - [x] Subtask 1.1: Dosyaları oluştur:
    - `packages/extension/src/popup/components/rule-list/hm-rule-list.component.ts`
    - `packages/extension/src/popup/components/rule-list/hm-rule-list.component.html`
    - `packages/extension/src/popup/components/rule-list/hm-rule-list.component.spec.ts`
  - [x] Subtask 1.2: Signal-based input'lar tanımla:
    - `rules = input<readonly MockRule[]>([])`
  - [x] Subtask 1.3: Signal-based output'lar tanımla:
    - `editRuleRequested = output<MockRule>()` — üst component'e edit sinyali
    - `deleteRuleRequested = output<string>()` — üst component'e ruleId sinyali
  - [x] Subtask 1.4: `onEditClick(rule: MockRule)` metodu → `editRuleRequested.emit(rule)`
  - [x] Subtask 1.5: `onDeleteClick(ruleId: string)` metodu → `deleteRuleRequested.emit(ruleId)`
  - [x] Subtask 1.6: `urlPatternDisplay(pattern: string)` — **pure pipe olarak** değil; zaten computed veri gerekmiyor; `@for` içinde truncation için `TruncatePipe` veya template içinde `slice` pipe kullanılmalı (template fonksiyon çağrısı YASAK)

- [x] Task 2: `hm-rule-list` template — liste + boş durum (AC: #1, #4)
  - [x] Subtask 2.1: Boş durum mesajı — `@if (rules().length === 0)`:
    - `"Henüz rule tanımlanmadı. 'Yeni Rule Ekle' butonuyla başlayın."` metni
    - Tailwind CSS: soluk renk, merkezi hizalanmış, popup constraint'e uygun
  - [x] Subtask 2.2: Liste bölümü — `@if (rules().length > 0)` → `@for (rule of rules(); track rule.id)`:
    - URL pattern: `rule.urlPattern` — uzun pattern'larda `overflow-hidden text-ellipsis whitespace-nowrap` + `title` attribute
    - HTTP method badge: `rule.method` — Tailwind renk kodlaması (GET mavi, POST yeşil, PUT sarı, DELETE kırmızı, vb.)
    - Status code: `rule.statusCode` — yeşil 2xx, sarı 3xx, kırmızı 4xx/5xx
    - Delay: `rule.delay > 0` ise `"{{delay}}ms"` göster, yoksa gösterme
    - "Düzenle" butonu: pencil icon + click → `onEditClick(rule)`
    - "Sil" butonu: trash icon + click → `onDeleteClick(rule.id)`
  - [x] Subtask 2.3: a11y: Her satır için aria-label, düzenle/sil butonlarına `aria-label="URL pattern rule'unu düzenle"` formatında dinamik label

- [x] Task 3: `hm-rule-form` component'ini edit mode için genişlet (AC: #2)
  - [x] Subtask 3.1: Yeni optional input ekle:
    - `editRule = input<MockRule | null>(null)` — null → create mode, MockRule → edit mode
  - [x] Subtask 3.2: Yeni output ekle:
    - `ruleUpdated = output<MockRule>()` — edit mode'da "Kaydet" → bu output emit edilir
  - [x] Subtask 3.3: `effect()` ile form prefill logic:
    ```typescript
    private readonly editRuleEffect = effect(() => {
      const rule = this.editRule();
      if (rule) {
        this.urlPattern.set(rule.urlPattern);
        this.method.set(rule.method);
        this.statusCode.set(rule.statusCode);
        this.responseBody.set(rule.responseBody);
        this.delay.set(rule.delay);
        this.showForm.set(true);
        this.urlPatternError.set('');
        this.statusCodeError.set('');
        this.jsonValid.set(true);
      }
    });
    ```
    **KRİTİK:** `effect()` için Angular 18'de `allowSignalWrites` seçeneği gerekebilir — bağlamı kontrol et.
  - [x] Subtask 3.4: `isEditMode = computed<boolean>(() => this.editRule() !== null)` computed signal ekle
  - [x] Subtask 3.5: `onSave()` metodunu güncelle:
    - Validasyon (mevcut) geçildikten sonra:
    - `const existing = this.editRule();`
    - `const rule: MockRule = { id: existing?.id ?? crypto.randomUUID(), ... }` — edit'te orijinal ID korunur
    - `if (existing) → this.ruleUpdated.emit(rule)` — UPDATE için
    - `else → this.ruleCreated.emit(rule)` — CREATE için
    - `this.resetForm()`
  - [x] Subtask 3.6: `resetForm()` güncellemesi — edit mode bittikten sonra parent'a sinyal vermek için `resetForm()` çağrısı yeterli (editRule input'u parent sıfırlar)
  - [x] Subtask 3.7: HTML template güncellemesi:
    - Form başlığı: `@if (isEditMode()) { "Rule Düzenle" } @else { "Yeni Rule Ekle" }`
    - "Kaydet" butonu metni: `@if (isEditMode()) { "Güncelle" } @else { "Kaydet" }`

- [x] Task 4: `ControlsTabComponent` entegrasyonu (AC: #2, #3, #5)
  - [x] Subtask 4.1: `HmRuleListComponent` import et; `ControlsTabComponent.imports` dizisine ekle
  - [x] Subtask 4.2: `editingRule = signal<MockRule | null>(null)` signal ekle
  - [x] Subtask 4.3: `onEditRuleRequested(rule: MockRule)` handler → `editingRule.set(rule)` — form otomatik prefill olur
  - [x] Subtask 4.4: `onRuleUpdated(rule: MockRule)` handler:
    ```typescript
    onRuleUpdated(rule: MockRule): void {
      this.editingRule.set(null); // edit mode'dan çık
      const payload: RulePayload = { rule };
      void this.messaging
        .sendMessage(MessageType.UPDATE_RULE, payload, crypto.randomUUID())
        .catch((err: unknown) => {
          console.error('[HAR Mock] Rule güncellenemedi:', err);
        });
    }
    ```
  - [x] Subtask 4.5: `onRuleDeleted(ruleId: string)` handler:
    ```typescript
    onRuleDeleted(ruleId: string): void {
      const payload: DeleteRulePayload = { ruleId };
      void this.messaging
        .sendMessage(MessageType.DELETE_RULE, payload, crypto.randomUUID())
        .catch((err: unknown) => {
          console.error('[HAR Mock] Rule silinemedi:', err);
        });
    }
    ```
  - [x] Subtask 4.6: Template'te Rules accordion içini güncelle:
    ```html
    <hm-accordion
      title="Rules"
      [expanded]="false"
      persistKey="rules"
      [badge]="activeRulesBadge()"
      [badgeVariant]="activeRulesBadgeVariant()"
    >
      <hm-rule-list
        [rules]="activeRules()"
        (editRuleRequested)="onEditRuleRequested($event)"
        (deleteRuleRequested)="onRuleDeleted($event)"
      />
      <hm-rule-form
        [editRule]="editingRule()"
        (ruleCreated)="onRuleCreated($event)"
        (ruleUpdated)="onRuleUpdated($event)"
      />
    </hm-accordion>
    ```
  - [x] Subtask 4.7: `DeleteRulePayload` import'u eklenmiş olmalı — `import type { ..., DeleteRulePayload } from '../../../shared/payload.types'`

- [x] Task 5: Unit testler (AC: #1–5)
  - [x] Subtask 5.1: `hm-rule-list` — rules boşken boş durum mesajı gösterilmeli
  - [x] Subtask 5.2: `hm-rule-list` — rules doluyken satırlar render edilmeli (URL pattern, method, status code)
  - [x] Subtask 5.3: `hm-rule-list` — delay > 0 ise gösterilmeli; delay = 0 ise gösterilmemeli
  - [x] Subtask 5.4: `hm-rule-list` — "Düzenle" tıklanınca `editRuleRequested` doğru rule ile emit edilmeli
  - [x] Subtask 5.5: `hm-rule-list` — "Sil" tıklanınca `deleteRuleRequested` doğru ruleId ile emit edilmeli
  - [x] Subtask 5.6: `hm-rule-form` — `editRule` input null iken create mode (mevcut testler geçmeye devam etmeli)
  - [x] Subtask 5.7: `hm-rule-form` — `editRule` input bir MockRule ile verilince form alanları prefill olmalı
  - [x] Subtask 5.8: `hm-rule-form` — edit mode'da "Kaydet" → `ruleUpdated` emit edilmeli, `ruleCreated` emit edilmemeli; `rule.id` orijinal ID olmalı
  - [x] Subtask 5.9: `hm-rule-form` — create mode'da "Kaydet" → `ruleCreated` emit edilmeli (regresyon)
  - [x] Subtask 5.10: `hm-rule-form` — edit mode'da form başlığı "Rule Düzenle", buton "Güncelle" olmalı
  - [x] Subtask 5.11: `ControlsTabComponent` — `onEditRuleRequested` çağrıldığında `editingRule` signal güncellenmeli
  - [x] Subtask 5.12: `ControlsTabComponent` — `onRuleUpdated` çağrıldığında `UPDATE_RULE` mesajı doğru payload ile gönderilmeli ve `editingRule` null olmalı
  - [x] Subtask 5.13: `ControlsTabComponent` — `onRuleDeleted` çağrıldığında `DELETE_RULE` mesajı doğru `ruleId` ile gönderilmeli
  - [x] Subtask 5.14: `ControlsTabComponent` — `activeRules` 0 iken badge "0" gösterilmeli; badge variant "default" olmalı

## Dev Notes

### Backend Zaten Tam Hazır — Sadece UI Gerekiyor

**KRİTİK:** Bu story'de background SW tarafında **hiçbir değişiklik gerekmez**. Tüm gerekli altyapı Story 2.2 ve Story 4.1'de tamamlanmıştır:

1. **`message-handler.ts` satır 308–327** — `ADD_RULE` handler (Story 4.1'den, değişmez)
2. **`message-handler.ts` satır 328–347** — `UPDATE_RULE` handler zaten aktif:
```typescript
case MessageType.UPDATE_RULE: {
  const { rule } = message.payload as RulePayload;
  await stateManager.updateRule(rule);
  port.postMessage({
    type: MessageType.UPDATE_RULE,
    payload: { success: true },
    requestId: message.requestId,
  });
  break;
}
```
3. **`message-handler.ts` satır 348–367** — `DELETE_RULE` handler zaten aktif:
```typescript
case MessageType.DELETE_RULE: {
  const { ruleId } = message.payload as DeleteRulePayload;
  await stateManager.deleteRule(ruleId);
  port.postMessage({
    type: MessageType.DELETE_RULE,
    payload: { success: true },
    requestId: message.requestId,
  });
  break;
}
```
4. **`StateManager.updateRule(rule)`** — `activeRules` array'ini günceller, `chrome.storage.local`'a persist eder
5. **`StateManager.deleteRule(ruleId)`** — `activeRules`'dan siler, `chrome.storage.local`'a persist eder
6. **`STATE_SYNC` payload** — `activeRules: readonly MockRule[]` popup'a gönderilir; sil/güncelle sonrası state zaten reactive gelir
7. **`RulePayload`** tipi — `{ rule: MockRule }` — UPDATE_RULE için kullanılır
8. **`DeleteRulePayload`** tipi — `{ ruleId: string }` — DELETE_RULE için kullanılır

### MockRule Tipi — `@har-mock/core` [Source: packages/core/src/types/rule.types.ts](packages/core/src/types/rule.types.ts)

```typescript
export interface MockRule {
  readonly id: string;           // UUID — edit'te KORUNMALI (orijinal id)
  readonly urlPattern: string;   // Exact veya wildcard — '/api/data/*'
  readonly method: string;       // HTTP method — 'GET', 'POST', vb.
  readonly statusCode: number;   // 100-599 arası
  readonly responseBody: string; // JSON string
  readonly responseHeaders: readonly HarHeader[];  // Mevcut değer korunur
  readonly delay: number;        // ms — 0 = delay yok
  readonly enabled: boolean;     // true korunur
}
```

**Kritik — Düzenleme sırasında korunması gerekenler:**
- `id`: `existing.id` — yeni UUID üretilmez
- `responseHeaders`: Mevcut `existing.responseHeaders` array'i korunabilir (Story 4.2'de header formu yok)
- `enabled`: `existing.enabled` korunur

### Component Mimarisi — Seçilen Yaklaşım

**`hm-rule-list` (Yeni component — saf sunum/presentation):**
- Input: `rules = input<readonly MockRule[]>([])`
- Output: `editRuleRequested = output<MockRule>()` — listeleme+edit butonları
- Output: `deleteRuleRequested = output<string>()` — ruleId
- State yönetimi sadece local (silme onayı gibi şeyler — bu story'de gerek yok)
- Kendi messaging SERVICE'ine erişimi **yok** — üst component yönetir

**`hm-rule-form` (Mevcut — genişletilecek):**
- Yeni `editRule = input<MockRule | null>(null)` — null = create, rule = edit
- `effect()` ile önce create sonra edit mode geçişini izler
- `isEditMode = computed(...)` ile template'te mode-aware gösterim
- Create vs edit ayrımı sadece `onSave()`'de: emit farklı output

**`ControlsTabComponent` (Mevcut — genişletilecek):**
- `editingRule = signal<MockRule | null>(null)` — hangi rule edit modunda
- Edit modal/form kapanınca (resetForm → ruleUpdated emit → parent handler) `editingRule.set(null)` yapılır
- `hm-rule-list` ve `hm-rule-form` aynı accordion içinde yan yana — list altında form

### Dosya Konumları — Yeni Dosyalar

**Oluşturulacak dosyalar:**
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.ts`
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.html`
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.spec.ts`

**Güncellenecek dosyalar:**
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts` → editRule input, ruleUpdated output, effect, updated onSave
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html` → form başlığı, buton metni
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts` → edit mode testleri
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` → HmRuleListComponent, editingRule signal, handler'lar, template

### Kimden Örnek Al? Mevcut Pattern Reference'lar

**Presentation component pattern (`hm-exclude-list` örneği):**
```typescript
// [Source: packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts]
export class HmExcludeListComponent {
  readonly excludeList = input<readonly string[]>([]);
  readonly excludeListChange = output<readonly string[]>();
  // state: local signals
  // messaging: YOK — parent yönetir
}
```

**Messaging pattern (`controls-tab` örneği):**
```typescript
// [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts]
onRuleCreated(rule: MockRule): void {
  const payload: RulePayload = { rule };
  void this.messaging
    .sendMessage(MessageType.ADD_RULE, payload, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Rule eklenemedi:', err);
    });
}
```

**Yeni handler pattern (DELETE_RULE):**
```typescript
onRuleDeleted(ruleId: string): void {
  const payload: DeleteRulePayload = { ruleId };
  void this.messaging
    .sendMessage(MessageType.DELETE_RULE, payload, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Rule silinemedi:', err);
    });
}
```

### `effect()` Kullanımı — Angular 18 Nüansı

Angular 18'de `effect()` içinde signal yazarken `allowSignalWrites: true` gerekebilir:

```typescript
// Seçenek A — allowSignalWrites (Angular 18.x bazı versiyonlarında gerekli)
private readonly editRuleEffect = effect(
  () => {
    const rule = this.editRule();
    if (rule) {
      this.urlPattern.set(rule.urlPattern);
      // ...
    }
  },
  { allowSignalWrites: true },
);

// Seçenek B — effect + untracked (her ikisi de çalışıyor)
// Tercih: Seçenek A daha okunabilir
```

**NOT:** `effect()` sadece değer değiştiğinde çalışır (`rule.id` değişince). Eğer aynı rule objesini tekrar `editingRule.set(rule)` yaparsak effect tetiklenmeyebilir — string/primitive değil nesne karşılaştırması. Bu durumda parent'ta `editingRule.set(null)` sonra `editingRule.set(rule)` yapmak gerekebilir. Bu edge case'i test et.

**Daha güvenli alternatif:** `rule` değişimini `rule.id` ile takip etmek için computed:
```typescript
readonly editRuleId = computed(() => this.editRule()?.id ?? null);
// effect içinde editRuleId izlenir
```

### HTTP Method Badge Renk Kodlaması (Tailwind CSS)

```
GET    → bg-blue-100 text-blue-700
POST   → bg-green-100 text-green-700
PUT    → bg-yellow-100 text-yellow-700
PATCH  → bg-orange-100 text-orange-700
DELETE → bg-red-100 text-red-700
HEAD   → bg-purple-100 text-purple-700
OPTIONS→ bg-slate-100 text-slate-700
```

### Status Code Renk Kodlaması (Tailwind CSS)

```
2xx → text-green-600
3xx → text-yellow-600
4xx → text-red-600
5xx → text-red-700 font-semibold
```

Computed ile template'te `class` binding için pure pipe öner veya `computed()` üzerinden class string üret:
```typescript
// computed signal ile — TemplateDE fonksiyon çağrısı YASAK
readonly statusCodeClasses = computed<readonly { code: number; class: string }[]>(() =>
  this.rules().map((r) => ({
    code: r.statusCode,
    class: r.statusCode >= 500 ? 'text-red-700 font-semibold'
         : r.statusCode >= 400 ? 'text-red-600'
         : r.statusCode >= 300 ? 'text-yellow-600'
         : 'text-green-600',
  }))
);
```

Ancak bu `@for ... track` ile index senkronizasyonu zor yapar. **Daha sade yaklaşım:** Pure Pipe kullan:

```typescript
// status-color.pipe.ts
@Pipe({ name: 'statusColor', standalone: true, pure: true })
export class StatusColorPipe implements PipeTransform {
  transform(statusCode: number): string {
    if (statusCode >= 500) return 'text-red-700 font-semibold';
    if (statusCode >= 400) return 'text-red-600';
    if (statusCode >= 300) return 'text-yellow-600';
    return 'text-green-600';
  }
}
```

**KRİTİK:** Template'te `getStatusClass(rule.statusCode)` gibi metod çağrısı YASAK. Ya `computed()` ile array map et ya da Pipe kullan. **Önerilen:** Pipe — `hm-rule-list` ile colocate et veya `packages/extension/src/popup/pipes/` klasörüne koy.

Benzer şekilde method badge için `MethodBadgePipe`.

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
| `$any` template'te YASAK — uygun tip kullan | Story 3.5 code review |
| `effect()` içinde signal yazarken `allowSignalWrites: true` gerekebilir | Story 4.1 genel bilgi |

### Angular Architecture Kuralları (Reminder)

| Kural | Doğru Kullanım |
|-------|---------------|
| Dependency Injection | `inject()` — constructor injection YASAK |
| Input/Output | `input()` / `output()` signals — `@Input()`/`@Output()` YASAK |
| Change Detection | `ChangeDetectionStrategy.OnPush` |
| Template | `templateUrl` ayrı HTML dosyası |
| Selector prefix | `hm-` prefix zorunlu — `hm-rule-list` |
| `any` tipi | YASAK — `unknown` + type guard |
| Standalone | `standalone: true` zorunlu |
| Template fonksiyon çağrısı | YASAK — `computed()` veya pure pipe kullan |
| `@for` tracking | `track rule.id` — primitive ID ile track et |

### Test Stratejisi

**`hm-rule-list` test yaklaşımı:**
- Mock MockRule array'i oluştur
- `TestBed` ile render et
- `@if` ve `@for` template kontrollerine dikkat — Angular 18 control flow

**Mock MockRule fixture:**
```typescript
const mockRules: MockRule[] = [
  {
    id: 'rule-1',
    urlPattern: '/api/users/*',
    method: 'GET',
    statusCode: 200,
    responseBody: '{"data":[]}',
    responseHeaders: [],
    delay: 0,
    enabled: true,
  },
  {
    id: 'rule-2',
    urlPattern: '/api/auth/login',
    method: 'POST',
    statusCode: 429,
    responseBody: '{"error":"rate_limited"}',
    responseHeaders: [],
    delay: 500,
    enabled: true,
  },
];
```

**`hm-rule-form` edit mode test yaklaşımı (mevcut testlerin yanına ek testler):**
```typescript
it('edit mode: editRule input verilince form prefill olmalı', fakeAsync(() => {
  const ruleToEdit: MockRule = { id: 'existing-id', urlPattern: '/api/test', method: 'POST',
    statusCode: 404, responseBody: '{}', responseHeaders: [], delay: 100, enabled: true };
  fixture.componentRef.setInput('editRule', ruleToEdit);
  tick();
  fixture.detectChanges();
  expect(component.urlPattern()).toBe('/api/test');
  expect(component.method()).toBe('POST');
  expect(component.statusCode()).toBe(404);
  expect(component.showForm()).toBe(true);
}));

it('edit mode: Kaydet → ruleUpdated emit edilmeli, ruleCreated emit edilmemeli, id korunmalı', () => {
  const ruleToEdit: MockRule = { id: 'existing-id', ... };
  fixture.componentRef.setInput('editRule', ruleToEdit);
  // ... form doldur
  const updatedSpy = jest.fn();
  const createdSpy = jest.fn();
  component.ruleUpdated.subscribe(updatedSpy);
  component.ruleCreated.subscribe(createdSpy);
  component.onSave();
  expect(updatedSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-id' }));
  expect(createdSpy).not.toHaveBeenCalled();
});
```

**ControlsTabComponent entegrasyon testleri:**
```typescript
it('onRuleDeleted → DELETE_RULE mesajı doğru ruleId ile gönderilmeli', async () => {
  component.onRuleDeleted('rule-123');
  await Promise.resolve(); // microtask flush
  expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
    MessageType.DELETE_RULE,
    { ruleId: 'rule-123' },
    expect.any(String),
  );
});

it('onEditRuleRequested → editingRule signal güncellemeli', () => {
  const rule = { id: 'r1', urlPattern: '/api', ...} as MockRule;
  component.onEditRuleRequested(rule);
  expect(component.editingRule()).toEqual(rule);
});

it('onRuleUpdated → UPDATE_RULE mesajı gönderilmeli ve editingRule null olmalı', async () => {
  const rule = { id: 'r1', ... } as MockRule;
  component.editingRule.set(rule); // simulate editing state
  component.onRuleUpdated(rule);
  expect(component.editingRule()).toBeNull();
  await Promise.resolve();
  expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
    MessageType.UPDATE_RULE,
    { rule },
    expect.any(String),
  );
});
```

### Rules Accordion Layout — Üst Component Template'te Sıra

Rules accordion içinde component sırası önemli — önce liste, sonra form:
```html
<hm-accordion title="Rules" ...>
  <!-- 1. Önce mevcut rule listesi -->
  <hm-rule-list
    [rules]="activeRules()"
    (editRuleRequested)="onEditRuleRequested($event)"
    (deleteRuleRequested)="onRuleDeleted($event)"
  />
  <!-- 2. Sonra yeni rule ekle formu (edit mode'da prefill olur) -->
  <hm-rule-form
    [editRule]="editingRule()"
    (ruleCreated)="onRuleCreated($event)"
    (ruleUpdated)="onRuleUpdated($event)"
  />
</hm-accordion>
```

Bu sıra UX açısından mantıklı: Kullanıcı önce listeyi görür, düzenle/sil yapar, en alta "Yeni Rule Ekle" butonu gelir.

### State Akışı — Silme/Güncelleme Sonrası Otomatik Güncelleme

State güncelleme'si **reaktif olarak** zaten çalışıyor:
1. `onRuleDeleted` → `DELETE_RULE` mesajı → background SW `stateManager.deleteRule()` çağırır → `chrome.storage.local` güncellenir
2. Background SW'nin `deleteRule()` sonrası `STATE_SYNC` push etmeli mi? → **Kontrol et:** `stateManager.deleteRule()` sonrası popup port'una `STATE_SYNC` push yapılıyor mu?
3. Eğer push yapılmıyorsa: `ExtensionMessagingService._state.update()` ile local olarak güncelleme yapılabilir. Ancak `StateManager`'ın implementation'ını kontrol et.

**KRİTİK:** `StateManager.deleteRule()` / `updateRule()` sonrası state popup'a push yapılıyorsa (otomatik `STATE_SYNC`), UI zaten reaktif güncellenir. Eğer yapılmıyorsa, `sendMessage` response'tan sonra local state update gerekir. Background messiage handler'ı kontrol et — `STATE_SYNC` push var mı?

[Source: packages/extension/src/background/message-handler.ts] — `ADD_RULE`, `UPDATE_RULE`, `DELETE_RULE` handler'larının sonunda `STATE_SYNC` push yapılmıyor (sadece `{ success: true }` dönüyor). Ancak `StateManager` state değişince `PortManager` üzerinden tüm popup port'larına `STATE_SYNC` push yapıyor olabilir — kontrol et.

**Eğer otomatik push yoksa:** `sendMessage` Promise resolve'u sonrası local `_state.update()` gerekmeyebilir çünkü **`activeRules` computed signal `messaging.state()` üzerinden geliyor** ve state popup'a push gelmediğinde değişmez.

Bu durumda mock işlemleri gerçek zamanlı görünmez. Dev agent bunu test etmeli ve gerekirse:
- `onRuleDeleted` → mesaj gönder → **AND** `messaging._state.update(...)` ile local state'ten sil
- Ancak `_state` private — `ExtensionMessagingService`'e `updateRules()` metodu eklenmeli veya background push yapacak şekilde düzenlenmeli

**Önerilen yaklaşım:** Background `DELETE_RULE` ve `UPDATE_RULE` handler'larından sonra popup port'una `STATE_SYNC` push yap. Bu tutarlı ve tek doğru reaktif yaklaşım. Bu değişiklik `message-handler.ts`'de yapılabilir.

### References

- [Source: packages/core/src/types/rule.types.ts](packages/core/src/types/rule.types.ts) — MockRule interface
- [Source: packages/extension/src/shared/messaging.types.ts](packages/extension/src/shared/messaging.types.ts) — MessageType.UPDATE_RULE, DELETE_RULE
- [Source: packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts) — RulePayload, DeleteRulePayload
- [Source: packages/extension/src/background/message-handler.ts#L328-L347](packages/extension/src/background/message-handler.ts#L328-L347) — UPDATE_RULE handler (mevcut)
- [Source: packages/extension/src/background/message-handler.ts#L348-L367](packages/extension/src/background/message-handler.ts#L348-L367) — DELETE_RULE handler (mevcut)
- [Source: packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts](packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts) — genişletilecek
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts](packages/extension/src/popup/components/controls-tab/controls-tab.component.ts) — güncellenecek
- [Source: packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts](packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts) — presentation component pattern referansı
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts](packages/extension/src/popup/services/extension-messaging.service.ts) — sendMessage, state signal
- [Source: packages/extension/src/shared/state.types.ts](packages/extension/src/shared/state.types.ts) — ExtensionState, MockRule relationship
- [Source: _bmad-output/planning-artifacts/epics.md](epics.md) — Epic 4, Story 4.2 AC'leri
- [Source: _bmad-output/planning-artifacts/architecture.md](architecture.md) — Angular component standartları, messaging protocol

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `effect()` içinde signal yazarken `{ allowSignalWrites: true }` seçeneği gerekli — Angular 18'de zorunlu
- `[class]="'static ' + (value | pipe)"` pattern'ı ile NgClass import'u gerekmeden dinamik class binding yapıldı
- STATE_SYNC push: `UPDATE_RULE` ve `DELETE_RULE` handler'larından sonra popup port'una push yapılmadığını keşfedildi; `portManager.getPopupPort()?.postMessage()` ile düzeltildi
- Boş rule listesi için `@if (!showForm() && !isEditMode())` kontrolü eklendi — edit mode aktifken "Yeni Rule Ekle" butonu gizlenir

### Completion Notes List

- ✅ `hm-rule-list` Angular 18 standalone component oluşturuldu: `input()`, `output()`, `ChangeDetectionStrategy.OnPush`, `track rule.id`
- ✅ `StatusColorPipe` ve `MethodBadgePipe` pure pipe'ları oluşturuldu — template'te fonksiyon çağrısı yasağına uygun
- ✅ `hm-rule-form` edit mode için genişletildi: `editRule` input, `ruleUpdated` output, `effect()` ile prefill, `isEditMode` computed, `onSave()` updated
- ✅ `ControlsTabComponent` güncellendi: `HmRuleListComponent` import, `editingRule` signal, 3 yeni handler (onEditRuleRequested, onRuleUpdated, onRuleDeleted), template güncellendi
- ✅ `message-handler.ts`: `UPDATE_RULE` ve `DELETE_RULE` sonrası popup'a `STATE_SYNC` push eklendi — reaktif UI
- ✅ 97 yeni test yazıldı; toplam 455/455 test geçti, 0 regresyon

### File List

**Oluşturulan dosyalar:**
- `packages/extension/src/popup/pipes/status-color.pipe.ts`
- `packages/extension/src/popup/pipes/method-badge.pipe.ts`
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.ts`
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.html`
- `packages/extension/src/popup/components/rule-list/hm-rule-list.component.spec.ts`

**Güncellenen dosyalar:**
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.ts`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.html`
- `packages/extension/src/popup/components/rule-form/hm-rule-form.component.spec.ts`
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts`
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts`
- `packages/extension/src/background/message-handler.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-2-rule-list-ui-listeleme-duzenleme-silme.md`
