---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-har-mock-plugin-2026-02-21.md
  - _bmad-output/brainstorming/brainstorming-session-2026-02-21.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: developer_tool
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - har-mock-plugin

**Author:** Berk
**Date:** 2026-02-21

## Executive Summary

**har-mock-plugin**, frontend developer'ların production ortamında raporlanan bug'ları local ortamda birebir reproduce etmesini sağlayan bir developer aracıdır. Geleneksel mock araçları (MSW, Postman Mock, Charles Proxy) manuel handler yazımı, endpoint tanımı veya proxy kurulumu gerektirirken, har-mock-plugin "HAR dosyasını at, gerisini araç halleder" yaklaşımıyla zero-config deneyim sunar.

Araç, HAR dosyasındaki API response'larını otomatik URL pattern matching ile yakalayıp local ortamda replay eder. Developer HAR'ı yükler, replay mode seçer, uygulamayı açar — ve prod'daki ekranı birebir local'de görür. Böylece bug'ı gerçek prod datası üzerinde breakpoint koyarak debug edebilir.

İki bağımsız bileşenden oluşur: tüm web uygulamalarında çalışan bir **Chrome Extension** (content script MAIN world'de `fetch`/`XHR` monkey-patching ile intercept) ve Angular uygulamalarına native entegrasyon sağlayan bir **Angular Plugin** (`HttpClient` interceptor, `provideHarMock()` API). Uzun vadede kapsamlı bir frontend developer tools ekosistemine evrilmesi hedeflenmektedir.

Birincil hedef kitle: Production ortamına doğrudan erişimi olmayan, HAR dosyası üzerinden bug tespiti yapmaya çalışan mid-senior frontend developer'lar.

### What Makes This Special

- **Zero-Config Deneyim:** HAR dosyasını sürükle-bırak ile yükle, gerisini araç halleder. Manuel handler yazımı, endpoint tanımı, proxy konfigürasyonu yok.
- **Auto-Parameterization:** UUID, numeric ID, token gibi dinamik URL segmentleri otomatik tespit edilip pattern'lara çevrilir — developer müdahalesi gerekmez.
- **Prod-to-Local Data Teleporter:** API mocker değil, prod state'inin ağ katmanı fotoğrafını local'e taşıyan araç. Gerçek datayı gerçek haliyle debug etme imkânı.
- **Rule-First Priority Chain:** Rules → HAR → Passthrough — explicit tanım her zaman kazanır, öngörülebilir davranış.
- **Çekirdek Insight:** HAR dosyası zaten prod state'inin hazır fotoğrafı — ama hiçbir mevcut araç bunu otomatik URL matching ve instant replay ile değerlendirmiyor. har-mock-plugin bu boşluğu dolduruyor.

## Project Classification

| Alan | Değer |
|---|---|
| **Proje Tipi** | Developer Tool (Chrome Extension + npm paketi) |
| **Domain** | General — sektör bağımsız, tüm frontend projelerinde kullanılabilir |
| **Karmaşıklık** | Düşük — regüle alan yok, olgun teknolojiler (Chrome Extension API, Angular interceptor) |
| **Proje Bağlamı** | Greenfield — sıfırdan oluşturuluyor |

## Success Criteria

### User Success

- **Bug reproduction:** Developer HAR dosyasını yükleyip uygulamayı açtığında, prod'daki ekranı local'de birebir görebilmeli. "Bu bug'ı reproduce edemiyorum" vakalarının minimize olması.
- **Debug süresi kısalma:** HAR'ı göz ile inceleme yöntemine kıyasla bug'ın root cause tespitinde anlamlı süre kısalması.
- **Tekrarlayan kullanım:** Developer'ın karmaşık bug'larda aracı varsayılan debug yöntemi olarak tercih etmesi — araç debug toolkit'inin kalıcı parçası haline gelmesi.
- **Last-Match senaryosu:** Developer direkt URL'e gidip guard'lara takılmadan prod ekranını görebilmeli.

### Business Success

- **Kısa vade (0-3 ay):** Şirket içi benimseme — takımdaki tüm frontend developer'lar en az bir kez kullanmış olsun. Karmaşık bug case'lerinde aracın akla ilk gelen çözüm olması.
- **Uzun vade (6-12 ay):** Açık kaynak yayılım — Chrome Web Store ve npm üzerinden organik büyüme. GitHub stars, npm haftalık indirme, Chrome Web Store aktif kullanıcı sayısında artış.

### Technical Success

- **URL matching doğruluğu: %100.** Auto-parameterization HAR'daki URL'leri kesinlikle doğru eşleştirmeli — yanlış eşleşme veya kaçırma kabul edilemez.
- **HAR response doğruluğu:** HAR dosyasından okunan response'lar eksiksiz ve doğru şekilde uygulamaya iletilmeli.
- **Production safety:** Double-lock mekanizması (`enabled: true` + `isDevMode() === true`) prod'a sızma ihtimalini yapısal olarak imkânsız kılmalı.

### Measurable Outcomes

| Metrik | Hedef | Zaman |
|---|---|---|
| URL matching doğruluğu | %100 | MVP |
| Şirket içi benimseme | Tüm FE developer'lar kullanıyor | 3 ay |
| Bug debug süresi | Ölçülebilir kısalma | 3 ay |
| GitHub Stars | Organik büyüme | 6-12 ay |
| npm Downloads | Haftalık artış | 6-12 ay |
| Chrome Web Store kullanıcıları | Aktif kullanıcı artışı | 6-12 ay |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — "HAR'ı yükle, bug'ı local'de gör" sorusuna kesin evet cevabı.

**Resource:** Solo developer (Berk). Tüm tasarım, geliştirme ve test tek kişi tarafından yürütülecek.

**Timeline:** Kesin deadline yok. Her blok düzgün çalışır hale geldiğinde bir sonraki bloğa geçilir. Kalite > hız.

**Scope Kararı:** 15 özelliğin tamamı MVP'de kalacak. Hiçbir özellik Phase 2'ye ertelenmeyecek — tüm özellikler birbirine bağlı bir bütünlük oluşturuyor ve bir debugging aracının "yarım" çalışması kabul edilemez.

### MVP Feature Set (Phase 1)

**MVP 1: Chrome Extension**

Sıralı geliştirme — her blok bir öncekinin üzerine inşa eder:

**Blok A — Çekirdek Engine:**
1. HAR Dosyası Yükleme (file picker + drag & drop)
2. Auto-Parameterization (UUID, numeric ID, token → `{id}`, `{token}`)
3. Pattern-Based URL Matching
4. Content Script Fetch/XHR Intercept
5. Rule-First Priority Chain (Rules → HAR → Passthrough)

**Blok B — Replay & Timing:**
6. Dual Replay Mode (Sequential + Last-Match toggle)
7. HAR Timing Replay

**Blok C — Rule-Based Mock:**
8. Rule-Based Mock UI (URL pattern + method + status + body + delay)

**Blok D — Overlay & Görünürlük:**
9. Active Mock Overlay (canlı request listesi)
10. Request Status Feed ("Rule ✓" / "HAR ✓" / "Passthrough →")

**Blok E — Kullanıcı Kontrolü:**
11. Default-On + Selective Exclusion
12. Optional Response Editor
13. HAR Response Inline Edit & Persist
14. Extension Toggle (popup açık/kapalı)

**Blok F — Edge Case:**
15. Two-Phase State Recovery Faz A (null/undefined URL segmentleri)

**Core User Journeys Supported:** Journey 1 (Happy Path), Journey 2 (Guard Edge Case), Journey 3 (Rule-Based Mock)

---

**MVP 2: Angular Plugin (Extension sonrası)**

1. `provideHarMock()` API
2. HttpClient Interceptor
3. Zero Config Convention (`assets/har-mock.har`)
4. Double-Lock Production Safety
5. Rule-First Priority Chain
6. Asset-Based HAR Loading
7. Auto-Parameterization
8. Dual Replay Mode
9. `bypassGuards: true`

**Core User Journey Supported:** Journey 4 (Angular Plugin Entegrasyonu)

### Post-MVP Features

**Phase 2 (Growth):**
- Angular DevTools Panel (HAR Mock sekmesi)
- Multi-HAR Desteği (birden fazla HAR dosyası)
- Two-Phase State Recovery Faz B (localStorage/sessionStorage snapshot)
- Example Angular App (demo repo)

**Phase 3 (Expansion):**
- Framework-agnostik plugin'ler (React, Vue)
- Team collaboration (HAR + rule set paylaşımı)
- CI/CD entegrasyonu (regression testing)
- API monitoring & diff (HAR dosyaları arası karşılaştırma)

### Risk Mitigation Strategy

**Teknik Riskler:**
- Auto-parameterization regex algoritması yanlış eşleşme yapabilir → Gerçek prod HAR dosyalarıyla kapsamlı test. %100 doğruluk hedefi.
- Chrome MV3 API kısıtlamaları → `chrome.webRequest` blocking mode MV3'te Chrome Web Store dağıtımında kullanılamaz. **Karar verildi:** Content script `"world": "MAIN"` ile `window.fetch` ve `XMLHttpRequest` monkey-patching kullanılacak — MV3 ve Chrome Web Store uyumlu.
- HAR format değişiklikleri → HAR 1.2 standardına bağlı kal; Chrome DevTools uyumluluğunu sürekli test et.

**Kaynak Riskleri:**
- Solo developer → her özelliğin kalitesi tek kişinin kapasitesine bağlı. Hafifletme: Blok bazlı sıralı geliştirme, her blok bitmeden sonrakine geçilmez.
- Süre baskısı yok → scope cut riski düşük. Tüm 15 özellik planlandığı gibi tamamlanacak.

**Market Riskleri:**
- Rakip araştırması yapılmamış → MVP'den önce hızlı bir tarama yapılmalı (Chrome Web Store, npm, GitHub'da "HAR replay", "HAR mock", "HAR player" aramaları).
- Hafifletme: Araç zaten şirket içi acıdan doğdu — kullanıcı validasyonu doğal olarak mevcut.

