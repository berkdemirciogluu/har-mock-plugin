# Story 3.5: Exclude List Yönetimi

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Settings accordion'unda belirli endpoint'leri exclude listesine ekleyip çıkarmayı,
so that bazı API çağrılarını mock'tan hariç tutup gerçek network'e geçirebileyim; örneğin auth token refresh endpoint'ini her zaman gerçek API'ye gönderebileyim.

## Acceptance Criteria

1. **Given** Settings accordion → Exclude List bölümü **When** developer URL pattern girip "Ekle" butonuna tıkladığında **Then** pattern exclude list'e eklenmeli; `chrome.storage.local`'a persist olmalı (FR24, FR25)

2. **Given** exclude list'e bir URL pattern eklendiğinde **When** content script o pattern'la eşleşen bir request intercept ettiğinde **Then** mock response dönülmemeli; orijinal network request'e passthrough yapılmalı; Monitor tab'ında "Passthrough →" (excluded) olarak işaretlenmeli (FR24)

3. **Given** exclude list'te mevcut bir pattern olduğunda **When** developer "Kaldır" butonuna tıkladığında **Then** pattern listeden silinmeli; storage güncellenmeli; o endpoint'ler artık mock'a dahil edilmeli (FR25)

4. **Given** popup yeniden açıldığında **When** Settings accordion görüntülendiğinde **Then** kayıtlı exclude list `chrome.storage.local`'dan yüklenmeli; listede gösterilmeli

5. **Given** developer boş bir input ile "Ekle" butonuna tıkladığında **When** validation kontrol edildiğinde **Then** ekleme yapılmamalı; kullanıcıya uyarı gösterilmeli

6. **Given** zaten exclude list'te bulunan aynı pattern tekrar eklenmeye çalışıldığında **When** "Ekle" butonuna tıklandığında **Then** duplicate eklenmemeli; kullanıcıya bilgi verilmeli

## Tasks / Subtasks

