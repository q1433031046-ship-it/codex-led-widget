# Pro Quota and Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly represent Pro seven-day quota windows, allow explicit quota-source selection, replace the fragile nested context menu with a flat quick menu, and add a secure single-instance settings window.

**Architecture:** Move account rate-limit interpretation and usage-history persistence into focused CommonJS services that can be tested without Electron. Keep Electron as the owner of preferences, windows, IPC, clipboard, and native menus. Renderers receive only normalized quota data and narrow settings APIs through the preload bridge; they never receive account credentials, raw App Server transport data, filesystem access, or Node access.

**Tech Stack:** Electron 31, Node.js CommonJS, vanilla HTML/CSS/JavaScript, Node `assert` test scripts, electron-builder/NSIS on Windows.

## Global Constraints

- Treat `windowDurationMins` as the authoritative window identity. Never infer 5-hour versus 7-day quota from `primary`/`secondary` positions.
- Map 300 minutes to `shortTerm`, 10080 minutes to `weekly`, and retain unknown durations in `otherWindows` with dynamic labels.
- Treat the server's `usedPercent` as authoritative. Do not scale it for Pro or convert a missing value to zero.
- Display raw plan type `prolite` as `Pro`, while retaining the raw value only in sanitized diagnostics.
- Default to source `codex`; persist a user-selected source and fall back to `codex` if it disappears.
- Keep compatibility aliases `primary = shortTerm` and `secondary = weekly` until all existing renderer/statistics paths are migrated.
- A missing short-term or weekly window is `null`. Hide unavailable cards and fall the meter back to the available window.
- Keep native quick-menu items flat. Do not reopen a native menu or submenu after a click.
- Settings must be a single-instance `BrowserWindow`, save immediately, and update open renderers live.
- Keep `contextIsolation: true`, `nodeIntegration: false`, and a whitelisted preload API. Never expose auth tokens, account identifiers, raw local paths, `fs`, or arbitrary IPC.
- Preserve legacy history without guessing its meaning. New history keys are `${limitId}:${windowDurationMins}`.
- Do not push commits, publish a GitHub release, or overwrite an installed build without explicit user authorization. Local commits, tests, builds, and a local installer artifact are in scope.

---

## Task 1: Normalize multi-source rate limits by duration

**Files:**

- Create: `src/main/quota-normalizer.js`
- Create: `scripts/test-quota-sources.js`
- Modify: `src/main/quota-service.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing fixtures for Pro, Spark, swapped positions, missing percentages, and unknown windows**

Create `scripts/test-quota-sources.js` using Node `assert`. Cover these contracts:

```js
const pro = normalizeRateLimitResponse({
  rateLimits: {
    planType: "prolite",
    primary: { usedPercent: 8, windowDurationMins: 10080, resetsAt: 1_800_000_000 },
    secondary: null,
  },
  rateLimitsByLimitId: {
    codex: {
      planType: "prolite",
      primary: { usedPercent: 8, windowDurationMins: 10080, resetsAt: 1_800_000_000 },
      secondary: null,
    },
    codex_bengalfox: {
      label: "GPT-5.3-Codex-Spark",
      primary: { usedPercent: 20, windowDurationMins: 300, resetsAt: 1_800_000_000 },
      secondary: { usedPercent: 30, windowDurationMins: 10080, resetsAt: 1_800_000_000 },
    },
  },
});

assert.equal(pro.activeSourceId, "codex");
assert.equal(pro.planLabel, "Pro");
assert.equal(pro.primary, null);
assert.equal(pro.secondary.remainingPercent, 92);
assert.equal(pro.sources.length, 2);
```

Also assert that:

- selecting `codex_bengalfox` returns both 300-minute and 10080-minute windows;
- raw `primary` and `secondary` may be swapped without changing classification;
- `usedPercent: 0` remains zero, but missing or invalid `usedPercent` yields `null` remaining/used values;
- a 1440-minute window appears in `otherWindows` with a `24h` label;
- an unavailable preferred source falls back to `codex`, then the first available source.

- [ ] **Step 2: Run the new test and confirm the missing module failure**

Run: `node scripts/test-quota-sources.js`

Expected: FAIL because `src/main/quota-normalizer.js` does not exist.

- [ ] **Step 3: Implement the pure normalizer**

Create `src/main/quota-normalizer.js` with explicit exports:

```js
const SHORT_TERM_WINDOW_MINS = 300;
const WEEKLY_WINDOW_MINS = 10080;

