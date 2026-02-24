import type { HarHeader } from './har.types';

/**
 * Kullanıcı tarafından tanımlanan mock rule.
 * Rules accordion'dan oluşturulur (Epic 4).
 * PriorityChain'de HAR'dan önce değerlendirilir.
 *
 * @property id - Benzersiz tanımlayıcı (UUID formatı)
 * @property urlPattern - URL eşleştirme pattern'ı (exact veya wildcard)
 *   - Exact: '/api/users/profile' — tam eşleşme
 *   - Wildcard: '/api/data/*' — prefix match, * her şeyi eşleştirir
 * @property method - HTTP method (case-insensitive olarak eşleştirilir)
 * @property statusCode - Response status code (ör: 200, 404, 429, 500)
 * @property responseBody - Response body string (genellikle JSON)
 * @property responseHeaders - Response header'ları
 * @property delay - Response gecikmesi (ms); 0 = anında dönüş
 * @property enabled - Rule aktif/pasif durumu
 */
export interface MockRule {
  readonly id: string;
  readonly urlPattern: string;
  readonly method: string;
  readonly statusCode: number;
  readonly responseBody: string;
  readonly responseHeaders: readonly HarHeader[];
  readonly delay: number;
  readonly enabled: boolean;
}

/**
 * Intercept edilen request'e dönülecek mock response.
 * RuleEngine.evaluate veya PriorityChain.resolve tarafından üretilir.
 */
export interface MockResponse {
  readonly statusCode: number;
  readonly body: string;
  readonly headers: readonly HarHeader[];
  readonly delay: number;
}

/**
 * PriorityChain ve RuleEngine'e gelen request temsili.
 * Content script veya Angular HttpInterceptor'dan gelir.
 */
export interface MockRequest {
  readonly url: string;
  readonly method: string;
}

/**
 * PriorityChain.resolve sonucu — eşleşme kaynağını belirtir.
 * Monitor tab'ında badge göstermek için kullanılır (Story 3.2).
 */
export type ResolveSource = 'rule' | 'har';

/**
 * PriorityChain.resolve tarafından döndürülen sonuç.
 * null → Passthrough (hiçbir eşleşme yok)
 */
export interface ResolveResult {
  readonly source: ResolveSource;
  readonly response: MockResponse;
}
