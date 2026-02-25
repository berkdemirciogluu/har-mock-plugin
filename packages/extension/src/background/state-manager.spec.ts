import { StateManager } from './state-manager';
import { STORAGE_KEYS, MAX_MATCH_HISTORY } from '../shared/constants';
import type {
  HarSessionData,
  ExtensionSettings,
  EditedResponse,
  MatchEvent,
} from '../shared/state.types';
import type { MockRule } from '@har-mock/core';

// chrome.storage.local mock
const mockStorage: Record<string, unknown> = {};

const mockChrome = {
  storage: {
    local: {
      get: jest.fn((keys: string | string[]) => {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, unknown> = {};
        for (const key of keyArr) {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: jest.fn((keys: string | string[]) => {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        for (const key of keyArr) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      }),
    },
  },
};

(globalThis as Record<string, unknown>).chrome = mockChrome;

const makeHarData = (): HarSessionData => ({
  entries: [],
  patterns: [],
  fileName: 'test.har',
  loadedAt: Date.now(),
});

const makeRule = (id = 'rule-1'): MockRule => ({
  id,
  urlPattern: '/api/*',
  method: 'GET',
  statusCode: 200,
  responseBody: '{}',
  responseHeaders: [],
  delay: 0,
  enabled: true,
});

const makeSettings = (): ExtensionSettings => ({
  enabled: false,
  replayMode: 'sequential',
  timingReplay: true,
  excludeList: ['excluded.com'],
});

const makeEditedResponse = (): EditedResponse => ({
  url: 'https://api.test.com/data',
  method: 'GET',
  body: '{"edited":true}',
  headers: [],
  statusCode: 200,
});

const makeMatchEvent = (source: 'rule' | 'har' | 'passthrough' = 'har'): MatchEvent => ({
  id: 'event-1',
  url: 'https://api.test.com',
  method: 'GET',
  source,
  timestamp: Date.now(),
  statusCode: 200,
});

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    // Clear mock storage
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    jest.clearAllMocks();
    manager = new StateManager();
  });

  // --- initialize ---

  describe('initialize()', () => {
    it('should start with default state when storage is empty', async () => {
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
      expect(manager.getHarData()).toBeNull();
      expect(manager.getActiveRules()).toEqual([]);
      expect(manager.getSettings().enabled).toBe(true);
      expect(manager.getMatchHistory()).toEqual([]);
      expect(manager.getEditedResponses()).toEqual({});
      expect(manager.getAccordionStates()).toEqual({});
    });

    it('should load existing data from storage', async () => {
      const harData = makeHarData();
      const rule = makeRule();
      const event = makeMatchEvent();
      const edited = makeEditedResponse();
      mockStorage[STORAGE_KEYS.HAR_DATA] = harData;
      mockStorage[STORAGE_KEYS.ACTIVE_RULES] = [rule];
      mockStorage[STORAGE_KEYS.SETTINGS] = makeSettings();
      mockStorage[STORAGE_KEYS.MATCH_HISTORY] = [event];
      mockStorage[STORAGE_KEYS.EDITED_RESPONSES] = { 'GET:url': edited };
      mockStorage[STORAGE_KEYS.ACCORDION_STATES] = { 'panel-1': true };

      await manager.initialize();

      expect(manager.getHarData()).toEqual(harData);
      expect(manager.getActiveRules()).toHaveLength(1);
      expect(manager.getSettings().enabled).toBe(false);
      expect(manager.getMatchHistory()).toHaveLength(1);
      expect(manager.getEditedResponses()['GET:url']).toEqual(edited);
      expect(manager.getAccordionStates()['panel-1']).toBe(true);
    });

    it('should handle partial storage data (missing keys use defaults)', async () => {
      mockStorage[STORAGE_KEYS.HAR_DATA] = makeHarData();

      await manager.initialize();

      expect(manager.getHarData()).not.toBeNull();
      expect(manager.getActiveRules()).toEqual([]);
      expect(manager.getSettings().enabled).toBe(true);
    });

    it('should set isInitialized to true after initialization', async () => {
      expect(manager.isInitialized()).toBe(false);
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });
  });

  // --- HAR Data ---

  describe('HAR Data', () => {
    it('should return null before any HAR data is set', async () => {
      await manager.initialize();
      expect(manager.getHarData()).toBeNull();
    });

    it('should set HAR data in memory and storage', async () => {
      await manager.initialize();
      const harData = makeHarData();
      await manager.setHarData(harData);

      expect(manager.getHarData()).toEqual(harData);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ [STORAGE_KEYS.HAR_DATA]: harData }),
      );
    });

    it('should clear HAR data from memory and storage', async () => {
      await manager.initialize();
      await manager.setHarData(makeHarData());
      await manager.clearHarData();

      expect(manager.getHarData()).toBeNull();
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.HAR_DATA);
    });
  });

  // --- Rules CRUD ---

  describe('Rules CRUD', () => {
    it('should add a rule', async () => {
      await manager.initialize();
      await manager.addRule(makeRule());

      expect(manager.getActiveRules()).toHaveLength(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('should update an existing rule', async () => {
      await manager.initialize();
      await manager.addRule(makeRule('r1'));
      const updated: MockRule = { ...makeRule('r1'), urlPattern: '/api/updated/*' };

      await manager.updateRule(updated);

      const rules = manager.getActiveRules();
      expect(rules[0]?.urlPattern).toBe('/api/updated/*');
    });

    it('should delete a rule by id', async () => {
      await manager.initialize();
      await manager.addRule(makeRule('r-to-delete'));
      await manager.addRule(makeRule('r-to-keep'));

      await manager.deleteRule('r-to-delete');

      const rules = manager.getActiveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]?.id).toBe('r-to-keep');
    });

    it('getActiveRules should return empty array by default', async () => {
      await manager.initialize();
      expect(manager.getActiveRules()).toEqual([]);
    });
  });

  // --- Settings ---

  describe('Settings', () => {
    it('should return default settings initially', async () => {
      await manager.initialize();
      const settings = manager.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.replayMode).toBe('last-match');
      expect(settings.timingReplay).toBe(false);
      expect(settings.excludeList).toEqual([]);
    });

    it('should partially update settings', async () => {
      await manager.initialize();
      await manager.updateSettings({ enabled: false });

      const settings = manager.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.replayMode).toBe('last-match'); // unchanged
    });

    it('should fully update settings', async () => {
      await manager.initialize();
      const newSettings = makeSettings();
      await manager.updateSettings(newSettings);

      const settings = manager.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.replayMode).toBe('sequential');
      expect(settings.timingReplay).toBe(true);
    });

    it('should persist settings to storage', async () => {
      await manager.initialize();
      await manager.updateSettings({ enabled: false });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [STORAGE_KEYS.SETTINGS]: expect.objectContaining({ enabled: false }),
        }),
      );
    });
  });

  // --- Edited Responses ---

  describe('Edited Responses', () => {
    it('should set and get an edited response', async () => {
      await manager.initialize();
      const response = makeEditedResponse();
      await manager.setEditedResponse('GET:https://api.test.com/data', response);

      const responses = manager.getEditedResponses();
      expect(responses['GET:https://api.test.com/data']).toEqual(response);
    });

    it('should delete an edited response', async () => {
      await manager.initialize();
      await manager.setEditedResponse('GET:url', makeEditedResponse());
      await manager.deleteEditedResponse('GET:url');

      expect(manager.getEditedResponses()['GET:url']).toBeUndefined();
    });

    it('should persist edited responses to storage', async () => {
      await manager.initialize();
      await manager.setEditedResponse('GET:url', makeEditedResponse());

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ [STORAGE_KEYS.EDITED_RESPONSES]: expect.any(Object) }),
      );
    });
  });

  // --- Match History ---

  describe('Match History', () => {
    it('should add a match event', async () => {
      await manager.initialize();
      await manager.addMatchEvent(makeMatchEvent());

      expect(manager.getMatchHistory()).toHaveLength(1);
    });

    it('should clear match history', async () => {
      await manager.initialize();
      await manager.addMatchEvent(makeMatchEvent());
      await manager.clearMatchHistory();

      expect(manager.getMatchHistory()).toEqual([]);
    });

    it(`should trim history to MAX_MATCH_HISTORY (${MAX_MATCH_HISTORY}) events`, async () => {
      await manager.initialize();

      for (let i = 0; i <= MAX_MATCH_HISTORY; i++) {
        await manager.addMatchEvent({ ...makeMatchEvent(), id: `event-${i}` });
      }

      expect(manager.getMatchHistory().length).toBe(MAX_MATCH_HISTORY);
    });

    it('should keep the newest events when trimming', async () => {
      await manager.initialize();

      for (let i = 0; i <= MAX_MATCH_HISTORY; i++) {
        await manager.addMatchEvent({ ...makeMatchEvent(), id: `event-${i}` });
      }

      const history = manager.getMatchHistory();
      // oldest event (event-0) should be gone, newest (event-MAX) should remain
      expect(history[0]?.id).toBe('event-1');
      expect(history[history.length - 1]?.id).toBe(`event-${MAX_MATCH_HISTORY}`);
    });
  });

  // --- Accordion States ---

  describe('Accordion States', () => {
    it('should update accordion state', async () => {
      await manager.initialize();
      await manager.updateAccordionState('panel-1', true);

      expect(manager.getAccordionStates()['panel-1']).toBe(true);
    });

    it('should persist accordion state to storage', async () => {
      await manager.initialize();
      await manager.updateAccordionState('panel-1', false);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [STORAGE_KEYS.ACCORDION_STATES]: expect.objectContaining({ 'panel-1': false }),
        }),
      );
    });
  });

  // --- Sequential Counters ---

  describe('Sequential Counters', () => {
    it('should return 0 for unknown pattern', async () => {
      await manager.initialize();
      expect(manager.getSequentialIndex('/api/:id')).toBe(0);
    });

    it('should increment sequential index', async () => {
      await manager.initialize();
      manager.incrementSequentialIndex('/api/:id');
      manager.incrementSequentialIndex('/api/:id');

      expect(manager.getSequentialIndex('/api/:id')).toBe(2);
    });

    it('should reset all counters', async () => {
      await manager.initialize();
      manager.incrementSequentialIndex('/api/:id');
      manager.incrementSequentialIndex('/api/:name');
      manager.resetSequentialCounters();

      expect(manager.getSequentialIndex('/api/:id')).toBe(0);
      expect(manager.getSequentialIndex('/api/:name')).toBe(0);
    });
  });

  // --- State Recovery (cross-instance) ---

  describe('State Recovery', () => {
    it('should recover state from storage on re-initialization', async () => {
      // First instance writes data
      const firstManager = new StateManager();
      await firstManager.initialize();
      await firstManager.setHarData(makeHarData());
      await firstManager.addRule(makeRule());

      // Second instance reads from storage
      const secondManager = new StateManager();
      await secondManager.initialize();

      expect(secondManager.getHarData()).not.toBeNull();
      expect(secondManager.getActiveRules()).toHaveLength(1);
    });
  });

  // --- Storage Error Handling ---

  describe('Storage Error Handling', () => {
    it('should reject and remain uninitialized when chrome.storage.local.get fails', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage unavailable'));

      await expect(manager.initialize()).rejects.toThrow('Storage unavailable');
      expect(manager.isInitialized()).toBe(false);
    });

    it('should allow re-initialization after a failed initialize()', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage unavailable'));
      await expect(manager.initialize()).rejects.toThrow();
      expect(manager.isInitialized()).toBe(false);

      // Second attempt succeeds
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });

    it('should throw when chrome.storage.local.set fails during setHarData()', async () => {
      await manager.initialize();
      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Quota exceeded'));

      await expect(manager.setHarData(makeHarData())).rejects.toThrow('Quota exceeded');
    });

    it('should throw when chrome.storage.local.set fails during addRule()', async () => {
      await manager.initialize();
      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Quota exceeded'));

      await expect(manager.addRule(makeRule())).rejects.toThrow('Quota exceeded');
    });

    it('should throw when chrome.storage.local.remove fails during clearHarData()', async () => {
      await manager.initialize();
      mockChrome.storage.local.remove.mockRejectedValueOnce(new Error('Remove failed'));

      await expect(manager.clearHarData()).rejects.toThrow('Remove failed');
    });
  });

  // --- getFullState ---

  describe('getFullState()', () => {
    it('should return complete state sync payload', async () => {
      await manager.initialize();
      const harData = makeHarData();
      await manager.setHarData(harData);

      const state = manager.getFullState();

      expect(state.harData).toEqual(harData);
      expect(state.activeRules).toEqual([]);
      expect(state.settings).toBeDefined();
      expect(state.editedResponses).toBeDefined();
      expect(state.matchHistory).toBeDefined();
      expect(state.accordionStates).toBeDefined();
    });
  });
});
