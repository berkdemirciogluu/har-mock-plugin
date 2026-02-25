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
  /** popup → background: HAR dosyası yükle */
  LOAD_HAR = 'LOAD_HAR',
  /** content script → background: URL match sorgula */
  MATCH_QUERY = 'MATCH_QUERY',
  /** background → content script: match sonucu */
  MATCH_RESULT = 'MATCH_RESULT',
  /** background → popup: match eventi push */
  MATCH_EVENT = 'MATCH_EVENT',
  /** popup → background: yeni rule ekle */
  ADD_RULE = 'ADD_RULE',
  /** popup → background: rule güncelle */
  UPDATE_RULE = 'UPDATE_RULE',
  /** popup → background: rule sil */
  DELETE_RULE = 'DELETE_RULE',
  /** popup → background: response düzenle */
  UPDATE_RESPONSE = 'UPDATE_RESPONSE',
  /** popup → background: ayarları güncelle */
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  /** popup → background: match history temizle */
  CLEAR_HISTORY = 'CLEAR_HISTORY',
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