function normalizeRateLimitResponse(response, preferredSourceId = "codex") { /* ... */ }
function normalizeSource(limitId, snapshot) { /* ... */ }
function normalizeWindow(rawWindow) { /* ... */ }
function formatWindowLabel(windowDurationMins) { /* ... */ }
function displayPlanType(planType) { /* ... */ }

module.exports = {
  SHORT_TERM_WINDOW_MINS,
  WEEKLY_WINDOW_MINS,
  normalizeRateLimitResponse,
  normalizeSource,
  normalizeWindow,
  formatWindowLabel,
  displayPlanType,
};
```

Return a stable source shape:

```js
{
  id,
  label,
  planType,
  planLabel,
  shortTerm,
  weekly,
  primary: shortTerm,
  secondary: weekly,
  otherWindows,
}
```

Deduplicate windows with the same duration, clamp valid numeric percentages to 0–100, preserve `resetsAt`, and ensure missing numeric fields remain `null`.

- [ ] **Step 4: Integrate the normalizer into the transport service**

Update `getQuota(options)` in `src/main/quota-service.js` to call:

```js
const normalized = normalizeRateLimitResponse(response, options.sourceId || "codex");
return {
  ...normalized,
  tokenUsage: mergeTokenUsageSnapshot(normalized.tokenUsage, normalizeAccountUsage(accountUsage)),
};
```

Keep App Server request/response handling in `quota-service.js`. Remove positional quota classification from `normalizeSnapshot`; retain only compatibility exports actually used by existing tests.

- [ ] **Step 5: Add the test to the front of the package test chain and run it**

Modify `package.json` so `npm test` begins with `node scripts/test-quota-sources.js`.

Run: `node scripts/test-quota-sources.js`

Expected: PASS with a concise success line.

- [ ] **Step 6: Commit the normalization slice**

```powershell
git add src/main/quota-normalizer.js src/main/quota-service.js scripts/test-quota-sources.js package.json
git commit -m "fix: classify quota windows by duration"
```

---

## Task 2: Persist quota source and handle unavailable windows in the UI

**Files:**

- Modify: `src/main/main.js`
- Modify: `src/renderer/renderer.js`
- Modify: `src/renderer/stats.js`
- Modify: `src/renderer/index.html`
- Modify: `scripts/test-settings-stability.js`
- Create: `scripts/test-quota-display.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing tests for preferences and meter fallback**

Create `scripts/test-quota-display.js` to load a small exported/pure renderer helper or evaluate a dedicated helper module. Test:

```js
assert.equal(selectMeterWindow({ primary: null, secondary: weekly }, "primary"), weekly);
assert.equal(selectMeterWindow({ primary: shortTerm, secondary: weekly }, "secondary"), weekly);
assert.equal(selectMeterWindow({ primary: shortTerm, secondary: null }, "secondary"), shortTerm);
assert.equal(selectMeterWindow({ primary: null, secondary: null }, "primary"), null);
```

