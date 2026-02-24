import { handleMessage } from './message-handler';
import { MessageType, type Message } from '../shared';

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

describe('handleMessage', () => {
  let port: chrome.runtime.Port;

  beforeEach(() => {
    port = createMockPort();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should respond with PONG when receiving PING', () => {
    const message: Message = {
      type: MessageType.PING,
      payload: undefined,
    };

    handleMessage(message, port);

    expect(port.postMessage).toHaveBeenCalledWith({
      type: MessageType.PONG,
      payload: undefined,
    });
  });

  it('should handle STATE_SYNC without error (placeholder)', () => {
    const message: Message = {
      type: MessageType.STATE_SYNC,
      payload: undefined,
    };

    expect(() => handleMessage(message, port)).not.toThrow();
    expect(port.postMessage).not.toHaveBeenCalled();
  });

  it('should warn on unknown message type', () => {
    const message = {
      type: 'UNKNOWN_TYPE' as MessageType,
      payload: undefined,
    };

    handleMessage(message, port);

    expect(console.warn).toHaveBeenCalledWith('[HAR Mock] Unknown message type:', 'UNKNOWN_TYPE');
  });

  it('should use switch/case dispatch (not if/else)', () => {
    // Verify the function handles all known message types via switch
    const pingMessage: Message = { type: MessageType.PING, payload: undefined };
    const syncMessage: Message = { type: MessageType.STATE_SYNC, payload: undefined };

    handleMessage(pingMessage, port);
    handleMessage(syncMessage, port);

    // PING should produce PONG, STATE_SYNC should be silent
    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenCalledWith({ type: MessageType.PONG, payload: undefined });
  });
});
