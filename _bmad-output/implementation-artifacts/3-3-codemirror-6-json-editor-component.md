# Story 3.3: CodeMirror 6 JSON Editör Component

Status: ready-for-dev

## Story

As a developer,
I want `hm-json-editor` Angular standalone component'ini CodeMirror 6 tabanlı,
so that response body'yi syntax-highlighted, validation'lı JSON editörde görüntüleyebileyim ve düzenleyebileyim; 400px popup constraint'i içinde kullanışlı olsun.

## Acceptance Criteria (BDD)

1. **Given** `hm-json-editor` component'i `readonly: false` ile render edildiğinde **When** editör görüntülendiğinde **Then** CodeMirror 6 aktif olmalı; JSON syntax highlighting uygulanmalı; geçersiz JSON için inline linting gösterilmeli (UX4)

2. **Given** `readonly: true` input'u verildiğinde **When** editör görüntülendiğinde **Then** editör read-only modda olmalı; cursor yok; JSON syntax highlighting aktif olmalı

3. **Given** editöre geçersiz JSON girildiğinde **When** kullanıcı yazmayı bitirdiğinde **Then** hatalı satırda kırmızı lint işareti gösterilmeli; `valueChange` output eventi emit edilmemeli

4. **Given** `@codemirror/lang-json`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lint` paketleri **When** extension popup build alındığında **Then** toplam CodeMirror bundle katkısı 150KB'dan az olmalı (UX4)

5. **Given** component yazıldığında **When** Angular architecture kuralları kontrol edildiğinde **Then** `standalone: true`, `ChangeDetectionStrategy.OnPush`, `inject()` DI, signal-based `input()`/`output()` kullanılmış olmalı; decorator `@Input()`/`@Output()` bulunmamalı (UX5)

6. **Given** `value` input'u değiştiğinde (dışarıdan) **When** Angular change detection çalıştığında **Then** EditorView'in content'i yeni değere güncellenmeli; kullanıcının manuel düzenlediği text ezilmemeli (sadece programmatic update)

7. **Given** component destroy edildiğinde **When** popup kapandığında veya component unmount edildiğinde **Then** EditorView instance temizlenmeli; bellek sızıntısı olmamalı

## Tasks / Subtasks

- [ ] Task 1: CodeMirror 6 paket kurulumu (AC: #1, #4)
  - [ ] Subtask 1.1: `packages/extension/package.json`'a bağımlılık ekle: `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-json`, `@codemirror/lint`
  - [ ] Subtask 1.2: `yarn install` ile paketleri kur

- [ ] Task 2: `hm-json-editor` component oluşturma (AC: #1, #2, #5, #7)
  - [ ] Subtask 2.1: Dosyaları oluştur:
    - `packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts`
    - `packages/extension/src/popup/components/json-editor/hm-json-editor.component.html`
    - `packages/extension/src/popup/components/json-editor/hm-json-editor.component.spec.ts`
  - [ ] Subtask 2.2: Signal-based inputs tanımla: `value = input<string>('')` ve `readonly = input<boolean>(false)`
  - [ ] Subtask 2.3: `valueChange = output<string>()` output tanımla
  - [ ] Subtask 2.4: `viewChild<ElementRef>('editorContainer')` ile container referansı al
  - [ ] Subtask 2.5: `DestroyRef` inject edip `onDestroy` callback'inde `editorView.destroy()` çağır

- [ ] Task 3: CodeMirror 6 EditorView entegrasyonu (AC: #1, #2, #3, #6)
  - [ ] Subtask 3.1: `afterRenderEffect` ile EditorView'i ilk render'da initialize et (DOM hazır olduğunda)
  - [ ] Subtask 3.2: EditorState extensions: `json()`, `lintGutter()`, `lintKeymap`, temel keymap'ler, `EditorView.theme()` ile özel stil
  - [ ] Subtask 3.3: `readonly = true` ise `EditorState.readOnly.of(true)` + `EditorView.editable.of(false)` ekle
  - [ ] Subtask 3.4: `updateListener` extension ile JSON valid olduğunda `valueChange.emit()` tetikle
  - [ ] Subtask 3.5: `value` input değiştiğinde `effect()` ile EditorView content'ini programmatic olarak güncelle (`dispatch` + `transaction`)

- [ ] Task 4: Read-only mode implementasyonu (AC: #2)
  - [ ] Subtask 4.1: `readonly` input'u izle; değiştiğinde EditorView'e `StateEffect` veya yeni EditorState ile güncelle
  - [ ] Subtask 4.2: `readonly: true` iken cursor'ı gizle: `.cm-cursor { display: none }` tema override

- [ ] Task 5: JSON lint/validation (AC: #3)
  - [ ] Subtask 5.1: `@codemirror/lint`'ten `linter()` ile JSON parse hatalarını yakala
  - [ ] Subtask 5.2: `jsonParseLinter()` kullan (lang-json'da built-in) — manuel linter yazmaya gerek yok
  - [ ] Subtask 5.3: `updateListener`'da geçerli JSON kontrolü: `JSON.parse(doc.toString())` try/catch, hata varsa emit etme

- [ ] Task 6: Unit testler (AC: #1–7)
  - [ ] Subtask 6.1: Component create testi — fixture oluşturulabilmeli, hata yokken `CodeMirrorMock` kullanılabilir
  - [ ] Subtask 6.2: `readonly: true` input testi — CSS veya `EditorState.readOnly` attribute kontrol
  - [ ] Subtask 6.3: `value` input güncellendiğinde EditorView dispatch tetiklenmeli
  - [ ] Subtask 6.4: Geçerli JSON → `valueChange` emit; geçersiz JSON → emit yok
  - [ ] Subtask 6.5: `ngOnDestroy` veya DestroyRef callback → `editorView.destroy()` çağrıldığını doğrula

## Dev Notes

### Proje Yapısı — Dosya Konumları

- **Component:** `packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts`
- **Template:** `packages/extension/src/popup/components/json-editor/hm-json-editor.component.html`
- **Spec:** `packages/extension/src/popup/components/json-editor/hm-json-editor.component.spec.ts`

> **ÖNEMLİ:** Mimari dokümana göre template ayrı HTML dosyasında olmalı (`templateUrl`) — `hm-har-upload.component.ts` bu pattern'i kullanıyor. `MonitorTabComponent`'in inline template kullandığı bilinçli bir sapma.

### Kurulacak Paketler — `packages/extension/package.json`

```json
"@codemirror/lang-json": "^6.0.1",
"@codemirror/lint": "^6.8.4",
"@codemirror/state": "^6.5.2",
"@codemirror/view": "^6.36.5"
```

> **NOT:** `@codemirror/lang-json` zaten `@codemirror/state` ve `@codemirror/view`'ı transitively getirir. Tüm paketleri explicit olarak ekle — peer dependency resolver sorunlarını önler.

### Angular 18 + CodeMirror 6 Entegrasyon Stratejisi

**Problem:** CodeMirror `EditorView` DOM element'e mount edilir. Angular'da component template'i ilk render olduktan sonra DOM kullanılabilir. `ngAfterViewInit` hook veya `afterRenderEffect` ile initialize edilmeli.

**Doğru Yaklaşım — `afterRenderEffect` (Angular 18+):**

```typescript
import { afterRenderEffect, effect, ElementRef, viewChild, inject, DestroyRef, input, output } from '@angular/core';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, StateEffect, Compartment } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { defaultKeymap } from '@codemirror/commands';

