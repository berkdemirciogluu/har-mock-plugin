/**
 * Rule Engine
 *
 * Mock rule'ları incoming request ile eşleştirerek MockResponse üretir.
 * Sadece enabled rule'lar değerlendirilir; ilk eşleşen rule kullanılır.
 * Exception fırlatılmaz — hata durumunda null döner (sessiz passthrough).
 *
 * @see Architecture Doc — Rule-Based Mock (FR16-FR19)
 */

import type { MockRequest, MockResponse, MockRule } from '../types/rule.types';

// ─── Helpers ───────────────────────────────────────────────────

/**
 * URL'den pathname çıkarır.
 * Tam URL (https://...) ve path-only (/api/...) inputlarını destekler.
 */
function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // Path-only input — query ve fragment'ı ayır
    const pathOnly = url.split('?')[0] as string;
    return pathOnly.split('#')[0] as string;
  }
}

/**
 * Trailing slash normalize eder.
 * '/api/users/' → '/api/users'
 * '/' → '/' (root path korunur)
 */
function normalizePath(path: string): string {
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

/**
 * Rule URL pattern'ını request URL ile eşleştirir.
 *
 * - Exact match: normalizedPath === normalizedPattern
 * - Wildcard match: pattern '/*' ile bitiyorsa → prefix match
 */
function matchRulePattern(requestUrl: string, rulePattern: string): boolean {
  const requestPath = normalizePath(extractPathname(requestUrl));
  const normalizedPattern = normalizePath(rulePattern);

  // Wildcard: '/api/data/*' → prefix match
  if (normalizedPattern.endsWith('/*')) {
    const prefix = normalizedPattern.slice(0, -2); // '/api/data'
    return requestPath === prefix || requestPath.startsWith(prefix + '/');
  }

  // Exact match
  return requestPath === normalizedPattern;
}

// ─── evaluate ──────────────────────────────────────────────────

/**
 * Request'i mock rule'lar ile eşleştirir ve MockResponse üretir.
 *
 * Algoritma:
 * 1. Sadece enabled: true olan rule'ları filtrele
 * 2. Her rule için method (case-insensitive) ve URL pattern karşılaştır
 * 3. İlk eşleşen rule'dan MockResponse döndür
 * 4. Eşleşme yoksa null döndür
 *
 * @param request - Gelen request (url + method)
 * @param rules - Değerlendirilecek mock rule listesi
 * @returns Eşleşen rule'dan MockResponse veya null
 */
export function evaluate(request: MockRequest, rules: readonly MockRule[]): MockResponse | null {
  try {
    const normalizedMethod = request.method.toUpperCase();

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      if (rule.method.toUpperCase() !== normalizedMethod) {
        continue;
      }

      if (matchRulePattern(request.url, rule.urlPattern)) {
        return {
          statusCode: rule.statusCode,
          body: rule.responseBody,
          headers: rule.responseHeaders,
          delay: rule.delay,
        };
      }
    }

    return null;
  } catch {
    // Unreachable in practice: string operations do not throw for valid inputs.
    // Guard kept as a safety net for content script's silent passthrough.
    /* istanbul ignore next */
    return null;
  }
}
