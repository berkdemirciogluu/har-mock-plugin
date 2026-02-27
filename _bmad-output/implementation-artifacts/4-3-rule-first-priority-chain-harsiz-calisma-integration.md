# Story 4.3: Rule-First Priority Chain — HAR'sız Çalışma & Integration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want tanımlı rule'ların intercept mekanizmasına tam entegrasyonunu ve HAR dosyası olmadan sadece rule'larla çalışmayı,
so that HAR yüklemeden 429 Too Many Requests, 500 Internal Server Error gibi senaryoları test edebileyim; rule varken HAR'dan önce rule kullanılsın.

## Acceptance Criteria

1. **Given** `/api/data/*` pattern'ına 429 status + `{"error": "rate_limited"}` body + 500ms delay tanımlı bir rule mevcut **When** sayfa `/api/data/users` isteği yaptığında **Then** content script rule eşleşmesini background SW'den almalı; 500ms delay sonra 429 status ve ilgili body ile mock response dönülmeli; hiç HAR yüklenmemiş olsa bile çalışmalı (FR18, FR19)

2. **Given** hem eşleşen rule hem de eşleşen HAR entry mevcut aynı URL için **When** request intercept edildiğinde **Then** rule response dönülmeli; HAR entry kullanılmamalı; Rule-First priority chain deterministik çalışmalı (FR18, NFR7)

3. **Given** eşleşen rule yok, eşleşen HAR entry var **When** request intercept edildiğinde **Then** HAR response dönülmeli (FR18)

4. **Given** ne rule ne HAR eşleşmesi var **When** request intercept edildiğinde **Then** orijinal network'e passthrough yapılmalı; Monitor tab'ında "Passthrough →" gösterilmeli (FR18)

5. **Given** delay tanımlı bir rule eşleştiğinde **When** content script response'u oluştururken **Then** belirtilen delay (ms) kadar bekledikten sonra mock response dönülmeli

## Tasks / Subtasks

> **KRİTİK:** Tüm 5 AC'nin **temel implementasyonu önceki story'lerde TAMAMLANMIŞTIR**. Bu story'nin amacı:
> 1. Eksik integration testlerini eklemek (message-handler.spec.ts, priority chain doğrulama)
> 2. Mevcut kodu doğrulayıp gerekirse küçük düzeltmeler yapmak

