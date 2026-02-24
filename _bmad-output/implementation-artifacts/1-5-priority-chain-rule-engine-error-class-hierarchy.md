# Story 1.5: Priority Chain, Rule Engine & Error Class Hierarchy

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want `@har-mock/core` içinde `PriorityChain`, `RuleEngine` ve tam `HarMockError` hiyerarşisini,
so that her request için Rules → HAR → Passthrough öncelik sırasının deterministik uygulanması garantilensin; hata durumlarında type + rootCause + suggestedAction içeren structured error'lar fırlatılsın.

## Acceptance Criteria

1. **Given** aynı URL için hem aktif bir mock rule hem de eşleşen HAR entry mevcut **When** `resolve(request, rules, harEntries, urlPatterns)` çağrıldığında **Then** rule response dönülmeli; HAR entry göz ardı edilmeli (FR18, NFR7)

2. **Given** eşleşen mock rule yok ama eşleşen HAR entry var **When** `resolve()` çağrıldığında **Then** HAR response dönülmeli

3. **Given** ne rule ne HAR eşleşmesi var **When** `resolve()` çağrıldığında **Then** `null` dönmeli (Passthrough sinyali)

4. **Given** `evaluate(request, rules)` çağrısı **When** URL pattern, method ve aktif kurallar eşleştiğinde **Then** doğru `MockResponse` (status + body + headers + delay) dönmeli

5. **Given** hata durumu (geçersiz rule, storage hatası, messaging hatası vb.) **When** ilgili error class fırlatıldığında **Then** `HarParseError`, `UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError` — her biri `HarMockError`'dan extend eder; `instanceof HarMockError` true; `type`, `rootCause`, `suggestedAction` string alanları dolu (NFR13)

6. **Given** `packages/core/src/index.ts` barrel export **When** `import { HarParser, AutoParameterizer, UrlMatcher, PriorityChain, RuleEngine, HarMockError } from '@har-mock/core'` yazıldığında **Then** tüm public API'ler erişilebilir; implementation dosyalarına doğrudan import gerekmiyor (ARCH2)

## Tasks / Subtasks