## User Journeys

### Journey 1: Debug Emre — Happy Path (Chrome Extension)

**Karakter:** Emre, mid-senior frontend developer. Sabah işe geldiğinde QA'den bir mesaj var: karmaşık bir dashboard ekranında prod'da veri yanlış görünüyor. HAR dosyası mesajın ekinde.

**Sorun:** Emre kodu inceliyor ama data olmadan nerede patladığını göremez. Prod'a erişimi yok. Eski yöntemle HAR'ı göz ile incelemeye başlıyor — onlarca request, hangisi suçlu?

**Araçla Tanışma:** Emre Extension'ı açıyor. HAR dosyasını popup'a sürükle-bırak yapıyor. Last-Match Mode seçiyor. Dashboard URL'ini açıyor.

**"Aha!" Anı:** Ekran açılıyor — prod'daki hatalı görünüm birebir local'de karşısında. Auto-parameterization devreye girmiş, tüm dinamik ID'ler otomatik eşleşmiş. Active Mock Overlay'de "HAR ✓" etiketleri canlı akıyor.

**Çözüm:** Emre breakpoint koyuyor, gerçek prod datası üzerinde debug ediyor. 10 dakikada root cause tespiti. "Bu kadar kolay mı ya" diyor ve Slack'te takım arkadaşına gönderiyor.

