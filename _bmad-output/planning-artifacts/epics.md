---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-epic-1', 'step-03-epic-2', 'step-03-epic-3', 'step-03-epic-4', 'step-03-epic-5', 'step-04-final-validation']
inputDocuments:
    - _bmad-output/planning-artifacts/prd.md
    - _bmad-output/planning-artifacts/architecture.md
    - _bmad-output/planning-artifacts/ux-design-specification.md
---

# har-mock-plugin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for har-mock-plugin, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**HAR Dosyası Yönetimi**

- FR1: Developer, file picker aracılığıyla HAR dosyası yükleyebilir.
- FR2: Developer, drag & drop ile HAR dosyası yükleyebilir.
- FR3: Sistem, yüklenen HAR dosyasını parse edip tüm HTTP entry'lerini çıkarabilir.
- FR4: Sistem, HAR dosyasındaki response body, status code, header ve timing bilgilerini okuyabilir.

**Auto-Parameterization & URL Matching**

- FR5: Sistem, HAR'daki URL'lerde UUID segmentlerini otomatik tespit edip `{id}` pattern'ına çevirebilir.
- FR6: Sistem, HAR'daki URL'lerde numeric ID segmentlerini otomatik tespit edip `{id}` pattern'ına çevirebilir.
- FR7: Sistem, HAR'daki URL'lerde token/hash segmentlerini otomatik tespit edip `{token}` pattern'ına çevirebilir.
- FR8: Sistem, parameterize edilmiş URL pattern'ları ile gelen request URL'lerini eşleştirebilir.
- FR9: Sistem, `null`/`undefined`/boş URL segmentlerini dinamik parametre olarak kabul edip pattern matching'i genişletebilir (Two-Phase State Recovery Faz A).

**Request Intercept & Replay**

- FR10: Sistem, browser'daki HTTP request'leri content script (`"world": "MAIN"`) üzerinden `window.fetch` ve `XMLHttpRequest` monkey-patching ile yakalayabilir.
- FR11: Sistem, yakalanan request'e karşılık gelen HAR response'unu döndürebilir.
- FR12: Sistem, Sequential Mode'da aynı endpoint'e yapılan ardışık isteklerde HAR'daki sırayla response döndürebilir.
- FR13: Sistem, Last-Match Mode'da aynı endpoint için HAR'daki en son response'u döndürebilir.
- FR14: Developer, Sequential ve Last-Match modları arasında geçiş yapabilir.
- FR15: Sistem, HAR'daki gerçek response time'larını kullanarak gecikme simülasyonu yapabilir (HAR Timing Replay).

**Rule-Based Mock**

- FR16: Developer, URL pattern + HTTP method + status code + response body + delay ile mock rule tanımlayabilir.
- FR17: Developer, tanımlı rule'ları listeleyebilir, düzenleyebilir ve silebilir.
- FR18: Sistem, Rule-First Priority Chain'i uygulayabilir: Request → Rules → HAR → Passthrough.
- FR19: Sistem, HAR dosyası yüklenmeden sadece rule'larla çalışabilir.

**Active Mock Overlay & Görünürlük**

- FR20: Developer, aktif mock durumunu gösteren bir overlay görebilir.
- FR21: Overlay, yakalanan her request için URL, HTTP method ve eşleşme durumunu ("Rule ✓" / "HAR ✓" / "Passthrough →") gösterebilir.
- FR22: Overlay, canlı request akışını gerçek zamanlı listeleyebilir (Request Status Feed).

**Kullanıcı Kontrolü & Exclusion**

- FR23: Sistem, HAR yüklendiğinde tüm eşleşen endpoint'leri varsayılan olarak aktif yapabilir (Default-On).
- FR24: Developer, belirli endpoint'leri exclude listesine ekleyerek gerçek API'ye yönlendirebilir.
- FR25: Developer, exclude listesini yönetebilir (ekle/çıkar).

**Response Editing**

- FR26: Developer, intercept edilen bir response'u overlay üzerinden görüntüleyip düzenleyebilir (Optional Response Editor).
- FR27: Developer, overlay'deki canlı request listesinde herhangi bir HAR response'unu düzenleyebilir ve düzenleme HAR session'ına persist olabilir (HAR Response Inline Edit & Persist).

**Extension Yönetimi**

- FR28: Developer, Extension'ı popup üzerinden açıp kapatabilir (Extension Toggle).

**Angular Plugin — Konfigürasyon**

- FR29: Developer, `provideHarMock()` ile Angular uygulamasına zero-config HAR mock entegrasyonu sağlayabilir.
- FR30: Developer, `provideHarMock()` parametreleriyle `harUrl`, `mode`, `enabled`, `rules` ve `bypassGuards` konfigüre edebilir.
- FR31: Sistem, `assets/har-mock.har` convention path'inden HAR dosyasını otomatik yükleyebilir (Zero Config Convention).

**Angular Plugin — Intercept & Güvenlik**

- FR32: Sistem, Angular `HttpClient` seviyesinde request yakalayıp HAR response'u döndürebilir.
- FR33: Sistem, `enabled: true` VE `isDevMode() === true` çift kilit mekanizmasıyla prod'da otomatik devre dışı kalabilir (Double-Lock Production Safety).
- FR34: Developer, `bypassGuards: true` ile dev mode'da tüm route guard'ları (`CanActivate`, `CanDeactivate`, `CanMatch`) otomatik geçebilir.

**Angular Plugin — HAR Loading**

- FR35: Sistem, `assets/` klasöründen HAR dosyasını HTTP fetch ile lazy load edebilir.
- FR36: Sistem, farklı environment konfigürasyonlarına göre farklı HAR dosyalarını yükleyebilir.

### NonFunctional Requirements

**Security & Production Safety**

- NFR1: Angular Plugin, `isDevMode() === false` olduğunda hiçbir mock işlevi çalıştırmamalı — tüm interceptor ve guard bypass mantığı tamamen devre dışı kalmalı.
- NFR2: Double-lock mekanizması (`enabled: true` + `isDevMode() === true`) her ikisi de sağlanmadan plugin aktif olmamalı.
- NFR3: Extension, yalnızca developer'ın aktif olarak yüklediği HAR dosyasındaki response'ları kullanmalı — dış kaynaktan veri çekmemeli.
- NFR4: HAR dosyasındaki hassas veriler (token, cookie, auth header) sadece local'de işlenmeli, hiçbir dış servise gönderilmemeli.

**Reliability & Doğruluk**

- NFR5: Auto-parameterization, HAR'daki tüm URL'leri %100 doğrulukla eşleştirmeli — yanlış eşleşme (false positive) veya kaçırma (false negative) kabul edilemez.
- NFR6: HAR response'ları byte-level doğrulukla uygulamaya iletilmeli — response body, status code ve header'larda veri kaybı veya bozulma olmamalı.
- NFR7: Rule-First Priority Chain (Rules → HAR → Passthrough) deterministik çalışmalı — aynı request, aynı rule seti ve aynı HAR dosyası ile her çalıştırmada aynı sonucu üretmeli.

**Integration & Uyumluluk**

- NFR8: Chrome Extension, Manifest V3 (MV3) standardına uygun olmalı.
- NFR9: Angular Plugin, Angular 15 ve üzeri tüm major sürümlerle uyumlu olmalı.
- NFR10: Angular Plugin, ESM ve CJS module formatlarını desteklemeli.
- NFR11: HAR parser, HAR 1.2 spesifikasyonuna uyumlu olmalı (Chrome DevTools tarafından üretilen standart format).

