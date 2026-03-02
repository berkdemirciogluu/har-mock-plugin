# HAR Mock Plugin — Angular Plugin Kullanım & Entegrasyon Kılavuzu

> **Paket Adı:** `har-mock-plugin`  
> **Versiyon:** 0.0.1  
> **Angular Uyumluluğu:** Angular 15+  
> **Güvenlik:** Production'da otomatik devre dışı (double-lock: `isDevMode() === true` zorunlu)

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Chrome Extension'dan Farkı](#chrome-extensiondan-farkı)
3. [Kurulum](#kurulum)
   - [Standart Angular Projesi](#standart-angular-projesi)
   - [NX Monorepo — Yol A: libs/ Altına Ekleme](#nx-monorepo--yol-a-libs-altına-ekleme)
   - [NX Monorepo — Yol B: Yalc ile Bağlama](#nx-monorepo--yol-b-yalc-ile-bağlama)
4. [Temel Kullanım — Zero-Config](#temel-kullanım--zero-config)
5. [Yapılandırma Seçenekleri (HarMockConfig)](#yapılandırma-seçenekleri-harmockconfig)
6. [HAR Dosyası Hazırlama ve Yerleştirme](#har-dosyası-hazırlama-ve-yerleştirme)
7. [Replay Modları](#replay-modları)
8. [Rule Tabanlı Mock](#rule-tabanlı-mock)
9. [Guard Bypass Mekanizması](#guard-bypass-mekanizması)
10. [preserveGuards — Seçici Guard Bypass](#preserveguards--seçici-guard-bypass)
11. [Storage Inject](#storage-inject)
12. [Domain Filter](#domain-filter)
13. [Double-Lock Production Güvenliği](#double-lock-production-güvenliği)
14. [Öncelik Zinciri (Priority Chain)](#öncelik-zinciri-priority-chain)
15. [Mimari & Çalışma Prensibi](#mimari--çalışma-prensibi)
16. [Exported API Referansı](#exported-api-referansı)
17. [Doğrulama & Debug](#doğrulama--debug)
18. [Sık Yapılan Hatalar & Sorun Giderme](#sık-yapılan-hatalar--sorun-giderme)
19. [İleri Seviye Kullanım Örnekleri](#i̇leri-seviye-kullanım-örnekleri)

---

## Genel Bakış

**har-mock-plugin**, Angular uygulamalarına entegre edilen bir HTTP mock kütüphanesidir. HAR dosyalarından veya kullanıcı tanımlı rule'lardan HTTP yanıtları üreterek backend bağımlılığını ortadan kaldırır.

### Ne İşe Yarar?

- **Backend hazır değilken geliştirme:** HAR dosyasından API yanıtlarını taklit et
- **E2E test ortamında sabit yanıtlar:** Test güvenilirliğini artır
- **Hata senaryosu test:** 500, 404, 429 gibi yanıtları kolayca simüle et
- **Demo ortamı:** Canlı API'ye bağımlı olmadan çalışan demo hazırla
- **Guard bypass ile kolay navigasyon:** Auth/permission guard'larını geliştirme sırasında atla
- **Storage inject:** Token, feature flag gibi değerleri otomatik inject et

### Temel Özellikler

| Özellik               | Açıklama                                                     |
| --------------------- | ------------------------------------------------------------ |
| Zero-Config           | `provideHarMock()` — tek satır, varsayılan ayarlarla çalışır |
| HAR Replay            | Tarayıcıdan dışa aktarılan HAR dosyalarından otomatik mock   |
| Rule Mock             | HAR'dan bağımsız özel mock kuralları tanımlama               |
| Guard Bypass          | Route guard'larını dev modda otomatik temizleme              |
| Preserve Guards       | Belirli guard'ları koruyarak seçici bypass                   |
| Storage Inject        | localStorage/sessionStorage'a otomatik değer yazma           |
| Domain Filter         | Sadece belirli domain'leri mock'lama                         |
| Double-Lock           | Production'da kesinlikle çalışmaz (isDevMode + enabled)      |
| Auto-Parameterization | URL'lerdeki dinamik ID'leri otomatik pattern'e dönüştürme    |
| Graceful Degradation  | HAR yüklenemezse uygulama normal çalışmaya devam eder        |

---

## Chrome Extension'dan Farkı

| Özellik                  | Chrome Extension                     | Angular Plugin                                    |
| ------------------------ | ------------------------------------ | ------------------------------------------------- |
| **Kapsam**               | Tüm web siteleri, framework bağımsız | Sadece Angular uygulaması                         |
| **Kurulum**              | Chrome'a yüklenir                    | `provideHarMock()` ile Angular DI'a eklenir       |
| **HAR yükleme**          | Popup UI'dan drag & drop             | `src/assets/` klasöründen HTTP fetch              |
| **Rule yönetimi**        | Popup UI'dan CRUD                    | `provideHarMock({ rules: [...] })` ile kod içinde |
| **Monitor**              | Gerçek zamanlı UI feed               | Yok (konsol logları ile takip)                    |
| **Response düzenleme**   | Popup UI'da CodeMirror editör        | Yok (HAR/rule düzenle, uygulama yeniden başlat)   |
| **Guard bypass**         | Yok                                  | `bypassGuards: true`                              |
| **Storage inject**       | Popup UI'dan                         | `storageEntries: [...]` ile kod içinde            |
| **Production güvenliği** | Yok (manuel kontrol)                 | Double-lock (isDevMode + enabled)                 |
| **Bağımlılık**           | Chrome API (MV3)                     | Angular HttpClient, DI                            |

---

## Kurulum

### Ön Koşullar

| Gereksinim | Minimum Versiyon |
| ---------- | ---------------- |
| Node.js    | 18+              |
| Angular    | 15+              |
| TypeScript | 4.9+             |

### Standart Angular Projesi

Plugin henüz npm'de yayınlanmadığı için **yalc** ile lokal link yapılır.

#### Adım 1: Plugin'i Build Et ve Yayınla

```bash
# har-mock-plugin projesinin kök dizininde

# 1. Bağımlılıkları kur
yarn install

# 2. Core paketini build et (plugin buna bağımlı)
yarn build:core

# 3. Angular plugin'i build et
yarn build:plugin

# 4. yalc ile yayınla
cd packages/angular-plugin/dist
npx yalc publish
```

Çıktı:

```
har-mock-plugin@0.0.1 published in store.
```

#### Adım 2: Angular Projesine Ekle

```bash
# Senin Angular uygulamanın kök dizininde

# yalc ile bağla
npx yalc add har-mock-plugin
npm install   # veya yarn install
```

> **Not:** `yalc add` komutu `package.json`'a `"har-mock-plugin": "file:.yalc/har-mock-plugin"` ekler.

```bash
# .gitignore'a ekle
echo ".yalc" >> .gitignore
echo "yalc.lock" >> .gitignore
```

#### Adım 3: provideHarMock ile Kayıt Yap

**Standalone (Angular 15+ önerilen):**

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHarMock } from 'har-mock-plugin';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // ⚠️ provideHttpClient() eklemenize GEREK YOK
    // provideHarMock() kendi içinde provideHttpClient() çağrısı yapar
    provideHarMock(), // zero-config: /assets/har-mock.har dosyasını kullanır
  ],
};
```

> **⚠️ Önemli:** `provideHarMock()` kendi içinde `provideHttpClient(withInterceptors([harMockInterceptor]))` çağrısı yapar. Ayrıca `provideHttpClient()` eklemenize **gerek yoktur**. Eğer zaten `provideHttpClient()` kullanıyorsanız, onu kaldırın veya `provideHarMock()` çağrısından **önce** yerleştirdiğinizden emin olun.

**NgModule tabanlı:**

```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { provideHarMock } from 'har-mock-plugin';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  providers: [
    provideHarMock(), // zero-config
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

#### Adım 4: HAR Dosyasını Yerleştir

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har    ← Varsayılan konum
```

#### Adım 5: Çalıştır ve Doğrula

```bash
ng serve
```

Tarayıcı konsolunda şu mesajı görmelisin:

```
[HarMock] HAR loaded: 42 entries
```

---

### NX Monorepo — Yol A: libs/ Altına Ekleme (Önerilen)

Bu yöntemde plugin kaynak kodunu NX monoreponun `libs/` klasörüne kopyalarsın. Build gerektirmez, path mapping ile doğrudan import edilir.

#### A-1: Kaynak Dosyaları Kopyala

```bash
# NX monoreponun kök dizininde
mkdir -p libs/har-mock-plugin/src

# Angular plugin kaynak dosyalarını kopyala
cp -r /path/to/har-mock-plugin/packages/angular-plugin/src/. \
      libs/har-mock-plugin/src/

cp /path/to/har-mock-plugin/packages/angular-plugin/package.json \
   libs/har-mock-plugin/
```

#### A-2: TypeScript Path Alias Ekle

`tsconfig.base.json` (NX monorepo kökü):

```json
{
  "compilerOptions": {
    "paths": {
      "har-mock-plugin": ["libs/har-mock-plugin/src/index.ts"]
    }
  }
}
```

#### A-3: @har-mock/core Bağımlılığını Ekle

Plugin `@har-mock/core` paketine bağımlıdır:

```bash
# Yalc ile:
cd /path/to/har-mock-plugin/packages/core && npx yalc publish
cd /path/to/nx-project && npx yalc add @har-mock/core

# veya doğrudan:
npm install /path/to/har-mock-plugin/packages/core
```

#### A-4: Uygulamada Kullan

```typescript
// apps/my-app/src/app/app.config.ts
import { provideHarMock } from 'har-mock-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHarMock({
      harUrl: '/assets/har-mock.har',
    }),
  ],
};
```

---

### NX Monorepo — Yol B: Yalc ile Bağlama

Plugin'i bağımsız paket gibi tüketmek için:

```bash
# har-mock-plugin projesinde
yarn build:plugin
cd packages/angular-plugin/dist
npx yalc publish

# NX monorepo kökünde
npx yalc add har-mock-plugin
npm install
```

`tsconfig.base.json`'da path eklemesi gerekmez — `node_modules/har-mock-plugin` üzerinden çözülür.

---

## Temel Kullanım — Zero-Config

En basit kullanım:

```typescript
provideHarMock();
```

Bu tek satır şunları yapar:

1. `/assets/har-mock.har` dosyasını **app başlatılırken** (APP_INITIALIZER) fetch eder
2. HAR'ı parse edip URL pattern'leri otomatik parameterize eder
3. HttpClient interceptor'ı kaydeder — giden istekleri HAR'a karşı eşleştirir
4. `isDevMode() === true` ise aktif, production'da otomatik devre dışı

### Varsayılan Değerler

| Parametre        | Varsayılan               | Açıklama                      |
| ---------------- | ------------------------ | ----------------------------- |
| `harUrl`         | `'/assets/har-mock.har'` | HAR dosyası URL'i             |
| `mode`           | `'last-match'`           | Son eşleşen entry döner       |
| `enabled`        | `true`                   | Plugin aktif                  |
| `bypassGuards`   | `false`                  | Guard'lar dokunulmaz          |
| `preserveGuards` | `[]`                     | Korunacak guard listesi (boş) |
| `rules`          | `[]`                     | Özel mock kuralları (boş)     |
| `domainFilter`   | `[]`                     | Tüm domain'ler mock'lanır     |
| `storageEntries` | `[]`                     | Storage inject yapılmaz       |

---

## Yapılandırma Seçenekleri (HarMockConfig)

```typescript
import { provideHarMock, HarMockConfig } from 'har-mock-plugin';

const harConfig: HarMockConfig = {
  // HAR dosyasının URL'i (Angular assets klasöründen yüklenir)
  harUrl: '/assets/har-mock.har',

  // Yanıt seçim modu
  mode: 'last-match', // 'last-match' | 'sequential'

  // Plugin etkin mi? (double-lock: isDevMode()=false ise bu değer görmezden gelinir)
  enabled: true,

  // Dev modunda route guard'larını bypass et
  bypassGuards: false,

  // bypassGuards=true iken korunacak guard'lar
  preserveGuards: [],

  // Kural tabanlı mock listesi (HAR'dan önce değerlendirilir)
  rules: [],

  // Sadece bu domain'lerdeki istekleri mock'la (boş = tümü)
  domainFilter: [],

  // Sayfa başlatılırken storage'a inject edilecek değerler
  storageEntries: [],
};

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHarMock(harConfig)],
};
```

### Tip Tanımları

```typescript
// Mock modu
type MockMode = 'last-match' | 'sequential';

// Ana konfigürasyon (tüm alanlar opsiyonel)
interface HarMockConfig {
  harUrl?: string;
  mode?: MockMode;
  enabled?: boolean;
  bypassGuards?: boolean;
  preserveGuards?: Array<Function | Type<unknown>>;
  rules?: MockRule[];
  domainFilter?: string[];
  storageEntries?: StorageEntry[];
}

// Mock kuralı (@har-mock/core'dan)
interface MockRule {
  readonly id: string; // UUID
  readonly urlPattern: string; // '/api/users' veya '/api/*'
  readonly method: string; // 'GET', 'POST', 'PUT', 'DELETE'...
  readonly statusCode: number; // 100-599
  readonly responseBody: string; // JSON string
  readonly responseHeaders: readonly HarHeader[];
  readonly delay: number; // ms (0 = anında)
  readonly enabled: boolean;
}

// Storage inject entry'si (@har-mock/core'dan)
interface StorageEntry {
  readonly key: string;
  readonly value: string;
  readonly type: 'localStorage' | 'sessionStorage';
}
```

---

## HAR Dosyası Hazırlama ve Yerleştirme

### Tarayıcıdan HAR Dışa Aktarma

1. Mock'lamak istediğin web uygulamasını aç
2. **Chrome DevTools → Network** sekmesini aç (`F12`)
3. Sayfayı yenile ve mock'lamak istediğin API çağrılarını tetikle
4. Herhangi bir isteğe **sağ tıkla → "Save all as HAR with content"**
5. Dosyayı `src/assets/har-mock.har` olarak kaydet

### Dosya Yerleşimi

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har    ← Varsayılan konum
```

### angular.json Assets Yapılandırması

Standart Angular CLI projelerinde `src/assets` zaten assets'e dahildir. Farklı bir klasör kullanıyorsan:

```json
// angular.json → projects → my-app → architect → build → options → assets
"assets": [
  "src/favicon.ico",
  "src/assets"
]
```

### Özel HAR URL'i

Farklı konumda veya farklı isimle bir HAR dosyası kullanmak için:

```typescript
provideHarMock({
  harUrl: '/assets/api/my-custom-responses.har',
});
```

### Auto-Parameterization

HAR yüklendiğinde URL'ler otomatik olarak parametrize edilir:

```
HAR'daki URL'ler:              → Oluşturulan pattern:
/api/users/123                → /api/users/{param}
/api/users/456                → /api/users/{param}
/api/orders/abc-def/items     → /api/orders/{param}/items
```

Bu sayede farklı ID'lerle yapılan istekler aynı pattern'e eşleşir.

---

## Replay Modları

| Mod          | Davranış                                               | Kullanım Senaryosu               |
| ------------ | ------------------------------------------------------ | -------------------------------- |
| `last-match` | URL ile eşleşen **son** HAR entry'sinin yanıtı döner   | Tekil endpoint mock (varsayılan) |
| `sequential` | Her istek için sıradaki entry kullanılır (round-robin) | Pagination, farklı yanıt test    |

### Örnekler

**last-match (varsayılan):**

HAR'da `/api/users` için 3 entry var → her çağrıda **3. entry** döner.

```typescript
provideHarMock({
  mode: 'last-match', // varsayılan
});
```

**sequential (sıralı):**

HAR'da `/api/users` için 3 entry var →

- 1. çağrı → 1. entry
- 2. çağrı → 2. entry
- 3. çağrı → 3. entry
- 4. çağrı → 1. entry (round-robin)

```typescript
provideHarMock({
  mode: 'sequential',
});
```

---

## Rule Tabanlı Mock

HAR dosyası olmadan veya HAR'ın üzerine yazacak şekilde özel mock kuralları tanımlayabilirsin.

### Temel Kullanım

```typescript
import { provideHarMock, MockRule } from 'har-mock-plugin';

const rules: MockRule[] = [
  {
    id: 'rule-1',
    urlPattern: '/api/users',
    method: 'GET',
    statusCode: 200,
    responseBody: JSON.stringify({ users: [{ id: 1, name: 'Test User' }] }),
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 0,
    enabled: true,
  },
  {
    id: 'rule-2',
    urlPattern: '/api/users/*/profile',
    method: 'GET',
    statusCode: 200,
    responseBody: JSON.stringify({ name: 'John', email: 'john@test.com' }),
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 500, // 500ms gecikme
    enabled: true,
  },
  {
    id: 'rule-3',
    urlPattern: '/api/orders',
    method: 'POST',
    statusCode: 201,
    responseBody: JSON.stringify({ orderId: 'ORD-001', status: 'created' }),
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 0,
    enabled: true,
  },
];

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHarMock({ rules })],
};
```

### Hata Senaryosu Simülasyonu

```typescript
const errorRules: MockRule[] = [
  // 500 Internal Server Error
  {
    id: 'error-500',
    urlPattern: '/api/critical-endpoint',
    method: 'GET',
    statusCode: 500,
    responseBody: JSON.stringify({ error: 'Internal Server Error' }),
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 0,
    enabled: true,
  },
  // 429 Too Many Requests
  {
    id: 'error-429',
    urlPattern: '/api/rate-limited',
    method: 'GET',
    statusCode: 429,
    responseBody: JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Retry-After', value: '60' },
    ],
    delay: 0,
    enabled: true,
  },
  // 404 Not Found
  {
    id: 'error-404',
    urlPattern: '/api/deleted-resource',
    method: 'GET',
    statusCode: 404,
    responseBody: JSON.stringify({ error: 'Resource not found' }),
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 0,
    enabled: true,
  },
];

provideHarMock({
  harUrl: '/assets/har-mock.har',
  rules: errorRules,
  // Rule'lar HAR'dan önce değerlendirilir!
});
```

### URL Pattern Söz Dizimi

| Pattern          | Eşleşir                                | Eşleşmez         |
| ---------------- | -------------------------------------- | ---------------- |
| `/api/users`     | `/api/users` (exact)                   | `/api/users/123` |
| `/api/users/*`   | `/api/users/123`, `/api/users/abc`     | `/api/users`     |
| `/api/*/profile` | `/api/123/profile`, `/api/abc/profile` | `/api/users`     |

> **Önemli:** Rule'lar priority chain'de HAR'dan **önce** değerlendirilir. Aynı URL için hem rule hem HAR eşleşmesi varsa **rule kazanır**.

---

## Guard Bypass Mekanizması

Geliştirme sırasında auth guard, permission guard gibi route guard'ları navigasyonu engelleyebilir. `bypassGuards: true` ile tüm guard'ları otomatik devre dışı bırakabilirsin.

### Kullanım

```typescript
provideHarMock({
  bypassGuards: true,
});
```

### Ne Yapar?

1. Uygulama başlatılırken (`APP_INITIALIZER`) tüm route config'leri traverse eder
2. Her route'dan `canActivate`, `canDeactivate`, `canMatch` guard dizilerini temizler
3. **Lazy-loaded route'lar** yüklendiğinde (`RouteConfigLoadEnd`) tekrar temizler
4. Recursive olarak tüm `children` seviyeleri dahil edilir

### Triple-Lock Güvenliği

Guard bypass'ın çalışması için **üç koşul** birden true olmalı:

```
isDevMode() === true  &&  enabled === true  &&  bypassGuards === true
```

Production build'de `isDevMode()` false döndüğü için guard bypass **kesinlikle** çalışmaz.

### Hata Toleransı

Guard temizleme sırasında bir hata oluşursa:

- `console.warn` ile loglanır
- Uygulama **normal başlar** — guard'lar orijinal halleriyle kalır
- Uygulama crash etmez

---

## preserveGuards — Seçici Guard Bypass

`bypassGuards: true` iken bazı guard'ların **korunmasını** istiyorsan `preserveGuards` listesini kullan.

### Class-Based Guard

```typescript
import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AnalyticsGuard implements CanActivate {
  canActivate() {
    // Analytics tracking logic
    return true;
  }
}

// app.config.ts
provideHarMock({
  bypassGuards: true,
  preserveGuards: [AnalyticsGuard], // ← class referansı
});
```

### Functional Guard

```typescript
// guards/analytics.guard.ts
export const analyticsGuard = () => {
  // Analytics tracking logic
  return true;
};

// app.routes.ts
export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, analyticsGuard], // ← aynı referans
  },
];

// app.config.ts
import { analyticsGuard } from './guards/analytics.guard';

provideHarMock({
  bypassGuards: true,
  preserveGuards: [analyticsGuard], // ← aynı fonksiyon referansı!
});
```

### ⚠️ Kritik: Referans Eşitliği

Functional guard'larda **aynı fonksiyon referansı** kullanılmalıdır. Her lambda yeni bir referans oluşturur:

```typescript
// ❌ YANLIŞ — her seferinde yeni referans, eşleşme sağlanamaz
provideHarMock({
  preserveGuards: [() => inject(SomeService).check()],
});

// ✅ DOĞRU — modül scope'unda sabit referans
export const myGuardFn = () => inject(SomeService).check();

// routes'da ve preserveGuards'da AYNI referansı kullan
```

### preserveGuards Boş İken

`preserveGuards: []` (varsayılan) → **Tüm guard'lar temizlenir**

`preserveGuards: [GuardA, guardB]` → Sadece `GuardA` ve `guardB` korunur, diğerleri temizlenir

---

## Storage Inject

Uygulama başlatılırken `localStorage` veya `sessionStorage`'a otomatik olarak değer inject edebilirsin.

### Kullanım

```typescript
import { provideHarMock, StorageEntry } from 'har-mock-plugin';

const storageEntries: StorageEntry[] = [
  // Auth token inject (login atlamak için)
  {
    key: 'auth_token',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xxx',
    type: 'localStorage',
  },
  // Kullanıcı bilgisi
  {
    key: 'user_profile',
    value: JSON.stringify({ id: 1, name: 'Test User', role: 'admin' }),
    type: 'localStorage',
  },
  // Feature flag
  {
    key: 'feature_new_dashboard',
    value: 'true',
    type: 'localStorage',
  },
  // Session bazlı geçici veri
  {
    key: 'onboarding_completed',
    value: 'true',
    type: 'sessionStorage',
  },
];

provideHarMock({
  storageEntries,
});
```

### Davranış

- Her `setItem` çağrısı ayrı `try/catch` ile sarılmıştır — bir key başarısız olursa diğerleri etkilenmez
- **Double-lock** uygulanır: production'da storage inject yapılmaz
- Uygulama başlangıcında (`APP_INITIALIZER`) bir kez çalışır

### Yaygın Senaryo: Login Bypass

Auth guard bypass + storage inject kombinasyonuyla login ekranını tamamen atlayabilirsin:

```typescript
provideHarMock({
  bypassGuards: true, // Auth guard'ı atla
  storageEntries: [
    {
      key: 'access_token',
      value: 'mock-jwt-token-xxx',
      type: 'localStorage',
    },
    {
      key: 'refresh_token',
      value: 'mock-refresh-token-xxx',
      type: 'localStorage',
    },
  ],
  rules: [
    // Token refresh endpoint'i mock'la
    {
      id: 'token-refresh',
      urlPattern: '/api/auth/refresh',
      method: 'POST',
      statusCode: 200,
      responseBody: JSON.stringify({ accessToken: 'new-mock-token' }),
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      delay: 0,
      enabled: true,
    },
  ],
});
```

---

## Domain Filter

Yalnızca belirli domain'lerden gelen istekleri mock'lamak istiyorsan `domainFilter` kullan.

### Kullanım

```typescript
provideHarMock({
  domainFilter: ['api.example.com', 'gateway.internal.net'],
});
```

### Eşleşme Kuralları

- **Exact match:** `api.example.com` → `https://api.example.com/users` ✓
- **Subdomain match:** `api.example.com` → `https://sub.api.example.com/users` ✓
- **Eşleşmezse passthrough:** `other.com` → orijinal sunucuya gider
- **IP:Port desteği:** `15.237.105.224:8080` → `http://15.237.105.224:8080/api` ✓
- **Boş dizi = tümü:** `domainFilter: []` → tüm domain'ler mock'lanır (varsayılan)

### Çoklu API Ortamı

```typescript
provideHarMock({
  domainFilter: [
    'api.myapp.com', // Ana API
    'auth.myapp.com', // Auth servisi
    '192.168.1.100:3000', // Lokal mikroservis
  ],
});
```

---

## Double-Lock Production Güvenliği

Plugin **kesinlikle** production ortamında çalışmaz. İki kilitli güvenlik mekanizması uygulanır:

### Kontrol Noktaları

| Bileşen                      | Kontrol                                  | false Sonucu                |
| ---------------------------- | ---------------------------------------- | --------------------------- |
| APP_INITIALIZER (HAR loader) | `isDevMode() && enabled`                 | HAR fetch **yapılmaz**      |
| HTTP Interceptor             | `isDevMode() && enabled`                 | `next(req)` — passthrough   |
| Guard Bypass                 | `isDevMode() && enabled && bypassGuards` | Guard'lar **dokunulmaz**    |
| Storage Inject               | `isDevMode() && enabled`                 | Storage inject **yapılmaz** |

### Garanti

```
Production build (ng build --configuration=production):
  isDevMode() === false
  → Plugin tamamen inert:
    → HAR fetch yok
    → HTTP interception yok
    → Guard mutasyonu yok
    → Storage injection yok
```

`enabled: true` olsa bile production'da **hiçbir şey çalışmaz**.

### Neden Double-Lock?

| Senaryo                    | isDevMode() | enabled | Sonuç          |
| -------------------------- | ----------- | ------- | -------------- |
| Geliştirme, plugin aktif   | ✓           | ✓       | **Çalışır**    |
| Geliştirme, plugin kapalı  | ✓           | ✗       | Çalışmaz       |
| Production, plugin "aktif" | ✗           | ✓       | **Çalışmaz** ★ |
| Production, plugin kapalı  | ✗           | ✗       | Çalışmaz       |

★ Bu durum double-lock'un koruduğu senaryo: `enabled: true` kalsaymış bile production'da güvenli.

---

## Öncelik Zinciri (Priority Chain)

Bir HTTP isteği interceptor'a ulaştığında şu sırayla değerlendirilir:

```
1. isDevMode() === false || enabled === false  → Passthrough (double-lock)
2. Domain filter dolu ve hostname eşleşmiyor   → Passthrough
3. evaluate(request, rules) → eşleşme var mı?  → Rule yanıtı döner
4. matchUrl(url, method, patterns) → eşleşme?  → HAR yanıtı döner
5. Hiçbir eşleşme yok                          → Passthrough (next(req))
```

### Özet

```
Rules > HAR > Passthrough
```

Rule'lar her zaman HAR'dan önce değerlendirilir. Bu sayede HAR dosyasındaki bir yanıtı rule ile override edebilirsin.

---

## Mimari & Çalışma Prensibi

### Uygulama Başlatma Akışı

```
Angular Bootstrapping
│
├── 1. provideHarMock() çağrılır
│   ├── HAR_MOCK_CONFIG token'ı resolve edilir (defaults + user config merge)
│   ├── HarLoaderService register edilir
│   ├── provideHttpClient(withInterceptors([harMockInterceptor])) çağrılır
│   └── 3 adet APP_INITIALIZER kaydedilir
│
├── 2. APP_INITIALIZER: HAR Loader
│   ├── Double-lock kontrolü (isDevMode && enabled)
│   ├── HttpBackend ile doğrudan fetch → interceptor zincirine girmez!
│   ├── parseHar(raw) → HarFile
│   ├── parameterize(entries) → UrlPattern[]
│   └── Cache'e yaz (entries + urlPatterns)
│
├── 3. APP_INITIALIZER: Guard Bypass
│   ├── Triple-lock kontrolü (isDevMode && enabled && bypassGuards)
│   ├── Router.config recursive traverse → guard'ları temizle
│   └── RouteConfigLoadEnd subscribe → lazy route'ları da temizle
│
├── 4. APP_INITIALIZER: Storage Inject
│   ├── Double-lock kontrolü (isDevMode && enabled)
│   └── storageEntries → localStorage/sessionStorage.setItem()
│
└── 5. Uygulama hazır — HTTP istekleri artık harMockInterceptor'dan geçer
```

### HTTP İstek Akışı

```
HttpClient.get('/api/users')
  │
  ▼
harMockInterceptor
  │
  ├── Double-lock: !isDevMode() || !enabled → next(req) [Passthrough]
  │
  ├── Domain filter: hostname eşleşmiyor → next(req) [Passthrough]
  │
  ├── HarLoaderService'den entries/patterns al
  │   └── null (yüklenmemiş) → next(req) [Passthrough]
  │
  ├── resolve(request, rules, entries, urlPatterns)
  │   ├── 1. evaluate(req, rules) → MockRule eşleşmesi?
  │   │   └── Evet → { source: 'rule', response: MockResponse }
  │   │
  │   ├── 2. matchUrl(url, method, patterns) → HAR eşleşmesi?
  │   │   └── Evet → { source: 'har', response: MockResponse }
  │   │
  │   └── 3. null → Passthrough
  │
  ├── null → next(req) [Passthrough]
  │
  └── ResolveResult → of(new HttpResponse({
        status: result.response.statusCode,
        body: JSON.parse(result.response.body),
        headers: new HttpHeaders(...)
      }))
```

### Circular Interception Koruması

`HarLoaderService`, HAR dosyasını fetch ederken `HttpBackend`'i doğrudan inject eder:

```typescript
// Plugin iç kodu (basitleştirilmiş)
const backend = inject(HttpBackend);
const rawHttp = new HttpClient(backend); // "naked" HTTP client
rawHttp.get(harUrl, { responseType: 'text' });
// → Bu istek interceptor zincirine GİRMEZ
```

Bu sayede HAR dosyasını çekerken kendi interceptor'ünü tetiklemez (sonsuz döngü önlenir).

---

## Exported API Referansı

`har-mock-plugin` paketinden şu API'ler dışa aktarılır:

| Export               | Tür                                                | Açıklama                       |
| -------------------- | -------------------------------------------------- | ------------------------------ |
| `provideHarMock`     | `(config?: HarMockConfig) => EnvironmentProviders` | Ana provider factory           |
| `HarMockConfig`      | `interface`                                        | Konfigürasyon arayüzü          |
| `MockMode`           | `type`                                             | `'last-match' \| 'sequential'` |
| `HAR_MOCK_CONFIG`    | `InjectionToken<Required<HarMockConfig>>`          | DI token                       |
| `harMockInterceptor` | `HttpInterceptorFn`                                | HTTP interceptor fonksiyonu    |
| `HarLoaderService`   | `class`                                            | HAR dosya yükleyici servis     |
| `MockRule`           | `interface` (re-export)                            | Mock kural arayüzü             |
| `StorageEntry`       | `interface` (re-export)                            | Storage inject entry arayüzü   |

### HAR_MOCK_CONFIG Token Kullanımı

Resolved config'e herhangi bir servisten erişmek için:

```typescript
import { inject } from '@angular/core';
import { HAR_MOCK_CONFIG } from 'har-mock-plugin';

@Injectable()
export class MyService {
  private readonly config = inject(HAR_MOCK_CONFIG);

  checkMockStatus() {
    console.log('Mock enabled:', this.config.enabled);
    console.log('Mode:', this.config.mode);
    console.log('Rules count:', this.config.rules.length);
  }
}
```

### HarLoaderService Kullanımı

Yüklenen HAR verisine doğrudan erişim:

```typescript
import { inject } from '@angular/core';
import { HarLoaderService } from 'har-mock-plugin';

@Component({ ... })
export class DebugComponent {
  private readonly harLoader = inject(HarLoaderService);

  showLoadedData() {
    const entries = this.harLoader.getEntries();
    const patterns = this.harLoader.getUrlPatterns();
    console.log('HAR entries:', entries?.length ?? 'not loaded');
    console.log('URL patterns:', patterns?.length ?? 'not loaded');
  }
}
```

---

## Doğrulama & Debug

### Başarılı Kurulum Kontrol Listesi

| ✓   | Kontrol                                                                           |
| --- | --------------------------------------------------------------------------------- |
| ☐   | `ng serve` ile uygulama başlatıldığında konsol hatası yok                         |
| ☐   | Konsolda `[HarMock] HAR loaded: X entries` mesajı görünüyor                       |
| ☐   | Network sekmesinde HAR'da tanımlı bir endpoint çağrılınca yanıt çok hızlı dönüyor |
| ☐   | Yanıt içeriği HAR'daki ile eşleşiyor                                              |
| ☐   | `ng build --configuration=production` ile derlendğinde plugin çalışmıyor          |

### Guard Bypass Doğrulama

```typescript
// Herhangi bir component'te
import { Router } from '@angular/router';
import { inject } from '@angular/core';

const router = inject(Router);
console.log('Route config:', router.config);
// canActivate dizileri preserveGuards listesindekiler dışında boş olmalı
```

### Konsol Debug

```typescript
// Tarayıcı konsolunda
console.log(localStorage.getItem('auth_token'));
// → inject edilen token değeri görünmeli

// Network sekmesinde
// HAR'daki GET /api/users isteği → Status: 200, Size: çok küçük, Time: çok hızlı
```

---

## Sık Yapılan Hatalar & Sorun Giderme

### `Cannot find module 'har-mock-plugin'`

**Neden:** Paket yüklemesi eksik veya path alias hatalı.

**Çözüm:**

```bash
# node_modules'de var mı?
ls node_modules/har-mock-plugin

# yalc ile kurulduysa
ls .yalc/har-mock-plugin
```

NX kullanıyorsan `tsconfig.base.json`'daki `paths` ayarını kontrol et.

---

### `HAR file not found` veya 404 hatası

**Neden:** HAR dosyası assets'te yok veya `angular.json`'da tanımlı değil.

**Çözüm:**

```bash
# Dosya mevcut mu?
ls src/assets/har-mock.har
```

`angular.json`'da `src/assets` dahil mi kontrol et. Farklı konum için `harUrl` parametresini değiştir.

---

### Plugin production'da da aktif oluyor gibi görünüyor

**Gerçek durum:** Bu teknik olarak mümkün değil. Double-lock mekanizması `isDevMode() === false` döndüğünde tüm plugin fonksiyonlarını devre dışı bırakır.

**Kontrol et:** `ng build --configuration=production` ile mi derleniyor? `isDevMode()` false mu döndürüyor?

---

### `preserveGuards` çalışmıyor (guard hâlâ siliniyor)

**Neden:** Functional guard için farklı referanslar kullanılıyor.

**Çözüm:**

```typescript
// ❌ Yanlış — her çağrıda yeni lambda referansı
provideHarMock({
  preserveGuards: [() => inject(BssGuard).canActivate()],
});

// ✅ Doğru — modül scope'unda sabit referans
export const bssGuardFn = () => inject(BssGuard).canActivate();

// Route'da ve preserveGuards'da AYNI referansı kullan:
// routes: [{ canActivate: [bssGuardFn] }]
// provideHarMock({ preserveGuards: [bssGuardFn] })
```

Class-based guard için doğrudan class'ı geçmek yeterli:

```typescript
provideHarMock({ preserveGuards: [MyGuard] });
```

---

### HAR yüklenemiyor ama uygulama da crash etmiyor

**Beklenen davranış:** Graceful degradation. HAR fetch veya parse hatası olduğunda:

- `console.warn` ile `HarParseError` loglanır
- `entries = []`, `urlPatterns = []` atanır
- Tüm istekler passthrough olur
- Uygulama normal çalışmaya devam eder

---

### NX'te circular dependency uyarısı

**Çözüm:** `project.json`'da scope tag ekle:

```json
// libs/har-mock-plugin/project.json
{
  "tags": ["scope:shared", "type:util"]
}
```

`.eslintrc.json`'da `nx/enforce-module-boundaries` kuralındaki `scope:shared` tag'ına izin ver.

---

### provideHttpClient çakışması

**Neden:** `provideHarMock()` kendi içinde `provideHttpClient(withInterceptors([...]))` çağırır. Ayrıca `provideHttpClient()` eklemek çakışmaya neden olabilir.

**Çözüm:** `provideHarMock()` kullanıyorsan ayrı `provideHttpClient()` çağrısını **kaldır**:

```typescript
// ❌ Yanlış
providers: [
  provideHttpClient(), // ← Bunu kaldır
  provideHarMock(),
];

// ✅ Doğru
providers: [
  provideHarMock(), // İçinde provideHttpClient() zaten var
];
```

---

## İleri Seviye Kullanım Örnekleri

### Tam Yapılandırmalı Kurulum

```typescript
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHarMock } from 'har-mock-plugin';
import { analyticsGuard } from './guards/analytics.guard';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHarMock({
      // HAR dosyası
      harUrl: '/assets/api-responses.har',
      mode: 'sequential',

      // Mock kuralları (HAR'dan önce değerlendirilir)
      rules: [
        {
          id: 'mock-login',
          urlPattern: '/api/auth/login',
          method: 'POST',
          statusCode: 200,
          responseBody: JSON.stringify({
            token: 'mock-jwt-token',
            user: { id: 1, name: 'Dev User', role: 'admin' },
          }),
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          delay: 300,
          enabled: true,
        },
        {
          id: 'error-payments',
          urlPattern: '/api/payments/*',
          method: 'POST',
          statusCode: 503,
          responseBody: JSON.stringify({ error: 'Service temporarily unavailable' }),
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          delay: 2000,
          enabled: true,
        },
      ],

      // Guard bypass (analytics guard korunur)
      bypassGuards: true,
      preserveGuards: [analyticsGuard],

      // Domain filter
      domainFilter: ['api.myapp.com', 'gateway.myapp.com'],

      // Storage inject
      storageEntries: [
        { key: 'access_token', value: 'mock-jwt-xxx', type: 'localStorage' },
        { key: 'user_preferences', value: '{"theme":"dark","lang":"tr"}', type: 'localStorage' },
        { key: 'session_id', value: 'mock-session-123', type: 'sessionStorage' },
      ],
    }),
  ],
};
```

### Ortama Göre Dinamik Yapılandırma

```typescript
import { environment } from '../environments/environment';

const devOnlyConfig = environment.useMocks
  ? {
      harUrl: '/assets/har-mock.har',
      bypassGuards: true,
      rules: environment.mockRules ?? [],
    }
  : {
      enabled: false, // Double-lock ile zaten güvenli, ama explicit olarak da kapatılabilir
    };

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHarMock(devOnlyConfig)],
};
```

### Plugin Güncellemelerini Senkronize Etme

Plugin kaynak kodunu değiştirdikten sonra:

```bash
# har-mock-plugin proje kökünde
yarn build:core      # core değiştiyse
yarn build:plugin    # plugin'i build et

cd packages/angular-plugin/dist
npx yalc push        # Angular uygulamandaki paketi otomatik günceller
```

Angular uygulamada `ng serve` çalışıyorsa `yalc push` sonrası otomatik yenilenir.