---

### Journey 2: Debug Emre — Guard Engeli (Edge Case)

**Karakter:** Aynı Emre. Bu sefer bug yetkili bir sayfada — Angular route guard'la korunan bir admin paneli.

**Sorun:** Last-Match Mode ile direkt URL'e gidiyor ama guard aktif. Guard bir `/api/auth/check` çağrısı yapıyor. HAR'da bu endpoint var, response dönüyor — ama response içeriği `"isAdmin": false` diyor. Guard engelliyor.

**Keşif:** Overlay'de isteği görüyor: "HAR ✓" etiketli ama sayfa açılmıyor. Response Editor'ü açıyor, `isAdmin: false` → `isAdmin: true` yapıyor. HAR session'ına persist ediyor.

**Çözüm:** Sayfayı yenileyen Emre, guard geçiyor ve ekran açılıyor. Bug'ı görüyor, debug ediyor. Angular Plugin'deki `bypassGuards` özelliğini aklına not ediyor — bir sonraki Angular projesinde bunu kullanacak.

---

### Journey 3: Debug Emre — Error Senaryosu (Rule-Based Mock)

**Karakter:** Emre bu sefer bug değil, defensive coding yapıyor. Backend ekip 429 Too Many Requests durumunu hiç test etmemiş.

**Sorun:** HAR'da bu senaryo yok — prod'da 429 olmadı. Ama kodun bunu doğru handle ettiğini test etmek istiyor.