Extend `scripts/test-settings-stability.js` to require a persisted `quotaSourceId`, preference schema version 3, and fallback behavior when a source is removed.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node scripts/test-quota-display.js`

Run: `node scripts/test-settings-stability.js`

Expected: FAIL because the new preference and fallback helper do not exist yet.

- [ ] **Step 3: Add source selection to display preferences**

In `src/main/main.js`:

- change `preferenceVersion` from 2 to 3;
- add `quotaSourceId: "codex"` to defaults;
- validate IDs with a narrow character/length rule such as `/^[a-zA-Z0-9_.:-]{1,80}$/`;
- pass `displayPreferences.quotaSourceId` to `getQuota({ sourceId })`;
- after each successful response, persist a fallback only if the selected source is absent;
- broadcast the normalized quota and updated preferences to every open renderer.

- [ ] **Step 4: Make renderer cards availability-aware**

In `src/renderer/renderer.js`:

- use a pure `selectMeterWindow(quota, preferredSource)` helper;
- hide the 5-hour card/chart when `quota.primary` is `null`;
- hide the 7-day card/chart when `quota.secondary` is `null`;
- choose the remaining available window when the preferred meter source is unavailable;
- show an explicit unavailable state when neither exists;
- render `quota.planLabel` rather than uppercasing raw `planType`;
- retain dynamic labels for `otherWindows` in diagnostics/settings, not as falsely named cards.

Update the browser-preview stub in `src/renderer/index.html` to include `activeSourceId`, `sources`, `planLabel`, and nullable windows.

- [ ] **Step 5: Update the statistics renderer**

In `src/renderer/stats.js`, guard every short-term/weekly read, display the active source label, and omit charts that have no corresponding window/history series.

- [ ] **Step 6: Add tests to the package test chain and run focused tests**

Run: `node scripts/test-quota-display.js`

Run: `node scripts/test-settings-stability.js`

Expected: PASS.

- [ ] **Step 7: Commit the source-selection UI slice**

```powershell
git add src/main/main.js src/renderer/renderer.js src/renderer/stats.js src/renderer/index.html scripts/test-quota-display.js scripts/test-settings-stability.js package.json
git commit -m "feat: support selectable quota sources"
```

---

## Task 3: Introduce versioned, source-aware usage history

**Files:**

- Create: `src/main/quota-history-service.js`
- Create: `scripts/test-quota-history.js`
- Modify: `src/main/main.js`
- Modify: `scripts/test-history-persistence.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing history migration tests**

Create fixtures for:

```js
const legacy = {
  primary: [{ at: 1, usedPercent: 10 }],
  secondary: [{ at: 1, usedPercent: 20 }],
};

const versioned = {
  schemaVersion: 2,
  series: {
    "codex:10080": [{ at: 2, usedPercent: 8, remainingPercent: 92 }],
  },
  legacy,
};
```

Assert that:

