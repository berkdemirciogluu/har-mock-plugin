---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Chrome Extension + Angular Plugin - Prod API response larini HAR dosyasindan mock ederek frontend bug simulasyonu'
session_goals: 'Prod ortamindaki buglari local/test ortaminda kolayca yeniden uretmek; belirli API cagrilarini yakalayip HAR dosyasindan kayitli response dondurmek'
selected_approach: 'ai-recommended'
techniques_used: ['First Principles Thinking', 'SCAMPER Method', 'Cross-Pollination']
ideas_generated: 20
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Berk
**Date:** 2026-02-21

---

## Session Overview

**Konu:** Chrome Extension + Angular Plugin — Prod API response'larını HAR dosyasından mock ederek frontend bug simülasyonu

**Hedefler:** Prod ortamındaki bug'ları local/test ortamında kolayca yeniden üretmek. Belirli API çağrılarını yakalayıp HAR dosyasından kayıtlı response döndürmek — request içeriğinden bağımsız olarak. Prod data'ya direkt erişim yasak olduğundan HAR dosyası zorunlu girdi.

**Temel Kısıt:** Prod data'ya direkt erişim yasaktır. HAR dosyası, yetkili kişiler tarafından prod ortamında kaydedilip geliştiriciye iletilir.

---

## Technique Selection

**Yaklaşım:** AI Önerili Teknikler

**Seçilen Teknikler:**
- **First Principles Thinking:** Aracın gerçekte ne yapması gerektiğini sıfırdan sormak
- **SCAMPER Method:** 7 sistematik lens ile özellik setini genişletmek
- **Cross-Pollination:** Sektördeki benzer araçların başarılı pattern'larından ilham almak

---

## Technique Execution Results

### First Principles Thinking — Çekirdek Prensipler

