# Story 2.6: HAR Timing Replay

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Controls tab → HAR accordion'ında HAR Timing Replay toggle'ını görmek ve kontrol etmek istiyorum,
so that network gecikmeli senaryoları (yavaş API, timeout edge case) local'de gerçekçi biçimde test edebileyim; toggle kapalıyken response anında dönsün.

## Acceptance Criteria

1. **Given** Controls tab → HAR accordion'ında HAR yüklüyken **When** toggle görüntülendiğinde **Then** "HAR Timing Replay" label'ıyla bir on/off switch gösterilmeli; varsayılan olarak **kapalı** (off) olmalı (UX6, FR15)

2. **Given** HAR Timing Replay toggle açık ve HAR'da `timings.wait` değeri 500ms olan bir entry **When** eşleşen request geldiğinde **Then** mock response döndürülmeden önce `timings.wait + timings.receive` ms gecikme uygulanmalı (FR15)

3. **Given** HAR Timing Replay toggle kapalıyken **When** herhangi bir match response döndürüldüğünde **Then** delay uygulanmamalı; response anında dönmeli

4. **Given** HAR entry'de timing bilgisi eksik veya negatif olduğunda **When** timing replay hesaplandığında **Then** hata fırlatılmamalı; delay 0ms olarak uygulanmalı (defensive: `Math.max(0, ...)`)

5. **Given** HAR yüklenmemişken **When** HAR accordion görüntülendiğinde **Then** timing replay toggle görünmemeli (progressive disclosure — `@if (hasHar())`)

6. **Given** toggle durumu değiştiğinde **When** `UPDATE_SETTINGS` mesajı gönderildiğinde **Then** `chrome.storage.local`'a persist olmalı; popup kapatılıp açıldığında STATE_SYNC ile toggle durumu restore edilmeli

## Tasks / Subtasks

