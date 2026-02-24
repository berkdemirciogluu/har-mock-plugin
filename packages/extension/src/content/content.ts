/**
 * Content Script — MAIN world entry point
 * Establishes port connection to background SW
 * Story 2.4'te fetch/XHR intercept logic eklenecek
 */
import { PORT_NAME_CONTENT_PREFIX, MessageType, type Message } from '../shared';

// Benzersiz ID — gerçek tabId Story 2.4'te background tarafından port name parse ile çözülecek
const uniqueId = String(Date.now());

const port = chrome.runtime.connect({
  name: `${PORT_NAME_CONTENT_PREFIX}${uniqueId}`,
});

port.onDisconnect.addListener(() => {
  // Sayfa navigate edince doğal kopuş — reconnect Story 2.4'te değerlendirilecek
  console.log('[HAR Mock] Content script port disconnected');
});

port.onMessage.addListener((message: Message) => {
  switch (message.type) {
    case MessageType.PONG:
      // Keep-alive yanıtı alındı
      break;
    default:
      // Story 2.4'te MATCH_RESULT handler eklenecek
      break;
  }
});

console.log('[HAR Mock] Content script loaded (MAIN world)');
