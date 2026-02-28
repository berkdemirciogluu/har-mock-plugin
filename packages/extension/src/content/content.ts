/**
 * Content Script — ISOLATED world entry point
 * Establishes port connection to background SW
 * Runs in ISOLATED world (chrome.runtime available)
 * Story 2.4: MAIN world interceptor.ts ile window.postMessage bridge
 */
import { PORT_NAME_CONTENT_PREFIX, STORAGE_KEYS, MessageType, type Message } from '../shared';
import type { MatchQueryPayload, MatchResultPayload } from '../shared';
import {
  HAR_MOCK_CHANNEL,
  type WindowMatchQuery,
  type WindowMatchResult,
} from './window-messaging.types';

/** chrome.storage.local'dan extension enabled durumunu oku (SW uyandırmaz) */
async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS] as { enabled?: boolean } | undefined;
    return settings?.enabled ?? true; // Default: enabled
  } catch {
    return true; // Storage okunamazsa güvenli default
  }
}

// Benzersiz ID — gerçek tabId Story 2.4'te background tarafından port name parse ile çözülecek
const uniqueId = String(Date.now());

let port: chrome.runtime.Port | null = null;
let contextInvalidated = false;

/** Background SW'ye port bağlantısı kur (veya yeniden kur) */
function connectToBackground(): chrome.runtime.Port | null {
  if (contextInvalidated) return null;

  try {
    const newPort = chrome.runtime.connect({
      name: `${PORT_NAME_CONTENT_PREFIX}${uniqueId}`,
    });

    newPort.onDisconnect.addListener(() => {
      port = null;
      // chrome.runtime.lastError erişimi kendisi de throw edebilir — try/catch sarılı
      try {
        if (chrome.runtime.lastError) {
          contextInvalidated = true;
          console.warn('[HAR Mock] Extension context invalidated — reconnect disabled');
        } else {
          console.log(
            '[HAR Mock] Content script port disconnected (SW idle) — will reconnect on next request',
          );
        }
      } catch {
        contextInvalidated = true;
      }
    });

    newPort.onMessage.addListener(onPortMessage);
    return newPort;
  } catch {
    contextInvalidated = true;
    console.warn(
      '[HAR Mock] Could not connect to background — extension context may be invalidated',
    );
    return null;
  }
}

/** Port yoksa yeniden bağlanmaya çalış */
function ensurePort(): chrome.runtime.Port | null {
  if (port) return port;
  port = connectToBackground();
  return port;
}

// İlk bağlantı
port = connectToBackground();

// --- MAIN World ↔ ISOLATED World Bridge ---

// MAIN world'den gelen MATCH_QUERY'leri dinle → port'a forward et
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;

  const data = event.data as Record<string, unknown> | undefined;
  if (data?.['channel'] !== HAR_MOCK_CHANNEL) return;
  if (data?.['type'] !== 'MATCH_QUERY') return;

  const query = data as unknown as WindowMatchQuery;

  // Extension kapalıysa SW'yi uyandırma — doğrudan matched:false döndür
  void isExtensionEnabled().then((enabled) => {
    if (!enabled) {
      const passthrough: WindowMatchResult = {
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_RESULT',
        requestId: query.requestId,
        matched: false,
      };
      window.postMessage(passthrough, '*');
      return;
    }

    const activePort = ensurePort();
    activePort?.postMessage({
      type: MessageType.MATCH_QUERY,
      payload: { url: query.url, method: query.method, tabId: 0 } satisfies MatchQueryPayload,
      requestId: query.requestId,
    } satisfies Message<MatchQueryPayload>);
  });
});

/** Port mesaj handler — ayrı fonksiyon olarak tanımlı (reconnect'te yeniden atanabilir) */
function onPortMessage(message: Message): void {
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
}

console.log('[HAR Mock] Content script loaded (ISOLATED world)');
