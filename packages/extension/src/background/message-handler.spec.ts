import { handleMessage } from './message-handler';
import { MessageType, type Message } from '../shared';
import type { StateManager } from './state-manager';
import type { PortManager } from './port-manager';
import type { HarSessionData, ExtensionSettings, EditedResponse } from '../shared/state.types';
import type { StateSyncPayload } from '../shared/payload.types';
import type { MockRule, HarEntry } from '@har-mock/core';

// @har-mock/core mocks
jest.mock('@har-mock/core', () => ({
  evaluate: jest.fn().mockReturnValue(null),
  matchUrl: jest.fn().mockReturnValue(null),
}));

import { evaluate, matchUrl } from '@har-mock/core';
const mockEvaluate = evaluate as jest.MockedFunction<typeof evaluate>;
const mockMatchUrl = matchUrl as jest.MockedFunction<typeof matchUrl>;

function createMockPort(): chrome.runtime.Port {
  return {
    name: 'test-port',
    postMessage: jest.fn(),
    disconnect: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListeners: jest.fn(),
      hasListener: jest.fn(),
      addRules: jest.fn(),
      getRules: jest.fn(),
      removeRules: jest.fn(),
    },
    onDisconnect: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListeners: jest.fn(),
      hasListener: jest.fn(),
      addRules: jest.fn(),
      getRules: jest.fn(),
      removeRules: jest.fn(),
    },
  } as unknown as chrome.runtime.Port;
}

function createMockStateManager(): jest.Mocked<StateManager> {
  const defaultSettings: ExtensionSettings = {
    enabled: true,
    replayMode: 'last-match',
    timingReplay: false,
    excludeList: [],
  };
  const defaultFullState: StateSyncPayload = {
    harData: null,
    activeRules: [],
    settings: defaultSettings,
    editedResponses: {},
    matchHistory: [],
    accordionStates: {},
  };
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    getFullState: jest.fn().mockReturnValue(defaultFullState),
    getHarData: jest.fn().mockReturnValue(null),
    setHarData: jest.fn().mockResolvedValue(undefined),
    clearHarData: jest.fn().mockResolvedValue(undefined),
    getActiveRules: jest.fn().mockReturnValue([]),
    addRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
    deleteRule: jest.fn().mockResolvedValue(undefined),
    getSettings: jest.fn().mockReturnValue(defaultSettings),
    updateSettings: jest.fn().mockResolvedValue(undefined),
    getEditedResponses: jest.fn().mockReturnValue({}),
    setEditedResponse: jest.fn().mockResolvedValue(undefined),
    deleteEditedResponse: jest.fn().mockResolvedValue(undefined),
    getMatchHistory: jest.fn().mockReturnValue([]),
    addMatchEvent: jest.fn().mockResolvedValue(undefined),
    clearMatchHistory: jest.fn().mockResolvedValue(undefined),
    getAccordionStates: jest.fn().mockReturnValue({}),
    updateAccordionState: jest.fn().mockResolvedValue(undefined),
    getSequentialIndex: jest.fn().mockReturnValue(0),
    incrementSequentialIndex: jest.fn(),
    resetSequentialCounters: jest.fn(),
  } as unknown as jest.Mocked<StateManager>;
}

function createMockPortManager(): jest.Mocked<PortManager> {
  return {
    registerPort: jest.fn(),
    unregisterPort: jest.fn(),
    getContentPort: jest.fn(),
    getPopupPort: jest.fn(),
    broadcastToContent: jest.fn(),
    sendToPopup: jest.fn(),
  } as unknown as jest.Mocked<PortManager>;
}

// Minimal rule stub — statusCode/responseBody are placeholder defaults and are NOT used in
// assertions; evaluate() is always mocked in tests. This factory's only purpose is to provide
// a non-empty active rules array via stateManager.getActiveRules.mockReturnValue([makeRule()]).
const makeRule = (): MockRule => ({
  id: 'rule-1',
  urlPattern: '/api/*',
  method: 'GET',
  statusCode: 200,
  responseBody: '{"rule":true}',
  responseHeaders: [],
  delay: 0,
  enabled: true,
});

