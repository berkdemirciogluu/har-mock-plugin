# Story 2.3: HAR Yükleme UI — Drag & Drop + File Picker

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Controls tab'ında HAR accordion içinde drag & drop zone ve file picker'ı,
So that HAR dosyasını popup'a sürükle-bırak veya file picker ile yükleyebileyim; yükleme sonrası auto-parameterization tetiklensin ve kaç endpoint eşleştirildiği anında gösterilsin.

## Acceptance Criteria

1. **Given** Controls tab → HAR accordion açık **When** popup görüntülendiğinde **Then** belirgin bir drag & drop zone görünmeli; "HAR dosyasını buraya sürükleyin veya seçin" placeholder text'i olmalı (FR1, FR2, UX2)

2. **Given** developer bir `.har` dosyasını drag & drop zone'a bıraktığında **When** `drop` event tetiklendiğinde **Then** dosya okunmalı; `HarParser.parseHar()` çağrılmalı; parse sonucu `AutoParameterizer.parameterize()` ile URL pattern'larına dönüştürülmeli; background SW'ye `LOAD_HAR` mesajı gönderilmeli (FR2, FR3)

3. **Given** developer file picker'dan `.har` dosyası seçtiğinde **When** dosya seçimi tamamlandığında **Then** aynı parse ve background SW kaydetme akışı çalışmalı (FR1)

4. **Given** HAR başarıyla yüklenip auto-parameterization tamamlandığında **When** background SW `LOAD_HAR` mesajını işlediğinde **Then** popupda "X endpoint eşleştirildi, intercept aktif" success feedback'i gösterilmeli; endpoint sayısı doğru olmalı (UX2)

5. **Given** geçersiz veya parse edilemeyen bir dosya yüklendiğinde **When** `HarParseError` fırlatıldığında **Then** popupda açık hata mesajı gösterilmeli; hata type + rootCause + suggestedAction içermeli; uygulama crash etmemeli (NFR13)

6. **Given** yüklenen HAR dosyası işlendiğinde **When** parse ve storage tamamlandığında **Then** HAR data yalnızca `chrome.storage.local`'da tutulmalı; hiçbir dış servise gönderilmemeli (NFR3, NFR4)

## Tasks / Subtasks

