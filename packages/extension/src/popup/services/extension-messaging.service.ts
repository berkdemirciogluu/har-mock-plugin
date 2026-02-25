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
  readonly state = this._state.asReadonly();

  connect(): void {
    if (this.port) return;
    this.port = chrome.runtime.connect({ name: PORT_NAME_POPUP });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this._state.set(null);
      this.rejectAllPending();
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
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
    this.rejectAllPending();
  }

  sendMessage<T>(type: MessageType, payload: T, requestId: string): Promise<MessageResponse> {
    return new Promise<MessageResponse>((resolve, reject) => {
      if (!this.port) {
        reject(new Error('Port bağlantısı yok. connect() çağırın.'));
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
