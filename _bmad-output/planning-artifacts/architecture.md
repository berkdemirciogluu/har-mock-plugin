---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-har-mock-plugin-2026-02-21.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-21'
project_name: 'har-mock-plugin'
user_name: 'Berk'
date: '2026-02-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
36 FR, 8 ana kategoride organize edilmiş. İki bağımsız bileşen (Chrome Extension + Angular Plugin) için ayrı ama örtüşen gereksinim setleri:

- **HAR Yönetimi (FR1-FR4):** Dosya yükleme (file picker + drag & drop), HAR parse, entry extraction — her iki bileşenin giriş noktası
- **Auto-Parameterization & URL Matching (FR5-FR9):** Çekirdek algoritma — UUID, numeric ID, token tespiti ve pattern matching. Two-Phase State Recovery (null/undefined segmentler). Her iki bileşende ortak kullanılacak shared logic
- **Request Intercept & Replay (FR10-FR15):** Extension: `chrome.webRequest` API. Plugin: `HttpClient` interceptor. Sequential/Last-Match mode, HAR timing replay
- **Rule-Based Mock (FR16-FR19):** HAR'dan bağımsız çalışabilen mock rule tanımlama. Priority chain: Rules → HAR → Passthrough
- **Active Mock Overlay & Görünürlük (FR20-FR22):** Canlı request feed, eşleşme durumu badge'leri — yalnızca Extension popup'ında
- **Kullanıcı Kontrolü & Exclusion (FR23-FR25):** Default-on, selective exclusion — endpoint bazlı kontrol
- **Response Editing (FR26-FR27):** Inline JSON edit, HAR session'a persist — Monaco Editor entegrasyonu
- **Angular Plugin Spesifik (FR29-FR36):** `provideHarMock()` API, double-lock safety, `bypassGuards`, asset-based HAR loading, environment-based swap

**Non-Functional Requirements:**
13 NFR, 4 kategoride — mimari kararları doğrudan etkileyen kritik gereksinimler:

- **Security & Production Safety (NFR1-NFR4):** Double-lock mekanizması, local-only data processing, hassas veri güvenliği. Plugin'in prod'a sızmasını yapısal olarak imkânsız kılma hedefi
- **Reliability & Doğruluk (NFR5-NFR7):** %100 URL matching, byte-level response fidelity, deterministik priority chain. Hata toleransı sıfır — doğruluk aracın güvenilirliğinin temelidir
- **Integration & Uyumluluk (NFR8-NFR11):** Chrome MV3, Angular 14+, ESM/CJS dual output, HAR 1.2 standardı
- **Developer Experience (NFR12-NFR13):** TypeScript tip güvenliği, üç bileşenli hata mesajları (error type + root cause + suggested action)

**Scale & Complexity:**

- Primary domain: Frontend Developer Tool
- Complexity level: Low (general domain, mature technologies, no regulatory compliance)
- Project context: Greenfield — sıfırdan oluşturuluyor
- Resource: Solo developer
- Estimated architectural components: ~8-10 ana modül (HAR parser, auto-parameterizer, URL matcher, priority chain, request interceptor ×2, state manager, UI shell, rule engine)

### Technical Constraints & Dependencies

1. **Chrome MV3 API kısıtları:** `chrome.webRequest` blocking mode MV3'te `declarativeNetRequest`'e geçiş riski taşıyor. Extension mimarisi bu API seçimine bağımlı — erken doğrulama kritik
2. **Popup lifecycle:** Chrome Extension popup kapandığında state kaybolur — background script/service worker ile persistent state yönetimi gerekli
3. **Angular 14+ geriye uyumluluk:** `provideHarMock()` API standalone pattern kullanıyor ama Angular 14'te bu pattern yeni — eski module-based projelerde de çalışması gerekebilir
4. **Monaco Editor bundle size:** Full Monaco ~2MB+ — popup'ta compact JSON-only build gerekli, lazy load stratejisi
5. **HAR dosya boyutu:** Büyük HAR dosyaları (10MB+) — parse performansı ve bellek yönetimi
6. **İki bağımsız release cycle:** Extension (Chrome Web Store review) ve Plugin (npm publish) farklı dağıtım kanalları ve süreleri

### Cross-Cutting Concerns Identified

1. **Shared Core Engine:** Auto-parameterization, URL pattern matching ve priority chain mantığı hem Extension hem Plugin tarafından kullanılacak. Bu logic'in platform-agnostik bir core modülde izole edilmesi gerekiyor
2. **HAR Parse & Validation:** HAR 1.2 standardına uygun parser her iki bileşende ortak. Geçersiz HAR dosyası handling mekanizması tutarlı olmalı
3. **State Management:** Extension'da popup ↔ background script state sync, Plugin'de Angular service state — farklı mekanizmalar ama benzer durum modeli (loaded HAR, active rules, match history, edited responses)
4. **Error Handling Strategy:** NFR13 gerekliliği — üç bileşenli hata mesajları (type + cause + action) tüm modüllerde tutarlı uygulanmalı
5. **TypeScript Tip Sistemi:** Shared types/interfaces (HarEntry, UrlPattern, MockRule, MatchResult vb.) her iki bileşende ortak kullanılacak
6. **Test Strategy:** %100 URL matching doğruluğu hedefi — auto-parameterization ve pattern matching için kapsamlı unit test coverage gerekli

## Starter Template Evaluation

### Primary Technology Domain

Frontend Developer Tool — Chrome Extension (Angular popup + MV3 background service worker) + Angular npm paketi. Standart web app starter template'leri uygulanamaz; proje monorepo yapısında sıfırdan kurulacak.

### Starter Options Considered