**Developer Experience**

- NFR12: Public API (`provideHarMock()`) TypeScript ile tam tip desteği sağlamalı — tüm parametreler ve return tipleri açıkça tanımlı olmalı.
- NFR13: Hata durumlarında (geçersiz HAR, parse hatası, eşleşme bulunamadı) her hata mesajı şu üç bileşeni içermeli: hata türü (error type), nedeni (root cause) ve önerilen çözüm adımı (suggested action).

### Additional Requirements

**Mimari / Infrastructure Gereksinimleri (Architecture dokümanından):**

- ARCH1: Starter Template — Yarn Workspaces monorepo. `packages/core` (saf TS), `packages/extension` (Angular popup + MV3), `packages/angular-plugin` (ng-packagr). İlk implementation story monorepo setup olmalı.
- ARCH2: Shared core engine (`@har-mock/core`) Angular ve Chrome API'ye sıfır bağımlılıkla saf TypeScript — auto-parameterization, URL matching, priority chain, rule engine, error classes, shared types tümü buradan export.
- ARCH3: State management hibrit: `chrome.storage.local` (kalıcı) + Background SW in-memory cache (hızlı okuma). SW idle timeout'u port keep-alive ile önlenir.
- ARCH4: Port-based long-lived connections — tüm iletişim (Content Script ↔ Background SW, Popup ↔ Background SW) port üzerinden. `Message<T>` / `MessageResponse<T>` protokolü.
- ARCH5: Build tooling — `packages/core`: tsc; `packages/extension`: Angular CLI + custom post-build (manifest.json inject); `packages/angular-plugin`: ng-packagr. Test: Jest tüm paketlerde.
- ARCH6: Implementation sequence — 1) `@har-mock/core`, 2) Background SW, 3) Content Script, 4) Extension Popup, 5) Angular Plugin. Bu sıra bağımlılık grafiğine göre zorunlu.
- ARCH7: Error class hierarchy — `HarMockError` (base), `HarParseError`, `UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError`. Core'dan export, tüm paketler kullanır.
- ARCH8: Content script mock hatalarında sessiz passthrough — uygulama asla kırılmaz, orijinal fetch/XHR çağrısına düşer.
- ARCH9: Webpack — 3 ayrı entry point: `popup/main.ts`, `background/background.ts`, `content/content.ts`.
- ARCH10: Angular Plugin guard bypass — `APP_INITIALIZER` + `Router.config` mutation. Üçlü şart: `isDevMode() && enabled && bypassGuards`.

**UX Gereksinimleri (UX Specification dokümanından):**

- UX1: Popup Information Architecture — Tab + Accordion hibrit. Tab 1: Controls (HAR/Rules/Settings accordion); Tab 2: Monitor (canlı request feed).
- UX2: HAR bölümünde drag & drop zone prominently yerleştirilmeli; yükleme sonrası "X endpoint eşleştirildi, intercept aktif" feedback gösterilmeli.
- UX3: Monitor tab'ında her satır: URL, HTTP method, eşleşme durumu ("Rule ✓" / "HAR ✓" / "Passthrough →") badge'iyle. Satıra tıklayarak response görüntüleme + inline JSON edit.
- UX4: CodeMirror 6 JSON editör — Monaco yerine (~50-100KB vs 500KB+). Popup 400px width constraint.
- UX5: Angular component'leri: `standalone: true`, `ChangeDetectionStrategy.OnPush`, signal-based `input()`/`output()`, `inject()` DI, selector prefix `hm-`.
- UX6: Replay mode toggle (Sequential / Last-Match) ile HAR timing replay on/off kontrolü Controls tab'ında HAR accordion içinde.
- UX7: Settings accordion'unda Extension on/off toggle + exclude listesi yönetimi.
- UX8: Rules accordion'unda rule form (URL pattern + method + status + body + delay) + rule listesi (ekle/düzenle/sil).

### FR Coverage Map

| FR           | Epic   | Açıklama                                             |
| ------------ | ------ | ---------------------------------------------------- |
| FR1, FR2     | Epic 2 | File picker + drag & drop UI                         |
| FR3, FR4     | Epic 1 | HAR parse (core)                                     |
| FR5–FR9      | Epic 1 | Auto-parameterization & URL matching (core)          |
| FR10–FR15    | Epic 2 | Content script intercept + replay mode               |
| FR16–FR19    | Epic 4 | Rule-Based Mock engine + priority chain              |
| FR20–FR22    | Epic 3 | Monitor tab + request feed                           |
| FR23, FR28   | Epic 2 | Default-on + extension toggle                        |
| FR24–FR27    | Epic 3 | Exclude list + response editor                       |
| FR29–FR36    | Epic 5 | Angular Plugin tam seti                              |
| NFR1–2       | Epic 5 | Double-lock safety                                   |
| NFR3–4       | Epic 2 | Local-only data processing                           |
| NFR5–7       | Epic 1 | URL matching doğruluğu, priority chain deterministik |
| NFR8         | Epic 2 | MV3 uyumluluğu                                       |
| NFR9–10      | Epic 5 | Angular 15+, ESM/CJS                                 |
| NFR11        | Epic 1 | HAR 1.2 parser                                       |
| NFR12–13     | Epic 1 | TypeScript tip desteği, error message yapısı         |
| ARCH1–10     | Epic 1 | Monorepo + tüm mimari kararlar                       |
| UX1–2, UX6–7 | Epic 2 | Popup shell, HAR + Settings accordion                |
| UX3–4        | Epic 3 | Monitor tab, CodeMirror 6                            |
| UX5          | Epic 5 | Angular component standartları                       |
| UX8          | Epic 4 | Rules accordion                                      |

## Epic List

### Epic 1: Proje Altyapısı & Paylaşımlı Core Engine

Developer, monorepo ortamını kurabilir ve çekirdek mock mantığı (HAR parse, auto-parameterization, URL matching, priority chain, rule engine, error classes) tam test edilmiş, tekrar kullanılabilir bir TypeScript kütüphanesi olarak çalışır hale gelir. **Tüm sonraki epic'lerin temeli.**
**FRs covered:** FR3, FR4, FR5, FR6, FR7, FR8, FR9
**NFRs covered:** NFR5, NFR6, NFR7, NFR11, NFR12, NFR13
**Additional:** ARCH1–ARCH10 (monorepo setup, shared core, state model, messaging protocol, build tooling, implementation sequence, error hierarchy, silent passthrough pattern, webpack entries, guard bypass mechanism)

### Epic 2: Chrome Extension — HAR Replay Temeli

Developer, Chrome Extension'ı açarak HAR dosyasını yükler ve uygulamasında prod API response'larını birebir replay eder. Zero-config deneyim: dosyayı sürükle-bırak yap, sayfayı aç, prod ekranını gör (Journey 1: Happy Path).
**FRs covered:** FR1, FR2, FR10, FR11, FR12, FR13, FR14, FR15, FR23, FR28
**NFRs covered:** NFR3, NFR4, NFR8
**Additional:** UX1, UX2, UX6, UX7 (popup shell, Tab+Accordion yapısı, Controls tab, HAR accordion, Settings accordion, Extension toggle)

