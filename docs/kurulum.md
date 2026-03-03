# har-mock-plugin — Angular Installation Guide

> **Version:** 0.0.1
> **Angular Compatibility:** Angular 15+
> **Activation:** Plugin activates in any environment as long as `enabled: true`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Standard Angular Project Setup](#standard-angular-project-setup)
3. [NX Monorepo Setup](#nx-monorepo-setup)
4. [Configuration Options](#configuration-options)
5. [Preparing a HAR File](#preparing-a-har-file)
6. [Guard Bypass](#guard-bypass)
7. [Verification](#verification)
8. [Common Mistakes](#common-mistakes)

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18+ |
| Angular | 15+ |
| TypeScript | 4.9+ |

---

## Standard Angular Project Setup

### Step 1: Install the package

The plugin is not yet published to npm — use **yalc** to link it locally.

```bash
# Install yalc globally (once)
npm install -g yalc
```

Publish the plugin from this project's root:

```bash
# In the har-mock-plugin project root
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc publish
```

Expected output:

```
har-mock-plugin@0.0.1 published in store.
```

Add the package to your Angular app:

```bash
# In your Angular app root
yalc add har-mock-plugin
npm install   # or yarn install
```

> **Note:** `yalc add` adds `"har-mock-plugin": "file:.yalc/har-mock-plugin"` to `package.json` and creates a `.yalc/` directory. Add it to `.gitignore`.

```bash
echo ".yalc" >> .gitignore
echo "yalc.lock" >> .gitignore
```

### Step 2: Register with `provideHarMock`

**Standalone (Angular 15+) — `app.config.ts`:**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHarMock } from 'har-mock-plugin';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // ⚠️ Do NOT add provideHttpClient() separately.
    // provideHarMock() calls provideHttpClient() internally.
    provideHarMock(), // zero-config: uses /assets/har-mock.har
  ],
};
```

**NgModule-based — `app.module.ts`:**

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { provideHarMock } from 'har-mock-plugin';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  providers: [
    provideHarMock(), // zero-config
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Step 3: Place the HAR file

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har    <- default location
```

Standard Angular CLI projects already include `src/assets`. No extra config needed.

### Step 4: Sync plugin updates

When you modify the plugin source:

```bash
# In the har-mock-plugin root
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc push   # auto-updates your Angular app
```

---

## NX Monorepo Setup

Two approaches:

- **Path A:** Copy the package into `libs/` and use NX path mapping *(recommended — no build step)*
- **Path B:** Link with yalc *(independent package scenario)*

### Path A: Local Library under `libs/` (Recommended)

#### Step A-1: Copy source files

```bash
mkdir -p libs/har-mock-plugin/src

cp -r /path/to/har-mock-plugin/packages/angular-plugin/src/. \
      libs/har-mock-plugin/src/

cp /path/to/har-mock-plugin/packages/angular-plugin/package.json \
   libs/har-mock-plugin/
```

#### Step A-2: Expected directory structure

```
libs/
└── har-mock-plugin/
    ├── src/
    │   ├── index.ts
    │   └── lib/
    │       ├── initializer/
    │       ├── interceptor/
    │       ├── provider/
    │       └── types/
    ├── ng-package.json
    └── project.json
```

`libs/har-mock-plugin/src/index.ts`:

```typescript
export { HarMockConfig, MockMode, HAR_MOCK_CONFIG } from './lib/types/har-mock-config.types';
export { provideHarMock } from './lib/provider/provide-har-mock';
export { harMockInterceptor, HarLoaderService } from './lib/interceptor';
```

#### Step A-3: Create NX `project.json`

```json
{
  "name": "har-mock-plugin",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library",
  "sourceRoot": "libs/har-mock-plugin/src",
  "prefix": "lib",
  "targets": {
    "build": {
      "executor": "@nx/angular:ng-packagr-lite",
      "outputs": ["{workspaceRoot}/dist/libs/har-mock-plugin"],
      "options": {
        "project": "libs/har-mock-plugin/ng-package.json"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libs/har-mock-plugin"],
      "options": {
        "jestConfig": "libs/har-mock-plugin/jest.config.ts"
      }
    }
  },
  "tags": ["scope:shared", "type:util"]
}
```

#### Step A-4: Add TypeScript path alias

`tsconfig.base.json` (NX monorepo root):

```json
{
  "compilerOptions": {
    "paths": {
      "har-mock-plugin": ["libs/har-mock-plugin/src/index.ts"]
    }
  }
}
```

#### Step A-5: Add `@har-mock/core` dependency

```bash
# With yalc:
cd /path/to/har-mock-plugin/packages/core && yalc publish
cd /path/to/nx-project && yalc add @har-mock/core

# Or directly:
npm install /path/to/har-mock-plugin/packages/core
```

#### Step A-6: Use in your app

```typescript
import { provideHarMock } from 'har-mock-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHarMock({ harUrl: '/assets/har-mock.har' }),
  ],
};
```

### Path B: yalc Link

```bash
cd /path/to/har-mock-plugin
yarn workspace har-mock-plugin build
cd packages/angular-plugin/dist
yalc publish

cd /path/to/nx-project
yalc add har-mock-plugin
npm install
```

No path alias needed — resolved through `node_modules/har-mock-plugin`.

Optional: add `implicitDependencies` to your app's `project.json`:

```json
{
  "implicitDependencies": ["har-mock-plugin"]
}
```

---

## Configuration Options

All parameters are optional.

```typescript
provideHarMock({
  // URL of the HAR file (loaded from Angular assets)
  harUrl: '/assets/har-mock.har',     // default

  // Response selection mode
  // 'last-match': last matching HAR entry is used
  // 'sequential': entries are used in sequence (round-robin)
  mode: 'last-match',                 // default

  // Enable/disable the plugin
  enabled: true,                      // default

  // Remove route guards on bootstrap
  bypassGuards: false,                // default

  // Guards to keep when bypassGuards=true
  preserveGuards: [],                 // default

  // Inline mock rules (evaluated before HAR)
  rules: [],                          // default
})
```

### `preserveGuards` detail

When `bypassGuards: true`, list specific guards here to keep them intact.

```typescript
import { BssPermissionGuard } from '@my-app/guards';

export const analyticsGuard = () => true; // must be a stable reference

provideHarMock({
  bypassGuards: true,
  preserveGuards: [
    BssPermissionGuard,  // class-based: pass the class itself
    analyticsGuard,      // functional: must be the SAME reference as in routes
  ],
});
```

> **Important:** For functional guards, pass the **exact same function reference** used in the route config. A new lambda `[() => true]` always fails because each lambda is a different reference.

---

## Preparing a HAR File

### Export from Chrome DevTools

1. Open Chrome DevTools → **Network** tab
2. Record network traffic (trigger requests)
3. Right-click any request → **Save all as HAR with content**
4. Save the file as `src/assets/har-mock.har`

### File placement

```
my-angular-app/
└── src/
    └── assets/
        └── har-mock.har
```

Custom HAR URL:

```typescript
provideHarMock({
  harUrl: '/assets/api-responses.har',
})
```

---

## Guard Bypass

```typescript
provideHarMock({
  bypassGuards: true,
});
```

On bootstrap (`APP_INITIALIZER`), the plugin traverses all route configs recursively and removes `canActivate`, `canDeactivate`, and `canMatch` guard arrays — except for entries listed in `preserveGuards`. Lazy-loaded routes are cleaned when they load (`RouteConfigLoadEnd`).

If an error occurs during guard removal, it is logged as a `console.warn` and the app bootstraps normally — guards remain intact.

---

## Verification

On successful setup you should see in the browser console:

```
[HarMock] HAR loaded: 42 entries
```

To confirm mocking works:

1. Open Chrome DevTools → **Network** tab
2. Trigger a request that matches a HAR entry (e.g. `/api/users`)
3. If the response completes almost instantly → mock is active
4. Compare the response body with the HAR entry

### Guard bypass verification

```typescript
import { Router } from '@angular/router';
import { inject } from '@angular/core';

const router = inject(Router);
console.log(router.config);
// canActivate arrays should be empty (except guards in preserveGuards)
```

---

## Common Mistakes

### `Cannot find module 'har-mock-plugin'`

```bash
ls node_modules/har-mock-plugin
ls .yalc/har-mock-plugin
```

For NX: verify `paths` in `tsconfig.base.json`.

---

### `HAR file not found` or 404 error

```bash
ls src/assets/har-mock.har
```

Confirm `src/assets` is listed in `angular.json` assets.

---

### `preserveGuards` not working (guard still removed)

```typescript
// Wrong — new lambda each time, reference never matches
provideHarMock({
  preserveGuards: [() => inject(BssGuard).canActivate()],
});

// Correct — stable module-level reference
export const bssGuardFn = () => inject(BssGuard).canActivate();
provideHarMock({
  preserveGuards: [bssGuardFn],
});
```

---

### HAR loaded but app crashes (graceful degradation)

HAR fetch or parse errors are caught silently: a `HarParseError` is logged to `console.warn`, entries are set to `[]`, and all requests passthrough. The app starts normally.

---

### `provideHttpClient` conflict

`provideHarMock()` already calls `provideHttpClient(withInterceptors([...]))` internally.

```typescript
// Wrong
providers: [provideHttpClient(), provideHarMock()]

// Correct
providers: [provideHarMock()]
```

---

### NX circular dependency warning

```json
// libs/har-mock-plugin/project.json
{ "tags": ["scope:shared", "type:util"] }
```

Allow `scope:shared` in the `nx/enforce-module-boundaries` ESLint rule.