- legacy arrays are preserved under `legacy` and are not silently assigned duration keys;
- a normalized snapshot records `codex:10080` and `codex_bengalfox:300` independently;
- series retention, deduplication, and minimum-record intervals continue to work;
- the active renderer projection returns `{ primary, secondary }` for the selected source;
- a stored last snapshot with an explicit duration may be safely reclassified.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node scripts/test-quota-history.js`

Expected: FAIL because `quota-history-service.js` does not exist.

- [ ] **Step 3: Implement the history service**

Create pure functions around this schema:

```js
{
  schemaVersion: 2,
  series: {
    "<limitId>:<windowDurationMins>": [
      { at, usedPercent, remainingPercent, resetsAt }
    ]
  },
  legacy: { primary: [], secondary: [] }
}
```

Export `loadHistoryData`, `recordQuotaSnapshot`, `projectHistoryForSource`, and `historySeriesKey`. Keep filesystem reads/writes in `main.js` or accept parsed data only so the service remains directly testable.

- [ ] **Step 4: Integrate history into Electron state**

In `src/main/main.js`:

- replace the global `{ primary, secondary }` store with the versioned document;
- migrate the on-disk legacy file once in memory and persist it on the next legitimate snapshot write;
- record every available normalized source/window, not just the active source;
- attach only the selected source's short-term/weekly projection to `currentQuotaPayload()`;
- mark cached history/snapshot payloads stale after refresh failure without deleting the last good values.

- [ ] **Step 5: Update the existing history contract test**

Replace positional source-inspection assumptions in `scripts/test-history-persistence.js` with assertions against the history service and the Electron integration call sites.

- [ ] **Step 6: Run focused tests**

Run: `node scripts/test-quota-history.js`

Run: `node scripts/test-history-persistence.js`

Expected: PASS.

- [ ] **Step 7: Commit the history slice**

```powershell
git add src/main/quota-history-service.js src/main/main.js scripts/test-quota-history.js scripts/test-history-persistence.js package.json
git commit -m "feat: store source-aware quota history"
```

---

## Task 4: Replace nested context menus with a flat quick menu

**Files:**

- Modify: `src/main/main.js`
- Modify: `scripts/test-sticky-menu.js`

- [ ] **Step 1: Rewrite the menu test to require a flat template**

Update `scripts/test-sticky-menu.js` to assert:

- no entry in the recursive template contains `submenu`;
- no `setTimeout`/cursor-position/menu-reopen behavior is invoked after clicks;
- checked items call their action exactly once;
- the template includes read-only quota summary, show/hide, refresh, always-on-top, statistics, quota-source/settings, language, and exit items.

Rename the success message to describe the flat quick menu, while keeping the file path stable for the package script.

- [ ] **Step 2: Run the test and confirm the old sticky-menu behavior fails**

Run: `node scripts/test-sticky-menu.js`

Expected: FAIL because current menu items contain nested submenus and reopen logic.

- [ ] **Step 3: Extract and build a flat menu template**

In `src/main/main.js`, replace the old template with a focused `buildQuickMenuTemplate()` function. The order is:

1. disabled active-source/short-term/weekly summaries;
2. separator;
3. show or hide widget;
4. refresh quota;
5. always on top toggle;
6. open statistics;
7. `额度来源：<label>` opening the settings quota section;
8. open settings;
9. language toggle/action;
10. separator and exit.

Delete `stickyToggleClick`, `keepToggleSubmenusOpen`, `findTraySubmenu`, the 90ms timer, and all cursor-coordinate submenu reopening. Keep the existing menu-open magnet hold if it only prevents widget retraction during the native menu lifecycle.

- [ ] **Step 4: Run the flat-menu test**

Run: `node scripts/test-sticky-menu.js`

Expected: PASS.

- [ ] **Step 5: Commit the quick-menu slice**

```powershell
git add src/main/main.js scripts/test-sticky-menu.js
git commit -m "fix: replace sticky submenus with flat quick menu"
```

---

## Task 5: Add a secure single-instance settings window and IPC

**Files:**

- Modify: `src/main/main.js`
- Modify: `src/main/preload.js`
- Create: `src/renderer/settings.html`
- Create: `src/renderer/settings.css`
- Create: `src/renderer/settings.js`
- Create: `scripts/test-settings-window.js`
- Modify: `package.json`

- [ ] **Step 1: Write a failing settings-window contract test**

Create `scripts/test-settings-window.js` that statically/dynamically verifies:

- `settingsWindow` is reused when present rather than duplicated;
- settings uses `contextIsolation: true` and `nodeIntegration: false`;
- preload exposes named settings methods only, with no generic `send`, `invoke`, `ipcRenderer`, `fs`, token, or account object;
- the settings page contains the four approved sections;
- diagnostic-copy flow delegates sanitization and clipboard ownership to the main process.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node scripts/test-settings-window.js`

Expected: FAIL because the settings window does not exist.

- [ ] **Step 3: Add the main-process settings window**

Add `let settingsWindow = null` and implement:

```js
function createSettingsWindow(initialSection = "quota") { /* single instance */ }
function showSettingsWindow(section = "quota") { /* show/focus/navigate */ }
function settingsStatePayload() { /* preferences + sanitized quota metadata */ }
function sanitizedDiagnosticsPayload() { /* no secrets, ids, or local paths */ }
```

Use the existing preload script and secure web preferences. Hide on normal close so reopening is instant; destroy only during application shutdown.

