import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Polyfill crypto.randomUUID for JSDOM test environment
if (!globalThis.crypto?.randomUUID) {
  const cryptoModule = require('crypto') as typeof import('crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => cryptoModule.randomUUID(),
    },
    writable: true,
  });
}
