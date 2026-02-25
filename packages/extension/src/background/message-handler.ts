/**
 * Message Handler — Dispatches incoming messages via switch/case (if/else YASAK)
 * Async handler — chrome.storage.local operasyonları async
 */
import { evaluate, matchUrl } from '@har-mock/core';
import type { MockRequest, HarEntry, MockResponse } from '@har-mock/core';
import { type Message, MessageType } from '../shared/messaging.types';
import type {
  LoadHarPayload,
  MatchQueryPayload,
  MatchResultPayload,
  UpdateSettingsPayload,
  UpdateResponsePayload,
  DeleteRulePayload,
  RulePayload,
  MatchEventPayload,
} from '../shared/payload.types';
import type { HarSessionData, MatchEvent } from '../shared/state.types';
import type { StateManager } from './state-manager';
import type { PortManager } from './port-manager';

/** Match event ID oluşturucu — crypto.randomUUID() yerine basit pattern */
function generateEventId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** MatchEvent oluşturma yardımcısı */
function createMatchEvent(
  url: string,
  method: string,
  source: 'rule' | 'har' | 'passthrough',
  statusCode?: number,
): MatchEvent {
  return {
    id: generateEventId(),
    url,
    method,
    source,
    timestamp: Date.now(),
    statusCode,
  };
}

/** Handle incoming message from a port — switch/case dispatch (async) */
export function handleMessage(
  message: Message,
  port: chrome.runtime.Port,
  stateManager: StateManager,
  portManager: PortManager,
): void {
  void handleMessageAsync(message, port, stateManager, portManager);
}

