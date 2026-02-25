/**
 * Background Service Worker — MV3 Entry Point
 * Port listener, message dispatch, keep-alive
 */
import { type Message } from '../shared';
import { PortManager } from './port-manager';
import { handleMessage } from './message-handler';
import { StateManager } from './state-manager';

const stateManager = new StateManager();
const portManager = new PortManager();

// SW başladığında state'i storage'dan yükle
stateManager
  .initialize()
  .then(() => {
    console.log('[HAR Mock] State initialized from storage');
  })
  .catch((error: unknown) => {
    console.warn('[HAR Mock] State initialization failed:', error);
  });

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  portManager.registerPort(port);

  port.onDisconnect.addListener(() => {
    portManager.unregisterPort(port);
  });

  port.onMessage.addListener((message: Message) => {
    handleMessage(message, port, stateManager, portManager);
  });
});

console.log('[HAR Mock] Background service worker active');