// Compartments: runtime-configurable extensions
private readonly editableCompartment = new Compartment();

private editorView: EditorView | null = null;
private readonly editorContainer = viewChild<ElementRef<HTMLElement>>('editorContainer');
private readonly destroyRef = inject(DestroyRef);

constructor() {
  afterRenderEffect(() => {
    const container = this.editorContainer()?.nativeElement;
    if (!container || this.editorView) return; // zaten init edilmiş
    
    this.editorView = new EditorView({
      state: this.createEditorState(),
      parent: container,
    });

    this.destroyRef.onDestroy(() => {
      this.editorView?.destroy();
      this.editorView = null;
    });
  });

  // value input değiştiğinde EditorView'i güncelle
  effect(() => {
    const newValue = this.value();
    if (!this.editorView) return;
    
    const currentValue = this.editorView.state.doc.toString();
    if (currentValue === newValue) return; // aynıysa gereksiz dispatch önle
    
    this.editorView.dispatch({
      changes: { from: 0, to: currentValue.length, insert: newValue },
    });
  });
}
```

**`createEditorState()` metodu:**

```typescript
private createEditorState(): EditorState {
  const isReadOnly = this.readonly();
  
  return EditorState.create({
    doc: this.value(),
    extensions: [
      json(),
      linter(jsonParseLinter()),
      lintGutter(),
      keymap.of(defaultKeymap),
      lineNumbers(),
      this.editableCompartment.of([
        EditorState.readOnly.of(isReadOnly),
        EditorView.editable.of(!isReadOnly),
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const content = update.state.doc.toString();
        try {
          JSON.parse(content);
          this.valueChange.emit(content); // sadece valid JSON'da emit
        } catch {
          // geçersiz JSON — emit yok
        }
      }),
      EditorView.theme({
        '&': { fontSize: '12px', height: '200px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
        '.cm-cursor': { display: isReadOnly ? 'none' : 'block' },
      }),
    ],
  });
}
```

**`readonly` değiştiğinde Compartment güncellemesi:**

```typescript
effect(() => {
  const isReadOnly = this.readonly();
  if (!this.editorView) return;
  
  this.editorView.dispatch({
    effects: this.editableCompartment.reconfigure([
      EditorState.readOnly.of(isReadOnly),
      EditorView.editable.of(!isReadOnly),
    ]),
  });
});
```

### Bundle Size Stratejisi (UX4 — 150KB Limiti)

CodeMirror 6 tree-shakeable — sadece kullanılan modüller bundle'a girer.

| Paket | Tahmini Katkı |
|-------|--------------|
| `@codemirror/view` (core) | ~50KB |
| `@codemirror/state` (core) | ~20KB |
| `@codemirror/lang-json` | ~5KB |
| `@codemirror/lint` | ~10KB |
| `@codemirror/commands` (defaultKeymap) | ~15KB |
| **Toplam (gzip'li)** | **~40-60KB** |

> 150KB limitinin çok altında kalınması bekleniyor. Webpack ile tree-shaking aktif.

### Component API Tasarımı — Story 3.4 Uyumluluğu

Story 3.4 (Response Viewer & Inline Edit) bu component'i consume edecek. API'nin forward-compatible olması kritik:

```typescript
// Story 3.3'te oluşturulacak API:
//   <hm-json-editor [value]="responseBody()" [readonly]="false" (valueChange)="onEdit($event)" />
//
// Story 3.4'te kullanılacak:
//   <hm-json-editor [value]="selectedEvent()?.body" [readonly]="false" (valueChange)="onBodyEdit($event)" />
//   <hm-json-editor [value]="selectedEvent()?.body" [readonly]="true" />

// Component public API:
readonly value = input<string>('');        // JSON string — başlangıç değeri
readonly readonly = input<boolean>(false); // edit/view mode
readonly valueChange = output<string>();   // emit sadece valid JSON'da
```

### Proje Geneli Pattern'lar (Story 3.2'den Öğrenildi)

1. **Pipe kuralı:** Template'te fonksiyon çağrısı YASAK. Veri dönüşümü için `pure: true` pipe kullanılmalı. `RelativeTimePipe` ve `LocaleDatePipe` bu yüzden oluşturuldu. JSON editör için template'te doğrudan signal getter `value()` kullanmak OK.

2. **`afterRenderEffect` vs `ngAfterViewInit`:** Angular 18'de `afterRenderEffect` preferred. SSR-safe ve signal tracking desteği var. `viewChild` signal ile birlikte doğal çalışır.

3. **DestroyRef pattern:** `inject(DestroyRef).onDestroy(cb)` — constructor/effect içinden çağrılabilir. `ngOnDestroy` lifecycle hook yerine tercih edilmeli (injection context'te çalışır).

4. **Template — ayrı HTML dosyası:** `templateUrl: './hm-json-editor.component.html'` kullan. `hm-har-upload.component.ts` bu pattern'i kullanıyor.

5. **Selector prefix:** `hm-json-editor` — proje geneli `hm-` prefix standardı.

### Test Stratejisi — CodeMirror Mock Yaklaşımı

JSDOM ortamında CodeMirror full DOM API'ye ihtiyaç duyar. Jest-jsdom ortamında bazı CodeMirror özellikleri sorun çıkarabilir. Önerilen yaklaşım:

```typescript
// Mock'suz basit integration test:
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { JSONEditorComponent } from './hm-json-editor.component';

// Test host wrapper
@Component({
  standalone: true,
  imports: [JSONEditorComponent],
  template: `<hm-json-editor [value]="value" [readonly]="readOnly" (valueChange)="onValueChange($event)" />`
})
class TestHostComponent {
  value = '{}';
  readOnly = false;
  lastEmitted: string | null = null;
  onValueChange(v: string) { this.lastEmitted = v; }
}
```

**Test coverage hedefleri:**
- Component oluşturma: DOM'a mount oluyor mu?
- `readonly: true` → `.cm-editor .cm-content` attribute `contenteditable="false"` olmalı
- `value` değiştiğinde editorView.dispatch çağrılıyor mu? (spy)
- `editorView.destroy()` onDestroy'da çağrılıyor mu?
- Geçerli JSON → `valueChange` emit; geçersiz → emit yok (linter delay var, `fakeAsync` + `tick()` kullanılabilir)

> **CodeMirror JSDOM notu:** `getBoundingClientRect`, `IntersectionObserver`, `ResizeObserver` JSDOM'da yoktur. `jest.fn()` ile mock'lanması gerekebilir. Önceki story'lerde buna benzer DOM mock ihtiyaçları karşılaşılmıştı (Story 3.2: `requestAnimationFrame` spy).

### Önceki Story'lerden Gelen Kritik Uyarılar

| Kural | Kaynak |
|-------|--------|
| `@ViewChild` YASAK — `viewChild()` signal kullan | Story 3.2 dev notes |
| Constructor injection YASAK — `inject()` kullan | Architecture |
| `any` type YASAK — `unknown` + type guard | Architecture |
| Inline template büyük ihtimalle OK ama templateUrl mimari kural | Architecture + Story 3.2 review [L3] |
| `requestAnimationFrame` cancel — DestroyRef ile | Story 3.2 code review [H2] |
| Test'te DOM manipulation mock gerekebilir (offsetHeight, rAF) | Story 3.2 debug log |
| `effect()` içinde DOM manipulation — `afterRenderEffect` veya `requestAnimationFrame` sonrası | Story 3.2 |

### Bağımlılık Analizi — Story 3.4 İçin Hazırlık

Story 3.4 (Response Viewer & Inline Edit & Persist) bu component'i kullanacak:
- `MonitorTabComponent`'in `eventSelected` output'u (Story 3.2'de eklendi) → response body'yi `hm-json-editor`'e geçirecek
- `UPDATE_RESPONSE` MessageType (messaging.types.ts'te zaten tanımlı — mevcut bağımlılık yok)
- Bu story'de oluşturulacak `hm-json-editor` API'si Story 3.4'te doğrudan kullanılacak

### Mimari Kontrol Noktaları

- [ ] `standalone: true` ✓
- [ ] `ChangeDetectionStrategy.OnPush` ✓
- [ ] `inject()` DI — constructor injection YOK ✓
- [ ] `input()` / `output()` signal API — `@Input()` / `@Output()` YOK ✓
- [ ] `viewChild()` signal API — `@ViewChild` YOK ✓
- [ ] `DestroyRef.onDestroy()` ile cleanup ✓
- [ ] `any` tipi YASAK ✓
- [ ] Selector: `hm-json-editor` (hm- prefix) ✓
- [ ] Template: `templateUrl` ayrı HTML dosyası ✓
- [ ] CodeMirror bundle katkısı < 150KB ✓

### Project Structure Notes

**Oluşturulacak dosyalar:**
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.ts`
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.html`
- `packages/extension/src/popup/components/json-editor/hm-json-editor.component.spec.ts`

**Güncellenecek dosyalar:**
- `packages/extension/package.json` — `@codemirror/*` bağımlılıkları ekle

**Referans alınacak dosyalar:**
- `packages/extension/src/popup/components/har-upload/hm-har-upload.component.ts` — templateUrl pattern, signal input/output
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` — viewChild, effect, DestroyRef pattern (Story 3.2)
- `packages/extension/src/popup/components/accordion/accordion.component.ts` — input() / output() pattern örneği
- `packages/extension/src/shared/messaging.types.ts` — `UPDATE_RESPONSE` MessageType (Story 3.4 için hazır)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — Story gereksinimleri ve acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Editor] — CodeMirror 6 seçim kararı ve bundle rationale
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular Component Yapısı] — standalone, OnPush, inject(), templateUrl kuralı
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX4: CodeMirror 6, 400px popup constraint, 150KB limit
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX5: Angular component standartları
- [Source: _bmad-output/implementation-artifacts/3-2-monitor-tab-request-feed-ui.md] — viewChild signal, effect, DestroyRef onDestroy pattern (code review H2 — cancelAnimationFrame)
- [Source: packages/extension/src/popup/components/har-upload/hm-har-upload.component.ts] — templateUrl, signal input/output pattern
- [Source: packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts] — effect, viewChild, DestroyRef mevcut implementasyon
- [Source: packages/extension/src/popup/pipes/relative-time.pipe.ts] — pure pipe pattern (template fonksiyon çağrısı yerine)
- [Source: packages/extension/src/shared/messaging.types.ts] — UPDATE_RESPONSE MessageType (Story 3.4 bağımlısı)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
