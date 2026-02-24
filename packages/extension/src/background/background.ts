/**
 * Background Service Worker — MV3 Entry Point
 * Port listener, message dispatch, keep-alive
 */
import { type Message } from '../shared';
import { PortManager } from './port-manager';
import { handleMessage } from './message-handler';

const portManager = new PortManager();

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  portManager.registerPort(port);

  port.onDisconnect.addListener(() => {
    portManager.unregisterPort(port);
  });

  port.onMessage.addListener((message: Message) => {
    handleMessage(message, port);
  });
});

console.log('[HAR Mock] Background service worker active');
