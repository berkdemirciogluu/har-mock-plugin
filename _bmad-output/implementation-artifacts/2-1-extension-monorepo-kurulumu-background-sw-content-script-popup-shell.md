# Story 2.1: Extension Monorepo Kurulumu — Background SW, Content Script, Popup Shell

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want `packages/extension` paketini MV3 manifest, Webpack 3-entry build pipeline, Angular popup shell ve Tailwind CSS ile çalışır hale getirmek,
so that popup açılabilsin, background service worker ve content script yüklensin; tüm Angular popup altyapısı (tab yapısı, accordion yapısı) hazır olsun.

## Acceptance Criteria

1. **Given** `packages/extension` dizini **When** `yarn build:extension` çalıştırıldığında **Then** `dist/extension/` klasörü oluşmalı; `manifest.json` (MV3), `background.js`, `content.js`, `popup/index.html` dahil olmalı; her üç entry point ayrı bundle olarak çıkmalı (NFR8, ARCH9)

2. **Given** Chrome'a `dist/extension/` yüklendiğinde **When** Extension icon'a tıklandığında **Then** popup açılmalı; Angular app bootstrap olmalı; Tab 1 (Controls) ve Tab 2 (Monitor) tabları görünür olmalı; hiçbir console error olmamalı (UX1)

3. **Given** Extension yüklendiğinde **When** herhangi bir web sayfası açıldığında **Then** content script MAIN world'de inject edilmeli; `chrome.runtime.connect()` ile background SW'ye port bağlantısı kurulmalı; background SW port'u kaydetmeli (ARCH4)

4. **Given** webpack config'de `tailwind.config.js` entegrasyonu **When** popup HTML'i render edildiğinde **Then** Tailwind CSS sınıfları uygulanmış olmalı; popup genişliği 400px olmalı

## Tasks / Subtasks

