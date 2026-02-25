/**
 * Content Script — ISOLATED world entry point
 * Establishes port connection to background SW
 * Runs in ISOLATED world (chrome.runtime available)
 * Story 2.4: MAIN world interceptor.ts ile window.postMessage bridge
 */
import { PORT_NAME_CONTENT_PREFIX, MessageType, type Message } from '../shared';
import type { MatchQueryPayload, MatchResultPayload } from '../shared';
import {
  HAR_MOCK_CHANNEL,
  type WindowMatchQuery,
  type WindowMatchResult,
} from './window-messaging.types';

// Benzersiz ID — gerçek tabId Story 2.4'te background tarafından port name parse ile çözülecek
const uniqueId = String(Date.now());

const port = chrome.runtime.connect({
  name: `${PORT_NAME_CONTENT_PREFIX}${uniqueId}`,
});

port.onDisconnect.addListener(() => {
  // Sayfa navigate edince doğal kopuş
  console.log('[HAR Mock] Content script port disconnected');
});

// --- MAIN World ↔ ISOLATED World Bridge ---

// MAIN world'den gelen MATCH_QUERY'leri dinle → port'a forward et
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;

  const data = event.data as Record<string, unknown> | undefined;
  if (data?.['channel'] !== HAR_MOCK_CHANNEL) return;
  if (data?.['type'] !== 'MATCH_QUERY') return;

  const query = data as unknown as WindowMatchQuery;
  port.postMessage({
    type: MessageType.MATCH_QUERY,
    payload: { url: query.url, method: query.method, tabId: 0 } satisfies MatchQueryPayload,
    requestId: query.requestId,
  } satisfies Message<MatchQueryPayload>);
});

port.onMessage.addListener((message: Message) => {
  switch (message.type) {
    case MessageType.PONG:
      // Keep-alive yanıtı alındı
      break;
    case MessageType.MATCH_RESULT: {
      // Background'dan gelen MATCH_RESULT → MAIN world'e forward
      const payload = message.payload as MatchResultPayload;
      const result: WindowMatchResult = {
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: message.requestId ?? '',
        matched: payload.matched,
        response: payload.response
          ? {
              statusCode: payload.response.statusCode,
              body: payload.response.body,
              headers: [...payload.response.headers],
              delay: payload.response.delay,
            }
          : undefined,
        source: payload.source,
      };
      window.postMessage(result, '*');
      break;
    }
    default:
      break;
  }
});

console.log('[HAR Mock] Content script loaded (ISOLATED world)');
