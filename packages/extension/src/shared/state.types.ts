/**
 * Extension State Types — Background SW in-memory cache yapısı ve ortak veri modelleri
 */
import type { HarEntry, UrlPattern, MockRule, HarHeader } from '@har-mock/core';

/** HAR session verisi — parse edilmiş entries + auto-parameterized patterns */
export interface HarSessionData {
  readonly entries: readonly HarEntry[];
  readonly patterns: readonly UrlPattern[];
  readonly fileName: string;
  readonly loadedAt: number; // timestamp
}

/** Extension ayarları — DEFAULT_SETTINGS ile uyumlu */
export type ExtensionSettings = {
  readonly enabled: boolean;
  readonly replayMode: 'sequential' | 'last-match';
  readonly timingReplay: boolean;
  readonly excludeList: readonly string[];
  readonly resourceTypeFilter: readonly string[]; // Boş array = tüm tipler, dolu = sadece belirtilen tipler (ör: ['xhr', 'fetch'])
  readonly domainFilter: readonly string[]; // Boş array = tüm domain'ler, dolu = sadece belirtilen domain'ler (ör: ['15.237.105.224:8080', 'api.example.com'])
};

/** Düzenlenmiş response — key: `${method}:${url}` */
export interface EditedResponse {
  readonly url: string;
  readonly method: string;
  readonly body: string;
  readonly headers: readonly HarHeader[];
  readonly statusCode: number;
}

/** Match event — Monitor tab feed satırı */
export interface MatchEvent {
  readonly id: string;
  readonly url: string;
  readonly method: string;
  readonly source: 'rule' | 'har' | 'passthrough';
  readonly timestamp: number;
  readonly statusCode?: number;
}

/** Tüm extension state'i — background SW in-memory cache yapısı */
export interface ExtensionState {
  harData: HarSessionData | null;
  activeRules: readonly MockRule[];
  settings: ExtensionSettings;
  editedResponses: Record<string, EditedResponse>;
  matchHistory: MatchEvent[];
  accordionStates: Record<string, boolean>;
}

/** Sequential replay counter — key: pattern template */
export type SequentialCounterMap = Record<string, number>;
