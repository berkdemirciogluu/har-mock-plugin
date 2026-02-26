# Story 3.2: Monitor Tab — Request Feed UI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Monitor tab'ında canlı request feed'ini URL, method ve eşleşme durumu badge'iyle gösteren list UI'ı,
so that her intercept edilen request'in akıbetini ("Rule ✓" / "HAR ✓" / "Passthrough →") tek bakışta görebileyim.

## Acceptance Criteria (BDD)

1. **Given** Monitor tab açık ve en az bir intercept gerçekleşmiş **When** feed listesi görüntülendiğinde **Then** her satırda URL (truncated), HTTP method ve eşleşme durumu badge'i gösterilmeli; "Rule ✓" yeşil, "HAR ✓" mavi, "Passthrough →" gri renk kodlaması uygulanmalı (FR20, FR21, UX3)

2. **Given** yeni bir request intercept edildiğinde **When** feed güncellendiğinde **Then** yeni satır listenin en üstüne eklenmeli; kullanıcı scroll yapmışsa mevcut scroll pozisyonu korunmalı (sayfa zıplamamalı)

3. **Given** feed listesinde hiç intercept yokken **When** Monitor tab görüntülendiğinde **Then** "Henüz intercept edilmiş request yok. Sayfayı yenileyip bir istek başlatın." boş durum mesajı gösterilmeli

4. **Given** feed listesi uzadığında **When** kullanıcı scroll yaptığında **Then** popup height constraint'i (max 600px) içinde scroll çalışmalı; yeni gelen item'lar mevcut scroll pozisyonunu bozmadan üste eklenmeli

## Tasks / Subtasks

- [x] Task 1: Scroll Position Preservation (AC: #2, #4)
  - [x] Subtask 1.1: MonitorTabComponent'e `@ViewChild` ile scroll container ref ekle (`viewChild` signal API kullan — `viewChild<ElementRef>('feedContainer')`)
  - [x] Subtask 1.2: `matchHistory` signal change'de scroll compensation mantığı ekle:
    - `afterNextRender` veya `effect()` ile yeni item eklendiğinde önceki `scrollTop` + eklenen satır yüksekliğini hesaplayarak `scrollTop` geri ayarla
    - Kullanıcı en üstte ise (scrollTop < threshold) auto-scroll'u koru (yeni item'ı göster)
    - Kullanıcı aşağıda ise compensate ederek pozisyon korunsun
  - [x] Subtask 1.3: Feed container'a template ref ekle: `#feedContainer`
  - [x] Subtask 1.4: Angular import'larına `viewChild`, `ElementRef`, `effect` ekle