### Epic 3: Chrome Extension — Monitor & Response Editing

Developer, intercept edilen her request'i canlı olarak Monitor tab'ında görür; response'ları inline düzenleyebilir, belirli endpoint'leri exclude edebilir. Guard'lı sayfalarda response override ile engellenmiş sayfalar açılabilir (Journey 2: Guard Edge Case).
**FRs covered:** FR20, FR21, FR22, FR24, FR25, FR26, FR27
**Additional:** UX3, UX4 (Monitor tab, canlı request feed, CodeMirror 6 JSON editör, exclude listesi)

### Epic 4: Chrome Extension — Rule-Based Mock

Developer, HAR dosyası olmadan URL pattern + HTTP method + status code + response body + delay kombinasyonu ile özel mock rule'lar tanımlar; error senaryolarını ve edge case'leri test eder (Journey 3: Error Senaryosu / Rule-Based Mock).
**FRs covered:** FR16, FR17, FR18, FR19
**Additional:** UX8 (Rules accordion, rule form + list)

### Epic 5: Angular Plugin

Angular developer'lar, `provideHarMock()` API ile uygulamalarına tek satır native HAR mock entegrasyonu sağlar; double-lock production safety garantisiyle prod'a sızma riski yapısal olarak sıfırdır. `bypassGuards: true` ile guard'lı sayfalara doğrudan erişim (Journey 4: Angular Plugin Entegrasyonu).
**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36
**NFRs covered:** NFR1, NFR2, NFR9, NFR10
**Additional:** ARCH10 (guard bypass), UX5 (Angular component standartları)

---

## Epic 1: Proje Altyapısı & Paylaşımlı Core Engine

Developer, monorepo ortamını kurabilir ve çekirdek mock mantığı (HAR parse, auto-parameterization, URL matching, priority chain, rule engine, error classes) tam test edilmiş, tekrar kullanılabilir bir TypeScript kütüphanesi olarak çalışır hale gelir. Tüm sonraki epic'lerin temeli.

### Story 1.1: Monorepo Kurulumu & Temel Yapılandırma

As a developer,
I want Yarn Workspaces monorepo'yu üç paketle (`packages/core`, `packages/extension`, `packages/angular-plugin`) tamamen yapılandırılmış halde kurmak,
So that tüm paketler ortak TypeScript strict config, ESLint, Prettier ve Jest base config'i paylaşsın; cross-package path alias'ları (`@har-mock/core`) çalışsın ve `yarn install` tek seferde tüm bağımlılıkları kursun.

**Acceptance Criteria:**

**Given** boş bir workspace klasörü
**When** `yarn install` komutu çalıştırıldığında
**Then** `packages/core`, `packages/extension`, `packages/angular-plugin` klasörleri oluşturulmuş olmalı; her biri kendi `package.json`'ına sahip; root `package.json` `"workspaces": ["packages/*"]` içermeli

**Given** root `tsconfig.base.json` dosyası
**When** herhangi bir paketteki `tsconfig.json` incelendiğinde
**Then** `extends: "../../tsconfig.base.json"` ile kalıtım alıyor olmalı; `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` aktif olmalı

**Given** `packages/extension` veya `packages/angular-plugin`'de TypeScript dosyası
**When** `import { HarParser } from '@har-mock/core'` yazıldığında
**Then** TypeScript compiler path alias'ı çözümleyebilmeli (`@har-mock/core` → `packages/core/src/index.ts`)

**Given** root `jest.config.base.js` dosyası
**When** `yarn test:all` çalıştırıldığında
**Then** tüm paketlerdeki `*.spec.ts` dosyaları çalışıyor olmalı; coverage raporları per-package üretilmeli

**Given** `.eslintrc.json` ve `.prettierrc` root dosyaları
**When** herhangi bir pakette linter çalıştırıldığında
**Then** shared kurallar uygulanıyor olmalı; `any` tipi ESLint hatası olarak işaretlenmeli

### Story 1.2: HAR Parser & Validator

As a developer,
I want `@har-mock/core` içinde `HarParser` ve `HarValidator` modüllerini birlikte tam unit test coverage'ıyla,
So that yüklenen herhangi bir HAR dosyasını parse edip tüm HTTP entry'lerini (URL, method, request headers, response body, status code, response headers, timing) eksiksiz çıkarabileyim; geçersiz HAR'larda açık `HarParseError` fırlatılsın.

**Acceptance Criteria:**

**Given** Chrome DevTools tarafından export edilmiş geçerli bir HAR 1.2 dosyası
**When** `parseHar(rawJson)` çağrıldığında
**Then** `HarFile` tipi döndürülmeli; `entries` array'i HAR'daki tüm HTTP exchange'leri içermeli; her entry'de `url`, `method`, `status`, `responseBody`, `responseHeaders`, `timings` alanları eksiksiz dolu olmalı (NFR6)

**Given** JSON formatı bozuk veya HAR 1.2 şemasına uymayan bir dosya
**When** `parseHar()` çağrıldığında
**Then** `HarParseError` fırlatılmalı; error mesajı `type`, `rootCause` ve `suggestedAction` alanlarını içermeli (NFR13)

**Given** `parseHar()` ile parse edilmiş `HarFile`
**When** `validateHarSchema(harFile)` çağrıldığında
**Then** HAR 1.2 zorunlu alanları doğrulanmalı; eksik alan varsa `HarParseError` fırlatılmalı (NFR11)

**Given** `har-parser.spec.ts` test dosyası
**When** test suite çalıştırıldığında
**Then** geçerli HAR parse, boş entries, binary response body, büyük HAR (100+ entry), eksik timing fields senaryolarının tamamı kapsanmış olmalı

### Story 1.3: Auto-Parameterization Engine

As a developer,
I want `@har-mock/core` içinde `AutoParameterizer` ve `SegmentClassifier` modüllerini tam test coverage'ıyla,
So that HAR'dan çıkarılan URL'lerdeki UUID, numeric ID, hex token, JWT/Base64 ve null/undefined segmentleri otomatik tespit edilip `UrlPattern[]` yapısına dönüştürülsün; developer hiçbir URL pattern'ı elle tanımlamasın.

**Acceptance Criteria:**

**Given** `/api/users/550e8400-e29b-41d4-a716-446655440000/orders` içeren bir HAR entry URL'i
**When** `AutoParameterizer.parameterize([entry])` çağrıldığında
**Then** `UrlPattern.template` değeri `/api/users/{param}/orders` olmalı; segment `{ kind: 'dynamic', paramType: 'uuid' }` olarak sınıflandırılmış olmalı (FR5)

**Given** `/api/products/42/reviews` içeren bir URL
**When** parameterize edildiğinde
**Then** `template` `/api/products/{param}/reviews` olmalı; segment `paramType: 'numeric'` olmalı (FR6)

**Given** `/api/auth/a1b2c3d4e5f67890abcd1234` (hex token) veya `/api/session/eyJhbGciOiJIUzI1NiJ9` (JWT) içeren URL
**When** parameterize edildiğinde
**Then** sırasıyla `paramType: 'hex'` ve `paramType: 'base64'` olarak sınıflandırılmalı (FR7)

