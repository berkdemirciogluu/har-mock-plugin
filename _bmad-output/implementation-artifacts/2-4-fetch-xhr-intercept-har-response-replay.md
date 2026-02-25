# Story 2.4: Fetch & XHR Intercept + HAR Response Replay

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want content script'te `window.fetch` ve `XMLHttpRequest` monkey-patching ile intercept mekanizmasını,
So that sayfadaki tüm HTTP request'leri yakalanıp background SW'ye sorgulanabilsin; eşleşen HAR entry'ler orijinal request'in yerine response olarak dönebilsin; eşleşme yoksa orijinal network request'e düşülsün.

## Acceptance Criteria

1. **Given** content script MAIN world'de inject edildiğinde **When** sayfa herhangi bir `fetch()` çağrısı yaptığında **Then** `fetch-interceptor.ts` override devreye girmeli; request URL ve method background SW'ye gönderilmeli; SW'den HAR match response gelirse gerçek network isteği yapılmadan mock response dönmeli (FR10, FR11)

2. **Given** content script aktifken **When** sayfa `XMLHttpRequest` ile istek yaptığında **Then** `xhr-interceptor.ts` override devreye girmeli; aynı match query → mock response akışı çalışmalı (FR10, FR11)

3. **Given** URL match sonucu `null` (eşleşme yok) döndüğünde **When** content script mock resolver yanıt aldığında **Then** orijinal `fetch` veya `XHR` çağrısına sessizce düşülmeli; sayfa normal network isteği yapmalı (ARCH8)

4. **Given** background SW'ye bağlantı sırasında veya match query'de herhangi bir hata oluştuğunda **When** try/catch bloğu hatayı yakaladığında **Then** sessiz passthrough uygulanmalı; orijinal fetch/XHR çalıştırılmalı; sayfa asla kırılmamalı (ARCH8)

5. **Given** background SW'nin mock response döndürdüğü bir request **When** content script response'u oluştururken **Then** status code, response body ve response header'lar HAR entry ile byte-level eşleşmeli (NFR6)

## Tasks / Subtasks

