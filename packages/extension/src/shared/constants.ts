/**
 * Extension-wide constants
 * Port names, storage keys, default settings
 */

/** Port name prefix for content script connections (ARCH4) */
export const PORT_NAME_CONTENT_PREFIX = 'har-mock-content-';

/** Port name for popup connection (ARCH4) */
export const PORT_NAME_POPUP = 'har-mock-popup';

/** Window messaging channel — MAIN ↔ ISOLATED world bridge */
export const HAR_MOCK_CHANNEL = '__HAR_MOCK__' as const;

/** Mock resolver timeout (ms) — background SW yanıt vermezse passthrough */
export const MATCH_QUERY_TIMEOUT_MS = 5000;

/** Chrome storage keys for persisted data (ARCH3) */
export const STORAGE_KEYS = {
  HAR_DATA: 'harData',
  ACTIVE_RULES: 'activeRules',
  MATCH_HISTORY: 'matchHistory',
  EDITED_RESPONSES: 'editedResponses',
  SETTINGS: 'settings',
  ACCORDION_STATES: 'accordionStates',
  STORAGE_ENTRIES: 'storageEntries',
} as const;

/** Default extension settings */
export const DEFAULT_SETTINGS = {
  enabled: true,
  replayMode: 'last-match' as const,
  timingReplay: false,
  excludeList: [] as readonly string[],
  resourceTypeFilter: ['xhr', 'fetch'] as readonly string[],
  domainFilter: [] as readonly string[],
} as const;

/** Maximum number of match events stored in history */
export const MAX_MATCH_HISTORY = 500;