- [x] Task 1: `ControlsTabComponent` HAR Timing Replay Toggle Ekle (AC: #1, #5, #6)
  - [x] Subtask 1.1: `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts`'e `timingReplay` computed signal ekle:
    - `readonly timingReplay = computed(() => this.messaging.state()?.settings?.timingReplay ?? false);`
  - [x] Subtask 1.2: Template'de `@if (hasHar())` bloğuna timing replay toggle ekle — strategy toggle'ın **altında**:
    - Label: "HAR Timing Replay"
    - Toggle: native checkbox veya `<button role="switch">` (hm-strategy-toggle'a benzer Tailwind stil)
    - `aria-checked`, `aria-label="HAR Timing Replay toggle"` accessibility
  - [x] Subtask 1.3: `onTimingReplayChange(enabled: boolean)` handler ekle:
    - `UPDATE_SETTINGS` mesajı gönder: `{ settings: { timingReplay: enabled } }`
    - Hata durumunda `console.error` ile log

- [x] Task 2: Unit Test Güncelle (AC: #1, #5)
  - [x] Subtask 2.1: `controls-tab.component.spec.ts` — timing replay toggle:
    - `hasHar() = false` → toggle görünmemeli
    - `hasHar() = true` → toggle görünmeli, varsayılan `false`
    - Toggle tıklaması → `UPDATE_SETTINGS` mesajı `{ timingReplay: true }` ile gönderilmeli
    - Hata handler catch branch testi

## Dev Notes

### Kritik: Backend %100 Hazır — Sadece UI Toggle Gerekli

Story 2.6'nın **tüm backend mantığı** önceki story'lerde implementasyon yapılmış durumda. Bu story yalnızca **Popup UI** katmanına bir toggle ekler:

| Özellik | Durum | Konum |
|---------|-------|-------|
| `timingReplay: boolean` settings field | ✅ Hazır | `state.types.ts` → `ExtensionSettings` |
| `DEFAULT_SETTINGS.timingReplay = false` | ✅ Hazır | `constants.ts` |
| `UPDATE_SETTINGS` handler | ✅ Hazır | `message-handler.ts` — `Partial<ExtensionSettings>` genel |
| Delay hesaplama (timings.wait + timings.receive) | ✅ Hazır | `message-handler.ts` satır ~240: `Math.max(0, (selectedEntry.timings.wait ?? 0) + (selectedEntry.timings.receive ?? 0))` |
| `delay` değeri MATCH_RESULT payload'ında | ✅ Hazır | `payload.types.ts` → `MatchResultPayload.response.delay` |
| Fetch delay uygulama | ✅ Hazır | `fetch-interceptor.ts` → `if (result.response.delay > 0) { await delay(...) }` |
| XHR delay uygulama | ✅ Hazır | `xhr-interceptor.ts` → `setTimeout(applyMock, result.response.delay)` |
| Chrome storage persist | ✅ Hazır | `state-manager.ts` → `updateSettings()` |
| STATE_SYNC ile state okuma | ✅ Hazır | `extension-messaging.service.ts` → `state` signal |

**Bu story `controls-tab.component.ts` ve `controls-tab.component.spec.ts`'den başka hiçbir dosyaya dokunmamalıdır.**

### Timing Hesaplama Mantığı (Backend)

```typescript
// message-handler.ts MATCH_QUERY handler — mevcut kod
const delay = settings.timingReplay
  ? Math.max(0, (selectedEntry.timings.wait ?? 0) + (selectedEntry.timings.receive ?? 0))
  : 0;
```

- `timings.wait` = server'ın response göndermeye başlaması için bekleme süresi
- `timings.receive` = response body'yi almak için gereken süre
- Defensive: `?? 0` ile null/undefined güvenli + `Math.max(0, ...)` ile negatif koruması (AC #4)
- HAR 1.2 spec: `timings` alanı opsiyonel olabilir

### UI Toggle Yeri — Controls Tab Template

```
HAR Accordion (expanded: true)
  ├── hm-har-upload
  └── @if (hasHar()) {
        [Replay Mode seçimi]     ← hm-strategy-toggle (mevcut, Story 2.5)
        [HAR Timing Replay]      ← YENİ toggle (bu story)
      }
```

Önerilen toggle HTML:
```html
@if (hasHar()) {
  <div class="mt-2">
    <p class="mb-1 text-xs font-medium text-slate-500">Replay Mode</p>
    <hm-strategy-toggle ... />
  </div>
  <div class="mt-3 flex items-center justify-between">
    <span class="text-xs font-medium text-slate-500">HAR Timing Replay</span>
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="timingReplay()"
      aria-label="HAR Timing Replay toggle"
      (click)="onTimingReplayChange(!timingReplay())"
      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      [class.bg-indigo-600]="timingReplay()"
      [class.bg-slate-200]="!timingReplay()"
    >
      <span
        class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
        [class.translate-x-[18px]]="timingReplay()"
        [class.translate-x-[3px]]="!timingReplay()"
      ></span>
    </button>
  </div>
}
```

> **NOT:** `translate-x-[18px]` ve `translate-x-[3px]` tam değerleri (arbitrary values) kullan — `translate-x-4.5` gibi non-token değerler Tailwind JIT'te görünmez olabilir (Story 2.5 code review'dan öğrenildi).

### Handler Pattern

```typescript
onTimingReplayChange(enabled: boolean): void {
  void this.messaging
    .sendMessage(MessageType.UPDATE_SETTINGS, { settings: { timingReplay: enabled } } satisfies UpdateSettingsPayload, crypto.randomUUID())
    .catch((err: unknown) => {
      console.error('[HAR Mock] Timing replay güncellenemedi:', err);
    });
}
```

### Test Pattern — Story 2.5'ten Öğrenildi

```typescript
// controls-tab.component.spec.ts — timing replay toggle testi için pattern:
it('should show timing replay toggle when HAR is loaded', () => {
  messagingService.state.set({ ...mockState, harData: mockHarData });
  fixture.detectChanges();
  const toggle = fixture.nativeElement.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]');
  expect(toggle).toBeTruthy();
});

it('should hide timing replay toggle when no HAR loaded', () => {
  messagingService.state.set({ ...mockState, harData: null });
  fixture.detectChanges();
  const toggle = fixture.nativeElement.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]');
  expect(toggle).toBeNull();
});

it('should send UPDATE_SETTINGS when timing replay toggled', () => {
  messagingService.state.set({ ...mockState, harData: mockHarData });
  fixture.detectChanges();
  // sendMessage spy ile toggle click testi
  const toggle = fixture.nativeElement.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]');
  toggle.click();
  expect(sendMessageSpy).toHaveBeenCalledWith(
    MessageType.UPDATE_SETTINGS,
    { settings: { timingReplay: true } },
    expect.any(String),
  );
});
```

### Project Structure Notes

Story 2.6'da **değiştirilecek dosyalar:**

```
packages/extension/src/popup/
├── components/
│   └── controls-tab/
│       ├── controls-tab.component.ts       ← GÜNCELLE (timingReplay signal + handler + template)
│       └── controls-tab.component.spec.ts  ← GÜNCELLE (3-4 yeni test)
```

Başka hiçbir dosya değişmemeli. Background, content script, interceptor dosyaları zaten hazır.

### TypeScript Strict Mode

- `any` YASAK — `unknown` + type guard
- `satisfies` operatörü payload type safety için kullan
- `inject()` DI (constructor injection değil)
- `signal()`, `computed()`, `input()`, `output()` Angular 17+ API'leri

### Barrel Import Kuralı

```typescript
// DOĞRU
import { MessageType } from '../../../shared/messaging.types';
import type { UpdateSettingsPayload } from '../../../shared/payload.types';

// YANLIŞ (barrel export breakage riski)
import { MessageType, type UpdateSettingsPayload } from '../../../shared';
```

### Önceki Story'lerden Öğrenilenler

**Story 2.5 (Default-On / Toggle):**
1. `translate-x-[18px]` → arbitrary Tailwind class (non-token değerler bu formatta)
2. `[class.translate-x-[18px]]` → Angular class binding ile arbitrary value syntax doğru çalışır
3. `role="switch"` + `aria-checked` → accessibility pattern
4. `crypto.randomUUID` JSDOM'da eksik → `test-setup.ts`'te polyfill mevcut (zaten eklendi — tekrar ekleme)
5. Catch branch'leri test et: `sendMessage` reject olduğunda `console.error` çağrılmalı

**Story 2.4 (Fetch/XHR Intercept):**
1. `transpileOnly: true` build'de type hatalarını gizler → `tsc --noEmit` ile doğrula
2. Extension testleri `--config packages/extension/jest.config.js` ile çalıştırılmalı (monorepo root'tan değil)

### Replay Mode State Akışı — Timing Replay Dahil

```
[Popup] Kullanıcı "HAR Timing Replay" toggle'ı açar
    → ControlsTabComponent.onTimingReplayChange(true)
    → ExtensionMessagingService.sendMessage(UPDATE_SETTINGS, { settings: { timingReplay: true } })
    → [Port] background SW'ye mesaj
    → [Background] UPDATE_SETTINGS case → stateManager.updateSettings({ timingReplay: true })
    → chrome.storage.local persist
    → port.postMessage({ success: true })

[Sonraki MATCH_QUERY — HAR eşleşmesi]
    → message-handler.ts MATCH_QUERY → HAR match bulundu
    → settings.timingReplay === true
    → delay = Math.max(0, (entry.timings.wait ?? 0) + (entry.timings.receive ?? 0))
    → MATCH_RESULT payload: { matched: true, response: { ..., delay: 500 } }
    → [Content CS → ISOLATED] window.postMessage MATCH_RESULT
    → [MAIN world fetch-interceptor]
        → if (result.response.delay > 0) await delay(500)  ← 500ms bekleme
        → buildFetchResponse(result.response)
        → Promise<Response> resolve ← sahte ama gecikmeli response
```

## Dev Agent Record

### Completion Notes

- Tüm backend mantığı önceki story'lerde hazırdı; bu story yalnızca UI toggle katmanı ekledi.
- `timingReplay` computed signal, `onTimingReplayChange` handler ve Tailwind toggle UI eklendi.
- Arbitrary Tailwind class'ları (`translate-x-[18px]`, `translate-x-[3px]`) Story 2.5'teki pattern ile uygulandı.
- 31 test geçti (7 yeni timing replay testi dahil).

### File List

- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` (**güncellendi**)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` (**güncellendi**)

### Change Log

| Tarih | Değişiklik |
|-------|------------|
| 2026-02-25 | Story 2.6 implementasyon tamamlandı — timing replay UI toggle eklendi, 31 test pass |

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6] — AC, user story, FR15, UX6
- [Source: _bmad-output/planning-artifacts/epics.md#UX Requirements] — UX6: "HAR timing replay on/off kontrolü Controls tab'ında HAR accordion içinde"
- [Source: packages/extension/src/shared/state.types.ts] — `ExtensionSettings.timingReplay: boolean`
- [Source: packages/extension/src/shared/constants.ts] — `DEFAULT_SETTINGS.timingReplay = false`
- [Source: packages/extension/src/shared/messaging.types.ts] — `MessageType.UPDATE_SETTINGS`
- [Source: packages/extension/src/shared/payload.types.ts] — `UpdateSettingsPayload`, `MatchResultPayload.response.delay`
- [Source: packages/extension/src/background/message-handler.ts#MATCH_QUERY] — timing delay hesaplama (sat. ~240)
- [Source: packages/extension/src/content/fetch-interceptor.ts] — `if (result.response.delay > 0) await delay(...)`
- [Source: packages/extension/src/content/xhr-interceptor.ts] — `setTimeout(applyMock, result.response.delay)`
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts] — mevcut template yapısı
- [Source: packages/extension/src/popup/components/strategy-toggle/hm-strategy-toggle.component.ts] — toggle component pattern
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts] — `sendMessage()`, `state` signal
- [Source: _bmad-output/implementation-artifacts/2-5-default-on-intercept-replay-mode-toggle-extension-toggle.md] — Önceki story öğrenmeleri

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Changed By | Summary |
|------|------------|---------|
| 2026-02-25 | Claude Sonnet 4.6 (GitHub Copilot) | Story 2.6 oluşturuldu — ready-for-dev |
