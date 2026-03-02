# HAR Mock Plugin — Chrome Extension Kullanım & Entegrasyon Kılavuzu

> **Versiyon:** 0.0.1  
> **Platform:** Chrome MV3 Extension  
> **Uyumluluk:** Chromium tabanlı tüm tarayıcılar (Chrome, Edge, Brave, Arc…)

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [Extension Yükleme (Chrome'a)](#extension-yükleme-chromea)
4. [Temel Kavramlar](#temel-kavramlar)
5. [İlk Kullanım — HAR Dosyası Yükleme](#i̇lk-kullanım--har-dosyası-yükleme)
6. [HAR Dosyası Hazırlama](#har-dosyası-hazırlama)
7. [Controls — Yapılandırma Paneli](#controls--yapılandırma-paneli)
   - [HAR Yönetimi](#har-yönetimi)
   - [Rule Yönetimi](#rule-yönetimi)
   - [Storage Inject](#storage-inject)
   - [Ayarlar (Settings)](#ayarlar-settings)
8. [Monitor — Canlı İstek Takibi](#monitor--canlı-i̇stek-takibi)
9. [Response Düzenleme](#response-düzenleme)
10. [Interception Çalışma Prensibi](#interception-çalışma-prensibi)
11. [Öncelik Zinciri (Priority Chain)](#öncelik-zinciri-priority-chain)
12. [Mimari Genel Bakış](#mimari-genel-bakış)
13. [Geliştiriciler İçin Build & Test](#geliştiriciler-i̇çin-build--test)
14. [Sık Sorulan Sorular (SSS)](#sık-sorulan-sorular-sss)
15. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakış

**HAR Mock Plugin**, tarayıcıdan dışa aktarılan HAR (HTTP Archive) dosyalarını kullanarak HTTP isteklerini yakalayıp mock yanıtlar döndüren bir Chrome Extension'dır.

### Ne İşe Yarar?

- **Backend olmadan frontend geliştirme:** API henüz hazır değilken HAR dosyasıyla çalış
- **Hata senaryosu simülasyonu:** 500, 404, 429 gibi HTTP yanıtlarını kolayca test et
- **Performans testi:** Gerçek network gecikmelerini HAR timing ile simüle et
- **Bağımsız demo ortamı:** Canlı API'ye bağımlı olmadan demo hazırla
- **API regresyon testi:** Bilinen yanıtlarla UI davranışını doğrula

### Temel Özellikler

| Özellik               | Açıklama                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| HAR Yükleme           | Drag & drop veya dosya seçici ile `.har` dosyası yükle                           |
| Fetch & XHR Yakalama  | `window.fetch` ve `XMLHttpRequest` otomatik override                             |
| Rule Tabanlı Mock     | HAR'dan bağımsız, URL pattern + method + status + body ile özel mock tanımla     |
| Canlı Monitor         | Gerçek zamanlı istek akışı — hangi istekler mock'landı, hangisi passthrough oldu |
| Response Düzenleme    | CodeMirror 6 JSON editörü ile yanıtları yerinde düzenle ve kalıcı kaydet         |
| Timing Replay         | HAR'daki `wait + receive` süresini gecikme olarak uygula                         |
| Exclude List          | Belirli URL pattern'larını mock'lamadan geçir                                    |
| Domain Filter         | Sadece belirli domain'leri mock'la                                               |
| Storage Inject        | `localStorage` / `sessionStorage`'a anahtar-değer çiftleri inject et             |
| Tek Tuşla Açma/Kapama | Extension'ı anlık olarak devre dışı bırak                                        |

---

## Kurulum

### Ön Koşullar

| Gereksinim        | Minimum Versiyon   |
| ----------------- | ------------------ |
| Node.js           | 18+                |
| Yarn              | 1.22+              |
| Chrome / Chromium | 116+ (MV3 desteği) |

### Build

```bash
# 1. Proje kökünde bağımlılıkları kur
yarn install

# 2. Core paketini derle (extension buna bağımlı)
yarn build:core

# 3. Extension'ı derle
yarn build:extension
```

Build çıktısı `packages/extension/dist/` klasöründe oluşur:

```
packages/extension/dist/
├── background.js         ← Service Worker
├── content.js            ← Content Script (ISOLATED world)
├── interceptor.js        ← Interceptor (MAIN world)
├── popup/
│   └── index.html        ← Popup UI
├── manifest.json
├── icon-16.png
├── icon-48.png
└── icon-128.png
```

> **Dev build için:** `yarn workspace @har-mock/extension build:dev` — source map'lerle birlikte derlenir.

---

## Extension Yükleme (Chrome'a)

1. Chrome'da `chrome://extensions` adresine git
2. Sağ üstten **"Geliştirici modu"** (Developer mode) toggle'ını aç
3. **"Paketlenmemiş öğe yükle"** (Load unpacked) butonuna tıkla
4. `packages/extension/dist/extension` klasörünü seç
5. Extension yüklenecek ve araç çubuğunda **HAR Mock Plugin** ikonu görünecek

> **İpucu:** Extension ikonunu araç çubuğuna sabitlemek için 🧩 (puzzle) ikonuna tıklayıp "Sabitle" (Pin) butonuna bas.

### Extension Güncelleme

Kod değişikliği sonrası:

```bash
yarn build:extension
```

Ardından `chrome://extensions` sayfasında extension kartındaki **yeniden yükle** (↻) butonuna tıkla. Açık sekmelerde **sayfayı yenile** (F5).

---

## Temel Kavramlar

### HAR Dosyası

HAR (HTTP Archive), tarayıcı ağ trafiğinin standart bir JSON formatıdır. Chrome DevTools'tan dışa aktarabilirsin. Extension bu dosyadaki HTTP yanıtlarını kullanarak gerçek API çağrılarını taklit eder.

### URL Pattern & Auto-Parameterization

HAR dosyası yüklendiğinde URL'ler otomatik olarak parametrize edilir. Örneğin:

```
/api/users/123    → /api/users/{param}
/api/users/456    → /api/users/{param}
```

Bu sayede aynı endpoint'e farklı ID'lerle yapılan istekler tek bir pattern ile eşleşir.

### Replay Modları

| Mod          | Davranış                                               |
| ------------ | ------------------------------------------------------ |
| `last-match` | URL ile eşleşen **son** HAR entry'sinin yanıtı döner   |
| `sequential` | Her istek için sıradaki entry kullanılır (round-robin) |

### Mock Rule

HAR'dan bağımsız, kullanıcı tarafından tanımlanan mock kurallarıdır. Priority chain'de HAR'dan **önce** değerlendirilir.

---

## İlk Kullanım — HAR Dosyası Yükleme

1. Extension ikonuna tıklayarak popup'ı aç
2. **Controls** sekmesinde **HAR** accordion'unu genişlet
3. `.har` dosyanı:
   - **Sürükle-bırak (drag & drop)** ile yükleme alanına bırak, veya
   - **Dosya Seç** butonuna tıklayarak dosya seçiciden seç
4. Yükleme başarılıysa dosya adı ve bulunan entry sayısı gösterilir
5. **Artık sayfanı yenile** — bu andan itibaren HAR'daki URL'lerle eşleşen istekler mock yanıt alacak

### Hızlı Doğrulama

1. **Monitor** sekmesine geç
2. Sayfanı yenile veya bir aksiyon yap
3. İsteklerin yanında yeşil **"HAR ✓"** veya mavi **"Rule ✓"** badge'i görüyorsan → mock çalışıyor
4. Gri **"→"** badge'i → bu istek passthrough olmuş (mock'lanmamış)

---

## HAR Dosyası Hazırlama

### Chrome DevTools ile HAR Dışa Aktarma

1. Mock'lamak istediğin web uygulamasını aç
2. **Chrome DevTools → Network** sekmesini aç (`F12` veya `Ctrl+Shift+I`)
3. Sayfayı yenile veya mock'lamak istediğin aksiyonları gerçekleştir
4. Network logları dolunca herhangi bir isteğe **sağ tıkla**
5. **"Save all as HAR with content"** seç
6. Dosyayı kaydet (ör. `my-app-api.har`)

### İpuçları

- HAR'da **sadece API isteklerini** tutmak istiyorsan, Network sekmesinde **XHR/Fetch** filtresini etkinleştirip dışa aktar
- HAR dosyası büyükse gereksiz kaynak isteklerini (CSS, JS, image) metin editörüyle temizleyebilirsin
- Hassas veriler (token, cookie) içerebilir — `.gitignore`'a eklemeyi unutma

---

## Controls — Yapılandırma Paneli

Extension popup'ı iki sekmeden oluşur: **Controls** ve **Monitor**. Controls sekmesinde tüm yapılandırma işlemleri yapılır.

### HAR Yönetimi

**HAR** accordion'u altında:

| İşlem                | Açıklama                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| **Dosya Yükle**      | Drag & drop veya dosya seçici ile `.har` yükle                           |
| **HAR Temizle**      | Yüklü HAR'ı tamamen sil                                                  |
| **Farklı HAR Yükle** | Mevcut HAR'ı silip yeni dosya yükle                                      |
| **Replay Modu**      | `last-match` (son eşleşen) veya `sequential` (sıralı) strateji seç       |
| **Timing Replay**    | Açıkken HAR'daki gerçek `wait + receive` süresini gecikme olarak uygular |

#### Timing Replay Detayı

HAR dosyasındaki her entry'de `timings.wait` (TTFB) ve `timings.receive` (indirme süresi) değerleri bulunur. Timing Replay açıkken bu süreler toplam gecikme olarak uygulanır:

```
Toplam gecikme = wait + receive (milisaniye)
```

Bu sayede gerçek ağ koşullarını simüle edebilirsin. Kapalıyken (varsayılan) yanıt anında döner.

---

### Rule Yönetimi

**Rules** accordion'u altında HAR'dan bağımsız mock kuralları tanımlanır.

#### Yeni Rule Oluşturma

1. **"+ Yeni Rule"** butonuna tıkla
2. Formu doldur:

| Alan              | Açıklama                             | Örnek                           |
| ----------------- | ------------------------------------ | ------------------------------- |
| **URL Pattern**   | Exact URL veya wildcard (`*`) kullan | `/api/users`, `/api/data/*`     |
| **Method**        | HTTP metodu                          | `GET`, `POST`, `PUT`, `DELETE`… |
| **Status Code**   | Yanıt durum kodu (100-599)           | `200`, `404`, `500`             |
| **Response Body** | JSON formatında yanıt gövdesi        | `{"users": []}`                 |
| **Delay (ms)**    | Yapay gecikme süresi                 | `0` (anında), `1500` (1.5s)     |
| **Enabled**       | Rule aktif/pasif                     | ✓ / ✗                           |

3. **"Kaydet"** butonuna tıkla

#### Rule Düzenleme & Silme

- **Düzenleme:** Rule listesinde bir rule'un yanındaki ✏️ (düzenle) butonuna tıkla → form önceki değerlerle dolar → değişiklikleri yap → Kaydet
- **Silme:** 🗑️ (sil) butonu → inline onay mesajı → "Evet" ile sil

#### URL Pattern Söz Dizimi

| Pattern          | Eşleşir                                | Eşleşmez         |
| ---------------- | -------------------------------------- | ---------------- |
| `/api/users`     | `/api/users` (exact)                   | `/api/users/123` |
| `/api/users/*`   | `/api/users/123`, `/api/users/abc`     | `/api/users`     |
| `/api/*/profile` | `/api/123/profile`, `/api/abc/profile` | `/api/users`     |

> **Önemli:** Rule'lar priority chain'de HAR'dan **önce** değerlendirilir. Aynı URL için hem rule hem HAR eşleşmesi varsa rule kazanır.

---

### Storage Inject

**Storage** accordion'u altında sayfa yüklendiğinde `localStorage` veya `sessionStorage`'a otomatik olarak değer enjekte edebilirsin.

#### Kullanım Senaryoları

- **Auth token inject:** Login olmadan token set ederek backend çağrılarını test et
- **Feature flag:** `localStorage`'daki flag'leri override et
- **Kullanıcı tercihleri:** Tema, dil gibi ayarları önceden set et

#### Nasıl Kullanılır

1. **Tip seç:** `localStorage` veya `sessionStorage`
2. **Key** ve **Value** alanlarını doldur
3. **"Ekle"** butonuna tıkla → listeye eklenir
4. Tüm entry'leri ekledikten sonra **"Kaydet & Inject Et"** butonuna bas
5. Tüm açık sekmelere anında inject edilir; yeni açılan sekmelerde de otomatik uygulanır

| Alan      | Açıklama                | Örnek                                  |
| --------- | ----------------------- | -------------------------------------- |
| **Type**  | Storage tipi toggle     | `localStorage` / `sessionStorage`      |
| **Key**   | Storage anahtarı        | `auth_token`, `theme`, `feature_flags` |
| **Value** | Storage değeri (string) | `"eyJhbGciOi..."`, `"dark"`, `"true"`  |

#### Önemli Notlar

- Extension kapatılınca veya "Kaydet" ile boş liste gönderilince **önceki inject'ler temizlenir**
- Value her zaman **string** olarak yazılır (`JSON.stringify` gerekmez, direkt string gir)
- Her sayfa yenilemesinde inject otomatik tekrarlanır

---

### Ayarlar (Settings)

**Settings** accordion'u altında genel extension ayarları yönetilir.

#### Extension Açma/Kapama

Tek bir toggle ile tüm interception'ı anlık olarak açıp kapatabilirsin. Kapatıldığında:

- Tüm HTTP istekleri doğrudan sunucuya gider (passthrough)
- Storage inject durur
- Monitor'da yeni event oluşmaz
- HAR ve rule verileri **korunur** (silinmez)

#### Exclude List (URL Dışlama)

Mock'lanmasını istemediğin URL'leri buraya ekle. **Substring match** uygulanır — URL'de bu metin geçiyorsa istek passthrough olur.

```
Örnek: /api/auth eklenirse
✗ Mock'lanmaz: https://api.example.com/api/auth/login
✗ Mock'lanmaz: https://api.example.com/api/auth/refresh
✓ Mock'lanır: https://api.example.com/api/users
```

**Kullanım:** Input alanına pattern yaz → Enter veya **"Ekle"** butonu → listeye eklenir. Kaldırmak için ✗ butonuna tıkla.

#### Domain Filter

Sadece belirli domain'lerden gelen istekleri mock'lamak istiyorsan domain filter kullan. **Boş bırakılırsa tüm domain'ler mock'lanır.**

```
Örnek: api.example.com eklenirse
✓ Mock'lanır: https://api.example.com/users
✓ Mock'lanır: https://sub.api.example.com/users  (subdomain desteği)
✗ Mock'lanmaz: https://other-api.com/users
```

IP:Port formatı da desteklenir: `15.237.105.224:8080`

#### Factory Reset

**"Tümünü Sıfırla"** butonu ile extension'ın tüm verilerini temizleyebilirsin:

- HAR verileri silinir
- Tüm rule'lar silinir
- Düzenlenmiş yanıtlar silinir
- Storage entry'leri silinir
- Ayarlar varsayılana döner
- Match history temizlenir

> ⚠️ Bu işlem geri alınamaz. Onay penceresi gösterilir.

---

## Monitor — Canlı İstek Takibi

**Monitor** sekmesinde extension aktifken gerçek zamanlı istek akışını takip edebilirsin.

### Feed Görünümü

Her satırda şu bilgiler gösterilir:

| Sütun      | Açıklama                                                       |
| ---------- | -------------------------------------------------------------- |
| **Method** | HTTP metodu (renkli badge: GET=yeşil, POST=mavi, PUT=turuncu…) |
| **URL**    | İstek URL'i (uzunsa kırpılır)                                  |
| **Status** | HTTP durum kodu (renkli: 2xx=yeşil, 4xx=turuncu, 5xx=kırmızı)  |
| **Zaman**  | Göreli zaman ("şimdi", "5s", "2m", "1h")                       |
| **Kaynak** | Badge: 🟢 **Rule ✓** / 🔵 **HAR ✓** / ⬜ **→** (passthrough)   |

### İşlemler

- **Event'e tıkla** → Sağ panelde response detayı ve JSON editörü açılır
- **"Temizle"** butonu → Tüm feed geçmişini sil
- Maksimum 500 event tutulur; eski event'ler otomatik kırpılır
- Kullanıcı scroll pozisyonu korunur (auto-scroll compensation)

---

## Response Düzenleme

Monitor'da bir event'e tıklayınca **Response Viewer** paneli açılır. Bu panelde:

1. **Mevcut yanıtı görüntüle:** HAR'dan veya rule'dan gelen orijinal yanıt JSON formatında gösterilir
2. **Düzenle:** CodeMirror 6 JSON editöründe değişiklik yap
3. **Kaydet:** "Kaydet" butonuna bas → bu URL+method kombinasyonu için düzenlenmiş yanıt kalıcı olarak saklanır

### Düzenlenmiş Yanıt Önceliği

Bir yanıt düzenlendiğinde, priority chain'de **en yüksek önceliğe** sahip olur:

```
Edited Response > Rule > HAR > Passthrough
```

Bu sayede HAR'daki veya rule'daki yanıtı override edebilir, tek seferlik testler için hızlıca yanıt değiştirebilirsin.

> **Not:** Düzenlenmiş yanıtlar "Factory Reset" ile temizlenir.

---

## Interception Çalışma Prensibi

Extension, web sayfasındaki HTTP isteklerini şu mekanizmayla yakalar:

### 1. Fetch Interception

`window.fetch` fonksiyonu override edilir. Bir `fetch()` çağrısı yapıldığında:

1. URL ve HTTP method çıkarılır
2. Background Service Worker'a `MATCH_QUERY` mesajı gönderilir
3. Eşleşme varsa → `new Response(body, {status, headers})` üretilip döndürülür
4. Eşleşme yoksa → orijinal `fetch()` çağrılır (passthrough)

### 2. XHR Interception

`XMLHttpRequest.prototype.open` ve `.send` override edilir:

1. `open()` çağrısında method ve URL kaydedilir
2. `send()` çağrısında Background'a sorgu gönderilir
3. Eşleşme varsa → `readyState`, `status`, `responseText` property'leri override edilir ve `readystatechange → load → loadend` event'leri dispatch edilir
4. Eşleşme yoksa → orijinal `send()` çağrılır

> **Not:** **Senkron XHR** istekleri mock'lanmaz (async resolver kullanılamadığı için). Bu istekler her zaman passthrough olur.

### 3. İletişim Katmanı

Extension üç izole bağlamda çalışır ve aralarında mesajlaşma ile koordine olur:

```
┌──────────────┐   chrome.runtime.Port   ┌─────────────────────┐
│  Popup (UI)  │◄───────────────────────►│  Background          │
│              │   STATE_SYNC            │  Service Worker      │
│              │   MATCH_EVENT           │  (StateManager)      │
└──────────────┘   Komut mesajları       └──────────┬──────────┘
                                         chrome.runtime.Port │
                                                             │
                                         ┌──────────┴──────────┐
                                         │  Content Script      │
                                         │  (ISOLATED world)    │
                                         │  ↕ window.postMessage│
                                         │  Interceptor         │
                                         │  (MAIN world)        │
                                         └─────────────────────┘
```

- **Popup ↔ Background:** `chrome.runtime.Port` üzerinden (`har-mock-popup` portu)
- **Content ↔ Background:** `chrome.runtime.Port` üzerinden (`har-mock-content-{id}` portu)
- **Content (ISOLATED) ↔ Interceptor (MAIN):** `window.postMessage` üzerinden (`__HAR_MOCK__` kanalı)

---

## Öncelik Zinciri (Priority Chain)

Bir HTTP isteği yakalandığında şu sırayla değerlendirilir:

```
1. Extension kapalı mı?           → Evet: Passthrough
2. Domain filter'da mı?           → Hayır: Passthrough
3. Exclude list'te mi?            → Evet: Passthrough
4. Düzenlenmiş yanıt var mı?      → Evet: Edited Response döner ★ En yüksek öncelik
5. Rule eşleşmesi var mı?         → Evet: Rule yanıtı döner
6. HAR pattern eşleşmesi var mı?  → Evet: HAR yanıtı döner
7. Hiçbiri eşleşmedi              → Passthrough (orijinal sunucuya git)
```

### Detaylı Akış

| Adım | Kontrol                                                        | Sonuç                                                       |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 1    | `settings.enabled === false`                                   | Tüm istekler passthrough                                    |
| 2    | `domainFilter` dolu ve URL host eşleşmiyor                     | Passthrough                                                 |
| 3    | `excludeList`'teki bir pattern URL'de substring olarak geçiyor | Passthrough                                                 |
| 4    | `editedResponses[METHOD:URL]` mevcut                           | Düzenlenmiş yanıt döner                                     |
| 5    | `evaluate(request, rules)` eşleşme buldu                       | Rule yanıtı döner                                           |
| 6    | `matchUrl(url, method, patterns)` eşleşme buldu                | HAR yanıtı döner (replay mode'a göre sequential/last-match) |
| 7    | Hiçbir eşleşme yok                                             | Orijinal istek sunucuya gönderilir                          |

---

## Mimari Genel Bakış

### Bileşen Yapısı

```
Extension
├── Popup (Angular 18 Standalone Components + Tailwind CSS)
│   ├── AppComponent
│   │   ├── TabBarComponent          → Controls / Monitor sekme geçişi
│   │   ├── ControlsTabComponent     → Tüm yapılandırma UI'ı
│   │   │   ├── HarUploadComponent    → HAR dosya yükleme
│   │   │   ├── StrategyToggleComponent → Replay modu seçimi
│   │   │   ├── HmRuleListComponent   → Rule listeleme
│   │   │   ├── HmRuleFormComponent   → Rule oluşturma/düzenleme formu
│   │   │   │   └── HmJsonEditorComponent (CodeMirror 6)
│   │   │   ├── StorageInjectComponent → localStorage/sessionStorage inject
│   │   │   ├── SettingsSectionComponent → Extension toggle
│   │   │   └── HmExcludeListComponent → Exclude list & Domain filter
│   │   └── MonitorTabComponent       → Canlı istek akışı
│   │       └── HmResponseViewerComponent → Response görüntüleme/düzenleme
│   └── ExtensionMessagingService     → Background ile iletişim singleton
│
├── Background (Service Worker)
│   ├── StateManager    → Hibrit cache (chrome.storage.local + in-memory)
│   ├── PortManager     → Content & Popup port yönetimi
│   ├── MessageHandler  → Mesaj dispatch & işleme
│   └── KeepAlive       → 24s alarm ile SW idle timeout koruması
│
├── Content Script (ISOLATED world)
│   └── content.ts      → MAIN ↔ Background bridge
│
└── Interceptor (MAIN world)
    ├── MockResolver       → Background'a sorgu gönder, yanıt al
    ├── FetchInterceptor   → window.fetch override
    ├── XhrInterceptor     → XMLHttpRequest override
    └── StorageInjector    → localStorage/sessionStorage inject
```

### Veri Depolama (chrome.storage.local)

| Key               | Tip                              | Açıklama                                          |
| ----------------- | -------------------------------- | ------------------------------------------------- |
| `harData`         | `HarSessionData \| null`         | Yüklü HAR dosyası (entries + patterns + fileName) |
| `activeRules`     | `MockRule[]`                     | Kullanıcı tanımlı mock kuralları                  |
| `matchHistory`    | `MatchEvent[]`                   | Monitor feed geçmişi (max 500)                    |
| `editedResponses` | `Record<string, EditedResponse>` | Düzenlenmiş yanıtlar (`METHOD:URL` key)           |
| `settings`        | `ExtensionSettings`              | Genel ayarlar                                     |
| `storageEntries`  | `StorageEntry[]`                 | Storage inject entry'leri                         |

### Varsayılan Ayarlar

```typescript
{
  enabled: true,
  replayMode: 'last-match',
  timingReplay: false,
  excludeList: [],
  resourceTypeFilter: ['xhr', 'fetch'],
  domainFilter: [],
}
```

---

## Geliştiriciler İçin Build & Test

### Geliştirme Build

```bash
# Tek seferlik build (production)
yarn build:extension

# Geliştirme build (source maps dahil)
yarn workspace @har-mock/extension build:dev
```

### Test

```bash
# Extension testlerini çalıştır
yarn workspace @har-mock/extension test

# Coverage raporu ile
yarn workspace @har-mock/extension test:coverage
```

### Proje Bağımlılıkları

```
@har-mock/extension
└── @har-mock/core (workspace dependency)
    ├── HAR parser & validator
    ├── URL matcher & pattern compiler
    ├── Auto-parameterization engine
    ├── Rule engine (evaluate)
    └── Priority chain (resolve)
```

Core paketini değiştirdikten sonra extension'ı yeniden build etmeyi unutma:

```bash
yarn build:core
yarn build:extension
```

---

## Sık Sorulan Sorular (SSS)

### Extension tüm web sitelerinde mi çalışır?

Evet, `<all_urls>` host permission ile tüm HTTP/HTTPS sayfalarında çalışır. Domain filter ile belirli sitelere sınırlandırabilirsin.

### HAR dosyası ne kadar büyük olabilir?

Teknik bir üst sınır yok ama `chrome.storage.local` varsayılan 10MB limiti var. Çok büyük HAR dosyalarında performans düşebilir. Gereksiz kaynakları (image, CSS, JS) temizleyerek dosya boyutunu küçültmeni öneririz.

### Extension kapatılınca veriler silinir mi?

Hayır. `chrome.storage.local` kalıcıdır. HAR, rule'lar ve düzenlenmiş yanıtlar tarayıcı kapansa bile korunur. Silmek için "Tümünü Sıfırla" kullan.

### Senkron XHR neden mock'lanmıyor?

`XMLHttpRequest` senkron modda çağrıldığında async resolver kullanılamaz. Bu teknik bir kısıttır ve senkron XHR modern web uygulamalarında son derece nadir kullanılır.

### Birden fazla HAR dosyası yükleyebilir miyim?

Şu an tek bir HAR dosyası desteklenir. Yeni dosya yüklemek eskisinin yerine geçer. Birden fazla API'nin yanıtlarını tek bir HAR'da birleştirebilirsin.

### Rule ve HAR aynı URL'e eşleşirse hangisi kazanır?

Rule kazanır. Öncelik sırası: Edited Response > Rule > HAR > Passthrough.

---

## Sorun Giderme

### Extension aktif ama istekler mock'lanmıyor

1. **Extension toggle'ı kontrol et:** Controls → Settings → Extension açık mı?
2. **HAR yüklü mü?** Controls → HAR accordion'unda dosya adı ve entry sayısı görünüyor mu?
3. **Domain filter'ı kontrol et:** Boş değilse, hedef domain listede mi?
4. **Exclude list'i kontrol et:** Hedef URL bir exclude pattern'a eşleşiyor olabilir
5. **Sayfayı yenile:** Extension yüklendikten sonra sayfa yenilenmeli
6. **Monitor'ı kontrol et:** İstekler "→" (passthrough) badge'ı ile mi gösteriliyor? Eşleşme bulunamıyor demektir

### "Extension context invalidated" hatası

Extension güncellendiğinde veya yeniden yüklendiğinde eski content script'ler geçersiz olur. **Sayfayı yenile** (F5) ile çözülür.

### Service Worker uyuyor (idle timeout)

MV3 service worker'lar 30 saniye işlem olmazsa uyur. Extension bu durumu 24 saniyelik keep-alive alarm ile önler. Yine de sorun yaşıyorsan:

1. Extension toggle'ını kapat-aç
2. Popup'ı kapat-aç
3. Sayfayı yenile

### Popup boş/yüklenmiyor

1. `chrome://extensions` → extension hatasız mı kontrol et
2. "Errors" bağlantısına tıkla → konsol hatalarını incele
3. Extension'ı kaldırıp `dist/` klasöründen tekrar yükle

### Monitor'da event görünmüyor

1. Extension enabled mı?
2. Popup açıkken sayfa yenilendi mi? (Popup açılınca port bağlantısı kurulur)
3. Domain filter aktifse hedef domain listede mi?