**1. Hazır Angular Chrome Extension Starter Template'leri**
GitHub'da mevcut Angular + Chrome Extension starter'ları incelendi. Büyük çoğunluğu eski Angular versiyonları (v12-15) ve MV2 formatında. MV3 uyumlu olanlar da monorepo yapısı, shared core paketi ve npm plugin dağıtımı için uygun değil. Sonuç: Uygun değil.

**2. Nx Workspace + Angular Plugin**
Nx, Angular ekosistemiyle derinlemesine entegre. Generator'lar, affected build, computation cache sunuyor. Ancak 3 paketlik solo developer projesinde öğrenme eğrisi ve konfigürasyon overhead'i gereksiz. Sonuç: Aşırı mühendislik.

**3. Turborepo + Angular**
Hızlı, minimal config, cache desteği. Ancak Angular CLI ile doğrudan entegrasyonu yok — ek konfigürasyon gerektirir. Sonuç: Pratik değil, Angular-native değil.

**4. Yarn Workspaces + Angular CLI + Custom Build (Seçilen)**
Yarn workspaces zaten paket yöneticisinin built-in özelliği. İlave araç kurulumu yok. Angular CLI ile popup build, custom script ile Extension packaging, ayrı tsconfig/jest config ile her paket bağımsız test edilebilir. Tam kontrol, zero overhead.

### Selected Approach: Yarn Workspaces + Sıfırdan Kurulum

**Rationale:**
- Solo developer için minimum ceremony — Nx/Turborepo öğrenme maliyeti yok
- 3 paket yeterince az — otomatik dependency graph ve cache gerekmiyor
- Angular CLI zaten popup build'i yönetiyor — ek build orchestration gereksiz
- Custom build script ile Extension manifest, background script ve popup output'u birleştirme tam kontrol imkânı
- İleride ölçek büyürse Turborepo veya Nx'e migrasyon kolay

**Initialization Commands:**

```bash
# 1. Monorepo root
mkdir har-mock-plugin && cd har-mock-plugin
yarn init -y

# 2. Workspace config (package.json)
# "workspaces": ["packages/*"]

# 3. Shared core paketi
mkdir -p packages/core
cd packages/core && yarn init -y
# package.json: "name": "@har-mock/core"

# 4. Chrome Extension (Angular popup)
cd ../..
ng new extension --directory packages/extension --style css --routing false --skip-git
# Angular CLI ile popup oluştur, sonra manifest.json + background.js ekle

# 5. Angular Plugin
mkdir -p packages/angular-plugin
cd packages/angular-plugin && yarn init -y
# package.json: "name": "har-mock-plugin"
```

**Architectural Decisions Provided by This Setup:**

**Language & Runtime:**
- TypeScript (strict mode) — tüm paketlerde
- Shared tsconfig.base.json root'ta, her paket extends ile miras alır
- Path aliases: `@har-mock/core` → `packages/core/src`

**Styling Solution:**
- Tailwind CSS — Extension popup'ta (UX Spec kararı)
- Angular Plugin'de stil yok (headless npm paketi)

**Build Tooling:**
- `packages/core`: tsc (pure TypeScript library, ESM + CJS dual output)
- `packages/extension`: Angular CLI build + custom post-build script (manifest.json inject, background.js bundle)
- `packages/angular-plugin`: ng-packagr (Angular library standardı, ESM + CJS)

**Testing Framework:**
- Jest — tüm paketlerde
- `packages/core`: Jest standalone (framework bağımsız unit test)
- `packages/extension`: Jest + Angular testing utilities
- `packages/angular-plugin`: Jest + Angular testing utilities

**Code Organization:**

```
har-mock-plugin/
├── package.json              # workspaces: ["packages/*"]
├── tsconfig.base.json        # shared TypeScript config
├── jest.config.base.js       # shared Jest config
├── .eslintrc.json            # shared ESLint config
├── .prettierrc               # shared Prettier config
├── packages/
│   ├── core/                 # @har-mock/core
│   │   ├── src/
│   │   │   ├── har-parser/
│   │   │   ├── auto-parameterizer/
│   │   │   ├── url-matcher/
│   │   │   ├── priority-chain/
│   │   │   ├── rule-engine/
│   │   │   └── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   ├── extension/            # Chrome Extension
│   │   ├── src/
│   │   │   ├── popup/        # Angular app
│   │   │   ├── background/   # Service worker
│   │   │   └── manifest.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   └── angular-plugin/       # har-mock-plugin npm paketi
│       ├── src/
│       │   ├── lib/
│       │   └── public-api.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── ng-package.json
│       └── jest.config.js
```

**Development Experience:**
- `yarn install` — tüm bağımlılıkları tek seferde kurar
- Cross-package link'ler otomatik (workspace protocol)
- Root-level scripts: `yarn build:core`, `yarn build:extension`, `yarn build:plugin`, `yarn test:all`
- Hot reload: Angular CLI dev server (popup geliştirme), Extension reload via Chrome

**Note:** Proje initialization (monorepo setup, workspace config, Angular CLI scaffold, manifest.json oluşturma) ilk implementation story olmalı.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Request intercept mekanizması (Extension)
2. State management & persistence
3. Messaging architecture
4. Auto-parameterization algoritması
5. Angular Plugin interceptor yaklaşımı

**Important Decisions (Shape Architecture):**
6. Guard bypass mekanizması
7. Popup ↔ Background iletişimi
8. JSON editor seçimi
9. Core paket module stratejisi
10. Error handling pattern

**Deferred Decisions (Post-MVP):**
- Multi-HAR desteği state management etkisi
- CI/CD pipeline detayları
- Framework-agnostik plugin extension stratejisi

### Request Intercept Mechanism (Extension)

**Decision:** Fetch/XHR Monkey-Patching via Content Script (`"world": "MAIN"`)