**Araçla Kullanım:** Extension'ı açıyor. HAR yüklemek yerine Rule-Based Mock UI'a giriyor. `/api/data/*` pattern'ına 429 + `{"error": "rate_limited"}` body + 500ms delay tanımlıyor. Rule'u kaydediyor.

**Değer:** Uygulama 429 aldığında ne yapıyor — error message gösteriyor mu, retry yapıyor mu, crash mı oluyor? Emre bunu HAR olmadan, prod senaryosu olmadan test edebiliyor.

---

### Journey 4: Debug Emre — Angular Plugin Entegrasyonu

**Karakter:** Emre artık aracı benimsedi. Şirketin Angular projesine Extension yerine native entegrasyon istiyor — build pipeline'a dahil etmek, convention-based HAR yüklemek.

**Süreç:** npm'den Angular Plugin'i kuruyor. `app.config.ts`'e `provideHarMock()` ekliyor — tek satır. `assets/har-mock.har` dosyasını prod HAR'ı ile değiştiriyor.

**Double-Lock Güvencesi:** Prod build'de `isDevMode()` false döneceği için plugin otomatik devre dışı. Emre prod'a sızmadan korkmuyor. `bypassGuards: true` ekliyor — artık guard'lı sayfalara da direkt gidebiliyor.

**Değer:** Extension gibi popup açmadan, sadece dosyayı değiştirip uygulamayı başlatıyor. CI ortamında farklı HAR dosyaları ile farklı senaryolar test edilebilir hale geliyor.

---

### Journey Requirements Summary

| Yetenek | Journey |
|---|---|
| HAR yükleme (file picker + drag & drop) | 1, 4 |
| Auto-parameterization | 1, 2, 4 |
| Last-Match / Sequential Mode | 1, 2 |
| Active Mock Overlay + Request Status Feed | 1, 2 |
| HAR Response Inline Edit & Persist | 2 |
| Two-Phase State Recovery Faz A | 2 |
| Rule-Based Mock UI | 3 |
| Rule-First Priority Chain | 3 |
| `provideHarMock()` + Zero Config | 4 |
| Double-Lock Production Safety | 4 |
| `bypassGuards: true` | 4 |
| HAR Timing Replay | 1 |
| Default-On + Selective Exclusion | 1, 2, 3 |
| Extension Toggle | 1, 2, 3 |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Auto-Parameterization (Çekirdek İnovasyon)**
HAR dosyası yüklendiğinde, regex tabanlı bir algoritma UUID, numeric ID ve token gibi dinamik URL segmentlerini otomatik tespit edip `{id}`, `{token}` placeholder'larına çevirir. Developer müdahalesi gerektirmez. Mevcut mock araçlarında bu eşleştirme ya manuel tanımlanır ya da hiç yapılmaz.

**2. HAR as Source of Truth Paradigması**
Browser'ın zaten ürettiği bir artifact olan HAR dosyasını, zero-config debug oturumunun tek ve yeterli girdisi olarak konumlandırmak. "API mocker" değil, "prod-to-local data teleporter" mental modeli.

**3. Two-Phase State Recovery**
URL segmentlerinde `null`/`undefined`/boş değer geldiğinde (eksik localStorage state nedeniyle) URL yapısının değişmesi sorununu formüle eden ve Faz A'da regex pattern matching'i genişleterek çözen yaklaşım.

### Market Context & Competitive Landscape

> ⚠️ **Doğrulanmamış Varsayım:** Rakip araştırması henüz yapılmadı. Bilinen rakipler auto-parameterization sunmuyor — ancak kesin olarak doğrulanmalı.

