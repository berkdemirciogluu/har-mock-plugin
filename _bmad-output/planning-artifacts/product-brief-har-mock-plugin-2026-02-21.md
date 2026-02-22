---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-02-21.md
date: 2026-02-21
author: Berk
---

# Product Brief: har-mock-plugin

## Executive Summary

**har-mock-plugin**, frontend developer'ların production ortamında raporlanan bug'ları local ortamda birebir reproduce edebilmesini sağlayan bir araçtır. Geleneksel mock araçlarının aksine, manuel handler yazımı veya konfigürasyon gerektirmez — developer HAR dosyasını araca verir, araç URL pattern'larını otomatik eşleştirir ve prod'daki gerçek API response'larını local ortamda replay eder.

Araç iki bağımsız bileşenden oluşur: tüm web uygulamalarında çalışan bir **Chrome Extension** ve Angular uygulamalarına native entegrasyon sağlayan bir **Angular Plugin**. Her iki bileşen de aynı çekirdek problemi farklı katmanlarda çözer.

Temel değer önerisi: **"HAR dosyasını at, gerisini araç halleder."** Zero-config yaklaşımı ile developer, bug reproduction süresini dramatik şekilde kısaltır ve prod datayı local'de olduğu gibi debug edebilir.

---

## Core Vision

### Problem Statement

Production ortamında bir bug raporlandığında, frontend developer HAR dosyasını alıp API response'larını göz ile inceliyor ve kod üzerinde problemi bulmaya çalışıyor. Karmaşık kod yapılarında bu süreç uzuyor, ve en kritik risk **bug'ın hiç reproduce edilememesi**. Prod dataya doğrudan erişim yasak olduğundan, developer gerçek koşulları local'de oluşturamıyor — bu da bug tespitini tahmine dayalı ve verimsiz bir sürece dönüştürüyor.

### Problem Impact

- **Zaman kaybı:** HAR'ı göz ile inceleyerek API response'larını analiz etmek, özellikle karmaşık kod tabanlarında debug süresini ciddi şekilde uzatıyor.
- **Reproduce riski:** Bug'ın local'de yeniden üretilememesi, kesin tespitin yapılamaması ve düzeltmenin doğrulanamaması anlamına geliyor.
- **Veri erişim kısıtı:** Prod dataya erişim yasak — developer gerçek state'i local'de yaratamıyor, sadece HAR dosyasına bakarak çıkarım yapıyor.
- **Güvensiz düzeltmeler:** Gerçek data ile test edilmeyen fix'ler, prod'da farklı davranabilir.

### Why Existing Solutions Fall Short

- **MSW (Mock Service Worker):** Her endpoint için manuel handler yazılması gerekiyor. HAR'dan otomatik okuma yok. "Kendin mock data yaz" mantığıyla çalışıyor — prod datayı replay etmek için tasarlanmamış.
- **Postman Mock:** Manuel tanım gerektiriyor, HAR import'u sınırlı, browser içindeki Angular app ile doğrudan entegre olmuyor.
- **Charles Proxy:** HAR'dan replay yapabiliyor ama masaüstü proxy kurulumu gerektiriyor, Angular interceptor seviyesinde çalışmıyor, takım genelinde standartlaştırması zor.
- **Ortak eksik:** Hiçbiri "HAR'ı at → otomatik URL matching → zero config debug" deneyimini sunmuyor.

### Proposed Solution

**har-mock-plugin** iki bağımsız araç olarak çalışır:

1. **Chrome Extension (evrensel):** Content script `"world": "MAIN"` üzerinden `window.fetch` ve `XMLHttpRequest` monkey-patching ile intercept. Chrome MV3 ve Chrome Web Store uyumlu. Herhangi bir web uygulamasında çalışır. HAR dosyası file picker/drag & drop ile yüklenir, URL'ler otomatik parameterize edilir, response'lar replay edilir.

2. **Angular Plugin (native):** `HttpClient` interceptor olarak çalışır. `provideHarMock()` ile zero-config entegrasyon. `assets/har-mock.har` convention path'ine dosya koyulması yeterlidir.

**Çekirdek mekanizma:** HAR yüklendiğinde UUID, numeric ID, token gibi dinamik URL segmentleri otomatik tespit edilip pattern'lara çevrilir (auto-parameterization). Öncelik sırası: Rules → HAR → Passthrough.

