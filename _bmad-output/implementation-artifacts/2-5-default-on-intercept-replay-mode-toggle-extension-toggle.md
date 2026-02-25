# Story 2.5: Default-On Intercept, Replay Mode Toggle & Extension Toggle

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want HAR yüklendiğinde tüm endpoint'lerin otomatik aktif olmasını, Controls tab → HAR accordion'ında Sequential/Last-Match replay mode toggle'ını ve Settings accordion'ında global Extension on/off toggle'ını,
So that debug senaryoma göre replay stratejisini değiştirebileyim; HAR'daki tüm endpoint'ler ekstra aksiyon almadan intercept edilsin; Extension'ı geçici olarak tamamen devre dışı bırakabileyim.

## Acceptance Criteria

1. **Given** HAR başarıyla yüklendi **When** content script bir request intercept ettiğinde **Then** HAR'daki tüm eşleşen endpoint'ler için mock response dönülmeli; developer herhangi bir endpoint'i manuel olarak aktive etmek zorunda kalmamalı (FR23)

2. **Given** HAR yüklendi ve Controls tab → HAR accordion açık **When** replay mode toggle görüntülendiğinde **Then** "Sequential" ve "Last-Match" seçenekleri toggle olarak gösterilmeli; varsayılan "Last-Match" seçili olmalı (FR14, UX6)

3. **Given** developer "Sequential" mod seçtiğinde **When** aynı endpoint'e birden fazla request geldiğinde **Then** background SW HAR entry'leri sırayla dönmeli; her request bir sonraki HAR entry'yi kullanmalı (FR12)

4. **Given** developer "Last-Match" mod seçtiğinde **When** aynı endpoint'e birden fazla request geldiğinde **Then** background SW her seferinde HAR'daki son eşleşen entry'yi dönmeli (FR13)

5. **Given** Settings accordion içinde Extension toggle **When** developer toggle'ı kapalıya aldığında **Then** content script mock intercept'i devre dışı bırakmalı; tüm request'ler orijinal network'e geçmeli; toggle durumu `chrome.storage.local`'a persist olmalı (FR28, UX7)

6. **Given** Extension toggle kapalıyken popup yeniden açıldığında **When** popup STATE_SYNC alındığında **Then** toggle'ın kapalı durumu gösterilmeli; mock intercept aktif olmamalı

7. **Given** HAR yüklenmemişken popup açıldığında **When** HAR accordion içi görüntülendiğinde **Then** replay mode toggle görünmemeli (progressive disclosure — UX spec Journey 1)

## Tasks / Subtasks

