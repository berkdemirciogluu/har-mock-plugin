/**
 * Content Script Bridge Tests
 * window.postMessage (MAIN world) ↔ chrome.runtime port (ISOLATED world) bridge
 */
import { HAR_MOCK_CHANNEL } from './window-messaging.types';
import type { WindowMatchQuery, WindowMatchResult } from './window-messaging.types';
import { MessageType } from '../shared';
import type { Message } from '../shared';
import type { MatchResultPayload } from '../shared';

// chrome.runtime.connect mock'u — modül yüklenmeden ÖNCE kurulmalı
const mockPortPostMessage = jest.fn();
let mockPortOnMessageListener: ((message: Message) => void) | null = null;

const mockPort = {
  name: 'har-mock-content-test',
  postMessage: mockPortPostMessage,
  disconnect: jest.fn(),
  onMessage: {
    addListener: jest.fn((listener: (message: Message) => void) => {
      mockPortOnMessageListener = listener;
    }),
    removeListener: jest.fn(),
    hasListeners: jest.fn(() => false),
    hasListener: jest.fn(() => false),
    addRules: jest.fn(),
    getRules: jest.fn(),
    removeRules: jest.fn(),
  },
  onDisconnect: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListeners: jest.fn(() => false),
    hasListener: jest.fn(() => false),
    addRules: jest.fn(),
    getRules: jest.fn(),
    removeRules: jest.fn(),
  },
} as unknown as chrome.runtime.Port;

// chrome global mock — require('./content') öncesinde hazır olmalı
global.chrome = {
  runtime: {
    connect: jest.fn().mockReturnValue(mockPort),
  },
} as unknown as typeof chrome;

// content.ts'i bir kez yükle — module seviyesindeki listener'lar bir kez kaydedilir
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./content');

/** Helper — MAIN world'den window.postMessage simüle eder */
function dispatchWindowMatchQuery(query: WindowMatchQuery): void {
  const event = new MessageEvent('message', {
    data: query,
    source: window,
    origin: window.location.origin,
  });
  window.dispatchEvent(event);
}

/** Helper — port'tan MATCH_RESULT mesajı simüle eder */
function dispatchPortMatchResult(message: Message<MatchResultPayload>): void {
  if (mockPortOnMessageListener) {
    mockPortOnMessageListener(message as unknown as Message);
  }
}

describe('Content Script Bridge', () => {
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    postMessageSpy = jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  describe('MAIN world MATCH_QUERY → port bridge', () => {
    it('should forward window MATCH_QUERY to port as MATCH_QUERY message', () => {
      const query: WindowMatchQuery = {
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_QUERY',
        requestId: 'req-abc-123',
        url: 'https://api.com/users',
        method: 'GET',
      };

      dispatchWindowMatchQuery(query);

      expect(mockPortPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.MATCH_QUERY,
          requestId: 'req-abc-123',
          payload: expect.objectContaining({
            url: 'https://api.com/users',
            method: 'GET',
          }),
        }),
      );
    });

    it('should preserve requestId when forwarding MATCH_QUERY to port', () => {
      const query: WindowMatchQuery = {
        channel: HAR_MOCK_CHANNEL,
        type: 'MATCH_QUERY',
        requestId: 'unique-id-xyz',
        url: 'https://api.com/data',
        method: 'POST',
      };

      dispatchWindowMatchQuery(query);

      const call = mockPortPostMessage.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call['requestId']).toBe('unique-id-xyz');
    });

    it('should ignore window messages with wrong channel', () => {
      const wrongChannelEvent = new MessageEvent('message', {
        data: {
          channel: 'WRONG_CHANNEL',
          type: 'MATCH_QUERY',
          requestId: 'id',
          url: 'x',
          method: 'GET',
        },
        source: window,
      });
      window.dispatchEvent(wrongChannelEvent);

      expect(mockPortPostMessage).not.toHaveBeenCalled();
    });

    it('should ignore window messages from different source (not window)', () => {
      const foreignEvent = new MessageEvent('message', {
        data: {
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_QUERY',
          requestId: 'id',
          url: 'https://api.com',
          method: 'GET',
        },
        source: null,
      });
      window.dispatchEvent(foreignEvent);

      expect(mockPortPostMessage).not.toHaveBeenCalled();
    });

    it('should ignore MATCH_RESULT type messages from window (only handle MATCH_QUERY)', () => {
      const resultEvent = new MessageEvent('message', {
        data: {
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_RESULT',
          requestId: 'id',
          matched: true,
        },
        source: window,
      });
      window.dispatchEvent(resultEvent);

      expect(mockPortPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('port MATCH_RESULT → window bridge', () => {
    it('should forward port MATCH_RESULT to window as WindowMatchResult', () => {
      const portMessage: Message<MatchResultPayload> = {
        type: MessageType.MATCH_RESULT,
        requestId: 'req-def-456',
        payload: {
          matched: true,
          response: {
            statusCode: 200,
            body: '{"data":"value"}',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            delay: 0,
          },
          source: 'har',
        } as MatchResultPayload,
      };

      dispatchPortMatchResult(portMessage);

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: HAR_MOCK_CHANNEL,
          type: 'MATCH_RESULT',
          requestId: 'req-def-456',
          matched: true,
        }),
        '*',
      );
    });

    it('should preserve requestId when forwarding MATCH_RESULT to window', () => {
      dispatchPortMatchResult({
        type: MessageType.MATCH_RESULT,
        requestId: 'preserve-id-789',
        payload: { matched: false } as MatchResultPayload,
      });

      const postedMsg = postMessageSpy.mock.calls[0]?.[0] as WindowMatchResult;
      expect(postedMsg.requestId).toBe('preserve-id-789');
    });

    it('should forward response fields from port MATCH_RESULT to window', () => {
      dispatchPortMatchResult({
        type: MessageType.MATCH_RESULT,
        requestId: 'resp-id',
        payload: {
          matched: true,
          response: {
            statusCode: 201,
            body: 'created',
            headers: [{ name: 'X-Test', value: 'yes' }],
            delay: 100,
          },
          source: 'rule',
        } as MatchResultPayload,
      });

      const postedMsg = postMessageSpy.mock.calls[0]?.[0] as WindowMatchResult;
      expect(postedMsg.response?.statusCode).toBe(201);
      expect(postedMsg.response?.body).toBe('created');
      expect(postedMsg.response?.delay).toBe(100);
      expect(postedMsg.source).toBe('rule');
    });

    it('should handle matched: false without response', () => {
      dispatchPortMatchResult({
        type: MessageType.MATCH_RESULT,
        requestId: 'no-match',
        payload: { matched: false } as MatchResultPayload,
      });

      const postedMsg = postMessageSpy.mock.calls[0]?.[0] as WindowMatchResult;
      expect(postedMsg.matched).toBe(false);
      expect(postedMsg.response).toBeUndefined();
    });
  });
});