- [x] Task 1: Mimari Karar — Dual Content Script (ISOLATED + MAIN world) (AC: #1, #2)
  - [x] Subtask 1.1: `manifest.json` güncelle — ikinci content_scripts girişi ekle:
    ```json
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": ["content.js"],
        "run_at": "document_start"
      },
      {
        "matches": ["<all_urls>"],
        "js": ["interceptor.js"],
        "run_at": "document_start",
        "world": "MAIN"
      }
    ]
    ```
  - [x] Subtask 1.2: `webpack.config.js` swConfig'e `interceptor` entry ekle:
    ```javascript
    entry: {
      background: './src/background/background.ts',
      content: './src/content/content.ts',
      interceptor: './src/content/interceptor.ts',  // YENİ
    },
    ```

- [x] Task 2: Window Messaging Bridge Protokolü (AC: #1, #2, #3, #4)
  - [x] Subtask 2.1: `packages/extension/src/content/window-messaging.types.ts` oluştur — ISOLATED ↔ MAIN window.postMessage protokolü:
    ```typescript
    /**
     * Window Messaging Protocol — ISOLATED world ↔ MAIN world bridge
     * Chrome port messaging ile KARIŞTIRILMAMALI — bu window.postMessage tabanlı
     */

    /** Channel identifier — diğer window mesajlarından ayırt etmek için */
    export const HAR_MOCK_CHANNEL = '__HAR_MOCK__' as const;

    /** MAIN → ISOLATED: URL match sorgusu */
    export interface WindowMatchQuery {
      readonly channel: typeof HAR_MOCK_CHANNEL;
      readonly type: 'MATCH_QUERY';
      readonly requestId: string;
      readonly url: string;
      readonly method: string;
    }

    /** ISOLATED → MAIN: Match sonucu */
    export interface WindowMatchResult {
      readonly channel: typeof HAR_MOCK_CHANNEL;
      readonly type: 'MATCH_RESULT';
      readonly requestId: string;
      readonly matched: boolean;
      readonly response?: {
        readonly statusCode: number;
        readonly body: string;
        readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
        readonly delay: number;
      };
      readonly source?: 'rule' | 'har';
    }

    /** Union type for window message discrimination */
    export type WindowMessage = WindowMatchQuery | WindowMatchResult;
    ```
  - [x] Subtask 2.2: `packages/extension/src/shared/constants.ts`'e window messaging sabitleri ekle:
    ```typescript
    /** Window messaging channel — MAIN ↔ ISOLATED world bridge */
    export const HAR_MOCK_CHANNEL = '__HAR_MOCK__';

    /** Mock resolver timeout (ms) — background SW yanıt vermezse passthrough */
    export const MATCH_QUERY_TIMEOUT_MS = 5000;
    ```

- [x] Task 3: `MockResolver` — MAIN World Communication Bridge (AC: #1, #2, #3, #4)
  - [x] Subtask 3.1: `packages/extension/src/content/mock-resolver.ts` oluştur:
    ```typescript
    /**
     * MockResolver — MAIN world'den ISOLATED world content script'e
     * window.postMessage ile mock query gönderir, sonucu Promise olarak döner.
     * Timeout durumunda null döner (sessiz passthrough).
     */
    import {
      HAR_MOCK_CHANNEL,
      type WindowMatchQuery,
      type WindowMatchResult,
    } from './window-messaging.types';

    /** Match sonucu — interceptor'lar bu tipi kullanır */
    export interface ResolvedMatch {
      readonly matched: boolean;
      readonly response?: {
        readonly statusCode: number;
        readonly body: string;
        readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
        readonly delay: number;
      };
      readonly source?: 'rule' | 'har';
    }

    export class MockResolver {
      private readonly pendingRequests = new Map<
        string,
        { resolve: (result: ResolvedMatch | null) => void; timer: ReturnType<typeof setTimeout> }
      >();
      private readonly boundHandler: (event: MessageEvent) => void;
      private readonly timeoutMs: number;

      constructor(timeoutMs = 5000) {
        this.timeoutMs = timeoutMs;
        this.boundHandler = this.handleMessage.bind(this);
        window.addEventListener('message', this.boundHandler);
      }

      /** URL + method ile background SW'ye sorgu gönder, sonucu bekle */
      resolve(url: string, method: string): Promise<ResolvedMatch | null> {
        const requestId = this.generateId();

        return new Promise<ResolvedMatch | null>((resolve) => {
          const timer = setTimeout(() => {
            this.pendingRequests.delete(requestId);
            resolve(null); // Timeout → passthrough
          }, this.timeoutMs);

          this.pendingRequests.set(requestId, { resolve, timer });

          const query: WindowMatchQuery = {
            channel: HAR_MOCK_CHANNEL,
            type: 'MATCH_QUERY',
            requestId,
            url,
            method,
          };

          window.postMessage(query, '*');
        });
      }

      /** Cleanup — testler ve unmount için */
      destroy(): void {
        window.removeEventListener('message', this.boundHandler);
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
        }
        this.pendingRequests.clear();
      }

      private handleMessage(event: MessageEvent): void {
        // Sadece kendi window'dan gelen mesajları kabul et
        if (event.source !== window) return;

        const data = event.data as Record<string, unknown> | undefined;
        if (data?.channel !== HAR_MOCK_CHANNEL) return;
        if (data?.type !== 'MATCH_RESULT') return;

        const result = data as unknown as WindowMatchResult;
        const pending = this.pendingRequests.get(result.requestId);
        if (!pending) return;

        clearTimeout(pending.timer);
        this.pendingRequests.delete(result.requestId);

        pending.resolve({
          matched: result.matched,
          response: result.response,
          source: result.source,
        });
      }

      private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
    }
    ```
  - [x] Subtask 3.2: `mock-resolver.spec.ts` — Testler:
    - `resolve()` çağrısı → window.postMessage gönderildiğini doğrula
    - Window'dan gelen MATCH_RESULT ile Promise resolve olduğunu doğrula
    - requestId eşleştirme — yanlış requestId'li mesajlar ignore edilir
    - Timeout sonrası null dönüşü (passthrough)
    - `destroy()` sonrası pending promise'lar ve listener temizlenir

- [x] Task 4: `fetch-interceptor.ts` — window.fetch Monkey-Patch (AC: #1, #3, #4, #5)
  - [x] Subtask 4.1: `packages/extension/src/content/fetch-interceptor.ts` oluştur:
    ```typescript
    /**
     * Fetch Interceptor — window.fetch monkey-patch (MAIN world)
     * Eşleşme varsa mock Response döner, yoksa/error'da orijinal fetch'e düşer (ARCH8)
     */
    import type { MockResolver, ResolvedMatch } from './mock-resolver';

    /** Orijinal fetch referansı — cleanup için export */
    let originalFetch: typeof window.fetch;

    /**
     * window.fetch'i override et.
     * Her fetch çağrısı → resolver.resolve() → match varsa mock Response, yoksa passthrough.
     */
    export function interceptFetch(resolver: MockResolver): void {
      originalFetch = window.fetch.bind(window);

      window.fetch = async function harMockFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> {
        try {
          const url = resolveUrl(input);
          const method = extractMethod(input, init);

          const result = await resolver.resolve(url, method);

          if (result !== null && result.matched && result.response !== undefined) {
            // Delay uygula (HAR timing replay veya rule delay)
            if (result.response.delay > 0) {
              await delay(result.response.delay);
            }
            return buildFetchResponse(result.response);
          }
        } catch {
          // Sessiz passthrough — ARCH8: sayfa asla kırılmamalı
        }
        return originalFetch(input, init);
      };
    }

    /** Override'ı kaldır — testler için */
    export function cleanupFetch(): void {
      if (originalFetch) {
        window.fetch = originalFetch;
      }
    }

    /** URL'yi absolute path'e çöz — relative URL desteği */
    function resolveUrl(input: RequestInfo | URL): string {
      if (typeof input === 'string') {
        try {
          return new URL(input, window.location.href).href;
        } catch {
          return input;
        }
      }
      if (input instanceof URL) return input.href;
      // Request object
      return input.url;
    }

    /** HTTP method'u çıkar — Request object veya init'ten */
    function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
      if (init?.method) return init.method.toUpperCase();
      if (typeof input !== 'string' && !(input instanceof URL) && input.method) {
        return input.method.toUpperCase();
      }
      return 'GET';
    }

    /** Mock Response oluştur — status, body, headers byte-level doğru (NFR6) */
    function buildFetchResponse(
      response: NonNullable<ResolvedMatch['response']>,
    ): Response {
      const headers = new Headers();
      for (const h of response.headers) {
        try {
          headers.append(h.name, h.value);
        } catch {
          // Geçersiz header → atla (bazı HAR header'lar Response'ta forbidden olabilir)
        }
      }
      return new Response(response.body, {
        status: response.statusCode,
        headers,
      });
    }

    /** Promise-based delay */
    function delay(ms: number): Promise<void> {
      return new Promise((r) => setTimeout(r, ms));
    }
    ```
  - [x] Subtask 4.2: `fetch-interceptor.spec.ts` — Testler:
    - Matched HAR response → mock Response döner (status, body, headers doğru)
    - No match → orijinal fetch çağrılır
    - Resolver hatası → sessiz passthrough, orijinal fetch çağrılır
    - Relative URL → absolute'e çözümlenir
    - Request object input → url ve method doğru çıkarılır
    - URL object input → href kullanılır
    - `init.method` varsa Request.method yerine init.method kullanılır
    - Delay > 0 → setTimeout uygulanır
    - Delay = 0 → anında dönüş
    - Forbidden header → atlanır, diğer header'lar uygulanır
    - `cleanupFetch()` sonrası orijinal fetch restore edilir

- [x] Task 5: `xhr-interceptor.ts` — XMLHttpRequest Monkey-Patch (AC: #2, #3, #4, #5)
  - [x] Subtask 5.1: `packages/extension/src/content/xhr-interceptor.ts` oluştur:
    ```typescript
    /**
     * XHR Interceptor — XMLHttpRequest monkey-patch (MAIN world)
     * prototype.open + prototype.send override
     * Sync XHR → sessiz passthrough (async resolver kullanılamaz)
     * Hata durumunda → sessiz passthrough (ARCH8)
     */
    import type { MockResolver, ResolvedMatch } from './mock-resolver';

    /** Orijinal referanslar */
    let originalOpen: typeof XMLHttpRequest.prototype.open;
    let originalSend: typeof XMLHttpRequest.prototype.send;

    /** XHR instance'larına method/url metadata bağlamak için WeakMap */
    const xhrMeta = new WeakMap<
      XMLHttpRequest,
      { method: string; url: string; async: boolean }
    >();

    /**
     * XMLHttpRequest.prototype.open ve .send'i override et.
     * open() → method/url kaydet; send() → resolver.resolve() → mock veya passthrough.
     */
    export function interceptXhr(resolver: MockResolver): void {
      originalOpen = XMLHttpRequest.prototype.open;
      originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function xhrOpen(
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
      ): void {
        const resolvedUrl = resolveXhrUrl(url);
        xhrMeta.set(this, {
          method: method.toUpperCase(),
          url: resolvedUrl,
          async: async !== false, // default true
        });
        originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
      };

      XMLHttpRequest.prototype.send = function xhrSend(
        body?: Document | XMLHttpRequestBodyInit | null,
      ): void {
        const meta = xhrMeta.get(this);
        if (!meta || !meta.async) {
          // Metadata yoksa veya sync XHR → passthrough (async resolver kullanılamaz)
          originalSend.call(this, body);
          return;
        }

        const xhr = this;
        resolver
          .resolve(meta.url, meta.method)
          .then((result) => {
            if (result !== null && result.matched && result.response !== undefined) {
              const applyMock = (): void => {
                applyMockToXhr(xhr, result.response!);
              };
              if (result.response.delay > 0) {
                setTimeout(applyMock, result.response.delay);
              } else {
                applyMock();
              }
            } else {
              originalSend.call(xhr, body);
            }
          })
          .catch(() => {
            // Sessiz passthrough — ARCH8
            originalSend.call(xhr, body);
          });
      };
    }

    /** Override'ı kaldır — testler için */
    export function cleanupXhr(): void {
      if (originalOpen) XMLHttpRequest.prototype.open = originalOpen;
      if (originalSend) XMLHttpRequest.prototype.send = originalSend;
    }

    /** XHR instance'ına mock response uygula — readyState, status, responseText + event dispatch */
    function applyMockToXhr(
      xhr: XMLHttpRequest,
      response: NonNullable<ResolvedMatch['response']>,
    ): void {
      // readyState, status, response properties override
      Object.defineProperty(xhr, 'readyState', { value: 4, writable: false, configurable: true });
      Object.defineProperty(xhr, 'status', { value: response.statusCode, writable: false, configurable: true });
      Object.defineProperty(xhr, 'statusText', { value: '', writable: false, configurable: true });
      Object.defineProperty(xhr, 'responseText', { value: response.body, writable: false, configurable: true });
      Object.defineProperty(xhr, 'response', { value: response.body, writable: false, configurable: true });

      // Response headers
      const headerString = response.headers
        .map((h) => `${h.name}: ${h.value}`)
        .join('\r\n');
      Object.defineProperty(xhr, 'getAllResponseHeaders', {
        value: () => headerString,
        configurable: true,
      });
      Object.defineProperty(xhr, 'getResponseHeader', {
        value: (name: string) => {
          const found = response.headers.find(
            (h) => h.name.toLowerCase() === name.toLowerCase(),
          );
          return found?.value ?? null;
        },
        configurable: true,
      });

      // Event dispatch — readystatechange → load → loadend
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new ProgressEvent('load'));
      xhr.dispatchEvent(new ProgressEvent('loadend'));

      // onreadystatechange callback (eski style event handler desteği)
      if (typeof xhr.onreadystatechange === 'function') {
        xhr.onreadystatechange(new Event('readystatechange') as ProgressEvent);
      }
      if (typeof xhr.onload === 'function') {
        xhr.onload(new ProgressEvent('load'));
      }
      if (typeof xhr.onloadend === 'function') {
        xhr.onloadend(new ProgressEvent('loadend'));
      }
    }

    /** URL'yi absolute path'e çöz */
    function resolveXhrUrl(url: string | URL): string {
      if (url instanceof URL) return url.href;
      try {
        return new URL(url, window.location.href).href;
      } catch {
        return url;
      }
    }
    ```
  - [x] Subtask 5.2: `xhr-interceptor.spec.ts` — Testler:
    - `open()` + `send()` → resolver.resolve() çağrılır, matched → mock XHR state
    - No match → orijinal send çağrılır
    - Sync XHR (`async: false`) → direkt passthrough, resolver çağrılmaz
    - Resolver hatası → sessiz passthrough
    - Mock response → `readyState = 4`, `status`, `responseText`, `response` doğru
    - `getAllResponseHeaders()` → `"name: value\r\n..."` formatında
    - `getResponseHeader('Content-Type')` → case-insensitive eşleşme
    - `readystatechange`, `load`, `loadend` event'leri dispatch edilir
    - `onreadystatechange`, `onload`, `onloadend` callback'leri çağrılır
    - Delay > 0 → setTimeout sonra mock uygulanır
    - `cleanupXhr()` sonrası orijinal open/send restore edilir
    - WeakMap kullanımı — farklı XHR instance'ları birbirini etkilemez

- [x] Task 6: `interceptor.ts` — MAIN World Entry Point (AC: #1, #2)
  - [x] Subtask 6.1: `packages/extension/src/content/interceptor.ts` oluştur:
    ```typescript
    /**
     * MAIN World Content Script Entry Point
     * manifest.json → content_scripts[1] → "world": "MAIN", "run_at": "document_start"
     *
     * Bu script sayfanın JS context'inde çalışır:
     * - window.fetch ve XMLHttpRequest override
     * - chrome.runtime API'lerine ERİŞİMİ YOK
     * - ISOLATED world content script ile window.postMessage üzerinden iletişim kurar
     */
    import { MockResolver } from './mock-resolver';
    import { interceptFetch } from './fetch-interceptor';
    import { interceptXhr } from './xhr-interceptor';

    const resolver = new MockResolver();
    interceptFetch(resolver);
    interceptXhr(resolver);
    ```
    > **NOT:** Bu entry point minimal — tüm logic modüllerde. intentional olarak console.log yok (MAIN world'de sayfa console'unu kirletmemek için).

- [x] Task 7: `content.ts` Güncelleme — Window ↔ Port Bridge (AC: #1, #2, #3, #4)
  - [x] Subtask 7.1: `content.ts` güncelle — window.addEventListener ile MAIN world'den gelen MATCH_QUERY'leri al, port'a forward et:
    ```typescript
    import {
      HAR_MOCK_CHANNEL,
      type WindowMatchQuery,
      type WindowMatchResult,
    } from './window-messaging.types';

    // --- MAIN World ↔ ISOLATED World Bridge ---

    // MAIN world'den gelen MATCH_QUERY'leri dinle → port'a forward et
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as Record<string, unknown> | undefined;
      if (data?.channel !== HAR_MOCK_CHANNEL) return;
      if (data?.type !== 'MATCH_QUERY') return;

      const query = data as unknown as WindowMatchQuery;
      port.postMessage({
        type: MessageType.MATCH_QUERY,
        payload: { url: query.url, method: query.method, tabId: 0 },
        requestId: query.requestId,
      } satisfies Message<MatchQueryPayload>);
    });
    ```
  - [x] Subtask 7.2: `content.ts` port.onMessage handler güncelle — MATCH_RESULT'ları window'a forward et:
    ```typescript
    port.onMessage.addListener((message: Message) => {
      switch (message.type) {
        case MessageType.PONG:
          break;
        case MessageType.MATCH_RESULT: {
          // Background'dan gelen MATCH_RESULT → MAIN world'e forward
          const payload = message.payload as MatchResultPayload;
          const result: WindowMatchResult = {
            channel: HAR_MOCK_CHANNEL,
            type: 'MATCH_RESULT',
            requestId: message.requestId ?? '',
            matched: payload.matched,
            response: payload.response ? {
              statusCode: payload.response.statusCode,
              body: payload.response.body,
              headers: [...payload.response.headers],
              delay: payload.response.delay,
            } : undefined,
            source: payload.source,
          };
          window.postMessage(result, '*');
          break;
        }
        default:
          break;
      }
    });
    ```
  - [x] Subtask 7.3: `content.ts`'e gerekli import'ları ekle: `MatchQueryPayload`, `MatchResultPayload`, window messaging types
  - [x] Subtask 7.4: `content.spec.ts` oluştur — Testler:
    - Window MATCH_QUERY mesajı → port.postMessage ile MATCH_QUERY forward edilir (requestId korunur)
    - Port MATCH_RESULT mesajı → window.postMessage ile MATCH_RESULT forward edilir (requestId korunur)
    - Yanlış channel ile gelen window mesajı → ignore edilir
    - `event.source !== window` → ignore edilir

- [x] Task 8: Background `message-handler.ts` — requestId Echoing (AC: #1)
  - [x] Subtask 8.1: `MATCH_QUERY` case'indeki TÜM `port.postMessage` çağrılarına `requestId: message.requestId` ekle. Geçerli olan yerler:
    - Passthrough (extension disabled)
    - Passthrough (exclude list)
    - Edited response match
    - Rule match
    - HAR match
    - Passthrough (no match)
    - Error handler
    > Toplamda ~7 `port.postMessage` çağrısı var; HEPSİNE `requestId` eklenmeli.
  - [x] Subtask 8.2: `message-handler.spec.ts` — requestId echoing testleri:
    - MATCH_QUERY ile gönderilen requestId, MATCH_RESULT'ta geri dönmeli
    - requestId yoksa (undefined) → undefined olarak echo yapılmalı (mevcut davranış korunur)

- [x] Task 9: Testler & Build Doğrulama
  - [x] Subtask 9.1: `yarn test` — tüm testler geçmeli (mevcut 169+ yeni testler)
  - [x] Subtask 9.2: Branch coverage ≥ %80 korunmalı
  - [x] Subtask 9.3: `yarn build:extension` — 4 bundle üretmeli (`popup.js`, `background.js`, `content.js`, `interceptor.js`)
  - [x] Subtask 9.4: `dist/extension/interceptor.js` dosyasının oluştuğunu doğrula
  - [x] Subtask 9.5: `yarn format:check` geçmeli

## Dev Notes

### Kritik Mimari Karar: Dual Content Script (ISOLATED + MAIN World)

Architecture dokümanı tek bir MAIN world content script öngörüyor ve "MAIN world'de chrome.runtime.connect() kullanılabilir" notu var. **Bu YANLIŞ.** MV3'te `"world": "MAIN"` content script'leri Chrome API'lerine (chrome.runtime, chrome.storage vb.) erişemez — sayfanın JS context'inde çalışırlar.

**Doğru Yaklaşım — Dual Script:**

```
┌──────────────────────────────────────────────────────────────────┐
│ MAIN World (interceptor.js)           Sayfanın JS context'i     │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ fetch-interceptor│  │ xhr-interceptor │  │  mock-resolver  │  │
│ │ window.fetch     │  │ XHR.prototype   │  │  pendingRequests│  │
│ │ override         │  │ override        │  │  Map<id,Promise>│  │
│ └────────┬─────────┘  └────────┬────────┘  └───────┬─────────┘  │
│          │                     │                    │            │
│          └─────────── resolver.resolve() ──────────┘            │
│                         window.postMessage('__HAR_MOCK__')      │
│                                ↕                                │
├────────────────────── window boundary ──────────────────────────┤
│                                ↕                                │
│ ISOLATED World (content.js)   Chrome API erişimi VAR            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Bridge: window.addEventListener ↔ chrome.runtime port       │ │
│ │ MATCH_QUERY (window) → MATCH_QUERY (port)                   │ │
│ │ MATCH_RESULT (port) → MATCH_RESULT (window)                 │ │
│ └──────────────────────────┬──────────────────────────────────┘ │
│                            │ chrome.runtime.connect()           │
├────────────────────────────┼────────────────────────────────────┤
│                            ↕                                    │
│ Background Service Worker                                       │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ MATCH_QUERY handler: Rules → HAR → Passthrough (MEVCUT)     ││
│ │ + requestId echoing (YENİ)                                   ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Neden manifest yaklaşımı (script injection değil):**
- Chrome, manifest'teki `"world": "MAIN"` + `"run_at": "document_start"` ile script'i HER sayfa script'inden ÖNCE inject eder
- Script tag injection (`document.createElement('script')`) zamanlama garantisi sunmaz — `src` attribute async yüklenir
- Manifest yaklaşımı CSP sorunlarından etkilenmez

### requestId Akışı (Kritik — Concurrent Request Desteği)

```
MAIN world                  ISOLATED world              Background SW
────────                    ──────────                  ─────────────
1. resolver.resolve()
   requestId = "abc123"
   ─── window.postMessage ──→
                             2. window event handler
                                port.postMessage({
                                  type: MATCH_QUERY,
                                  payload: {url, method, tabId:0},
                                  requestId: "abc123"
                                })
                                ─── port message ──→
                                                        3. handleMessage
                                                           MATCH_QUERY case
                                                           ...resolve match...
                                                           port.postMessage({
                                                             type: MATCH_RESULT,
                                                             payload: {matched, response},
                                                             requestId: "abc123" ←── EKLENECEK!
                                                           })
                                ←── port message ───
                             4. port.onMessage handler
                                window.postMessage({
                                  channel: '__HAR_MOCK__',
                                  type: 'MATCH_RESULT',
                                  requestId: "abc123",
                                  matched, response
                                })
   ←── window.postMessage ──
5. handleMessage
   pendingRequests.get("abc123")
   resolve → interceptor gelir
```

> **ZORUNLU:** Background MATCH_QUERY handler'daki ~7 port.postMessage çağrısına `requestId: message.requestId` eklenmeli. Yoksa concurrent request'lerde response eşleştirmesi yapılamaz.

### Mevcut Background MATCH_QUERY Handler — DEĞİŞMEYECEK Logic, SADECE requestId Echoing

`message-handler.ts` MATCH_QUERY case'i Story 2.2'de tam implement edildi. Mevcut logic (Rules → HAR → Passthrough priority chain) doğru çalışıyor. Bu story'de **SADECE** her `port.postMessage` çağrısına `requestId: message.requestId` eklenmeli. Handler logic'ine dokunulmamalı.

Örnek (mevcut → hedef):
```typescript
// MEVCUT:
port.postMessage({
  type: MessageType.MATCH_RESULT,
  payload: { matched: false } satisfies MatchResultPayload,
});

// HEDEF:
port.postMessage({
  type: MessageType.MATCH_RESULT,
  payload: { matched: false } satisfies MatchResultPayload,
  requestId: message.requestId,  // ← SADECE BU SATIR EKLENİYOR
});
```

### Mevcut `MatchQueryPayload.tabId` — Kullanılmıyor, 0 Gönder

```typescript
export interface MatchQueryPayload {
  readonly url: string;
  readonly method: string;
  readonly tabId: number;  // MEVCUT AMA HANDLER TARAFINDAN KULLANILMIYOR
}
```

Content bridge'den `tabId: 0` gönderilecek. Background handler zaten tabId'yi kullanmıyor:
```typescript
const { url, method } = message.payload as MatchQueryPayload;
```

İleride tabId gerekirse, background `port.sender?.tab?.id` ile alabilir.

### Dosya Yapısı — Bu Story İçin

```
packages/extension/src/
├── content/
│   ├── content.ts                    ← GÜNCELLEME (window ↔ port bridge ekleme)
│   ├── content.spec.ts               ← YENİ (bridge testleri)
│   ├── interceptor.ts                ← YENİ (MAIN world entry point)
│   ├── fetch-interceptor.ts          ← YENİ
│   ├── fetch-interceptor.spec.ts     ← YENİ
│   ├── xhr-interceptor.ts            ← YENİ
│   ├── xhr-interceptor.spec.ts       ← YENİ
│   ├── mock-resolver.ts              ← YENİ
│   ├── mock-resolver.spec.ts         ← YENİ
│   ├── window-messaging.types.ts     ← YENİ
│   └── index.ts                      ← MEVCUT (dokunma)
├── background/
│   ├── message-handler.ts            ← GÜNCELLEME (requestId echoing)
│   └── message-handler.spec.ts       ← GÜNCELLEME (requestId testleri)
├── shared/
│   └── constants.ts                  ← GÜNCELLEME (HAR_MOCK_CHANNEL, MATCH_QUERY_TIMEOUT_MS)
└── public/
    └── manifest.json                 ← GÜNCELLEME (ikinci content_scripts girişi)
```

### Webpack Config Değişikliği

```javascript
// webpack.config.js swConfig.entry — MEVCUT:
entry: {
  background: './src/background/background.ts',
  content: './src/content/content.ts',
},

// HEDEF:
entry: {
  background: './src/background/background.ts',
  content: './src/content/content.ts',
  interceptor: './src/content/interceptor.ts',  // YENİ
},
```

> **Bundle analizi:** `interceptor.js` core'dan IMPORT YAPMADIĞI için çok küçük bir bundle olacak (~5-10KB). Sadece mock-resolver, fetch-interceptor, xhr-interceptor ve window-messaging.types içerir.

### Sessiz Passthrough Pattern (ARCH8) — HER İnterceptor'da ZORUNLU

```typescript
// DOĞRU — fetch interceptor
try {
  const result = await resolver.resolve(url, method);
  if (result?.matched && result.response) return buildFetchResponse(result.response);
} catch {
  // Sessiz passthrough
}
return originalFetch(input, init);

// DOĞRU — XHR interceptor
resolver.resolve(meta.url, meta.method)
  .then((result) => {
    if (result?.matched && result.response) { applyMockToXhr(xhr, result.response); }
    else { originalSend.call(xhr, body); }
  })
  .catch(() => {
    originalSend.call(xhr, body); // Sessiz passthrough
  });
```

**Anti-pattern:**
```typescript
// YANLIŞ — hata fırlatma veya console.error ile devam etmeme
catch (error) {
  console.error('Mock failed:', error);
  throw error; // SAYFA KIRILIR!
}
```

### fetch Input Tipleri — Üç Durum

```typescript
// 1. String URL
fetch('/api/users')  // → resolveUrl: new URL('/api/users', location.href).href

// 2. URL Object
fetch(new URL('/api/users', 'https://example.com'))  // → input.href

// 3. Request Object
fetch(new Request('/api/users', { method: 'POST' }))  // → input.url, input.method
```

Interceptor üç türü de handle etmeli — `resolveUrl()` ve `extractMethod()` fonksiyonları bunu sağlıyor.

### XHR Monkey-Patching Dikkat Noktaları

1. **WeakMap kullanımı** — `xhrMeta` WeakMap ile her XHR instance'ına metadata bağlanır. Closure yerine WeakMap tercih edilmeli (memory leak önleme).
2. **Sync XHR (`async: false`)** — Async resolver kullanılamaz, direkt passthrough. Modern kullanımda nadir ama desteklenmeli.
3. **`Object.defineProperty`** — XHR instance property'leri (readyState, status, responseText) readonly olduğu için `defineProperty` ile override edilir.
4. **Event dispatch sırası** — `readystatechange` → `load` → `loadend`. Hem `addEventListener` hem callback style (`onreadystatechange`, `onload`) desteklenmeli.
5. **`prototype.open` argümanları** — TypeScript overload tiplerine dikkat. `open(method, url)` ve `open(method, url, async, user?, pass?)` iki overload var.

### Relative URL Çözümleme — Kritik Edge Case

HAR dosyasındaki URL'ler absolute (`https://api.example.com/users/123`). Sayfadaki fetch çağrıları relative olabilir (`/api/users/123`). Background URL matcher absolute URL'lerle çalışır.

```typescript
// Interceptor'da relative → absolute çözümleme ZORUNLU
const url = resolveUrl(input); // '/api/users' → 'https://example.com/api/users'
```

### Test Pattern — window.postMessage Mock

```typescript
// Jest JSDOM ortamında window.postMessage çalışır ama MessageEvent oluşturma:
function dispatchWindowMessage(data: unknown): void {
  const event = new MessageEvent('message', {
    data,
    origin: window.location.origin,
    source: window,
  });
  window.dispatchEvent(event);
}

// MockResolver testi:
it('should resolve when MATCH_RESULT received', async () => {
  const resolver = new MockResolver(5000);
  const promise = resolver.resolve('https://api.com/users', 'GET');

  // PostMessage handler'dan requestId'yi yakala
  const posted = await waitForPostMessage();
  expect(posted.channel).toBe('__HAR_MOCK__');
  expect(posted.type).toBe('MATCH_QUERY');

  // Sonuç gönder
  dispatchWindowMessage({
    channel: '__HAR_MOCK__',
    type: 'MATCH_RESULT',
    requestId: posted.requestId,
    matched: true,
    response: { statusCode: 200, body: '{"ok":true}', headers: [], delay: 0 },
  });

  const result = await promise;
  expect(result?.matched).toBe(true);
  resolver.destroy();
});
```

### Test Pattern — fetch Override Test

```typescript
// Orijinal fetch mock'la, interceptor kur, test et
const originalFetch = jest.fn().mockResolvedValue(new Response('original'));
window.fetch = originalFetch;

const mockResolver = {
  resolve: jest.fn().mockResolvedValue({
    matched: true,
    response: { statusCode: 200, body: '{"mock":true}', headers: [], delay: 0 },
  }),
  destroy: jest.fn(),
} as unknown as MockResolver;

interceptFetch(mockResolver);

const response = await window.fetch('https://api.com/data');
expect(response.status).toBe(200);
expect(await response.text()).toBe('{"mock":true}');
expect(originalFetch).not.toHaveBeenCalled(); // Orijinal fetch çağrılmamalı

cleanupFetch();
```

### Test Pattern — XHR Override Test

```typescript
// XHR event dispatch doğrulama
const onReadyStateChange = jest.fn();
const onLoad = jest.fn();

const xhr = new XMLHttpRequest();
xhr.onreadystatechange = onReadyStateChange;
xhr.onload = onLoad;
xhr.open('GET', 'https://api.com/data');
xhr.send();

// Mock uygulandıktan sonra:
await flushPromises(); // resolver.resolve() tamamlansın

expect(xhr.readyState).toBe(4);
expect(xhr.status).toBe(200);
expect(xhr.responseText).toBe('{"mock":true}');
expect(onReadyStateChange).toHaveBeenCalled();
expect(onLoad).toHaveBeenCalled();
```

### Önceki Story'lerden Öğrenilenler

**Story 2.3 (HAR Yükleme UI):**
1. `@har-mock/core` barrel export fonksiyonları — `parseHar()`, `parameterize()`, `evaluate()`, `matchUrl()`, `resolve()` — doğrudan fonksiyon çağrısı, class metodu değil.
2. `transpileOnly: true` (swConfig) — background/content değişikliklerinde type hataları build'de görünmez; `tsc --noEmit` ile kontrol et.
3. Coverage hedefi %80 branch (Story 2.2'de %83, 2.3'te %85.85). Aynı hedef korunmalı.
4. ESLint override — `*.spec.ts` için `unbound-method`, `no-unsafe-assignment`, `no-unsafe-member-access` kapalı.

**Story 2.2 (Background SW):**
1. `handleMessage` async — `void handleMessageAsync()` pattern'ı. MATCH_QUERY handler zaten async.
2. `satisfies` operatörü — payload type safety için kullanılıyor (`payload: { matched: false } satisfies MatchResultPayload`).
3. Lazy initialization — `stateManager.isInitialized()` kontrolü her mesajda yapılıyor.

### TypeScript Strict Mode Kuralları (Tekrar)

1. **`any` YASAK** — `unknown` + type guard kullan
2. **`noUncheckedIndexedAccess: true`** — undefined kontrolü zorunlu
3. **`readonly`** — tüm state objelerinde ve type property'lerinde zorunlu
4. **`switch/case`** — content.ts port.onMessage handler'da ZORUNLU
5. **`as const`** — HAR_MOCK_CHANNEL gibi sabitlerde

### Barrel Export Kuralı (ZORUNLU)

```typescript
// DOĞRU
import { MessageType, type Message, type MatchResultPayload } from '../shared';

// YANLIŞ
import { MessageType } from '../shared/messaging.types';
```

### manifest.json — Chrome Extension `"world": "MAIN"` Desteği

`"world": "MAIN"` Chrome 111+ (2023-03) ile destekleniyor. Proje MV3 hedefliyor, bu versiyon sorunsuz. `"run_at": "document_start"` ile birlikte kullanımda Chrome, script'i sayfa DOM parse başlamadan ÖNCE inject eder — bu monkey-patching için idealdir.

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["interceptor.js"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ]
}
```

### Project Structure Notes

- `content/` klasörü altında interceptor modülleri architecture.md ile uyumlu (`content/fetch-interceptor.ts`, `content/xhr-interceptor.ts`, `content/mock-resolver.ts`)
- `interceptor.ts` entry point architecture'da öngörülmemiş ama dual-world gereksinimi nedeniyle zorunlu
- `window-messaging.types.ts` yeni tip dosyası — messaging.types.ts ile KARIŞTIRILMAMALI (farklı iletişim kanalı)
- swConfig'teki `interceptor` entry — content.js ile aynı ts-loader config kullanır

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Acceptance criteria ve user story statement (FR10, FR11, ARCH8, NFR6)
- [Source: _bmad-output/planning-artifacts/architecture.md#Request Intercept Mechanism] — Monkey-patching kararı, MAIN world
- [Source: _bmad-output/planning-artifacts/architecture.md#Messaging Architecture] — Port-based connections, Message<T>/MessageResponse<T>
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Pattern] — Sessiz passthrough pattern (content script)
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management & Persistence] — chrome.storage.local + in-memory cache
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — kebab-case, hm- prefix
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam Proje Dizin Yapısı] — content/ klasör yapısı
- [Source: packages/extension/src/shared/messaging.types.ts] — MessageType.MATCH_QUERY, MATCH_RESULT
- [Source: packages/extension/src/shared/payload.types.ts] — MatchQueryPayload, MatchResultPayload
- [Source: packages/extension/src/shared/constants.ts] — PORT_NAME_CONTENT_PREFIX, STORAGE_KEYS
- [Source: packages/extension/src/content/content.ts] — Mevcut ISOLATED world entry point
- [Source: packages/extension/src/background/message-handler.ts] — MATCH_QUERY handler (Rules→HAR→Passthrough, tam implement)
- [Source: packages/extension/src/background/state-manager.ts] — getHarData(), getActiveRules(), getSettings() API
- [Source: packages/extension/src/background/port-manager.ts] — sendToPopup(), broadcastToContent()
- [Source: packages/extension/webpack.config.js] — swConfig entry points, ts-loader transpileOnly
- [Source: packages/extension/public/manifest.json] — Mevcut MV3 manifest yapısı
- [Source: packages/core/src/index.ts] — evaluate(), matchUrl(), resolve() barrel export
- [Source: _bmad-output/implementation-artifacts/2-3-har-yukleme-ui-drag-drop-file-picker.md] — Önceki story öğrenmeleri
- [Source: _bmad-output/implementation-artifacts/2-2-background-service-worker-state-yonetimi-port-hub.md] — Background SW state/message yapısı

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- jest-environment-fetch.js oluşturuldu — jsdom'da Fetch API yoktu, Node 24 native fetch/Response/Request/Headers global'ları jsdom window'a kopyalandı
- destroy() testinde timeout sorunu — destroy() tüm pending promise'leri null ile resolve etmeli (timeout değil)
- content.spec.ts duplicate içerik — replace_string_in_file sonrası PowerShell ile satır bazında trim gerekti
- window listener akümülasyonu — require('./content') beforeEach'ten module scope'a taşındı

### Completion Notes List

- Dual content script mimarisi: ISOLATED (content.js) + MAIN (interceptor.js), window.postMessage köprüsü
- MockResolver: requestId'li concurrent request desteği, 5s timeout, pending Map
- fetch-interceptor: URL normalize, method extract, Response build (forbidden header toleransı), delay, sessiz passthrough
- xhr-interceptor: WeakMap metadata, async-only (sync XHR passthrough), applyMockToXhr Object.defineProperty, event dispatch zinciri
- content.ts: MATCH_QUERY (window→port) + MATCH_RESULT (port→window) köprüsü
- message-handler.ts: 7 port.postMessage çağrısına requestId: message.requestId eklendi
- Tüm testler: 223/223 GREEN ✅ | Build: popup.js + background.js + content.js + interceptor.js ✅ | Format: ALL OK ✅

### File List

- packages/extension/public/manifest.json
- packages/extension/webpack.config.js
- packages/extension/src/shared/constants.ts
- packages/extension/src/shared/index.ts
- packages/extension/src/content/window-messaging.types.ts (NEW)
- packages/extension/src/content/mock-resolver.ts (NEW)
- packages/extension/src/content/mock-resolver.spec.ts (NEW)
- packages/extension/src/content/fetch-interceptor.ts (NEW)
- packages/extension/src/content/fetch-interceptor.spec.ts (NEW)
- packages/extension/src/content/xhr-interceptor.ts (NEW)
- packages/extension/src/content/xhr-interceptor.spec.ts (NEW)
- packages/extension/src/content/interceptor.ts (NEW)
- packages/extension/src/content/content.ts
- packages/extension/src/content/content.spec.ts (NEW)
- packages/extension/src/background/message-handler.ts
- packages/extension/src/background/message-handler.spec.ts
- packages/extension/jest-environment-fetch.js (NEW)

### Change Log

| Date | Changed By | Summary |
|------|------------|---------|
| 2025-07-25 | Claude Sonnet 4.6 | Story 2.4 tam implementasyonu: dual-world intercept mimarisi, MockResolver, fetch/XHR interceptor'ları, window↔port köprüsü, requestId echoing. 223 test GREEN, build OK, format OK. |
| 2026-02-25 | Claude Opus 4.6 (Code Review) | H1: 5 ESLint hatası düzeltildi (unbound-method, no-this-alias, no-floating-promises). H2: XHR applyMockToXhr double-fire kaldırıldı (dispatchEvent zaten IDL handler'ları tetikler). M1: HAR_MOCK_CHANNEL DRY ihlali giderildi (window-messaging.types → import+re-export from shared/constants). 223 test GREEN, build OK, format OK, lint clean. |