**[Core #1]: HAR Snapshot Replay**
_Concept:_ Araç, test data'sı oluşturmak yerine prod'daki gerçek response'u taşır. HAR dosyası, belirli bir anın prod state'inin fotoğrafıdır. Test ortamında aynı data'yı yaratmak imkânsız veya çok maliyetlidir.
_Novelty:_ Bu bir "API mocker" değil, **prod-to-local data teleporter**.

**[Core #2]: Default-On Intercept with Selective Exclusion**
_Concept:_ HAR yüklendiğinde tüm endpoint'ler aktif, kullanıcı sadece gerçek API'den almasını istediği endpoint'leri exclude eder.
_Novelty:_ "Opt-out" modeli çok daha az friction — bug simülasyonu için doğru default.

**[Core #3]: Pattern-Based URL Matching**
_Concept:_ ID'ler, session token'lar, pagination değerleri değişeceği için URL eşleşmesi path template üzerinden yapılır. `/api/users/12345` ile `/api/users/99999` aynı endpoint sayılır.
_Novelty:_ "Tam URL eşleşmesi" çoğu mock aracının tuzağı — bu araç dinamik segmentleri otomatik soyutlar.

**[Core #4]: Auto-Parameterization**
_Concept:_ HAR yüklendiğinde UUID, numeric ID, token gibi dinamik segmentler otomatik tespit edilip `{id}`, `{token}` placeholder'larına çevrilir. Kullanıcı müdahalesi gerekmez.
_Novelty:_ Çoğu mock aracı bunu kullanıcıya bırakır — bu araç "zero config" deneyimi sunar.

**[Core #5]: Dual Replay Mode**
_Concept:_ **Sequential Mode** — kullanıcı bug'a giden adımları birebir tekrar eder, response'lar HAR'daki sırayla döner. **Last-Match Mode** — kullanıcı direkt URL'e gider, o endpoint'in HAR'daki en son response'u döner.
_Novelty:_ Tek bir mock stratejisi her senaryoya uymaz — araç kullanıcının niyetine göre moda göre davranır.

**[Core #6]: Dual Interface Architecture**
_Concept:_ Chrome Extension → görsel UI ile toggle. Angular Plugin → `provideHarMock({ mode: 'sequential' })` ile programatik config.
_Novelty:_ Aynı çekirdeğin iki tüketim biçimi — UI-first ve code-first.

**[Core #7]: Two Independent Tools, One Problem**
_Concept:_ Chrome Extension → browser-level interception, herhangi bir web app için evrensel. Angular Plugin → `HttpClient` interceptor, sadece Angular app'ler için native entegrasyon.
_Novelty:_ Aynı problemi farklı katmanlarda çözen iki bağımsız araç — biri evrensel, biri Angular-native.

**[Core #8]: Asset-Based HAR Loading**
_Concept:_ HAR dosyası `assets/` klasörüne koyulur, `provideHarMock({ harUrl: '/assets/mocks/prod-bug.har' })` ile HTTP fetch edilir.
_Novelty:_ Build-time bundle şişirmez, runtime'da lazy load edilir, farklı environment'lar için farklı HAR dosyaları kolayca swap edilebilir.

**[Core #9]: Double-Lock Production Safety**
_Concept:_ Plugin sadece `enabled: true` VE `isDevMode() === true` olduğunda aktif olur. İkisinden biri false ise tamamen devre dışı.
_Novelty:_ Çift kilit mekanizması production leak'ini strukturel olarak imkânsız kılar.

**[Core #10]: State Context Problem**
_Concept:_ Last-Match Mode'da sadece API response'larını replay etmek yetmez — localStorage/sessionStorage state'i eksik olabilir. Token/ID yoksa URL'ler farklı şekillenir (`/api/user/12312` yerine `/api/user/null`).
_Novelty:_ HAR sadece network katmanını yakalar, uygulama state'ini yakalamaz — bu gap kapatılmalı.

**[Core #11]: Two-Phase State Recovery**
_Concept:_ Kısa vade — null/undefined/boş URL segmentlerini dinamik parametre say, pattern matching'i esnet. Uzun vade — Chrome Extension HAR + localStorage/sessionStorage snapshot'ı birlikte export eder, replay'de state önce inject edilir.
_Novelty:_ Network katmanı + uygulama state katmanını birlikte ele alan, aşamalı genişleyen çözüm.

---

### SCAMPER Method — Özellik Keşfi

**[Combine #1]: Active Mock Overlay**
_Concept:_ Mock aktifken ekranda mini bir overlay — intercept edilen endpoint'ler, eşleşme durumu, gerçek API mi HAR mı döndü. "Acaba çalıştı mı?" sorusunu ortadan kaldırır.
_Novelty:_ Görünmez çalışan mock araçlarının aksine, her zaman ne olduğunu şeffaf gösterir.

**[Combine #2]: HAR Timing Replay**
_Concept:_ HAR'daki gerçek response time'ları okunur, aynı gecikme simulate edilir. Timing kaynaklı bug'ları da yakalar.
_Novelty:_ Çoğu mock aracı instant response döner — bu araç prod'un gerçek hızını taklit eder.

**[Adapt #1]: Optional Response Editor**
_Concept:_ Request intercept edildiğinde HAR response'u otomatik ilerler. Kullanıcı isterse overlay'den o response'u açıp düzenler, sonra "gönder" der. "Ya şu field null gelse?" anında test edilir.
_Novelty:_ Default zero-friction, isteğe bağlı surgical edit.

**[Modify #1]: Zero Config Convention**
_Concept:_ `assets/har-mock.har` convention path'ine koyulan dosya otomatik yüklenir. `provideHarMock()` — parametre yok. Dosya varsa aktif, yoksa passthrough.
_Novelty:_ "Convention over configuration" — en az dirençli yol en iyi UX'tir.

---

### Cross-Pollination — Sektörden İlham

**[CrossPoll #1]: Request Status Feed**
_Concept:_ Extension overlay'inde canlı request listesi — her satırda URL, method ve "Rule ✓" / "HAR ✓" / "Passthrough →" etiketi. Charles Proxy'nin session view'ından ilham alındı.
_Novelty:_ Browser'dan çıkmadan tam görünürlük.

**[CrossPoll #2]: Rule-Based Mock Mode**
_Concept:_ HAR dosyası olmadan da çalışır. URL pattern + HTTP status + body + delay tanımlanır. Özellikle 400/401/403/404/500/timeout senaryolarını test etmek için. Development sırasında backend hazır olmasa da kullanılabilir.
_Novelty:_ HAR replay + manuel rule — aynı araç hem prod bug simulation hem development-time error testing.

**[CrossPoll #3]: Rule-First Priority Chain**
_Concept:_ Bir request için önce rule'lara bakılır, eşleşme varsa döner. Yoksa HAR'da aranır. İkisinde de yoksa passthrough. Explicit tanım her zaman kazanır.
_Novelty:_ `Request → Rules → HAR → Passthrough` — öncelik sırası net ve öngörülebilir.

---

## Idea Organization and Prioritization

### Tema 1: Çekirdek Mekanizma
*Aracın kalbi — bunlar olmadan hiçbir şey çalışmaz*

- HAR Snapshot Replay — prod-to-local data teleporter
- Auto-Parameterization — UUID/ID/token segmentleri otomatik `{id}` pattern'ına çevrilir
- Pattern-Based URL Matching — dinamik URL'ler template üzerinden eşleşir
- Rule-First Priority Chain — Rules → HAR → Passthrough
- HAR Timing Replay — gerçek response gecikmesi simulate edilir

### Tema 2: Kullanıcı Deneyimi & Kontrol
*Geliştiricinin aracı nasıl yönettiği*

- Default-On + Selective Exclusion — tüm endpoint'ler mock, kullanıcı exclude eder
- Dual Replay Mode — Sequential / Last-Match toggle
- Zero Config Convention — `assets/har-mock.har` → config yok
- Active Mock Overlay + Request Status Feed — canlı intercept listesi
- Optional Response Editor — default geç, istersen düzenle

### Tema 3: Mimari & Güvenlik
*İki bağımsız araç, sağlam temeller*

- Two Independent Tools — Extension (evrensel) + Plugin (Angular-native), iki MVP
- Dual Interface — Extension UI toggle, Angular Plugin `provideHarMock()` config
- Double-Lock Production Safety — `enabled: true` AND `isDevMode()` çift kilit
- Asset-Based HAR Loading — `assets/` klasöründen HTTP fetch

### Tema 4: Gelişmiş Senaryolar
*Edge case'ler ve ek güç*

- Rule-Based Mock Mode — HAR olmadan error senaryoları (MVP)
- Two-Phase State Recovery Faz A — null URL segmentleri dinamik say (MVP)
- Two-Phase State Recovery Faz B — localStorage/sessionStorage snapshot (Post-MVP)

---

## Action Plan: Chrome Extension (MVP)

**Başlangıç noktası: Chrome Extension** — evrensel, bağımsız, herkese hitap eder.

### Öncelik Sırası

**1. Çekirdek Engine**
- HAR dosyası yükleme (file picker / drag & drop)
- URL pattern matching + auto-parameterization
- `chrome.webRequest` ile intercept
- Rule-First Priority Chain: Rules → HAR → Passthrough

**2. Replay Modu**
- Sequential / Last-Match toggle (popup UI)
- HAR Timing Replay

**3. Rule-Based Mock UI**
- URL pattern + method + status + body + delay tanımlama
- Rule listesi yönetimi (ekle / sil / düzenle)

**4. Overlay UI**
- Canlı request listesi — "Rule ✓" / "HAR ✓" / "Passthrough →"
- Exclude listesi yönetimi
- Optional Response Editor

**5. Güvenlik**
- Extension popup'ta açık/kapalı toggle

### Sonraki Adım: Angular Plugin (MVP)

- `provideHarMock({ harUrl, mode, enabled, rules })` API
- `HttpClient` interceptor
- Zero Config Convention (`assets/har-mock.har`)
- Double-Lock Safety (`enabled` + `isDevMode()`)
- Rule-First Priority Chain

---

## Post-MVP Backlog

- Angular DevTools Panel (HAR Mock sekmesi)
- Storage Snapshot — localStorage/sessionStorage export + replay (Chrome Extension)
- Multi-HAR desteği

---

## Session Summary and Insights

**Key Achievements:**
- Aracın temel problemi netleşti: "API mocker" değil, **prod-to-local data teleporter**
- İki bağımsız araç mimarisi kararlaştırıldı: Extension (evrensel) + Plugin (Angular-native)
- HAR'ın zorunlu olma sebebi anlaşıldı: prod data erişim kısıtı — bu kısıt aracın scope'unu netleştirdi
- Rule-First Priority Chain ile HAR + manuel rule'ların zarif birlikteliği tasarlandı
- State Context Problem (localStorage boşken URL değişimi) keşfedildi ve çözüm yolu belirlendi

**Breakthrough Moments:**
- "Bu bir API mocker değil, data teleporter" — aracın doğru mental modelini kurdu
- Dual Replay Mode (Sequential vs Last-Match) — tek stratejinin yetersiz olduğunun farkına varılması
- Rule-First Priority Chain — kullanıcı explicit tanım yaparsa sistem ona güvenir
- State Context Problem — HAR'ın tek başına yetersiz olduğu edge case'in keşfi

**Mimari Kararlar:**
- Angular Plugin: `HttpClient` interceptor, sıfır ek bağımlılık (MSW reddedildi)
- HAR loading: Asset-based, lazy load (direkt import reddedildi)
- Production safety: Çift kilit (`enabled` + `isDevMode()`)
- URL matching: Auto-parameterization, convention over configuration