**Given** `/api/items/null/details` veya `/api/items//details` içeren URL (null/undefined/boş segment)
**When** parameterize edildiğinde
**Then** segment `paramType: 'nullable'` olarak kabul edilmeli; Two-Phase State Recovery Faz A aktif olmalı (FR9)

**Given** `/api/users/123` ve `/api/users/456` içeren iki HAR entry
**When** ikisi de parameterize edildiğinde
**Then** her ikisi de aynı `template: '/api/users/{param}'`'e dönüşmeli; `original` alanı orijinal URL'yi korumalı

**Given** `segment-classifier.spec.ts`
**When** tüm segment tipleri test edildiğinde
**Then** UUID, numeric, hex, base64, nullable ve static; her biri için en az 3 farklı örnek test edilmiş olmalı; false positive/negative sıfır olmalı (NFR5)

### Story 1.4: URL Matcher & Pattern Compiler

As a developer,
I want `@har-mock/core` içinde `UrlMatcher` ve `PatternCompiler` modüllerini,
So that gelen request URL'leri auto-parameterization'dan üretilen `UrlPattern[]`'larla eşleştirilsin; en uzun static prefix öncelikli olarak doğru pattern seçilsin; eşleşme yoksa `null` dönülsün.

**Acceptance Criteria:**

**Given** pattern `{ template: '/api/users/{param}/orders', method: 'GET' }` ve gelen request `GET /api/users/999/orders`
**When** `UrlMatcher.matchUrl(requestUrl, requestMethod, patterns)` çağrıldığında
**Then** doğru pattern döndürülmeli; `MatchResult.pattern` eşleşen `UrlPattern` olmalı (FR8)

**Given** iki pattern: `/api/users/{param}` ve `/api/users/profile` (static daha uzun)
**When** `GET /api/users/profile` geldiğinde
**Then** static segment sayısı daha yüksek olan `/api/users/profile` öncelikli seçilmeli (NFR5)

**Given** hiçbir pattern ile eşleşmeyen bir URL
**When** `matchUrl()` çağrıldığında
**Then** `null` dönmeli; exception fırlatılmamalı

**Given** `PatternCompiler.compilePattern(urlPattern)` çağrısı
**When** `UrlPattern` nesnesi verildiğinde
**Then** dynamic segmentler `[^/]+` regex grubuna dönüştürülmeli; compiled pattern method-aware olmalı

**Given** `url-matcher.spec.ts`
**When** test suite çalıştırıldığında
**Then** exact match, dynamic segment match, priority tiebreak, method mismatch, nullable segment, no match senaryolarının tamamı kapsanmış olmalı

### Story 1.5: Priority Chain, Rule Engine & Error Class Hierarchy

As a developer,
I want `@har-mock/core` içinde `PriorityChain`, `RuleEngine` ve tam `HarMockError` hiyerarşisini,
So that her request için Rules → HAR → Passthrough öncelik sırasının deterministik uygulanması garantilensin; hata durumlarında type + rootCause + suggestedAction içeren structured error'lar fırlatılsın.

**Acceptance Criteria:**

**Given** aynı URL için hem aktif bir mock rule hem de eşleşen HAR entry mevcut
**When** `PriorityChain.resolve(request, rules, harEntries)` çağrıldığında
**Then** rule response dönülmeli; HAR entry göz ardı edilmeli (FR18, NFR7)

**Given** eşleşen mock rule yok ama eşleşen HAR entry var
**When** `resolve()` çağrıldığında
**Then** HAR response dönülmeli

**Given** ne rule ne HAR eşleşmesi var
**When** `resolve()` çağrıldığında
**Then** `null` dönmeli (Passthrough sinyali)

**Given** `RuleEngine.evaluate(request, rules)` çağrısı
**When** URL pattern, method ve aktif kurallar eşleştiğinde
**Then** doğru `MockResponse` (status + body + headers + delay) dönmeli

**Given** hata durumu (geçersiz rule, storage hatası, messaging hatası vb.)
**When** ilgili error class fırlatıldığında
**Then** `HarParseError`, `UrlMatchError`, `RuleValidationError`, `StorageError`, `MessagingError` — her biri `HarMockError`'dan extend eder; `instanceof HarMockError` true; `type`, `rootCause`, `suggestedAction` string alanları dolu (NFR13)

**Given** `packages/core/src/index.ts` barrel export
**When** `import { HarParser, AutoParameterizer, UrlMatcher, PriorityChain, RuleEngine, HarMockError } from '@har-mock/core'` yazıldığında
**Then** tüm public API'ler erişilebilir; implementation dosyalarına doğrudan import gerekmiyor (ARCH2)

---

## Epic 2: Chrome Extension — HAR Replay Temeli

Developer, Chrome Extension'ı açarak HAR dosyasını yükler ve uygulamasında prod API response'larını birebir replay eder. Zero-config deneyim: dosyayı sürükle-bırak yap, sayfayı aç, prod ekranını gör (Journey 1: Happy Path).

### Story 2.1: Extension Monorepo Kurulumu — Background SW, Content Script, Popup Shell

As a developer,
I want `packages/extension` paketini MV3 manifest, Webpack 3-entry build pipeline, Angular popup shell ve Tailwind CSS ile çalışır hale getirmek,
So that popup açılabilsin, background service worker ve content script yüklensin; tüm Angular popup altyapısı (tab yapısı, routing olmadan) hazır olsun.

**Acceptance Criteria:**

**Given** `packages/extension` dizini
**When** `yarn build:extension` çalıştırıldığında
**Then** `dist/extension/` klasörü oluşmalı; `manifest.json` (MV3), `background.js`, `content.js`, `popup/index.html` dahil olmalı; her üç entry point ayrı bundle olarak çıkmalı (NFR8, ARCH9)

**Given** Chrome'a `dist/extension/` yüklendiğinde
**When** Extension icon'a tıklandığında
**Then** popup açılmalı; Angular app bootstrap olmalı; Tab 1 (Controls) ve Tab 2 (Monitor) tabları görünür olmalı; hiçbir console error olmamalı (UX1)

**Given** Extension yüklendiğinde
**When** herhangi bir web sayfası açıldığında
**Then** content script MAIN world'de inject edilmeli; `chrome.runtime.connect()` ile background SW'ye port bağlantısı kurulmalı; background SW port'u kaydetmeli (ARCH4)

**Given** webpack config'de `tailwind.config.js` entegrasyonu
**When** popup HTML'i render edildiğinde
**Then** Tailwind CSS sınıfları uygulanmış olmalı; popup genişliği 400px olmalı

### Story 2.2: Background Service Worker — State Yönetimi & Port Hub

As a developer,
I want background service worker'ı `chrome.storage.local` + in-memory cache hibrit state yönetimi ve port messaging hub ile,
So that popup kapansa bile HAR data ve ayarlar persist etsin; SW idle timeout'a rağmen state kaybolmasın; popup ve content script'e aynı state sunulsun.

**Acceptance Criteria:**

**Given** HAR data `chrome.storage.local`'a kaydedildiğinde
**When** background SW idle olup yeniden uyandığında
**Then** storage'dan in-memory cache'e yeniden yüklenebilmeli; state kaybı yaşanmamalı (ARCH3)

**Given** content script veya popup'tan port bağlantısı geldiğinde
**When** `chrome.runtime.connect()` çağrıldığında
**Then** `PortManager` port'u kaydetmeli; `'har-mock-content-{tabId}'` ve `'har-mock-popup'` port name convention'ına uyulmalı (ARCH4)

