/**
 * Pattern Compiler
 *
 * UrlPattern'ları regex tabanlı CompiledPattern'lara dönüştürür.
 * Dynamic segment'ler ({param}) [^/]+ regex grubuna çevrilir;
 * static segment'ler regex özel karakterlerden escape edilir.
 *
 * @see Architecture Doc — Auto-Parameterization Algorithm
 */

import type { UrlPattern } from '../types/url-pattern.types';

// ─── CompiledPattern ───────────────────────────────────────────

/**
 * Derlenmiş URL pattern — UrlMatcher içinde kullanılır.
 *
 * @property regex - Eşleşme için kullanılan tam-path regex (^...$)
 * @property method - HTTP method (case-insensitive karşılaştırma için)
 * @property pattern - Orijinal UrlPattern (MatchResult için)
 * @property staticSegmentCount - Priority scoring: yüksek → daha spesifik
 */
export interface CompiledPattern {
  readonly regex: RegExp;
  readonly method: string;
  readonly pattern: UrlPattern;
  readonly staticSegmentCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Static path segment'teki regex özel karakterleri escape eder.
 * Dynamic segment'ler ({param}) bu fonksiyona gönderilmez.
 */
function escapeRegexSegment(segment: string): string {
  return segment.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
}

// ─── compilePattern ────────────────────────────────────────────

/**
 * UrlPattern'ı CompiledPattern'a dönüştürür.
 *
 * Segment dönüşümü:
 * - Dynamic (kind === 'dynamic') → `[^/]+`
 * - Static  (kind === 'static')  → escapeRegexSegment(value)
 *
 * Regex: `^/seg1/seg2/.../?$` (trailing slash toleranslı)
 *
 * @param urlPattern - Derlenecek UrlPattern
 * @returns CompiledPattern
 */
export function compilePattern(urlPattern: UrlPattern): CompiledPattern {
  const regexParts = urlPattern.segments.map((seg) =>
    seg.kind === 'dynamic' ? '[^/]+' : escapeRegexSegment(seg.value),
  );

  const regex = new RegExp(`^/${regexParts.join('/')}/?$`);

  const staticSegmentCount = urlPattern.segments.filter((seg) => seg.kind === 'static').length;

  return {
    regex,
    method: urlPattern.method,
    pattern: urlPattern,
    staticSegmentCount,
  };
}