**Bilinen rakip boşlukları:**
- **MSW:** Manuel handler yazımı gerektirir. HAR'dan okuma yok.
- **Postman Mock:** Manuel endpoint tanımı. HAR import sınırlı.
- **Charles Proxy:** HAR replay yapabiliyor ama auto-parameterization yok, masaüstü kurulum gerektirir, Angular interceptor seviyesinde çalışmaz.

### Validation Approach

- **Auto-parameterization doğruluğu:** Gerçek prod HAR dosyaları ile regex algoritmasını test et. Hedef: %100 URL eşleşme doğruluğu.
- **Rekabet doğrulaması:** Chrome Web Store, npm ve GitHub'da "HAR replay", "HAR mock", "HAR player" aramaları yapılarak mevcut çözümler incelenmeli.
- **Two-Phase State Recovery:** `null` URL segmentli edge case'leri içeren HAR dosyaları ile test senaryoları oluşturulmalı.

## Developer Tool Specific Requirements

### Project-Type Overview

har-mock-plugin iki bağımsız developer tool'dan oluşan bir ekosistemdir: browser-native bir Chrome Extension ve Angular-native bir npm paketi. Her ikisi de developer toolchain'e minimum friction ile entegre olacak şekilde tasarlanmıştır. Tüm dokümantasyon, API yüzeyi, hata mesajları ve kullanıcıya dönük metin **İngilizce** olacaktır — global benimseme hedefiyle.

### Language & Platform Matrix

| Bileşen | Platform | Dil | Min. Versiyon |
|---|---|---|---|
| Chrome Extension | Chromium-based browsers | TypeScript | Chrome MV3 |
| Angular Plugin | Angular uygulamaları | TypeScript | Angular 15+ |

**Angular versiyonu:** 15 ve üzeri desteklenecek. Angular 15, functional interceptor (`HttpInterceptorFn`) ve standalone component API'sinin olgunlaştığı versiyon — `provideHarMock()` API'si functional interceptor pattern ile uyumlu. Angular 14 Kasım 2023'te EOL olduğundan kapsam dışı bırakıldı.

### Installation Methods

**Chrome Extension:**
- Chrome Web Store üzerinden tek tıkla kurulum (birincil)
- `.crx` dosyası ile manual kurulum (development/enterprise)

**Angular Plugin:**
```bash
npm install har-mock-plugin
yarn add har-mock-plugin
pnpm add har-mock-plugin
```

npm, yarn ve pnpm desteklenir. `package.json` `exports` field'ı ile ESM ve CJS çıktısı sağlanır.

### API Surface

**Angular Plugin — Public API:**
```typescript
// Zero-config
provideHarMock()

// Full config
provideHarMock({
  harUrl: '/assets/har-mock.har',
  mode: 'last-match' | 'sequential',
  enabled: true,
  bypassGuards: true,
  rules: [...]
})
```

API yüzeyi minimal ve kasıtlı olarak kısıtlı tutulacak. Breaking change'ler semantic versioning ile yönetilir.

### Code Examples & Demo

- **Example Angular App:** Angular Plugin'in kullanımını gösteren standalone bir demo repo sağlanacak.
- **README:** Her iki bileşen için quick-start örnekleri ile birlikte.
- **JSDoc:** Public API'nin tüm parametreleri dokümante edilecek.

### Documentation Strategy

- **README-first:** Her bileşen kendi README'sine sahip. Hızlı kurulum + temel kullanım.
- **JSDoc:** Public API parametreleri için inline dokümantasyon.
- **Demo Repo:** Angular Plugin için çalışan örnek uygulama.
- Ayrı dokümantasyon sitesi planlanmıyor (MVP scope dışı).

### Implementation Considerations

- **Monorepo yapısı:** Extension ve Plugin tek repo'da, ayrı `packages/` olarak yönetilmeli.
- **Shared core:** Auto-parameterization ve URL matching algoritması her iki bileşen tarafından da kullanılan ortak bir `core` paketi olarak ayrılabilir.
- **Semantic versioning:** Her bileşen bağımsız versiyonlanabilir veya birlikte versiyonlanabilir — kararlaştırılmalı.
- **Bundle optimizasyonu:** Angular Plugin tree-shakeable olmalı, kullanılmayan kod bundle'a girmemeli.

