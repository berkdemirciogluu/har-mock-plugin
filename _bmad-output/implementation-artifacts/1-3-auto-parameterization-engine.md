# Story 1.3: Auto-Parameterization Engine

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want `@har-mock/core` içinde `AutoParameterizer` ve `SegmentClassifier` modüllerini tam test coverage'ıyla,
so that HAR'dan çıkarılan URL'lerdeki UUID, numeric ID, hex token, JWT/Base64 ve null/undefined segmentleri otomatik tespit edilip `UrlPattern[]` yapısına dönüştürülsün; developer hiçbir URL pattern'ı elle tanımlamasın.

## Acceptance Criteria

1. **Given** `/api/users/550e8400-e29b-41d4-a716-446655440000/orders` içeren bir HAR entry URL'i **When** `AutoParameterizer.parameterize([entry])` çağrıldığında **Then** `UrlPattern.template` değeri `/api/users/{param}/orders` olmalı; segment `{ kind: 'dynamic', paramType: 'uuid' }` olarak sınıflandırılmış olmalı (FR5)

2. **Given** `/api/products/42/reviews` içeren bir URL **When** parameterize edildiğinde **Then** `template` `/api/products/{param}/reviews` olmalı; segment `paramType: 'numeric'` olmalı (FR6)

3. **Given** `/api/auth/a1b2c3d4e5f67890abcd1234` (hex token) veya `/api/session/eyJhbGciOiJIUzI1NiJ9` (JWT) içeren URL **When** parameterize edildiğinde **Then** sırasıyla `paramType: 'hex'` ve `paramType: 'base64'` olarak sınıflandırılmalı (FR7)

4. **Given** `/api/items/null/details` veya `/api/items//details` içeren URL (null/undefined/boş segment) **When** parameterize edildiğinde **Then** segment `paramType: 'nullable'` olarak kabul edilmeli; Two-Phase State Recovery Faz A aktif olmalı (FR9)

5. **Given** `/api/users/123` ve `/api/users/456` içeren iki HAR entry **When** ikisi de parameterize edildiğinde **Then** her ikisi de aynı `template: '/api/users/{param}'`'e dönüşmeli; `original` alanı orijinal URL'yi korumalı

6. **Given** `segment-classifier.spec.ts` **When** tüm segment tipleri test edildiğinde **Then** UUID, numeric, hex, base64, nullable ve static; her biri için en az 3 farklı örnek test edilmiş olmalı; false positive/negative sıfır olmalı (NFR5)

## Tasks / Subtasks

