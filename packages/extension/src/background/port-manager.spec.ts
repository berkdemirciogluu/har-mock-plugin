import { PortManager } from './port-manager';
import { PORT_NAME_CONTENT_PREFIX, PORT_NAME_POPUP } from '../shared';

function createMockPort(name: string): chrome.runtime.Port {
  return {
    name,
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

describe('PortManager', () => {
  let portManager: PortManager;

  beforeEach(() => {
    portManager = new PortManager();
  });

  describe('registerPort', () => {
    it('should register a popup port', () => {
      const port = createMockPort(PORT_NAME_POPUP);
      portManager.registerPort(port);
      expect(portManager.getPopupPort()).toBe(port);
    });

    it('should register a content script port by tab ID', () => {
      const port = createMockPort(`${PORT_NAME_CONTENT_PREFIX}42`);
      portManager.registerPort(port);
      expect(portManager.getContentPort(42)).toBe(port);
    });

    it('should ignore ports with unrecognized names', () => {
      const port = createMockPort('unknown-port');
      portManager.registerPort(port);
      expect(portManager.getPopupPort()).toBeUndefined();
    });

    it('should ignore content ports with non-numeric tab ID', () => {
      const port = createMockPort(`${PORT_NAME_CONTENT_PREFIX}abc`);
      portManager.registerPort(port);
      expect(portManager.getContentPort(NaN)).toBeUndefined();
    });
  });

  describe('unregisterPort', () => {
    it('should unregister a popup port', () => {
      const port = createMockPort(PORT_NAME_POPUP);
      portManager.registerPort(port);
      portManager.unregisterPort(port);
      expect(portManager.getPopupPort()).toBeUndefined();
    });

    it('should unregister a content script port', () => {
      const port = createMockPort(`${PORT_NAME_CONTENT_PREFIX}42`);
      portManager.registerPort(port);
      portManager.unregisterPort(port);
      expect(portManager.getContentPort(42)).toBeUndefined();
    });

    it('should handle unregistering unknown port gracefully', () => {
      const port = createMockPort('unknown-port');
      expect(() => portManager.unregisterPort(port)).not.toThrow();
    });
  });

  describe('getContentPort', () => {
    it('should return undefined for unregistered tab ID', () => {
      expect(portManager.getContentPort(999)).toBeUndefined();
    });

    it('should return the correct port for a registered tab ID', () => {
      const port1 = createMockPort(`${PORT_NAME_CONTENT_PREFIX}1`);
      const port2 = createMockPort(`${PORT_NAME_CONTENT_PREFIX}2`);
      portManager.registerPort(port1);
      portManager.registerPort(port2);
      expect(portManager.getContentPort(1)).toBe(port1);
      expect(portManager.getContentPort(2)).toBe(port2);
    });
  });

  describe('getPopupPort', () => {
    it('should return undefined when no popup port is registered', () => {
      expect(portManager.getPopupPort()).toBeUndefined();
    });
  });

  describe('broadcastToContent', () => {
    it('should send message to all content ports', () => {
      const port1 = createMockPort(`${PORT_NAME_CONTENT_PREFIX}1`);
      const port2 = createMockPort(`${PORT_NAME_CONTENT_PREFIX}2`);
      portManager.registerPort(port1);
      portManager.registerPort(port2);

      const message = { type: 'PING' as const, payload: undefined };
      portManager.broadcastToContent(message as never);

      expect(port1.postMessage).toHaveBeenCalledWith(message);
      expect(port2.postMessage).toHaveBeenCalledWith(message);
    });

    it('should not throw when no content ports registered', () => {
      const message = { type: 'PING' as const, payload: undefined };
      expect(() => portManager.broadcastToContent(message as never)).not.toThrow();
    });
  });

  describe('sendToPopup', () => {
    it('should send message to popup port', () => {
      const port = createMockPort(PORT_NAME_POPUP);
      portManager.registerPort(port);

      const message = { type: 'PING' as const, payload: undefined };
      portManager.sendToPopup(message as never);

      expect(port.postMessage).toHaveBeenCalledWith(message);
    });

    it('should not throw when no popup port registered', () => {
      const message = { type: 'PING' as const, payload: undefined };
      expect(() => portManager.sendToPopup(message as never)).not.toThrow();
    });
  });
});
