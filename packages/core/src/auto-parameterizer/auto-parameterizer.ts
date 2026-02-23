/**
 * Auto-Parameterizer
 *
 * HAR entry URL'lerindeki dinamik segmentleri (UUID, numeric ID, hex token, JWT/Base64, nullable)
 * otomatik tespit ederek UrlPattern yapısına dönüştürür.
 *
 * Her HarEntry için bir UrlPattern üretilir (1:1 mapping — dedup yapılmaz).
 * Template yalnızca path içerir (query params ve fragment dahil değil).
 *
 * @see Architecture Doc — Auto-Parameterization Algorithm
 */

import type { HarEntry } from '../types';
import type { UrlPattern, PatternSegment } from '../types';
import { classifySegment } from './segment-classifier';

/**
 * HAR entry'leri URL pattern'larına dönüştürür.
 *
 * @param entries - HAR entry listesi (readonly)
 * @returns UrlPattern[] — her entry için bir pattern (1:1 mapping)
 */
export function parameterize(entries: readonly HarEntry[]): UrlPattern[] {
  return entries.map((entry) => createUrlPattern(entry));
}

/**
 * Tek bir HarEntry'den UrlPattern oluşturur.
 *
 * @param entry - HAR entry
 * @returns UrlPattern
 */
function createUrlPattern(entry: HarEntry): UrlPattern {
  const pathname = extractPathname(entry.url);
  const rawSegments = splitPathSegments(pathname);
  const segments = classifySegments(rawSegments);
  const template = buildTemplate(segments);

  return {
    original: entry.url,
    template,
    segments,
    method: entry.method,
  };
}

/**
 * URL'den pathname çıkarır. Query params ve fragment ayrıştırılır.
 *
 * @param url - Tam URL string
 * @returns pathname (ör: /api/users/123)
 */
function extractPathname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    // URL parse edilemezse path olarak kabul et
    const queryIndex = url.indexOf('?');
    const hashIndex = url.indexOf('#');
    let endIndex = url.length;

    if (queryIndex !== -1) {
      endIndex = queryIndex;
    }
    if (hashIndex !== -1 && hashIndex < endIndex) {
      endIndex = hashIndex;
    }

    return url.slice(0, endIndex);
  }
}

/**
 * Pathname'i segment'lere ayırır.
 * Leading `/` nedeniyle oluşan ilk boş string'i filtreler,
 * ancak path içindeki boş segment'leri (nullable) korur.
 *
 * @param pathname - URL pathname (ör: /api/users/123)
 * @returns segment dizisi
 */
function splitPathSegments(pathname: string): string[] {
  // Root path: "/"
  if (pathname === '/') {
    return [];
  }

  const parts = pathname.split('/');

  // Leading '/' nedeniyle ilk eleman her zaman boş string — onu atla
  // Ama path içindeki boş string'ler nullable segment olarak korunmalı
  return parts.slice(1);
}

/**
 * Her segment için classifySegment çağırır.
 */
function classifySegments(rawSegments: string[]): PatternSegment[] {
  return rawSegments.map((segment) => classifySegment(segment));
}

/**
 * Sınıflandırılmış segment'lerden template string oluşturur.
 * Static segment'ler olduğu gibi, dynamic segment'ler {param} olarak.
 *
 * @param segments - PatternSegment dizisi
 * @returns template string (ör: /api/users/{param}/orders)
 */
function buildTemplate(segments: readonly PatternSegment[]): string {
  if (segments.length === 0) {
    return '/';
  }

  const parts = segments.map((segment) => (segment.kind === 'dynamic' ? '{param}' : segment.value));

  return '/' + parts.join('/');
}
