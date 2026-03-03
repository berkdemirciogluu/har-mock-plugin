# HAR Mock Plugin — Chrome Extension Usage Guide

> **Version:** 0.0.1
> **Platform:** Chrome MV3 Extension
> **Compatibility:** All Chromium-based browsers (Chrome, Edge, Brave, Arc, ...)

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Loading the Extension in Chrome](#loading-the-extension-in-chrome)
4. [Core Concepts](#core-concepts)
5. [First Use — Loading a HAR File](#first-use--loading-a-har-file)
6. [Preparing a HAR File](#preparing-a-har-file)
7. [Controls — Configuration Panel](#controls--configuration-panel)
   - [HAR Management](#har-management)
   - [Rule Management](#rule-management)
   - [Storage Inject](#storage-inject)
   - [Settings](#settings)
8. [Monitor — Live Request Tracking](#monitor--live-request-tracking)
9. [Response Editor](#response-editor)
10. [Interception Mechanism](#interception-mechanism)
11. [Priority Chain](#priority-chain)
12. [Architecture Overview](#architecture-overview)
13. [Build & Test for Developers](#build--test-for-developers)
14. [FAQ](#faq)
15. [Troubleshooting](#troubleshooting)

---

## Overview

**HAR Mock Plugin** is a Chrome Extension that intercepts HTTP requests and returns mock responses using HAR (HTTP Archive) files exported from the browser.

### What does it do?

- **Frontend development without a backend:** Work with a HAR file while the API is not yet ready
- **Error scenario simulation:** Easily test 500, 404, 429 and other HTTP responses
- **Performance testing:** Simulate real network latency using HAR timings
- **Self-contained demo environment:** Run demos without a live API
- **API regression testing:** Verify UI behavior against known responses

### Key Features

| Feature | Description |
|---|---|
| HAR Loading | Load `.har` files via drag & drop or file picker |
| Fetch & XHR Interception | Automatic `window.fetch` and `XMLHttpRequest` override |
| Rule-Based Mocking | Custom URL pattern + method + status + body rules, independent of HAR |
| Live Monitor | Real-time request feed — see which requests were mocked and which passed through |
| Response Editor | Edit responses inline with CodeMirror 6 JSON editor and persist them |
| Timing Replay | Apply HAR `wait + receive` timings as artificial delay |
| Exclude List | Skip specific URL patterns from mocking |
| Domain Filter | Mock only requests to specific domains |
| Storage Inject | Inject key-value pairs into `localStorage` / `sessionStorage` |
| One-Click Toggle | Instantly enable or disable all interception |

---

## Installation

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18+ |
| Yarn | 1.22+ |
| Chrome / Chromium | 116+ (MV3 support) |

### Build

```bash
# Install dependencies
yarn install

# Build the core package (extension depends on it)
yarn build:core

# Build the extension
yarn build:extension
```

Build output is placed in `packages/extension/dist/`:

```
packages/extension/dist/
├── background.js         <- Service Worker
├── content.js            <- Content Script (ISOLATED world)
├── interceptor.js        <- Interceptor (MAIN world)
├── popup/
│   └── index.html        <- Popup UI
├── manifest.json
├── icon-16.png
├── icon-48.png
└── icon-128.png
```

> **Dev build:** `yarn workspace @har-mock/extension build:dev` — includes source maps.

---

## Loading the Extension in Chrome

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/` folder
5. The extension loads and the **HAR Mock Plugin** icon appears in the toolbar

> **Tip:** Click the 🧩 (puzzle) icon in the toolbar and pin the extension for easy access.

### Updating after a rebuild

```bash
yarn build:extension
```

Then click the reload (↻) button on the extension card at `chrome://extensions`. Refresh open tabs (F5).

---

## Core Concepts

### HAR File

HAR (HTTP Archive) is a standard JSON format for browser network traffic. Export it from Chrome DevTools. The extension uses the HTTP responses in this file to simulate real API calls.

### URL Pattern & Auto-Parameterization

When a HAR file is loaded, URLs are automatically parameterized:

```
/api/users/123    -> /api/users/{param}
/api/users/456    -> /api/users/{param}
```

Requests to the same endpoint with different IDs match the same pattern.

### Replay Modes

| Mode | Behavior |
|---|---|
| `last-match` | Returns the response from the **last** matching HAR entry |
| `sequential` | Uses the next entry in sequence for each request (round-robin) |

### Mock Rule

User-defined mock rules that are independent of HAR. Evaluated **before** HAR in the priority chain.

---

## First Use — Loading a HAR File

1. Click the extension icon to open the popup
2. In the **Controls** tab, expand the **HAR** accordion
3. Load your `.har` file:
   - **Drag & drop** it onto the upload area, or
   - Click **Choose File** to browse
4. On success, the file name and entry count are displayed
5. **Refresh the page** — from this point, requests matching HAR URLs return mock responses

### Quick Verification

1. Switch to the **Monitor** tab
2. Refresh the page or trigger an action
3. If requests show a green **HAR ✓** or blue **Rule ✓** badge → mock is working
4. A grey **→** badge → request passed through (no match found)

---

## Preparing a HAR File

### Export from Chrome DevTools

1. Open the web app you want to mock
2. Open **Chrome DevTools → Network** tab (`F12` or `Ctrl+Shift+I`)
3. Refresh the page or perform the actions you want to capture
4. Right-click any request
5. Select **"Save all as HAR with content"**
6. Save the file (e.g. `my-app-api.har`)

### Tips

- For API-only HAR files, enable the **XHR/Fetch** filter in the Network tab before exporting
- For large HAR files, remove irrelevant resources (CSS, JS, images) with a text editor
- HAR files may contain sensitive data (tokens, cookies) — add them to `.gitignore`

---

## Controls — Configuration Panel

The popup has two tabs: **Controls** and **Monitor**. All configuration is done in the Controls tab.

### HAR Management

Under the **HAR** accordion:

| Action | Description |
|---|---|
| **Upload File** | Load a `.har` file via drag & drop or file picker |
| **Clear HAR** | Remove the loaded HAR entirely |
| **Replace HAR** | Delete the current HAR and load a new one |
| **Replay Mode** | Choose `last-match` or `sequential` |
| **Timing Replay** | When on, applies the real `wait + receive` values from HAR as delay |

#### Timing Replay Detail

Each HAR entry contains `timings.wait` (TTFB) and `timings.receive` (download time). When Timing Replay is enabled:

```
Total delay = wait + receive (milliseconds)
```

This simulates real network conditions. When disabled (default), responses are returned instantly.

---

### Rule Management

Under the **Rules** accordion, define mock rules independent of HAR.

#### Creating a New Rule

1. Click **"+ New Rule"**
2. Fill in the form:

| Field | Description | Example |
|---|---|---|
| **URL Pattern** | Exact URL or wildcard (`*`) | `/api/users`, `/api/data/*` |
| **Method** | HTTP method | `GET`, `POST`, `PUT`, `DELETE`, ... |
| **Status Code** | Response status (100–599) | `200`, `404`, `500` |
| **Response Body** | JSON response body | `{"users": []}` |
| **Delay (ms)** | Artificial delay | `0` (instant), `1500` (1.5s) |
| **Enabled** | Active/inactive | ✓ / ✗ |

3. Click **"Save"**

#### Editing & Deleting Rules

- **Edit:** Click the ✏️ button next to a rule → form fills with existing values → modify → Save
- **Delete:** Click 🗑️ → inline confirmation → "Yes" to delete

#### URL Pattern Syntax

| Pattern | Matches | Does not match |
|---|---|---|
| `/api/users` | `/api/users` (exact) | `/api/users/123` |
| `/api/users/*` | `/api/users/123`, `/api/users/abc` | `/api/users` |
| `/api/*/profile` | `/api/123/profile`, `/api/abc/profile` | `/api/users` |

Rules are evaluated **before** HAR in the priority chain. If both a rule and a HAR entry match, the rule wins.

---

### Storage Inject

Under the **Storage** accordion, inject key-value pairs into `localStorage` or `sessionStorage` when pages load.

#### Use Cases

- **Auth token injection:** Set a token to test backend calls without logging in
- **Feature flags:** Override `localStorage` flags
- **User preferences:** Pre-set theme, language, etc.

#### How to Use

1. Select type: `localStorage` or `sessionStorage`
2. Enter **Key** and **Value**
3. Click **"Add"** → entry appears in the list
4. After adding all entries, click **"Save & Inject"**
5. Injected immediately to all open tabs; applied automatically to new tabs

| Field | Description | Example |
|---|---|---|
| **Type** | Storage type toggle | `localStorage` / `sessionStorage` |
| **Key** | Storage key | `auth_token`, `theme`, `feature_flags` |
| **Value** | Storage value (string) | `"eyJhbGciOi..."`, `"dark"`, `"true"` |

**Notes:**
- Previous injections are cleared when the extension is closed or when an empty list is saved
- Values are always stored as strings (no `JSON.stringify` needed — enter the string directly)
- Injection is automatically re-applied on every page refresh

---

### Settings

Under the **Settings** accordion, manage general extension configuration.

#### Enable/Disable Toggle

A single toggle that instantly enables or disables all interception. When disabled:

- All HTTP requests go directly to the server (passthrough)
- Storage injection stops
- No new events appear in Monitor
- HAR and rule data are **preserved** (not deleted)

#### Exclude List

Add URLs you do not want mocked here. **Substring matching** is used — any URL containing this text passes through.

```
Example: adding /api/auth
  -> Not mocked: https://api.example.com/api/auth/login
  -> Not mocked: https://api.example.com/api/auth/refresh
  -> Mocked:     https://api.example.com/api/users
```

**Usage:** Type a pattern → press Enter or click **"Add"** → appears in list. Click ✗ to remove.

#### Domain Filter

When filled, only requests to the listed domains are mocked. **Empty = all domains are mocked.**

```
Example: adding api.example.com
  -> Mocked:     https://api.example.com/users
  -> Mocked:     https://sub.api.example.com/users  (subdomain support)
  -> Not mocked: https://other-api.com/users
```

IP:Port format is supported: `15.237.105.224:8080`

#### Factory Reset

The **"Reset All"** button wipes all extension data:

- HAR data deleted
- All rules deleted
- Edited responses deleted
- Storage entries deleted
- Settings reset to defaults
- Match history cleared

> ⚠️ This action is irreversible. A confirmation dialog is shown.

---

## Monitor — Live Request Tracking

The **Monitor** tab shows a real-time request feed while the extension is active.

### Feed View

Each row shows:

| Column | Description |
|---|---|
| **Method** | HTTP method (colored badge: GET=green, POST=blue, PUT=orange, ...) |
| **URL** | Request URL (truncated if long) |
| **Status** | HTTP status code (colored: 2xx=green, 4xx=orange, 5xx=red) |
| **Time** | Relative time ("now", "5s", "2m", "1h") |
| **Source** | Badge: 🟢 **Rule ✓** / 🔵 **HAR ✓** / ⬜ **→** (passthrough) |

### Actions

- **Click an event** → Response detail and JSON editor open in the right panel
- **"Clear"** button → Delete all feed history
- Maximum 500 events are retained; older events are trimmed automatically
- User scroll position is preserved (auto-scroll compensation)

---

## Response Editor

Clicking an event in Monitor opens the **Response Viewer** panel:

1. **View current response:** Original response from HAR or rule displayed in JSON format
2. **Edit:** Modify in the CodeMirror 6 JSON editor
3. **Save:** Click "Save" → the edited response is persisted for this URL+method combination

### Edited Response Priority

An edited response takes the **highest priority** in the chain:

```
Edited Response > Rule > HAR > Passthrough
```

This lets you override HAR or rule responses for quick one-off tests.

> **Note:** Edited responses are cleared by "Factory Reset".

---

## Interception Mechanism

### 1. Fetch Interception

`window.fetch` is overridden. When `fetch()` is called:

1. URL and HTTP method are extracted
2. A `MATCH_QUERY` message is sent to the Background Service Worker
3. If matched → `new Response(body, {status, headers})` is returned
4. If not matched → original `fetch()` is called (passthrough)

### 2. XHR Interception

`XMLHttpRequest.prototype.open` and `.send` are overridden:

1. `open()` records the method and URL
2. `send()` sends a query to Background
3. If matched → `readyState`, `status`, `responseText` are overridden, and `readystatechange → load → loadend` events are dispatched
4. If not matched → original `send()` is called

> **Note:** **Synchronous XHR** requests are not mocked (async resolver cannot be used). They always passthrough.

### 3. Communication Layer

The extension runs in three isolated contexts that communicate via messaging:

```
+----------------+   chrome.runtime.Port   +---------------------+
|   Popup (UI)   |<----------------------->|  Background          |
|                |   STATE_SYNC            |  Service Worker      |
|                |   MATCH_EVENT           |  (StateManager)      |
+----------------+   Command messages      +----------+----------+
                                           chrome.runtime.Port |
                                                               |
                                           +----------+--------+
                                           | Content Script     |
                                           | (ISOLATED world)   |
                                           | ^^ window.postMsg  |
                                           | Interceptor        |
                                           | (MAIN world)       |
                                           +-------------------+
```

- **Popup <-> Background:** `chrome.runtime.Port` (`har-mock-popup` port)
- **Content <-> Background:** `chrome.runtime.Port` (`har-mock-content-{id}` port)
- **Content (ISOLATED) <-> Interceptor (MAIN):** `window.postMessage` (`__HAR_MOCK__` channel)

---

## Priority Chain

When an HTTP request is intercepted, it is evaluated in this order:

```
1. Extension disabled?            -> Passthrough
2. Domain filter mismatch?        -> Passthrough
3. In exclude list?               -> Passthrough
4. Edited response exists?        -> Edited response (highest priority)
5. Rule match?                    -> Rule response
6. HAR pattern match?             -> HAR response
7. No match                       -> Passthrough
```

### Detailed Flow

| Step | Check | Result |
|---|---|---|
| 1 | `settings.enabled === false` | All requests passthrough |
| 2 | `domainFilter` is set and URL host doesn't match | Passthrough |
| 3 | Exclude list pattern is a substring of the URL | Passthrough |
| 4 | `editedResponses[METHOD:URL]` exists | Edited response |
| 5 | `evaluate(request, rules)` finds a match | Rule response |
| 6 | `matchUrl(url, method, patterns)` finds a match | HAR response (sequential or last-match) |
| 7 | No match found | Request forwarded to the real server |

---

## Architecture Overview

### Component Structure

```
Extension
+-- Popup (Angular 18 Standalone Components + Tailwind CSS)
|   +-- AppComponent
|   |   +-- TabBarComponent           -> Controls / Monitor tab switching
|   |   +-- ControlsTabComponent      -> All configuration UI
|   |   |   +-- HarUploadComponent    -> HAR file loading
|   |   |   +-- StrategyToggleComponent -> Replay mode selection
|   |   |   +-- HmRuleListComponent   -> Rule listing
|   |   |   +-- HmRuleFormComponent   -> Rule create/edit form
|   |   |   |   +-- HmJsonEditorComponent (CodeMirror 6)
|   |   |   +-- StorageInjectComponent -> localStorage/sessionStorage inject
|   |   |   +-- SettingsSectionComponent -> Extension toggle
|   |   |   +-- HmExcludeListComponent -> Exclude list & Domain filter
|   |   +-- MonitorTabComponent       -> Live request feed
|   |       +-- HmResponseViewerComponent -> Response view/edit
|   +-- ExtensionMessagingService     -> Background communication singleton
|
+-- Background (Service Worker)
|   +-- StateManager    -> Hybrid cache (chrome.storage.local + in-memory)
|   +-- PortManager     -> Content & Popup port management
|   +-- MessageHandler  -> Message dispatch & processing
|   +-- KeepAlive       -> 24s alarm to prevent SW idle timeout
|
+-- Content Script (ISOLATED world)
|   +-- content.ts      -> MAIN <-> Background bridge
|
+-- Interceptor (MAIN world)
    +-- MockResolver       -> Send query to Background, receive response
    +-- FetchInterceptor   -> window.fetch override
    +-- XhrInterceptor     -> XMLHttpRequest override
    +-- StorageInjector    -> localStorage/sessionStorage inject
```

### Data Storage (`chrome.storage.local`)

| Key | Type | Description |
|---|---|---|
| `harData` | `HarSessionData \| null` | Loaded HAR file (entries + patterns + fileName) |
| `activeRules` | `MockRule[]` | User-defined mock rules |
| `matchHistory` | `MatchEvent[]` | Monitor feed history (max 500) |
| `editedResponses` | `Record<string, EditedResponse>` | Edited responses (`METHOD:URL` key) |
| `settings` | `ExtensionSettings` | General settings |
| `storageEntries` | `StorageEntry[]` | Storage inject entries |

### Default Settings

```typescript
{
  enabled: true,
  replayMode: 'last-match',
  timingReplay: false,
  excludeList: [],
  resourceTypeFilter: ['xhr', 'fetch'],
  domainFilter: [],
}
```

---

## Build & Test for Developers

### Development Build

```bash
# One-time production build
yarn build:extension

# Development build (with source maps)
yarn workspace @har-mock/extension build:dev
```

### Tests

```bash
yarn workspace @har-mock/extension test
yarn workspace @har-mock/extension test:coverage
```

### Project Dependencies

```
@har-mock/extension
+-- @har-mock/core (workspace dependency)
    +-- HAR parser & validator
    +-- URL matcher & pattern compiler
    +-- Auto-parameterization engine
    +-- Rule engine (evaluate)
    +-- Priority chain (resolve)
```

After modifying the core package, rebuild the extension:

```bash
yarn build:core
yarn build:extension
```

---

## FAQ

### Does the extension work on all websites?

Yes. With `<all_urls>` host permission it works on all HTTP/HTTPS pages. Use Domain Filter to restrict to specific sites.

### How large can a HAR file be?

No hard technical limit, but `chrome.storage.local` defaults to 10 MB. Performance may degrade with very large files. Filter out unnecessary resources (images, CSS, JS) to reduce size.

### Is data deleted when the extension is closed?

No. `chrome.storage.local` is persistent — HAR, rules, and edited responses survive browser restarts. Use "Factory Reset" to clear everything.

### Why is synchronous XHR not mocked?

When `XMLHttpRequest` is called in synchronous mode, an async resolver cannot be used. This is a technical limitation. Synchronous XHR is extremely rare in modern web apps.

### Can I load multiple HAR files?

Only one HAR file is supported at a time. Loading a new file replaces the existing one. You can merge multiple APIs into a single HAR file using a text editor.

### If both a rule and HAR entry match, which wins?

The rule wins. Priority: Edited Response > Rule > HAR > Passthrough.

---

## Troubleshooting

### Extension active but requests not mocked

1. Check the extension toggle: Controls → Settings → is it enabled?
2. Is a HAR loaded? Controls → HAR accordion — does it show a file name and entry count?
3. Check Domain Filter: if not empty, is the target domain listed?
4. Check Exclude List: does the target URL match an exclude pattern?
5. Refresh the page after loading the extension
6. Check Monitor: are requests showing "→" (passthrough)? No match was found

### "Extension context invalidated" error

This happens when the extension is updated or reloaded while old content scripts are still running. **Refresh the page** (F5).

### Service Worker sleeping (idle timeout)

MV3 service workers sleep after ~30 seconds of inactivity. The extension prevents this with a 24-second keep-alive alarm. If you still have issues:

1. Toggle the extension off and on
2. Close and reopen the popup
3. Refresh the page

### Popup blank or not loading

1. Check `chrome://extensions` → is the extension error-free?
2. Click "Errors" to inspect console errors
3. Remove and reload the extension from the `dist/` folder

### No events in Monitor

1. Is the extension enabled?
2. Was the page refreshed after opening the popup? (The port connection is established when the popup opens)
3. If Domain Filter is active, is the target domain listed?
