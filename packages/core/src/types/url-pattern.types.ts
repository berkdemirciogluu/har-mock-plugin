/**
 * URL Pattern Type Definitions
 *
 * Auto-parameterization sonucu üretilen URL pattern yapıları.
 * HAR entry URL'lerindeki dinamik segmentler (UUID, numeric ID, hex token, JWT/Base64, nullable)
 * otomatik tespit edilerek UrlPattern yapısına dönüştürülür.
 *
 * @see Architecture Doc — Auto-Parameterization Algorithm
 * @see Architecture Doc — Format Patterns — URL Pattern Temsili
 */

// ─── Param Type ────────────────────────────────────────────────

/**
 * Dinamik segment tipleri — regex-based classification sırası:
 * uuid > numeric > hex > base64 > nullable
 */
export type ParamType = 'uuid' | 'numeric' | 'hex' | 'base64' | 'nullable';

// ─── Pattern Segment (Discriminated Union) ─────────────────────

export type StaticSegment = {
  readonly kind: 'static';
  readonly value: string;
};

export type DynamicSegment = {
  readonly kind: 'dynamic';
  readonly paramType: ParamType;
};

/**
 * URL path'teki bir segment'i temsil eder.
 * - Static: sabit path parçası (ör: "api", "users")
 * - Dynamic: parametrize edilmiş segment (ör: UUID, numeric ID)
 */
export type PatternSegment = StaticSegment | DynamicSegment;

// ─── URL Pattern ───────────────────────────────────────────────

/**
 * HAR entry'den üretilen URL pattern.
 *
 * @property original - HAR'daki orijinal tam URL (display amaçlı)
 * @property template - Parametrize edilmiş path (ör: /api/users/{param}/orders)
 * @property segments - Path segment'lerinin sınıflandırılmış listesi
 * @property method - HTTP method (string — HarEntry.method ile tutarlı)
 */
export interface UrlPattern {
  readonly original: string;
  readonly template: string;
  readonly segments: readonly PatternSegment[];
  readonly method: string;
}