- [x] Task 1: Shared Extension Types — Messaging Protocol & Constants (AC: #3)
  - [x] Subtask 1.1: `packages/extension/src/shared/messaging.types.ts` oluştur — `MessageType` enum'ı tanımla:
    - `CONNECT` — port bağlantı bildirimi
    - `DISCONNECT` — port kopma bildirimi
    - `PING` — keep-alive mesajı
    - `PONG` — keep-alive yanıtı
    - `STATE_SYNC` — popup açılışında state senkronizasyonu
    (Sonraki story'lerde `LOAD_HAR`, `MATCH_QUERY`, `MATCH_EVENT`, `ADD_RULE`, `UPDATE_RULE`, `DELETE_RULE`, `UPDATE_RESPONSE`, `UPDATE_SETTINGS` eklenecek)
  - [x] Subtask 1.2: `Message<T>` ve `MessageResponse<T>` interface'lerini tanımla:
    ```typescript
    interface Message<T = unknown> {
      readonly type: MessageType;
      readonly payload: T;
      readonly requestId?: string; // popup→background'da zorunlu
    }
    interface MessageResponse<T = unknown> {
      readonly success: boolean;
      readonly data?: T;
      readonly error?: { readonly type: string; readonly message: string };
    }
    ```
  - [x] Subtask 1.3: `packages/extension/src/shared/constants.ts` oluştur:
    - `PORT_NAME_CONTENT_PREFIX = 'har-mock-content-'` (ARCH4)
    - `PORT_NAME_POPUP = 'har-mock-popup'` (ARCH4)
    - `STORAGE_KEYS` object: `{ HAR_DATA: 'harData', ACTIVE_RULES: 'activeRules', MATCH_HISTORY: 'matchHistory', EDITED_RESPONSES: 'editedResponses', SETTINGS: 'settings', ACCORDION_STATES: 'accordionStates' }` (ARCH3)
    - `DEFAULT_SETTINGS` object: `{ enabled: true, replayMode: 'last-match' as const, timingReplay: false, excludeList: [] as readonly string[] }`
  - [x] Subtask 1.4: `packages/extension/src/shared/index.ts` oluştur — tüm type'ları ve constant'ları re-export et (mevcut `path-alias.spec.ts` dosyasını silme)

- [x] Task 2: Background Service Worker — Port Listener & Keep-Alive (AC: #3)
  - [x] Subtask 2.1: `packages/extension/src/background/background.ts` güncelle — placeholder console.log'u kaldır, gerçek port listener ekle:
    ```typescript
    chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
      // Port name'e göre kaydet (content-{tabId} veya popup)
      // Port disconnect event'i dinle
      // Message listener ekle (switch/case dispatch)
    });
    ```
  - [x] Subtask 2.2: `packages/extension/src/background/port-manager.ts` oluştur:
    - `registerPort(port: chrome.runtime.Port): void` — port name'e göre Map'e kaydet
    - `unregisterPort(port: chrome.runtime.Port): void` — Map'ten çıkar
    - `getContentPort(tabId: number): chrome.runtime.Port | undefined` — content script port'unu getir
    - `getPopupPort(): chrome.runtime.Port | undefined` — popup port'unu getir
    - `broadcastToContent(message: Message): void` — tüm content script'lere mesaj gönder
    - `sendToPopup(message: Message): void` — popup'a mesaj gönder (port yoksa sessiz)
    - Internal: `contentPorts: Map<number, chrome.runtime.Port>`, `popupPort: chrome.runtime.Port | null`
  - [x] Subtask 2.3: `packages/extension/src/background/message-handler.ts` oluştur:
    - `handleMessage(message: Message, port: chrome.runtime.Port): void` fonksiyonu
    - `switch (message.type)` dispatch — `if/else` **YASAK** (Architecture rule)
    - `case MessageType.PING:` → `port.postMessage({ type: MessageType.PONG })` yanıtla
    - `case MessageType.STATE_SYNC:` → placeholder, Story 2.2'de doldurulacak
    - `default:` → `console.warn('[HAR Mock] Unknown message type:', message.type)`
  - [x] Subtask 2.4: `packages/extension/src/background/index.ts` oluştur — `PortManager` ve `handleMessage` export et

- [x] Task 3: Content Script — Port Bağlantısı & MAIN World Doğrulama (AC: #3)
  - [x] Subtask 3.1: `packages/extension/src/content/content.ts` güncelle — placeholder console.log'u kaldır, port bağlantısı kur:
    ```typescript
    // MAIN world'de çalışır — sayfanın JS context'i
    const port = chrome.runtime.connect({
      name: `${PORT_NAME_CONTENT_PREFIX}${getTabId()}`
    });
    port.onDisconnect.addListener(() => {
      // Reconnect logic (opsiyonel — sayfa navigate edince doğal kopuş)
    });
    ```
  - [x] Subtask 3.2: Tab ID çözümleme: `chrome.runtime.sendMessage` ile background'dan tab ID al veya `chrome.devtools` API kullanma — Story 2.1'de basit yaklaşım: `Date.now()` ile benzersiz ID (gerçek tabId Story 2.4'te background tarafından port name parse ile çözülecek)
  - [x] Subtask 3.3: Content script'te `port.onMessage.addListener` — gelen mesajları dinle (şimdilik sadece `PONG` handler, Story 2.4'te `MATCH_RESULT` eklenecek)
  - [x] Subtask 3.4: `packages/extension/src/content/index.ts` oluştur — re-export (modüler yapı için)

- [x] Task 4: Angular Popup Shell — Tab Yapısı (AC: #2, #4)
  - [x] Subtask 4.1: `packages/extension/src/popup/components/tab-bar/tab-bar.component.ts` oluştur:
    - `selector: 'hm-tab-bar'`
    - `standalone: true`, `ChangeDetectionStrategy.OnPush`
    - Signal-based input: `activeTab = input<'controls' | 'monitor'>('controls')`
    - Signal-based output: `tabChange = output<'controls' | 'monitor'>()`
    - Template (inline veya ayrı .html): İki tab butonu, underline indicator (2px indigo)
    - Accessibility: `role="tablist"`, her tab `role="tab"` + `aria-selected`
    - Tailwind ile stil: `border-b border-slate-200`, aktif tab `border-indigo-500 text-indigo-600 font-medium`, inaktif `text-slate-500 hover:text-slate-700`
  - [x] Subtask 4.2: `packages/extension/src/popup/components/tab-bar/tab-bar.component.html` oluştur:
    ```html
    <div class="flex border-b border-slate-200" role="tablist">
      <button
        role="tab"
        [attr.aria-selected]="activeTab() === 'controls'"
        [class]="activeTab() === 'controls' ? 'border-b-2 border-indigo-500 text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-700'"
        class="flex-1 py-2 text-sm text-center cursor-pointer"
        (click)="tabChange.emit('controls')">
        Controls
      </button>
      <button
        role="tab"
        [attr.aria-selected]="activeTab() === 'monitor'"
        [class]="activeTab() === 'monitor' ? 'border-b-2 border-indigo-500 text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-700'"
        class="flex-1 py-2 text-sm text-center cursor-pointer"
        (click)="tabChange.emit('monitor')">
        Monitor
      </button>
    </div>
    ```
  - [x] Subtask 4.3: `packages/extension/src/popup/components/accordion/accordion.component.ts` oluştur:
    - `selector: 'hm-accordion'`
    - `standalone: true`, `ChangeDetectionStrategy.OnPush`
    - Signal-based inputs: `title = input.required<string>()`, `badge = input<string>()`, `badgeVariant = input<'emerald' | 'blue' | 'default'>('default')`, `expanded = input<boolean>(false)`, `persistKey = input<string>()`
    - Signal-based output: `toggle = output<boolean>()`
    - Chevron rotation animasyonu: `transform: rotate(0deg)` → `rotate(90deg)`, `transition: 200ms ease-in-out`
    - Body: `max-height` transition ile collapse/expand, `overflow: hidden`
    - Content projection: `<ng-content>` ile accordion body içeriği dışarıdan verilir
    - `persistKey` set edilmişse `localStorage`'a açık/kapalı state kaydet
    - Accessibility: header `role="button"`, `aria-expanded`, body `role="region"`, `aria-labelledby`
  - [x] Subtask 4.4: `packages/extension/src/popup/components/accordion/accordion.component.html` oluştur
  - [x] Subtask 4.5: `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` oluştur:
    - `selector: 'hm-controls-tab'`
    - `standalone: true`, `ChangeDetectionStrategy.OnPush`
    - 3 accordion: HAR (varsayılan açık), Rules (varsayılan kapalı), Settings (varsayılan kapalı)
    - Her accordion'da placeholder içerik (sonraki story'lerde gerçek component'ler eklenecek):
      - HAR: "HAR dosyası yükleme alanı (Story 2.3)"
      - Rules: "Rule yönetimi (Story 4.1)"
      - Settings: "Extension ayarları (Story 2.5)"
    - Accordion'ları import et ve kullan
  - [x] Subtask 4.6: `packages/extension/src/popup/components/controls-tab/controls-tab.component.html` oluştur
  - [x] Subtask 4.7: `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` oluştur:
    - `selector: 'hm-monitor-tab'`
    - `standalone: true`, `ChangeDetectionStrategy.OnPush`
    - Placeholder: empty state mesajı "Henüz intercept edilmiş request yok. Sayfayı yenileyip bir istek başlatın."
    - Sonraki story'lerde (Story 3.1, 3.2) gerçek feed component'i eklenecek
  - [x] Subtask 4.8: `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.html` oluştur
  - [x] Subtask 4.9: `packages/extension/src/popup/app.component.ts` güncelle:
    - Tab state signal: `activeTab = signal<'controls' | 'monitor'>('controls')`
    - `hm-tab-bar`, `hm-controls-tab`, `hm-monitor-tab` component'lerini import et
    - Template: `<hm-tab-bar>` + kondisyonel `@if` ile `<hm-controls-tab>` veya `<hm-monitor-tab>`
    - Popup genişlik: `w-[400px]`, min/max height: `min-h-[500px] max-h-[600px]`
  - [x] Subtask 4.10: `packages/extension/src/popup/index.html` güncelle — `<link rel="stylesheet" href="popup.css">` ekle (MiniCssExtractPlugin çıktısı)

- [x] Task 5: Unit Testler (AC: tümü)
  - [x] Subtask 5.1: `packages/extension/src/background/port-manager.spec.ts` oluştur:
    - Port register/unregister testleri
    - Content port getirme testleri
    - Popup port getirme testleri
    - Broadcast ve send testleri
    - chrome.runtime mock'ları kullan
  - [x] Subtask 5.2: `packages/extension/src/background/message-handler.spec.ts` oluştur:
    - PING → PONG yanıtı testi
    - Unknown message type → console.warn testi
    - switch/case dispatch testi
  - [x] Subtask 5.3: `packages/extension/src/popup/components/tab-bar/tab-bar.component.spec.ts` oluştur:
    - Tab render testi
    - Tab tıklama ve tabChange emit testi
    - Active tab underline görünürlüğü testi
    - ARIA attribute'ları testi
  - [x] Subtask 5.4: `packages/extension/src/popup/components/accordion/accordion.component.spec.ts` oluştur:
    - Expand/collapse toggle testi
    - Chevron rotation testi
    - Content projection testi
    - persistKey ile localStorage persistence testi
    - ARIA attribute'ları testi
  - [x] Subtask 5.5: `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` oluştur:
    - 3 accordion render testi
    - HAR accordion varsayılan açık testi
  - [x] Subtask 5.6: `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` oluştur:
    - Empty state mesajı render testi
  - [x] Subtask 5.7: `packages/extension/src/popup/app.component.spec.ts` güncelle:
    - Tab geçişi testi
    - Controls tab varsayılan aktif testi
    - Popup 400px genişlik testi

- [x] Task 6: Build Doğrulama & Final Kontrol (AC: #1, #2, #3, #4)
  - [x] Subtask 6.1: `yarn build:extension` çalıştır — build başarılı, `dist/extension/` içinde `manifest.json`, `background.js`, `content.js`, `popup/index.html`, `popup.css` mevcut
  - [x] Subtask 6.2: `yarn test:all` çalıştır — extension testleri dahil tüm testler geçer
  - [x] Subtask 6.3: `yarn lint:all` çalıştır — 0 hata, 0 uyarı
  - [x] Subtask 6.4: `yarn format:check` çalıştır — Prettier formatına uygun
  - [ ] Subtask 6.5: Chrome'a yükle (`chrome://extensions` → Load unpacked → `dist/extension/`) — popup açılır, tab'lar görünür, console error yok
  - [ ] Subtask 6.6: Content script MAIN world'de yüklendiğini doğrula — Chrome DevTools Console'da `[HAR Mock]` log mesajı var
  - [ ] Subtask 6.7: Background SW port bağlantısını doğrula — Chrome DevTools → Application → Service Workers → SW aktif, port bağlantısı kurulu

## Dev Notes

### Kritik Mimari Kısıtlamalar

- **Angular Component Kuralları (ZORUNLU)**:
  - `standalone: true` — `NgModule` yasak
  - `ChangeDetectionStrategy.OnPush` — tüm component'lerde zorunlu
  - Signal-based `input()` / `output()` — decorator `@Input()` / `@Output()` YASAK
  - `inject()` fonksiyonu — constructor injection YASAK
  - Selector prefix: `hm-` (har-mock)
  - Template: inline veya ayrı `.html` dosyası — Story 1.1 Round 6'da `templateUrl`'nin webpack JIT'te çözümlenemediği ortaya çıktı. **İnline template VEYA `@ngtools/webpack` (AOT) kullanılmalı.** Mevcut webpack config'de `ts-loader transpileOnly: true` aktif olduğundan `templateUrl` kullanılmamalı — inline `template:` tercih edilir.
  - **ÖNEMLİ**: Story 1.1 Round 6 H1 fix'inde `templateUrl` → inline `template` dönüştürülmüş ve `app.component.html` silinmiştir. Bu story'deki yeni component'ler de aynı yaklaşımı izleyebilir VEYA `@ngtools/webpack` AOT compiler eklenebilir. Karar: Eğer AOT compiler eklenirse `templateUrl` kullanılabilir, aksi halde inline template zorunlu.

- **AOT Compiler Kararı (Bu Story'de Çözülmeli)**:
  - Story 1.1'deki webpack config `ts-loader transpileOnly: true` kullanıyor
  - Bu, `templateUrl` ve `styleUrls`'in çözümlenemediği anlamına gelir
  - **Seçenek A**: `@ngtools/webpack` ekle → AOT compiler aktif → `templateUrl` ve `styleUrls` çalışır → daha küçük bundle
  - **Seçenek B**: Inline `template:` kullanmaya devam et → ek dependency yok → dosya boyutları büyür
  - **ÖNERİLEN**: Seçenek A — `@ngtools/webpack` entegrasyonu. Bundle size küçülür (tree-shaking), `templateUrl` çalışır, Angular best practice'e uygun. Ancak webpack config değişikliği gerekir.
  - Eğer Seçenek A uygulanırsa: popup entry'de `ts-loader` → `@ngtools/webpack` AngularWebpackPlugin'e geçilir. background ve content entry point'leri ts-loader ile kalır (Angular dışı dosyalar).

- **`any` tipi YASAK**: ESLint `@typescript-eslint/no-explicit-any: error`. `unknown` + type guard kullanılır.
- **Dosya isimlendirme**: `kebab-case.ts` — ör: `tab-bar.component.ts`, `port-manager.ts`
- **Test dosyaları**: Colocated `*.spec.ts` — implementation dosyasının yanında
- **`noUncheckedIndexedAccess: true` AKTIF**: Array/Map index erişimlerinde `undefined` kontrolü gerekli
- **Barrel export**: `@har-mock/core` barrel'dan import — doğrudan implementation dosyalarına import YASAK
- **Chrome Types**: `@types/chrome` zaten devDependency'de mevcut (Story 1.1'de eklendi)

### Mevcut Codebase Durumu (Story 2.1 Başlangıcı)

**Zaten MEVCUT olan dosyalar (Story 1.1'de oluşturuldu):**

```
packages/extension/
├── package.json              ← Angular 18, Tailwind, Webpack deps — MEVCUT
├── tsconfig.json             ← extends tsconfig.base.json — MEVCUT
├── jest.config.js            ← Jest config — MEVCUT
├── webpack.config.js         ← 3 entry point (popup, background, content) — MEVCUT
├── tailwind.config.js        ← Tailwind CSS config — MEVCUT
├── postcss.config.js         ← PostCSS config — MEVCUT
├── public/
│   ├── manifest.json         ← MV3 manifest — MEVCUT, DEĞİŞTİRME
│   ├── icon-16.png           ← Placeholder — MEVCUT
│   ├── icon-48.png           ← Placeholder — MEVCUT
│   └── icon-128.png          ← Placeholder — MEVCUT
├── src/
│   ├── popup/
│   │   ├── main.ts           ← bootstrapApplication — MEVCUT, GÜNCELLENEBİLİR
│   │   ├── app.component.ts  ← Skeleton inline template — MEVCUT, GÜNCELLENECEK
│   │   ├── index.html        ← HTML shell — MEVCUT, GÜNCELLENEBİLİR
│   │   └── styles.css        ← Tailwind directives — MEVCUT
│   ├── background/
│   │   └── background.ts     ← Placeholder console.log — DEĞİŞTİRİLECEK
│   ├── content/
│   │   └── content.ts        ← Placeholder console.log — DEĞİŞTİRİLECEK
│   └── shared/
│       └── path-alias.spec.ts ← Mevcut path alias test — KORUNACAK
```

**OLUŞTURULACAK yeni dosyalar:**

```
packages/extension/src/
├── shared/
│   ├── messaging.types.ts              ← YENİ — Message<T>, MessageResponse<T>, MessageType
│   ├── constants.ts                    ← YENİ — Port names, storage keys, defaults
│   └── index.ts                        ← YENİ — Re-export barrel
├── background/
│   ├── port-manager.ts                 ← YENİ — Port registry
│   ├── port-manager.spec.ts            ← YENİ — Port manager testleri
│   ├── message-handler.ts              ← YENİ — Message dispatch
│   ├── message-handler.spec.ts         ← YENİ — Message handler testleri
│   └── index.ts                        ← YENİ — Background module export
├── content/
│   └── index.ts                        ← YENİ — Content module export
├── popup/
│   └── components/
│       ├── tab-bar/
│       │   ├── tab-bar.component.ts    ← YENİ — Tab bar
│       │   └── tab-bar.component.spec.ts ← YENİ
│       ├── accordion/
│       │   ├── accordion.component.ts  ← YENİ — Generic accordion
│       │   └── accordion.component.spec.ts ← YENİ
│       ├── controls-tab/
│       │   ├── controls-tab.component.ts ← YENİ — Controls tab container
│       │   └── controls-tab.component.spec.ts ← YENİ
│       └── monitor-tab/
│           ├── monitor-tab.component.ts  ← YENİ — Monitor tab
│           └── monitor-tab.component.spec.ts ← YENİ
```

**GÜNCELLENECEK mevcut dosyalar:**

```
├── background/background.ts   ← Placeholder → gerçek port listener
├── content/content.ts          ← Placeholder → gerçek port bağlantısı
├── popup/app.component.ts      ← Skeleton → tab bar + conditional tab content
├── popup/index.html            ← CSS link ekleme (gerekirse)
```

### Chrome Extension Messaging — Protocol Detayları

Architecture dokümanından:
- Port name convention: `'har-mock-content-{tabId}'` (content script), `'har-mock-popup'` (popup)
- Message handler pattern: `switch (message.type)` — `if/else` YASAK
- `requestId`: popup → background'da zorunlu, background → push'larda opsiyonel
- Content script `"world": "MAIN"` olduğunda `chrome.runtime.connect()` hala kullanılabilir

```typescript
// Port bağlantı akışı:
// 1. Content script: chrome.runtime.connect({ name: 'har-mock-content-{tabId}' })
// 2. Background SW: chrome.runtime.onConnect listener → port kaydet
// 3. Popup: chrome.runtime.connect({ name: 'har-mock-popup' })
// 4. Background SW: port kaydet, mevcut state dump
```

### Tailwind CSS — Popup Spesifik Notlar

- Popup genişliği: `w-[400px]` (sabit)
- Min yükseklik: `min-h-[500px]`, max yükseklik: `max-h-[600px]`
- Tab bar yükseklik: 36px (`h-9`)
- Accordion header: 40px (`h-10`)
- Base spacing: 4px (`space-1`)
- Text: `text-sm` (14px), `text-xs` (12px)
- Font: sistem fontu (Tailwind default) — popup'ta custom font yüklemeye gerek yok
- Active tab: `border-b-2 border-indigo-500 text-indigo-600 font-medium`
- Inactive tab: `text-slate-500 hover:text-slate-700`
- Accordion hover: `hover:bg-slate-50`
- Focus ring: `focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`

### Önceki Epic Learnings (Epic 1'den)

1. **Inline template zorunlu (webpack JIT)**: Story 1.1 Round 6'da `templateUrl` runtime'da çözümlenemedi. `@ngtools/webpack` eklenmedikçe inline `template:` kullanılmalı. Bu story'de AOT compiler kararı verilmeli.

2. **Prettier 2-space indentation**: `.prettierrc`'de `tabWidth: 2` aktif. Tüm dosyalar 2-space indent ile yazılmalı.

3. **MiniCssExtractPlugin**: CSS ayrı dosya olarak extract ediliyor (`popup.css`). `style-loader` kaldırılmış, FOUC riski yok.

4. **Format kontrolü zorunlu**: Her commit öncesi `yarn format:check` geçmeli. Story 1.1'de 7 round review yapıldı, format hatası en sık tekrarlayan sorundu.

5. **`noUncheckedIndexedAccess: true`**: Map.get() gibi çağrılar `T | undefined` döndürür. Null check zorunlu.

6. **Coverage exclusion**: Skeleton component'ler (henüz gerçek logic'i olmayan) coverage exclusion listesine eklenebilir.

7. **`experimentalDecorators`**: Sadece `packages/extension/tsconfig.json`'da aktif (Angular decorator'lar için). `packages/core`'da yok.

8. **Shared url-utils pattern**: Story 1.5'te duplicate fonksiyonlar `utils/url-utils.ts`'ye taşındı. Extension içinde de shared fonksiyonlar `src/shared/` altına konur.

### Git Son 5 Commit (Context)

```
46c2fc0 fix(review): story 1.5 code review — shared url-utils, defensive copy, test improvements
60c403a feat(core): story 1.5 — PriorityChain, RuleEngine & Error Class Hierarchy
263a149 fix(review): story 1.4 round 2 — WeakMap cache, branch coverage %100, method filter optimization
ac2b662 fix(review): story 1.4 code review fixes — shared test-utils, hash/root edge cases, url-matcher improvements
51f084c claude.md ve mcp ayarlari yapildi
```

### Content Script MAIN World — Önemli Kısıtlamalar

- `"world": "MAIN"` ile inject edilen content script sayfanın JS context'inde çalışır
- `chrome.runtime.connect()` MAIN world'de de çalışır (Chrome MV3 desteği)
- Content script'te `window.fetch` ve `XMLHttpRequest` override mümkün (Story 2.4'te yapılacak)
- Bu story'de content script sadece port bağlantısı kurar — intercept logic Story 2.4'te

### Test Stratejisi — Chrome API Mock'ları

Extension testlerinde `chrome.*` API'leri mock'lanmalı:

```typescript
// Test setup: chrome.runtime mock
const mockChrome = {
  runtime: {
    connect: jest.fn().mockReturnValue({
      name: 'har-mock-popup',
      onMessage: { addListener: jest.fn() },
      onDisconnect: { addListener: jest.fn() },
      postMessage: jest.fn(),
    }),
    onConnect: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Global chrome mock
(globalThis as Record<string, unknown>).chrome = mockChrome;
```

Jest config'de `testEnvironment: 'jsdom'` kullanılıyor (Story 1.1'de ayarlandı). Chrome API mock'ları her test dosyasında veya shared test setup'ta tanımlanabilir.

### UX Component Hierarchy (Story 2.1 Kapsamı)

```
AppComponent (hm-root) — 400px shell
├── TabBarComponent (hm-tab-bar) — Controls | Monitor
├── ControlsTabComponent (hm-controls-tab) — @if activeTab === 'controls'
│   ├── AccordionComponent (hm-accordion) — HAR (açık)
│   │   └── <p>HAR dosyası yükleme alanı (Story 2.3)</p>
│   ├── AccordionComponent (hm-accordion) — Rules (kapalı)
│   │   └── <p>Rule yönetimi (Story 4.1)</p>
│   └── AccordionComponent (hm-accordion) — Settings (kapalı)
│       └── <p>Extension ayarları (Story 2.5)</p>
└── MonitorTabComponent (hm-monitor-tab) — @if activeTab === 'monitor'
    └── <p>Henüz intercept edilmiş request yok...</p>
```

### Project Structure Notes

- Tüm yeni dosyalar `packages/extension/src/` altında — mimari sınırlara uygun
- `shared/` dizini extension içi paylaşımlı tipler ve sabitler için
- `background/` dizini SW modülleri için
- `content/` dizini content script modülleri için
- `popup/components/` dizini Angular bileşenleri için
- Her component kendi klasöründe: `component.ts` + `component.spec.ts`
- Barrel export zinciri: `component/` → `components/` → (doğrudan import)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Request Intercept Mechanism] — Fetch/XHR Monkey-Patching via Content Script
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management & Persistence] — Hibrit state model
- [Source: _bmad-output/planning-artifacts/architecture.md#Messaging Architecture] — Port-based long-lived connections
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — kebab-case, hm- prefix
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — Angular component kuralları
- [Source: _bmad-output/planning-artifacts/architecture.md#Chrome Extension Messaging Protocol] — Message<T>, MessageResponse<T>
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Popup Information Architecture] — Tab + Accordion hybrid
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PopupShellComponent] — 400px shell, tab bar
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#TabBarComponent] — Controls ↔ Monitor tab
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#AccordionComponent] — Collapsible section
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Spacing & Layout Foundation] — 4px base, popup boyutları
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Acceptance criteria ve gereksinimler
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-kurulumu-temel-yapilandirma.md] — Skeleton kurulum learnings
- [Source: _bmad-output/implementation-artifacts/1-5-priority-chain-rule-engine-error-class-hierarchy.md] — Shared utils pattern
- [Source: packages/extension/public/manifest.json] — MV3 manifest configuration
- [Source: packages/extension/webpack.config.js] — Webpack 3-entry build pipeline
- [Source: packages/extension/src/popup/app.component.ts] — Mevcut skeleton component

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

