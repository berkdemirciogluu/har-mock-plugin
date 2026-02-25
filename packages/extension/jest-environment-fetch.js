/**
 * Custom Jest Environment — jest-environment-jsdom'u extend eder
 * Node.js 18+'nin native Fetch API global'larını jsdom ortamına expose eder
 * (Response, Request, Headers, fetch)
 * Yeni paket gerektirmez — Node 24'ün built-in'larını kullanır
 */
const { default: JsdomEnvironment } = require('jest-environment-jsdom');

class FetchEnabledJsdomEnvironment extends JsdomEnvironment {
  async setup() {
    await super.setup();

    // Node 18+'de Fetch API global seviyede mevcut — jsdom window'una aktar
    // Bu sayede content script testleri window.fetch / Response / Request / Headers kullanabilir
    if (typeof globalThis.fetch !== 'undefined') {
      this.global.fetch = globalThis.fetch;
    }
    if (typeof globalThis.Response !== 'undefined') {
      this.global.Response = globalThis.Response;
    }
    if (typeof globalThis.Request !== 'undefined') {
      this.global.Request = globalThis.Request;
    }
    if (typeof globalThis.Headers !== 'undefined') {
      this.global.Headers = globalThis.Headers;
    }
  }
}

module.exports = FetchEnabledJsdomEnvironment;
