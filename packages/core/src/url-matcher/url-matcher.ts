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
import type { CompiledPattern } from './pattern-compiler';
import { extractPathname, normalizePathname } from '../utils/url-utils';

// ─── Compilation Cache ─────────────────────────────────────────

/**
 * WeakMap-based compilation cache.
 * Aynı UrlPattern referansı tekrar geldiğinde regex yeniden derlenmez.
 * WeakMap kullandığı için UrlPattern GC'ye uygun kaldığında cache entry'si de temizlenir.
 */
const compilationCache = new WeakMap<UrlPattern, CompiledPattern>();

function getCompiledPattern(urlPattern: UrlPattern): CompiledPattern {
  let compiled = compilationCache.get(urlPattern);
  if (!compiled) {
    compiled = compilePattern(urlPattern);
    compilationCache.set(urlPattern, compiled);
  }
  return compiled;
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
    const normalizedMethod = requestMethod.toUpperCase();

    // Filter by method first (reduces sort set), then sort by specificity
    const sorted = patterns
      .map((p) => getCompiledPattern(p))
      .filter((p) => p.method.toUpperCase() === normalizedMethod)
      .sort((a, b) => b.staticSegmentCount - a.staticSegmentCount);

    const match = sorted.find((p) => p.regex.test(pathname));

    return match !== undefined ? { pattern: match.pattern } : null;
  } catch {
    // Unreachable in practice: compilePattern and RegExp.test() do not throw
    // for valid UrlPattern inputs. Guard kept as a safety net.
    /* istanbul ignore next */
    return null;
  }
}