- [x] Task 1: `ExtensionMessagingService` — Popup ↔ Background Port Yönetimi (AC: #2, #3, #4)
  - [x] Subtask 1.1: `packages/extension/src/popup/services/extension-messaging.service.ts` oluştur:
    ```typescript
    @Injectable({ providedIn: 'root' })
    export class ExtensionMessagingService implements OnDestroy {
      private port: chrome.runtime.Port | null = null;
      private readonly _state = signal<StateSyncPayload | null>(null);
      readonly state = this._state.asReadonly();

      connect(): void { /* chrome.runtime.connect({ name: PORT_NAME_POPUP }) */ }
      disconnect(): void { /* port?.disconnect() */ }
      sendMessage<T>(type: MessageType, payload: T, requestId: string): Promise<MessageResponse> { ... }
      ngOnDestroy(): void { this.disconnect(); }
    }
    ```
  - [x] Subtask 1.2: `extension-messaging.service.spec.ts` → chrome.runtime mock'u ile connect/disconnect/sendMessage birim testleri

- [x] Task 2: `HarUploadComponent` — Drag & Drop + File Picker UI (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 2.1: `packages/extension/src/popup/components/har-upload/` klasörü oluştur; aşağıdaki dosyalar:
    - `hm-har-upload.component.ts`
    - `hm-har-upload.component.html`
    - `hm-har-upload.component.spec.ts`
  - [x] Subtask 2.2: `hm-har-upload.component.ts` — Signal-based state:
    ```typescript
    @Component({
      selector: 'hm-har-upload',
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      templateUrl: './hm-har-upload.component.html',
      imports: [CommonModule],
    })
    export class HarUploadComponent {
      private readonly messaging = inject(ExtensionMessagingService);

      readonly isDragOver = signal(false);
      readonly isLoading = signal(false);
      readonly loadedFileName = signal<string | null>(null);
      readonly endpointCount = signal<number | null>(null);
      readonly errorMessage = signal<string | null>(null);
      readonly onEndpointLoaded = output<number>();

      onDragOver(event: DragEvent): void { ... }
      onDragLeave(event: DragEvent): void { ... }
      onDrop(event: DragEvent): void { ... }
      onFileInputChange(event: Event): void { ... }
      private processFile(file: File): void { ... }
    }
    ```
  - [x] Subtask 2.3: `processFile(file: File)` implementasyonu:
    ```typescript
    private processFile(file: File): void {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      file.text().then((raw) => {
        const harFile = HarParser.parseHar(raw);  // throws HarParseError
        const patterns = AutoParameterizer.parameterize(harFile.log.entries);
        const payload: LoadHarPayload = {
          entries: harFile.log.entries,
          patterns,
          fileName: file.name,
        };
        return this.messaging.sendMessage(MessageType.LOAD_HAR, payload, crypto.randomUUID());
      }).then((response) => {
        if (response.success) {
          this.loadedFileName.set(file.name);
          const count = (response.data as { patternCount: number } | undefined)?.patternCount ?? 0;
          this.endpointCount.set(count);
          this.onEndpointLoaded.emit(count);
        } else {
          this.errorMessage.set(response.error?.message ?? 'Bilinmeyen hata');
        }
      }).catch((err: unknown) => {
        if (err instanceof HarParseError) {
          this.errorMessage.set(`${err.type}: ${err.rootCause} — ${err.suggestedAction}`);
        } else {
          this.errorMessage.set('HAR dosyası işlenirken beklenmeyen hata oluştu.');
        }
      }).finally(() => {
        this.isLoading.set(false);
      });
    }
    ```
  - [x] Subtask 2.4: `hm-har-upload.component.html` — Tailwind CSS ile aşağıdaki durumları handle et:
    - **default:** dashed border zone, drop icon, "HAR dosyasını buraya sürükleyin veya seçin" text, "Dosya Seç" button
    - **drag-over:** mavi border + `ring-2 ring-indigo-400` highlight
    - **loading:** spinner + "İşleniyor..." text
    - **success:** yeşil check icon + "X endpoint eşleştirildi, intercept aktif" + dosya adı
    - **error:** kırmızı uyarı + hata mesajı + "Tekrar Dene" seçeneği (errorMessage.set(null))
  - [x] Subtask 2.5: `hm-har-upload.component.spec.ts` — JSDOM ortamında:
    - `dropEvent` ile processFile tetiklenir → mock `HarParser.parseHar()` ve `AutoParameterizer.parameterize()` → messaging.sendMessage çağrısı doğrulanır
    - Başarı durumunda `endpointCount` signal güncellenir
    - `HarParseError` durumunda `errorMessage` signal güncellenir
    - File input `change` event'i ile aynı akış çalışır
    - `.har` olmayan dosya → validasyon hatası mesajı gösterilir

- [x] Task 3: `ControlsTabComponent` güncelleme (AC: #1)
  - [x] Subtask 3.1: `controls-tab.component.ts`'e `HarUploadComponent` import'u ekle
  - [x] Subtask 3.2: HAR accordion içindeki placeholder `<p>` yerine `<hm-har-upload />` yerleştir
  - [x] Subtask 3.3: `endpointCount = signal<number | null>(null)` ekle; `(onEndpointLoaded)` event'i ile badge'i güncelle

- [x] Task 4: Background `message-handler.ts` — `LOAD_HAR` response genişletmesi (AC: #4)
  - [x] Subtask 4.1: `LOAD_HAR` case'inde response payload'ına `patternCount` alanı ekle:
    ```typescript
    case MessageType.LOAD_HAR: {
      const loadPayload = message.payload as LoadHarPayload;
      await stateManager.loadHar(loadPayload);
      port.postMessage({
        type: MessageType.LOAD_HAR,
        payload: {
          success: true,
          data: { patternCount: loadPayload.patterns.length },
        },
      });
      break;
    }
    ```
  - [x] Subtask 4.2: `message-handler.spec.ts` — `LOAD_HAR` response'unda `patternCount` doğrulaması

- [x] Task 5: `AppComponent` — `ExtensionMessagingService.connect()` entegrasyonu (AC: #2)
  - [x] Subtask 5.1: `app.component.ts`'te `ExtensionMessagingService` inject et; `implements OnInit` ekle; `ngOnInit()`'te `connect()` çağır
  - [x] Subtask 5.2: `app.component.spec.ts` güncelle — `connect()` çağrısını doğrula

- [x] Task 6: Testler & Coverage
  - [x] Subtask 6.1: `yarn test` — tüm testler geçmeli
  - [x] Subtask 6.2: Branch coverage ≥ %80 korunmalı (Story 2.2 standardı)
  - [x] Subtask 6.3: `yarn format:check` geçmeli

## Dev Notes

### Mimari Kural: Angular Component Yapısı (ZORUNLU)

```typescript
// DOĞRU — tüm component'lerde bu pattern
@Component({
  selector: 'hm-har-upload',
  standalone: true,                                    // NgModule YASAK
  changeDetection: ChangeDetectionStrategy.OnPush,     // ZORUNLU
  templateUrl: './hm-har-upload.component.html',       // inline template YASAK
  imports: [CommonModule],
})
export class HarUploadComponent {
  private readonly messaging = inject(ExtensionMessagingService); // constructor injection YASAK
  readonly isDragOver = signal(false);                             // signal-based state
  readonly onEndpointLoaded = output<number>();                    // output() fonksiyonu ZORUNLU
}
```

### Mimari Kural: Barrel Export (ZORUNLU)

```typescript
// DOĞRU
import { HarParser, AutoParameterizer, HarParseError } from '@har-mock/core';

// YANLIŞ — doğrudan implementation import YASAK
import { HarParser } from '../../core/src/har-parser/har-parser';
```

### Dosya Yapısı — Oluşturulacak Yeni Dosyalar

```
packages/extension/src/
├── popup/
│   ├── components/
│   │   ├── har-upload/                           ← YENİ KLASÖR
│   │   │   ├── hm-har-upload.component.ts
│   │   │   ├── hm-har-upload.component.html
│   │   │   └── hm-har-upload.component.spec.ts
│   │   └── controls-tab/
│   │       └── controls-tab.component.ts         ← GÜNCELLEME
│   ├── services/                                 ← YENİ KLASÖR
│   │   ├── extension-messaging.service.ts
│   │   └── extension-messaging.service.spec.ts
│   └── app.component.ts                          ← GÜNCELLEME (connect() + OnInit)
└── background/
    ├── message-handler.ts                        ← KÜÇÜK GÜNCELLEME (patternCount)
    └── message-handler.spec.ts                   ← GÜNCELLEME (patternCount test)
```

### Kritik: `HarParser.parseHar()` API'si (Core'dan)

Story 1.2'de implement edildi. Kullanım:

```typescript
import { HarParser, AutoParameterizer, HarParseError } from '@har-mock/core';

// raw string (File.text() sonucu) alır, HarFile döner; geçersizse HarParseError fırlatır
const harFile = HarParser.parseHar(rawString);

// HarEntry[] alır, UrlPattern[] döner
const patterns = AutoParameterizer.parameterize(harFile.log.entries);
```

`HarParseError` — `HarMockError`'ı extend eder; `.type`, `.rootCause`, `.suggestedAction` property'leri.

### Kritik: `ExtensionMessagingService` — Port Management Detayı

```typescript
// Port açılır → STATE_SYNC mesajı gelir → _state güncellenir
// sendMessage: Promise tabanlı, requestId ile response bekler (timeout: 5000ms önerilen)
// Background SW'ye: Message<T> { type, payload, requestId }
// Background'dan cevap: Message<T> { type, payload } — payload.success boolean içerir

sendMessage<T>(type: MessageType, payload: T, requestId: string): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
    const handler = (msg: Message<MessageResponse>) => {
      if (msg.payload && 'success' in msg.payload) {
        clearTimeout(timeout);
        this.port?.onMessage.removeListener(handler);
        resolve(msg.payload);
      }
    };
    this.port?.onMessage.addListener(handler);
    this.port?.postMessage({ type, payload, requestId });
  });
}
```

> **Not:** requestId ile eşleştirme yapmak daha güvenli olabilir; popup aynı anda birden fazla mesaj gönderebiliyorsa zorunlu. MVP için tip eşleştirmesi de yeterli olabilir — karar dev'e bırakılır.

### Kritik: DragEvent Dosya Erişimi

```typescript
// DragEvent'tan dosyayı alma — DOĞRU pattern
onDrop(event: DragEvent): void {
  event.preventDefault();
  this.isDragOver.set(false);
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  if (!file.name.endsWith('.har')) {
    this.errorMessage.set('Sadece .har uzantılı dosyalar desteklenir.');
    return;
  }
  this.processFile(file);
}

// File input'tan dosyayı alma
onFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  this.processFile(file);
  input.value = ''; // Aynı dosyayı yeniden seçmeye izin ver
}
```

### Kritik: `LoadHarPayload` — Mevcut Tip (`payload.types.ts`)

```typescript
// packages/extension/src/shared/payload.types.ts — MEVCUT, DEĞİŞTİRME
export interface LoadHarPayload {
  readonly entries: readonly HarEntry[];
  readonly patterns: readonly UrlPattern[];
  readonly fileName: string;
}
```

### Kritik: Tailwind CSS Popup Boyutu Kısıtı

Popup max genişliği `400px`, max yüksekliği `600px` (`app.component.ts` şablonunda sabit). Drag & drop zone bu kısıta uygun tasarlanmalı. Önerilen zone yüksekliği: `h-24` (96px).

### TypeScript Strict Mode Kuralları

1. **`any` YASAK** — `unknown` + type guard kullan
2. **`noUncheckedIndexedAccess: true`** — `Record<string, T>[key]` → `T | undefined`, null check zorunlu
3. **`readonly`** — tüm state objelerinde zorunlu
4. **`switch/case`** — `if/else` message dispatcher'da YASAK (`message-handler.ts`)
5. **`crypto.randomUUID()`** — requestId için (Chrome Extension context'te Web API olarak mevcut)

### Test Pattern — Chrome Runtime Mock

```typescript
// extension-messaging.service.spec.ts temel setup
const mockPort = {
  postMessage: jest.fn(),
  disconnect: jest.fn(),
  onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
  onDisconnect: { addListener: jest.fn() },
};

const mockChrome = {
  runtime: {
    connect: jest.fn().mockReturnValue(mockPort),
  },
};

(globalThis as Record<string, unknown>).chrome = mockChrome;
```

### Test Pattern — DragEvent Mock (JSDOM)

```typescript
// DragEvent JSDOM'da DataTransfer ile tam desteklenmez — manuel oluştur
function createMockDropEvent(file: File): DragEvent {
  const event = new Event('drop') as unknown as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files: [file] },
    writable: false,
  });
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  return event;
}
```

### Önceki Story'den Öğrenilenler (Story 2.2)

1. **Webpack çift config (popupConfig + swConfig)** — mevcut, dokunma. Yeni Angular component'ler otomatik popup bundle'a dahil olur.
2. **`tsconfig.popup.json` ve `tsconfig.sw.json`** — ayrı tsconfig'ler mevcut. Popup component'leri `tsconfig.popup.json` scope'unda.
3. **`transpileOnly: true` (swConfig)** — background SW değişikliklerinde type hataları build'de görünmez; `tsc --noEmit` ile kontrol et.
4. **ESLint override** — `*.spec.ts` için `unbound-method`, `no-unsafe-assignment`, `no-unsafe-member-access` kuralları kapalı.
5. **Coverage hedefi** — %80 branch coverage (Story 2.2'de %83.11 sağlandı). Aynı hedef korunmalı.
6. **`no-unused-vars` → `varsIgnorePattern: ^_`** — `_unused` pattern'ı ile kullanılmayan değişken uyarıları bastırılabilir.
7. **`@har-mock/core` barrel export** — `HarParser`, `AutoParameterizer`, `HarParseError` tümü `@har-mock/core`'dan import edilebilir (Story 1.2-1.3'te sağlandı).
8. **Review follow-up (Story 2.2):** `updateAccordionState` için `MessageType.UPDATE_ACCORDION` handler eksik — bu story'de accordion state push gerekmiyorsa dokunma. Mevcut `accordionStates` `StateManager`'da persist ediliyor.

### Background SW `LOAD_HAR` Handler — Mevcut vs Hedef

```typescript
// MEVCUT (Story 2.2'den — message-handler.ts):
port.postMessage({ type: MessageType.LOAD_HAR, payload: { success: true } });

// HEDEF (bu story — patternCount ek):
port.postMessage({
  type: MessageType.LOAD_HAR,
  payload: { success: true, data: { patternCount: loadPayload.patterns.length } },
});
```

### `AccordionComponent` Badge Entegrasyonu

`hm-accordion` component'i `badge` ve `badgeVariant` input'larını destekliyor (Story 2.1'de implement edildi). `ControlsTabComponent`'te:

```typescript
// controls-tab.component.ts
export class ControlsTabComponent {
  readonly endpointCount = signal<number | null>(null);
}
```

```html
<!-- controls-tab.component.html (template içinde) -->
<hm-accordion
  title="HAR"
  [expanded]="true"
  persistKey="har"
  [badge]="endpointCount() !== null ? endpointCount()!.toString() : ''"
  [badgeVariant]="endpointCount() !== null ? 'success' : 'default'"
>
  <hm-har-upload (onEndpointLoaded)="endpointCount.set($event)" />
</hm-accordion>
```

### UX Gereksinimleri (UX Spec'ten)

- **"Aha!" anı:** HAR yükleme başarılı olduğunda anında endpoint sayısı feedback'i — "42 endpoint eşleştirildi" developer güvenini ilk 10 saniyede kurar
- **Zero friction:** Sürükle-bırak → konfigürasyon adımı yok
- **Hata netliği:** Parse hatası → "hata tipi + neden + ne yapmalı" formatı (NFR13)
- **Progressive disclosure:** HAR Accordion varsayılan açık (`[expanded]="true"`) — Story 2.1'den, koru
- **Tailwind önerilen sınıflar:**
  - Zone default: `border-2 border-dashed border-slate-300 rounded-lg p-4 text-center transition-colors cursor-pointer`
  - Zone dragover: `border-indigo-400 bg-indigo-50 ring-2 ring-indigo-400 ring-offset-1`
  - Success state: `text-green-700 bg-green-50 border border-green-200 rounded-md p-2 text-xs`
  - Error state: `text-red-700 bg-red-50 border border-red-200 rounded-md p-2 text-xs`
  - Loading spinner: `animate-spin` sınıfı ile SVG circle

### Project Structure Notes

- `services/` klasörü `packages/extension/src/popup/` altında oluşturulacak (architecture.md'de öngörülmüş)
- `har-upload/` klasörü `packages/extension/src/popup/components/` altında
- `HarUploadComponent` Angular standalone — NgModule'e ekleme gerekmez
- `ExtensionMessagingService` `providedIn: 'root'` → `bootstrapApplication()` içinde otomatik singleton
- `app.component.ts`'te `APP_INITIALIZER` gerekmez; `implements OnInit` + `ngOnInit()` yeterli
- `HarParser` ve `AutoParameterizer` — statik metodları olan class'lar; inject gerekmez, doğrudan çağrılır

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Acceptance criteria ve user story statement
- [Source: _bmad-output/planning-artifacts/architecture.md#Angular Component Yapısı] — standalone, OnPush, inject(), signal, output()
- [Source: _bmad-output/planning-artifacts/architecture.md#Messaging Architecture] — Port-based connections, Message<T>/MessageResponse<T>
- [Source: _bmad-output/planning-artifacts/architecture.md#Chrome Extension Messaging Protocol] — MessageType, port name, requestId
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Pattern] — HarParseError, üç bileşenli hata mesajı
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — `hm-` selector prefix, kebab-case
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam Proje Dizin Yapısı] — `har-upload/`, `services/` öngörülen konum
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Tab 1: Controls] — Drag & drop UI, accordion yapısı
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments] — "Aha!" anı, endpoint count feedback
- [Source: _bmad-output/implementation-artifacts/2-2-background-service-worker-state-yonetimi-port-hub.md] — StateManager.loadHar(), message-handler LOAD_HAR case, Review follow-ups
- [Source: _bmad-output/implementation-artifacts/2-1-extension-monorepo-kurulumu-background-sw-content-script-popup-shell.md] — Mevcut popup shell, accordion, webpack çift config
- [Source: packages/extension/src/shared/messaging.types.ts] — MessageType.LOAD_HAR, Message<T>, MessageResponse<T>
- [Source: packages/extension/src/shared/payload.types.ts] — LoadHarPayload
- [Source: packages/extension/src/shared/constants.ts] — PORT_NAME_POPUP, STORAGE_KEYS
- [Source: packages/extension/src/popup/app.component.ts] — Mevcut root component yapısı
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts] — HAR accordion placeholder
- [Source: packages/extension/src/popup/components/accordion/accordion.component.ts] — badge input, AccordionComponent API
- [Source: packages/core/src/index.ts] — HarParser, AutoParameterizer barrel export
- [Source: packages/core/src/errors/index.ts] — HarParseError

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `@har-mock/core` barrel'i `HarParser.parseHar()` / `AutoParameterizer.parameterize()` class metotları yerine `parseHar()` / `parameterize()` fonksiyonlarını export ediyor — component direkt fonksiyon çağrısı kullana\
cak şekilde güncellendi.
- `HarFile` tipi `{ entries[], version, creator }` şeklinde, `log.entries` nested değil — component düzeltildi.
- `HarParseError` constructor 2 arg alıyor (`rootCause`, `suggestedAction`); `type` sabiti `'HAR_PARSE_ERROR'`.
- JSDOM ortamında `File.prototype.text()` ve `crypto.randomUUID()` eksik — spec'e polyfill eklendi.
- Mevcut `message-handler.ts` `LOAD_HAR` response payload'ı `{ success, endpointCount }` idi; `{ success, data: { patternCount } }` yapısına güncellendi.

### Completion Notes List

- **Task 1**: `ExtensionMessagingService` — `packages/extension/src/popup/services/` altında oluşturuldu. Port bağlantısı, STATE_SYNC dinleme, Promise tabanlı `sendMessage` (5000ms timeout), `ngOnDestroy`'da disconnect. 9 unit test geçti.
- **Task 2**: `HarUploadComponent` (standalone, OnPush, signal-based) — drag-over, drop, file-input akışları; `parseHar` + `parameterize` + `sendMessage(LOAD_HAR)` zinciri; 5 Tailwind durum (default, drag-over, loading, success, error). 17 unit test, **100% branch coverage**.
- **Task 3**: `ControlsTabComponent` güncellendi — `HarUploadComponent` import, `endpointCount` signal, accordion badge entegrasyonu.
- **Task 4**: `message-handler.ts` LOAD_HAR response `data: { patternCount }` yapısına geçirildi; spec'e `patternCount` doğrulama testi eklendi.
- **Task 5**: `AppComponent` `implements OnInit` + `ngOnInit()` → `messagingService.connect()` entegrasyonu; spec güncellendi.
- **Task 6**: 169/169 test geçti; branch coverage %85.85; `yarn format:check` geçti.

### Code Review Fix Notes
- **H1**: `sendMessage` artık `requestId` ile eşleştirme yapıyor — aynı `type` ile gelen farklı mesajlarla karışma riski giderildi.
- **H2**: `onFileInputChange` artık `.har` uzantısını kontrol ediyor — `accept` attribute browser bypass durumuna karşı tutarlı validasyon.
- **M1**: `onDragLeave` child element geçişlerinde `relatedTarget` + `contains()` kontrolü yapıyor.
- **M2**: `pendingRejects` array ile disconnect/timeout durumunda pending promise'lar anında reject ediliyor.

### File List

**Yeni dosyalar:**
- `packages/extension/src/popup/services/extension-messaging.service.ts`
- `packages/extension/src/popup/services/extension-messaging.service.spec.ts`
- `packages/extension/src/popup/components/har-upload/hm-har-upload.component.ts`
- `packages/extension/src/popup/components/har-upload/hm-har-upload.component.html`
- `packages/extension/src/popup/components/har-upload/hm-har-upload.component.spec.ts`

**Güncellenen dosyalar:**
- `packages/extension/src/popup/app.component.ts`
- `packages/extension/src/popup/app.component.spec.ts`
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts`
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts`
- `packages/extension/src/background/message-handler.ts`
- `packages/extension/src/background/message-handler.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-02-25: Code Review fix — H1: sendMessage requestId eşleştirme (race condition), H2: onFileInputChange .har validasyonu, M1: dragLeave child element false-reset, M2: zombie promise disconnect reject. 169/169 test, %85.85 branch coverage.
- 2026-02-25: Story 2.3 implement edildi: ExtensionMessagingService, HarUploadComponent (drag & drop + file picker), ControlsTabComponent entegrasyonu, message-handler LOAD_HAR patternCount güncellemesi, AppComponent connect() entegrasyonu. 165/165 test, %85.1 branch coverage.