async function handleMessageAsync(
  message: Message,
  port: chrome.runtime.Port,
  stateManager: StateManager,
  portManager: PortManager,
): Promise<void> {
  // Lazy initialization — SW idle timeout sonrası wake-up resilience
  if (!stateManager.isInitialized()) {
    await stateManager.initialize();
  }

  switch (message.type) {
    case MessageType.PING:
      port.postMessage({ type: MessageType.PONG, payload: undefined });
      break;

    case MessageType.STATE_SYNC: {
      try {
        const state = stateManager.getFullState();
        port.postMessage({
          type: MessageType.STATE_SYNC,
          payload: state,
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.STATE_SYNC,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.LOAD_HAR: {
      try {
        const payload = message.payload as LoadHarPayload;
        const sessionData: HarSessionData = {
          entries: payload.entries,
          patterns: payload.patterns,
          fileName: payload.fileName,
          loadedAt: Date.now(),
        };
        await stateManager.setHarData(sessionData);
        stateManager.resetSequentialCounters();
        port.postMessage({
          type: MessageType.LOAD_HAR,
          payload: { success: true, endpointCount: payload.patterns.length },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.LOAD_HAR,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.MATCH_QUERY: {
      try {
        const { url, method } = message.payload as MatchQueryPayload;
        const settings = stateManager.getSettings();

        // Extension kapalıysa passthrough
        if (!settings.enabled) {
          const passEvent = createMatchEvent(url, method, 'passthrough');
          await stateManager.addMatchEvent(passEvent);
          portManager.sendToPopup({
            type: MessageType.MATCH_EVENT,
            payload: passEvent as unknown as MatchEventPayload,
          } as Message);
          port.postMessage({
            type: MessageType.MATCH_RESULT,
            payload: { matched: false } satisfies MatchResultPayload,
          });
          break;
        }

        // Exclude list kontrolü
        if (settings.excludeList.some((pattern) => url.includes(pattern))) {
          const excludeEvent = createMatchEvent(url, method, 'passthrough');
          await stateManager.addMatchEvent(excludeEvent);
          portManager.sendToPopup({
            type: MessageType.MATCH_EVENT,
            payload: excludeEvent as unknown as MatchEventPayload,
          } as Message);
          port.postMessage({
            type: MessageType.MATCH_RESULT,
            payload: { matched: false } satisfies MatchResultPayload,
          });
          break;
        }

        // Edited response kontrolü
        const editedKey = `${method.toUpperCase()}:${url}`;
        const editedResponses = stateManager.getEditedResponses();
        const edited = editedResponses[editedKey];
        if (edited !== undefined) {
          const editedEvent = createMatchEvent(url, method, 'har', edited.statusCode);
          await stateManager.addMatchEvent(editedEvent);
          portManager.sendToPopup({
            type: MessageType.MATCH_EVENT,
            payload: editedEvent as unknown as MatchEventPayload,
          } as Message);
          port.postMessage({
            type: MessageType.MATCH_RESULT,
            payload: {
              matched: true,
              response: {
                statusCode: edited.statusCode,
                body: edited.body,
                headers: [...edited.headers],
                delay: 0,
              },
              source: 'har',
            } satisfies MatchResultPayload,
          });
          break;
        }

        // 1. Rules first (core evaluate)
        const rules = stateManager.getActiveRules();
        const mockRequest: MockRequest = { url, method };
        const ruleResponse = evaluate(mockRequest, [...rules]);
        if (ruleResponse !== null) {
          const ruleEvent = createMatchEvent(url, method, 'rule', ruleResponse.statusCode);
          await stateManager.addMatchEvent(ruleEvent);
          portManager.sendToPopup({
            type: MessageType.MATCH_EVENT,
            payload: ruleEvent as unknown as MatchEventPayload,
          } as Message);
          port.postMessage({
            type: MessageType.MATCH_RESULT,
            payload: {
              matched: true,
              response: ruleResponse,
              source: 'rule',
            } satisfies MatchResultPayload,
          });
          break;
        }

        // 2. HAR pattern match (core matchUrl) + mode-aware entry selection
        const harData = stateManager.getHarData();
        if (harData !== null) {
          const match = matchUrl(url, method, [...harData.patterns]);
          if (match !== null) {
            const matchingEntries = harData.entries.filter(
              (e) =>
                e.url === match.pattern.original && e.method.toUpperCase() === method.toUpperCase(),
            );
            if (matchingEntries.length > 0) {
              let selectedEntry: HarEntry;
              if (settings.replayMode === 'sequential') {
                const idx = stateManager.getSequentialIndex(match.pattern.template);
                selectedEntry = matchingEntries[idx % matchingEntries.length] as HarEntry;
                stateManager.incrementSequentialIndex(match.pattern.template);
              } else {
                selectedEntry = matchingEntries[matchingEntries.length - 1] as HarEntry;
              }
              const delay = settings.timingReplay
                ? Math.max(
                    0,
                    (selectedEntry.timings.wait ?? 0) + (selectedEntry.timings.receive ?? 0),
                  )
                : 0;
              const response: MockResponse = {
                statusCode: selectedEntry.status,
                body: selectedEntry.responseBody,
                headers: [...selectedEntry.responseHeaders],
                delay,
              };
              const harEvent = createMatchEvent(url, method, 'har', selectedEntry.status);
              await stateManager.addMatchEvent(harEvent);
              portManager.sendToPopup({
                type: MessageType.MATCH_EVENT,
                payload: harEvent as unknown as MatchEventPayload,
              } as Message);
              port.postMessage({
                type: MessageType.MATCH_RESULT,
                payload: {
                  matched: true,
                  response,
                  source: 'har',
                } satisfies MatchResultPayload,
              });
              break;
            }
          }
        }

        // 3. Passthrough
        const passthroughEvent = createMatchEvent(url, method, 'passthrough');
        await stateManager.addMatchEvent(passthroughEvent);
        portManager.sendToPopup({
          type: MessageType.MATCH_EVENT,
          payload: passthroughEvent as unknown as MatchEventPayload,
        } as Message);
        port.postMessage({
          type: MessageType.MATCH_RESULT,
          payload: { matched: false } satisfies MatchResultPayload,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.MATCH_RESULT,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.UPDATE_SETTINGS: {
      try {
        const { settings } = message.payload as UpdateSettingsPayload;
        await stateManager.updateSettings(settings);
        port.postMessage({
          type: MessageType.UPDATE_SETTINGS,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.UPDATE_SETTINGS,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.ADD_RULE: {
      try {
        const { rule } = message.payload as RulePayload;
        await stateManager.addRule(rule);
        port.postMessage({
          type: MessageType.ADD_RULE,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.ADD_RULE,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.UPDATE_RULE: {
      try {
        const { rule } = message.payload as RulePayload;
        await stateManager.updateRule(rule);
        port.postMessage({
          type: MessageType.UPDATE_RULE,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.UPDATE_RULE,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.DELETE_RULE: {
      try {
        const { ruleId } = message.payload as DeleteRulePayload;
        await stateManager.deleteRule(ruleId);
        port.postMessage({
          type: MessageType.DELETE_RULE,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.DELETE_RULE,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.UPDATE_RESPONSE: {
      try {
        const { key, response } = message.payload as UpdateResponsePayload;
        await stateManager.setEditedResponse(key, response);
        port.postMessage({
          type: MessageType.UPDATE_RESPONSE,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.UPDATE_RESPONSE,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    case MessageType.CLEAR_HISTORY: {
      try {
        await stateManager.clearMatchHistory();
        port.postMessage({
          type: MessageType.CLEAR_HISTORY,
          payload: { success: true },
          requestId: message.requestId,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        port.postMessage({
          type: MessageType.CLEAR_HISTORY,
          payload: { success: false, error: errorMsg },
          requestId: message.requestId,
        });
      }
      break;
    }

    default:
      console.warn('[HAR Mock] Unknown message type:', message.type);
      break;
  }
}