- [x] Task 1: `message-handler.spec.ts` — Priority Chain Integration Testleri (AC: #1, #2, #5)
  - [x] Subtask 1.1: **AC2 — Rule wins over HAR** testi ekle:
    - Hem `mockEvaluate` mock rule döndürecek şekilde ayarla
    - Hem de `mockMatchUrl` HAR match döndürecek şekilde ayarla
    - MATCH_QUERY gönder → `port.postMessage`'ın `source: 'rule'` ile çağrıldığını doğrula
    - `evaluate`'ın çağrıldığını ve `matchUrl`'ın **çağrılmadığını** doğrula (short-circuit)
  - [x] Subtask 1.2: **AC1 + FR19 — Rule matches without HAR** testi ekle:
    - `stateManager.getHarData.mockReturnValue(null)` — HAR yüklü değil
    - `mockEvaluate.mockReturnValue({ statusCode: 429, body: '{"error":"rate_limited"}', headers: [], delay: 500 })` — rule eşleşiyor
    - MATCH_QUERY gönder → `matched: true`, `source: 'rule'`, `response.statusCode: 429` doğrula
  - [x] Subtask 1.3: **AC5 — Rule delay in MATCH_RESULT payload** testi ekle:
    - `mockEvaluate.mockReturnValue({ statusCode: 429, body: '...', headers: [], delay: 500 })`
    - MATCH_QUERY gönder → `port.postMessage` response payload'ında `delay: 500` doğrula
  - [x] Subtask 1.4: **AC3 — Only HAR matches (no rule)** regresyon testi — mevcut "should return HAR response when URL matches HAR pattern" testi yeterli, atlandı
  - [x] Subtask 1.5: **AC4 — Neither rule nor HAR matches → passthrough** regresyon testi — mevcut "should passthrough when no match found" testi yeterli, atlandı

- [x] Task 2: `message-handler.spec.ts` — Monitor/MatchEvent integration doğrulama (AC: #2, #4)
  - [x] Subtask 2.1: Rule eşleşince `portManager.sendToPopup` → `MATCH_EVENT` `{ source: 'rule' }` ile çağrıldığını doğrula
  - [x] Subtask 2.2: Passthrough durumda `portManager.sendToPopup` → `MATCH_EVENT` `{ source: 'passthrough' }` ile çağrıldığını doğrula
  - [x] Subtask 2.3: `addMatchEvent` rule eşleşince `source: 'rule'` ile çağrıldığını doğrula

- [x] Task 3: `fetch-interceptor.spec.ts` — Rule source ile delay entegrasyonu (AC: #1, #5)
  - [x] Subtask 3.1: Mevcut "should apply delay when response.delay > 0" testi (delay:50, realtime) yeterli — konfirme edildi ✅
  - [x] Subtask 3.2: Mevcut realtime delay testi yeterli; jest.useFakeTimers varyantına gerek yok — atlandı

- [x] Task 4: `xhr-interceptor.spec.ts` — Rule source ile delay entegrasyonu (AC: #5)
  - [x] Subtask 4.1: Mevcut "should apply delay when response.delay > 0" testi (delay:50, realtime) yeterli — konfirme edildi ✅

- [x] Task 5: Implementation doğrulama — `message-handler.ts` MATCH_QUERY handler review (AC: #1–5)
  - [x] Subtask 5.1: Priority chain sırası `evaluate() → matchUrl() → passthrough` — DOĞRU (L191-275) ✅
  - [x] Subtask 5.2: `evaluate()` kısa devre (short-circuit) — rule bulunursa L211'de `break` ile HAR'a gidilmiyor ✅
  - [x] Subtask 5.3: `harData === null` iken rule eşleşmesi → rule check (L191) harData check'ten (L215) önce ✅
  - [x] Subtask 5.4: Bug tespit edilmedi; mock call history temizleme için `beforeEach`'e `mockClear()` eklendi

- [x] Task 6: Tüm testleri çalıştır — 0 regresyon doğrula
  - [x] Subtask 6.1: `yarn workspace @har-mock/extension jest --no-coverage` — 497/497 geçti ✅
  - [x] Subtask 6.2: Yeni testler: 5 adet eklendi (message-handler.spec.ts). Toplam: 497 (extension) + 221 (core) = 718 test

## Dev Notes

### KRİTİK: Implementation Zaten Tamamlanmış — Sadece Test Ekleniyor

Bu story'de background SW veya content script implementasyonunda **neredeyse hiçbir değişiklik gerekmez**. Tüm priority chain mantığı önceki story'lerde tamamlanmıştır:

**`message-handler.ts` mevcut MATCH_QUERY handler'ı (satır ~132–273) — DEĞİŞMEYECEK:**

1. **Step 1 — Rules (highest priority):**
   ```typescript
   const rules = stateManager.getActiveRules();
   const ruleResponse = evaluate(mockRequest, [...rules]);
   if (ruleResponse !== null) {
     // → port.postMessage({ source: 'rule', response: ruleResponse })
     break; // HAR'a HİÇ GİDİLMEZ — short-circuit
   }
   ```

2. **Step 2 — HAR (only if no rule match):**
   ```typescript
   const harData = stateManager.getHarData();
   if (harData !== null) {
     const match = matchUrl(url, method, [...harData.patterns]);
     // → port.postMessage({ source: 'har', response })
   }
   ```

3. **Step 3 — Passthrough (no rule, no HAR):**
   ```typescript
   port.postMessage({ type: MessageType.MATCH_RESULT, payload: { matched: false } })
   ```

**HAR'sız çalışma (FR19):** `harData === null` olduğunda `if (harData !== null)` bloğu atlanır. Step 1'de rule eşleşmişse response dönülmüş olur. Rule da yoksa passthrough yapılır. ✅

**Delay:** `evaluate()` [Source: packages/core/src/rule-engine/rule-engine.ts] — `rule.delay` değerini `MockResponse.delay` olarak döndürür. `port.postMessage` payload'ında `response.delay: 500` şeklinde gider. Content script'te:
- `fetch-interceptor.ts`: `if (result.response.delay > 0) { await delay(result.response.delay); }` ✅
- `xhr-interceptor.ts`: `if (result.response.delay > 0) { setTimeout(applyMock, result.response.delay); }` ✅

### Mevcut Testler — Nelerin Zaten Var Olduğu

**`message-handler.spec.ts` (mevcut — Story 4.1–4.2'den):**
- ✅ "should return rule response when rule matches" (line ~295) — temel rule match
- ✅ "should return HAR response when URL matches HAR pattern" (line ~329) — HAR match
- ✅ "should passthrough when no HAR data is loaded" (line ~468) — no HAR → passthrough (no rule)
- ✅ "should passthrough when no match found" (line ~480) — no rule, no HAR

**EKSIK testler (bu story'de eklenecek):**
- ❌ "Rule wins when BOTH rule AND HAR match" (AC2 — priority chain doğrulama)
- ❌ "Rule matches WITHOUT HAR (FR19)" (AC1 — HAR yüklü değil ama rule eşleşiyor)
- ❌ "Rule with delay > 0 → delay in MATCH_RESULT payload" (AC5)
- ❌ "Rule match → MATCH_EVENT with source: 'rule'" (monitor entegrasyonu)

### Test Kodları — Eklenecek Testler

**Subtask 1.1 — Rule wins over HAR:**
```typescript
it('should return rule response (not HAR) when BOTH rule AND HAR match — RULE FIRST priority', async () => {
  // Setup: both rule AND HAR match
  const rule = makeRule();
  stateManager.getActiveRules.mockReturnValue([rule]);
  mockEvaluate.mockReturnValue({
    statusCode: 429,
    body: '{"error":"rate_limited"}',
    headers: [],
    delay: 0,
  });
  // HAR also matches — but should NOT be used
  const harData = makeHarData();
  stateManager.getHarData.mockReturnValue(harData);
  mockMatchUrl.mockReturnValue({
    pattern: {
      original: 'https://api.test.com/data',
      template: 'https://api.test.com/data',
      segments: [],
      method: 'GET',
    },
  });

  const message: Message = {
    type: MessageType.MATCH_QUERY,
    payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
  };
  handleMessage(message, port, stateManager, portManager);
  await new Promise((r) => setTimeout(r, 10));

  // Rule should win
  expect(port.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: MessageType.MATCH_RESULT,
      payload: expect.objectContaining({
        matched: true,
        source: 'rule',
        response: expect.objectContaining({ statusCode: 429 }),
      }),
    }),
  );
  // HAR matchUrl should NOT have been called — short-circuit
  expect(mockMatchUrl).not.toHaveBeenCalled();
});
```

**Subtask 1.2 — Rule matches without HAR (FR19):**
```typescript
it('should return rule response when rule matches and no HAR is loaded (FR19)', async () => {
  stateManager.getHarData.mockReturnValue(null); // No HAR loaded
  const rule = makeRule();
  stateManager.getActiveRules.mockReturnValue([rule]);
  mockEvaluate.mockReturnValue({
    statusCode: 429,
    body: '{"error":"rate_limited"}',
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    delay: 500,
  });

  const message: Message = {
    type: MessageType.MATCH_QUERY,
    payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
  };
  handleMessage(message, port, stateManager, portManager);
  await new Promise((r) => setTimeout(r, 10));

  expect(port.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: MessageType.MATCH_RESULT,
      payload: expect.objectContaining({
        matched: true,
        source: 'rule',
        response: expect.objectContaining({
          statusCode: 429,
          body: '{"error":"rate_limited"}',
        }),
      }),
    }),
  );
  // matchUrl should NOT be called — HAR is null, we short-circuited on rule
  expect(mockMatchUrl).not.toHaveBeenCalled();
});
```

**Subtask 1.3 — Rule delay in payload:**
```typescript
it('should include rule delay in MATCH_RESULT response payload (AC5)', async () => {
  stateManager.getHarData.mockReturnValue(null);
  mockEvaluate.mockReturnValue({
    statusCode: 429,
    body: '{"error":"rate_limited"}',
    headers: [],
    delay: 500, // 500ms delay
  });
  stateManager.getActiveRules.mockReturnValue([makeRule()]);

  const message: Message = {
    type: MessageType.MATCH_QUERY,
    payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
  };
  handleMessage(message, port, stateManager, portManager);
  await new Promise((r) => setTimeout(r, 10));

  const callArg = (port.postMessage as jest.Mock).mock.calls[0]?.[0] as {
    type: string;
    payload: { matched: boolean; source: string; response: { delay: number } };
  };
  expect(callArg?.payload?.response?.delay).toBe(500);
  expect(callArg?.payload?.source).toBe('rule');
});
```

**Subtask 2.1 — Rule match → MATCH_EVENT with source: 'rule':**
```typescript
it('should push MATCH_EVENT with source: rule to popup when rule matches', async () => {
  mockEvaluate.mockReturnValue({
    statusCode: 429,
    body: '{}',
    headers: [],
    delay: 0,
  });
  stateManager.getActiveRules.mockReturnValue([makeRule()]);

  const message: Message = {
    type: MessageType.MATCH_QUERY,
    payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
  };
  handleMessage(message, port, stateManager, portManager);
  await new Promise((r) => setTimeout(r, 10));

  expect(portManager.sendToPopup).toHaveBeenCalledWith(
    expect.objectContaining({
      type: MessageType.MATCH_EVENT,
      payload: expect.objectContaining({ source: 'rule' }),
    }),
  );
  expect(stateManager.addMatchEvent).toHaveBeenCalledWith(
    expect.objectContaining({ source: 'rule' }),
  );
});
```

### File Locations — Implementation Files (Referans)

**DEĞİŞTİRİLMEYECEK dosyalar (sadece doğrulama):**
- `packages/extension/src/background/message-handler.ts` — Priority chain burada, doğru
- `packages/extension/src/content/fetch-interceptor.ts` — Delay uygulama burada, doğru
- `packages/extension/src/content/xhr-interceptor.ts` — XHR delay uygulama, doğru
- `packages/core/src/rule-engine/rule-engine.ts` — `evaluate()`, delay dahil MockResponse döndürüyor

**GÜNCELLENECEKdosyalar (sadece testler):**
- `packages/extension/src/background/message-handler.spec.ts` — 4–5 yeni test
- `packages/extension/src/content/fetch-interceptor.spec.ts` — opsiyonel, delay mevcut test yeterliyse sadece konfirme
- `packages/extension/src/content/xhr-interceptor.spec.ts` — opsiyonel, delay mevcut test yeterliyse sadece konfirme

### Core evaluate() Function — Delay Davranışı

[Source: packages/core/src/rule-engine/rule-engine.ts]

```typescript
export function evaluate(request: MockRequest, rules: readonly MockRule[]): MockResponse | null {
  // ...
  if (matchRulePattern(request.url, rule.urlPattern)) {
    return {
      statusCode: rule.statusCode,
      body: rule.responseBody,
      headers: [...rule.responseHeaders],
      delay: rule.delay, // ← rule.delay doğrudan geçiyor
    };
  }
  // ...
}
```

`MockRule.delay` → `MockResponse.delay` → `MatchResultPayload.response.delay` → content script `result.response.delay` → `setTimeout` / `await delay()` ✅

### Wildcard Pattern Matching — Test Nüansı

`evaluate()` wildcard pattern desteği:
```typescript
// '/api/data/*' → prefix match
if (normalizedPattern.endsWith('/*')) {
  const prefix = normalizedPattern.slice(0, -2); // '/api/data'
  return requestPath === prefix || requestPath.startsWith(prefix + '/');
}
```

AC1'de `/api/data/*` pattern → `/api/data/users` URL → eşleşmeli. Test yazarken `evaluate()`'ı mock'ladığımız için (jest.mock) bu wildcard logic otomatik test edilmez. Rule-engine unit testleri bunu zaten test ediyor. `message-handler` integration testlerinde `mockEvaluate.mockReturnValue(...)` ile doğrudan mock response dönülür.

### Önceki Story'lerden Kritik Uyarılar

| Kural | Kaynak |
|-------|--------|
| `jest.mock` factory hoisting — `import` sonrası `jest.Mock` cast gerekli | Story 3.3 debug log |
| `await new Promise(r => setTimeout(r, 10))` async handler flush pattern | Story 4.2 test pattern |
| `mockEvaluate.mockReturnValue(null)` — her `beforeEach`'te reset edilmeli | message-handler.spec.ts existing pattern |
| `mockMatchUrl.not.toHaveBeenCalled()` — short-circuit doğrulaması için | Bu story - yeni |

### Priority Chain Akışı — Referans Diagram

```
MATCH_QUERY geldi
    ↓
Extension kapalı? → PASSTHROUGH
    ↓
Exclude list? → PASSTHROUGH
    ↓
Edited response? → HAR source (edited)
    ↓
Rules evaluate() → eşleşme var? → RULE source (break — HAR'a gitme)
    ↓
harData null değil + matchUrl eşleşiyor + HAR entry var? → HAR source
    ↓
PASSTHROUGH
```

**Story 4.3 kapsamı:** 4. ve 5. adımların integration testleri + HAR'sız 4. adım davranışı.

### References

- [Source: packages/extension/src/background/message-handler.ts](packages/extension/src/background/message-handler.ts) — Priority chain implementation (MATCH_QUERY case, ~L132–273)
- [Source: packages/extension/src/background/message-handler.spec.ts](packages/extension/src/background/message-handler.spec.ts) — Mevcut testler, yeni testler buraya eklenecek
- [Source: packages/core/src/rule-engine/rule-engine.ts](packages/core/src/rule-engine/rule-engine.ts) — `evaluate()` delay dahil MockResponse
- [Source: packages/core/src/priority-chain/priority-chain.ts](packages/core/src/priority-chain/priority-chain.ts) — Core priority chain (background handler bununla aynı mantığı implement ediyor)
- [Source: packages/extension/src/content/fetch-interceptor.ts](packages/extension/src/content/fetch-interceptor.ts) — delay uygulama (L32–34)
- [Source: packages/extension/src/content/xhr-interceptor.ts](packages/extension/src/content/xhr-interceptor.ts) — XHR delay uygulama (L68–72)
- [Source: packages/extension/src/shared/payload.types.ts](packages/extension/src/shared/payload.types.ts) — MatchResultPayload (delay alanı)
- [Source: _bmad-output/planning-artifacts/epics.md](epics.md) — Epic 4, Story 4.3 AC'leri
- [Source: _bmad-output/planning-artifacts/architecture.md](architecture.md) — NFR7: Priority chain deterministik

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `mockMatchUrl.mock.calls` önceki testlerden birikiyordu. `beforeEach`'e `mockEvaluate.mockClear()` ve `mockMatchUrl.mockClear()` eklenerek çözüldü. Bunun nedeni `jest.restoreAllMocks()` yalnızca `jest.spyOn` ile oluşturulan spy'ları restore etmesi, `jest.mock()` factory ile oluşturulan mock'ların call history'sini temizlememesi.

### Completion Notes List

- **Task 1 (Subtask 1.1)**: "Rule wins over HAR" testi eklendi. `mockEvaluate` 429 döndürürken `mockMatchUrl` da match döndürecek şekilde setup yapıldı. Test, `source: 'rule'` ile yanıt döndürüldüğünü ve `mockMatchUrl`'ın hiç çağrılmadığını (short-circuit) doğrular.
- **Task 1 (Subtask 1.2)**: "FR19 — Rule without HAR" testi eklendi. `getHarData.mockReturnValue(null)` ile HAR yüklü değilken rule eşleşmesinin 429 response döndürdüğü doğrulandı.
- **Task 1 (Subtask 1.3)**: "AC5 — delay in payload" testi eklendi. `delay: 500` içeren mock response'un MATCH_RESULT payload'ında `response.delay: 500` olarak iletildiği doğrulandı.
- **Task 2 (Subtask 2.1+2.3)**: "Rule match → MATCH_EVENT source: rule" testi eklendi. `portManager.sendToPopup` ve `stateManager.addMatchEvent` her ikisi de `{ source: 'rule' }` ile çağrıldığı doğrulandı.
- **Task 2 (Subtask 2.2)**: "Passthrough → MATCH_EVENT source: passthrough" testi eklendi. Her iki popup push da `{ source: 'passthrough' }` doğrulandı.
- **Task 3 & 4**: `fetch-interceptor.spec.ts` ve `xhr-interceptor.spec.ts` mevcut delay testleri yeterli (delay: 50ms, realtime) — konfirme edildi.
- **Task 5**: `message-handler.ts` implementation doğrulandı — priority chain sırası, short-circuit, HAR'sız çalışma hepsi doğru.
- **Task 6**: 497 extension + 221 core = 718 toplam test, 0 regresyon.

### File List

packages/extension/src/background/message-handler.spec.ts

### Change Log

- 2026-02-27: Story 4.3 implementasyonu tamamlandı — `message-handler.spec.ts`'e 5 yeni integration testi eklendi (AC1/FR19, AC2 Rule-First priority chain, AC5 delay, AC2+AC4 MATCH_EVENT). `beforeEach` mock temizleme düzeltmesi (mockClear). Tüm 718 test geçiyor, 0 regresyon.
