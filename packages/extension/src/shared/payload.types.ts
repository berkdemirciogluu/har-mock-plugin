/**
 * Message Payload Types — Her MessageType için gönderilen/alınan payload şemaları
 */
import type { HarEntry, UrlPattern, MockRule, HarHeader } from '@har-mock/core';
import type { HarSessionData, ExtensionSettings, EditedResponse, MatchEvent } from './state.types';

/** LOAD_HAR payload — popup'tan gelen HAR verisi */
export interface LoadHarPayload {
  readonly entries: readonly HarEntry[];
  readonly patterns: readonly UrlPattern[];
  readonly fileName: string;
}

/** MATCH_QUERY payload — content script'ten gelen sorgu */
export interface MatchQueryPayload {
  readonly url: string;
  readonly method: string;
  readonly tabId: number;
}

/** MATCH_RESULT payload — background'dan content script'e dönen sonuç */
export interface MatchResultPayload {
  readonly matched: boolean;
  readonly response?: {
    readonly statusCode: number;
    readonly body: string;
    readonly headers: readonly HarHeader[];
    readonly delay: number;
  };
  readonly source?: 'rule' | 'har';
}

/** MATCH_EVENT payload — background'dan popup'a push */
export interface MatchEventPayload {
  readonly id: string;
  readonly url: string;
  readonly method: string;
  readonly source: 'rule' | 'har' | 'passthrough';
  readonly statusCode?: number;
  readonly timestamp: number;
}

/** UPDATE_SETTINGS payload */
export interface UpdateSettingsPayload {
  readonly settings: Partial<ExtensionSettings>;
}

/** ADD_RULE / UPDATE_RULE payload */
export interface RulePayload {
  readonly rule: MockRule;
}

/** DELETE_RULE payload */
export interface DeleteRulePayload {
  readonly ruleId: string;
}

/** UPDATE_RESPONSE payload */
export interface UpdateResponsePayload {
  readonly key: string;
  readonly response: EditedResponse;
}

/** STATE_SYNC response payload — popup açılınca gönderilen state dump */
export interface StateSyncPayload {
  readonly harData: HarSessionData | null;
  readonly activeRules: readonly MockRule[];
  readonly settings: ExtensionSettings;
  readonly editedResponses: Record<string, EditedResponse>;
  readonly matchHistory: MatchEvent[];
  readonly accordionStates: Record<string, boolean>;
}
