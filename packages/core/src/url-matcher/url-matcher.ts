/**
 * URL Matcher
 *
 * Gelen request URL'lerini UrlPattern[] ile eşleştirir.
 * Öncelik: en yüksek staticSegmentCount → en spesifik pattern önce test edilir.
 * Eşleşme yoksa null döner; exception fırlatılmaz.
 *
 * @see Architecture Doc — Auto-Parameterization Algorithm — Priority Scoring
 */

import type { UrlPattern, MatchResult } from '../types/url-pattern.types';
import { compilePattern } from './pattern-compiler';

// ─── Helpers ───────────────────────────────────────────────────

/**
 * URL'den pathname çıkarır.
 * Tam URL (https://...) ve path-only (/api/...) inputlarını destekler.
 */
function extractPathname(requestUrl: string): string {
  try {
    return new URL(requestUrl).pathname;
  } catch {
    // Path-only input — query ve fragment'ı ayır
    return requestUrl.split('?')[0]!.split('#')[0]!;
  }
}

/**
 * Trailing slash normalize eder.
 * '/api/users/123/' → '/api/users/123'
 * '/' → '/'  (root path korunur)
 */
function normalizePathname(pathname: string): string {
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

// ─── matchUrl ──────────────────────────────────────────────────

/**
 * Request URL ve method'una göre en uygun UrlPattern'ı bulur.
 *
 * Algoritma:
 * 1. URL'den pathname çıkar ve normalize et
 * 2. Tüm pattern'ları compile et
 * 3. Method filtrele (case-insensitive)
 * 4. staticSegmentCount'a göre DESC sırala (en spesifik önce)
 * 5. İlk regex eşleşmesini döndür
 *
 * @param requestUrl - Request URL (tam URL veya path-only)
 * @param requestMethod - HTTP method (case-insensitive)
 * @param patterns - Eşleştirilecek UrlPattern dizisi
 * @returns Eşleşen pattern'ı içeren MatchResult veya null
 */
export function matchUrl(
  requestUrl: string,
  requestMethod: string,
  patterns: readonly UrlPattern[],
): MatchResult | null {
  try {
    const pathname = normalizePathname(extractPathname(requestUrl));

    const compiled = patterns.map((p) => compilePattern(p));

    const sorted = [...compiled].sort((a, b) => b.staticSegmentCount - a.staticSegmentCount);

    const match = sorted.find(
      (p) => p.method.toUpperCase() === requestMethod.toUpperCase() && p.regex.test(pathname),
    );

    return match !== undefined ? { pattern: match.pattern } : null;
  } catch {
    /* istanbul ignore next */
    return null;
  }
}
