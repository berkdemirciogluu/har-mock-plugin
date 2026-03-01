# har-mock-plugin — Angular Kurulum Kılavuzu

> **Versiyon:** 0.0.1
> **Angular Uyumluluğu:** Angular 15+
> **Ortam:** Yalnızca `isDevMode() === true` olan ortamlarda aktifleşir (production'da otomatik devre dışı)

---

## İçindekiler

1. [Ön Koşullar](#ön-koşullar)
2. [Standart Angular Projesi Kurulumu](#standart-angular-projesi-kurulumu)
3. [NX Monorepo Kurulumu](#nx-monorepo-kurulumu)
4. [Yapılandırma Seçenekleri](#yapılandırma-seçenekleri)
5. [HAR Dosyası Hazırlama](#har-dosyası-hazırlama)
6. [Guard Bypass Kullanımı](#guard-bypass-kullanımı)
7. [Doğrulama](#doğrulama)
8. [Sık Yapılan Hatalar](#sık-yapılan-hatalar)

---

## Ön Koşullar

| Gereksinim | Minimum Versiyon |
|------------|-----------------|
| Node.js    | 18+             |
| Angular    | 15+             |
| TypeScript | 4.9+            |

---

## Standart Angular Projesi Kurulumu

### Adım 1: Paketi kur

Plugin henüz npm'de yayınlanmadığı için **yalc** ile lokal olarak bağlanır.

```bash
# yalc'ı global olarak kur (bir kez)
npm install -g yalc
```

Bu proje kökünde (har-mock-plugin) plugin'i yayınla:

```bash
# har-mock-plugin proje kökünde
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc publish
```

Çıktı şuna benzer olmalı:

```
har-mock-plugin@0.0.1 published in store.
```

Angular uygulamanın kök dizininde paketi ekle:

```bash
# Angular uygulamanın kök dizininde
yalc add har-mock-plugin
npm install   # veya yarn install
```

> **Not:** `yalc add` komutu `package.json`'a `"har-mock-plugin": "file:.yalc/har-mock-plugin"` ekler ve
> `.yalc/` klasörünü oluşturur. Bu klasörü `.gitignore`'a eklemeyi unutma.

```bash
# .gitignore'a ekle
echo ".yalc" >> .gitignore
echo "yalc.lock" >> .gitignore
```

### Adım 2: `provideHarMock` ile kayıt yap

**Standalone (Angular 15+) — `app.config.ts`:**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHarMock } from 'har-mock-plugin';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideHarMock(),   // zero-config: /assets/har-mock.har dosyasını kullanır
  ],
};
```

**NgModule tabanlı — `app.module.ts`:**

```typescript
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
    provideHarMock(),  // zero-config
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Adım 3: HAR dosyasını koy

`src/assets/` klasörüne `har-mock.har` dosyasını ekle:

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har    ← buraya
```

`angular.json`'da assets yapılandırması zaten `src/assets` klasörünü kapsıyorsa ek ayar gerekmez.

### Adım 4: Plugin güncellemelerini senkronize et

`har-mock-plugin` kaynak kodunu değiştirdiğinde:

```bash
# har-mock-plugin kökünde
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc push   # Angular uygulamayı otomatik günceller
```

---

## NX Monorepo Kurulumu

NX projesinde `har-mock-plugin`'i bir local library olarak eklemek için iki yol var:

- **Yol A:** Paketi `libs/` altına kopyala → NX path mapping ile kullan *(önerilen — build gerektirmez)*
- **Yol B:** Yalc ile bağla → NX uygulaması tüketir *(bağımsız proje senaryosu)*

### Yol A: `libs/` Altına Local Library Olarak Ekleme (Önerilen)

Bu yöntemde `har-mock-plugin`'in kaynak kodunu NX monoreponun `libs/` klasörüne kopyalar ve NX path alias üzerinden import edersin.

#### Adım A-1: Kaynak dosyaları kopyala

```bash
# NX monoreponun kök dizininde
mkdir -p libs/har-mock-plugin/src

# har-mock-plugin projesinin kaynak dosyalarını kopyala
cp -r /path/to/har-mock-plugin/packages/angular-plugin/src/. \
      libs/har-mock-plugin/src/

cp /path/to/har-mock-plugin/packages/angular-plugin/package.json \
   libs/har-mock-plugin/
```

#### Adım A-2: `libs/har-mock-plugin/` yapısını oluştur

```
libs/
└── har-mock-plugin/
    ├── src/
    │   ├── index.ts           ← public API re-export
    │   └── lib/
    │       ├── initializer/
    │       ├── interceptor/
    │       ├── provider/
    │       └── types/
    ├── ng-package.json        ← (opsiyonel, NX build için)
    └── project.json           ← NX proje tanımı
```

`libs/har-mock-plugin/src/index.ts` dosyası:

```typescript
export { HarMockConfig, MockMode, HAR_MOCK_CONFIG } from './lib/types/har-mock-config.types';
export { provideHarMock } from './lib/provider/provide-har-mock';
export { harMockInterceptor, HarLoaderService } from './lib/interceptor';
```

#### Adım A-3: NX `project.json` oluştur

`libs/har-mock-plugin/project.json`:

```json
{
  "name": "har-mock-plugin",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library",
  "sourceRoot": "libs/har-mock-plugin/src",
  "prefix": "lib",
  "targets": {
    "build": {
      "executor": "@nx/angular:ng-packagr-lite",
      "outputs": ["{workspaceRoot}/dist/libs/har-mock-plugin"],
      "options": {
        "project": "libs/har-mock-plugin/ng-package.json"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libs/har-mock-plugin"],
      "options": {
        "jestConfig": "libs/har-mock-plugin/jest.config.ts"
      }
    }
  },
  "tags": ["scope:shared", "type:util"]
}
```

#### Adım A-4: TypeScript path alias ekle

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

#### Adım A-5: `@har-mock/core` bağımlılığını ekle

`har-mock-plugin` kaynak kodu `@har-mock/core` paketine bağımlıdır. NX monoreponun `package.json`'ına ekle:

```bash
# NX monorepo kökünde
npm install /path/to/har-mock-plugin/packages/core
# veya yalc ile:
cd /path/to/har-mock-plugin/packages/core && yalc publish
cd /path/to/nx-project && yalc add @har-mock/core
```

#### Adım A-6: Uygulamada kullan

```typescript
// apps/my-app/src/app/app.config.ts
import { provideHarMock } from 'har-mock-plugin';  // path alias üzerinden

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideHarMock({
      harUrl: '/assets/har-mock.har',
    }),
  ],
};
```

---

### Yol B: Yalc ile NX Uygulamasına Bağlama

NX uygulaması, `har-mock-plugin`'i **bağımsız bir paket gibi** tüketmek istiyorsa yalc kullanılır.

```bash
# har-mock-plugin projesinde
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc publish

# NX monorepo kökünde
yalc add har-mock-plugin
npm install
```

`tsconfig.base.json`'da herhangi bir path eklemesi gerekmez; `node_modules/har-mock-plugin` üzerinden çözülür.

NX uygulama `project.json`'ında `implicitDependencies` ekleyebilirsin:

```json
{
  "implicitDependencies": ["har-mock-plugin"]
}
```

---

## Yapılandırma Seçenekleri

`provideHarMock(config?: HarMockConfig)` tüm parametreler opsiyoneldir.

```typescript
provideHarMock({
  // HAR dosyasının URL'i (Angular assets klasöründen yüklenir)
  harUrl: '/assets/har-mock.har',     // default

  // Yanıt seçim modu
  // 'last-match': URL ile eşleşen son entry kullanılır
  // 'sequential': Her istek için sıradaki entry kullanılır
  mode: 'last-match',                 // default

  // Plugin etkin mi?
  // Double-lock: isDevMode()=false ise bu değerden bağımsız olarak devre dışı kalır
  enabled: true,                      // default

  // Dev modunda route guard'larını bypass et
  bypassGuards: false,                // default

  // bypassGuards=true iken korunacak guard'lar (silinmez)
  // Class-based ve functional guard referanslarını destekler
  preserveGuards: [],                 // default

  // Kural tabanlı mock listesi (HAR'dan önce değerlendirilir)
  rules: [],                          // default
})
```

### `preserveGuards` Detayı

`bypassGuards: true` etkinken bazı guard'ların silinmemesini istiyorsan `preserveGuards` listesi kullanılır.

```typescript
import { BssPermissionGuard } from '@my-app/guards';

// Fonksiyonel guard örneği
const analyticsGuard = () => true;

provideHarMock({
  bypassGuards: true,
  preserveGuards: [
    BssPermissionGuard,   // class-based guard — constructor referansı
    analyticsGuard,       // functional guard — fonksiyon referansı (aynı referans olmalı!)
  ],
});
```

> **Önemli:** Fonksiyonel guard'lar için route config'de kullanılan **aynı fonksiyon referansı** geçirilmelidir.
> Lambda yazarak `[() => true]` geçirmek çalışmaz çünkü her lambda yeni bir referans oluşturur.

---

## HAR Dosyası Hazırlama

### Tarayıcıdan HAR dışa aktarma

1. Chrome DevTools → **Network** sekmesi
2. Ağ trafiğini kaydet (istekler yapılsın)
3. Herhangi bir isteğe sağ tıkla → **Save all as HAR with content**
4. Dosyayı `src/assets/har-mock.har` olarak kaydet

### HAR dosyası yerleşimi

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har
```

### `angular.json` assets yapılandırması

Varsayılan Angular CLI projelerinde `src/assets` zaten dahildir. Farklı bir yol kullanıyorsan:

```json
// angular.json → projects → my-app → architect → build → options → assets
"assets": [
  "src/favicon.ico",
  "src/assets"
]
```

Özel bir HAR URL'i belirtmek için:

```typescript
provideHarMock({
  harUrl: '/assets/api-responses.har',
})
```

---

## Doğrulama

Kurulum başarılıysa uygulama başlatıldığında tarayıcı konsolunda şunu görürsün:

```
[HarMock] HAR loaded: 42 entries
```

HTTP isteklerinin mock'landığını doğrulamak için:

1. **Chrome DevTools → Network** sekmesini aç
2. HAR'da tanımlı bir endpoint'e istek yap (örn. `/api/users`)
3. İstek `(disk cache)` veya çok hızlı tamamlanıyorsa → mock çalışıyor
4. Response'u incele → HAR'daki yanıtla eşleşmeli

### Guard bypass doğrulama

```typescript
// app.component.ts veya herhangi bir component'te
import { Router } from '@angular/router';
import { inject } from '@angular/core';

// Router.config'i konsolda incele
const router = inject(Router);
console.log(router.config);
// canActivate dizileri preserveGuards listesindekiler dışında boş olmalı
```

---

## Sık Yapılan Hatalar

### `Cannot find module 'har-mock-plugin'`

Path alias veya yalc kurulumu eksik. Kontrol et:

```bash
# node_modules'de var mı?
ls node_modules/har-mock-plugin

# yalc ile kurulduysa .yalc'da var mı?
ls .yalc/har-mock-plugin
```

NX kullanıyorsan `tsconfig.base.json`'da path alias'ı kontrol et.

---

### `HAR file not found` veya 404 hatası

`src/assets/har-mock.har` dosyasının mevcut olduğunu ve `angular.json` assets'ine dahil edildiğini kontrol et.

```bash
ls src/assets/har-mock.har
```

---

### Plugin production'da da aktif oluyor

Plugin **double-lock** mekanizması ile korunur: `isDevMode()` false döndüğünde otomatik devre dışı kalır. `enabled: true` olsa bile production build'de çalışmaz.

Kontrol et: `ng build --configuration=production` ile derlendiğinde `isDevMode()` false olur.

---

### `preserveGuards` çalışmıyor (guard hâlâ siliniyor)

Fonksiyonel guard kullanıyorsan **aynı referansı** geçirdiğinden emin ol:

```typescript
// ❌ Yanlış — her çağrıda yeni lambda referansı
provideHarMock({
  preserveGuards: [() => inject(BssPermissionGuard).canActivate()],
});

// ✅ Doğru — modül scope'unda tanımlı sabit referans
export const bssPermissionGuardFn = () => inject(BssPermissionGuard).canActivate();

provideHarMock({
  preserveGuards: [bssPermissionGuardFn],
});
```

Class-based guard için doğrudan class'ı geçirmek yeterli:

```typescript
// ✅ Doğru
provideHarMock({
  preserveGuards: [BssPermissionGuard],
});
```

---

### NX'te circular dependency uyarısı

`har-mock-plugin` library'sini `libs/` altına eklediysen NX dependency boundary kurallarına dikkat et. `project.json`'da `tags` ile kısıtlama ekle:

```json
// libs/har-mock-plugin/project.json
{
  "tags": ["scope:shared", "type:util"]
}
```

`.eslintrc.json`'da `nx/enforce-module-boundaries` kuralı varsa `scope:shared` tag'ına izin ver.
