/**
 * MockResolver — MAIN world'den ISOLATED world content script'e
 * window.postMessage ile mock query gönderir, sonucu Promise olarak döner.
 * Timeout durumunda null döner (sessiz passthrough).
 */
import {
  HAR_MOCK_CHANNEL,
  type WindowMatchQuery,
  type WindowMatchResult,
} from './window-messaging.types';

/** Match sonucu — interceptor'lar bu tipi kullanır */
export interface ResolvedMatch {
  readonly matched: boolean;
  readonly response?: {
    readonly statusCode: number;
    readonly body: string;
    readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
    readonly delay: number;
  };
  readonly source?: 'rule' | 'har';
}

export class MockResolver {
  private readonly pendingRequests = new Map<
    string,
    { resolve: (result: ResolvedMatch | null) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly boundHandler: (event: MessageEvent) => void;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
    this.boundHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.boundHandler);
  }

  /** URL + method ile background SW'ye sorgu gönder, sonucu bekle */
  resolve(url: string, method: string): Promise<ResolvedMatch | null> {
    const requestId = this.generateId();

    return new Promise<ResolvedMatch | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(null); // Timeout → passthrough
      }, this.timeoutMs);

      this.pendingRequests.set(requestId, { resolve, timer });

      const query: WindowMatchQuery = {
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_QUERY',
        requestId,
        url,
        method,
      };

      window.postMessage(query, '*');
    });
  }

  /** Cleanup — testler ve unmount için */
  destroy(): void {
    window.removeEventListener('message', this.boundHandler);
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.resolve(null); // Pending promise'ları null ile çöz (passthrough)
    }
    this.pendingRequests.clear();
  }

  private handleMessage(event: MessageEvent): void {
    // Sadece kendi window'dan gelen mesajları kabul et
    if (event.source !== window) return;

    const data = event.data as Record<string, unknown> | undefined;
    if (data?.['channel'] !== HAR_MOCK_CHANNEL) return;
    if (data?.['type'] !== 'MATCH_RESULT') return;

    const result = data as unknown as WindowMatchResult;
    const pending = this.pendingRequests.get(result.requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(result.requestId);

    pending.resolve({
      matched: result.matched,
      response: result.response,
      source: result.source,
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
