/**
 * Extension-wide constants
 * Port names, storage keys, default settings
 */

/** Port name prefix for content script connections (ARCH4) */
export const PORT_NAME_CONTENT_PREFIX = 'har-mock-content-';

/** Port name for popup connection (ARCH4) */
export const PORT_NAME_POPUP = 'har-mock-popup';

/** Chrome storage keys for persisted data (ARCH3) */
export const STORAGE_KEYS = {
  HAR_DATA: 'harData',
  ACTIVE_RULES: 'activeRules',
  MATCH_HISTORY: 'matchHistory',
  EDITED_RESPONSES: 'editedResponses',
  SETTINGS: 'settings',
  ACCORDION_STATES: 'accordionStates',
} as const;

/** Default extension settings */
export const DEFAULT_SETTINGS = {
  enabled: true,
  replayMode: 'last-match' as const,
  timingReplay: false,
  excludeList: [] as readonly string[],
} as const;