**Rationale:**
- Chrome MV3 + Chrome Web Store uyumlu — `webRequestBlocking` MV3'te policy-installed extension dışında kullanılamaz
- `window.fetch` ve `XMLHttpRequest.prototype` override ile tam response body kontrolü
- Content script `"world": "MAIN"` ile sayfanın JS context'ine enjekte — sayfanın fetch/XHR çağrılarını doğrudan yakalar
- HAR timing replay doğal — response dönmeden önce delay simülasyonu
- Proje amacı API call intercept — HTML-initiated request'ler (img, link) kapsam dışı

**Architecture Flow:**
```
Popup (Angular) ←port→ Background Service Worker (state, HAR data, patterns)
                              ↕ chrome.runtime.connect (port)
                         Content Script (MAIN world)
                         - window.fetch override
                         - XMLHttpRequest override
                         - URL → background match query → HAR response veya passthrough
```

**Affects:** Extension core, content script, background service worker

### State Management & Persistence

**Decision:** Hibrit — `chrome.storage.local` (persist) + Background SW in-memory cache

**Rationale:**
- MV3 service worker idle olunca ölür (30s inactivity) — in-memory state kaybolur
- `chrome.storage.local` ile HAR data, rules, edited responses persist edilir
- `unlimitedStorage` izni ile büyük HAR dosyaları da sorunsuz saklanır
- Background SW başladığında storage'dan cache'e yükler — hızlı okuma
- Content script'e HAR data kopyalanmaz — sadece match result gönderilir
- Popup kapansa bile mock çalışmaya devam eder (content script + background SW aktif)

**State Model:**
- `harData`: Parsed HAR entries + auto-parameterized URL patterns
- `activeRules`: User-defined mock rules
- `matchHistory`: Request match log (Monitor tab feed)
- `editedResponses`: Response düzenlemeleri (persist)
- `settings`: Extension toggle, replay mode, exclude list
- `accordionStates`: UI accordion açık/kapalı durumları

**Affects:** Tüm bileşenler — background SW, popup, content script

### Messaging Architecture