## Functional Requirements

### HAR Dosyası Yönetimi

- **FR1:** Developer, file picker aracılığıyla HAR dosyası yükleyebilir.
- **FR2:** Developer, drag & drop ile HAR dosyası yükleyebilir.
- **FR3:** Sistem, yüklenen HAR dosyasını parse edip tüm HTTP entry'lerini çıkarabilir.
- **FR4:** Sistem, HAR dosyasındaki response body, status code, header ve timing bilgilerini okuyabilir.

### Auto-Parameterization & URL Matching

- **FR5:** Sistem, HAR'daki URL'lerde UUID segmentlerini otomatik tespit edip `{id}` pattern'ına çevirebilir.
- **FR6:** Sistem, HAR'daki URL'lerde numeric ID segmentlerini otomatik tespit edip `{id}` pattern'ına çevirebilir.
- **FR7:** Sistem, HAR'daki URL'lerde token/hash segmentlerini otomatik tespit edip `{token}` pattern'ına çevirebilir.
- **FR8:** Sistem, parameterize edilmiş URL pattern'ları ile gelen request URL'lerini eşleştirebilir.
- **FR9:** Sistem, `null`/`undefined`/boş URL segmentlerini dinamik parametre olarak kabul edip pattern matching'i genişletebilir (Two-Phase State Recovery Faz A).

### Request Intercept & Replay

- **FR10:** Sistem, browser'daki HTTP request'leri content script (`"world": "MAIN"`) üzerinden `window.fetch` ve `XMLHttpRequest` monkey-patching ile yakalayabilir.
- **FR11:** Sistem, yakalanan request'e karşılık gelen HAR response'unu döndürebilir.
- **FR12:** Sistem, Sequential Mode'da aynı endpoint'e yapılan ardışık isteklerde HAR'daki sırayla response döndürebilir.
- **FR13:** Sistem, Last-Match Mode'da aynı endpoint için HAR'daki en son response'u döndürebilir.
- **FR14:** Developer, Sequential ve Last-Match modları arasında geçiş yapabilir.
- **FR15:** Sistem, HAR'daki gerçek response time'larını kullanarak gecikme simülasyonu yapabilir (HAR Timing Replay).

### Rule-Based Mock

- **FR16:** Developer, URL pattern + HTTP method + status code + response body + delay ile mock rule tanımlayabilir.
- **FR17:** Developer, tanımlı rule'ları listeleyebilir, düzenleyebilir ve silebilir.
- **FR18:** Sistem, Rule-First Priority Chain'i uygulayabilir: Request → Rules → HAR → Passthrough.
- **FR19:** Sistem, HAR dosyası yüklenmeden sadece rule'larla çalışabilir.

### Active Mock Overlay & Görünürlük

- **FR20:** Developer, aktif mock durumunu gösteren bir overlay görebilir.
- **FR21:** Overlay, yakalanan her request için URL, HTTP method ve eşleşme durumunu ("Rule ✓" / "HAR ✓" / "Passthrough →") gösterebilir.
- **FR22:** Overlay, canlı request akışını gerçek zamanlı listeleyebilir (Request Status Feed).

### Kullanıcı Kontrolü & Exclusion

- **FR23:** Sistem, HAR yüklendiğinde tüm eşleşen endpoint'leri varsayılan olarak aktif yapabilir (Default-On).
- **FR24:** Developer, belirli endpoint'leri exclude listesine ekleyerek gerçek API'ye yönlendirebilir.
- **FR25:** Developer, exclude listesini yönetebilir (ekle/çıkar).

### Response Editing

- **FR26:** Developer, intercept edilen bir response'u overlay üzerinden görüntüleyip düzenleyebilir (Optional Response Editor).
- **FR27:** Developer, overlay'deki canlı request listesinde herhangi bir HAR response'unu düzenleyebilir ve düzenleme HAR session'ına persist olabilir (HAR Response Inline Edit & Persist).

### Extension Yönetimi

