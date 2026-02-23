# Story 1.4: URL Matcher & Pattern Compiler

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want `@har-mock/core` içinde `UrlMatcher` ve `PatternCompiler` modüllerini,
so that gelen request URL'leri auto-parameterization'dan üretilen `UrlPattern[]`'larla eşleştirilsin; en uzun static prefix öncelikli olarak doğru pattern seçilsin; eşleşme yoksa `null` dönülsün.

## Acceptance Criteria

1. **Given** pattern `{ template: '/api/users/{param}/orders', method: 'GET' }` ve gelen request `GET /api/users/999/orders` **When** `matchUrl(requestUrl, requestMethod, patterns)` çağrıldığında **Then** doğru pattern döndürülmeli; `MatchResult.pattern` eşleşen `UrlPattern` olmalı (FR8)

2. **Given** iki pattern: `/api/users/{param}` (1 static segment) ve `/api/users/profile` (2 static segment) **When** `GET /api/users/profile` geldiğinde **Then** static segment sayısı daha yüksek olan `/api/users/profile` öncelikli seçilmeli (NFR5)

3. **Given** hiçbir pattern ile eşleşmeyen bir URL **When** `matchUrl()` çağrıldığında **Then** `null` dönmeli; exception fırlatılmamalı

4. **Given** `compilePattern(urlPattern)` çağrısı **When** `UrlPattern` nesnesi verildiğinde **Then** dynamic segmentler (`{param}`) `[^/]+` regex grubuna dönüştürülmeli; `CompiledPattern.method` alanı URL pattern'ının method'unu içermeli (method-aware)

5. **Given** `url-matcher.spec.ts` **When** test suite çalıştırıldığında **Then** exact match, dynamic segment match, priority tiebreak, method mismatch, nullable segment, no match senaryolarının tamamı kapsanmış olmalı

## Tasks / Subtasks