**Given** background SW'ye gelen her port mesajı
**When** `message-handler.ts`'deki switch dispatcher işlendiğinde
**Then** `Message<T>` ve `MessageResponse<T>` tiplerini kullanmalı; `requestId` popup'tan gelen isteklerde zorunlu olmalı; if/else değil switch/case kullanılmalı

**Given** SW başladığında
**When** ilk port bağlantısı kurulduğunda
**Then** `chrome.storage.local`'dan mevcut state (`harData`, `activeRules`, `settings`, `editedResponses`, `matchHistory`) yüklenip in-memory cache'e alınmalı (ARCH3)

**Given** popup kapalıyken extension aktifken
**When** content script HAR match query gönderdiğinde
**Then** background SW yanıt vermeye devam etmeli; popup'un kapalı olması mock işlevini etkilememeli

### Story 2.3: HAR Yükleme UI — Drag & Drop + File Picker

As a developer,
I want Controls tab'ında HAR accordion içinde drag & drop zone ve file picker'ı,
So that HAR dosyasını popup'a sürükle-bırak veya file picker ile yükleyebileyim; yükleme sonrası auto-parameterization tetiklensin ve kaç endpoint eşleştirildiği anında gösterilsin.

**Acceptance Criteria:**

**Given** Controls tab → HAR accordion açık
**When** popup görüntülendiğinde
**Then** belirgin bir drag & drop zone görünmeli; "HAR dosyasını buraya sürükleyin veya seçin" placeholder text'i olmalı (FR1, FR2, UX2)

**Given** developer bir `.har` dosyasını drag & drop zone'a bıraktığında
**When** `drop` event tetiklendiğinde
**Then** dosya okunmalı; `HarParser.parseHar()` çağrılmalı; parse sonucu `AutoParameterizer.parameterize()` ile URL pattern'larına dönüştürülmeli; background SW'ye `LOAD_HAR` mesajı gönderilmeli (FR2, FR3)

**Given** developer file picker'dan `.har` dosyası seçtiğinde
**When** dosya seçimi tamamlandığında
**Then** aynı parse ve background SW kaydetme akışı çalışmalı (FR1)

**Given** HAR başarıyla yüklenip auto-parameterization tamamlandığında
**When** background SW `LOAD_HAR` mesajını işlediğinde
**Then** popupda "X endpoint eşleştirildi, intercept aktif" success feedback'i gösterilmeli; endpoint sayısı doğru olmalı (UX2)

**Given** geçersiz veya parse edilemeyen bir dosya yüklendiğinde
**When** `HarParseError` fırlatıldığında
**Then** popupda açık hata mesajı gösterilmeli; hata type + rootCause + suggestedAction içermeli; uygulama crash etmemeli (NFR13)

**Given** yüklenen HAR dosyası işlendiğinde
**When** parse ve storage tamamlandığında
**Then** HAR data yalnızca `chrome.storage.local`'da tutulmalı; hiçbir dış servise gönderilmemeli (NFR3, NFR4)

### Story 2.4: Fetch & XHR Intercept + HAR Response Replay

As a developer,
I want content script'te `window.fetch` ve `XMLHttpRequest` monkey-patching ile intercept mekanizmasını,
So that sayfadaki tüm HTTP request'leri yakalanıp background SW'ye sorgulanabilsin; eşleşen HAR entry'ler orijinal request'in yerine response olarak dönebilsin; eşleşme yoksa orijinal network request'e düşülsün.

**Acceptance Criteria:**

**Given** content script MAIN world'de inject edildiğinde
**When** sayfa herhangi bir `fetch()` çağrısı yaptığında
**Then** `fetch-interceptor.ts` override devreye girmeli; request URL ve method background SW'ye gönderilmeli; SW'den HAR match response gelirse gerçek network isteği yapılmadan mock response dönmeli (FR10, FR11)

**Given** content script aktifken
**When** sayfa `XMLHttpRequest` ile istek yaptığında
**Then** `xhr-interceptor.ts` override devreye girmeli; aynı match query → mock response akışı çalışmalı (FR10, FR11)

**Given** URL match sonucu `null` (eşleşme yok) döndüğünde
**When** content script mock resolver yanıt aldığında
**Then** orijinal `fetch` veya `XHR` çağrısına sessizce düşülmeli; sayfa normal network isteği yapmalı (ARCH8)

**Given** background SW'ye bağlantı sırasında veya match query'de herhangi bir hata oluştuğunda
**When** try/catch bloğu hatayı yakaladığında
**Then** sessiz passthrough uygulanmalı; orijinal fetch/XHR çalıştırılmalı; sayfa asla kırılmamalı (ARCH8)

**Given** background SW'nin mock response döndürdüğü bir request
**When** content script response'u oluştururken
**Then** status code, response body ve response header'lar HAR entry ile byte-level eşleşmeli (NFR6)

### Story 2.5: Default-On Intercept, Replay Mode Toggle & Extension Toggle

As a developer,
I want HAR yüklendiğinde tüm endpoint'lerin otomatik aktif olmasını, Controls tab'ında Sequential/Last-Match toggle'ını ve global Extension on/off toggle'ını,
So that debug senaryoma göre replay stratejisini değiştirebileyim; HAR'daki tüm endpoint'ler ekstra aksiyon almadan intercept edilsin; Extension'ı geçici olarak tamamen devre dışı bırakabileyim.

**Acceptance Criteria:**

**Given** HAR başarıyla yüklendi
**When** content script bir request intercept ettiğinde
**Then** HAR'daki tüm eşleşen endpoint'ler için mock response dönülmeli; developer herhangi bir endpoint'i manuel olarak aktive etmek zorunda kalmamalı (FR23)

**Given** Controls tab → HAR accordion
**When** replay mode toggle görüntülendiğinde
**Then** "Sequential" ve "Last-Match" seçenekleri toggle olarak gösterilmeli; varsayılan Last-Match seçili olmalı (FR14, UX6)

**Given** developer Sequential Mode seçtiğinde
**When** aynı endpoint'e birden fazla request geldiğinde
**Then** background SW HAR entry'leri sırayla dönmeli; her request bir sonraki HAR entry'yi kullanmalı (FR12)

**Given** developer Last-Match Mode seçtiğinde
**When** aynı endpoint'e birden fazla request geldiğinde
**Then** background SW her seferinde HAR'daki son eşleşen entry'yi dönmeli (FR13)

**Given** Settings accordion içinde Extension toggle
**When** developer toggle'ı kapalıya aldığında
**Then** content script mock intercept'i devre dışı bırakmalı; tüm request'ler orijinal network'e geçmeli; toggle durumu `chrome.storage.local`'a persist olmalı (FR28, UX7)

**Given** Extension toggle kapalıyken popup yeniden açıldığında
**When** popup state yüklendiğinde
**Then** toggle'ın kapalı durumu gösterilmeli; mock intercept aktif olmamalı

### Story 2.6: HAR Timing Replay

As a developer,
I want HAR'daki gerçek response time'larını kullanarak gecikme simülasyonu yapmayı,
So that network gecikmeli senaryoları (yavaş API, timeout edge case) local'de gerçekçi biçimde test edebileyim.

**Acceptance Criteria:**

