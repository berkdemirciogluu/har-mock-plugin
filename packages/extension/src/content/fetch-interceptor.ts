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

/** HTTP method'u çıkar — init?.method öncelikli, sonra Request object method, default GET */
function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== 'string' && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase();
  }
  return 'GET';
}

/** Mock Response oluştur — status, body, headers byte-level doğru (NFR6) */
function buildFetchResponse(response: NonNullable<ResolvedMatch['response']>): Response {
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