- [ ] **Step 4: Add narrow IPC handlers**

Add whitelisted handlers for:

- `settings:open(section)` and `settings:close`;
- `settings:state:get`;
- `settings:preferences:set(changes)` with main-process field validation;
- `settings:quotaSource:set(sourceId)`;
- `settings:diagnostics:copy`, using Electron `clipboard.writeText` only after sanitization.

Broadcast `settings:stateChanged` after preference changes, quota refreshes, source fallback, and pricing updates.

- [ ] **Step 5: Extend the preload bridge**

Expose explicit methods such as:

```js
openSettings(section)
closeSettings()
getSettingsState()
setSettingsPreferences(changes)
setQuotaSource(sourceId)
copyDiagnostics()
onSettingsStateChanged(callback)
```

Sanitize the `section` argument and clone/validate renderer-provided preference objects in the main process.

- [ ] **Step 6: Create the settings HTML shell**

Create accessible semantic sections in `settings.html`:

- `quota`: active source, source selector, meter source, live availability notes;
- `window`: card visibility, always-on-top, magnetic docking, sizing;
- `stats`: statistics visibility and existing model-price controls/links;
- `about`: app version, plan label, refresh state, copy diagnostics.

Include a navigation rail and status area, but no Apply button.

- [ ] **Step 7: Run the contract test**

Run: `node scripts/test-settings-window.js`

Expected: PASS for the shell and security contracts.

- [ ] **Step 8: Commit the settings-window shell**

```powershell
git add src/main/main.js src/main/preload.js src/renderer/settings.html src/renderer/settings.css src/renderer/settings.js scripts/test-settings-window.js package.json
git commit -m "feat: add secure settings window"
```

---

## Task 6: Implement live settings behavior and diagnostics

**Files:**

- Modify: `src/renderer/settings.html`
- Modify: `src/renderer/settings.css`
- Modify: `src/renderer/settings.js`
- Modify: `src/main/main.js`
- Modify: `src/renderer/renderer.js`
- Modify: `scripts/test-settings-stability.js`
- Modify: `scripts/test-settings-window.js`

- [ ] **Step 1: Add failing interaction-state tests**

Extend settings tests to assert:

- the selected source is rendered from `state.quota.sources`;
- unavailable 5-hour/7-day controls are disabled with a reason;
- each control writes immediately and rolls back/shows an error if main-process validation fails;
- incoming `settings:stateChanged` replaces stale local state;
- diagnostics contain version, active source ID/label, raw plan type, window durations, stale/error flags, and timestamp, but no token/account ID/home directory path.

- [ ] **Step 2: Implement settings state rendering**

In `settings.js`, keep one state object, render controls from state, and bind each change once. Prevent duplicate listeners across state refreshes. Source-switch success should immediately refresh quota and update the main widget, statistics window, tray menu, and settings page.

- [ ] **Step 3: Implement instant preference updates**

Map controls to validated changes already owned by `setDisplayPreferences`. Reuse existing card/meter/column/calendar/pricing handlers instead of duplicating storage logic. Show a small saved/error status message.

- [ ] **Step 4: Add unavailable-control explanations**

For the active source:

- disable 5-hour card/meter choices if no 300-minute window exists;
- disable 7-day card/meter choices if no 10080-minute window exists;
- explain that the account/source did not return that window;
- display unknown windows separately using dynamic duration labels.

- [ ] **Step 5: Implement sanitized diagnostic copy**

Generate JSON in the main process from an allowlist only. Include application version, preference schema, active source ID/label, plan type/label, window duration/used/reset metadata, last refresh time, stale flag, and normalized error code/message. Exclude raw responses, auth data, account IDs, filesystem paths, and environment variables.

- [ ] **Step 6: Run settings-focused tests**

Run: `node scripts/test-settings-window.js`

Run: `node scripts/test-settings-stability.js`

Expected: PASS.

- [ ] **Step 7: Commit the settings behavior slice**