- [x] Task 1: MatchResult & CompiledPattern Tip Tanımları (AC: #1, #4)
  - [x] Subtask 1.1: `packages/core/src/types/url-pattern.types.ts` güncelle — mevcut dosyaya `MatchResult` interface ekle: `{ readonly pattern: UrlPattern }`. Tüm property'ler `readonly`.
  - [x] Subtask 1.2: `packages/core/src/url-matcher/pattern-compiler.ts` içinde `CompiledPattern` interface tanımla (modül-internal veya export) — `{ readonly regex: RegExp; readonly method: string; readonly pattern: UrlPattern; readonly staticSegmentCount: number }`. Bu type url-matcher modülüne özgü; gerekirse `url-matcher/index.ts`'ten export edilir.
  - [x] Subtask 1.3: `packages/core/src/types/index.ts` güncelle — `MatchResult`'u re-export et
  - [x] Subtask 1.4: `packages/core/src/index.ts` barrel export güncelle — `MatchResult` tipi erişilebilir olduğunu doğrula (types re-export zinciri üzerinden otomatik gelmeli)

- [x] Task 2: PatternCompiler İmplementasyonu (AC: #4)
  - [x] Subtask 2.1: `packages/core/src/url-matcher/pattern-compiler.ts` oluştur — `compilePattern(urlPattern: UrlPattern): CompiledPattern` fonksiyonu
  - [x] Subtask 2.2: Template'i `/` ile split et; boş string segment'leri filtrele (leading `/` ve trailing `/` nedeniyle)
  - [x] Subtask 2.3: Her segment için: `{param}` ise `[^/]+` regex grubu; static segment ise `escapeRegex(segment)` (nokta, parantez vb. özel karakterleri escape et)
  - [x] Subtask 2.4: Tam path regex oluştur: `^` + `/` + segment'ler `/` ile birleştir + `$` (tam eşleşme; trailing slash varyasyonu için `\/?` eklemeyi değerlendir)
  - [x] Subtask 2.5: `staticSegmentCount` hesapla — `{param}` olmayan segment sayısı (priority scoring için)
  - [x] Subtask 2.6: `CompiledPattern` objesi döndür: `{ regex, method: urlPattern.method, pattern: urlPattern, staticSegmentCount }`
  - [x] Subtask 2.7: Helper `escapeRegexSegment(segment: string): string` fonksiyonu tanımla — `[.+*?^${}()|[\]\\]` karakterlerini escape et

- [x] Task 3: UrlMatcher İmplementasyonu (AC: #1, #2, #3, #5)
  - [x] Subtask 3.1: `packages/core/src/url-matcher/url-matcher.ts` oluştur — `matchUrl(requestUrl: string, requestMethod: string, patterns: readonly UrlPattern[]): MatchResult | null` fonksiyonu
  - [x] Subtask 3.2: URL'den pathname çıkar — `try { new URL(requestUrl).pathname } catch { requestUrl }` (full URL veya path-only input'ları her ikisini de handle et). Trailing `/` normalize et (`pathname.replace(/\/$/, '') || '/'`)
  - [x] Subtask 3.3: Tüm pattern'ları compile et: `patterns.map(p => compilePattern(p))`
  - [x] Subtask 3.4: Method filtrele: `compiled.method.toUpperCase() === requestMethod.toUpperCase()` (case-insensitive)
  - [x] Subtask 3.5: Static segment count'a göre DESC sırala: `sort((a, b) => b.staticSegmentCount - a.staticSegmentCount)` (en spesifik pattern önce)
  - [x] Subtask 3.6: Sıralı compiled pattern'ları test et: `compiled.regex.test(pathname)` — ilk eşleşeni döndür
  - [x] Subtask 3.7: Eşleşme bulunursa `{ pattern: compiled.pattern }` döndür; bulunamazsa `null` döndür
  - [x] Subtask 3.8: Tüm fonksiyon try/catch ile sarılmalı — exception fırlatılmamalı; hata durumunda `null` dön (AC #3)

- [x] Task 4: PatternCompiler Testleri (AC: #4)
  - [x] Subtask 4.1: `packages/core/src/url-matcher/pattern-compiler.spec.ts` oluştur
  - [x] Subtask 4.2: Test: Dynamic segment `{param}` → `[^/]+` regex — `GET /api/users/{param}/orders` → regex `/api/users/[^/]+/orders` ile match
  - [x] Subtask 4.3: Test: Static-only template — `/api/health` → tam literal regex; `[^/]+` içermemeli
  - [x] Subtask 4.4: Test: Mixed template — `/api/users/{param}/orders/{param}` → iki `[^/]+` grubu içermeli
  - [x] Subtask 4.5: Test: Method stored — `UrlPattern.method: 'POST'` → `CompiledPattern.method: 'POST'`
  - [x] Subtask 4.6: Test: `staticSegmentCount` doğruluğu — `/api/users/{param}/orders` → 2 static segment (`api`, `users`, `orders` — hayır, `orders` 3. segment, `{param}` dynamic. Doğru: `api=1, users=2, orders=3, {param}=dynamic` → staticSegmentCount: 3)
  - [x] Subtask 4.7: Test: Sadece dynamic — `/{param}` → staticSegmentCount: 0
  - [x] Subtask 4.8: Test: Special chars — `/api/v2.0/users` → `.` escape edilmeli; farklı `.` içeren URL'lerle yanlış match yapmamalı
  - [x] Subtask 4.9: Test: Tam regex match — `^` prefix ve `$` suffix — partial match kabul edilmemeli (`/api/users` ile `/api/users/profile` match etmemeli)

- [x] Task 5: UrlMatcher Testleri (AC: #5)
  - [x] Subtask 5.1: `packages/core/src/url-matcher/url-matcher.spec.ts` oluştur
  - [x] Subtask 5.2: Test: Exact match — `/api/users/999/orders`, `GET`, `[{ template: '/api/users/{param}/orders', method: 'GET' }]` → `MatchResult.pattern` beklenen pattern olmalı (AC #1)
  - [x] Subtask 5.3: Test: Dynamic segment match — birden fazla farklı ID ile (123, 999, `550e8400-e29b-41d4-a716-446655440000`) aynı pattern match etmeli
  - [x] Subtask 5.4: Test: Priority tiebreak — `/api/users/profile`, `GET`, `[{ template: '/api/users/{param}', method: 'GET' }, { template: '/api/users/profile', method: 'GET' }]` → `/api/users/profile` (2 static) `/api/users/{param}`'den (1 static) önce seçilmeli (AC #2)
  - [x] Subtask 5.5: Test: Method mismatch — `POST` request + `GET` pattern → `null` dönmeli
  - [x] Subtask 5.6: Test: Method case-insensitive — `get` (lowercase) + `GET` pattern → eşleşmeli
  - [x] Subtask 5.7: Test: Nullable segment — `/api/items/null/details`, `GET`, `[{ template: '/api/items/{param}/details', method: 'GET' }]` → match etmeli (nullable segment `[^/]+` ile eşleşir)
  - [x] Subtask 5.8: Test: No match — eşleşmeyen URL → `null` dönmeli; exception fırlatılmamalı (AC #3)
  - [x] Subtask 5.9: Test: Full URL input — `https://api.example.com/api/users/123/orders` → pathname `/api/users/123/orders` çıkarılarak match yapılmalı
  - [x] Subtask 5.10: Test: Path-only input — `/api/users/123/orders` → doğrudan match yapılmalı
  - [x] Subtask 5.11: Test: Empty patterns array — `matchUrl(url, method, [])` → `null` dönmeli; hata yok
  - [x] Subtask 5.12: Test: Multiple matching patterns → highest staticSegmentCount'a sahip olan seçilmeli
  - [x] Subtask 5.13: Test: Trailing slash tolerance — `/api/users/123/` ve `/api/users/123` aynı pattern'ı eşleştirmeli (trailing slash normalize edilmeli)

- [x] Task 6: Module Export & Final Doğrulama (AC: tümü)
  - [x] Subtask 6.1: `packages/core/src/url-matcher/index.ts` güncelle — `matchUrl`, `compilePattern` fonksiyonlarını re-export et; `CompiledPattern` type'ını re-export et
  - [x] Subtask 6.2: `packages/core/src/index.ts` barrel export güncelle — url-matcher modülünü ekle (`matchUrl`, `compilePattern`, `CompiledPattern`, `MatchResult`)
  - [x] Subtask 6.3: `yarn test:all` çalıştır — tüm testler geçer (eski + yeni), coverage %80+
  - [x] Subtask 6.4: `yarn lint:all` çalıştır — 0 hata, 0 uyarı
  - [x] Subtask 6.5: `yarn format:check` çalıştır — tüm dosyalar Prettier formatına uygun
  - [x] Subtask 6.6: `yarn build:core` çalıştır — TypeScript derleme başarılı

## Dev Notes

### Kritik Mimari Kısıtlamalar

- **`packages/core`**: Angular ve Chrome API'ye **sıfır bağımlılık**. Saf TypeScript kütüphanesi. Hiçbir `@angular/*` veya `chrome.*` import'u yapılmaz.
- **`any` tipi YASAK**: ESLint `@typescript-eslint/no-explicit-any: error` ile zorlanır. `unknown` + type guard kullanılır.
- **Barrel export**: Tüm import'lar `@har-mock/core` barrel'dan yapılır. Implementation dosyalarına doğrudan import **yasak** (test dosyaları hariç — aynı modül içi test dosyaları doğrudan import edebilir).
- **Circular import yasak**: Core hiçbir zaman extension veya angular-plugin'i import etmez.
- **Dosya isimlendirme**: `kebab-case.ts` — ör: `url-matcher.ts`, `pattern-compiler.ts`
- **Test dosyaları**: Colocated `*.spec.ts` — implementation dosyasının yanında
- **`noUncheckedIndexedAccess: true` AKTIF**: Array index erişimlerinde `undefined` kontrolü veya non-null assertion (`!`) gerekli
- **`explicit-function-return-type: warn`**: Tüm public fonksiyonlara return type yazılmalı
- **`readonly` property'ler**: Tüm interface/type property'leri `readonly` olmalı

### URL Matcher Algoritması (Kritik Detaylar)

#### PatternCompiler: Template → Regex Dönüşümü

```typescript
// Örnek: '/api/users/{param}/orders' → /^\/api\/users\/[^/]+\/orders\/?$/

// Adım adım:
// 1. Template split: '/api/users/{param}/orders'.split('/').filter(s => s !== '')
//    → ['api', 'users', '{param}', 'orders']
//
// 2. Her segment dönüşümü:
//    'api'     → 'api'        (static: olduğu gibi, escape edilmiş)
//    'users'   → 'users'      (static)
//    '{param}' → '[^/]+'      (dynamic: herhangi bir non-slash karakter)
//    'orders'  → 'orders'     (static)
//
// 3. Regex birleştirme:
//    '^\\/' + segments.join('\\/') + '\\/?$'
//    → /^\/api\/users\/[^/]+\/orders\/?$/

// staticSegmentCount = 3 (api, users, orders — {param} sayılmaz)
```

#### UrlMatcher: Öncelik Skoru (Priority Tiebreak)

```
Priority Kuralı: En yüksek staticSegmentCount → en spesifik pattern → önce test edilir

Örnek: GET /api/users/profile
  Pattern A: /api/users/{param}      → staticSegmentCount: 2 (api, users)
  Pattern B: /api/users/profile      → staticSegmentCount: 3 (api, users, profile)

  Sıralama: B (3) > A (2)
  Test: B önce test edilir → /api/users/profile regex'i /api/users/profile'e uygular → MATCH
  Sonuç: Pattern B döner (doğru!)

Eğer A önce test edilseydi: /api/users/[^/]+ → /api/users/profile → MATCH (YANLIŞ!)
```

#### URL Normalizasyonu

```typescript
// Full URL → Pathname çıkarma
function extractPathname(requestUrl: string): string {
  try {
    return new URL(requestUrl).pathname;
  } catch {
    // Path-only input (örn: '/api/users/123')
    return requestUrl.split('?')[0]!.split('#')[0]!;
  }
}

// Trailing slash normalizasyonu
// '/api/users/123/' → '/api/users/123'
// '/' → '/'  (root path korunur)
const normalized = pathname.endsWith('/') && pathname.length > 1
  ? pathname.slice(0, -1)
  : pathname;
```

### Tip Tanımları (Bu Story Sonrası)

```typescript
// packages/core/src/types/url-pattern.types.ts — MEVCUT + EK

// Mevcut (değiştirilmez):
type ParamType = 'uuid' | 'numeric' | 'hex' | 'base64' | 'nullable';
type StaticSegment = { readonly kind: 'static'; readonly value: string };
type DynamicSegment = { readonly kind: 'dynamic'; readonly paramType: ParamType };
type PatternSegment = StaticSegment | DynamicSegment;
interface UrlPattern {
  readonly original: string;
  readonly template: string;
  readonly segments: readonly PatternSegment[];
  readonly method: string; // Story 1.2 code review: string (HttpMethod değil)
}

// YENİ (bu story'de eklenir):
interface MatchResult {
  readonly pattern: UrlPattern;
}
```

```typescript
// packages/core/src/url-matcher/pattern-compiler.ts — CompiledPattern

// NOT: Bu type url-matcher modülüne özel.
// matchUrl() içinde dahili olarak kullanılır ve export edilir.
interface CompiledPattern {
  readonly regex: RegExp;
  readonly method: string;        // method-aware filtering için
  readonly pattern: UrlPattern;   // orijinal pattern (MatchResult için)
  readonly staticSegmentCount: number; // priority scoring için
}
```

### Regex Escape Gereksinimi

URL path segment'lerinde özel regex karakterleri nadir ama mümkündür:
- `/api/v2.0/users` → `.` escape edilmeli → `/api/v2\.0/users`
- `/api/users(active)` → `(`, `)` escape edilmeli
- Standard `escapeRegExp` helper gerekli:

```typescript
function escapeRegexSegment(segment: string): string {
  return segment.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
}

// ⚠️ UYARI: {param} segmentleri escape edilMEZ — önce dynamic check yapılır
// Sadece static segment'ler escape edilir
```

### Mimari Uyarı: `{param}` Pattern'ı

Story 1.3'ten gelen `UrlPattern.template` formatı: `{param}` (template string placeholder).
Bu story regex'e çevirirken `{param}` → `[^/]+` dönüşümünü yapmalıdır.

```typescript
// Segment kontrolü:
const isDynamic = (segment: string): boolean => segment === '{param}';

// NOT: segments array'i kullanmak daha güvenli.
// Template string parse etmek yerine UrlPattern.segments array'inden üretmek önerilir:
const regexParts = urlPattern.segments.map(seg =>
  seg.kind === 'dynamic' ? '[^/]+' : escapeRegexSegment(seg.value)
);
```

### `[^/]+` Regex Seçimi Gerekçesi

- `[^/]+` — slash dışında herhangi bir karakter (1+): UUID, numeric, hex, base64, nullable segmentleri kapsar
- Neden `(.+)` değil: Slash karakterini de eşleştirirdi → cross-path match riski
- Neden `([^/]*)` değil (0+): Boş segment match'i önlemek için `+` kullanılır; boş path segment URL normalizasyonunda zaten handle edilir

### UrlPattern.method: string (Önemli Not)

Story 1.2 code review'ından: `HarEntry.method` → `string` (non-standard HTTP method desteği: PROPFIND, CONNECT vb.).
`UrlPattern.method` da tutarlılık için `string`. Bu story'de:
- `CompiledPattern.method: string`
- Method karşılaştırması case-insensitive: `a.toUpperCase() === b.toUpperCase()`

### Önceki Story'den Öğrenimler (Story 1.3: Auto-Parameterization Engine)

**TypeScript & Build:**
- TypeScript ~5.5.0 — Angular 18 uyumluluğu (daha yeni TS sürümleri kullanılmamalı)
- `noUncheckedIndexedAccess: true` AKTIF — array index erişimlerinde `undefined` kontrolü veya `!` gerekli
- Build: `yarn build:core` → `tsc --project tsconfig.json` → `dist/` klasörüne output
- Coverage threshold: %80 (branches, functions, lines, statements)

**ESLint & Prettier:**
- ESLint v8.56.0, `@typescript-eslint/recommended-type-checked` aktif
- Prettier: 2-space indent, single quotes, trailing comma 'all'
- `@typescript-eslint/no-explicit-any: error` — `any` yasak
- `explicit-function-return-type: warn` — public fonksiyonlara return type zorunlu

**Jest:**
- `ts-jest` preset, `moduleNameMapper` ile `@har-mock/core` çözümleme
- Test verisi: inline fixture objeleri
- Colocated `*.spec.ts` test dosyaları

**Code Review Öğrenimleri (Story 1.3):**
- `yarn format:check` MUTLAKA çalıştırılmalı — trailing slash bug gibi edge case testleri eklenilmeli
- `File List` bölümü TÜM değiştirilen dosyaları içermeli (sprint-status.yaml dahil)
- Gereksiz optional chaining eklenmemeli — validator'ın garanti ettiği alanlar için `?.` gereksiz
- `istanbul ignore next` dead code dallarında gerekçe yorumla kullanılabilir
- Branch coverage %80+ — edge case testleri ile kapsanmalı
- **Trailing slash bug önlemi**: URL normalizasyonu hem template hem de request URL için uygulanmalı

**Story 1.3'te Oluşturulan `UrlPattern` Tipi:**
```typescript
interface UrlPattern {
  readonly original: string;    // Tam URL (display only)
  readonly template: string;    // '/api/users/{param}/orders'
  readonly segments: readonly PatternSegment[];
  readonly method: string;      // 'GET', 'POST', etc.
}
```
Bu story, Story 1.3'ün ürettiği `UrlPattern[]` array'ini input olarak alır (1:1 entry-pattern mapping — dedup bu story'de yapılabilir veya UrlMatcher'a bırakılabilir).

### Git Intelligence (Son Commitler)

- `802c967`: docs: story 1.3 status updated to done
- `ea9c29f`: fix(review): story 1.3 code review fixes — trailing slash bug, import merge, doc corrections
- `86d4c8f`: story 1.3 dev start

**Trailing Slash Bug (Story 1.3 Review'dan)**: `splitPathSegments` fonksiyonu trailing slash nedeniyle yanlış boş segment üretiyordu. Bu story'de URL normalizasyonu hem request URL hem de compiled regex'te dikkatlice handle edilmeli. Recommended: regex'e `\/?$` ekle veya pathname normalize et.

**Dosya Pattern'ları (Önceki Story'lerden):**
- `kebab-case.ts` — tüm TypeScript dosyaları
- `*.spec.ts` — colocated test dosyaları
- `*.types.ts` — type/interface dosyaları
- Barrel: her modül `index.ts` re-export, core `index.ts` hepsini re-export

### Anti-Pattern Uyarıları

```typescript
// ❌ YANLIŞ: any kullanımı
function matchUrl(url: any, method: any, patterns: any[]): any { ... }

// ✅ DOĞRU: strict typing
function matchUrl(
  requestUrl: string,
  requestMethod: string,
  patterns: readonly UrlPattern[],
): MatchResult | null { ... }

// ❌ YANLIŞ: Template string ile regex oluşturma (injection riski)
const regex = new RegExp(template.replace(/{param}/g, '[^/]+'));
// (özel karakter escape eksik)

// ✅ DOĞRU: Segment-by-segment regex oluşturma
const regexParts = urlPattern.segments.map(seg =>
  seg.kind === 'dynamic' ? '[^/]+' : escapeRegexSegment(seg.value),
);
const regex = new RegExp(`^\\/${regexParts.join('\\/')}\\/?$`);

// ❌ YANLIŞ: Priority olmadan sıralı test (false positive riski)
const match = compiledPatterns.find(p => p.regex.test(pathname));

// ✅ DOĞRU: staticSegmentCount'a göre önce sırala
const sorted = [...compiledPatterns].sort((a, b) => b.staticSegmentCount - a.staticSegmentCount);
const match = sorted.find(p =>
  p.method.toUpperCase() === requestMethod.toUpperCase() && p.regex.test(pathname),
);

// ❌ YANLIŞ: Array index'e direkt erişim (noUncheckedIndexedAccess hatası)
const first = sorted[0];  // Type: CompiledPattern | undefined (!)

// ✅ DOĞRU: find() kullan veya undefined check yap
const match = sorted.find(p => ...);  // Type: CompiledPattern | undefined — zaten safe
```

### Test Veri Stratejisi

UrlPattern fixture oluştururken:

```typescript
// url-matcher testlerinde kullanılacak minimal UrlPattern fixture helper'ı
function createPattern(template: string, method: string = 'GET'): UrlPattern {
  // Template'i parse ederek segments oluştur (ya da auto-parameterizer'dan öğrenilenler kullanılarak)
  const segments: PatternSegment[] = template
    .split('/')
    .filter(s => s !== '')
    .map(s =>
      s === '{param}'
        ? { kind: 'dynamic', paramType: 'uuid' as ParamType }
        : { kind: 'static', value: s },
    );
  return {
    original: `https://example.com${template}`,
    template,
    segments,
    method,
  };
}
```

### Dosya Yapısı (Bu Story Sonrası)

```
packages/core/src/
├── index.ts                             # GÜNCELLE: url-matcher export ekle
├── types/
│   ├── har.types.ts                     # Mevcut — değişiklik yok
│   ├── url-pattern.types.ts             # GÜNCELLE: MatchResult interface ekle
│   └── index.ts                         # GÜNCELLE: MatchResult re-export
├── errors/                              # Mevcut — bu story'de değişiklik yok
├── har-parser/                          # Mevcut — bu story'de değişiklik yok
├── auto-parameterizer/                  # Mevcut — bu story'de değişiklik yok
├── url-matcher/
│   ├── pattern-compiler.ts              # YENİ: compilePattern(UrlPattern): CompiledPattern
│   ├── url-matcher.ts                   # YENİ: matchUrl(url, method, patterns): MatchResult | null
│   ├── pattern-compiler.spec.ts         # YENİ: Pattern compiler testleri
│   ├── url-matcher.spec.ts              # YENİ: URL matcher testleri
│   └── index.ts                         # GÜNCELLE: matchUrl, compilePattern, CompiledPattern re-export
├── priority-chain/
│   └── index.ts                         # Mevcut — placeholder (Story 1.5)
└── rule-engine/
    └── index.ts                         # Mevcut — placeholder (Story 1.5)
```

### Project Structure Notes

- Architecture dizin yapısıyla tam uyumlu: `url-matcher/url-matcher.ts`, `url-matcher/pattern-compiler.ts`
- Story 1.1'de oluşturulan boş placeholder `url-matcher/index.ts` bu story'de içerikle doldurulacak
- `MatchResult` tipi Story 1.5 (Priority Chain) tarafından kullanılacak — public API'nin parçası
- `CompiledPattern` tipi UrlMatcher/PatternCompiler'ın internal type'ı; export edilmesi önerilir ama Priority Chain direkt kullanmayacak
- Architecture doc `url-matcher.ts: matchUrl(url, pattern): RuleMatch | null` diyor — ancak Story 1.4 AC'ı `MatchResult` tipini belirtir. `MatchResult` bu story'de oluşturulur; Story 1.5'te `RuleMatch` (rule.types.ts içinde) ayrıca tanımlanacak

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Auto-Parameterization Algorithm] — Pattern matching score: static segment count
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam Proje Dizin Yapisi] — url-matcher/ dizin yapısı ve dosya isimleri
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — kebab-case dosya isimlendirme
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — readonly property'ler, any yasağı, barrel export
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — anti-pattern örnekleri
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] — UrlPattern interface (segments, method: string notu)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Acceptance criteria, BDD senaryoları, FR8, NFR5
- [Source: _bmad-output/planning-artifacts/prd.md#Auto-Parameterization & URL Matching] — FR8 (URL pattern matching), FR9 (nullable segment support), NFR5 (%100 doğruluk)
- [Source: _bmad-output/implementation-artifacts/1-3-auto-parameterization-engine.md#Dev Notes] — TypeScript ~5.5.0, ESLint v8.56.0, noUncheckedIndexedAccess, coverage %80, trailing slash bug
- [Source: _bmad-output/implementation-artifacts/1-3-auto-parameterization-engine.md#URL Pattern Tip Tanımları] — UrlPattern.method: string (HttpMethod değil), segments readonly array

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Herhangi bir debug log oluşturulmadı — implementasyon ilk denemede başarıyla tamamlandı.

### Completion Notes List

- **Task 1**: `MatchResult` interface `url-pattern.types.ts`'e eklendi (readonly pattern: UrlPattern). `types/index.ts` ve `core/index.ts` barrel export zincirleri güncellendi.
- **Task 2**: `pattern-compiler.ts` oluşturuldu. `compilePattern()` fonksiyonu `UrlPattern.segments` array'ini kullanarak (template parse etmek yerine) segment-by-segment regex üretir. `escapeRegexSegment()` helper ile özel regex karakterleri escape edilir. Trailing slash toleransı için regex `/?$` ile bitirildi.
- **Task 3**: `url-matcher.ts` oluşturuldu. `matchUrl()` fonksiyonu: pathname extraction (full URL + path-only desteği), trailing slash normalizasyonu, staticSegmentCount'a göre DESC sıralama, method case-insensitive karşılaştırma. Dış try/catch ile exception koruması sağlandı.
- **Task 4**: `pattern-compiler.spec.ts` — 13 test, tümü geçti. Dynamic segment, static-only, mixed, method storage, staticSegmentCount, special char escaping, regex anchoring senaryoları kapsandı.
- **Task 5**: `url-matcher.spec.ts` — 22 test, tümü geçti. Exact match, dynamic segment, priority tiebreak, method mismatch, case-insensitive method, nullable segment, no match, full URL / path-only input, boş array, trailing slash toleransı senaryoları kapsandı.
- **Task 6**: Barrel export güncellendi. `yarn test:all` → 134 test geçti, %100 coverage. `yarn lint:all` → 0 hata/uyarı. `yarn format:check` → temiz. `yarn build:core` → TypeScript derleme başarılı.
- **Önemli Tasarım Kararı**: `compilePattern()` template string'i parse etmek yerine `UrlPattern.segments` array'ini kullanır — bu daha güvenli çünkü segmentler zaten auto-parameterizer tarafından sınıflandırılmış durumda.

### File List

- `packages/core/src/types/url-pattern.types.ts` (güncellendi — MatchResult interface eklendi)
- `packages/core/src/types/index.ts` (güncellendi — MatchResult re-export)
- `packages/core/src/index.ts` (güncellendi — MatchResult, matchUrl, compilePattern, CompiledPattern export)
- `packages/core/src/url-matcher/index.ts` (güncellendi — matchUrl, compilePattern, CompiledPattern re-export)
- `packages/core/src/url-matcher/pattern-compiler.ts` (yeni — CompiledPattern interface, compilePattern fonksiyonu)
- `packages/core/src/url-matcher/url-matcher.ts` (yeni — matchUrl fonksiyonu)
- `packages/core/src/url-matcher/pattern-compiler.spec.ts` (yeni — 13 test)
- `packages/core/src/url-matcher/url-matcher.spec.ts` (yeni — 22 test)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (güncellendi — in-progress → review)
- `_bmad-output/implementation-artifacts/1-4-url-matcher-pattern-compiler.md` (güncellendi — bu dosya)

## Change Log

- 2026-02-23: Story 1.4 implementasyonu tamamlandı. UrlMatcher & PatternCompiler modülleri oluşturuldu. 35 yeni test eklendi (pattern-compiler: 13, url-matcher: 22). Tüm AC'lar karşılandı. Coverage %100.
