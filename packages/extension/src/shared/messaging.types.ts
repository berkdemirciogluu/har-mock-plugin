/**
 * Chrome Extension Messaging Protocol Types
 * Port-based long-lived connections between background SW, content script, and popup
 */

/** Message type enum for switch/case dispatch (if/else YASAK) */
export enum MessageType {
  /** Port bağlantı bildirimi */
  CONNECT = 'CONNECT',
  /** Port kopma bildirimi */
  DISCONNECT = 'DISCONNECT',
  /** Keep-alive mesajı */
  PING = 'PING',
  /** Keep-alive yanıtı */
  PONG = 'PONG',
  /** Popup açılışında state senkronizasyonu */
  STATE_SYNC = 'STATE_SYNC',
}

/** Generic message interface for port communication */
export interface Message<T = unknown> {
  readonly type: MessageType;
  readonly payload: T;
  /** popup→background'da zorunlu, background→push'larda opsiyonel */
  readonly requestId?: string;
}

/** Generic message response interface */
export interface MessageResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly type: string;
    readonly message: string;
  };
}