**Ek yetenekler:** Rule-based mock mode (HAR olmadan error senaryoları test etme), aktif mock overlay (intercept edilen endpoint'lerin canlı listesi), sequential/last-match replay modları ve HAR timing replay (gerçek response gecikmesi simülasyonu).

### Key Differentiators

- **Zero-Config Deneyim:** HAR dosyasını ver, gerisini araç halleder. Manuel handler yazımı yok, endpoint tanımı yok.
- **Auto-Parameterization:** Dinamik URL segmentleri (ID, token, UUID) otomatik tespit edilip pattern'lara çevrilir — developer müdahalesi gerekmez.
- **Prod-to-Local Data Teleporter:** API mocker değil, prod state'inin fotoğrafını local'e taşıyan bir araç. Gerçek datayı gerçek haliyle debug etme imkânı.
- **İki Bağımsız Araç:** Extension evrensel çözüm sunarken, Angular Plugin framework-native performans ve entegrasyon avantajı sağlar.
- **Double-Lock Production Safety:** `enabled: true` VE `isDevMode() === true` çift kilit mekanizması ile prod'a sızma yapısal olarak imkânsız.

---

## Target Users

### Primary Users

**Persona: Frontend Developer — "Debug Emre"**

- **Profil:** Mid-Senior seviye frontend developer. Karmaşık, büyük ölçekli projelerde çalışıyor. Angular, React veya herhangi bir framework kullanabilir — araç framework-agnostik (Extension) ve Angular-native (Plugin) olarak iki katmanda hizmet veriyor.
- **Ortam:** Enterprise veya büyük ekip projelerinde çalışan, prod ortamına doğrudan erişimi olmayan developer. Bug raporları QA veya kullanıcılardan geliyor, HAR dosyaları yetkili kişilerden temin ediliyor.
- **Motivasyon:** Bug'ın kesin tespitini yapmak, düzeltmeyi doğrulamak, ve "bu bug'ı reproduce edemiyorum" cümlesinden kurtulmak.
- **Güncel acısı:** HAR dosyasını göz ile inceliyor, API response'larını okuyup kodda nerede patlıyor tahmin etmeye çalışıyor. Karmaşık kod tabanlarında bu süreç uzuyor, bazen bug hiç reproduce edilemiyor.
- **Başarı tanımı:** HAR dosyasını araca veriyor, uygulamayı açıyor, ve prod'daki ekranı birebir local'de görüyor — artık breakpoint koyup gerçek data üzerinde debug edebiliyor.

### Secondary Users

N/A — Araç doğrudan developer tarafından bireysel olarak benimseniyor ve kullanılıyor. HAR dosyasını ileten kişi (yetkili, QA) araçla doğrudan etkileşime girmiyor.

### User Journey

**1. Keşif**
Developer, Chrome Web Store'da arama yaparak veya takım arkadaşının önerisiyle araca ulaşır. "HAR mock", "API replay" gibi anahtar kelimelerle keşfeder.

**2. Onboarding (İlk Deneyim)**
Extension'ı kurar, HAR dosyasını sürükle-bırak ile yükler, replay mode'u seçer:
- **Sequential Mode:** Bug'a giden adımları birebir takip etmek için — sayfa adım adım gezilir, response'lar HAR'daki sırayla döner.
- **Last-Match Mode:** Direkt URL'e gidip o endpoint'in HAR'daki en son response'unu almak için.

**3. "Aha!" Anı**
Developer uygulamayı açtığında prod'daki ekranı birebir local'de görür. "Gerçekten bu kadar kolay mı?!" — HAR'ı yükledi, mode seçti, ve karşısında prod state'inin aynısı var.

**4. Çekirdek Kullanım**
Karmaşık, reproduce edilmesi zor bug'lar geldiğinde kullanılıyor. Her bug için değil, özellikle "göz ile HAR okuyarak çözemiyorum" durumlarında devreye giriyor.

**5. Uzun Vadeli Benimseme**
Developer bu aracı debug toolkit'inin kalıcı bir parçası haline getirir. Önce bireysel kullanır, sonra takım arkadaşlarına önerir — organik yayılım.

---

## Success Metrics

### User Success Metrics

- **Bug reproduction süresinde ölçülebilir kısalma:** HAR ile debug süresinin, HAR'ı göz ile inceleme yöntemine kıyasla anlamlı şekilde azalması. (Araç olmadan ~30 dk süren root cause tespiti, araçla belirgin şekilde kısalmalı.)
- **Reproduce edilemeyen bug sayısının azalması:** Prod datayı local'de birebir görebildiği için "bu bug'ı reproduce edemiyorum" vakalarının minimize olması.
- **Tekrarlayan kullanım:** Developer'ın karmaşık bug'larda aracı varsayılan debug yöntemi olarak tercih etmesi — araç toolkit'in kalıcı parçası haline gelmesi.

### Business Objectives

**Kısa Vade (0-3 ay) — Şirket İçi Benimseme:**
- Aracın şirket içinde çalışır durumda olması ve takımdaki tüm frontend developer'ların en az bir kez kullanmış olması.
- Herhangi bir karmaşık bug case'inde aracın akla ilk gelen çözüm olması.

**Uzun Vade (6-12 ay) — Açık Kaynak Büyüme:**
- Aracın açık kaynak olarak yayınlanması ve topluluk tarafından keşfedilmeye başlanması.
- Chrome Web Store ve npm üzerinden organik indirme ve kullanım büyümesi.

### Key Performance Indicators

| KPI | Ölçüm | Hedef Zaman |
|---|---|---|
| Şirket içi benimseme | Takımdaki tüm FE developer'lar kullanıyor | 3 ay |
| GitHub Stars | Organik star büyümesi | 6-12 ay |
| npm Downloads | Haftalık indirme sayısı artışı | 6-12 ay |
| Chrome Web Store Kullanıcıları | Aktif kullanıcı sayısı | 6-12 ay |
| Bug debug süresi | Araç ile debug süresinde ölçülebilir kısalma | 3 ay |
| Tekrar kullanım oranı | Developer'ların karmaşık bug'larda aracı tekrar tercih etmesi | 3 ay |

---

## MVP Scope

### Core Features

**MVP 1: Chrome Extension (Öncelikli)**

Evrensel, framework-agnostik debug aracı. Herhangi bir web uygulamasında çalışır.

| # | Özellik | Açıklama |
|---|---|---|
| 1 | HAR Dosyası Yükleme | File picker ve drag & drop ile HAR dosyası yükleme |
| 2 | Auto-Parameterization | UUID, numeric ID, token gibi dinamik URL segmentlerinin otomatik tespit edilip `{id}`, `{token}` pattern'larına çevrilmesi |
| 3 | Pattern-Based URL Matching | Dinamik segmentler soyutlanarak path template üzerinden eşleşme |
| 4 | Content Script Fetch/XHR Intercept | Content script MAIN world'de `fetch`/`XHR` monkey-patching ile request yakalama ve HAR response'u ile yanıtlama |
| 5 | Rule-First Priority Chain | `Request → Rules → HAR → Passthrough` öncelik sırası |
| 6 | Dual Replay Mode | Sequential Mode (adım adım) ve Last-Match Mode (son response) toggle |
| 7 | HAR Timing Replay | HAR'daki gerçek response time'ları ile gecikme simülasyonu |
| 8 | Rule-Based Mock UI | URL pattern + HTTP method + status + body + delay tanımlama; rule listesi yönetimi (ekle/sil/düzenle) |
| 9 | Active Mock Overlay | Canlı request listesi — "Rule ✓" / "HAR ✓" / "Passthrough →" etiketleri |
| 10 | Request Status Feed | Her satırda URL, method ve eşleşme durumu |
| 11 | Default-On + Selective Exclusion | HAR yüklendiinde tüm endpoint'ler aktif, kullanıcı exclude listesi yönetir |
| 12 | Optional Response Editor | Intercept edilen response'u overlay'den düzenleme imkânı |
| 13 | HAR Response Inline Edit & Persist | Overlay'deki canlı request listesinde herhangi bir response'un yanında "Edit" butonu. Response body düzenlenir, düzenleme HAR session'ına persist olur, sonraki isteklerde düzenlenmiş versiyon kullanılır |
| 14 | Extension Toggle | Popup'ta açık/kapalı toggle |
| 15 | Two-Phase State Recovery Faz A | null/undefined/boş URL segmentlerini dinamik parametre sayarak pattern matching'i esnetme |

**Bilinen Kısıt (Extension):** Guard'lar Angular runtime'da çalıştığı için Extension guard'lara müdahale edemez. Guard'lı route'larda Last-Match Mode ile direkt URL'e gidildiğinde, guard'ın çağırdığı API HAR'dan dönse bile response içeriği uygun değilse guard engelleyebilir. Çözüm: HAR Response Edit ile ilgili response'u düzenlemek veya Rule-Based Mock ile override tanımlamak. Alternatif: Sequential Mode kullanmak veya Angular Plugin'deki `bypassGuards` özelliğini tercih etmek.

**MVP 2: Angular Plugin**

Angular uygulamalarına native entegrasyon sağlayan `HttpClient` interceptor.

| # | Özellik | Açıklama |
|---|---|---|
| 1 | `provideHarMock()` API | `provideHarMock({ harUrl, mode, enabled, rules, bypassGuards })` ile programatik konfigürasyon |
| 2 | HttpClient Interceptor | Angular `HttpClient` seviyesinde request yakalama |
| 3 | Zero Config Convention | `assets/har-mock.har` convention path'ine dosya koyulması yeterli — `provideHarMock()` parametresiz çalışır |
| 4 | Double-Lock Production Safety | `enabled: true` VE `isDevMode() === true` çift kilit — prod'a sızma yapısal olarak imkânsız |
| 5 | Rule-First Priority Chain | Rules → HAR → Passthrough öncelik sırası |
| 6 | Asset-Based HAR Loading | `assets/` klasöründen HTTP fetch, lazy load, environment'a göre swap |
| 7 | Auto-Parameterization | Extension ile aynı çekirdek URL pattern matching |
| 8 | Dual Replay Mode | Sequential / Last-Match toggle |
| 9 | `bypassGuards: true` | Dev mode'da tüm route guard'ları (`CanActivate`, `CanDeactivate`, `CanMatch` vb.) otomatik `true` döndürerek devre dışı bırakır. Sadece `isDevMode() === true` iken çalışır |

### Out of Scope for MVP

| Özellik | Erteleme Gerekçesi |
|---|---|
| Multi-HAR Desteği | Gereksiz — tek HAR dosyası MVP için yeterli |
| Angular DevTools Panel | Plugin çekirdek işlevsellik sağladıktan sonra eklenecek |
| localStorage/sessionStorage Snapshot (State Recovery Faz B) | Chrome Extension HAR + storage snapshot birlikte export — ileri aşama |

### MVP Success Criteria

- **Extension MVP:** Tüm 15 çekirdek özellik çalışır durumda. Developer HAR yükleyip, mode seçip, uygulamayı açtığında prod ekranını local'de birebir görebiliyor. Rule-based mock, overlay, response editor ve exclude listesi fonksiyonel.
- **Angular Plugin MVP:** 9 çekirdek özellik çalışır durumda. `provideHarMock()` ile Angular app'te zero-config HAR replay aktif. Double-lock safety mekanizması prod leak'i engelliyor. `bypassGuards` ile guard'lar dev mode'da devre dışı bırakılabiliyor.
- **Geçiş kriteri:** Extension MVP tamamlandıktan ve şirket içinde kullanıldıktan sonra Angular Plugin MVP'ye geçilir.

### Future Vision

**2-3 Yıllık Vizyon: Developer Tools Ekosistemi**

har-mock-plugin, bir HAR replay aracından **kapsamlı bir frontend developer tools ekosistemine** evrilecek:

- **Storage Snapshot & State Replay:** HAR + localStorage/sessionStorage birlikte export ve replay — tam uygulama state'i taşıma
- **Multi-HAR Desteği:** Birden fazla HAR dosyası ile farklı senaryoları eş zamanlı yönetme
- **Angular DevTools Panel:** HAR Mock sekmesi ile Angular DevTools'a native entegrasyon
- **Framework-Agnostik Plugin'ler:** Angular sonrası React, Vue gibi framework'ler için native plugin'ler
- **Team Collaboration:** HAR dosyalarını ve rule setlerini takım içinde paylaşma, merkezi mock konfigürasyonu
- **CI/CD Entegrasyonu:** Otomatik test pipeline'larında HAR replay ile regression testing
- **API Monitoring & Diff:** Farklı HAR dosyalarını karşılaştırarak API response değişikliklerini tespit etme