**Given** Controls tab → HAR accordion'da HAR Timing Replay toggle
**When** toggle varsayılan durumda görüntülendiğinde
**Then** varsayılan olarak kapalı olmalı (UX6)

**Given** HAR Timing Replay toggle açık ve HAR'da `timings.wait` değeri 500ms olan bir entry
**When** eşleşen request geldiğinde
**Then** content script mock response'u döndürmeden önce delay uygulamalı; delay HAR `timings.wait + timings.receive` toplamından hesaplanmalı (FR15)

**Given** HAR Timing Replay toggle kapalıyken
**When** herhangi bir match response döndürüldüğünde
**Then** delay uygulanmamalı; response anında dönmeli

**Given** HAR entry'de timing bilgisi eksik veya negatif olduğunda
**When** timing replay hesaplandığında
**Then** hata fırlatılmamalı; delay 0ms olarak uygulanmalı

---

## Epic 3: Chrome Extension — Monitor & Response Editing

Developer, intercept edilen her request'i canlı olarak Monitor tab'ında görür; response'ları inline düzenleyebilir, belirli endpoint'leri exclude edebilir. Guard'lı sayfalarda response override ile engellenmiş sayfalar açılabilir (Journey 2: Guard Edge Case).

### Story 3.1: Background → Popup Live Feed Push

As a developer,
I want background SW'nin intercept edilen her request'i anlık olarak açık popup'a push etmesini,
So that Monitor tab'ı gerçek zamanlı request akışını canlı göstersin; developer "Acaba çalıştı mı?" diye merak etmesin.

**Acceptance Criteria:**

**Given** popup açık ve Monitor tab seçiliyken
**When** content script bir request intercept ettiğinde
**Then** background SW aynı anda popup port'una `MATCH_EVENT` mesajı push etmeli; mesaj URL, HTTP method, eşleşme sonucu (`'rule'` | `'har'` | `'passthrough'`) ve response özeti içermeli (FR22)

**Given** background SW popup port'una push gönderdiğinde
**When** popup Angular service mesajı aldığında
**Then** `matchHistory` signal güncellenebilmeli; Angular `OnPush` change detection tetiklenmeli; Monitor tab'ındaki liste anında güncellenmeli

**Given** popup kapalıyken request'ler intercept edildiğinde
**When** popup daha sonra açıldığında
**Then** `chrome.storage.local`'daki `matchHistory`'den son N request yüklenebilmeli; popup açılışında feed boş başlamamalı

### Story 3.2: Monitor Tab — Request Feed UI

As a developer,
I want Monitor tab'ında canlı request feed'ini URL, method ve eşleşme durumu badge'iyle gösteren list UI'ı,
So that her intercept edilen request'in akıbetini ("Rule ✓" / "HAR ✓" / "Passthrough →") tek bakışta görebileyim.

**Acceptance Criteria:**

**Given** Monitor tab açık ve en az bir intercept gerçekleşmiş
**When** feed listesi görüntülendiğinde
**Then** her satırda URL (truncated), HTTP method ve eşleşme durumu badge'i gösterilmeli; "Rule ✓" yeşil, "HAR ✓" mavi, "Passthrough →" gri renk kodlaması uygulanmalı (FR20, FR21, UX3)

**Given** yeni bir request intercept edildiğinde
**When** feed güncellendiğinde
**Then** yeni satır listenin en üstüne eklenmeli; sayfa scroll durumu korunmalı

**Given** feed listesinde hiç intercept yokken
**When** Monitor tab görüntülendiğinde
**Then** "Henüz intercept edilmiş request yok. Sayfayı yenileyip bir istek başlatın." boş durum mesajı gösterilmeli

**Given** feed listesi uzadığında
**When** kullanıcı scroll yaptığında
**Then** popup height constraint'i içinde scroll çalışmalı; yeni gelen item'lar mevcut scroll pozisyonunu bozmadan üste eklenmeli

### Story 3.3: CodeMirror 6 JSON Editör Component

As a developer,
I want `hm-json-editor` Angular standalone component'ini CodeMirror 6 tabanlı,
So that response body'yi syntax-highlighted, validation'lı JSON editörde görüntüleyebileyim ve düzenleyebileyim; 400px popup constraint'i içinde kullanışlı olsun.

**Acceptance Criteria:**

**Given** `hm-json-editor` component'i `readonly: false` ile render edildiğinde
**When** editör görüntülendiğinde
**Then** CodeMirror 6 aktif olmalı; JSON syntax highlighting uygulanmalı; geçersiz JSON için inline linting gösterilmeli (UX4)

**Given** `readonly: true` input'u verildiğinde
**When** editör görüntülendiğinde
**Then** editör read-only modda olmalı; cursor yok; JSON syntax highlighting aktif olmalı

**Given** editöre geçersiz JSON girildiğinde
**When** kullanıcı yazmayı bitirdiğinde
**Then** hatalı satırda kırmızı lint işareti gösterilmeli; `valueChange` output eventi emit edilmemeli

