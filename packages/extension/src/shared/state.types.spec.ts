/**
 * state.types.spec.ts — Type import doğrulama testi
 * Bu dosya, state.types.ts'nin doğru export edildiğini ve tip uyumluluğunu doğrular.
 */
import type {
  HarSessionData,
  ExtensionSettings,
  EditedResponse,
  MatchEvent,
  ExtensionState,
  SequentialCounterMap,
} from './state.types';

describe('state.types — type compatibility', () => {
  it('HarSessionData should be assignable with correct shape', () => {
    const data: HarSessionData = {
      entries: [],
      patterns: [],
      fileName: 'test.har',
      loadedAt: Date.now(),
    };
    expect(data.fileName).toBe('test.har');
  });

  it('ExtensionSettings should be assignable with correct shape', () => {
    const settings: ExtensionSettings = {
      enabled: true,
      replayMode: 'sequential',
      timingReplay: false,
      excludeList: [],
      resourceTypeFilter: ['xhr', 'fetch'],
      domainFilter: [],
    };
    expect(settings.replayMode).toBe('sequential');
  });

  it('ExtensionSettings replayMode accepts last-match variant', () => {
    const settings: ExtensionSettings = {
      enabled: false,
      replayMode: 'last-match',
      timingReplay: true,
      excludeList: ['example.com'],
      resourceTypeFilter: ['xhr', 'fetch'],
      domainFilter: [],
    };
    expect(settings.replayMode).toBe('last-match');
  });

  it('EditedResponse should be assignable with correct shape', () => {
    const response: EditedResponse = {
      url: 'https://api.test.com',
      method: 'POST',
      body: '{"data":true}',
      headers: [],
      statusCode: 201,
    };
    expect(response.statusCode).toBe(201);
  });

  it('MatchEvent should be assignable with correct shape', () => {
    const event: MatchEvent = {
      id: 'evt-1',
      url: 'https://api.test.com',
      method: 'GET',
      source: 'har',
      timestamp: Date.now(),
      statusCode: 200,
    };
    expect(event.source).toBe('har');
  });

  it('MatchEvent source accepts all variants', () => {
    const sources: MatchEvent['source'][] = ['rule', 'har', 'passthrough'];
    expect(sources).toHaveLength(3);
  });

  it('ExtensionState should be assignable with correct shape', () => {
    const state: ExtensionState = {
      harData: null,
      activeRules: [],
      settings: {
        enabled: true,
        replayMode: 'last-match',
        timingReplay: false,
        excludeList: [],
        resourceTypeFilter: ['xhr', 'fetch'],
        domainFilter: [],
      },
      editedResponses: {},
      matchHistory: [],
      accordionStates: {},
    };
    expect(state.harData).toBeNull();
  });

  it('SequentialCounterMap should be assignable as Record<string, number>', () => {
    const counters: SequentialCounterMap = {
      '/api/:id': 2,
      '/api/users': 0,
    };
    expect(counters['/api/:id']).toBe(2);
  });
});
