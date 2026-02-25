/**
 * ExtensionMessagingService — Popup ↔ Background Port Yönetimi
 * Chrome runtime port üzerinden uzun ömürlü bağlantı kurar.
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { PORT_NAME_POPUP } from '../../shared/constants';
import type { Message, MessageResponse } from '../../shared/messaging.types';
import { MessageType } from '../../shared/messaging.types';
import type { StateSyncPayload } from '../../shared/payload.types';

@Injectable({ providedIn: 'root' })
export class ExtensionMessagingService implements OnDestroy {
  private port: chrome.runtime.Port | null = null;
  private readonly _state = signal<StateSyncPayload | null>(null);
  readonly state = this._state.asReadonly();

  connect(): void {
    if (this.port) return;
    this.port = chrome.runtime.connect({ name: PORT_NAME_POPUP });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this._state.set(null);
    });

    this.port.onMessage.addListener((msg: Message) => {
      if (msg.type === MessageType.STATE_SYNC) {
        this._state.set(msg.payload as StateSyncPayload);
      }
    });
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
  }

  sendMessage<T>(type: MessageType, payload: T, requestId: string): Promise<MessageResponse> {
    return new Promise<MessageResponse>((resolve, reject) => {
      if (!this.port) {
        reject(new Error('Port bağlantısı yok. connect() çağırın.'));
        return;
      }

      const timeout = setTimeout(() => {
        this.port?.onMessage.removeListener(handler);
        reject(new Error('Mesaj zaman aşımına uğradı (5000ms)'));
      }, 5000);

      const handler = (msg: Message) => {
        if (msg.type === type) {
          clearTimeout(timeout);
          this.port?.onMessage.removeListener(handler);
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
}