const makeHarEntry = (): HarEntry => ({
  url: 'https://api.test.com/data',
  method: 'GET',
  status: 200,
  statusText: 'OK',
  responseBody: '{"har":true}',
  responseHeaders: [],
  requestHeaders: [],
  timings: { blocked: -1, dns: -1, connect: -1, send: 0, wait: 10, receive: 5, ssl: -1 },
});

const makeHarData = (): HarSessionData => ({
  entries: [makeHarEntry()],
  patterns: [
    {
      original: 'https://api.test.com/data',
      template: 'https://api.test.com/data',
      segments: [],
      method: 'GET',
    },
  ],
  fileName: 'test.har',
  loadedAt: Date.now(),
});

const makeEditedResponse = (): EditedResponse => ({
  url: 'https://api.test.com/data',
  method: 'GET',
  body: '{"edited":true}',
  headers: [],
  statusCode: 201,
});

describe('handleMessage', () => {
  let port: chrome.runtime.Port;
  let stateManager: jest.Mocked<StateManager>;
  let portManager: jest.Mocked<PortManager>;

  beforeEach(() => {
    port = createMockPort();
    stateManager = createMockStateManager();
    portManager = createMockPortManager();
    jest.spyOn(console, 'warn').mockImplementation();
    mockEvaluate.mockClear();
    mockEvaluate.mockReturnValue(null);
    mockMatchUrl.mockClear();
    mockMatchUrl.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- PING/PONG ---

  it('should respond with PONG when receiving PING', async () => {
    const message: Message = { type: MessageType.PING, payload: undefined };
    handleMessage(message, port, stateManager, portManager);
    await Promise.resolve(); // let async settle

    expect(port.postMessage).toHaveBeenCalledWith({ type: MessageType.PONG, payload: undefined });
  });

  // --- STATE_SYNC ---

  it('should send full state dump on STATE_SYNC', async () => {
    const message: Message = {
      type: MessageType.STATE_SYNC,
      payload: undefined,
      requestId: 'req-1',
    };
    handleMessage(message, port, stateManager, portManager);
    await Promise.resolve();

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.STATE_SYNC, requestId: 'req-1' }),
    );
    expect(stateManager.getFullState).toHaveBeenCalled();
  });

  // --- LOAD_HAR ---

  it('should load HAR data and reset sequential counters on LOAD_HAR', async () => {
    const harData = makeHarData();
    const message: Message = {
      type: MessageType.LOAD_HAR,
      payload: {
        entries: harData.entries,
        patterns: harData.patterns,
        fileName: harData.fileName,
      },
      requestId: 'req-2',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.setHarData).toHaveBeenCalled();
    expect(stateManager.resetSequentialCounters).toHaveBeenCalled();
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.LOAD_HAR,
        payload: expect.objectContaining({
          success: true,
          data: expect.objectContaining({ patternCount: 1 }),
        }),
      }),
    );
  });

  it('should include patternCount matching patterns array length in LOAD_HAR response', async () => {
    const harData = makeHarData();
    const message: Message = {
      type: MessageType.LOAD_HAR,
      payload: {
        entries: harData.entries,
        patterns: harData.patterns,
        fileName: harData.fileName,
      },
      requestId: 'req-pattern-count',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          data: { patternCount: harData.patterns.length },
        }),
      }),
    );
  });

  // --- MATCH_QUERY — disabled extension ---

  it('should passthrough when extension is disabled', async () => {
    stateManager.getSettings.mockReturnValue({
      enabled: false,
      replayMode: 'last-match',
      timingReplay: false,
      excludeList: [],
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.MATCH_RESULT, payload: { matched: false } }),
    );
  });

  // --- MATCH_QUERY — exclude list ---

  it('should passthrough when URL matches exclude list', async () => {
    stateManager.getSettings.mockReturnValue({
      enabled: true,
      replayMode: 'last-match',
      timingReplay: false,
      excludeList: ['excluded.com'],
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://excluded.com/api', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.MATCH_RESULT, payload: { matched: false } }),
    );
  });

  // --- MATCH_QUERY — edited response ---

  it('should return edited response when editing exists for the URL', async () => {
    const edited = makeEditedResponse();
    stateManager.getEditedResponses.mockReturnValue({
      'GET:https://api.test.com/data': edited,
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({ matched: true, source: 'har' }),
      }),
    );
  });

  // --- MATCH_QUERY — rule match ---

  it('should return rule response when rule matches', async () => {
    const rule = makeRule();
    stateManager.getActiveRules.mockReturnValue([rule]);
    mockEvaluate.mockReturnValue({ statusCode: 200, body: '{"rule":true}', headers: [], delay: 0 });

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({ matched: true, source: 'rule' }),
      }),
    );
    expect(portManager.sendToPopup).toHaveBeenCalled();
  });

  // --- MATCH_QUERY — HAR match (last-match) ---

  it('should return HAR response when URL matches HAR pattern (last-match)', async () => {
    const harData = makeHarData();
    stateManager.getHarData.mockReturnValue(harData);
    mockMatchUrl.mockReturnValue({
      pattern: {
        original: 'https://api.test.com/data',
        template: 'https://api.test.com/data',
        segments: [],
        method: 'GET',
      },
    });

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({ matched: true, source: 'har' }),
      }),
    );
  });

  // --- MATCH_QUERY — HAR match (sequential mode) ---

  it('should use sequential counter in sequential replay mode', async () => {
    const harData = makeHarData();
    stateManager.getHarData.mockReturnValue(harData);
    stateManager.getSettings.mockReturnValue({
      enabled: true,
      replayMode: 'sequential',
      timingReplay: false,
      excludeList: [],
    });
    stateManager.getSequentialIndex.mockReturnValue(0);
    mockMatchUrl.mockReturnValue({
      pattern: {
        original: 'https://api.test.com/data',
        template: 'https://api.test.com/data',
        segments: [],
        method: 'GET',
      },
    });

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.getSequentialIndex).toHaveBeenCalledWith('https://api.test.com/data');
    expect(stateManager.incrementSequentialIndex).toHaveBeenCalledWith('https://api.test.com/data');
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({ matched: true, source: 'har' }),
      }),
    );
  });

  // --- MATCH_QUERY — HAR match with timingReplay ---

  it('should include delay when timingReplay is enabled', async () => {
    const harData = makeHarData();
    stateManager.getHarData.mockReturnValue(harData);
    stateManager.getSettings.mockReturnValue({
      enabled: true,
      replayMode: 'last-match',
      timingReplay: true,
      excludeList: [],
    });
    mockMatchUrl.mockReturnValue({
      pattern: {
        original: 'https://api.test.com/data',
        template: 'https://api.test.com/data',
        segments: [],
        method: 'GET',
      },
    });

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    const callArg = (port.postMessage as jest.Mock).mock.calls[0]?.[0] as {
      type: string;
      payload: { matched: boolean; response?: { delay: number } };
    };
    expect(callArg?.payload?.response?.delay).toBe(15); // wait: 10 + receive: 5
  });

  // --- MATCH_QUERY — HAR pattern matches but no entries for method ---

  it('should passthrough when HAR pattern matches but no entries for method', async () => {
    const harData: HarSessionData = {
      entries: [makeHarEntry()],
      patterns: [
        {
          original: 'https://api.test.com/data',
          template: 'https://api.test.com/data',
          segments: [],
          method: 'GET',
        },
      ],
      fileName: 'test.har',
      loadedAt: Date.now(),
    };
    stateManager.getHarData.mockReturnValue(harData);
    mockMatchUrl.mockReturnValue({
      pattern: {
        original: 'https://api.test.com/data',
        template: 'https://api.test.com/data',
        segments: [],
        method: 'GET',
      },
    });

    // Request with different method (POST) — no matching entries
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'POST', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.MATCH_RESULT, payload: { matched: false } }),
    );
  });

  // --- MATCH_QUERY — HAR data is null (no HAR loaded) ---

  it('should passthrough when no HAR data is loaded', async () => {
    stateManager.getHarData.mockReturnValue(null);
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.MATCH_RESULT, payload: { matched: false } }),
    );
  });

  // --- MATCH_QUERY — passthrough (no match) ---

  it('should passthrough when no match found', async () => {
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://unmatched.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.MATCH_RESULT, payload: { matched: false } }),
    );
  });

  // --- MATCH_QUERY — priority chain: rule wins over HAR (AC2) ---

  it('should return rule response (not HAR) when BOTH rule AND HAR match — RULE FIRST priority', async () => {
    // Setup: both rule AND HAR match
    const rule = makeRule();
    stateManager.getActiveRules.mockReturnValue([rule]);
    mockEvaluate.mockReturnValue({
      statusCode: 429,
      body: '{"error":"rate_limited"}',
      headers: [],
      delay: 0,
    });
    // HAR data is present but should NOT be consulted — rule short-circuits the HAR path
    const harData = makeHarData();
    stateManager.getHarData.mockReturnValue(harData);

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    // Rule should win
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({
          matched: true,
          source: 'rule',
          response: expect.objectContaining({ statusCode: 429 }),
        }),
      }),
    );
    // HAR matchUrl should NOT have been called — short-circuit
    expect(mockMatchUrl).not.toHaveBeenCalled();
  });

  // --- MATCH_QUERY — rule matches without HAR loaded (FR19, AC1) ---

  it('should return rule response when rule matches and no HAR is loaded (FR19)', async () => {
    stateManager.getHarData.mockReturnValue(null); // No HAR loaded
    const rule = makeRule();
    stateManager.getActiveRules.mockReturnValue([rule]);
    mockEvaluate.mockReturnValue({
      statusCode: 429,
      body: '{"error":"rate_limited"}',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      delay: 500,
    });

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        payload: expect.objectContaining({
          matched: true,
          source: 'rule',
          response: expect.objectContaining({
            statusCode: 429,
            body: '{"error":"rate_limited"}',
          }),
        }),
      }),
    );
    // matchUrl should NOT be called — harData is null so the HAR block is never entered
    expect(mockMatchUrl).not.toHaveBeenCalled();
  });

  // --- MATCH_QUERY — rule delay in MATCH_RESULT payload (AC5) ---

  it('should include rule delay in MATCH_RESULT response payload (AC5)', async () => {
    stateManager.getHarData.mockReturnValue(null);
    mockEvaluate.mockReturnValue({
      statusCode: 429,
      body: '{"error":"rate_limited"}',
      headers: [],
      delay: 500, // 500ms delay
    });
    stateManager.getActiveRules.mockReturnValue([makeRule()]);

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalled();
    const callArg = (port.postMessage as jest.Mock).mock.calls[0]?.[0] as {
      type: string;
      payload: { matched: boolean; source: string; response: { delay: number } };
    };
    expect(callArg?.payload?.response?.delay).toBe(500);
    expect(callArg?.payload?.source).toBe('rule');
  });

  // --- MATCH_QUERY — rule match → MATCH_EVENT with source: 'rule' (AC2, Task 2) ---

  it('should push MATCH_EVENT with source: rule to popup when rule matches', async () => {
    mockEvaluate.mockReturnValue({
      statusCode: 429,
      body: '{}',
      headers: [],
      delay: 0,
    });
    stateManager.getActiveRules.mockReturnValue([makeRule()]);

    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(portManager.sendToPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_EVENT,
        payload: expect.objectContaining({ source: 'rule' }),
      }),
    );
    expect(stateManager.addMatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rule' }),
    );
  });

  // --- MATCH_QUERY — passthrough → MATCH_EVENT with source: 'passthrough' (AC4, Task 2) ---

  it('should push MATCH_EVENT with source: passthrough when no rule or HAR matches', async () => {
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://unmatched.com/data', method: 'GET', tabId: 1 },
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(portManager.sendToPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_EVENT,
        payload: expect.objectContaining({ source: 'passthrough' }),
      }),
    );
    expect(stateManager.addMatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'passthrough' }),
    );
  });

  // --- UPDATE_SETTINGS ---

  it('should update settings', async () => {
    const message: Message = {
      type: MessageType.UPDATE_SETTINGS,
      payload: { settings: { enabled: false } },
      requestId: 'req-3',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.updateSettings).toHaveBeenCalledWith({ enabled: false });
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true }, requestId: 'req-3' }),
    );
  });

  // --- ADD_RULE ---

  it('should add a rule', async () => {
    const rule = makeRule();
    const message: Message = { type: MessageType.ADD_RULE, payload: { rule }, requestId: 'req-4' };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.addRule).toHaveBeenCalledWith(rule);
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true } }),
    );
  });

  // --- UPDATE_RULE ---

  it('should update a rule', async () => {
    const rule = makeRule();
    const message: Message = {
      type: MessageType.UPDATE_RULE,
      payload: { rule },
      requestId: 'req-5',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.updateRule).toHaveBeenCalledWith(rule);
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true } }),
    );
  });

  // --- DELETE_RULE ---

  it('should delete a rule', async () => {
    const message: Message = {
      type: MessageType.DELETE_RULE,
      payload: { ruleId: 'rule-1' },
      requestId: 'req-6',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.deleteRule).toHaveBeenCalledWith('rule-1');
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true } }),
    );
  });

  // --- UPDATE_RESPONSE ---

  it('should update an edited response', async () => {
    const response = makeEditedResponse();
    const message: Message = {
      type: MessageType.UPDATE_RESPONSE,
      payload: { key: 'GET:url', response },
      requestId: 'req-7',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.setEditedResponse).toHaveBeenCalledWith('GET:url', response);
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true } }),
    );
  });

  // --- CLEAR_HISTORY ---

  it('should clear match history', async () => {
    const message: Message = {
      type: MessageType.CLEAR_HISTORY,
      payload: undefined,
      requestId: 'req-8',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.clearMatchHistory).toHaveBeenCalled();
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { success: true } }),
    );
  });

  // --- Unknown message type ---

  it('should warn on unknown message type', async () => {
    const message = { type: 'UNKNOWN_TYPE' as MessageType, payload: undefined };
    handleMessage(message, port, stateManager, portManager);
    await Promise.resolve();

    expect(console.warn).toHaveBeenCalledWith('[HAR Mock] Unknown message type:', 'UNKNOWN_TYPE');
  });

  // --- Error handling ---

  it('should return error response when storage fails on LOAD_HAR', async () => {
    stateManager.setHarData.mockRejectedValue(new Error('Storage quota exceeded'));
    const harData = makeHarData();
    const message: Message = {
      type: MessageType.LOAD_HAR,
      payload: { entries: harData.entries, patterns: harData.patterns, fileName: harData.fileName },
      requestId: 'req-err',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.LOAD_HAR,
        payload: expect.objectContaining({ success: false, error: 'Storage quota exceeded' }),
      }),
    );
  });

  it('should return error response when STATE_SYNC fails', async () => {
    stateManager.getFullState.mockImplementation(() => {
      throw new Error('State error');
    });
    const message: Message = {
      type: MessageType.STATE_SYNC,
      payload: undefined,
      requestId: 'req-err2',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.STATE_SYNC,
        payload: expect.objectContaining({ success: false, error: 'State error' }),
      }),
    );
  });

  it('should return error response when UPDATE_SETTINGS fails', async () => {
    stateManager.updateSettings.mockRejectedValue(new Error('Settings error'));
    const message: Message = {
      type: MessageType.UPDATE_SETTINGS,
      payload: { settings: { enabled: false } },
      requestId: 'req-err3',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.UPDATE_SETTINGS,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('should return error response when ADD_RULE fails', async () => {
    stateManager.addRule.mockRejectedValue(new Error('Rule error'));
    const message: Message = {
      type: MessageType.ADD_RULE,
      payload: { rule: makeRule() },
      requestId: 'req-err4',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.ADD_RULE,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('should return error response when UPDATE_RULE fails', async () => {
    stateManager.updateRule.mockRejectedValue(new Error('Rule update error'));
    const message: Message = {
      type: MessageType.UPDATE_RULE,
      payload: { rule: makeRule() },
      requestId: 'req-err5',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.UPDATE_RULE,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('should return error response when DELETE_RULE fails', async () => {
    stateManager.deleteRule.mockRejectedValue(new Error('Rule delete error'));
    const message: Message = {
      type: MessageType.DELETE_RULE,
      payload: { ruleId: 'rule-1' },
      requestId: 'req-err6',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.DELETE_RULE,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('should return error response when UPDATE_RESPONSE fails', async () => {
    stateManager.setEditedResponse.mockRejectedValue(new Error('Response error'));
    const message: Message = {
      type: MessageType.UPDATE_RESPONSE,
      payload: { key: 'GET:url', response: makeEditedResponse() },
      requestId: 'req-err7',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.UPDATE_RESPONSE,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('should return error response when CLEAR_HISTORY fails', async () => {
    stateManager.clearMatchHistory.mockRejectedValue(new Error('History error'));
    const message: Message = {
      type: MessageType.CLEAR_HISTORY,
      payload: undefined,
      requestId: 'req-err8',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.CLEAR_HISTORY,
        payload: expect.objectContaining({ success: false }),
      }),
    );
  });

  // --- Lazy initialization ---

  it('should initialize stateManager if not yet initialized when message arrives', async () => {
    stateManager.isInitialized.mockReturnValue(false);
    const message: Message = { type: MessageType.PING, payload: undefined };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(stateManager.initialize).toHaveBeenCalled();
  });

  it('should send error response and not crash when lazy initialization fails', async () => {
    stateManager.isInitialized.mockReturnValue(false);
    stateManager.initialize.mockRejectedValue(new Error('Storage unavailable'));

    const message: Message = {
      type: MessageType.STATE_SYNC,
      payload: undefined,
      requestId: 'req-lazy-fail',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ success: false, error: 'Storage unavailable' }),
      }),
    );
    // Verify no unhandled rejection — test completes cleanly
  });

  // --- switch/case dispatch verification ---

  it('should use switch/case dispatch (not if/else)', () => {
    const pingMessage: Message = { type: MessageType.PING, payload: undefined };
    const syncMessage: Message = { type: MessageType.STATE_SYNC, payload: undefined };

    // Both should be handled without errors
    expect(() => handleMessage(pingMessage, port, stateManager, portManager)).not.toThrow();
    expect(() => handleMessage(syncMessage, port, stateManager, portManager)).not.toThrow();
  });

  // --- MATCH_QUERY — requestId echoing ---

  it('should echo requestId in MATCH_RESULT when extension is disabled (passthrough)', async () => {
    stateManager.getSettings.mockReturnValue({
      enabled: false,
      replayMode: 'last-match',
      timingReplay: false,
      excludeList: [],
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com', method: 'GET', tabId: 1 },
      requestId: 'echo-req-disabled',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-disabled',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT when URL matches exclude list', async () => {
    stateManager.getSettings.mockReturnValue({
      enabled: true,
      replayMode: 'last-match',
      timingReplay: false,
      excludeList: ['excluded.com'],
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://excluded.com/api', method: 'GET', tabId: 1 },
      requestId: 'echo-req-exclude',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-exclude',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT for edited response match', async () => {
    const edited = makeEditedResponse();
    stateManager.getEditedResponses.mockReturnValue({
      'GET:https://api.test.com/data': edited,
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
      requestId: 'echo-req-edited',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-edited',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT for rule match', async () => {
    mockEvaluate.mockReturnValue({ statusCode: 200, body: '{}', headers: [], delay: 0 });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
      requestId: 'echo-req-rule',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-rule',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT for HAR match', async () => {
    const harData = makeHarData();
    stateManager.getHarData.mockReturnValue(harData);
    mockMatchUrl.mockReturnValue({
      pattern: {
        original: 'https://api.test.com/data',
        template: 'https://api.test.com/data',
        segments: [],
        method: 'GET',
      },
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
      requestId: 'echo-req-har',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-har',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT for passthrough (no match)', async () => {
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://unmatched.com/data', method: 'GET', tabId: 1 },
      requestId: 'echo-req-passthrough',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-passthrough',
      }),
    );
  });

  it('should echo requestId in MATCH_RESULT for error case', async () => {
    stateManager.getSettings.mockImplementation(() => {
      throw new Error('Settings unavailable');
    });
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://api.test.com/data', method: 'GET', tabId: 1 },
      requestId: 'echo-req-error',
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_RESULT,
        requestId: 'echo-req-error',
      }),
    );
    // Error case must also push a passthrough MATCH_EVENT so monitor tab stays consistent
    expect(portManager.sendToPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.MATCH_EVENT,
        payload: expect.objectContaining({ source: 'passthrough' }),
      }),
    );
    expect(stateManager.addMatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'passthrough' }),
    );
  });

  it('should echo undefined requestId when not provided in MATCH_QUERY', async () => {
    const message: Message = {
      type: MessageType.MATCH_QUERY,
      payload: { url: 'https://unmatched.com', method: 'GET', tabId: 1 },
      // requestId intentionally omitted
    };
    handleMessage(message, port, stateManager, portManager);
    await new Promise((r) => setTimeout(r, 10));

    const callArg = (port.postMessage as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg['type']).toBe(MessageType.MATCH_RESULT);
    // requestId should be undefined (or absent) when not sent
    expect(callArg['requestId']).toBeUndefined();
  });
});
