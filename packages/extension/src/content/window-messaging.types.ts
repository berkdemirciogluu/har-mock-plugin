/**
 * Window Messaging Protocol — ISOLATED world ↔ MAIN world bridge
 * Chrome port messaging ile KARIŞTIRILMAMALI — bu window.postMessage tabanlı
 */

/** Channel identifier — shared/constants.ts'den import + re-export (tek kaynak DRY) */
import { HAR_MOCK_CHANNEL } from '../shared/constants';
export { HAR_MOCK_CHANNEL };

/** MAIN → ISOLATED: URL match sorgusu */
export interface WindowMatchQuery {
  readonly channel: typeof HAR_MOCK_CHANNEL;
  readonly type: 'MATCH_QUERY';
  readonly requestId: string;
  readonly url: string;
  readonly method: string;
}

/** ISOLATED → MAIN: Match sonucu */
export interface WindowMatchResult {
  readonly channel: typeof HAR_MOCK_CHANNEL;
  readonly type: 'MATCH_RESULT';
  readonly requestId: string;
  readonly matched: boolean;
  readonly response?: {
    readonly statusCode: number;
    readonly body: string;
    readonly headers: ReadonlyArray<{ readonly name: string; readonly value: string }>;
    readonly delay: number;
  };
  readonly source?: 'rule' | 'har';
}

/** Union type for window message discrimination */
export type WindowMessage = WindowMatchQuery | WindowMatchResult;
