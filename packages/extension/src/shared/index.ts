// Shared types and constants barrel export
export { MessageType, type Message, type MessageResponse } from './messaging.types';
export {
  PORT_NAME_CONTENT_PREFIX,
  PORT_NAME_POPUP,
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
  StateSyncPayload,
} from './payload.types';