- [x] Task 1: `hm-strategy-toggle` Component Oluştur (AC: #2, #3, #4)
  - [x] Subtask 1.1: `packages/extension/src/popup/components/strategy-toggle/hm-strategy-toggle.component.ts` oluştur
    - `replayMode` input signal (`'sequential' | 'last-match'`)
    - `modeChange` output (`EventEmitter<'sequential' | 'last-match'>`)
    - "Sequential" / "Last-Match" tab benzeri toggle UI (Tailwind)
    - Aktif seçenek `bg-indigo-600 text-white`, pasif `bg-slate-100 text-slate-600`
    - Keyboard accessible: `role="group"`, `aria-checked`
  - [x] Subtask 1.2: `hm-strategy-toggle.component.spec.ts` oluştur
    - Mode selection modeChange emit testi
    - Default Last-Match rendering testi
    - CSSclass active/inactive durumu testi

- [x] Task 2: `hm-settings-section` Component Oluştur (AC: #5, #6)
  - [x] Subtask 2.1: `packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts` oluştur
    - `extensionEnabled` input signal (`boolean`)
    - `enabledChange` output (`EventEmitter<boolean>`)
    - Toggle düğmesi UI — `enabled: true` → yeşil, `false` → gri
    - Label: "Extension Aktif" / "Extension Kapalı"
    - `role="switch"`, `aria-checked` accessibility
  - [x] Subtask 2.2: `hm-settings-section.component.spec.ts` oluştur
    - Toggle tıklamasında enabledChange emit testi
    - enabled=true / false görsel durumu testi

- [x] Task 3: `ControlsTabComponent` Güncelle (AC: #1, #2, #5, #6, #7)
  - [x] Subtask 3.1: `ExtensionMessagingService.state` sinyalinden settings okuma:
    - `computed(() => this.messaging.state()?.settings?.replayMode ?? 'last-match')`
    - `computed(() => this.messaging.state()?.settings?.enabled ?? true)`
    - `computed(() => this.messaging.state()?.harData !== null)`
  - [x] Subtask 3.2: `hm-strategy-toggle` — HAR accordion içine, `@if (hasHar())` koşuluyla ekle (progressive disclosure)
  - [x] Subtask 3.3: Settings accordion placeholder yerine `hm-settings-section` ekle
  - [x] Subtask 3.4: `onReplayModeChange(mode)` → `UPDATE_SETTINGS` mesajı gönder
  - [x] Subtask 3.5: `onEnabledChange(enabled)` → `UPDATE_SETTINGS` mesajı gönder
  - [x] Subtask 3.6: Hata durumunda `console.error` ile log (toast yok, minimal friction)

- [x] Task 4: Unit Test Güncelle (AC: #1)
  - [x] Subtask 4.1: `controls-tab.component.spec.ts` — strategy toggle ve settings section entegrasyon testi
  - [x] Subtask 4.2: Mock `ExtensionMessagingService` ile state değişimi testi

## Dev Notes

### Kritik: Backend Zaten Hazır — Sadece UI Gerekli

Story 2.5'in **tüm backend mantığı** önceki story'lerde implementasyon yapılmış durumda. Bu story yalnızca **Popup UI** katmanını tamamlar:

| Özellik | Durum | Konum |
|---------|-------|-------|
| Default-On Intercept | ✅ Hazır | `message-handler.ts` → MATCH_QUERY |
| Sequential counter | ✅ Hazır | `state-manager.ts` → `getSequentialIndex()`, `incrementSequentialIndex()` |
| Last-Match logic | ✅ Hazır | `message-handler.ts` → `matchingEntries[last]` |
| `enabled` flag kontrolü | ✅ Hazır | `message-handler.ts` → passthrough if `!settings.enabled` |
| Chrome storage persist | ✅ Hazır | `state-manager.ts` → `updateSettings()` → `chrome.storage.local` |
| `UPDATE_SETTINGS` handler | ✅ Hazır | `message-handler.ts` case |
| STATE_SYNC ile state okuma | ✅ Hazır | `extension-messaging.service.ts` → `state` signal |
| Sequential reset on LOAD_HAR | ✅ Hazır | `state-manager.resetSequentialCounters()` |

### Default-On Açıklaması (AC #1)

"Default-On" HAR'ın yüklenmesiyle otomatik intercept aktivasyonu demektir. Bu mimari olarak şöyle çalışır:
- `DEFAULT_SETTINGS.enabled = true` (constants.ts)
- HAR yüklendiğinde ayrı bir "aktifleştir" adımı yoktur
- `MATCH_QUERY` handler HAR entry'leri bulduğunda doğrudan mock response döner
- Developer hiçbir aksiyon almadan tüm eşleşen endpoint'ler intercept edilir

Bu davranış **zaten çalışıyor** (Story 2.4'te test edildi). Bu story'deki AC #1 bunu **doğrulayan** kabul kriteridir, yeni implementasyon değil.

### Replay Mode Toggle — UX Detayları

```
[Sequential]  [Last-Match ✓]    ← varsayılan Last-Match seçili
```

- HAR yüklenmeden toggle **gizli** olmalı (`@if (hasHar())`) — UX spec progressive disclosure
- Mode değiştiğinde anında `UPDATE_SETTINGS` gönderilmeli — debounce yok
- Sequential seçildiğinde sequential counter'lar sıfırlanmaz (mevcut HAR oturumunda count devam eder)
- Bu story'de HAR Timing Replay toggle **görünmemeli** — Story 2.6 kapsamı

### Extension Toggle — UX Detayları

- Settings accordion varsayılan **kapalı** başlar
- Toggle ON (yeşil) → Extension aktif, mock intercept çalışıyor
- Toggle OFF (gri) → Passthrough mode, tüm requestler gerçek network'e gider
- Etiket dinamik: "Extension Aktif" / "Extension Kapalı"
- Toggle state popup'u kapatıp açsanız bile korunur (chrome.storage.local via STATE_SYNC)

### Angular Bileşen Yapısı

```typescript
// controls-tab.component.ts içinde computed signals
readonly hasHar = computed(() => this.messaging.state()?.harData !== null);
readonly replayMode = computed(() => this.messaging.state()?.settings?.replayMode ?? 'last-match');
readonly extensionEnabled = computed(() => this.messaging.state()?.settings?.enabled ?? true);
```

```html
<!-- HAR accordion içinde, hm-har-upload'ın altına -->
@if (hasHar()) {
  <hm-strategy-toggle
    [replayMode]="replayMode()"
    (modeChange)="onReplayModeChange($event)"
  />
}

<!-- Settings accordion içine -->
<hm-settings-section
  [extensionEnabled]="extensionEnabled()"
  (enabledChange)="onEnabledChange($event)"
/>
```

```typescript
// controls-tab.component.ts handler metodları
onReplayModeChange(mode: 'sequential' | 'last-match'): void {
  void this.messaging
    .sendMessage(MessageType.UPDATE_SETTINGS, { settings: { replayMode: mode } }, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Replay mode güncellenemedi:', err);
    });
}

onEnabledChange(enabled: boolean): void {
  void this.messaging
    .sendMessage(MessageType.UPDATE_SETTINGS, { settings: { enabled } }, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Extension toggle güncellenemedi:', err);
    });
}
```

### Dosya Konumları

```
packages/extension/src/popup/
├── components/
│   ├── controls-tab/
│   │   ├── controls-tab.component.ts       ← GÜNCELLE
│   │   └── controls-tab.component.spec.ts  ← GÜNCELLE
│   ├── strategy-toggle/                    ← YENİ KLASÖR
│   │   ├── hm-strategy-toggle.component.ts
│   │   └── hm-strategy-toggle.component.spec.ts
│   └── settings-section/                   ← YENİ KLASÖR
│       ├── hm-settings-section.component.ts
│       └── hm-settings-section.component.spec.ts
```

### Testing Standards

- Coverage hedefi: %80+ branch
- Angular Testing Library veya `TestBed` + `ComponentFixture` kullan
- `ExtensionMessagingService` mock ile inject
- `signal()` değişikliklerini test etmek için `fixture.detectChanges()` çağır
- ESLint override: `*.spec.ts` için `unbound-method` kapalı (önceki storilerde kuruldu)

### TypeScript Strict Mode Kuralları

1. `any` YASAK — `unknown` + type guard kullan
2. `noUncheckedIndexedAccess: true` aktif — optional chaining zorunlu
3. `readonly` — tüm state objelerinde zorunlu
4. Service injection: `inject()` fonksiyonu (constructor injection değil)
5. `void` operator — floating promise'leri işaretle

### Barrel Export Kuralı

```typescript
// DOĞRU
import { MessageType, type Message } from '../../../shared';

// YANLIŞ
import { MessageType } from '../../../shared/messaging.types';
```

### Önceki Story'lerden Öğrenilenler

**Story 2.4 (Fetch/XHR Intercept):**
1. `transpileOnly: true` (swConfig) — type hataları build'de görünmez, `tsc --noEmit` ile kontrol et
2. ESLint override — `*.spec.ts` için `unbound-method`, `no-unsafe-assignment`, `no-unsafe-member-access` kapalı
3. Coverage hedefi %80+ branch korunmalı

**Story 2.3 (HAR Upload UI):**
1. Angular ChangeDetectionStrategy.OnPush zorunlu — signal-based reactive pattern
2. `inject()` ile service injection — constructor injection değil
3. `output()` API kullan (EventEmitter değil) — Angular 17+ standalone pattern
4. `input()` API kullan — `@Input()` decorator değil

**Story 2.2 (Background SW):**
1. `handleMessage` async — `void handleMessageAsync()` pattern
2. `satisfies` operatörü — payload type safety
3. Lazy initialization — `stateManager.isInitialized()` zaten background'da mevcut

### Replay Mode State Akışı (Tam Resim)

```
[Popup] Kullanıcı "Sequential" seç
    → ControlsTabComponent.onReplayModeChange('sequential')
    → ExtensionMessagingService.sendMessage(UPDATE_SETTINGS, { settings: { replayMode: 'sequential' } })
    → [Port] background SW'ye mesaj
    → [Background] message-handler.ts UPDATE_SETTINGS case
    → StateManager.updateSettings({ replayMode: 'sequential' })
    → chrome.storage.local persist
    → port.postMessage({ success: true })
    → [Popup] Promise resolve (ack)

[Sonraki MATCH_QUERY]
    → message-handler.ts MATCH_QUERY case
    → settings.replayMode === 'sequential'
    → stateManager.getSequentialIndex(template) → 0
    → matchingEntries[0] seçilir
    → stateManager.incrementSequentialIndex(template) → counter = 1
    → Mock response döner
```

### Project Structure Notes

- HAR accordion'da replay toggle: UX spec'e göre HAR yüklendikten sonra `StrategyToggleComponent` görünür hale gelir (progressive disclosure)
- Settings accordion: `SettingsSectionComponent` → `ExtensionToggleComponent` + (Story 3.5'te) `ExcludeListComponent`
- `hm-` prefix convention tüm custom componentlerde zorunlu (ARCH naming)
- Story 2.6 (HAR Timing Replay) bu story'deki Settings bölümüne ek toggle ekleyecek — bileşen yapısı extensible tutulmalı

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5] — AC, user story, FR23, FR14, FR12, FR13, FR28
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Hierarchy] — StrategyToggleComponent, ExtensionToggleComponent hiyerarşisi
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1] — Progressive disclosure kuralı
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Rationale] — Multi-accordion, Direction 6 seçimi
- [Source: packages/extension/src/shared/state.types.ts] — ExtensionSettings, replayMode, enabled
- [Source: packages/extension/src/shared/constants.ts] — DEFAULT_SETTINGS (enabled: true, replayMode: 'last-match')
- [Source: packages/extension/src/shared/messaging.types.ts] — MessageType.UPDATE_SETTINGS
- [Source: packages/extension/src/shared/payload.types.ts] — UpdateSettingsPayload, StateSyncPayload
- [Source: packages/extension/src/background/message-handler.ts] — UPDATE_SETTINGS handler, MATCH_QUERY sequential/last-match logic
- [Source: packages/extension/src/background/state-manager.ts] — updateSettings(), getSequentialIndex(), incrementSequentialIndex(), resetSequentialCounters()
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts] — sendMessage(), state signal (StateSyncPayload)
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts] — Mevcut HAR accordion yapısı
- [Source: packages/extension/src/popup/components/har-upload/hm-har-upload.component.ts] — Angular component pattern (inject, signal, input, output)
- [Source: packages/extension/src/popup/components/accordion/accordion.component.ts] — AccordionComponent API
- [Source: _bmad-output/implementation-artifacts/2-4-fetch-xhr-intercept-har-response-replay.md] — Önceki story öğrenmeleri

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `crypto.randomUUID` JSDOM'da mevcut değil — `test-setup.ts`'e Node.js `crypto` modülü ile polyfill eklendi
- Root level `npx jest` komutu `jest-preset-angular` yerine root Babel konfigürasyonunu kullanıyor; testler `--config packages/extension/jest.config.js` ile çalıştırılmalı
- Monorepo `rootDir` TS hataları önceki storylerden gelen bilinen sorun — `transpileOnly: true` build'de gizler, testler geçiyor

