/**
 * Message Handler — Dispatches incoming messages via switch/case (if/else YASAK)
 */
import { type Message, MessageType } from '../shared';

/** Handle incoming message from a port — switch/case dispatch */
export function handleMessage(message: Message, port: chrome.runtime.Port): void {
  switch (message.type) {
    case MessageType.PING:
      port.postMessage({ type: MessageType.PONG });
      break;

    case MessageType.STATE_SYNC:
      // Placeholder — Story 2.2'de doldurulacak
      break;

    default:
      console.warn('[HAR Mock] Unknown message type:', message.type);
      break;
  }
}
