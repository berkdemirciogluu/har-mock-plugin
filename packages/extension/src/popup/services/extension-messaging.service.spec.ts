import { TestBed } from '@angular/core/testing';
import { ExtensionMessagingService } from './extension-messaging.service';
import { MessageType } from '../../shared/messaging.types';
import type { Message } from '../../shared/messaging.types';
import type { MatchEventPayload } from '../../shared/payload.types';

describe('ExtensionMessagingService', () => {
  let messageListener: ((msg: Message) => void) | undefined;
  let disconnectListener: (() => void) | undefined;

  const mockPort = {
    postMessage: jest.fn(),
    disconnect: jest.fn(),
    onMessage: {
      addListener: jest.fn((cb: (msg: Message) => void) => {
        messageListener = cb;
      }),
      removeListener: jest.fn(),
    },
    onDisconnect: {
      addListener: jest.fn((cb: () => void) => {
        disconnectListener = cb;
      }),
    },
  };

  const mockChrome = {
    runtime: {
      connect: jest.fn().mockReturnValue(mockPort),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    messageListener = undefined;
    disconnectListener = undefined;
    mockPort.onMessage.addListener.mockImplementation((cb: (msg: Message) => void) => {
      messageListener = cb;
    });
    mockPort.onDisconnect.addListener.mockImplementation((cb: () => void) => {
      disconnectListener = cb;
    });

    (globalThis as Record<string, unknown>).chrome = mockChrome;

    TestBed.configureTestingModule({});
  });

  function getService(): ExtensionMessagingService {
    return TestBed.inject(ExtensionMessagingService);
  }

  it('should create service', () => {
    expect(getService()).toBeTruthy();
  });

  describe('connect()', () => {
    it('should connect to chrome runtime port', () => {
      const svc = getService();
      svc.connect();
      expect(mockChrome.runtime.connect).toHaveBeenCalledWith({ name: 'har-mock-popup' });
    });

    it('should not reconnect if already connected', () => {
      const svc = getService();
      svc.connect();
      svc.connect();
      expect(mockChrome.runtime.connect).toHaveBeenCalledTimes(1);
    });

    it('should update _state on STATE_SYNC message', () => {
      const svc = getService();
      svc.connect();
      const fakePayload = {
        harData: null,
        activeRules: [],
        settings: {},
        editedResponses: {},
        matchHistory: [],
        accordionStates: {},
      };
      messageListener?.({ type: MessageType.STATE_SYNC, payload: fakePayload } as Message);
      expect(svc.state()).toEqual(fakePayload);
    });

    it('should set port to null on disconnect', () => {
      const svc = getService();
      svc.connect();
      expect(svc.state()).toBeNull();
      disconnectListener?.();
      // After disconnect, state resets to null
      expect(svc.state()).toBeNull();
    });

    it('should prepend MATCH_EVENT to matchHistory', () => {
      const svc = getService();
      svc.connect();

      const fakeState = {
        harData: null,
        activeRules: [],
        settings: {} as never,
        editedResponses: {},
        matchHistory: [],
        accordionStates: {},
      };
      messageListener?.({ type: MessageType.STATE_SYNC, payload: fakeState } as Message);

      const event: MatchEventPayload = {
        id: 'evt-1',
        url: 'https://api.example.com/users',
        method: 'GET',
        source: 'har',
        statusCode: 200,
        timestamp: 1000000,
      };

      messageListener?.({ type: MessageType.MATCH_EVENT, payload: event } as Message);

      expect(svc.state()?.matchHistory[0]).toEqual(event);
    });

    it('should keep newest event at index 0 when multiple MATCH_EVENTs arrive', () => {
      const svc = getService();
      svc.connect();

      const fakeState = {
        harData: null,
        activeRules: [],
        settings: {} as never,
        editedResponses: {},
        matchHistory: [],
        accordionStates: {},
      };
      messageListener?.({ type: MessageType.STATE_SYNC, payload: fakeState } as Message);

      const event1: MatchEventPayload = {
        id: 'evt-1',
        url: 'https://api.example.com/first',
        method: 'GET',
        source: 'har',
        statusCode: 200,
        timestamp: 1000,
      };
      const event2: MatchEventPayload = {
        id: 'evt-2',
        url: 'https://api.example.com/second',
        method: 'POST',
        source: 'rule',
        statusCode: 201,
        timestamp: 2000,
      };

      messageListener?.({ type: MessageType.MATCH_EVENT, payload: event1 } as Message);
      messageListener?.({ type: MessageType.MATCH_EVENT, payload: event2 } as Message);

      expect(svc.state()?.matchHistory[0]).toEqual(event2);
      expect(svc.state()?.matchHistory[1]).toEqual(event1);
      expect(svc.state()?.matchHistory.length).toBe(2);
    });

    it('should not update state when MATCH_EVENT arrives before STATE_SYNC', () => {
      const svc = getService();
      svc.connect();

      const event: MatchEventPayload = {
        id: 'evt-early',
        url: 'https://api.example.com/early',
        method: 'GET',
        source: 'passthrough',
        timestamp: 500,
      };

      messageListener?.({ type: MessageType.MATCH_EVENT, payload: event } as Message);

      // state must remain null since STATE_SYNC not yet received
      expect(svc.state()).toBeNull();
    });

    it('should trim matchHistory to MAX_MATCH_HISTORY (500) entries', () => {
      const svc = getService();
      svc.connect();

      const existingHistory = Array.from({ length: 500 }, (_, i) => ({
        id: `old-${i}`,
        url: `https://api.example.com/${i}`,
        method: 'GET',
        source: 'har' as const,
        timestamp: i,
      }));

      const fakeState = {
        harData: null,
        activeRules: [],
        settings: {} as never,
        editedResponses: {},
        matchHistory: existingHistory,
        accordionStates: {},
      };
      messageListener?.({ type: MessageType.STATE_SYNC, payload: fakeState } as Message);

      const newEvent: MatchEventPayload = {
        id: 'evt-overflow',
        url: 'https://api.example.com/overflow',
        method: 'DELETE',
        source: 'rule',
        timestamp: 999999,
      };

      messageListener?.({ type: MessageType.MATCH_EVENT, payload: newEvent } as Message);

      expect(svc.state()?.matchHistory.length).toBe(500);
      expect(svc.state()?.matchHistory[0]).toEqual(newEvent);
    });
  });

  describe('disconnect()', () => {
    it('should disconnect port when connected', () => {
      const svc = getService();
      svc.connect();
      svc.disconnect();
      expect(mockPort.disconnect).toHaveBeenCalled();
    });

    it('should be safe to call without connecting first', () => {
      const svc = getService();
      expect(() => svc.disconnect()).not.toThrow();
    });
  });

  describe('sendMessage()', () => {
    it('should postMessage and resolve with response', async () => {
      const svc = getService();
      svc.connect();

      const promise = svc.sendMessage(MessageType.LOAD_HAR, { test: true }, 'req-1');

      // Simulate background response
      const handlers: Array<(msg: Message) => void> = [];
      mockPort.onMessage.addListener.mock.calls.forEach(([cb]: [(msg: Message) => void]) => {
        handlers.push(cb);
      });

      // Find the sendMessage listener (added after connect's STATE_SYNC listener)
      const sendHandler = handlers[handlers.length - 1];
      sendHandler?.({
        type: MessageType.LOAD_HAR,
        payload: { success: true, data: { patternCount: 5 } },
        requestId: 'req-1',
      } as Message);

      const result = await promise;
      expect(result).toEqual({ success: true, data: { patternCount: 5 } });
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: MessageType.LOAD_HAR, requestId: 'req-1' }),
      );
    });

    it('should reject if port is not connected', async () => {
      const svc = getService();
      await expect(svc.sendMessage(MessageType.LOAD_HAR, {}, 'req-2')).rejects.toThrow(
        'Port bağlantısı yok',
      );
    });

    it('should timeout and reject after 5000ms', async () => {
      jest.useFakeTimers();
      const svc = getService();
      svc.connect();

      const promise = svc.sendMessage(MessageType.LOAD_HAR, {}, 'req-timeout');
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('zaman aşımına');
      jest.useRealTimers();
    });

    it('should reject pending sendMessage on port disconnect', async () => {
      const svc = getService();
      svc.connect();

      const promise = svc.sendMessage(MessageType.LOAD_HAR, {}, 'req-disconnect');
      disconnectListener?.();

      await expect(promise).rejects.toThrow('Port bağlantısı koptu.');
    });

    it('should not resolve for mismatched requestId', async () => {
      jest.useFakeTimers();
      const svc = getService();
      svc.connect();

      const promise = svc.sendMessage(MessageType.LOAD_HAR, { test: true }, 'req-abc');

      const handlers: Array<(msg: Message) => void> = [];
      mockPort.onMessage.addListener.mock.calls.forEach(([cb]: [(msg: Message) => void]) => {
        handlers.push(cb);
      });

      const sendHandler = handlers[handlers.length - 1];
      sendHandler?.({
        type: MessageType.LOAD_HAR,
        payload: { success: true },
        requestId: 'req-different',
      } as Message);

      // Should not have resolved — advance to timeout
      jest.advanceTimersByTime(5001);
      await expect(promise).rejects.toThrow('zaman aşımına');
      jest.useRealTimers();
    });
  });

  describe('ngOnDestroy()', () => {
    it('should disconnect on destroy', () => {
      const svc = getService();
      svc.connect();
      svc.ngOnDestroy();
      expect(mockPort.disconnect).toHaveBeenCalled();
    });
  });
});