### Completion Notes List

- `hm-strategy-toggle` ve `hm-settings-section` bileşenleri Angular 17+ `input()` / `output()` API ile oluşturuldu (EventEmitter değil)
- `ControlsTabComponent` `ExtensionMessagingService.state` signal'inden computed değerler üretiyor
- Progressive disclosure: `@if (hasHar())` ile strategy toggle yalnızca HAR yüklüyken görünür
- `test-setup.ts`'e `crypto.randomUUID` polyfill eklendi — gelecek storyler de yararlanacak
- Tüm 255 extension testi başarıyla geçti; coverage %89.65 branch ile eşiği aşıyor

### File List

- `packages/extension/src/popup/components/strategy-toggle/hm-strategy-toggle.component.ts` (YENİ)
- `packages/extension/src/popup/components/strategy-toggle/hm-strategy-toggle.component.spec.ts` (YENİ)
- `packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts` (YENİ)
- `packages/extension/src/popup/components/settings-section/hm-settings-section.component.spec.ts` (YENİ)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` (GÜNCELLENDİ)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` (GÜNCELLENDİ)
- `packages/extension/src/test-setup.ts` (GÜNCELLENDİ — crypto.randomUUID polyfill)

### Change Log

| Date | Changed By | Summary |
|------|------------|---------|
| 2026-02-25 | Claude Sonnet 4.6 (GitHub Copilot) | Story 2.5 oluşturuldu — ready-for-dev |
| 2026-02-25 | Claude Sonnet 4.6 (GitHub Copilot) | Story 2.5 implementasyonu tamamlandı — review |