```powershell
git add src/main/main.js src/renderer/renderer.js src/renderer/settings.html src/renderer/settings.css src/renderer/settings.js scripts/test-settings-window.js scripts/test-settings-stability.js
git commit -m "feat: make settings live and source aware"
```

---

## Task 7: Regression, package metadata, and local Windows verification

**Files:**

- Modify: `package.json`
- Modify: `USER_GUIDE.zh-CN.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify only if generated by the package manager: `pnpm-lock.yaml`

- [ ] **Step 1: Update documentation and release metadata**

Document Pro weekly-only behavior, quota-source selection, the flat quick menu, the settings window, stale-cache behavior, and sanitized diagnostics. Bump the application version to `1.1.0` because this combines bug fixes with a new settings/source-selection feature. Update NSIS fields to use the package version dynamically where supported, or explicitly set:

```json
"artifactName": "Codex-Quota-Desktop-Assistant-1.1.0-Windows-x64-Setup.exe",
"uninstallDisplayName": "Codex 额度桌面助手 1.1.0"
```

Add a `CHANGELOG.md` entry for 1.1.0 without claiming a GitHub release has been published.

- [ ] **Step 2: Run focused new tests**

Run:

```powershell
node scripts/test-quota-sources.js
node scripts/test-quota-display.js
node scripts/test-quota-history.js
node scripts/test-sticky-menu.js
node scripts/test-settings-window.js
node scripts/test-settings-stability.js
```

Expected: all PASS.

- [ ] **Step 3: Run the complete regression suite**

Run: `npm test`

Expected: exit code 0 with every legacy and new test passing.

- [ ] **Step 4: Run syntax and dependency sanity checks**

Run:

```powershell
node --check src/main/main.js
node --check src/main/preload.js
node --check src/main/quota-service.js
node --check src/main/quota-normalizer.js
node --check src/main/quota-history-service.js
node --check src/renderer/renderer.js
node --check src/renderer/stats.js
node --check src/renderer/settings.js
npm ls --depth=0
```

Expected: all syntax checks and dependency resolution succeed.

- [ ] **Step 5: Build the unpacked application**

Run: `npm run build:dir`

Expected: `dist/win-unpacked/Codex 额度桌面助手.exe` is created.

- [ ] **Step 6: Launch the unpacked app for real-account smoke verification**

Launch the unpacked executable and verify, without exposing credentials in logs:

- the default `codex` source shows Pro and a 7-day card around the live server value;
- the missing 5-hour Codex card is hidden rather than showing 100%;
- selecting Spark exposes its 5-hour and 7-day windows;
- switching back to Codex restores the weekly-only layout;
- right-click menu is flat and every toggle acts once;
- settings is single-instance and live-updates the widget;
- copied diagnostics contains no auth/account/path data;
- refresh failure keeps the last good value and marks it stale.

Record the smoke result in the final handoff; do not store live account payloads in the repository.

- [ ] **Step 7: Build the local NSIS installer**

Run: `npm run build`

Expected: `dist/Codex-Quota-Desktop-Assistant-1.1.0-Windows-x64-Setup.exe` exists and electron-builder exits 0.

- [ ] **Step 8: Inspect the final diff and commit**

Run:

```powershell
git diff --check
git status --short
git diff --stat HEAD~1
```

Commit documentation/metadata and any final verified fixes:

```powershell
git add package.json pnpm-lock.yaml README.md USER_GUIDE.zh-CN.md CHANGELOG.md
git commit -m "release: prepare quota assistant 1.1.0"
```

Do not add `dist/` if it is ignored. Do not push or publish.

- [ ] **Step 9: Final acceptance report**

Report:

- root cause and corrected behavior;
- exact tests/builds run and their outcomes;
- installer absolute path and checksum;
- manual smoke-test outcome and any remaining limitation;
- commits created and whether the branch is ahead of origin;
- explicit note that nothing was pushed or published.
