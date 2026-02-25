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
const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string; async: boolean }>();

/**
 * XMLHttpRequest.prototype.open ve .send'i override et.
 * open() → method/url kaydet; send() → resolver.resolve() → mock veya passthrough.
 */
export function interceptXhr(resolver: MockResolver): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  originalOpen = XMLHttpRequest.prototype.open;
  // eslint-disable-next-line @typescript-eslint/unbound-method
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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
  Object.defineProperty(xhr, 'status', {
    value: response.statusCode,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(xhr, 'statusText', { value: '', writable: false, configurable: true });
  Object.defineProperty(xhr, 'responseText', {
    value: response.body,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(xhr, 'response', {
    value: response.body,
    writable: false,
    configurable: true,
  });

  // Response headers
  const headerString = response.headers.map((h) => `${h.name}: ${h.value}`).join('\r\n');
  Object.defineProperty(xhr, 'getAllResponseHeaders', {
    value: () => headerString,
    configurable: true,
  });
  Object.defineProperty(xhr, 'getResponseHeader', {
    value: (name: string) => {
      const found = response.headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return found?.value ?? null;
    },
    configurable: true,
  });

  // Event dispatch — readystatechange → load → loadend
  // dispatchEvent IDL event handler'ları (onreadystatechange, onload, onloadend) da otomatik tetikler
  xhr.dispatchEvent(new Event('readystatechange'));
  xhr.dispatchEvent(new ProgressEvent('load'));
  xhr.dispatchEvent(new ProgressEvent('loadend'));
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