- **jest-preset-angular versiyon uyumsuzluğu**: v16 Jest 30 gerektiriyor, proje Jest 29 kullanıyor → v14.6.2'ye downgrade edildi
- **zone.js/testing Jest uyumsuzluğu**: `zone.js/testing` Jasmine patch'liyor, Jest'te `TypeError: Cannot read properties of undefined (reading 'each')` hatası → `jest-preset-angular/setup-env/zone` kullanıldı
- **Angular ESM modülleri transform edilmedi**: `@angular/compiler` ESM export'ları Jest'te `SyntaxError: Unexpected token 'export'` → `transformIgnorePatterns` eklendi
- **Angular JIT NG0303 hataları**: Component'ler testlerde tanınmadı → `jest-preset-angular` preset'i ile çözüldü
- **setupFilesAfterSetup typo**: Jest config property `setupFilesAfterEnv` olmalı → düzeltildi
- **async arrow without await**: Lint hatası `beforeEach(async () => {` → `async` kaldırıldı
- **accordion effect allowSignalWrites**: Signal write in effect → `effect({ allowSignalWrites: true })` eklendi

### Completion Notes List

- Tüm 6 task başarıyla tamamlandı (Task 6.5-6.7 manuel Chrome doğrulama — review'da yapılacak)
- 8 test suite, 63 test, %100 coverage (statements, branches, functions, lines)
- yarn lint:all → 0 hata, 0 uyarı
- yarn format:check → tüm dosyalar Prettier formatına uygun
- yarn build:extension → başarılı, tüm output dosyaları doğrulandı
- AOT compiler kararı: Inline template kullanımına devam edildi (Seçenek B) — webpack config değişikliği gerektirmeden çalışıyor
- Angular component kurallarına tam uyum: standalone, OnPush, signal input/output, inject(), hm- prefix
- Chrome messaging protocol: Port-based long-lived connections, switch/case dispatch

### Change Log

- 2025-02-25: Story 2.1 tam implementasyon — shared types, background SW, content script, Angular popup shell, unit tests

### File List

**Yeni dosyalar:**
- `packages/extension/src/shared/messaging.types.ts` — MessageType enum, Message<T>, MessageResponse<T>
- `packages/extension/src/shared/constants.ts` — PORT_NAME_*, STORAGE_KEYS, DEFAULT_SETTINGS
- `packages/extension/src/shared/index.ts` — Barrel export
- `packages/extension/src/background/port-manager.ts` — PortManager class (port registry)
- `packages/extension/src/background/port-manager.spec.ts` — PortManager testleri
- `packages/extension/src/background/message-handler.ts` — handleMessage (switch/case dispatch)
- `packages/extension/src/background/message-handler.spec.ts` — Message handler testleri
- `packages/extension/src/background/index.ts` — Background module barrel
- `packages/extension/src/content/index.ts` — Content module barrel
- `packages/extension/src/popup/components/tab-bar/tab-bar.component.ts` — Tab bar (Controls/Monitor)
- `packages/extension/src/popup/components/tab-bar/tab-bar.component.spec.ts` — Tab bar testleri
- `packages/extension/src/popup/components/accordion/accordion.component.ts` — Generic accordion
- `packages/extension/src/popup/components/accordion/accordion.component.spec.ts` — Accordion testleri
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` — Controls tab (3 accordion)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` — Controls tab testleri
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.ts` — Monitor tab (empty state)
- `packages/extension/src/popup/components/monitor-tab/monitor-tab.component.spec.ts` — Monitor tab testleri
- `packages/extension/src/test-setup.ts` — Jest test setup (jest-preset-angular)
- `packages/extension/tsconfig.spec.json` — Test-specific TypeScript config

**Güncellenen dosyalar:**
- `packages/extension/src/background/background.ts` — Placeholder → gerçek port listener
- `packages/extension/src/content/content.ts` — Placeholder → gerçek port bağlantısı
- `packages/extension/src/popup/app.component.ts` — Skeleton → tab bar + conditional tab rendering
- `packages/extension/src/popup/app.component.spec.ts` — Tab geçişi ve layout testleri
- `packages/extension/src/popup/index.html` — CSS link eklendi
- `packages/extension/jest.config.js` — jest-preset-angular preset, transform, setupFilesAfterEnv
- `packages/extension/package.json` — jest-preset-angular@14.6.2, @angular/platform-browser-dynamic devDeps
