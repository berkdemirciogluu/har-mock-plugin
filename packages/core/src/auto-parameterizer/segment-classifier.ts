/**
 * Segment Classifier
 *
 * URL path segment'lerini deterministik regex-based classification ile sınıflandırır.
 * En spesifikten en genele doğru sıralı test: UUID > Numeric > Hex > Base64 > Nullable > Static
 *
 * @see Architecture Doc — Auto-Parameterization Algorithm
 */

import type { PatternSegment, ParamType } from '../types';

// ─── Regex Patterns (sıra KRİTİK — en spesifikten en genele) ──

const SEGMENT_PATTERNS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  numeric: /^\d+$/,
  hex: /^[0-9a-f]{16,}$/i,
  base64: /^[A-Za-z0-9_-]{20,}$/,
  nullable: /^(null|undefined|)$/,
} as const;

/**
 * Classification sırası — ilk eşleşen kazanır.
 * Sıra değiştirildiğinde false positive riski oluşur.
 */
const CLASSIFICATION_ORDER: readonly ParamType[] = [
  'uuid',
  'numeric',
  'hex',
  'base64',
  'nullable',
] as const;

/**
 * Bir URL path segment'ini sınıflandırır.
 *
 * @param segment - URL path segment'i (ör: "users", "123", "550e8400-...")
 * @returns PatternSegment — static veya dynamic (paramType ile)
 */
export function classifySegment(segment: string): PatternSegment {
  for (const paramType of CLASSIFICATION_ORDER) {
    if (SEGMENT_PATTERNS[paramType].test(segment)) {
      return { kind: 'dynamic', paramType };
    }
  }

  return { kind: 'static', value: segment };
}
