// Shared types and constants barrel export
export { MessageType, type Message, type MessageResponse } from './messaging.types';
export {
  PORT_NAME_CONTENT_PREFIX,
  PORT_NAME_POPUP,
  HAR_MOCK_CHANNEL,
  MATCH_QUERY_TIMEOUT_MS,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  MAX_MATCH_HISTORY,
} from './constants';
export type {
  HarSessionData,
  ExtensionSettings,
  EditedResponse,
  MatchEvent,
  ExtensionState,
  SequentialCounterMap,
  StorageEntry,
} from './state.types';
export type {
  LoadHarPayload,
  MatchQueryPayload,
  MatchResultPayload,
  MatchEventPayload,
  UpdateSettingsPayload,
  RulePayload,
  DeleteRulePayload,
  UpdateResponsePayload,
  UpdateStorageEntriesPayload,
  StateSyncPayload,
} from './payload.types';