- **FR28:** Developer, Extension'ı popup üzerinden açıp kapatabilir (Extension Toggle).

### Angular Plugin — Konfigürasyon

- **FR29:** Developer, `provideHarMock()` ile Angular uygulamasına zero-config HAR mock entegrasyonu sağlayabilir.
- **FR30:** Developer, `provideHarMock()` parametreleriyle `harUrl`, `mode`, `enabled`, `rules` ve `bypassGuards` konfigüre edebilir.
- **FR31:** Sistem, `assets/har-mock.har` convention path'inden HAR dosyasını otomatik yükleyebilir (Zero Config Convention).

### Angular Plugin — Intercept & Güvenlik

- **FR32:** Sistem, Angular `HttpClient` seviyesinde request yakalayıp HAR response'u döndürebilir.
- **FR33:** Sistem, `enabled: true` VE `isDevMode() === true` çift kilit mekanizmasıyla prod'da otomatik devre dışı kalabilir (Double-Lock Production Safety).
- **FR34:** Developer, `bypassGuards: true` ile dev mode'da tüm route guard'ları (`CanActivate`, `CanDeactivate`, `CanMatch`) otomatik geçebilir.

### Angular Plugin — HAR Loading

- **FR35:** Sistem, `assets/` klasöründen HAR dosyasını HTTP fetch ile lazy load edebilir.
- **FR36:** Sistem, farklı environment konfigürasyonlarına göre farklı HAR dosyalarını yükleyebilir.

## Non-Functional Requirements

### Security & Production Safety

- **NFR1:** Angular Plugin, `isDevMode() === false` olduğunda hiçbir mock işlevi çalıştırmamalı — tüm interceptor ve guard bypass mantığı tamamen devre dışı kalmalı.
- **NFR2:** Double-lock mekanizması (`enabled: true` + `isDevMode() === true`) her ikisi de sağlanmadan plugin aktif olmamalı.
- **NFR3:** Extension, yalnızca developer'ın aktif olarak yüklediği HAR dosyasındaki response'ları kullanmalı — dış kaynaktan veri çekmemeli.
- **NFR4:** HAR dosyasındaki hassas veriler (token, cookie, auth header) sadece local'de işlenmeli, hiçbir dış servise gönderilmemeli.

### Reliability & Doğruluk

- **NFR5:** Auto-parameterization, HAR'daki tüm URL'leri %100 doğrulukla eşleştirmeli — yanlış eşleşme (false positive) veya kaçırma (false negative) kabul edilemez.
- **NFR6:** HAR response'ları byte-level doğrulukla uygulamaya iletilmeli — response body, status code ve header'larda veri kaybı veya bozulma olmamalı.
- **NFR7:** Rule-First Priority Chain (Rules → HAR → Passthrough) deterministik çalışmalı — aynı request, aynı rule seti ve aynı HAR dosyası ile her çalıştırmada aynı sonucu üretmeli. Öncelik sırası ihlali (ör. rule varken HAR'dan dönme) kabul edilemez.

### Integration & Uyumluluk

- **NFR8:** Chrome Extension, Manifest V3 (MV3) standardına uygun olmalı.
- **NFR9:** Angular Plugin, Angular 15 ve üzeri tüm major sürümlerle uyumlu olmalı.
- **NFR10:** Angular Plugin, ESM ve CJS module formatlarını desteklemeli.
- **NFR11:** HAR parser, HAR 1.2 spesifikasyonuna uyumlu olmalı (Chrome DevTools tarafından üretilen standart format).

### Developer Experience

- **NFR12:** Public API (`provideHarMock()`) TypeScript ile tam tip desteği sağlamalı — tüm parametreler ve return tipleri açıkça tanımlı olmalı.
- **NFR13:** Hata durumlarında (geçersiz HAR, parse hatası, eşleşme bulunamadı) her hata mesajı şu üç bileşeni içermeli: hata türü (error type), nedeni (root cause) ve önerilen çözüm adımı (suggested action). Örnek: `[HAR_PARSE_ERROR] HAR dosyası geçersiz JSON içeriyor. Dosyayı Chrome DevTools'tan yeniden export edin.`
