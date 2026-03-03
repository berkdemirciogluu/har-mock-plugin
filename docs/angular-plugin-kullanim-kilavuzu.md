# HAR Mock Plugin — Angular Plugin Usage & Integration Guide

> **Package name:** `har-mock-plugin`
> **Version:** 0.0.1
> **Angular Compatibility:** Angular 15+
> **Activation:** Active in any environment when `enabled: true`

---

## Table of Contents

1. [Overview](#overview)
2. [Differences from the Chrome Extension](#differences-from-the-chrome-extension)
3. [Installation](#installation)
4. [Zero-Config Usage](#zero-config-usage)
5. [Configuration Reference (HarMockConfig)](#configuration-reference-harmockconfig)
6. [Preparing and Placing a HAR File](#preparing-and-placing-a-har-file)
7. [Replay Modes](#replay-modes)
8. [Rule-Based Mocking](#rule-based-mocking)
9. [Guard Bypass Mechanism](#guard-bypass-mechanism)
10. [preserveGuards — Selective Guard Bypass](#preserveguards--selective-guard-bypass)
11. [Storage Inject](#storage-inject)
12. [Domain Filter](#domain-filter)
13. [Priority Chain](#priority-chain)
14. [Architecture & How It Works](#architecture--how-it-works)
15. [Exported API Reference](#exported-api-reference)
16. [Verification & Debugging](#verification--debugging)
17. [Common Errors & Troubleshooting](#common-errors--troubleshooting)
18. [Advanced Usage Examples](#advanced-usage-examples)

---

## Overview

**har-mock-plugin** is an HTTP mock library for Angular applications. It intercepts HTTP requests and returns responses from HAR files or user-defined rules, eliminating backend dependencies during development.

### What does it do?

- **Develop without a ready backend:** Mock API responses from a HAR file
- **Stable responses in E2E tests:** Improve test reliability
- **Error scenario testing:** Easily simulate 500, 404, 429 and other errors
- **Demo environments:** Run demos without a live API
- **Guard bypass:** Skip auth/permission guards during development
- **Storage inject:** Auto-inject tokens, feature flags and other values

### Key Features

| Feature | Description |
|---|---|
| Zero-Config | `provideHarMock()` — one line, works with defaults |
| HAR Replay | Auto-mock from HAR files exported from the browser |
| Rule Mock | Define custom mock rules independent of HAR |
| Guard Bypass | Auto-remove route guards on bootstrap |
| Preserve Guards | Selective bypass — keep specific guards intact |
| Storage Inject | Auto-write values to localStorage/sessionStorage |
| Domain Filter | Mock only specific domains |
| Auto-Parameterization | Automatically convert dynamic IDs in URLs to patterns |
| Graceful Degradation | App continues normally if HAR fails to load |

---

## Differences from the Chrome Extension

| Feature | Chrome Extension | Angular Plugin |
|---|---|---|
| **Scope** | All websites, framework-agnostic | Angular apps only |
| **Setup** | Installed in Chrome | Added to Angular DI via `provideHarMock()` |
| **HAR loading** | Drag & drop from popup UI | HTTP fetch from `src/assets/` |
| **Rule management** | CRUD from popup UI | `provideHarMock({ rules: [...] })` in code |
| **Monitor** | Real-time UI feed | Not available (use console logs) |
| **Response editing** | CodeMirror editor in popup | Not available (edit HAR/rule, restart app) |
| **Guard bypass** | Not available | `bypassGuards: true` |
| **Storage inject** | From popup UI | `storageEntries: [...]` in code |
| **Dependencies** | Chrome API (MV3) | Angular HttpClient, DI |

---

## Installation

See [kurulum.md](./kurulum.md) for full installation steps (yalc, NX monorepo, etc.).

Quick start for a standard Angular project:

```bash
yalc add har-mock-plugin && npm install
```

```typescript
// app.config.ts
import { provideHarMock } from 'har-mock-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHarMock(), // zero-config
  ],
};
```

> **Note:** `provideHarMock()` includes `provideHttpClient()` internally. Do **not** call it separately.

---

## Zero-Config Usage

```typescript
provideHarMock();
```

This single line:

1. Fetches `/assets/har-mock.har` during app bootstrap (via `APP_INITIALIZER`)
2. Parses the HAR and auto-parameterizes URL patterns
3. Registers an `HttpClient` interceptor that matches outgoing requests against the HAR
4. Activates as long as `enabled: true` (default)

### Default Values

| Parameter | Default | Description |
|---|---|---|
| `harUrl` | `'/assets/har-mock.har'` | HAR file URL |
| `mode` | `'last-match'` | Returns the last matching entry |
| `enabled` | `true` | Plugin is active |
| `bypassGuards` | `false` | Guards are untouched |
| `preserveGuards` | `[]` | No guards preserved |
| `rules` | `[]` | No custom rules |
| `domainFilter` | `[]` | All domains are mocked |
| `storageEntries` | `[]` | No storage injection |

---

## Configuration Reference (HarMockConfig)

```typescript
import { provideHarMock } from 'har-mock-plugin';

provideHarMock({
  // HAR file URL (fetched from Angular assets)
  harUrl: '/assets/har-mock.har',

  // Response selection mode: 'last-match' | 'sequential'
  mode: 'last-match',

  // Enable/disable the plugin
  enabled: true,

  // Remove route guards on bootstrap
  bypassGuards: false,

  // Guards to keep when bypassGuards=true
  preserveGuards: [],

  // Inline mock rules (evaluated before HAR entries)
  rules: [],

  // Mock only requests to these domains (empty = all domains)
  domainFilter: [],

  // Key-value pairs injected into storage on bootstrap
  storageEntries: [],
});
```

### Type Definitions

```typescript
type MockMode = 'last-match' | 'sequential';

interface HarMockConfig {
  harUrl?: string;
  mode?: MockMode;
  enabled?: boolean;
  bypassGuards?: boolean;
  preserveGuards?: Array<Function | Type<unknown>>;
  rules?: MockRule[];
  domainFilter?: string[];
  storageEntries?: StorageEntry[];
}

// From @har-mock/core
interface MockRule {
  readonly id: string;             // UUID
  readonly urlPattern: string;     // '/api/users' or '/api/users/*'
  readonly method: string;         // 'GET', 'POST', 'PUT', 'DELETE', ...
  readonly statusCode: number;     // 100–599
  readonly responseBody: string;   // JSON string
  readonly responseHeaders: readonly HarHeader[];
  readonly delay: number;          // ms (0 = instant)
  readonly enabled: boolean;
}

interface StorageEntry {
  readonly key: string;
  readonly value: string;
  readonly type: 'localStorage' | 'sessionStorage';
}
```

---

## Preparing and Placing a HAR File

### Export from Chrome DevTools

1. Open the web app you want to mock
2. Open **Chrome DevTools → Network** tab (`F12`)
3. Refresh the page and trigger the API calls you want to capture
4. Right-click any request → **"Save all as HAR with content"**
5. Save the file as `src/assets/har-mock.har`

### File Placement

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har    <- default location
```

### Auto-Parameterization

When the HAR is loaded, URLs are automatically parameterized:

```
/api/users/123            -> /api/users/{param}
/api/users/456            -> /api/users/{param}
/api/orders/abc-def/items -> /api/orders/{param}/items
```

Different IDs in requests match the same pattern.

---

## Replay Modes

| Mode | Behavior | Use Case |
|---|---|---|
| `last-match` | Returns the **last** matching HAR entry | Single endpoint mock (default) |
| `sequential` | Uses the next entry in sequence (round-robin) | Pagination, different response sequences |

```typescript
// Sequential mode
provideHarMock({ mode: 'sequential' });
// HAR has 3 entries for /api/users:
// 1st call -> entry 1, 2nd call -> entry 2, 3rd call -> entry 3, 4th call -> entry 1
```

---

## Rule-Based Mocking

Define custom mock rules that are evaluated **before** HAR entries.

```typescript
import { provideHarMock } from 'har-mock-plugin';

provideHarMock({
  rules: [
    {
      id: 'rule-users',
      urlPattern: '/api/users',
      method: 'GET',
      statusCode: 200,
      responseBody: JSON.stringify({ users: [{ id: 1, name: 'Test User' }] }),
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      delay: 0,
      enabled: true,
    },
    {
      id: 'rule-profile',
      urlPattern: '/api/users/*/profile',
      method: 'GET',
      statusCode: 200,
      responseBody: JSON.stringify({ name: 'John', email: 'john@test.com' }),
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      delay: 500,
      enabled: true,
    },
  ],
});
```

### Error Scenario Simulation

```typescript
rules: [
  { id: 'e500', urlPattern: '/api/critical', method: 'GET', statusCode: 500,
    responseBody: JSON.stringify({ error: 'Internal Server Error' }),
    responseHeaders: [], delay: 0, enabled: true },
  { id: 'e429', urlPattern: '/api/rate-limited', method: 'GET', statusCode: 429,
    responseBody: JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
    responseHeaders: [{ name: 'Retry-After', value: '60' }], delay: 0, enabled: true },
]
```

### URL Pattern Syntax

| Pattern | Matches | Does not match |
|---|---|---|
| `/api/users` | `/api/users` (exact) | `/api/users/123` |
| `/api/users/*` | `/api/users/123`, `/api/users/abc` | `/api/users` |
| `/api/*/profile` | `/api/123/profile`, `/api/abc/profile` | `/api/users` |

---

## Guard Bypass Mechanism

Remove all Angular route guards during development with `bypassGuards: true`.

```typescript
provideHarMock({
  bypassGuards: true,
});
```

**What it does:**

1. Traverses the full route config on bootstrap (`APP_INITIALIZER`)
2. Clears `canActivate`, `canDeactivate`, `canMatch` arrays from every route
3. Watches for lazy-loaded routes (`RouteConfigLoadEnd`) and cleans them too
4. Recursive — all `children` levels are included

**Safety:** Guard bypass requires all three conditions to be true:

```
enabled === true  &&  bypassGuards === true
```

If `enabled: false`, bypass does not run.

**Error tolerance:** If an error occurs during guard removal, it is logged as `console.warn` and the app bootstraps normally.

---

## preserveGuards — Selective Guard Bypass

Use `preserveGuards` to keep specific guards intact when `bypassGuards: true`.

### Class-Based Guard

```typescript
import { AnalyticsGuard } from './guards/analytics.guard';

provideHarMock({
  bypassGuards: true,
  preserveGuards: [AnalyticsGuard], // pass the class reference
});
```

### Functional Guard

```typescript
// guards/analytics.guard.ts
export const analyticsGuard = () => true;

// app.routes.ts
export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [analyticsGuard], // same reference
  },
];

// app.config.ts
import { analyticsGuard } from './guards/analytics.guard';

provideHarMock({
  bypassGuards: true,
  preserveGuards: [analyticsGuard], // same reference!
});
```

### Critical: Reference Equality

```typescript
// Wrong — new reference each time, will never match
provideHarMock({
  preserveGuards: [() => inject(SomeService).check()],
});

// Correct — stable module-level reference
export const myGuardFn = () => inject(SomeService).check();
provideHarMock({
  preserveGuards: [myGuardFn],
});
```

- `preserveGuards: []` → all guards are removed
- `preserveGuards: [GuardA, guardB]` → only GuardA and guardB are kept

---

## Storage Inject

Automatically write values to `localStorage` or `sessionStorage` on bootstrap.

```typescript
import { provideHarMock, StorageEntry } from 'har-mock-plugin';

provideHarMock({
  storageEntries: [
    {
      key: 'auth_token',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx',
      type: 'localStorage',
    },
    {
      key: 'user_profile',
      value: JSON.stringify({ id: 1, name: 'Test User', role: 'admin' }),
      type: 'localStorage',
    },
    {
      key: 'feature_new_dashboard',
      value: 'true',
      type: 'localStorage',
    },
    {
      key: 'onboarding_completed',
      value: 'true',
      type: 'sessionStorage',
    },
  ],
});
```

**Behavior:**

- Each `setItem` call is wrapped in its own `try/catch` — a failing key does not affect others
- Runs once during app bootstrap (`APP_INITIALIZER`)
- Only active when `enabled: true`

### Common scenario: Login bypass

Combine guard bypass + storage inject + rules to skip the login screen entirely:

```typescript
provideHarMock({
  bypassGuards: true,
  storageEntries: [
    { key: 'access_token', value: 'mock-jwt-token', type: 'localStorage' },
    { key: 'refresh_token', value: 'mock-refresh-token', type: 'localStorage' },
  ],
  rules: [
    {
      id: 'token-refresh',
      urlPattern: '/api/auth/refresh',
      method: 'POST',
      statusCode: 200,
      responseBody: JSON.stringify({ accessToken: 'new-mock-token' }),
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      delay: 0,
      enabled: true,
    },
  ],
});
```

---

## Domain Filter

Mock only requests to specific domains.

```typescript
provideHarMock({
  domainFilter: ['api.example.com', 'gateway.internal.net'],
});
```

**Matching rules:**

- Exact host: `api.example.com` matches `https://api.example.com/users`
- Subdomain: `api.example.com` also matches `https://sub.api.example.com/users`
- IP:Port: `15.237.105.224:8080` matches `http://15.237.105.224:8080/api`
- Empty array: all domains are mocked (default)

---

## Priority Chain

When an HTTP request reaches the interceptor, it is evaluated in this order:

```
1. enabled === false            -> Passthrough
2. Domain filter mismatch       -> Passthrough
3. Rule match?                  -> Rule response
4. HAR pattern match?           -> HAR response (last-match or sequential)
5. No match                     -> Passthrough (next(req))
```

**Summary:** `Rules > HAR > Passthrough`

Rules are always evaluated before HAR entries. Use a rule to override a HAR response.

---

## Architecture & How It Works

### Bootstrap Flow

```
Angular Bootstrapping
|
+-- 1. provideHarMock() is called
|   +-- HAR_MOCK_CONFIG token resolved (defaults merged with user config)
|   +-- HarLoaderService registered
|   +-- provideHttpClient(withInterceptors([harMockInterceptor])) called
|   +-- 3 APP_INITIALIZERs registered
|
+-- 2. APP_INITIALIZER: HAR Loader
|   +-- enabled check
|   +-- Fetch via HttpBackend (bypasses interceptor chain — no infinite loop)
|   +-- parseHar(raw) -> HarFile
|   +-- parameterize(entries) -> UrlPattern[]
|   +-- Store in memory cache
|
+-- 3. APP_INITIALIZER: Guard Bypass
|   +-- enabled && bypassGuards check
|   +-- Router.config recursive traverse -> remove guard arrays
|   +-- Subscribe to RouteConfigLoadEnd -> clean lazy routes too
|
+-- 4. APP_INITIALIZER: Storage Inject
|   +-- enabled check
|   +-- Write storageEntries to localStorage / sessionStorage
|
+-- 5. App ready — HTTP requests now pass through harMockInterceptor
```

### HTTP Request Flow

```
HttpClient.get('/api/users')
  |
  v
harMockInterceptor
  |
  +-- enabled === false          -> next(req)
  +-- Domain filter mismatch    -> next(req)
  +-- HarLoaderService entries null -> next(req)
  |
  +-- resolve(request, rules, entries, urlPatterns)
  |   +-- 1. evaluate(req, rules)   -> rule match? -> return rule response
  |   +-- 2. matchUrl(url, patterns) -> HAR match? -> return HAR response
  |   +-- 3. null                   -> Passthrough
  |
  +-- null -> next(req)
  +-- ResolveResult -> of(new HttpResponse({ status, body, headers }))
```

### Circular Interception Protection

`HarLoaderService` injects `HttpBackend` directly to fetch the HAR file:

```typescript
const backend = inject(HttpBackend);
const rawHttp = new HttpClient(backend); // bypasses interceptor chain
rawHttp.get(harUrl, { responseType: 'text' });
// This request does NOT pass through harMockInterceptor
```

---

## Exported API Reference

| Export | Type | Description |
|---|---|---|
| `provideHarMock` | `(config?: HarMockConfig) => EnvironmentProviders` | Main provider factory |
| `HarMockConfig` | `interface` | Configuration interface |
| `MockMode` | `type` | `'last-match' \| 'sequential'` |
| `HAR_MOCK_CONFIG` | `InjectionToken<Required<HarMockConfig>>` | DI token |
| `harMockInterceptor` | `HttpInterceptorFn` | HTTP interceptor function |
| `HarLoaderService` | `class` | HAR file loader service |
| `MockRule` | `interface` (re-export) | Mock rule interface |
| `StorageEntry` | `interface` (re-export) | Storage inject entry interface |

### Using `HAR_MOCK_CONFIG` token

```typescript
import { inject } from '@angular/core';
import { HAR_MOCK_CONFIG } from 'har-mock-plugin';

@Injectable()
export class MyService {
  private readonly config = inject(HAR_MOCK_CONFIG);

  logStatus() {
    console.log('Mock enabled:', this.config.enabled);
    console.log('Mode:', this.config.mode);
    console.log('Rules:', this.config.rules.length);
  }
}
```

### Using `HarLoaderService`

```typescript
import { inject } from '@angular/core';
import { HarLoaderService } from 'har-mock-plugin';

@Component({ ... })
export class DebugComponent {
  private readonly harLoader = inject(HarLoaderService);

  showData() {
    const entries = this.harLoader.getEntries();
    const patterns = this.harLoader.getUrlPatterns();
    console.log('HAR entries:', entries?.length ?? 'not loaded');
    console.log('URL patterns:', patterns?.length ?? 'not loaded');
  }
}
```

---

## Verification & Debugging

### Checklist

| | Check |
|---|---|
| ☐ | App starts without console errors |
| ☐ | `[HarMock] HAR loaded: X entries` appears in console |
| ☐ | Requests matching HAR entries complete almost instantly |
| ☐ | Response body matches HAR content |
| ☐ | Plugin is inactive when `enabled: false` |

### Console debug

```typescript
// Verify storage inject
console.log(localStorage.getItem('auth_token'));

// Verify guard bypass
const router = inject(Router);
console.log(router.config); // canActivate arrays should be empty
```

---

## Common Errors & Troubleshooting

### `Cannot find module 'har-mock-plugin'`

```bash
ls node_modules/har-mock-plugin
ls .yalc/har-mock-plugin
```

NX: check `paths` in `tsconfig.base.json`.

---

### HAR file not found / 404

```bash
ls src/assets/har-mock.har
```

Confirm `src/assets` is in `angular.json` assets. Adjust `harUrl` if using a different path.

---

### `preserveGuards` not working

See [Reference Equality](#critical-reference-equality) above. Functional guards must use the exact same reference as in the route config.

---

### HAR fails to load but app still works

Expected — graceful degradation. Parse/fetch errors are logged as `console.warn (HarParseError)`, entries default to `[]`, all requests passthrough.

---

### NX circular dependency warning

```json
// libs/har-mock-plugin/project.json
{ "tags": ["scope:shared", "type:util"] }
```

Allow `scope:shared` in `nx/enforce-module-boundaries`.

---

### `provideHttpClient` conflict

```typescript
// Wrong
providers: [provideHttpClient(), provideHarMock()]

// Correct — provideHarMock() includes provideHttpClient()
providers: [provideHarMock()]
```

---

## Advanced Usage Examples

### Full configuration

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHarMock } from 'har-mock-plugin';
import { analyticsGuard } from './guards/analytics.guard';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHarMock({
      harUrl: '/assets/api-responses.har',
      mode: 'sequential',
      rules: [
        {
          id: 'mock-login',
          urlPattern: '/api/auth/login',
          method: 'POST',
          statusCode: 200,
          responseBody: JSON.stringify({
            token: 'mock-jwt-token',
            user: { id: 1, name: 'Dev User', role: 'admin' },
          }),
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          delay: 300,
          enabled: true,
        },
        {
          id: 'error-payments',
          urlPattern: '/api/payments/*',
          method: 'POST',
          statusCode: 503,
          responseBody: JSON.stringify({ error: 'Service temporarily unavailable' }),
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          delay: 2000,
          enabled: true,
        },
      ],
      bypassGuards: true,
      preserveGuards: [analyticsGuard],
      domainFilter: ['api.myapp.com', 'gateway.myapp.com'],
      storageEntries: [
        { key: 'access_token', value: 'mock-jwt-xxx', type: 'localStorage' },
        { key: 'user_preferences', value: '{"theme":"dark","lang":"en"}', type: 'localStorage' },
        { key: 'session_id', value: 'mock-session-123', type: 'sessionStorage' },
      ],
    }),
  ],
};
```

### Environment-based dynamic configuration

```typescript
import { environment } from '../environments/environment';

const mockConfig = environment.useMocks
  ? {
      harUrl: '/assets/har-mock.har',
      bypassGuards: true,
      rules: environment.mockRules ?? [],
    }
  : { enabled: false };

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHarMock(mockConfig)],
};
```

### Syncing plugin updates

```bash
# After changing plugin source
yarn build:core   # if core changed
yarn build:plugin

cd packages/angular-plugin/dist
npx yalc push     # auto-updates the consuming Angular app
```