- [x] Task 1: `hm-exclude-list` Angular standalone component oluştur (AC: #1, #3, #4, #5, #6)
  - [x] Subtask 1.1: Dosyaları oluştur:
    - `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts`
    - `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.html`
    - `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.spec.ts`
  - [x] Subtask 1.2: Signal-based input tanımla: `excludeList = input<readonly string[]>([])`
  - [x] Subtask 1.3: Signal-based output tanımla: `excludeListChange = output<readonly string[]>()`
  - [x] Subtask 1.4: `newPattern = signal<string>('')` ile input binding
  - [x] Subtask 1.5: `addPattern()` metodu — boş string kontrolü, duplicate kontrolü, listeye ekleme ve `excludeListChange` emit
  - [x] Subtask 1.6: `removePattern(index: number)` metodu — listeden çıkarma ve `excludeListChange` emit

- [x] Task 2: Template — exclude list UI (AC: #1, #3, #5, #6)
  - [x] Subtask 2.1: Input field + "Ekle" butonu satırı (flex row, URL pattern placeholder)
  - [x] Subtask 2.2: Validation mesajları: boş input → "URL pattern gerekli", duplicate → "Bu pattern zaten listede"
  - [x] Subtask 2.3: Liste bölümü: her pattern için satır (pattern text + "Kaldır" butonu)
  - [x] Subtask 2.4: Boş liste durumu: "Exclude listesi boş. Tüm eşleşen endpoint'ler mock'lanıyor." mesajı
  - [x] Subtask 2.5: a11y: Input `aria-label`, butonlara `aria-label`, liste `role="list"`, satırlar `role="listitem"`

- [x] Task 3: `ControlsTabComponent` entegrasyonu (AC: #1, #4)
  - [x] Subtask 3.1: `HmExcludeListComponent` import et; `ControlsTabComponent.imports` dizisine ekle
  - [x] Subtask 3.2: Template'te Settings accordion içine, `hm-settings-section`'ın altına `<hm-exclude-list>` ekle
  - [x] Subtask 3.3: `excludeList = computed(() => this.messaging.state()?.settings?.excludeList ?? [])` computed signal ekle
  - [x] Subtask 3.4: `onExcludeListChange(list: readonly string[])` handler — `UPDATE_SETTINGS` mesajı gönder: `{ settings: { excludeList: list } }`

- [x] Task 4: Unit testler (AC: #1–6)
  - [x] Subtask 4.1: `hm-exclude-list` — boş liste durumunda boş durum mesajı gösterilmeli
  - [x] Subtask 4.2: Pattern ekleme: input'a değer gir + Ekle tıkla → `excludeListChange` emit edilmeli
  - [x] Subtask 4.3: Boş input ile ekleme → `excludeListChange` emit edilmemeli, hata mesajı gösterilmeli
  - [x] Subtask 4.4: Duplicate pattern ekleme → `excludeListChange` emit edilmemeli, hata mesajı gösterilmeli
  - [x] Subtask 4.5: Pattern kaldırma: Kaldır tıkla → `excludeListChange` güncellenen liste ile emit edilmeli
  - [x] Subtask 4.6: Input temizleme: başarılı ekleme sonrası input alanı boşaltılmalı
  - [x] Subtask 4.7: `ControlsTabComponent` — excludeList computed signal state'ten doğru okuma
  - [x] Subtask 4.8: `ControlsTabComponent` — `onExcludeListChange()` çağrıldığında `UPDATE_SETTINGS` mesajı gönderilmeli

## Dev Notes

### Backend Zaten Tam Hazır — Sadece UI Gerekiyor

**KRITIK:** Bu story'de backend (background SW) tarafında **hiçbir değişiklik gerekmez**. Tüm gerekli altyapı önceki story'lerde implement edilmiştir:

1. **`message-handler.ts` satır 153–167** — Exclude list kontrolü zaten MATCH_QUERY handler'da aktif:
```typescript
// Exclude list kontrolü
if (settings.excludeList.some((pattern) => url.includes(pattern))) {
  const excludeEvent = createMatchEvent(url, method, 'passthrough');
  // ... passthrough event oluştur ve gönder
}
```

2. **`UPDATE_SETTINGS` handler** (satır 275–293) — Partial settings güncellemesini destekliyor:
```typescript
const { settings } = message.payload as UpdateSettingsPayload;
await stateManager.updateSettings(settings);
```

3. **`StateManager.updateSettings()`** — `{ ...this.state.settings, ...partial }` ile merge ediyor ve `chrome.storage.local`'a persist ediyor

4. **`ExtensionSettings.excludeList`** `readonly string[]` olarak tanımlı — substring match (`url.includes(pattern)`) ile çalışıyor

### Proje Yapısı — Dosya Konumları

**Oluşturulacak dosyalar:**
- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts`
- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.html`
- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.spec.ts`

**Güncellenecek dosyalar:**
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` — `HmExcludeListComponent` import + excludeList computed + handler + template entegrasyonu
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` — yeni testler

### Mevcut Kod Bağlamı — Kritik Bilgiler

**`ControlsTabComponent` mevcut yapısı** ([packages/extension/src/popup/components/controls-tab/controls-tab.component.ts](packages/extension/src/popup/components/controls-tab/controls-tab.component.ts)):
- `inject(ExtensionMessagingService)` ile messaging service'e erişim
- Settings accordion zaten mevcut — `hm-settings-section` component'i içeriyor
- `onEnabledChange()`, `onReplayModeChange()`, `onTimingReplayChange()` benzer handler pattern'ları mevcut → aynı pattern `onExcludeListChange()` için kullanılmalı
- Settings accordion'a `<hm-exclude-list>` **SONRA** eklenmeli (`hm-settings-section`'ın altına)

**`SettingsSectionComponent` mevcut yapısı** ([packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts](packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts)):
- Sadece Extension toggle içeriyor — exclude list **buraya eklenmemeli**
- Ayrı `hm-exclude-list` component'i oluşturulmalı (concern separation)

**`ExtensionMessagingService.sendMessage()` pattern'ı:**
```typescript
void this.messaging
  .sendMessage(MessageType.UPDATE_SETTINGS, payload, crypto.randomUUID())
  .catch((err: unknown) => {
    console.error('[HAR Mock] Exclude list güncellenemedi:', err);
  });
```

**`UpdateSettingsPayload` tipi** ([packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts)):
```typescript
export interface UpdateSettingsPayload {
  readonly settings: Partial<ExtensionSettings>;
}
```

**Exclude list eşleştirme — substring match:**
Background SW'deki mevcut implementasyon `url.includes(pattern)` kullanıyor. Bu basit substring eşleştirme:
- `/api/auth` pattern'ı → `https://example.com/api/auth/token`, `https://example.com/api/auth/refresh` URL'lerini yakalar
- Glob veya regex DEĞİL — kullanıcıya bu bilgi UI'da gösterilebilir

### Angular Architecture Kuralları (Proje Geneli)

| Kural | Doğru Kullanım |
|-------|---------------|
| Dependency Injection | `inject()` — constructor injection YASAK |
| Input/Output | `input()` / `output()` signals — `@Input()`/`@Output()` YASAK |
| Change Detection | `ChangeDetectionStrategy.OnPush` |
| Template | `templateUrl` ayrı HTML — inline template küçük component'larda kabul edilebilir |
| Selector prefix | `hm-` prefix zorunlu — `hm-exclude-list` |
| `any` tipi | YASAK — `unknown` + type guard kullan |
| Standalone | `standalone: true` zorunlu |
| Template fonksiyon çağrısı | YASAK — `computed()` veya pipe kullan |

### Component Tasarım Kararları

**Input/Output stratejisi:**
- `hm-exclude-list` "dumb/presentation" component olarak tasarlanmalı
- `excludeList` input signal ile mevcut listeyi alır (state'ten)
- `excludeListChange` output ile güncellenmiş listeyi üst component'e döner
- State güncellemesi `ControlsTabComponent`'te yapılır (`UPDATE_SETTINGS` mesajı)

**Neden ayrı component?**
- `SettingsSectionComponent` sadece extension toggle içeriyor — single responsibility
- Exclude list farklı bir UI pattern'ı (input + list) — accordion içinde kendi bölümü
- Test edilebilirlik: bağımsız test mümkün

**Template yaklaşımı:**
- Component küçük-orta boyutlu olacak → `templateUrl` ayrı HTML tercih edilmeli (proje tutarlılığı)
- Ama `SettingsSectionComponent` inline template kullanıyor — küçük component'lar için kabul edilebilir
- **Karar:** Ayrı HTML dosyası kullan (template biraz daha büyük olacak: input + validation + list)

### Önceki Story'lerden Gelen Kritik Uyarılar

| Kural | Kaynak |
|-------|--------|
| `afterRenderEffect` Angular 18.2'de YOK — `afterNextRender` kullan | Story 3.3 debug log |
| `@ViewChild` YASAK — `viewChild()` signal | Story 3.2 code review |
| Template fonksiyon çağrısı YASAK — `computed()` veya pipe kullan | Story 3.2 dev notes |
| `jest.mock` factory TypeScript parse: hoisting sorununa dikkat | Story 3.3 debug log |
| `fakeAsync` + `tick()` async state testlerinde kullan | Story 3.3 test pattern |
| `requestAnimationFrame` kullanıldığında `DestroyRef` ile cancel | Story 3.2 code review |
| Component'te `inject(DestroyRef).onDestroy(cb)` cleanup pattern'ı | Story 3.2 code review |

### Test Stratejisi

**`hm-exclude-list` component test yaklaşımı:**
- Basit presentation component — `TestBed` + `ComponentFixture` yeterli
- Mock gerekmiyor (input/output component — service inject etmiyor)
- `setInput()` ile farklı exclude list durumları test edilir
- `.subscribe()` ile output emit'leri kontrol edilir

**`ControlsTabComponent` test güncellemesi:**
- Mevcut mock pattern'ı kullanılır (`ExtensionMessagingService` mock)
- `excludeList` computed signal testi: mock state'e excludeList ekle → computed doğru okusun
- `onExcludeListChange()` handler testi: çağrıldığında `sendMessage` doğru payload ile gönderilsin

**Mock state pattern'ı (mevcut test dosyasından):**
```typescript
const mockState: StateSyncPayload = {
  // ...mevcut alanlar...
  settings: {
    enabled: true,
    replayMode: 'last-match',
    timingReplay: false,
    excludeList: ['/api/auth', '/api/health'],
  },
  // ...
};
```

### Mimari Kontrol Noktaları

- [x] `standalone: true` ✓
- [x] `ChangeDetectionStrategy.OnPush` ✓
- [x] `inject()` DI (gerekiyorsa) — constructor injection YOK ✓
- [x] `input()` / `output()` signal API — `@Input()` / `@Output()` YOK ✓
- [x] `any` tipi YASAK ✓
- [x] Selector: `hm-exclude-list` (hm- prefix) ✓
- [x] Template: `templateUrl` ayrı HTML dosyası ✓
- [x] `UPDATE_SETTINGS` payload formatı: `{ settings: { excludeList: [...] } }` — message-handler ile uyumlu ✓
- [x] Background SW değişikliği GEREKMİYOR ✓

### Project Structure Notes

```
packages/extension/src/popup/
  components/
    exclude-list/                       ← YENİ klasör
      hm-exclude-list.component.ts      ← YENİ
      hm-exclude-list.component.html    ← YENİ
      hm-exclude-list.component.spec.ts ← YENİ
    controls-tab/
      controls-tab.component.ts          ← GÜNCELLENECEK (import + computed + handler + template)
      controls-tab.component.spec.ts     ← GÜNCELLENECEK (yeni testler)
    settings-section/
      hm-settings-section.component.ts   ← DEĞİŞMEYECEK
```

**Referans alınacak mevcut dosyalar:**
- `packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts` — benzer basit component pattern
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` — `sendMessage()` handler pattern, Settings accordion yapısı
- `packages/extension/src/shared/state.types.ts` — `ExtensionSettings.excludeList` tipi
- `packages/extension/src/shared/payload.types.ts` — `UpdateSettingsPayload`
- `packages/extension/src/shared/messaging.types.ts` — `MessageType.UPDATE_SETTINGS`
- `packages/extension/src/background/message-handler.ts#L153-167` — exclude list backend kontrolü (zaten implement)

### Git Intelligence — Son Commit'ler

```
f391eec fix(SCRUM-24): Code review düzeltmeleri - event switch state reset, isDirty false positive, DRY, a11y
1b990e3 feat(extension): Story 3-4 — hm-response-viewer component & inline edit
d4bd85e fix(SCRUM-23): Code review düzeltmeleri - Babel hoisting bug, aria-label, NgZone, isReadOnly
ab9ffb6 feat(SCRUM-23): CodeMirror 6 JSON editor component implementasyonu
```

**Pattern'lar:** commit prefix'leri `feat(extension):` veya `fix(SCRUM-XX):` formatında; a11y (accessibility) önemli; code review düzeltmeleri ayrı commit olarak atılıyor.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5] — Story gereksinimleri, acceptance criteria, FR24/FR25 coverage
- [Source: _bmad-output/planning-artifacts/architecture.md#Settings accordion] — UX7: Settings accordion'ında exclude listesi yönetimi
- [Source: packages/extension/src/shared/state.types.ts#L22-L27] — `ExtensionSettings.excludeList: readonly string[]`
- [Source: packages/extension/src/shared/constants.ts#L32] — `DEFAULT_SETTINGS.excludeList: []`
- [Source: packages/extension/src/shared/payload.types.ts#L50-L52] — `UpdateSettingsPayload`
- [Source: packages/extension/src/background/message-handler.ts#L153-L167] — Exclude list kontrol mekanizması (backend, zaten implement)
- [Source: packages/extension/src/background/message-handler.ts#L275-L293] — `UPDATE_SETTINGS` handler
- [Source: packages/extension/src/background/state-manager.ts#L131-L134] — `updateSettings()` partial merge + persist
- [Source: packages/extension/src/popup/components/controls-tab/controls-tab.component.ts] — Settings accordion ve handler pattern'ları
- [Source: packages/extension/src/popup/components/settings-section/hm-settings-section.component.ts] — Mevcut settings toggle component
- [Source: packages/extension/src/popup/services/extension-messaging.service.ts] — `sendMessage()` API
- [Source: _bmad-output/implementation-artifacts/3-4-response-viewer-inline-edit-persist.md] — Önceki story dev notes ve debug log lessons

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- `readonly string[][]` tipi spec dosyasında `push()` ile uyumsuz — `(readonly string[])[]` olarak düzeltildi.

### Completion Notes List

- ✅ `hm-exclude-list` Angular standalone component oluşturuldu (`OnPush`, `input()`, `output()` signal API)
- ✅ Dumb/presentation component: `excludeList` input signal alır, `excludeListChange` output emit eder
- ✅ `addPattern()`: boş string ve duplicate kontrolü, validasyon hatası signal-based
- ✅ `removePattern(index)`: immutable liste güncelleme, emit
- ✅ Ayrı HTML template (`templateUrl`) — input+validation+list bölümleri, tam a11y desteği
- ✅ `ControlsTabComponent` güncellendi: `HmExcludeListComponent` import, `excludeList` computed signal, `onExcludeListChange()` handler, template entegrasyonu
- ✅ 21 yeni `hm-exclude-list` unit test — TÜM GEÇER
- ✅ 11 yeni `ControlsTabComponent` unit test (subtask 4.7+4.8) — TÜM GEÇER
- ✅ Full regression: 390 test, 24 suite — sıfır regresyon
- ✅ Backend değişikliği yok (message-handler.ts exclude list kontrolü zaten aktifti)

### File List

- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.ts` (YENİ)
- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.html` (YENİ)
- `packages/extension/src/popup/components/exclude-list/hm-exclude-list.component.spec.ts` (YENİ)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.ts` (GÜNCELLENDİ)
- `packages/extension/src/popup/components/controls-tab/controls-tab.component.spec.ts` (GÜNCELLENDİ)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (GÜNCELLENDİ)

### Change Log

- feat(SCRUM-25): hm-exclude-list component oluşturuldu — signal-based input/output, addPattern/removePattern, validation, a11y (Date: 2026-02-27)
- feat(SCRUM-25): ControlsTabComponent'e exclude list UI entegre edildi — excludeList computed signal ve onExcludeListChange handler (Date: 2026-02-27)
- test(SCRUM-25): 32 yeni unit test eklendi — hm-exclude-list (21) + ControlsTabComponent (11 yeni) (Date: 2026-02-27)