**Given** `@codemirror/lang-json`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lint` paketleri
**When** extension popup build alındığında
**Then** toplam CodeMirror bundle katkısı 150KB'dan az olmalı (UX4)

**Given** component yazıldığında
**When** Angular architecture kuralları kontrol edildiğinde
**Then** `standalone: true`, `ChangeDetectionStrategy.OnPush`, `inject()` DI, signal-based `input()`/`output()` kullanılmış olmalı; decorator `@Input()`/`@Output()` bulunmamalı (UX5)

### Story 3.4: Response Viewer & Inline Edit & Persist

As a developer,
I want Monitor feed'deki herhangi bir satıra tıklayarak o request'in response body'sini görüntülememi ve `hm-json-editor` ile inline düzenleyip HAR session'ına persist etmemi,
So that guard'lı sayfalarda `isAdmin: false` gibi değerleri `true` yapıp sayfayı yenilediğimde guard'ı geçebileyim; değişiklik session boyunca kalıcı olsun.

**Acceptance Criteria:**

**Given** Monitor tab'ında bir feed satırına tıklandığında
**When** row seçildiğinde
**Then** ilgili request'in response body'si `hm-json-editor` edit modunda açılmalı; HTTP method, URL ve status code de gösterilmeli (FR26, UX3)

**Given** developer JSON editörde response body'yi değiştirip "Kaydet" butonuna tıkladığında
**When** kaydetme işlemi yapıldığında
**Then** değiştirilmiş response background SW'ye `UPDATE_RESPONSE` mesajı ile gönderilmeli; background SW `editedResponses` map'ini güncellemeli ve `chrome.storage.local`'a persist etmeli (FR27)

**Given** response başarıyla persist edildikten sonra
**When** sayfa aynı URL için tekrar istek yaptığında
**Then** content script intercept ettiğinde edited response dönmeli; orijinal HAR response değil, kaydedilen düzenleme kullanılmalı (FR27)

**Given** "Passthrough →" etiketli bir satıra tıklandığında
**When** response viewer açıldığında
**Then** "Bu request HAR'da eşleşmedi, düzenlenecek response yok" mesajı gösterilmeli

**Given** response düzenlenip kaydedildiğinde
**When** popup yeniden açıldığında
**Then** `editedResponses`'dan yüklenen düzenleme hala aktif olmalı; session persistence çalışıyor olmalı

### Story 3.5: Exclude List Yönetimi

As a developer,
I want Settings accordion'unda belirli endpoint'leri exclude listesine ekleyip çıkarmayı,
So that bazı API çağrılarını mock'tan hariç tutup gerçek network'e geçirebileyim; örneğin auth token refresh endpoint'ini her zaman gerçek API'ye gönderebileyim.

**Acceptance Criteria:**

**Given** Settings accordion → Exclude List bölümü
**When** developer URL pattern girip "Ekle" butonuna tıkladığında
**Then** pattern exclude list'e eklenmeli; `chrome.storage.local`'a persist olmalı (FR24, FR25)

**Given** exclude list'e bir URL pattern eklendiğinde
**When** content script o pattern'la eşleşen bir request intercept ettiğinde
**Then** mock response dönülmemeli; orijinal network request'e passthrough yapılmalı; Monitor tab'ında "Passthrough →" (excluded) olarak işaretlenmeli (FR24)

**Given** exclude list'te mevcut bir pattern olduğunda
**When** developer "Kaldır" butonuna tıkladığında
**Then** pattern listeden silinmeli; storage güncellenmeli; o endpoint'ler artık mock'a dahil edilmeli (FR25)

**Given** popup yeniden açıldığında
**When** Settings accordion görüntülendiğinde
**Then** kayıtlı exclude list `chrome.storage.local`'dan yüklenmeli; listede gösterilmeli

---

## Epic 4: Chrome Extension — Rule-Based Mock

Developer, HAR dosyası olmadan URL pattern + HTTP method + status code + response body + delay kombinasyonu ile özel mock rule'lar tanımlar; error senaryolarını ve edge case'leri test eder (Journey 3: Error Senaryosu / Rule-Based Mock).

### Story 4.1: Rule Form UI — Yeni Rule Oluşturma

As a developer,
I want Controls tab'ında Rules accordion içinde URL pattern + HTTP method + status code + response body + delay ile yeni mock rule tanımlayan bir form UI'ı,
So that HAR dosyası olmadan istediğim endpoint için herhangi bir HTTP response senaryosunu (429, 500, 200 özel body, vb.) tanımlayabileyim.

**Acceptance Criteria:**

**Given** Controls tab → Rules accordion açık
**When** "Yeni Rule Ekle" butonuna tıklandığında
**Then** rule form açılmalı; şu alanlar mevcut olmalı: URL pattern (text), HTTP method (dropdown: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS), status code (number input), response body (`hm-json-editor`), delay ms (number input, opsiyonel) (FR16, UX8)

**Given** developer form alanlarını doldurup "Kaydet" butonuna tıkladığında
**When** form validation geçildiğinde
**Then** `MockRule` nesnesi oluşturulmalı; background SW'ye `ADD_RULE` mesajı gönderilmeli; SW `activeRules`'ı güncellemeli ve `chrome.storage.local`'a persist etmeli (FR16)

**Given** URL pattern alanı boş bırakıldığında
**When** "Kaydet" butonuna tıklandığında
**Then** form validation hatası gösterilmeli; rule kaydedilmemeli; hata mesajı "URL pattern zorunludur" olmalı

**Given** response body alanına geçersiz JSON girildiğinde
**When** "Kaydet" butonuna tıklandığında
**Then** `hm-json-editor`'ün lint hatası visible olmalı; form submit engellenmeli

**Given** delay alanı boş bırakıldığında
**When** rule kaydedildiğinde
**Then** delay 0ms olarak varsaymalı; opsiyonel alan olduğu için validation hatası vermemeli

### Story 4.2: Rule List UI — Listeleme, Düzenleme & Silme

As a developer,
I want Rules accordion'ında tanımlı rule'ların listesini görüntülememi, mevcut rule'ları düzenlememi ve silmemi,
So that aktif mock rule setimi yönetilebilir halde tutayım; gereksiz rule'ları kaldırabileyim; hatalı rule'ı düzeltebiliyeyim.

**Acceptance Criteria:**

**Given** en az bir rule tanımlanmış
**When** Rules accordion açık olduğunda
**Then** her rule için URL pattern, HTTP method, status code ve delay (varsa) bir satırda özet olarak görüntülenmeli (FR17, UX8)

**Given** rule listesinde bir rule'ın "Düzenle" butonuna tıklandığında
**When** edit formu açıldığında
**Then** rule'ın mevcut değerleri form alanlarına önceden doldurulmuş olmalı; değişiklikler kaydedildiğinde `UPDATE_RULE` mesajı background SW'ye gitmeli; storage güncellenmeli (FR17)

**Given** rule listesinde bir rule'ın "Sil" butonuna tıklandığında
**When** silme işlemi onaylanır onaylanmaz
**Then** rule `activeRules`'dan kaldırılmalı; `DELETE_RULE` mesajı background SW'ye gitmeli; storage güncellenmeli; liste anlık güncellenmeli (FR17)

**Given** hiç rule tanımlanmamışken
**When** Rules accordion görüntülendiğinde
**Then** "Henüz rule tanımlanmadı. 'Yeni Rule Ekle' butonuyla başlayın." boş durum mesajı gösterilmeli

**Given** popup yeniden açıldığında
**When** Rules accordion görüntülendiğinde
**Then** `chrome.storage.local`'dan yüklenen rule'lar listede gösterilmeli; session persistence çalışıyor olmalı

### Story 4.3: Rule-First Priority Chain — HAR'sız Çalışma & Integration

As a developer,
I want tanımlı rule'ların intercept mekanizmasına tam entegrasyonunu ve HAR dosyası olmadan sadece rule'larla çalışmayı,
So that HAR yüklemeden 429 Too Many Requests, 500 Internal Server Error gibi senaryoları test edebileyim; rule varken HAR'dan önce rule kullanılsın.

**Acceptance Criteria:**

**Given** `/api/data/*` pattern'ına 429 status + `{"error": "rate_limited"}` body + 500ms delay tanımlı bir rule mevcut
**When** sayfa `/api/data/users` isteği yaptığında
**Then** content script rule eşleşmesini background SW'den almalı; 500ms delay sonra 429 status ve ilgili body ile mock response dönülmeli; hiç HAR yüklenmemiş olsa bile çalışmalı (FR18, FR19)

**Given** hem eşleşen rule hem de eşleşen HAR entry mevcut aynı URL için
**When** request intercept edildiğinde
**Then** rule response dönülmeli; HAR entry kullanılmamalı; Rule-First priority chain deterministik çalışmalı (FR18, NFR7)

**Given** eşleşen rule yok, eşleşen HAR entry var
**When** request intercept edildiğinde
**Then** HAR response dönülmeli (FR18)

**Given** ne rule ne HAR eşleşmesi var
**When** request intercept edildiğinde
**Then** orijinal network'e passthrough yapılmalı; Monitor tab'ında "Passthrough →" gösterilmeli (FR18)

**Given** delay tanımlı bir rule eşleştiğinde
**When** content script response'u oluştururken
**Then** belirtilen delay (ms) kadar bekledikten sonra mock response dönülmeli

---

## Epic 5: Angular Plugin

Angular developer'lar, `provideHarMock()` API ile uygulamalarına tek satır native HAR mock entegrasyonu sağlar; double-lock production safety garantisiyle prod'a sızma riski yapısal olarak sıfırdır. `bypassGuards: true` ile guard'lı sayfalara doğrudan erişim (Journey 4: Angular Plugin Entegrasyonu).

### Story 5.1: Angular Plugin Paket Kurulumu & `provideHarMock()` API

As an Angular developer,
I want `packages/angular-plugin`'i ng-packagr build pipeline ve `provideHarMock()` factory function ile,
So that Angular uygulamasına `app.config.ts`'e tek satır ekleyerek HAR mock entegrasyonu yapabileyim; TypeScript tam tip desteğiyle çalışsın.

**Acceptance Criteria:**

**Given** `packages/angular-plugin` dizini
**When** `yarn build:plugin` çalıştırıldığında
**Then** ng-packagr ESM paketi üretilmeli; `public-api.ts` barrel'dan tüm public API'ler export edilmeli; `@har-mock/core`'a bağımlılık var; Angular veya Chrome API'ye doğrudan bağımlılık yok (NFR10)

**Given** `provideHarMock()` factory function
**When** parametresiz çağrıldığında
**Then** zero-config defaults uygulanmalı: `harUrl: '/assets/har-mock.har'`, `mode: 'last-match'`, `enabled: true`; Angular `EnvironmentProviders` dönülmeli (FR29, FR31)

**Given** `provideHarMock({ harUrl: '/assets/custom.har', mode: 'sequential', enabled: true, bypassGuards: true, rules: [...] })` çağrısı
**When** Angular app bootstrap edildiğinde
**Then** tüm parametreler `HarMockConfig` tipine uygun şekilde algılanmalı; TypeScript autocomplete ve tip kontrolü tam çalışmalı (FR30, NFR12)

**Given** `HarMockConfig` interface'i
**When** TypeScript ile incelendiğinde
**Then** `harUrl`, `mode`, `enabled`, `bypassGuards`, `rules` alanları tam tip tanımlı olmalı; JSDoc yorumları her parametre için mevcut olmalı (NFR12)

### Story 5.2: Asset-Based HAR Yükleme & HttpClient Interceptor

As an Angular developer,
I want Angular Plugin'in `assets/har-mock.har` dosyasını HTTP fetch ile lazy load edip `HttpClient` interceptor'da HAR response'larını döndermesini,
So that `app.config.ts`'e `provideHarMock()` ekledikten sonra `assets/har-mock.har` dosyasını değiştirip uygulamayı başlattığımda tüm API’lar otomatik mock'lansın.

**Acceptance Criteria:**

**Given** `assets/har-mock.har` dosyası mevcut ve `provideHarMock()` yapılandırılmış
**When** Angular uygulaması ilk açıldığında
**Then** plugin `HttpClient` ile `harUrl` adresinden HAR dosyasını fetch etmeli; `HarParser.parseHar()` ile parse edilmeli; `AutoParameterizer.parameterize()` ile URL pattern'ları oluşturulmalı; hepsi in-memory'e yüklenmeli (FR35)

**Given** HAR başarıyla yüklenmiş
**When** Angular uygulaması herhangi bir `HttpClient` isteği yaptığında
**Then** `har-mock.interceptor.ts` (`HttpInterceptorFn`) isteği yakalamalı; `PriorityChain.resolve()` ile rule/HAR/passthrough kararı verilmeli; eşleşme varsa `HttpResponse` olarak döndürülür; eşleşme yoksa orijinal request geçer (FR32)

**Given** farklı environment'larda farklı HAR dosyası kullanılmak istenildiğinde
**When** `provideHarMock({ harUrl: environment.harUrl })` yapılandırıldığında
**Then** belirtilen URL'den HAR fetch edilmeli; farklı environment'lar farklı HAR dosyalarıyla çalışabilmeli (FR36)

**Given** `assets/har-mock.har` bulunamadığında (404)
**When** fetch hatası oluştuğunda
**Then** `HarParseError` ile anlamlı hata loglanmalı; uygulama crash etmemeli; tüm request'ler passthrough'a düşmeli (NFR13)

### Story 5.3: Double-Lock Production Safety

As an Angular developer,
I want `enabled: true` VE `isDevMode() === true` çift kilit mekanizmasının kesin olarak uygulanmasını,
So that Angular Plugin'in prod build'de hiçbir koşulda aktif olmayacağından emin olabileyim; prod'a sızma riski yapısal olarak imkânsız olsun.

**Acceptance Criteria:**

**Given** `isDevMode()` false döndüren prod build ortamı
**When** `provideHarMock({ enabled: true })` olsa bile
**Then** interceptor hiçbir request'i yaklamamalı; tüm request'ler orijinal network'e geçmeli; HAR dosyası fetch edilmemeli; guard bypass aktive edilmemeli (NFR1, NFR2)

**Given** `isDevMode()` true fakat `enabled: false` olduğunda
**When** herhangi bir `HttpClient` isteği yapıldığında
**Then** interceptor pasif kalmalı; hiçbir mock response dönülmemeli (NFR2)

**Given** `isDevMode()` true VE `enabled: true` olduğunda
**When** `HttpClient` isteği yapıldığında
**Then** interceptor aktif olmalı; match varsa HAR response dönülmeli (NFR1, NFR2)

**Given** production build (`ng build --configuration production`)
**When** Angular derleyici `isDevMode()` çözdüğünde
**Then** tree-shaking ile tüm mock logic bundle'dışı bırakılmalı veya ölü kod olarak işaretlenmeli; prod bundle'a sızmama garantisi devam etmeli (NFR1)

### Story 5.4: Guard Bypass Mekanizması

As an Angular developer,
I want `bypassGuards: true` ile dev mode'da tüm Angular route guard'larının (`CanActivate`, `CanDeactivate`, `CanMatch`) otomatik olarak devre dışı bırakılmasını,
So that guard'lı admin sayfalarına direkt URL ile gidip HAR replay ile prod state'ini görebileyim; auth guard'a takılmadan debug edebileyim.

**Acceptance Criteria:**

**Given** `provideHarMock({ bypassGuards: true, enabled: true })` yapılandırılmış ve `isDevMode()` true
**When** Angular uygulaması başlarken `APP_INITIALIZER` çalıştığında
**Then** `Router.config` recursive geçilmeli; `canActivate`, `canDeactivate`, `canMatch` array'leri boşaltılmalı; ilk navigation'dan önce tamamlanmalı (FR34, ARCH10)

**Given** guard bypass aktif olduğunda
**When** guard'lı bir route'a doğrudan navigate edildiğinde
**Then** guard fonksiyonları hiç çalışmamalı; route doğrudan yüklenebilmeli

**Given** lazy-loaded child route'larda guard'lar tanımlı olduğunda
**When** guard bypass çalıştığında
**Then** recursive Router.config traversal lazy-loaded children'daki guard'ları da temizlemeli (FR34)

**Given** `bypassGuards: false` veya `isDevMode() === false` olduğunda
**When** guard'lı bir route'a navigate edildiğinde
**Then** guard'lar normal şekilde çalışmalı; hiçbir route config mutation yapılmamalı (ARCH10)

**Given** `APP_INITIALIZER` içinde Router mutation sırasında hata oluştuğunda
**When** exception yakalandığında
**Then** hata loglanmalı ama uygulama başlatılmalı; guard'lar bypass edilmemiş haliyle çalışmaya devam etmeli