- [x] Task 1: URL Pattern Tip Tanımları (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 1.1: `packages/core/src/types/url-pattern.types.ts` oluştur — `UrlPattern`, `PatternSegment` (discriminated union: `StaticSegment | DynamicSegment`), `ParamType` (`'uuid' | 'numeric' | 'hex' | 'base64' | 'nullable'`) tipleri. Tüm property'ler `readonly`. Architecture doc'taki `UrlPattern` interface'ine uyumlu.
  - [x] Subtask 1.2: `packages/core/src/types/index.ts` güncelle — URL pattern tiplerini re-export et
  - [x] Subtask 1.3: `packages/core/src/index.ts` barrel export güncelle — yeni tiplerin erişilebilir olduğunu doğrula (types zaten re-export ediliyor, yeni tipler `types/index.ts` üzerinden otomatik gelecek)

- [x] Task 2: Segment Classifier İmplementasyonu (AC: #1, #2, #3, #4, #6)
  - [x] Subtask 2.1: `packages/core/src/auto-parameterizer/segment-classifier.ts` oluştur — `classifySegment(segment: string): PatternSegment` fonksiyonu
  - [x] Subtask 2.2: Regex pattern'ları `as const` sabit objesi olarak tanımla — Mimari dokümanındaki sıraya uygun:
    1. UUID: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
    2. Numeric ID: `/^\d+$/`
    3. Hex token: `/^[0-9a-f]{16,}$/i`
    4. JWT/Base64: `/^[A-Za-z0-9_-]{20,}$/`
    5. Nullable: `/^(null|undefined|)$/`
  - [x] Subtask 2.3: Sıralı regex testi uygula (en spesifikten en genele) — ilk eşleşen pattern kazanır; eşleşme yoksa `{ kind: 'static', value: segment }` dön
  - [x] Subtask 2.4: Return type: `PatternSegment` discriminated union — `{ kind: 'dynamic', paramType: ParamType }` veya `{ kind: 'static', value: string }`

- [x] Task 3: Auto-Parameterizer İmplementasyonu (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 3.1: `packages/core/src/auto-parameterizer/auto-parameterizer.ts` oluştur — `parameterize(entries: readonly HarEntry[]): UrlPattern[]` fonksiyonu
  - [x] Subtask 3.2: URL path parsing — `new URL(entry.url)` ile pathname çıkar; query params ve fragment'lar path'ten ayrıştırılır (template'e dahil edilmez)
  - [x] Subtask 3.3: Pathname'i `/` ile split et; boş string segment'leri filtrele (leading `/` nedeniyle)
  - [x] Subtask 3.4: Her segment için `classifySegment()` çağır ve `PatternSegment[]` array'i oluştur
  - [x] Subtask 3.5: Template string oluştur — static segment'ler olduğu gibi, dynamic segment'ler `{param}` olarak; leading `/` ile birleştir (ör: `/api/users/{param}/orders`)
  - [x] Subtask 3.6: `UrlPattern` objesi oluştur: `{ original: entry.url, template, segments, method: entry.method }`
  - [x] Subtask 3.7: Her HarEntry için bir UrlPattern döndür (1:1 mapping — dedup yapılmaz, bu URL Matcher'ın sorumluluğu)

- [x] Task 4: Segment Classifier Testleri (AC: #6)
  - [x] Subtask 4.1: `packages/core/src/auto-parameterizer/segment-classifier.spec.ts` oluştur
  - [x] Subtask 4.2: UUID testleri — en az 3 farklı UUID: standart lowercase, uppercase, mixed case. Her biri `{ kind: 'dynamic', paramType: 'uuid' }` döndürmeli
  - [x] Subtask 4.3: Numeric ID testleri — en az 3 farklı: tek haneli (`5`), çok haneli (`42`, `123456`). `{ kind: 'dynamic', paramType: 'numeric' }` döndürmeli
  - [x] Subtask 4.4: Hex token testleri — en az 3 farklı: 16 karakter, 24 karakter, 32+ karakter. `{ kind: 'dynamic', paramType: 'hex' }` döndürmeli
  - [x] Subtask 4.5: Base64/JWT testleri — en az 3 farklı: JWT header segment, uzun base64 string, URL-safe base64. `{ kind: 'dynamic', paramType: 'base64' }` döndürmeli
  - [x] Subtask 4.6: Nullable testleri — `'null'`, `'undefined'`, `''` (boş string). `{ kind: 'dynamic', paramType: 'nullable' }` döndürmeli
  - [x] Subtask 4.7: Static segment testleri — en az 3 farklı: `'api'`, `'users'`, `'v2'`. `{ kind: 'static', value: segment }` döndürmeli
  - [x] Subtask 4.8: Edge case / sınır testleri — hex-like ama kısa string (15 karakter → numeric değilse static), base64-like ama kısa string (19 karakter → static), sadece rakam ama çok uzun (UUID'e benzemeyen numeric), `0` (numeric olmalı)
  - [x] Subtask 4.9: False positive regresyon testleri — `'users'` hex olarak yanlışlıkla sınıflandırılmamalı (5 karakter < 16 minimum), `'profile'` base64 olarak sınıflandırılmamalı (7 karakter < 20 minimum), `'v2'` numeric olarak sınıflandırılmamalı (rakam ile başlamıyor)

- [x] Task 5: Auto-Parameterizer Testleri (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 5.1: `packages/core/src/auto-parameterizer/auto-parameterizer.spec.ts` oluştur
  - [x] Subtask 5.2: Test: UUID URL — `/api/users/550e8400-e29b-41d4-a716-446655440000/orders` → template `/api/users/{param}/orders`, segment `paramType: 'uuid'`
  - [x] Subtask 5.3: Test: Numeric ID URL — `/api/products/42/reviews` → template `/api/products/{param}/reviews`, segment `paramType: 'numeric'`
  - [x] Subtask 5.4: Test: Hex token URL — `/api/auth/a1b2c3d4e5f67890abcd1234` → template `/api/auth/{param}`, segment `paramType: 'hex'`
  - [x] Subtask 5.5: Test: JWT/Base64 URL — `/api/session/eyJhbGciOiJIUzI1NiJ9` → template `/api/session/{param}`, segment `paramType: 'base64'`
  - [x] Subtask 5.6: Test: Nullable segment — `/api/items/null/details` → template `/api/items/{param}/details`, `paramType: 'nullable'`; `/api/items//details` boş segment de `paramType: 'nullable'`
  - [x] Subtask 5.7: Test: Karma dynamic segments — `/api/users/550e8400-e29b-41d4-a716-446655440000/orders/42` → template `/api/users/{param}/orders/{param}`, iki dynamic segment (uuid + numeric)
  - [x] Subtask 5.8: Test: Aynı template üretimi — `/api/users/123` ve `/api/users/456` ikisi de → template `/api/users/{param}`; `original` alanları farklı orijinal URL'leri korumalı
  - [x] Subtask 5.9: Test: Boş entries array — `parameterize([])` → boş array `[]` döndürmeli
  - [x] Subtask 5.10: Test: URL query params ve fragment'lar — `https://api.example.com/users/123?page=1#section` → template yalnızca path: `/users/{param}` (query+fragment dahil değil)
  - [x] Subtask 5.11: Test: `original` alanı tam URL'yi korumalı — `https://api.example.com/users/123` → `original: 'https://api.example.com/users/123'`
  - [x] Subtask 5.12: Test: Method korunması — GET entry → UrlPattern.method `'GET'` olmalı; POST entry → `'POST'` olmalı
  - [x] Subtask 5.13: Test: Root path URL — `https://api.example.com/` → template `/`, tek static segment yok

- [x] Task 6: Module Export & Final Doğrulama (AC: tümü)
  - [x] Subtask 6.1: `packages/core/src/auto-parameterizer/index.ts` güncelle — `parameterize` ve `classifySegment` fonksiyonlarını re-export et
  - [x] Subtask 6.2: `packages/core/src/index.ts` barrel export güncelle — auto-parameterizer modülünü ekle
  - [x] Subtask 6.3: `yarn test:all` çalıştır — tüm testler geçer (eski + yeni), coverage %80+
  - [x] Subtask 6.4: `yarn lint:all` çalıştır — 0 hata, 0 uyarı
  - [x] Subtask 6.5: `yarn format:check` çalıştır — tüm dosyalar Prettier formatına uygun
  - [x] Subtask 6.6: `yarn build:core` çalıştır — TypeScript derleme başarılı

## Dev Notes

### Kritik Mimari Kısıtlamalar

- **`packages/core`**: Angular ve Chrome API'ye **sıfır bağımlılık**. Saf TypeScript kütüphanesi. Hiçbir `@angular/*` veya `chrome.*` import'u yapılmaz.
- **`any` tipi YASAK**: ESLint `@typescript-eslint/no-explicit-any: error` ile zorlanır. `unknown` + type guard kullanılır.
- **Barrel export**: Tüm import'lar `@har-mock/core` barrel'dan yapılır. Implementation dosyalarına doğrudan import **yasak** (test dosyaları hariç — test dosyaları kendi modülünü doğrudan import edebilir).
- **Circular import yasak**: Core hiçbir zaman extension veya angular-plugin'i import etmez.
- **Dosya isimlendirme**: `kebab-case.ts` — ör: `auto-parameterizer.ts`, `segment-classifier.ts`, `url-pattern.types.ts`
- **Test dosyaları**: Colocated `*.spec.ts` — implementation dosyasının yanında
- **Type/interface dosyaları**: `*.types.ts` pattern'ı — ör: `url-pattern.types.ts`
- **Readonly property'ler**: Tüm interface property'leri `readonly` olmalı
- **`as const`**: Sabit literal objeler (regex pattern'ları, enum-like değerler) `as const` ile tanımlanmalı
- **`explicit-function-return-type: warn`**: Tüm public fonksiyonlara return type yazılmalı

### Auto-Parameterization Algoritması (Architecture Kararı)

Mimari dokümanında tanımlanan deterministik regex-based segment classification algoritması:

Her URL path segment'i sırayla test edilir (en spesifikten en genele — ilk eşleşen kazanır):

| Sıra | Tip | Regex | Açıklama |
|------|-----|-------|----------|
| 1 | UUID | `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | Standart UUID v1-v5 |
| 2 | Numeric | `/^\d+$/` | Sayısal ID (0 dahil) |
| 3 | Hex | `/^[0-9a-f]{16,}$/i` | 16+ karakter hex token |
| 4 | Base64/JWT | `/^[A-Za-z0-9_-]{20,}$/` | 20+ karakter alfanumerik (URL-safe base64) |
| 5 | Nullable | `/^(null\|undefined\|)$/` | null, undefined veya boş string |
| 6 | Static | *(fallback)* | Yukarıdakilerin hiçbirine uymayan segment |

**UYARI: Regex sırası KRİTİK!** Sıra değiştirildiğinde false positive'ler oluşabilir:
- `123456789012345678` → hex (16+ hex karakter) — numeric'ten önce hex kontrolü yapılırsa numeric olarak sınıflandırılmaz; ancak numeric regex `/^\d+$/` sadece `[0-9]` arar, hex regex `/^[0-9a-f]{16,}$/i` da `[0-9a-f]` arar. Saf rakam hem numeric hem hex'e uyar ama numeric sırada **önce** geldiği için doğru olarak numeric olarak sınıflandırılır.
- `aBcDeF1234567890abcd` (20+ karakter, hex olmayan büyük harf) → base64, hex değil
- `v2` → static (2 karakter, numeric'e uymaz çünkü `v` öneki var)

### URL Pattern Tip Tanımları (Architecture Referansı)

```typescript
// Architecture dokümanından — url-pattern.types.ts'de implement edilecek

type ParamType = 'uuid' | 'numeric' | 'hex' | 'base64' | 'nullable';

type PatternSegment =
  | { readonly kind: 'static';  readonly value: string }
  | { readonly kind: 'dynamic'; readonly paramType: ParamType };

interface UrlPattern {
  readonly original: string;       // HAR'daki orijinal URL (tam URL, yalnızca display)
  readonly template: string;       // Parameterize: /api/users/{param}/orders (sadece path)
  readonly segments: readonly PatternSegment[];
  readonly method: string;         // HTTP method (string — HarEntry.method ile tutarlı)
}
```

**NOT: `UrlPattern.method` tipi `string`**: Architecture doc'ta `HttpMethod` type union olarak tanımlanmış, ancak Story 1.2 code review'ında `HarEntry.method` → `string` olarak değiştirildi (standart dışı HTTP method desteği: PROPFIND, CONNECT, vb.). `UrlPattern.method` de tutarlılık için `string` olarak tanımlanmalı — unsafe cast önlenir.

### URL Parameterization Davranışı

**Path-only template oluşturma:**
- `https://api.example.com/users/123?page=1#section` → template: `/users/{param}` (query params ve fragment dahil DEĞİL)
- `original` alanı tam URL'yi korur: `https://api.example.com/users/123?page=1#section`

**1:1 Entry-Pattern eşlemesi:**
- Her `HarEntry` için bir `UrlPattern` üretilir — deduplication yapılmaz
- Dedup, URL Matcher'ın (Story 1.4) sorumluluğundadır
- Bu, HAR replay senaryosunda entry ↔ pattern ilişkisini korur

**Boş segment handling (Two-Phase State Recovery Faz A):**
- `/api/items//details` → path split'te `''` (boş string) ortaya çıkar
- Boş string nullable regex'e uyar → `paramType: 'nullable'`
- Template: `/api/items/{param}/details`

**Root path handling:**
- `https://api.example.com/` → pathname `/` → segments boş → template `/`

### Önceki Story'den Öğrenimler (Story 1.2: HAR Parser & Validator)

**TypeScript & Build:**
- TypeScript ~5.5.0 — Angular 18 uyumluluğu (daha yeni TS sürümleri kullanılmamalı)
- `noUncheckedIndexedAccess: true` AKTIF — array index erişimlerinde `undefined` kontrolü veya non-null assertion (`!`) gerekli
- Build: `yarn build:core` → `tsc --project tsconfig.json` → `dist/` klasörüne output
- Coverage threshold: %80 (branches, functions, lines, statements)

**ESLint & Prettier:**
- ESLint v8.56.0, `@typescript-eslint/recommended-type-checked` aktif
- Prettier: 2-space indent, single quotes, trailing comma 'all'
- `@typescript-eslint/no-explicit-any: error` — `any` yasak
- `explicit-function-return-type: warn` — public fonksiyonlara return type zorunlu

**Jest:**
- `ts-jest` preset, `moduleNameMapper` ile `@har-mock/core` çözümleme
- Test verisi: inline fixture objeleri (ayrı fixture dosyası gereksiz)
- `HarEntry` tipi test verisi oluştururken Story 1.2'deki `VALID_HAR_MINIMAL` yapısına benzer şekilde

**Error Class Pattern:**
- `HarMockError` abstract base → `HarParseError` concrete
- Bu story'de yeni error class gerekmiyor — auto-parameterization hata fırlatmaz, geçersiz input parse aşamasında yakalanmış olur
- Eğer beklenmedik durum oluşursa (ör: invalid URL), `try/catch` ile `URL` constructor hatası handle edilmeli

**Code Review Öğrenimleri:**
- `yarn format:check` MUTLAKA çalıştırılmalı — 4-space vs 2-space indent hatası yaşandı
- `File List` bölümü TÜM değiştirilen dosyaları içermeli (sprint-status.yaml dahil)
- Gereksiz optional chaining eklenmemeli — validator'ın garanti ettiği alanlar için `?.` gereksiz
- `istanbul ignore next` dead code dallarında kullanılabilir — gerekçe yorumla açıklanmalı
- Branch coverage %80+ hedefi — edge case testleri ile kapsanmalı

### HarEntry Tipi (Story 1.2'den Mevcut)

Auto-parameterizer bu tipi input olarak kullanır:

```typescript
interface HarEntry {
  readonly url: string;           // Tam URL: https://api.example.com/users/123
  readonly method: string;        // HTTP method: 'GET', 'POST', etc.
  readonly status: number;
  readonly statusText: string;
  readonly responseBody: string;
  readonly responseHeaders: readonly HarHeader[];
  readonly requestHeaders: readonly HarHeader[];
  readonly timings: HarTimings;
}
```

Parameterizer yalnızca `url` ve `method` alanlarını kullanır — diğer alanlar (status, body, headers, timings) bu modülün kapsamı dışındadır.

### Anti-Pattern Uyarıları

```typescript
// ❌ YANLIŞ: any kullanımı
function classifySegment(seg: any): any { ... }

// ✅ DOĞRU: strict typing
function classifySegment(segment: string): PatternSegment { ... }

// ❌ YANLIŞ: Sihirli string kullanan template oluşturma
const template = url.replace(/\/\d+/g, '/{param}');

// ✅ DOĞRU: Segment-based deterministic parameterization
const segments = pathSegments.map(s => classifySegment(s));
const template = '/' + segments.map(s => s.kind === 'dynamic' ? '{param}' : s.value).join('/');

// ❌ YANLIŞ: Regex sırasını değiştirmek
if (BASE64_REGEX.test(seg)) ...  // base64 numeric'ten ÖNCE test edilirse false positive!
if (NUMERIC_REGEX.test(seg)) ...

// ✅ DOĞRU: Architecture'daki sıra (UUID > numeric > hex > base64 > nullable > static)
if (UUID_REGEX.test(seg)) return { kind: 'dynamic', paramType: 'uuid' };
if (NUMERIC_REGEX.test(seg)) return { kind: 'dynamic', paramType: 'numeric' };
if (HEX_REGEX.test(seg)) return { kind: 'dynamic', paramType: 'hex' };
if (BASE64_REGEX.test(seg)) return { kind: 'dynamic', paramType: 'base64' };
if (NULLABLE_REGEX.test(seg)) return { kind: 'dynamic', paramType: 'nullable' };
return { kind: 'static', value: seg };

// ❌ YANLIŞ: Doğrudan implementation import
import { classifySegment } from '../auto-parameterizer/segment-classifier';

// ✅ DOĞRU: Barrel'dan import (auto-parameterizer modülü içi import test dosyaları için OK)
import { classifySegment } from './segment-classifier';  // Aynı modül içi
import { parameterize } from '@har-mock/core';             // Dışarıdan barrel
```

### Test Veri Stratejisi

HarEntry fixture oluştururken minimum gerekli alanları kullan. Auto-parameterizer sadece `url` ve `method` kullanır, diğer alanlar boş/default:

```typescript
function createEntry(url: string, method: string = 'GET'): HarEntry {
  return {
    url,
    method,
    status: 200,
    statusText: 'OK',
    responseBody: '',
    responseHeaders: [],
    requestHeaders: [],
    timings: {
      blocked: -1, dns: -1, connect: -1,
      send: 0, wait: 0, receive: 0, ssl: -1,
    },
  };
}
```

### Dosya Yapısı (Bu Story Sonrası)

```
packages/core/src/
├── index.ts                           # GÜNCELLE: auto-parameterizer export ekle
├── types/
│   ├── har.types.ts                   # Mevcut — değişiklik yok
│   ├── url-pattern.types.ts           # YENİ: UrlPattern, PatternSegment, ParamType
│   └── index.ts                       # GÜNCELLE: url-pattern tiplerini re-export et
├── errors/                            # Mevcut — bu story'de değişiklik yok
│   ├── har-mock.error.ts
│   ├── har-parse.error.ts
│   └── index.ts
├── har-parser/                        # Mevcut — bu story'de değişiklik yok
│   ├── har-parser.ts
│   ├── har-validator.ts
│   ├── har-parser.spec.ts
│   ├── har-validator.spec.ts
│   └── index.ts
├── auto-parameterizer/
│   ├── auto-parameterizer.ts          # YENİ: parameterize(entries): UrlPattern[]
│   ├── segment-classifier.ts          # YENİ: classifySegment(seg): PatternSegment
│   ├── auto-parameterizer.spec.ts     # YENİ: Parameterizer testleri
│   ├── segment-classifier.spec.ts     # YENİ: Classifier testleri
│   └── index.ts                       # GÜNCELLE: parameterize, classifySegment export
├── url-matcher/
│   └── index.ts                       # Mevcut — placeholder (Story 1.4)
├── priority-chain/
│   └── index.ts                       # Mevcut — placeholder (Story 1.5)
└── rule-engine/
    └── index.ts                       # Mevcut — placeholder (Story 1.5)
```

### Project Structure Notes

- Architecture dizin yapısıyla tam uyumlu: `auto-parameterizer/auto-parameterizer.ts`, `auto-parameterizer/segment-classifier.ts`
- `url-pattern.types.ts` architecture dokümanında belirtilen dosya ismi
- Story 1.1'de oluşturulan boş placeholder `auto-parameterizer/index.ts` bu story'de içerikle doldurulacak
- `UrlPattern` tipi Story 1.4 (URL Matcher) ve Story 1.5 (Priority Chain) tarafından kullanılacak — public API'nin parçası
- `classifySegment` hem internal kullanım (auto-parameterizer tarafından) hem de test edilebilirlik için export edilir

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Auto-Parameterization Algorithm] — Regex-based segment classification, deterministik sıra, regex pattern'ları
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — URL Pattern Temsili] — UrlPattern interface, PatternSegment discriminated union, HttpMethod type
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — kebab-case dosya isimlendirme, *.types.ts pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — readonly property'ler, interface vs type kullanımı, barrel export yapısı
- [Source: _bmad-output/planning-artifacts/architecture.md#Tam Proje Dizin Yapisi] — auto-parameterizer/ dizin yapısı ve dosya isimleri
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — any yasağı, unknown + type guard, anti-pattern örnekleri
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Acceptance criteria, BDD senaryoları
- [Source: _bmad-output/planning-artifacts/prd.md#Auto-Parameterization & URL Matching] — FR5 (UUID), FR6 (numeric), FR7 (token/hash), FR9 (nullable)
- [Source: _bmad-output/planning-artifacts/prd.md#Reliability & Doğruluk] — NFR5 (%100 URL matching doğruluğu, false positive/negative sıfır)
- [Source: _bmad-output/implementation-artifacts/1-2-har-parser-validator.md#Dev Notes] — TypeScript ~5.5.0, ESLint v8.56.0, Prettier 2-space, Jest config, coverage %80, noUncheckedIndexedAccess
- [Source: _bmad-output/implementation-artifacts/1-2-har-parser-validator.md#Change Log] — Code review öğrenimleri: format:check, File List completeness, unsafe cast kaldırma

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

Hata yok — tüm testler ilk denemede geçti. Sadece 2 düzeltme yapıldı:
- Lint: kullanılmayan `UrlPattern` import kaldırıldı (auto-parameterizer.spec.ts)
- Format: `yarn format:write` ile Prettier formatına dönüştürüldü (5 dosya)

### Completion Notes List

- ✅ Task 1: `url-pattern.types.ts` — `ParamType`, `StaticSegment`, `DynamicSegment`, `PatternSegment` (discriminated union), `UrlPattern` tipleri oluşturuldu. Tüm property'ler readonly. Architecture spesifikasyonuna uyumlu.
- ✅ Task 2: `segment-classifier.ts` — `classifySegment()` fonksiyonu, `SEGMENT_PATTERNS` as const objesi (UUID > Numeric > Hex > Base64 > Nullable sırasıyla), sıralı regex testi ile deterministik classification.
- ✅ Task 3: `auto-parameterizer.ts` — `parameterize()` fonksiyonu, `new URL()` ile pathname çıkarma + fallback, segment splitting, template oluşturma, 1:1 entry-pattern mapping.
- ✅ Task 4: `segment-classifier.spec.ts` — 28 test: UUID (3), Numeric (4), Hex (3), Base64 (3), Nullable (3), Static (3), Edge case (4), False positive (5).
- ✅ Task 5: `auto-parameterizer.spec.ts` — 20 test: UUID URL, Numeric URL, Hex URL, JWT URL, Nullable (2), Aynı template, Karma dynamic, Boş entries, Query/fragment, Original korunması, Method (2), Root path, Fallback URL parsing (4).
- ✅ Task 6: barrel export, lint, format, build, test:coverage — tüm doğrulama geçti.
- 📊 Coverage: auto-parameterizer %100, segment-classifier %100 (stmts, branch, funcs, lines)
- 📊 Test: 98 test, 5 suite, 0 failure
- 📊 Lint: 0 hata, 0 uyarı
- 📊 Build: TypeScript derleme başarılı

### File List

- `packages/core/src/types/url-pattern.types.ts` — YENİ: ParamType, PatternSegment, UrlPattern tipleri
- `packages/core/src/types/index.ts` — GÜNCELLEME: url-pattern tiplerini re-export
- `packages/core/src/index.ts` — GÜNCELLEME: yeni tipleri ve auto-parameterizer fonksiyonlarını export
- `packages/core/src/auto-parameterizer/segment-classifier.ts` — YENİ: classifySegment fonksiyonu
- `packages/core/src/auto-parameterizer/auto-parameterizer.ts` — YENİ: parameterize fonksiyonu
- `packages/core/src/auto-parameterizer/segment-classifier.spec.ts` — YENİ: segment classifier testleri (28 test)
- `packages/core/src/auto-parameterizer/auto-parameterizer.spec.ts` — YENİ: auto-parameterizer testleri (20 test)
- `packages/core/src/auto-parameterizer/index.ts` — GÜNCELLEME: parameterize ve classifySegment re-export
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — GÜNCELLEME: story status ready-for-dev → review

### Change Log

- **2026-02-23:** Story 1.3 Auto-Parameterization Engine implementasyonu tamamlandı. `UrlPattern` tip tanımları, `classifySegment()` segment classifier, `parameterize()` auto-parameterizer fonksiyonları ve 48 test (28 classifier + 20 parameterizer) eklendi. Tüm dosyalar %100 coverage, 0 lint hatası, Prettier uyumlu, TypeScript build başarılı.