**Decision:** Port-based long-lived connections (tüm communication channel'lar)

**Content Script ↔ Background SW:**
- `chrome.runtime.connect()` ile persistent port
- Her yakalanan request için port üzerinden match query
- Background match result döner → content script response oluşturur veya passthrough
- Sayfa navigate edince port kopması doğal — yeni sayfada yeni port

**Popup ↔ Background SW:**
- Aynı port-based pattern
- Popup açılınca port açılır → background mevcut state dump eder
- Background → popup push: yeni request bildirimleri (Monitor tab canlı feed)
- Popup kapanınca port kopması doğal — mock kesintisiz devam eder

**Rationale:**
- Debug oturumunda onlarca/yüzlerce request — sendMessage'ın her seferinde yeni connection kurması gereksiz
- Port ile SW'ye "aktif" sinyali gider — idle timeout'u önler
- Bidirectional — canlı feed push için gerekli
- Tutarlı pattern — tüm communication aynı mekanizmayı kullanır

**Affects:** Background SW, content script, popup Angular app

### Auto-Parameterization Algorithm

**Decision:** Regex-based segment classification — deterministik, sıralı regex testi

**Algorithm:**
Her URL path segment'i sırayla test edilir (en spesifikten en genele):
1. UUID: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
2. Numeric ID: `/^\d+$/`
3. Hex token: `/^[0-9a-f]{16,}$/i`
4. JWT/Base64: `/^[A-Za-z0-9_-]{20,}$/`
5. Null/undefined (Two-Phase State Recovery): `/^(null|undefined|)$/`
6. Eşleşme yoksa → static segment (olduğu gibi kalır)

**Rationale:**
- %100 doğruluk hedefi deterministik algoritma gerektirir
- Gerçek API URL'lerindeki dinamik segmentler neredeyse her zaman bu kategorilere düşer
- Yeni pattern tipi eklemek → yeni regex + priority eklemek — modüler ve genişletilebilir
- PRD'de "regex tabanlı algoritma" zaten belirtilmiş

**Affects:** `@har-mock/core` — auto-parameterizer modülü, Extension ve Plugin ortak kullanır

### Angular Plugin — Interceptor Approach

**Decision:** Functional Interceptor (`HttpInterceptorFn`) — Angular 15+ minimum versiyon

**Rationale:**
- `provideHarMock()` API zaten standalone pattern — functional interceptor doğal uyum
- `provideHttpClient(withInterceptors([harMockInterceptor]))` ile entegrasyon
- Angular 14 Kasım 2023'te EOL — 2026'da aktif kullanım çok düşük
- Tree-shakeable, daha az boilerplate
- PRD'deki Angular 14+ hedefi → Angular 15+ olarak güncellendi (mimari karar)

**Affects:** `packages/angular-plugin` — interceptor, `provideHarMock()` API

### Angular Plugin — Guard Bypass Mechanism

**Decision:** `APP_INITIALIZER` ile Router config mutation

**Approach:**
`APP_INITIALIZER`'da `Router.config`'i recursive gezip `canActivate`, `canDeactivate`, `canMatch` array'lerini boşaltmak — ilk navigation'dan önce tamamlanır.

**Activation Condition:** `isDevMode() && enabled && bypassGuards` — üçü de `true` olmalı (double-lock + bypassGuards)

**Rationale:**
- Angular Router public API (`Route` interface) kullanılır — private API bağımlılığı yok
- İlk navigation'dan önce tamamlanır — guard'lar hiç çalışmaz
- Lazy loaded children için de recursive traversal

**Affects:** `packages/angular-plugin` — guard bypass provider

### JSON Editor

**Decision:** CodeMirror 6 (Monaco Editor yerine)

**Packages:** `@codemirror/lang-json`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lint`

**Rationale:**
- Popup 400px genişliğinde — Monaco'nun %90 özelliği kullanılmayacak
- CodeMirror 6: ~50-100KB vs Monaco: ~500KB+ — Extension bundle size kritik
- JSON syntax highlighting, validation (linting), read-only/edit toggle — tüm UX gereksinimleri karşılanır
- Web Worker gerektirmez — main thread'de verimli çalışır
- UX Spec güncellendi — aynı kullanıcı deneyimi daha hafif araçla sağlanıyor

**Affects:** `packages/extension` — ResponseDetailComponent, RuleFormComponent

### Core Package Module Strategy

**Decision:** Unbundled TypeScript source (geliştirme) + ESM only (ileride publish)

**Rationale:**
- Geliştirme: monorepo'da TypeScript path alias ile doğrudan source import — build adımı yok, anında type-check
- Extension ve Plugin bundler'ları TypeScript'i doğrudan compile eder
- MVP'de `@har-mock/core` ayrı npm publish edilmez — sadece monorepo internal dependency
- Publish gerekirse: ESM only yeterli — tüm tüketiciler ESM destekliyor

**Affects:** `packages/core` — build config, tsconfig path aliases

### Error Handling Pattern

**Decision:** Custom Error class hierarchy

**Error Classes:**
- `HarMockError` (abstract base) — `type`, `rootCause`, `suggestedAction` property'leri
- `HarParseError` — geçersiz HAR dosyası
- `UrlMatchError` — URL eşleştirme hatası
- `RuleValidationError` — geçersiz rule tanımı
- `StorageError` — chrome.storage işlem hatası
- `MessagingError` — port/messaging hatası

**Rationale:**
- NFR13: error type + root cause + suggested action — üç bileşen zorunlu
- TypeScript `instanceof` ile tip güvenli catch
- Core'dan export — Extension ve Plugin aynı error class'larını kullanır

**Affects:** `@har-mock/core` — tüm modüller tarafından kullanılır

### Decision Impact Analysis

**Implementation Sequence:**
1. `@har-mock/core` (HAR parser, auto-parameterizer, URL matcher, priority chain, rule engine, error classes, shared types)
2. Extension background service worker (state management, chrome.storage, port messaging hub)
3. Extension content script (fetch/XHR override, background port messaging)
4. Extension popup (Angular app, Tailwind CSS, CodeMirror 6)
5. Angular Plugin (functional interceptor, guard bypass, `provideHarMock()` API)

**Cross-Component Dependencies:**
- Content script → Background SW: port messaging, match queries, response retrieval
- Popup → Background SW: port messaging, state sync, live feed subscription
- Extension → Core: auto-parameterization, URL matching, priority chain, error classes
- Plugin → Core: aynı shared logic (platform-agnostik)
- Core: Angular ve Chrome API'ye sıfır bağımlılık — saf TypeScript

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Kritik Çakışma Noktaları: 7 alan** — dosya isimlendirme, tip tanımları, messaging protocol, URL pattern temsili, error propagation, Angular component yapısı, export stratejisi.

### Naming Patterns

**Dosya & Klasör İsimlendirme:**
- TypeScript dosyaları: `kebab-case.ts` — ör: `har-parser.ts`, `url-matcher.ts`
- Angular component klasörleri: `kebab-case/` — ör: `drop-zone/`
- Angular component dosyaları: `kebab-case.component.ts`, `kebab-case.component.html`
- Test dosyaları: colocated, `*.spec.ts` — ör: `har-parser.spec.ts` (`har-parser.ts` yanında)
- Type/interface dosyaları: `*.types.ts` — ör: `har.types.ts`, `rule.types.ts`
- Error class dosyaları: `*.errors.ts` — ör: `har-parse.errors.ts`

**Kod İsimlendirme:**
- Class/Interface/Type: `PascalCase`
- Fonksiyon/method/değişken: `camelCase`
- Sabitler: `SCREAMING_SNAKE_CASE` — ör: `MAX_HAR_SIZE`
- Enum: `PascalCase`, değerleri: `SCREAMING_SNAKE_CASE`
- Angular component selector prefix: `hm-` — ör: `hm-drop-zone`, `hm-feed-row`

### Structure Patterns

**TypeScript Tip Tanımları:**
- `interface` — dışa açık API kontratları için (ör: `HarEntry`, `MockRule`, `MatchResult`)
- `type` — union, intersection, utility type'lar için (ör: `ReplayMode = 'sequential' | 'last-match'`)
- Shared type'lar: `packages/core/src/types/` — paket-specific type'lar kendi paketlerinde
- `readonly` — immutable property'lerde zorunlu (state objeleri)
- `as const` — sabit literal objelerde (error code'lar, regex pattern'ları)
- `any` — **yasak**; `unknown` kullanılır, sonra type guard ile daraltılır

**Core Package Export Yapısı:**
- `packages/core/src/index.ts` — tek public API barrel export
- Her modül kendi klasöründe `index.ts` ile export, core `index.ts` bunları re-export eder
- İç implementation dosyaları hiçbir zaman doğrudan import edilmez — sadece barrel'dan
- Circular import **yasak**: Core hiçbir zaman Extension veya Plugin'i import etmez

```typescript
// packages/core/src/index.ts — TEK giriş noktası
export { HarParser } from './har-parser/index';
export { AutoParameterizer } from './auto-parameterizer/index';
export { UrlMatcher } from './url-matcher/index';
export { PriorityChain } from './priority-chain/index';
export { RuleEngine } from './rule-engine/index';
export * from './types/index';
export * from './errors/index';

// DOĞRU
import { HarParser, UrlMatcher } from '@har-mock/core';
// YANLIŞ
import { HarParser } from '../../core/src/har-parser/har-parser';
```

**Angular Component Yapısı:**
- Tüm component'ler **standalone** (`standalone: true`) — `NgModule` yasak
- `ChangeDetectionStrategy.OnPush` — tüm component'lerde zorunlu
- Template: ayrı `.html` dosyası — inline template yasak
- Input/Output: Angular signal-based `input()` / `output()` — decorator `@Input()` / `@Output()` yasak
- DI: `inject()` fonksiyonu — constructor injection yasak
- Selector prefix: `hm-` (har-mock)

```typescript
// DOĞRU pattern
@Component({
  selector: 'hm-drop-zone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drop-zone.component.html',
  imports: [CommonModule]
})
export class DropZoneComponent {
  readonly onFileLoaded = output<File>();
  private readonly harParser = inject(HarParserService);
}
```

### Format Patterns

**URL Pattern Temsili:**

```typescript
interface UrlPattern {
  readonly original: string;       // HAR'daki orijinal URL (yalnızca display)
  readonly template: string;       // Parameterize: /api/users/{param}/orders
  readonly segments: PatternSegment[];
  readonly method: HttpMethod;
}

type PatternSegment =
  | { kind: 'static';  value: string }
  | { kind: 'dynamic'; paramType: 'uuid' | 'numeric' | 'hex' | 'base64' | 'nullable' };

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

- Pattern matching skoru: static segment sayısı — daha uzun static prefix = daha yüksek öncelik
- `original` field: sadece debug/monitor display — matching'de kullanılmaz

**Chrome Extension Messaging Protocol:**

```typescript
interface Message<T = unknown> {
  type: MessageType;   // enum — tüm type'lar merkezi tanımlı
  payload: T;
  requestId?: string;  // popup→background isteklerinde zorunlu
}

interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { type: string; message: string; };
}
```

- `MessageType` enum: `packages/extension/src/types/messaging.types.ts`'de merkezi
- Port name convention: `'har-mock-content-{tabId}'` (content script), `'har-mock-popup'` (popup)
- Message handler pattern: `switch (message.type)` — `if/else` yasak
- `requestId`: popup → background'da zorunlu, background → popup push'larında opsiyonel

### Process Patterns

**Error Propagation & Handling:**
- Core modüller: `throw HarMockError` — async'te `Promise.reject` değil, `throw`
- Angular Plugin: `throwError(() => new HarParseError(...))` Observable pipeline'da
- Extension background: her port message handler `try/catch` sarılır, hata `MessageResponse.error`'a map edilir
- Logging: `console.warn` sadece geliştirme modunda — production'da sessiz
- **Yasak**: `console.error` bırakıp devam etme — ya handle et ya throw et

**Content Script Error Pattern (kritik):**
```typescript
// Mock başarısız olursa orijinal fetch'e düş — uygulamayı asla kırma
try {
  const harResponse = await queryBackground(url, method);
  if (harResponse) return buildResponse(harResponse);
} catch {
  // sessiz passthrough
}
return originalFetch(input, init);
```

### Enforcement Guidelines

**Tüm AI Agent'lar ZORUNLU olarak:**
- Dosya isimlendirmede `kebab-case.ts` kullanır
- `any` type kullanmaz — `unknown` + type guard
- Core'u sadece barrel export'tan import eder (`@har-mock/core`)
- Angular component'leri `standalone: true` + `OnPush` + `inject()` ile yazar
- Chrome messaging'de `Message<T>` / `MessageResponse<T>` yapısını kullanır
- `UrlPattern` interface'ini değiştirmez — ekler, silmez
- Content script'te mock hatalarını sessiz passthrough ile ele alır
- Error class'larını Core'dan import eder, yeni Error subclass yazmaz (önce mevcut class'larla çözmeye çalışır)

**Anti-Pattern Örnekleri:**

```typescript
// YANLIŞ: any kullanımı
function parseHar(data: any): any { ... }

// DOĞRU:
function parseHar(data: unknown): HarFile { ... }

// YANLIŞ: doğrudan implementation import
import { HarParser } from '../../core/src/har-parser/har-parser';

// DOĞRU:
import { HarParser } from '@har-mock/core';

// YANLIŞ: constructor injection
constructor(private readonly parser: HarParserService) {}

// DOĞRU:
private readonly parser = inject(HarParserService);
```


---

## Proje Yapisi & Sinirlar

### FR Kategorisi -> Mimari Bilesen Haritasi

| FR Kategorisi | Paket | Dizin |
|---|---|---|
| HAR Yonetimi (FR1-5) | `packages/core` | `har-parser/` |
| URL Eslestirme (FR6-11) | `packages/core` | `url-matcher/`, `auto-parameterizer/` |
| Oncelik & Kural Motoru (FR12-16) | `packages/core` | `priority-chain/`, `rule-engine/` |
| Istek Yakalama (FR17-21) | `packages/extension` | `content/` |
| Durum Yonetimi (FR22-26) | `packages/extension` | `background/` |
| Popup UI (FR27-31) | `packages/extension` | `popup/` |
| Angular Entegrasyonu (FR32-36) | `packages/angular-plugin` | `lib/interceptor/`, `lib/initializer/` |
| Hata Yonetimi (Cross-cutting) | `packages/core` | `errors/` |

### Tam Proje Dizin Yapisi

```
har-mock-plugin/
├── package.json                        # Yarn Workspaces root
├── tsconfig.base.json                  # Shared TS strict config
├── jest.config.base.js                 # Shared Jest config
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── README.md
│
├── packages/
│   │
│   ├── core/                           # @har-mock/core - saf TypeScript
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── src/
│   │       ├── index.ts                # Tek barrel export noktasi
│   │       │
│   │       ├── types/
│   │       │   ├── har.types.ts        # HAR spec interfaceleri (HarFile, HarEntry)
│   │       │   ├── rule.types.ts       # MockRule, RulePriority, RuleMatch
│   │       │   ├── url-pattern.types.ts # UrlPattern, PatternSegment discriminated union
│   │       │   └── index.ts
│   │       │
│   │       ├── errors/
│   │       │   ├── har-mock.error.ts   # HarMockError base class
│   │       │   ├── har-parse.error.ts  # HarParseError
│   │       │   ├── url-match.error.ts  # UrlMatchError
│   │       │   ├── rule-engine.error.ts
│   │       │   ├── storage.error.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── har-parser/
│   │       │   ├── har-parser.ts       # parseHar(raw): HarFile
│   │       │   ├── har-validator.ts    # validateHarSchema(harFile): void
│   │       │   ├── har-parser.spec.ts
│   │       │   ├── har-validator.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── auto-parameterizer/
│   │       │   ├── auto-parameterizer.ts    # parameterize(entry[]): UrlPattern[]
│   │       │   ├── segment-classifier.ts    # classifySegment(seg): PatternSegment
│   │       │   ├── auto-parameterizer.spec.ts
│   │       │   ├── segment-classifier.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── url-matcher/
│   │       │   ├── url-matcher.ts      # matchUrl(url, pattern): RuleMatch | null
│   │       │   ├── pattern-compiler.ts # compilePattern(pattern): RegExp
│   │       │   ├── url-matcher.spec.ts
│   │       │   ├── pattern-compiler.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── priority-chain/
│   │       │   ├── priority-chain.ts   # selectRule(matches): MockRule
│   │       │   ├── priority-chain.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       └── rule-engine/
│   │           ├── rule-engine.ts      # evaluate(request): MockResponse | null
│   │           ├── rule-engine.spec.ts
│   │           └── index.ts
│   │
│   ├── extension/                      # Chrome Extension MV3
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   ├── webpack.config.js           # Popup + background + content script build (@ngtools/webpack AOT + babel-loader Angular Linker)
│   │   ├── tailwind.config.js
│   │   │
│   │   ├── public/
│   │   │   ├── manifest.json           # MV3 manifest
│   │   │   ├── icon-16.png
│   │   │   ├── icon-48.png
│   │   │   └── icon-128.png
│   │   │
│   │   └── src/
│   │       │
│   │       ├── background/             # Service Worker
│   │       │   ├── background.ts       # SW entry point, Port listener
│   │       │   ├── rule-store.ts       # chrome.storage.local + in-memory cache
│   │       │   ├── port-manager.ts     # Content/Popup port registry
│   │       │   ├── message-handler.ts  # switch(msg.type) dispatcher
│   │       │   ├── rule-store.spec.ts
│   │       │   ├── port-manager.spec.ts
│   │       │   ├── message-handler.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── content/                # Content Script (world: ISOLATED; Story 2.4'te MAIN world injection stratejisi eklenecek)
│   │       │   ├── content.ts          # Entry: monkey-patch + port baglantisi
│   │       │   ├── fetch-interceptor.ts # window.fetch override
│   │       │   ├── xhr-interceptor.ts  # XMLHttpRequest override
│   │       │   ├── mock-resolver.ts    # SW'ye mesaj -> mock response
│   │       │   ├── fetch-interceptor.spec.ts
│   │       │   ├── xhr-interceptor.spec.ts
│   │       │   ├── mock-resolver.spec.ts
│   │       │   └── index.ts
│   │       │
│   │       ├── popup/                  # Angular 15+ Standalone App
│   │       │   ├── main.ts             # bootstrapApplication()
│   │       │   ├── app.component.ts    # Root: <hm-root>
│   │       │   ├── app.component.html
│   │       │   ├── app.component.spec.ts
│   │       │   │
│   │       │   ├── components/
│   │       │   │   ├── har-upload/
│   │       │   │   │   ├── hm-har-upload.component.ts
│   │       │   │   │   ├── hm-har-upload.component.html
│   │       │   │   │   └── hm-har-upload.component.spec.ts
│   │       │   │   │
│   │       │   │   ├── rule-list/
│   │       │   │   │   ├── hm-rule-list.component.ts
│   │       │   │   │   ├── hm-rule-list.component.html
│   │       │   │   │   └── hm-rule-list.component.spec.ts
│   │       │   │   │
│   │       │   │   ├── rule-editor/
│   │       │   │   │   ├── hm-rule-editor.component.ts
│   │       │   │   │   ├── hm-rule-editor.component.html
│   │       │   │   │   └── hm-rule-editor.component.spec.ts
│   │       │   │   │
│   │       │   │   ├── json-editor/
│   │       │   │   │   ├── hm-json-editor.component.ts    # CodeMirror 6 wrapper
│   │       │   │   │   ├── hm-json-editor.component.html
│   │       │   │   │   └── hm-json-editor.component.spec.ts
│   │       │   │   │
│   │       │   │   ├── mock-toggle/
│   │       │   │   │   ├── hm-mock-toggle.component.ts    # Global on/off switch
│   │       │   │   │   ├── hm-mock-toggle.component.html
│   │       │   │   │   └── hm-mock-toggle.component.spec.ts
│   │       │   │   │
│   │       │   │   └── status-bar/
│   │       │   │       ├── hm-status-bar.component.ts
│   │       │   │       ├── hm-status-bar.component.html
│   │       │   │       └── hm-status-bar.component.spec.ts
│   │       │   │
│   │       │   └── services/
│   │       │       ├── extension-messaging.service.ts  # Popup<->BG port yonetimi
│   │       │       ├── rule-state.service.ts           # Signal-based kural durumu
│   │       │       ├── extension-messaging.service.spec.ts
│   │       │       └── rule-state.service.spec.ts
│   │       │
│   │       └── shared/                 # Extension ici paylasimli
│   │           ├── messages.types.ts   # Message<T> / MessageResponse<T>
│   │           ├── constants.ts        # Port adlari, storage keyleri
│   │           └── index.ts
│   │
│   └── angular-plugin/                 # @har-mock/angular - npm paketi
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.lib.json
│       ├── jest.config.js
│       ├── ng-package.json             # ng-packagr config
│       └── src/
│           ├── public-api.ts           # Disa acilan tek barrel
│           └── lib/
│               ├── interceptor/
│               │   ├── har-mock.interceptor.ts     # HttpInterceptorFn
│               │   ├── har-mock.interceptor.spec.ts
│               │   └── index.ts
│               │
│               ├── initializer/
│               │   ├── har-mock.initializer.ts     # APP_INITIALIZER + Router mutation
│               │   ├── har-mock.initializer.spec.ts
│               │   └── index.ts
│               │
│               ├── provider/
│               │   ├── provide-har-mock.ts         # provideHarMock() factory fn
│               │   ├── provide-har-mock.spec.ts
│               │   └── index.ts
│               │
│               └── types/
│                   ├── har-mock-config.types.ts    # HarMockConfig, PluginOptions
│                   └── index.ts
```

### Mimari Sinirlar

**Paket Bagimlilik Sinirlari:**
- `@har-mock/core` -> Angular veya Chrome API'ye **sifir bagimlilik** — saf TypeScript
- `packages/extension` -> `@har-mock/core`'u tuketir; `@har-mock/angular`'a bagimli **degil**
- `@har-mock/angular` -> `@har-mock/core`'u tuketir; Chrome API'ye bagimli **degil**
- Dongüsel bagimlilik yasak: `core <- extension <- (popup Angular app)`; `core <- angular-plugin`

**Iletisim Sinirlari:**

```
[Popup Angular App]
    <-> Port (chrome.runtime — uzun omurlu baglanti)
[Background Service Worker]
    <-> Port (chrome.runtime — uzun omurlu baglanti)
[Content Script (world: MAIN)]
    <-> window.fetch / XMLHttpRequest monkey-patch
[Web Page Requests]

[Kullanicinin Angular Uygulamasi]
    -> provideHarMock() ile HttpClient pipeline'a eklenir
    -> HttpInterceptorFn -> @har-mock/core rule-engine (dogrudan)
    (Extension'dan bagimsiz — ayri deployment senaryosu)
```

**Veri Akisi:**
1. HAR yukleme -> `core/har-parser` -> `core/auto-parameterizer` -> `MockRule[]`
2. Kurallar -> `chrome.storage.local` (kalici) + background in-memory cache (hizli okuma)
3. Istek yakalama -> content script -> SW'ye port mesaji -> `rule-engine.evaluate()` -> mock response
4. Angular plugin -> `rule-engine.evaluate()` dogrudan tuketir (Extension bagimsiz ortamlar)

**Entegrasyon Noktalari:**
- `manifest.json` -> content script entry: `src/content/content.ts`, background: `src/background/background.ts`
- Webpack -> 3 ayri entry point: `popup/main.ts`, `background/background.ts`, `content/content.ts`
- Webpack build pipeline: `@ngtools/webpack` (AngularWebpackPlugin, AOT) + `babel-loader` (`@angular/compiler-cli/linker/babel` — Angular partial declarations linker)
- Angular 18 paketleri APF (Angular Package Format) ile partial declarations formatta yayinlanir — `babel-loader` ile linker plugin bu deklarasyonlari runtime-uyumlu hale donusturur
- `ng-packagr` -> `@har-mock/angular` ESM paketi; `public-api.ts` uzerinden disa acilir
- `@har-mock/core` -> workspace icinde path alias (`@har-mock/core -> packages/core/src/index.ts`), yayinlamada ESM


---

## Mimari Dogrulama Sonuclari

### Tutarlilik Dogrulamasi

**Karar Uyumlulugu:**

| Karar Cifti | Durum | Not |
|---|---|---|
| Monkey-patching (world: MAIN) + Port baglantisi | GECTI | MAIN world, chrome.runtime kullanabilir |
| Angular 15+ + HttpInterceptorFn + signal I/O | GECTI | Angular 15'te birlikte destekleniyor |
| SW idle timeout + Port keep-alive + storage.local | GECTI | Port mesajlari SW'yi uyanik tutar, storage kalicilik saglar |
| CodeMirror 6 + Angular standalone component | GECTI | Conflict yok, wrapper component pattern uygun |
| Yarn Workspaces + @har-mock/core barrel export | GECTI | Path alias ile dev, ESM ile publish tutarli |
| HarMockError hierarchy + content script silent passthrough | GECTI | Kullanici deneyimi bozulmuyor, hata loglanıyor |
| Unbundled TS core + Angular plugin ng-packagr | GECTI | Core: raw TS; Angular plugin: ng-packagr ESM — cakismiyor |

Onemli uyum notu: Content script "world": "MAIN" oldugunda chrome.runtime.connect() hala kullanilabilir — intercept scope ile messaging scope cakismiyor.

**Pattern Tutarliligi:**
- Dosya isimlendirme: kebab-case tum paketlerde tutarli
- Test dosyalari: konum *.spec.ts tum paketlerde tutarli
- Messaging: Message<T> / MessageResponse<T> sozlesmesi tum port iletisimlerinde tutarli
- Hata yayilimi: throw pattern (core/Angular), silent passthrough (content script) net ayirt edilmis
- Angular component yapisi: standalone + OnPush + inject() + signal I/O tum bilesenlerde tutarli

**Yapi Uyumu:**
- Her FR kategorisi bir veya daha fazla dizine eslenmis
- Paket sinirlarindan sapma yolu yok (core -> Angular/Chrome API: sifir bagimlilik)
- Background/content/popup ayri entry pointleri webpack ile saglanmis

### Gereksinim Kapsama Dogrulamasi

**FR Kategorileri (36 FR):**

| Kategori | FRler | Mimari Karsiligi | Durum |
|---|---|---|---|
| HAR Yonetimi (FR1-5) | 5 | core/har-parser/, core/har-validator | KAPLI |
| URL Eslestirme (FR6-11) | 6 | core/url-matcher/, core/auto-parameterizer/ | KAPLI |
| Oncelik ve Kural (FR12-16) | 5 | core/priority-chain/, core/rule-engine/ | KAPLI |
| Istek Yakalama (FR17-21) | 5 | content/fetch-interceptor.ts, content/xhr-interceptor.ts | KAPLI |
| Durum Yonetimi (FR22-26) | 5 | background/rule-store.ts, chrome.storage.local | KAPLI |
| Popup UI (FR27-31) | 5 | popup/components/ (6 bilesen) | KAPLI |
| Angular Entegrasyon (FR32-36) | 5 | angular-plugin/lib/{interceptor,initializer,provider} | KAPLI |
| Hata Yonetimi (cross-cutting) | Tumu | core/errors/ (5 sinif) + silent passthrough pattern | KAPLI |

**NFR Kapsamasi (13 NFR):**

| NFR | Mimari Karsiligi | Durum |
|---|---|---|
| MV3 uyumlulugu | Monkey-patching (webRequest kullanilmiyor) | KAPLI |
| Angular 15+ | HttpInterceptorFn, standalone, signal | KAPLI |
| Bundle boyutu | CodeMirror 6 (~50-100KB, Monaco reddedildi) | KAPLI |
| TypeScript strict | tsconfig.base.json strict mode | KAPLI |
| SW persistence | storage.local + in-memory cache hybrid | KAPLI |
| Test edilebilirlik | Jest + colocated *.spec.ts, saf fonksiyonlar | KAPLI |

### Uygulama Hazirlik Dogrulamasi

**Karar Tamligi:**
- 10 kritik karar, her biri gerekce ve versiyon bilgisiyle dokumante edildi
- Cakisma noktalari acikca tanimlanmis (orn. angular constructor injection yerine inject())
- Uygulamaya uygun ornekler her onemli pattern icin verildi

**Yapi Tamligi:**
- ~70+ dosya/dizin dosya duzeyinde tanimlanmis
- 3 webpack entry point ve rollari net
- Paket sinirlar ve bagimlilik yonu acikca belirtildi

**Pattern Tamligi:**
- 7 pattern grubu, anti-pattern ornekleri dahil
- Mesajlasma protokolu jenerik tip destekliyor
- Hata yayilim kurali (throw vs silent) acik sekilde ayirt edilmis

### Gap Analizi Sonuclari

**Kritik Gap: YOK**

**Onemli Gaplar (bloke deil, ileriye alinabilir):**
- CI/CD pipeline (.github/workflows/) tanimlanmedi — implementasyon sirasinda eklenebilir
- E2E test stratejisi (Playwright/Puppeteer for extensions) belirlenmedi — ayri bir kararda ele alinabilir

**Nice-to-Have:**
- Storybook UI bilesen katalogu — popup bilesenleri icin faydali olabilir
- Changesets veya conventional commits — npm yayini icin gelecekte gerekecek

### Mimari Eksiksizlik Kontrol Listesi

**Gereksinim Analizi**
- [x] Proje baglamı kapsamli analiz edildi
- [x] Olcek ve karmasiklik degerlendirildi
- [x] Teknik kisitlamalar tanimlandi
- [x] Capraz kesim kaygulari haritalandi

**Mimari Kararlar**
- [x] 10 kritik karar versiyonlariyla dokumante edildi
- [x] Teknoloji yigini tamamen belirlendi
- [x] Entegrasyon pattern'lari tanimlandı
- [x] Performans ve boyut kaygulari giderildi (CodeMirror 6)

**Uygulama Pattern'lari**
- [x] Isimlendirme kuralları belirlendi
- [x] Yapi pattern'lari tanimlandı
- [x] Iletisim pattern'lari belirlendi
- [x] Surec pattern'lari (hata yonetimi vb.) dokumante edildi

**Proje Yapisi**
- [x] Tam dizin yapisi tanimlandı
- [x] Bilesen sinirlari oluşturuldu
- [x] Entegrasyon noktalari eslestirildi
- [x] Gereksinimden yapiya esleme tamamlandı

### Mimari Hazirlik Degerlendirmesi

**Genel Durum: UYGULAMAYA HAZIR**

**Guven Seviyesi: Yuksek**

**Temel Guclü Yonler:**
- Tam izole paket sinirlari (core: sifir dis bagimlilik)
- MV3 uyumlu teknik secimler (monkey-patching, service worker, storage.local)
- Angular 15+ en guncel pattern'lari (functional interceptor, signal, standalone)
- Her katman icin colocated test yapisi hazir
- Uygulama sirasi bagimlilik grafigine gore dogru siralanmis

**Sonradan Gelistirilebilecek Alanlar:**
- CI/CD pipeline kurulumu
- E2E test altyapisi (Chrome Extension Puppeteer/Playwright)
- npm publish otomasyonu (changesets)

### Uygulama Devir Rehberi

**AI Ajan Kilavuzu:**
- Tum mimari kararlari tam olarak dokumante edildigi sekilde uygula
- Uygulama pattern'larini tum bilesenlerde tutarli kullan
- Proje yapisi ve sinirlarına saygi goster
- Tum mimari sorular icin bu dokumana basvur

**Ilk Uygulama Adimi:**
`yarn init -y` ardından workspace paketleri ve `tsconfig.base.json` kurulumu — packages/core bağımlılıksız ilk implement edilecek pakat