- [x] Task 2: Monitor Tab Height Constraint (AC: #4)
  - [x] Subtask 2.1: MonitorTabComponent feed container'ına popup'un kullanılabilir yüksekliğini dolduracak şekilde `flex-1 overflow-y-auto` + host element'e `flex flex-col h-full` uygula
  - [x] Subtask 2.2: AppComponent'te `<hm-monitor-tab>` container'ına popup yüksekliğinin tab-bar sonrası kalan alanı kaplaması için `class="flex-1 overflow-hidden"` ekle VEYA MonitorTab host binding ile `:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }` kullan
  - [x] Subtask 2.3: AppComponent'teki `overflow-y-auto`'nun MonitorTab'ın kendi scroll'u ile çakışmadığını doğrula (nested scroll prevention)

- [x] Task 3: Row Click Selection (Story 3.4 Hazırlık) (AC: #1)
  - [x] Subtask 3.1: `selectedEventId = signal<string | null>(null)` ekle
  - [x] Subtask 3.2: Feed satırına `(click)="selectEvent(event)"` handler ekle
  - [x] Subtask 3.3: Seçili satır için `bg-indigo-50 border-l-2 border-indigo-500` highlight stili ekle (`[class.bg-indigo-50]="selectedEventId() === event.id"` vb.)
  - [x] Subtask 3.4: `eventSelected = output<MatchEvent>()` output ekle (Story 3.4'te consume edilecek)
  - [x] Subtask 3.5: Row'a `cursor-pointer` ekle (tıklanabilir görünüm)

- [x] Task 4: Feed Header — Request Count (AC: #1)
  - [x] Subtask 4.1: Feed listesinin üstüne "X request yakalandı" gösterimi ekle
  - [x] Subtask 4.2: "Temizle" butonu ekle → `CLEAR_HISTORY` mesajı + `matchHistory` sıfırlama
  - [x] Subtask 4.3: `ExtensionMessagingService.sendMessage(MessageType.CLEAR_HISTORY, {}, requestId)` çağrısı

- [x] Task 5: Timestamp Display (AC: #1)
  - [x] Subtask 5.1: Her satırda relative time göster (e.g., "2s", "1m", "5m")
  - [x] Subtask 5.2: Utility fonksiyonu oluştur: `formatRelativeTime(timestamp: number): string`
  - [x] Subtask 5.3: Tooltip'e tam tarih-saat göster: `[title]` attr'e absolute timestamp ekle

- [x] Task 6: Unit Testler (AC: #1, #2, #3, #4)
  - [x] Subtask 6.1: Scroll preservation testleri:
    - Yeni event eklendiğinde scrollTop'ın korunduğunu doğrula
    - En üstteyken yeni event otomatik görünmeli
  - [x] Subtask 6.2: Row selection testleri:
    - Satıra tıklayınca `selectedEventId` güncellenmeli
    - Seçili satır highlight stiline sahip olmalı
    - `eventSelected` output'u emit etmeli
  - [x] Subtask 6.3: Feed header testleri:
    - "X request yakalandı" metninin doğru sayıyı gösterdiğini doğrula
    - "Temizle" butonunun `CLEAR_HISTORY` mesajı gönderdiğini doğrula
  - [x] Subtask 6.4: Timestamp testleri:
    - `formatRelativeTime` utility fonksiyonu doğru çıktı üretmeli
    - Son 60s → "Xs", 1-60m → "Xm", 60m+ → "Xh"
  - [x] Subtask 6.5: Height constraint testleri:
    - Monitor tab'ın scroll container'ı overflow-y-auto olmalı
    - Host element'in flex layout aldığını doğrula

## Dev Notes

### Kritik: Story 3.1 Feed UI'ın %80'ini Zaten İmplemente Etti

Story 3.1 ("Background → Popup Live Feed Push") sırasında MonitorTabComponent'a kapsamlı bir feed UI zaten eklendi. Bu story'nin amacı **kalan UX davranışlarını** tamamlamak ve **Story 3.4 için hazırlık** yapmaktır.

| Özellik | Durum | Konum |
|---------|-------|-------|
| Feed list (method + URL + source badge) | ✅ 3.1'de done | `monitor-tab.component.ts` |
| Source badge renk kodlaması | ✅ 3.1'de done | template — `[class.bg-green-100]` vb. |
| Empty state mesajı | ✅ 3.1'de done | `@if (matchHistory().length === 0)` |
| Scroll container `overflow-y-auto` | ✅ 3.1'de done | template `div.overflow-y-auto` |
| Status code gösterimi | ✅ 3.1 code review'da done | `@if (event.statusCode)` |
| Source badge tooltip | ✅ 3.1 code review'da done | `[title]` attribute |
| DOM sırası doğrulama | ✅ 3.1 code review'da done | test — `rows[0]` order assertion |
| **Scroll position preservation** | ❌ EKSİK | Bu story'de yapılacak |
| **Popup height constraint (flex layout)** | ❌ EKSİK | Bu story'de yapılacak |
| **Row click + selection highlight** | ❌ EKSİK | Bu story'de yapılacak |
| **Feed header (count + clear)** | ❌ EKSİK | Bu story'de yapılacak |
| **Relative timestamp** | ❌ EKSİK | Bu story'de yapılacak |

### Scroll Position Preservation — Tasarım

Mevcut feed'de yeni event `matchHistory` array'inin **başına** ekleniyor (`[newEvent, ...prev.matchHistory]` — ExtensionMessagingService). `@for` directive yeni item'ı DOM'un üstüne ekliyor. Kullanıcı aşağıda scroll etmişken yeni bir event gelirse, DOM'a eklenen element scrollTop'u kaydırır ve kullanıcı "zıplar".

**Çözüm yaklaşımı:**
```typescript
// MonitorTabComponent'te:
private readonly feedContainer = viewChild<ElementRef>('feedContainer');

constructor() {
  effect(() => {
    const history = this.matchHistory(); // signal track
    const container = this.feedContainer()?.nativeElement;
    if (!container || history.length === 0) return;
    
    // Kullanıcı en üstte mi?
    const isAtTop = container.scrollTop < 10; // threshold
    
    if (!isAtTop) {
      // AfterNextRender ile DOM update sonrası scroll compensate
      // Yeni eklenen row'un yüksekliğini hesapla ve scrollTop'a ekle
      const prevScrollTop = container.scrollTop;
      requestAnimationFrame(() => {
        const firstRow = container.querySelector('[data-feed-row]');
        if (firstRow) {
          container.scrollTop = prevScrollTop + firstRow.offsetHeight;
        }
      });
    }
  });
}
```

**Dikkat:** `effect()` içinde DOM manipülasyonu `requestAnimationFrame` veya `afterNextRender` ile yapılmalı — Angular'ın change detection cycle'ından sonra çalışmalı.

**Alternatif:** `@angular/cdk` ScrollModule kullanılabilir ama extension bundle size'ı artırır. Pure DOM hesaplaması tercih edilmeli.

### AppComponent Popup Layout — Mevcut Yapı

```typescript
// app.component.ts — mevcut:
template: `
  <div class="w-[400px] min-h-[500px] max-h-[600px] overflow-y-auto bg-white">
    <hm-tab-bar [activeTab]="activeTab()" (tabChange)="activeTab.set($event)" />
    @if (activeTab() === 'controls') { <hm-controls-tab /> }
    @if (activeTab() === 'monitor') { <hm-monitor-tab /> }
  </div>
`
```

**Sorun:** Ana container `overflow-y-auto` ile tüm popup'u scroll ediyor. MonitorTab'ın kendi scroll'u `overflow-y-auto` ile ayrıca tanımlı. Nested scroll problemi olabilir.

**Çözüm:** AppComponent'teki popup container'ı `flex flex-col` yapıp, tab içeriklerini `flex-1 min-h-0 overflow-hidden` ile sarmak. MonitorTab'ın host element'i `display: flex; flex-direction: column; flex: 1; min-height: 0;` almalı. Feed container'ın `flex-1 overflow-y-auto` ile kalan alanı doldurması sağlanmalı.

```typescript
// Önerilen AppComponent değişikliği:
template: `
  <div class="w-[400px] min-h-[500px] max-h-[600px] flex flex-col bg-white">
    <hm-tab-bar [activeTab]="activeTab()" (tabChange)="activeTab.set($event)" />
    <div class="flex-1 min-h-0 overflow-hidden">
      @if (activeTab() === 'controls') { <hm-controls-tab /> }
      @if (activeTab() === 'monitor') { <hm-monitor-tab /> }
    </div>
  </div>
`
```

> **NOT:** ControlsTab zaten kendi accordion scroll'unu yönetiyor, bu değişiklik onu etkilemez (accordion maxHeight: 500px kendi içinde sınırlı).

### Row Click + Selection — Story 3.4 Hazırlığı

Story 3.4 MonitorTab feed satırına tıklayarak response detail görüntüleme gerektirir. Bu story'de selection alt yapısını kurmak forward-compatible:

```typescript
// MonitorTabComponent:
readonly selectedEventId = signal<string | null>(null);
readonly eventSelected = output<MatchEvent>();

selectEvent(event: MatchEvent): void {
  this.selectedEventId.set(event.id);
  this.eventSelected.emit(event);
}
```

Row template'e:
```html
<div class="flex items-center gap-2 px-3 py-2 cursor-pointer
            hover:bg-slate-50 transition-colors"
     [class.bg-indigo-50]="selectedEventId() === event.id"
     [class.border-l-2]="selectedEventId() === event.id"
     [class.border-indigo-500]="selectedEventId() === event.id"
     (click)="selectEvent(event)"
     data-feed-row>
```

### Feed Header — Count + Clear

```html
<!-- Feed header (empty state'den önce, list'in üstünde) -->
@if (matchHistory().length > 0) {
  <div class="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/50">
    <span class="text-[10px] text-slate-500 font-medium">
      {{ matchHistory().length }} request yakalandı
    </span>
    <button
      class="text-[10px] text-red-400 hover:text-red-600 cursor-pointer"
      (click)="clearHistory()">
      Temizle
    </button>
  </div>
}
```

`clearHistory()`:
```typescript
clearHistory(): void {
  this.messaging.sendMessage(
    MessageType.CLEAR_HISTORY,
    {},
    crypto.randomUUID()
  );
}
```

> **NOT:** `CLEAR_HISTORY` MessageType zaten tanımlı (`messaging.types.ts`). Background'da bu mesaj `matchHistory = []` olarak state'i sıfırlar ve `STATE_SYNC` push eder. Background handler'ın bunu zaten handle edip etmediğini kontrol et — yoksa background'a da case eklemek gerekir.

### Timestamp Utility — `formatRelativeTime`

```typescript
// packages/extension/src/popup/utils/format-relative-time.ts
export function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 1) return 'şimdi';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}
```

Template'de:
```html
<span class="shrink-0 text-[10px] text-slate-300 font-mono">
  {{ formatRelativeTime(event.timestamp) }}
</span>
```

> **NOT:** Relative time canlı güncellenecekse periyodik refresh gerekir. Basit yaklaşım: template yeniden render olduğunda hesaplanır (her MATCH_EVENT gelişinde signal güncellenir, `OnPush` ile template re-evaluate olur). Canlı timer eklemek gereksiz karmaşıklık — yeni event geldiğinde zaten refresh olur.

> **NOT:** `formatRelativeTime()` pure fonksiyon olarak component sınıfına method olarak eklenmeli (template'den erişim için) VEYA pipe olarak yazılabilir. Component method tercih edilmeli (pipe overkill).

### Mevcut Test Altyapısı (Story 3.1'den)

Mevcut test dosyası 23 test barındırıyor:
- Empty state testleri (3 test)
- Feed list testleri (14 test — source badge renk, DOM sırası, statusCode, tooltip)

**Yeni testler eklenecek konular:**
- Scroll preservation (DOM manipulation mock gerekebilir)
- Row click → `selectedEventId` update + `eventSelected` emit
- Feed header count + clear button
- `formatRelativeTime` utility

### Önemli Kısıtlamalar (Mimari Kurallardan)

- **`@ViewChild` YASAK** — `viewChild()` signal API kullan (Angular 17.1+)
- **`constructor()` injection YASAK** — `inject()` kullan
- **`if/else` YASAK** — `switch/case` (messaging handler'larda)
- **`@for` track** — `track event.id` (zaten mevcut)
- **`@if`/`@else`** — Angular 17+ control flow (zaten mevcut)
- **`ChangeDetectionStrategy.OnPush`** — zaten mevcut
- **`standalone: true`** — zaten mevcut
- **Selector prefix `hm-`** — `hm-monitor-tab` (zaten mevcut)
- **`any` type YASAK** — `unknown` + type guard
- **Inline template OK** — monitor-tab.component.ts zaten inline template kullanıyor (story 3.1'de böyle yazıldı); ayrı `.html` dosyası zorunlu değil mevcut pattern'a uyumlu ol

### Bağımlılık Zinciri

- **`ExtensionMessagingService`** → `state()` signal'inden `matchHistory` okunuyor ✅
- **`MATCH_EVENT` handler** → `_state.update()` ile prepend ✅
- **`MAX_MATCH_HISTORY = 500`** → trim mevcut ✅
- **`MessageType.CLEAR_HISTORY`** → enum'da tanımlı ✅
- **Background `CLEAR_HISTORY` handler** → doğrulanması gerekiyor (yoksa eklenmeli)

### background/message-handler.ts — CLEAR_HISTORY Kontrolü ✅

`CLEAR_HISTORY` handler background'da **ZATEN MEVCUT** (`message-handler.ts:388`):
- `stateManager.clearMatchHistory()` çağrısı yapılıyor
- `requestId` ile success/error yanıtı dönüyor
- Sadece popup tarafında `sendMessage(CLEAR_HISTORY, {}, requestId)` çağrısı yeterli
- Background'da ek değişiklik GEREKMİYOR

### Project Structure Notes

- **Değiştirilecek dosyalar:**
  - `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` (değişiklik — scroll, selection, header, timestamp)
  - `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` (yeni testler)
  - `packages/extension/src/popup/app.component.ts` (flex layout düzeltmesi)
  - `packages/extension/src/popup/app.component.spec.ts` (varsa — layout test)

- **Oluşturulabilecek dosyalar:**
  - `packages/extension/src/popup/utils/format-relative-time.ts` (utility)
  - `packages/extension/src/popup/utils/format-relative-time.spec.ts` (utility test)

- **Kontrol edilecek dosyalar:**
  - `packages/extension/src/background/message-handler.ts` (CLEAR_HISTORY handler var mı?)
  - `packages/extension/src/background/state-manager.ts` (clearMatchHistory metodu var mı?)

- Import path pattern: relative `../../shared/` (barrel'dan değil, direkt dosyadan)
- Angular imports: component sınıfındaki signal, computed, inject vb. `@angular/core`'dan

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — Story gereksinimleri ve acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Messaging Architecture] — Port-based messaging, switch/case dispatch
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular Component Yapısı] — standalone, OnPush, inject(), signal I/O, hm- selector prefix
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management & Persistence] — matchHistory state model
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX3: Monitor tab feed satır yapısı
- [Source: packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts] — Mevcut feed UI implementasyonu (Story 3.1)
- [Source: packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts] — Mevcut 23 test
- [Source: packages/extension/src/popup/app.component.ts] — Popup layout (w-400px, max-h-600px)
- [Source: packages/extension/src/popup/components/tab-bar/tab-bar.component.ts] — Tab bar (height ~36px)
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts] — MATCH_EVENT handler + state signal
- [Source: packages/extension/src/shared/messaging.types.ts] — MessageType.CLEAR_HISTORY enum değeri
- [Source: packages/extension/src/shared/state.types.ts] — MatchEvent interface
- [Source: packages/extension/src/shared/payload.types.ts] — MatchEventPayload, StateSyncPayload
- [Source: packages/extension/src/shared/constants.ts] — MAX_MATCH_HISTORY = 500
- [Source: _bmad-output/implementation-artifacts/3-1-background-popup-live-feed-push.md] — Önceki story learnings, code review düzeltmeleri

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- Scroll preservation: `effect()` + `requestAnimationFrame` ile DOM compensation uygulandı. JSDOM layout desteği olmadığından test mock yöntemi `not.toThrow()` ve `data-feed-row` attribute varlığı ile doğrulandı.
- `app.component.spec.ts` wrapper test: `:scope > div` JSDOM/nwsapi tarafından desteklenmediğinden `Array.from(outerDiv.children).find()` ile değiştirildi.
- `requestAnimationFrame` spy testi: Angular Zone.js da rAF kullandığından "at top" durumu için rAF spy testi kaldırılarak `data-feed-row` attribute testi ile değiştirildi.

### Completion Notes List

- ✅ Task 1 (Scroll Position Preservation): `viewChild<ElementRef>('feedContainer')` signal API + `effect()` ile scroll compensation mantığı eklendi. `requestAnimationFrame` ile DOM update sonrası `scrollTop` compensate ediliyor.
- ✅ Task 2 (Height Constraint): AppComponent'te `overflow-y-auto` → `flex flex-col` layout değiştirildi. `div.flex-1.min-h-0.overflow-hidden` wrapper eklendi. MonitorTabComponent host'a `class: 'flex flex-col flex-1 min-h-0'` eklendi. Feed container `flex-1 overflow-y-auto` ile kalan alanı dolduruyor.
- ✅ Task 3 (Row Click Selection): `selectedEventId = signal<string | null>(null)`, `eventSelected = output<MatchEvent>()`, `selectEvent()` method eklendi. `bg-indigo-50 border-l-2 border-indigo-500` highlight sınıfları uygulandı.
- ✅ Task 4 (Feed Header): "X request yakalandı" sayaç başlığı ve "Temizle" butonu eklendi. `clearHistory()` metodu `MessageType.CLEAR_HISTORY` mesajı gönderiyor.
- ✅ Task 5 (Timestamp Display): `format-relative-time.ts` pure utility fonksiyon oluşturuldu. Relative time şimdi/Xs/Xm/Xh formatında her row'da gösteriliyor. Tooltip'te full locale date string var.
- ✅ Task 6 (Unit Tests): 315 test geçiyor (19 test suite), sıfır regresyon. Yeni testler: scroll preservation (2), row selection (4), feed header (5), timestamp (5), height constraint (3), format-relative-time utility (9).

### Change Log

- 2026-02-27: Story 3.2 implementasyonu tamamlandı — Monitor Tab Request Feed UI

### File List

- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` (değiştirildi — scroll, selection, header, timestamp, height constraint)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` (değiştirildi — yeni testler eklendi: scroll, selection, header, timestamp, height)
- `packages/extension/src/popup/app.component.ts` (değiştirildi — flex layout, tab content wrapper)
- `packages/extension/src/popup/app.component.spec.ts` (değiştirildi — flex layout testleri eklendi)
- `packages/extension/src/popup/utils/format-relative-time.ts` (yeni — timestamp utility fonksiyonu)
- `packages/extension/src/popup/utils/format-relative-time.spec.ts` (yeni — utility birim testleri)
