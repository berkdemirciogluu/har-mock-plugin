# HAR Mock Plugin

> A monorepo for HAR-based HTTP mocking — Angular library + Chrome Extension.

Record real API traffic as a `.har` file, then replay it as a local mock during development and testing — no backend required.

---

## Packages

| Package | npm name | Description |
|---|---|---|
| [`packages/core`](./packages/core) | `@har-mock/core` | HAR parser, URL matcher, priority-chain rule engine — pure TypeScript, zero framework dependencies |
| [`packages/angular-plugin`](./packages/angular-plugin) | `har-mock-plugin` | Angular library (`ng-packagr`). Adds `provideHarMock()` to your `app.config.ts` |
| [`packages/extension`](./packages/extension) | — | Chrome Extension (Manifest V3) with Angular popup UI. Intercepts `fetch` / `XHR` at the service-worker level |

### Dependency Graph

```
@har-mock/core          ← no workspace deps
har-mock-plugin         → @har-mock/core
@har-mock/extension     → @har-mock/core
```

---

## Requirements

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Yarn | ≥ 1.22 |
| Angular | ≥ 15 (peer dep) |
| Chrome | ≥ 88 (MV3) |

---

## Installation

```bash
yarn install
```

---

## Angular Plugin — Quick Start

### 1. Install

```bash
npm install har-mock-plugin
```

### 2. Add to `app.config.ts`

```ts
import { provideHarMock } from 'har-mock-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHarMock({
      harUrl: '/assets/api.har',
      enabled: true,
    }),
  ],
};
```

> `provideHarMock()` already calls `provideHttpClient()` internally. Do **not** call it again — it will cause interceptor conflicts.

### 3. Place your `.har` file

```
src/
└── assets/
    └── api.har   ← exported from browser DevTools (Network → Export HAR)
```

### Configuration Reference

```ts
interface HarMockConfig {
  /** HAR file URL. @default '/assets/har-mock.har' */
  harUrl?: string;

  /**
   * Response selection mode.
   * - 'last-match'  — returns the last matching HAR entry for the URL
   * - 'sequential'  — returns entries in sequence, cycling through them
   * @default 'last-match'
   */
  mode?: 'last-match' | 'sequential';

  /** Enables/disables the plugin. @default true */
  enabled?: boolean;

  /**
   * Removes all Angular route guards from Router.config on bootstrap.
   * Use preserveGuards to keep specific guards intact.
   * @default false
   */
  bypassGuards?: boolean;

  /** Guards to keep when bypassGuards=true. @default [] */
  preserveGuards?: Array<Function | Type<unknown>>;

  /**
   * Inline mock rules. Priority chain: Rules → HAR → Passthrough.
   * @default []
   */
  rules?: MockRule[];

  /**
   * Domain filter. Empty = mock all domains.
   * Supports hostname, hostname:port, and subdomain matching.
   * @example ['api.example.com', '10.0.0.1:8080']
   * @default []
   */
  domainFilter?: string[];

  /**
   * Key-value pairs injected into localStorage/sessionStorage on bootstrap.
   * Only active when enabled=true.
   * @default []
   */
  storageEntries?: StorageEntry[];
}
```

### Inline Rules (Rules API)

Rules override HAR responses and are evaluated first in the priority chain.

```ts
provideHarMock({
  harUrl: '/assets/api.har',
  rules: [
    {
      urlPattern: '/api/users/:id',
      method: 'GET',
      response: {
        status: 200,
        body: { id: '42', name: 'Mock User' },
      },
    },
  ],
})
```

---

## Chrome Extension — Quick Start

1. Run `yarn build:extension`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `packages/extension/dist/`
5. Open any page, click the extension icon, upload a `.har` file

The extension intercepts `fetch` and `XHR` requests at the service-worker level using the Chrome Declarative Net Request API. No code changes are required in the target page.

---

## Monorepo Scripts

| Script | Description |
|---|---|
| `yarn build:core` | Build `@har-mock/core` |
| `yarn build:extension` | Build Chrome Extension |
| `yarn build:plugin` | Build Angular library |
| `yarn test:all` | Run all tests with coverage |
| `yarn lint:all` | ESLint all packages (`--max-warnings 0`) |
| `yarn format:check` | Check Prettier formatting |
| `yarn format:write` | Auto-format all files |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   @har-mock/core                │
│  ┌────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ HarParser  │ │ UrlMatcher  │ │ RuleEngine │ │
│  └────────────┘ └─────────────┘ └────────────┘ │
│  ┌──────────────────────────────────────────┐   │
│  │          AutoParameterizer               │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────┘
                       │ imported by
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│  har-mock-plugin │     │  @har-mock/extension │
│  Angular Library │     │  Chrome Extension MV3│
│                  │     │                      │
│  provideHarMock()│     │  Service Worker      │
│  HttpInterceptor │     │  fetch/XHR intercept │
│  APP_INITIALIZER │     │  Angular Popup UI    │
└──────────────────┘     └──────────────────────┘
```

**Priority chain (per request):**
```
Inline Rules  →  HAR Entries  →  Passthrough (real network)
```

---

## Development Rules

- `@har-mock/core` must have **zero** Angular or Chrome API dependencies
- `any` type is enforced as an **ESLint error** across all packages
- Circular imports between packages are forbidden
- All imports from `@har-mock/core` go through the barrel (`index.ts`)

---

## License

MIT
