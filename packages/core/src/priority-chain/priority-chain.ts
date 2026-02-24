/**
 * Priority Chain
 *
 * Request için Rules → HAR → Passthrough öncelik sırasını uygular.
 * Deterministik davranış: aynı input, aynı output (NFR7).
 * Exception fırlatılmaz — hata durumunda null döner (sessiz passthrough).
 *
 * @see Architecture Doc — Process Patterns — Priority Chain
 */

import type { MockRequest, MockResponse, MockRule, ResolveResult } from '../types/rule.types';
import type { HarEntry } from '../types/har.types';
import type { UrlPattern } from '../types/url-pattern.types';
import { evaluate } from '../rule-engine/rule-engine';
import { matchUrl } from '../url-matcher/url-matcher';

// ─── Helpers ───────────────────────────────────────────────────

/**
 * HarEntry'den MockResponse oluşturur.
 * HAR timing replay ayrı bir mekanizma (Story 2.6) — delay her zaman 0.
 */
function harEntryToMockResponse(entry: HarEntry): MockResponse {
  return {
    statusCode: entry.status,
    body: entry.responseBody,
    headers: [...entry.responseHeaders], // defensive copy
    delay: 0,
  };
}

/**
 * UrlPattern'ın orijinal URL'si ve method ile eşleşen HAR entry'yi bulur.
 * Aynı URL için birden fazla entry olabilir — sadece ilk eşleşen döner.
 * Sequential/Last-Match mode ayrımı Story 2.5'te handle edilecek.
 */
function findHarEntry(
  pattern: UrlPattern,
  entries: readonly HarEntry[],
  method: string,
): HarEntry | undefined {
  return entries.find(
    (e) => e.url === pattern.original && e.method.toUpperCase() === method.toUpperCase(),
  );
}

// ─── resolve ───────────────────────────────────────────────────

/**
 * Request için öncelik sırasına göre response bulur.
 *
 * Algoritma:
 * 1. RULES: evaluate(request, rules) → non-null ise { source: 'rule', response }
 * 2. HAR: matchUrl → match varsa HAR entry'den { source: 'har', response }
 * 3. PASSTHROUGH: null
 *
 * @param request - Gelen request (url + method)
 * @param rules - Mock rule listesi (öncelikli)
 * @param harEntries - HAR entry listesi (ikincil)
 * @param urlPatterns - URL pattern listesi (HAR eşleştirme için)
 * @returns ResolveResult veya null (passthrough)
 */
export function resolve(
  request: MockRequest,
  rules: readonly MockRule[],
  harEntries: readonly HarEntry[],
  urlPatterns: readonly UrlPattern[],
): ResolveResult | null {
  try {
    // Step 1: Rules (highest priority)
    const ruleResponse = evaluate(request, rules);
    if (ruleResponse !== null) {
      return { source: 'rule', response: ruleResponse };
    }

    // Step 2: HAR
    const match = matchUrl(request.url, request.method, urlPatterns);
    if (match !== null) {
      const entry = findHarEntry(match.pattern, harEntries, request.method);
      if (entry !== undefined) {
        return { source: 'har', response: harEntryToMockResponse(entry) };
      }
    }

    // Step 3: Passthrough
    return null;
  } catch {
    // Unreachable in practice: evaluate() and matchUrl() already catch internally.
    // Guard kept as a safety net for content script's silent passthrough.
    /* istanbul ignore next */
    return null;
  }
}
