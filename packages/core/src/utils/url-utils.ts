/**
 * Shared URL utility functions.
 *
 * Used by both url-matcher and rule-engine to avoid code duplication.
 * These functions are intentionally NOT exported from the public barrel
 * — they are internal utilities only.
 */

/**
 * URL'den pathname çıkarır.
 * Tam URL (https://...) ve path-only (/api/...) inputlarını destekler.
 */
export function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // Path-only input — query ve fragment'ı ayır
    // String.split() always returns at least one element — [0] is guaranteed defined
    const pathOnly = url.split('?')[0] as string;
    return pathOnly.split('#')[0] as string;
  }
}

/**
 * Trailing slash normalize eder.
 * '/api/users/123/' → '/api/users/123'
 * '/' → '/'  (root path korunur)
 */
export function normalizePathname(pathname: string): string {
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}
