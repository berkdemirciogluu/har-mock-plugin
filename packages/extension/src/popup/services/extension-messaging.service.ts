/**
 * ExtensionMessagingService — Popup ↔ Background Port Yönetimi
 * Chrome runtime port üzerinden uzun ömürlü bağlantı kurar.
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { MAX_MATCH_HISTORY, PORT_NAME_POPUP } from '../../shared/constants';
import type { Message, MessageResponse } from '../../shared/messaging.types';
import { MessageType } from '../../shared/messaging.types';
import type { MatchEventPayload, StateSyncPayload } from '../../shared/payload.types';

@Injectable({ providedIn: 'root' })
export class ExtensionMessagingService implements OnDestroy {
  private port: chrome.runtime.Port | null = null;
  private readonly _state = signal<StateSyncPayload | null>(null);
  private readonly pendingRejects: Array<(reason: Error) => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  readonly state = this._state.asReadonly();

  connect(): void {
    if (this.port) return;
    this.intentionalDisconnect = false;
    this.clearReconnectTimer();

    try {
      this.port = chrome.runtime.connect({ name: PORT_NAME_POPUP });
    } catch {
      // Extension context geçersiz — reconnect dene
      this.scheduleReconnect();
      return;
    }

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this.rejectAllPending();
      // State'i SİLME — UI verileri korunsun
      // Extension aktifse auto-reconnect yap; değilse sadece on-demand (sendMessage'da)
      if (!this.intentionalDisconnect) {
        const isEnabled = this._state()?.settings?.enabled ?? false;
        if (isEnabled) {
          this.scheduleReconnect();
        }
        // enabled=false ise reconnect yapma — gereksiz SW wake-up döngüsü olur
        // Kullanıcı toggle ON yaptığında sendMessage zaten connect() çağırır
      }
    });

    this.port.onMessage.addListener((msg: Message) => {
      switch (msg.type) {
        case MessageType.STATE_SYNC:
          this._state.set(msg.payload as StateSyncPayload);
          break;
        case MessageType.MATCH_EVENT: {
          const event = msg.payload as MatchEventPayload;
          this._state.update((prev) => {
            if (prev === null) return prev;
            return {
              ...prev,
              matchHistory: [event, ...prev.matchHistory].slice(0, MAX_MATCH_HISTORY),
            };
          });
          break;
        }
      }
    });

    // Popup açıldığında background'dan güncel state'i iste
    this.port.postMessage({
      type: MessageType.STATE_SYNC,
      payload: undefined,
      requestId: crypto.randomUUID(),
    } as Message);
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.port?.disconnect();
    this.port = null;
    this.rejectAllPending();
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 500);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  sendMessage<T>(type: MessageType, payload: T, requestId: string): Promise<MessageResponse> {
    // Port yoksa önce yeniden bağlan — SW idle sonrası port kopmuş olabilir
    if (!this.port) {
      this.connect();
    }

    return new Promise<MessageResponse>((resolve, reject) => {
      if (!this.port) {
        reject(new Error('Port bağlantısı kurulamadı.'));
        return;
      }

      this.pendingRejects.push(reject);

      const cleanup = (): void => {
        clearTimeout(timeout);
        this.port?.onMessage.removeListener(handler);
        const idx = this.pendingRejects.indexOf(reject);
        if (idx !== -1) this.pendingRejects.splice(idx, 1);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Mesaj zaman aşımına uğradı (5000ms)'));
      }, 5000);

      const handler = (msg: Message) => {
        if (msg.requestId === requestId) {
          cleanup();
          resolve(msg.payload as MessageResponse);
        }
      };

      this.port.onMessage.addListener(handler);
      this.port.postMessage({ type, payload, requestId } as Message<T>);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private rejectAllPending(): void {
    const rejects = this.pendingRejects.splice(0);
    for (const rejectFn of rejects) {
      rejectFn(new Error('Port bağlantısı koptu.'));
    }
  }
}
