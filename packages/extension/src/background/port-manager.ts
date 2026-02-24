/**
 * Port Manager — Registry for content script and popup port connections
 * Manages Map<number, Port> for content ports and single popup port
 */
import { type Message, PORT_NAME_CONTENT_PREFIX, PORT_NAME_POPUP } from '../shared';

/** Manages Chrome extension port connections */
export class PortManager {
  private readonly contentPorts = new Map<number, chrome.runtime.Port>();
  private popupPort: chrome.runtime.Port | null = null;

  /** Register a port based on its name convention */
  registerPort(port: chrome.runtime.Port): void {
    if (port.name === PORT_NAME_POPUP) {
      this.popupPort = port;
      return;
    }

    if (port.name.startsWith(PORT_NAME_CONTENT_PREFIX)) {
      const tabIdStr = port.name.slice(PORT_NAME_CONTENT_PREFIX.length);
      const tabId = Number(tabIdStr);
      if (!Number.isNaN(tabId)) {
        this.contentPorts.set(tabId, port);
      }
      return;
    }
  }

  /** Unregister a port on disconnect */
  unregisterPort(port: chrome.runtime.Port): void {
    if (port.name === PORT_NAME_POPUP) {
      this.popupPort = null;
      return;
    }

    if (port.name.startsWith(PORT_NAME_CONTENT_PREFIX)) {
      const tabIdStr = port.name.slice(PORT_NAME_CONTENT_PREFIX.length);
      const tabId = Number(tabIdStr);
      if (!Number.isNaN(tabId)) {
        this.contentPorts.delete(tabId);
      }
      return;
    }
  }

  /** Get content script port by tab ID */
  getContentPort(tabId: number): chrome.runtime.Port | undefined {
    return this.contentPorts.get(tabId);
  }

  /** Get popup port (may be undefined if popup is closed) */
  getPopupPort(): chrome.runtime.Port | undefined {
    return this.popupPort ?? undefined;
  }

  /** Broadcast a message to all content script ports */
  broadcastToContent(message: Message): void {
    for (const port of this.contentPorts.values()) {
      port.postMessage(message);
    }
  }

  /** Send a message to popup (silent if no popup port) */
  sendToPopup(message: Message): void {
    this.popupPort?.postMessage(message);
  }
}