- [x] Task 1: Rule & Mock Tip Tanımları (AC: #4, #6)
  - [x] Subtask 1.1: `packages/core/src/types/rule.types.ts` oluştur — Aşağıdaki tipleri tanımla (tüm property'ler `readonly`):
    - `MockRule`: `{ id: string; urlPattern: string; method: string; statusCode: number; responseBody: string; responseHeaders: readonly HarHeader[]; delay: number; enabled: boolean }`
    - `MockResponse`: `{ statusCode: number; body: string; headers: readonly HarHeader[]; delay: number }`
    - `MockRequest`: `{ url: string; method: string }`
    - `ResolveSource`: `'rule' | 'har'` type alias
    - `ResolveResult`: `{ source: ResolveSource; response: MockResponse }` — passthrough durumunda fonksiyon `null` döner, bu type kullanılmaz
  - [x] Subtask 1.2: `packages/core/src/types/index.ts` güncelle — yeni tipleri (`MockRule`, `MockResponse`, `MockRequest`, `ResolveSource`, `ResolveResult`) re-export et
  - [x] Subtask 1.3: `packages/core/src/index.ts` barrel export güncelle — yeni type export'ları otomatik gelecek (types/index.ts re-export zinciri)

- [x] Task 2: Error Class Hierarchy Tamamlanması (AC: #5)
  - [x] Subtask 2.1: `packages/core/src/errors/url-match.error.ts` oluştur — `UrlMatchError extends HarMockError`: `type = 'URL_MATCH_ERROR' as const`; constructor `(rootCause: string, suggestedAction: string)` — `HarParseError` ile aynı pattern
  - [x] Subtask 2.2: `packages/core/src/errors/rule-validation.error.ts` oluştur — `RuleValidationError extends HarMockError`: `type = 'RULE_VALIDATION_ERROR' as const`; aynı constructor pattern
  - [x] Subtask 2.3: `packages/core/src/errors/storage.error.ts` oluştur — `StorageError extends HarMockError`: `type = 'STORAGE_ERROR' as const`; aynı constructor pattern
  - [x] Subtask 2.4: `packages/core/src/errors/messaging.error.ts` oluştur — `MessagingError extends HarMockError`: `type = 'MESSAGING_ERROR' as const`; aynı constructor pattern
  - [x] Subtask 2.5: `packages/core/src/errors/index.ts` güncelle — 4 yeni error class'ı re-export et
  - [x] Subtask 2.6: `packages/core/src/index.ts` barrel export güncelle — yeni error class'ların export'larını ekle (`UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError`)

- [x] Task 3: RuleEngine İmplementasyonu (AC: #4)
  - [x] Subtask 3.1: `packages/core/src/rule-engine/rule-engine.ts` oluştur — `evaluate(request: MockRequest, rules: readonly MockRule[]): MockResponse | null` fonksiyonu
  - [x] Subtask 3.2: Sadece `enabled: true` olan rule'ları filtrele
  - [x] Subtask 3.3: Method karşılaştırması — `rule.method.toUpperCase() === request.method.toUpperCase()` (case-insensitive)
  - [x] Subtask 3.4: URL pattern eşleştirme — `matchRulePattern(requestUrl: string, rulePattern: string): boolean` helper fonksiyonu:
    - Exact match: `rulePattern === requestUrl` (normalize edilmiş pathname karşılaştırması)
    - Wildcard match: `rulePattern` sonunda `*` varsa → prefix match (`requestUrl.startsWith(prefix)`)
    - URL'den pathname çıkarma: `try { new URL(url).pathname } catch { url.split('?')[0].split('#')[0] }` — url-matcher'daki ile aynı logic
    - Trailing slash normalizasyonu
  - [x] Subtask 3.5: Eşleşen ilk rule'dan `MockResponse` oluştur: `{ statusCode: rule.statusCode, body: rule.responseBody, headers: rule.responseHeaders, delay: rule.delay }`
  - [x] Subtask 3.6: Eşleşme yoksa `null` döndür
  - [x] Subtask 3.7: Tüm fonksiyon try/catch ile sarılmalı — exception fırlatılmamalı; hata durumunda `null` dön (content script'in sessiz passthrough'u için)
  - [x] Subtask 3.8: `packages/core/src/rule-engine/index.ts` güncelle — `evaluate` fonksiyonunu export et

- [x] Task 4: PriorityChain İmplementasyonu (AC: #1, #2, #3)
  - [x] Subtask 4.1: `packages/core/src/priority-chain/priority-chain.ts` oluştur — `resolve(request: MockRequest, rules: readonly MockRule[], harEntries: readonly HarEntry[], urlPatterns: readonly UrlPattern[]): ResolveResult | null` fonksiyonu
  - [x] Subtask 4.2: Adım 1 — `evaluate(request, rules)` çağır; non-null ise `{ source: 'rule', response }` döndür
  - [x] Subtask 4.3: Adım 2 — `matchUrl(request.url, request.method, urlPatterns)` çağır;
    - Match bulunursa: eşleşen pattern'ın `original` URL'si + method'u ile `harEntries`'den karşılık gelen entry'yi bul
    - Bulunan `HarEntry`'den `MockResponse` oluştur: `{ statusCode: entry.status, body: entry.responseBody, headers: [...entry.responseHeaders], delay: 0 }`
    - `{ source: 'har', response }` döndür
  - [x] Subtask 4.4: Adım 3 — Hiçbir eşleşme yoksa `null` döndür (Passthrough sinyali)
  - [x] Subtask 4.5: Tüm fonksiyon try/catch ile sarılmalı — hata durumunda `null` dön (sessiz passthrough)
  - [x] Subtask 4.6: `harEntryToMockResponse(entry: HarEntry): MockResponse` helper fonksiyonu — HAR entry'yi MockResponse'a dönüştürür
  - [x] Subtask 4.7: `packages/core/src/priority-chain/index.ts` güncelle — `resolve` fonksiyonunu export et

- [x] Task 5: Error Class Testleri (AC: #5)
  - [x] Subtask 5.1: `packages/core/src/errors/error-hierarchy.spec.ts` oluştur — tüm error class'ları tek test dosyasında test et
  - [x] Subtask 5.2: Her error class için `instanceof HarMockError` → `true` testi
  - [x] Subtask 5.3: Her error class için `instanceof Error` → `true` testi
  - [x] Subtask 5.4: Her error class için `type`, `rootCause`, `suggestedAction` string alanları dolu testi
  - [x] Subtask 5.5: Her error class için `name` property → class name ile eşleşme testi (ör: `UrlMatchError.name === 'UrlMatchError'`)
  - [x] Subtask 5.6: Her error class için `message` formatı → `[TYPE] rootCause` testi
  - [x] Subtask 5.7: 5 error class (HarParseError, UrlMatchError, RuleValidationError, StorageError, MessagingError) × 5 test = minimum 25 test case

- [x] Task 6: RuleEngine Testleri (AC: #4)
  - [x] Subtask 6.1: `packages/core/src/rule-engine/rule-engine.spec.ts` oluştur
  - [x] Subtask 6.2: Test: Exact URL match — rule `urlPattern: '/api/users'`, request url `/api/users` → MockResponse döner
  - [x] Subtask 6.3: Test: Wildcard URL match — rule `urlPattern: '/api/data/*'`, request `/api/data/users` → match
  - [x] Subtask 6.4: Test: Method match — `rule.method: 'GET'`, `request.method: 'GET'` → match; `POST` → no match
  - [x] Subtask 6.5: Test: Method case-insensitive — `rule.method: 'get'`, `request.method: 'GET'` → match
  - [x] Subtask 6.6: Test: Disabled rule — `rule.enabled: false` → skip, `null` döner
  - [x] Subtask 6.7: Test: Multiple rules, first match — birden fazla eşleşen rule varsa ilk eşleşen kullanılır
  - [x] Subtask 6.8: Test: No match — eşleşmeyen URL → `null`
  - [x] Subtask 6.9: Test: Empty rules array → `null`
  - [x] Subtask 6.10: Test: MockResponse fields — statusCode, body, headers, delay doğru map edilmiş
  - [x] Subtask 6.11: Test: Delay 0 default — rule.delay: 0 → response.delay: 0
  - [x] Subtask 6.12: Test: Full URL input — `https://api.example.com/api/users` rule pattern `/api/users` → pathname çıkarılarak match
  - [x] Subtask 6.13: Test: Trailing slash tolerance — `/api/users/` ve `/api/users` aynı rule ile eşleşmeli

- [x] Task 7: PriorityChain Testleri (AC: #1, #2, #3)
  - [x] Subtask 7.1: `packages/core/src/priority-chain/priority-chain.spec.ts` oluştur
  - [x] Subtask 7.2: Test: Rule + HAR → rule response döner (AC #1) — aynı URL için rule ve HAR entry mevcut; `source: 'rule'` olmalı
  - [x] Subtask 7.3: Test: No rule, HAR match → HAR response döner (AC #2) — `source: 'har'` olmalı
  - [x] Subtask 7.4: Test: No rule, no HAR → `null` (AC #3) — Passthrough
  - [x] Subtask 7.5: Test: Deterministik davranış — aynı input, aynı output (NFR7) — 10 kez çağrılıp aynı sonuç alınmalı
  - [x] Subtask 7.6: Test: Multiple rules, first match rule used
  - [x] Subtask 7.7: Test: Rule disabled → HAR'a fallback
  - [x] Subtask 7.8: Test: HAR entry → MockResponse dönüşüm doğruluğu — statusCode, body, headers, delay:0
  - [x] Subtask 7.9: Test: Empty rules + empty HAR entries → `null`
  - [x] Subtask 7.10: Test: Exception durumunda `null` — hatalı input'ta sessiz passthrough

- [x] Task 8: Module Export & Final Doğrulama (AC: tümü)
  - [x] Subtask 8.1: `packages/core/src/index.ts` barrel export final güncelle — tüm yeni export'lar yerinde:
    - Types: `MockRule`, `MockResponse`, `MockRequest`, `ResolveSource`, `ResolveResult`
    - Errors: `UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError`
    - Functions: `resolve` (priority-chain), `evaluate` (rule-engine)
  - [x] Subtask 8.2: `yarn test:all` çalıştır — tüm testler geçer (eski + yeni), coverage %80+
  - [x] Subtask 8.3: `yarn lint:all` çalıştır — 0 hata, 0 uyarı
  - [x] Subtask 8.4: `yarn format:check` çalıştır — tüm dosyalar Prettier formatına uygun
  - [x] Subtask 8.5: `yarn build:core` çalıştır — TypeScript derleme başarılı
  - [x] Subtask 8.6: Import test — farklı paketten `import { resolve, evaluate, UrlMatchError, RuleValidationError, MockRule, MockResponse } from '@har-mock/core'` çalıştığını doğrula

## Dev Notes

### Kritik Mimari Kısıtlamalar

- **`packages/core`**: Angular ve Chrome API'ye **sıfır bağımlılık**. Saf TypeScript kütüphanesi. Hiçbir `@angular/*` veya `chrome.*` import'u yapılmaz.
- **`any` tipi YASAK**: ESLint `@typescript-eslint/no-explicit-any: error` ile zorlanır. `unknown` + type guard kullanılır.
- **Barrel export**: Tüm import'lar `@har-mock/core` barrel'dan yapılır. Implementation dosyalarına doğrudan import **yasak** (test dosyaları hariç — aynı modül içi test dosyaları doğrudan import edebilir).
- **Circular import yasak**: Core hiçbir zaman extension veya angular-plugin'i import etmez.
- **Dosya isimlendirme**: `kebab-case.ts` — ör: `rule-engine.ts`, `priority-chain.ts`
- **Test dosyaları**: Colocated `*.spec.ts` — implementation dosyasının yanında
- **`noUncheckedIndexedAccess: true` AKTIF**: Array index erişimlerinde `undefined` kontrolü veya non-null assertion (`!`) gerekli
- **`explicit-function-return-type: warn`**: Tüm public fonksiyonlara return type yazılmalı
- **`readonly` property'ler**: Tüm interface/type property'leri `readonly` olmalı
- **Fonksiyonel stil**: Önceki modüller (`matchUrl`, `compilePattern`, `parameterize`, `classifySegment`, `parseHar`, `validateHarSchema`) fonksiyon olarak export ediliyor — class değil. Bu story de `resolve` ve `evaluate` fonksiyonlarını export etmeli.

### Mevcut Codebase Durumu (Story 1.5 Başlangıcı)

**Zaten MEVCUT olan dosyalar (DEĞİŞTİRİLMEMELİ, sadece kullanılmalı):**

```
packages/core/src/
├── errors/
│   ├── har-mock.error.ts       ← HarMockError (abstract base) — MEVCUT
│   ├── har-parse.error.ts      ← HarParseError — MEVCUT
│   └── index.ts                ← HarMockError + HarParseError export — MEVCUT
├── har-parser/                 ← parseHar, validateHarSchema — MEVCUT, DOKUNMA
├── auto-parameterizer/         ← parameterize, classifySegment — MEVCUT, DOKUNMA
├── url-matcher/                ← matchUrl, compilePattern — MEVCUT, DOKUNMA
├── types/
│   ├── har.types.ts            ← HarEntry, HarFile, HarHeader vb. — MEVCUT
│   ├── url-pattern.types.ts    ← UrlPattern, MatchResult, PatternSegment — MEVCUT
│   └── index.ts                ← type re-exports — MEVCUT (GÜNCELLENEBİLİR)
├── priority-chain/
│   └── index.ts                ← "Story 1.5'te doldurulacak" placeholder — DEĞİŞTİRİLECEK
├── rule-engine/
│   └── index.ts                ← "Story 1.5'te doldurulacak" placeholder — DEĞİŞTİRİLECEK
└── index.ts                    ← barrel export — GÜNCELLENEBİLİR
```

**OLUŞTURULACAK yeni dosyalar:**

```
packages/core/src/
├── errors/
│   ├── url-match.error.ts          ← YENİ
│   ├── rule-validation.error.ts    ← YENİ
│   ├── storage.error.ts            ← YENİ
│   ├── messaging.error.ts          ← YENİ
│   ├── error-hierarchy.spec.ts     ← YENİ (tüm error class testleri)
│   └── index.ts                    ← GÜNCELLE (4 yeni export)
├── types/
│   ├── rule.types.ts               ← YENİ
│   └── index.ts                    ← GÜNCELLE (yeni type export'ları)
├── priority-chain/
│   ├── priority-chain.ts           ← YENİ
│   ├── priority-chain.spec.ts      ← YENİ
│   └── index.ts                    ← GÜNCELLE (placeholder → gerçek export)
├── rule-engine/
│   ├── rule-engine.ts              ← YENİ
│   ├── rule-engine.spec.ts         ← YENİ
│   └── index.ts                    ← GÜNCELLE (placeholder → gerçek export)
└── index.ts                        ← GÜNCELLE (yeni export'lar)
```

### Error Class Hierarchy — Pattern & Structure

Mevcut `HarParseError` pattern'ı birebir takip edilmeli. Tüm yeni error class'lar aynı yapıda:

```typescript
// Örnek: url-match.error.ts (HarParseError ile birebir aynı pattern)
import { HarMockError } from './har-mock.error';

export class UrlMatchError extends HarMockError {
  readonly type = 'URL_MATCH_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[URL_MATCH_ERROR] ${rootCause}`);
  }
}
```

**Error class listesi ve type sabitler:**

| Class | type const | Kullanım Alanı |
|---|---|---|
| `HarParseError` | `'HAR_PARSE_ERROR'` | HAR dosyası parse/validation (MEVCUT) |
| `UrlMatchError` | `'URL_MATCH_ERROR'` | URL eşleştirme hataları |
| `RuleValidationError` | `'RULE_VALIDATION_ERROR'` | Geçersiz mock rule tanımı |
| `StorageError` | `'STORAGE_ERROR'` | chrome.storage.local işlem hatası |
| `MessagingError` | `'MESSAGING_ERROR'` | Extension port/messaging hatası |

**⚠️ ÖNEMLİ**: `StorageError` ve `MessagingError` core'da tanımlanır ve export edilir ama şu an core'da kullanılmaz. Extension paketi tarafından kullanılacak (Epic 2). Core'un Angular/Chrome API'ye sıfır bağımlılığı olduğu için bu class'lar platform-agnostik — sadece error class tanımı, platform kodu yok.

### Rule Types — Detaylı Tanımlar

```typescript
// packages/core/src/types/rule.types.ts

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
```

### RuleEngine — Algoritma Detayları

```typescript
// packages/core/src/rule-engine/rule-engine.ts

/**
 * evaluate(request, rules) algoritması:
 *
 * 1. Sadece enabled: true olan rule'ları filtrele
 * 2. Filtrelenmiş rule'lar üzerinde sırayla iterate et
 * 3. Her rule için:
 *    a. Method karşılaştır (case-insensitive)
 *    b. URL pattern karşılaştır:
 *       - Request URL'den pathname çıkar
 *       - Trailing slash normalize et
 *       - Exact match: normalizedPath === normalizedPattern
 *       - Wildcard match: pattern '*' ile bitiyorsa → prefix match
 *    c. Eşleşme varsa MockResponse döndür
 * 4. Hiçbir eşleşme yoksa null döndür
 *
 * NOT: Fonksiyon asla exception fırlatmaz — hata durumunda null döner.
 */

// URL Normalizasyon — url-matcher ile aynı logic:
function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const pathOnly = url.split('?')[0] as string;
    return pathOnly.split('#')[0] as string;
  }
}

function normalizePath(path: string): string {
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

// Rule URL pattern matching:
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
```

**⚠️ KRİTİK**: `extractPathname` ve `normalizePath` fonksiyonları `url-matcher/url-matcher.ts`'te de var. Tekrar yazmak (duplicate) KABUL EDİLEBİLİR çünkü:
- Core içi modüller arası circular dependency riski sıfır tutulmalı
- Fonksiyonlar çok küçük (5 satır)
- Shared utility'ye taşımak ayrı bir refactoring story olabilir
- Alternatif: `packages/core/src/utils/url-utils.ts` shared dosyası oluşturup her iki modülden import edilebilir — bu tercih edilir

**ÖNERİLEN YAKLAŞIM**: `packages/core/src/utils/url-utils.ts` oluştur, `extractPathname` ve `normalizePath` fonksiyonlarını buraya taşı, hem `url-matcher.ts` hem `rule-engine.ts`'den import et. Bu refactoring bu story kapsamında yapılabilir ancak opsiyoneldir.

### PriorityChain — Algoritma Detayları

```typescript
// packages/core/src/priority-chain/priority-chain.ts

import { evaluate } from '../rule-engine/rule-engine';
import { matchUrl } from '../url-matcher/url-matcher';
import type { MockRequest, MockRule, MockResponse, ResolveResult } from '../types/rule.types';
import type { HarEntry } from '../types/har.types';
import type { UrlPattern } from '../types/url-pattern.types';

/**
 * resolve(request, rules, harEntries, urlPatterns) algoritması:
 *
 * 1. RULES: evaluate(request, rules) çağır
 *    → non-null ise { source: 'rule', response } döndür
 *
 * 2. HAR: matchUrl(request.url, request.method, urlPatterns) çağır
 *    → match varsa:
 *       a. match.pattern.original + method ile harEntries'den entry bul
 *       b. HarEntry → MockResponse dönüştür (harEntryToMockResponse helper)
 *       c. { source: 'har', response } döndür
 *
 * 3. PASSTHROUGH: null döndür
 *
 * NOT: Fonksiyon asla exception fırlatmaz — hata durumunda null döner.
 */

// HarEntry → MockResponse dönüşümü:
function harEntryToMockResponse(entry: HarEntry): MockResponse {
  return {
    statusCode: entry.status,
    body: entry.responseBody,
    headers: [...entry.responseHeaders], // defensive copy
    delay: 0, // HAR timing replay ayrı bir mekanizma (Story 2.6)
  };
}

// HAR entry lookup — pattern.original ile eşleşen entry'yi bul:
// NOT: Aynı URL için birden fazla entry olabilir (sequential mode).
// Bu story'de sadece İLK eşleşen entry dönülür.
// Sequential/Last-Match mode ayrımı Story 2.5'te handle edilecek.
function findHarEntry(
  pattern: UrlPattern,
  entries: readonly HarEntry[],
  method: string
): HarEntry | undefined {
  return entries.find(
    e => e.url === pattern.original &&
         e.method.toUpperCase() === method.toUpperCase()
  );
}
```

**⚠️ HAR Entry Lookup Kısıtlaması:**
- `pattern.original` HAR'dan gelen orijinal URL'dir (ör: `/api/users/123/orders`)
- Bir UrlPattern birden fazla HAR entry'ye map olabilir (ör: `/api/users/123` ve `/api/users/456` aynı pattern)
- Bu story'de `findHarEntry` sadece **ilk** eşleşen entry'yi döndürür
- Sequential/Last-Match mode ayrımı **bu story'nin kapsamı dışında** — Story 2.5'te handle edilecek
- Gelecekte `findHarEntry` yerine daha akıllı bir lookup (index map, circular buffer vb.) gerekebilir

### Önceki Story Learnings (Story 1.4'ten)

Story 1.4'te uygulanan ve bu story'de de takip edilmesi gereken pattern'lar:

1. **WeakMap cache pattern**: `matchUrl` içinde `compilationCache` WeakMap kullanılarak regex yeniden derleme engellendi. Bu story'de PriorityChain rule evaluation'ında benzer bir cache gerekli değil (rule matching basit string karşılaştırması).

2. **Method filter optimization**: `matchUrl`'de method filtresi sort'tan önce uygulandı — gereksiz sort azaltıldı. `evaluate`'de de benzer yaklaşım: önce enabled filtresi, sonra method filtresi.

3. **Shared test utils**: Story 1.4'te duplicate test helper'lar `test-utils.ts`'ye taşındı. Bu story'de de shared test helpers (mock rule oluşturma, mock request oluşturma) ortak dosyada tanımlanmalı.

4. **Branch coverage %100**: Story 1.4'te `??` operatörleri dead branch oluşturarak coverage düşürdü. `as string` type assertion ile çözüldü. Bu story'de de aynı dikkat gerekli.

5. **istanbul ignore next**: Catch block'larındaki unreachable kodlarda `/* istanbul ignore next */` + gerekçe yorumu zorunlu.

### Git Son 5 Commit

```
263a149 fix(review): story 1.4 round 2 — WeakMap cache, branch coverage %100, method filter optimization
ac2b662 fix(review): story 1.4 code review fixes — shared test-utils, hash/root edge cases, url-matcher improvements
7602921 feat(core): story 1.4 — UrlMatcher & PatternCompiler implementasyonu
802c967 docs: story 1.3 status updated to done
ea9c29f fix(review): story 1.3 code review fixes - trailing slash bug, import merge, doc corrections
```

### Test Helper Pattern (Önerilen)

```typescript
// packages/core/src/rule-engine/test-utils.ts (opsiyonel shared dosya)

import type { MockRule, MockRequest } from '../types/rule.types';
import type { HarHeader } from '../types/har.types';

export function createMockRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'test-rule-1',
    urlPattern: '/api/test',
    method: 'GET',
    statusCode: 200,
    responseBody: '{"ok":true}',
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 0,
    enabled: true,
    ...overrides,
  };
}

export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    url: '/api/test',
    method: 'GET',
    ...overrides,
  };
}
```

### Project Structure Notes

- Tüm yeni dosyalar `packages/core/src/` altında — mimari sınırlara uygun
- `priority-chain/` ve `rule-engine/` klasörleri zaten mevcut (placeholder index.ts ile)
- `errors/` klasörü mevcut — 4 yeni error dosyası ekleniyor
- `types/` klasörüne `rule.types.ts` ekleniyor
- Barrel export zinciri: `module/index.ts` → `types/index.ts` → `src/index.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Pattern] — Error class hierarchy tanımı
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Package Module Strategy] — Unbundled TS, barrel export
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam Proje Dizin Yapisi] — Dosya yerleşim planı
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — Error propagation kuralları
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — Acceptance criteria ve gereksinimler
- [Source: _bmad-output/planning-artifacts/prd.md#FR16-FR19] — Rule-Based Mock gereksinimleri
- [Source: _bmad-output/planning-artifacts/prd.md#NFR7] — Deterministik priority chain
- [Source: _bmad-output/planning-artifacts/prd.md#NFR13] — Structured error messages
- [Source: _bmad-output/implementation-artifacts/1-4-url-matcher-pattern-compiler.md] — Önceki story pattern'ları ve learnings
- [Source: packages/core/src/errors/har-parse.error.ts] — Error class implementasyon pattern'ı
- [Source: packages/core/src/url-matcher/url-matcher.ts] — URL normalizasyon ve matching pattern'ları
- [Source: packages/core/src/types/har.types.ts] — HarEntry, HarHeader type tanımları
- [Source: packages/core/src/types/url-pattern.types.ts] — UrlPattern, MatchResult type tanımları

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

- PriorityChain test fix: `createUrlPattern` helper fonksiyonu object-spread API'den `(template, method, original)` parametrik API'ye dönüştürüldü — `matchUrl` regex-based matching için doğru segments gerekiyordu

### Completion Notes List

- **Task 1**: `rule.types.ts` oluşturuldu — `MockRule`, `MockResponse`, `MockRequest`, `ResolveSource`, `ResolveResult` tipleri tüm property'leri `readonly` olarak tanımlandı. `types/index.ts` ve `src/index.ts` barrel export güncellendi.
- **Task 2**: 4 yeni error class (`UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError`) `HarParseError` pattern'ı birebir takip edilerek oluşturuldu. `errors/index.ts` ve `src/index.ts` güncellendi.
- **Task 3**: `evaluate()` fonksiyonu — enabled filtre, case-insensitive method, exact/wildcard URL pattern matching, try/catch ile sessiz passthrough. `extractPathname` ve `normalizePath` helper'ları url-matcher ile aynı logic.
- **Task 4**: `resolve()` fonksiyonu — Rules → HAR → Passthrough priority chain. `harEntryToMockResponse` ve `findHarEntry` helper fonksiyonları. Defensive copy for headers.
- **Task 5**: 40 error hierarchy test — 5 class × 7 test (instanceof HarMockError, instanceof Error, type, rootCause, suggestedAction, name, message format) + unique type + non-empty field tests.
- **Task 6**: 18 RuleEngine test — exact match, wildcard, method match/mismatch, case-insensitive, disabled rules, first-match priority, no match, empty rules, field mapping, delay, full URL, trailing slash.
- **Task 7**: 10 PriorityChain test — AC#1 rule+HAR, AC#2 HAR-only, AC#3 passthrough, NFR7 deterministic (10x), multiple rules, disabled→HAR fallback, entry→response conversion, empty inputs, no entry match.
- **Task 8**: Barrel export final, `yarn test:all` 219 test pass, `yarn lint:all` 0 error, `yarn format:check` pass, `yarn build:core` başarılı.

### Change Log

- **2026-02-25**: Story 1.5 implementasyonu tamamlandı — PriorityChain, RuleEngine, Error Class Hierarchy. 8 task, 219 test (tümü pass), %100 coverage.

### File List

**Yeni dosyalar:**
- `packages/core/src/types/rule.types.ts`
- `packages/core/src/errors/url-match.error.ts`
- `packages/core/src/errors/rule-validation.error.ts`
- `packages/core/src/errors/storage.error.ts`
- `packages/core/src/errors/messaging.error.ts`
- `packages/core/src/errors/error-hierarchy.spec.ts`
- `packages/core/src/rule-engine/rule-engine.ts`
- `packages/core/src/rule-engine/rule-engine.spec.ts`
- `packages/core/src/rule-engine/test-utils.ts`
- `packages/core/src/priority-chain/priority-chain.ts`
- `packages/core/src/priority-chain/priority-chain.spec.ts`

**Güncellenen dosyalar:**
- `packages/core/src/types/index.ts` — yeni type re-export'lar
- `packages/core/src/errors/index.ts` — 4 yeni error class export
- `packages/core/src/rule-engine/index.ts` — placeholder → `evaluate` export
- `packages/core/src/priority-chain/index.ts` — placeholder → `resolve` export
- `packages/core/src/index.ts` — barrel export: yeni types, errors, evaluate, resolve
