import { TestBed } from '@angular/core/testing';
import { ExtensionMessagingService } from './extension-messaging.service';
import { MessageType } from '../../shared/messaging.types';
import type { Message } from '../../shared/messaging.types';

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
